"""Derive the furniture ambient map from the baked lightmap (no GPU, no network).
public/lightmaps/<cat>.png + blender/scene_prims.json  ->  public/lightmaps/<cat>_floor.png
Top-down map of the baked irradiance at floor level over the 18 x 24 m plate: R = sky share, G = lamp share
B = bounced-sun share (sqrt-encoded like the atlas), A = coverage (1 indoors, 0 outdoors). Furniture shadows on the floor are blurred
away (0.45 m Gaussian) so a sofa is lit by the light around it, not by its own shadow.
usage: python tools/floor_irradiance.py F04 residential"""
import sys, json
import numpy as np
from PIL import Image

fid, cat = sys.argv[1], sys.argv[2]
PPM = 12; W, H = 18 * PPM, 24 * PPM
atlas = np.asarray(Image.open(f'public/lightmaps/{cat}.png').convert('RGB'), dtype=np.float32) / 255
RES = atlas.shape[0]; lin = atlas ** 2            # decode sqrt
prims = json.load(open('blender/scene_prims.json', encoding='utf-8'))['interiors'][fid]
val = np.zeros((H, W, 3), np.float32); cov = np.zeros((H, W), np.float32)
for p in prims:
    if p.get('k') != 'slab' or p.get('grp') != 'floor' or not p.get('lm'): continue
    lm = p['lm']
    for py in range(max(0, int(p['y0'] * PPM)), min(H, int(np.ceil(p['y1'] * PPM)))):
        for px in range(max(0, int(p['x0'] * PPM)), min(W, int(np.ceil(p['x1'] * PPM)))):
            fx = ((px + 0.5) / PPM - p['x0']) / (p['x1'] - p['x0']); fy = ((py + 0.5) / PPM - p['y0']) / (p['y1'] - p['y0'])
            if not (0 <= fx <= 1 and 0 <= fy <= 1): continue
            u = lm[0] + fx * (lm[2] - lm[0]); v = lm[1] + fy * (lm[3] - lm[1])
            c = min(RES - 1, int(u * RES)); r = min(RES - 1, int((1 - v) * RES))
            val[H - 1 - py, px] = lin[r, c, :3]; cov[H - 1 - py, px] = 1

def gauss(a, sigma):
    k = int(sigma * 3) | 1; x = np.arange(-k, k + 1); g = np.exp(-x * x / (2 * sigma * sigma)); g /= g.sum()
    a = np.apply_along_axis(lambda m: np.convolve(np.pad(m, k, mode='edge'), g, mode='valid'), 0, a)
    return np.apply_along_axis(lambda m: np.convolve(np.pad(m, k, mode='edge'), g, mode='valid'), 1, a)

s = 0.45 * PPM; wsum = gauss(cov, s)
out = np.zeros((H, W, 4), np.float32)
for ch in range(3): out[..., ch] = np.sqrt(np.clip(gauss(val[..., ch] * cov, s) / np.maximum(wsum, 1e-4), 0, 1))
# coverage: indoors plus a ~0.35 m band so pieces standing against walls are lit; soft edge
out[..., 3] = np.clip(gauss(cov, 0.2 * PPM) * 2.2, 0, 1)
Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(f'public/lightmaps/{cat}_floor.png')
print('written', f'public/lightmaps/{cat}_floor.png', (W, H), 'mean sky', float(out[..., 0][cov > 0].mean()), 'mean lamp', float(out[..., 1][cov > 0].mean()), 'mean sun', float(out[..., 2][cov > 0].mean()))
