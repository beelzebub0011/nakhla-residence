"""Leaf-cluster card texture for the broadleaf street trees and shrubs (V11 exterior round 2).

Writes public/textures/leaf_cluster.png (RGBA, 512 x 512): a twig with ~90 narrow, pointed leaves in slightly
different greens, the back leaves darker. The website and the Blender build both load this one file, so the trees
match in both renderers. Original drawing (deterministic), no third-party image.

    python tools/leaf_cluster.py
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

N = 512
rnd = random.Random(7)
img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
g = ImageDraw.Draw(img, 'RGBA')


def leaf(cx, cy, ang, ln, wd, col):
    pts_l, pts_r = [], []
    for i in range(13):
        t = i / 12; w = wd * math.sin(math.pi * t) ** 0.75
        x = t * ln; ca, sa = math.cos(ang), math.sin(ang)
        pts_l.append((cx + x * ca - w * sa, cy + x * sa + w * ca)); pts_r.append((cx + x * ca + w * sa, cy + x * sa - w * ca))
    g.polygon(pts_l + pts_r[::-1], fill=col)
    # midrib: a thin lighter line
    mid = tuple(min(255, c + 22) for c in col[:3]) + (255,)
    g.line([(cx, cy), (cx + ln * 0.92 * math.cos(ang), cy + ln * 0.92 * math.sin(ang))], fill=mid, width=1)


# twigs radiating from the lower centre, leaves along them; back layer first (darker)
for layer in range(3):
    shade = (0.62, 0.8, 1.0)[layer]
    for tw in range(5):
        a0 = -math.pi / 2 + (tw - 2) * 0.42 + rnd.uniform(-0.15, 0.15)
        bx, by = N * 0.5 + rnd.uniform(-30, 30), N * 0.94
        tl = rnd.uniform(300, 420)
        g.line([(bx, by), (bx + tl * math.cos(a0), by + tl * math.sin(a0))], fill=(82, 66, 48, 255), width=3)
        for k in range(7):
            t = 0.25 + k * 0.11 + rnd.uniform(-0.03, 0.03)
            px, py = bx + tl * t * math.cos(a0), by + tl * t * math.sin(a0)
            for side in (-1, 1):
                ang = a0 + side * rnd.uniform(0.5, 1.05)
                base = rnd.choice([(74, 104, 52), (66, 96, 46), (88, 116, 60), (60, 86, 44), (96, 120, 66)])
                col = tuple(int(c * shade * rnd.uniform(0.92, 1.08)) for c in base) + (255,)
                leaf(px, py, ang, rnd.uniform(70, 104), rnd.uniform(11, 16), col)
        # leaf at the twig tip
        tip = (bx + tl * math.cos(a0), by + tl * math.sin(a0))
        leaf(tip[0], tip[1], a0 + rnd.uniform(-0.2, 0.2), 92, 14, tuple(int(c * shade) for c in (84, 112, 58)) + (255,))

# bleed the leaf colour into the transparent pixels so alpha-tested edges never show a dark fringe
import numpy as np
arr = np.asarray(img).astype(np.float32); al = arr[..., 3:4] / 255.0
col = np.zeros_like(arr[..., :3]) + np.array([70, 98, 50], np.float32)
for r in (31, 15, 7, 3):   # coarse to fine: premultiplied blur / blurred alpha
    pm = Image.fromarray(np.clip(arr[..., :3] * al, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r))
    aa = Image.fromarray((al[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r))
    pmv = np.asarray(pm).astype(np.float32); av = np.asarray(aa).astype(np.float32)[..., None] / 255.0
    ok = av[..., 0] > 0.02; col[ok] = pmv[ok] / av[ok]
rgb = np.where(al > 0.5, arr[..., :3], col)
out = Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), arr[..., 3:4]], axis=-1).astype(np.uint8), 'RGBA')
a = out.getchannel('A')
os.makedirs('public/textures', exist_ok=True)
out.save('public/textures/leaf_cluster.png', optimize=True)
print('public/textures/leaf_cluster.png', out.size, 'coverage', round(sum(1 for v in a.getdata() if v > 127) / (N * N), 3))
