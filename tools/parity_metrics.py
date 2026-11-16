"""Per-camera numbers for RENDER_PARITY_REPORT.md: Cycles still vs camera-matched live frame.
Usage: python tools/parity_metrics.py   (reads project_artifacts/cycles_v3 + project_artifacts/parity/web)
Writes project_artifacts/parity/metrics.json and COMPARISON_*.jpg sheets, prints a markdown table."""
import json, os
import numpy as np
from PIL import Image, ImageDraw

CY, WEB, OUT = 'project_artifacts/cycles_v3', 'project_artifacts/parity/web', 'project_artifacts/parity'
cams = json.load(open('blender/scene_prims.json', encoding='utf-8'))['cameras']

def load(p):
    return np.asarray(Image.open(p).convert('RGB').resize((320, 180), Image.LANCZOS), dtype=float)

def lum(x):
    return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722

rows = []
for c in cams:
    a, b = f"{CY}/{c['id']}.jpg", f"{WEB}/{c['id']}.png"
    if not (os.path.exists(a) and os.path.exists(b)):
        continue
    A, B = load(a), load(b)
    la, lb = lum(A), lum(B)
    # exposure-independent: normalise each image to its own mean before comparing structure / colour
    An, Bn = A / max(la.mean(), 1) * 118, B / max(lb.mean(), 1) * 118
    rows.append({
        'id': c['id'], 'time': c['time'],
        'lum_cycles': round(float(la.mean())), 'lum_live': round(float(lb.mean())),
        'mad_raw': round(float(np.abs(A - B).mean()), 1),
        'mad_exposure_matched': round(float(np.abs(An - Bn).mean()), 1),
        'warmth_cycles': round(float((A[..., 0] - A[..., 2]).mean())), 'warmth_live': round(float((B[..., 0] - B[..., 2]).mean())),
        'contrast_cycles': round(float(la.std())), 'contrast_live': round(float(lb.std())),
    })
json.dump(rows, open(f'{OUT}/metrics.json', 'w'), indent=1)

def sheet(ids, name):
    W, H = 800, 450
    im = Image.new('RGB', (W * 2 + 6, (H + 4) * len(ids)), (12, 12, 12)); d = ImageDraw.Draw(im)
    for i, cid in enumerate(ids):
        for j, (p, lab) in enumerate([(f'{CY}/{cid}.jpg', 'Blender Cycles (offline, path traced)'), (f'{WEB}/{cid}.png', 'live website (real-time WebGL)')]):
            if os.path.exists(p):
                im.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (j * (W + 6), i * (H + 4)))
            d.rectangle([j * (W + 6), i * (H + 4), j * (W + 6) + 300, i * (H + 4) + 16], fill=(0, 0, 0))
            d.text((j * (W + 6) + 4, i * (H + 4) + 3), f'{cid} - {lab}', fill=(255, 255, 255))
    im.save(f'{OUT}/{name}', quality=84)

ids = [r['id'] for r in rows]
sheet([i for i in ids if i.startswith('exterior')] + [i for i in ['lobby', 'pool', 'gym', 'spa', 'restaurant', 'cafe', 'terrace'] if i in ids], 'COMPARISON_exterior_amenities.jpg')
sheet([i for i in ['living', 'kitchen', 'master', 'bathroom', 'balcony', 'living_golden', 'living_evening', 'living_night', 'B_living'] if i in ids], 'COMPARISON_apartments.jpg')

print('| Camera | Hour | Mean luminance Cycles / live | Abs. difference raw | Abs. difference exposure-matched | Warmth (R−B) Cycles / live | Contrast (σ) Cycles / live |')
print('|---|---|---|---|---|---|---|')
for r in rows:
    print(f"| {r['id']} | {r["time"]//60:02d}:{r["time"]%60:02d} | {r['lum_cycles']} / {r['lum_live']} | {r['mad_raw']} | {r['mad_exposure_matched']} | {r['warmth_cycles']} / {r['warmth_live']} | {r['contrast_cycles']} / {r['contrast_live']} |")
