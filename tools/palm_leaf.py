"""Leaf alpha for the date-palm fronds (same drawing as leafTexture() in src/engine/site.ts) -> blender/tex/palm_leaf.png"""
import math, os
from PIL import Image, ImageDraw
im = Image.new('L', (128, 512), 0); g = ImageDraw.Draw(im)
g.polygon([(60, 512), (68, 512), (66, 0), (62, 0)], fill=255)
for i in range(30):
    y = 500 - i * 16.4; ln = 56 * math.sin(min(1, (i + 2.5) / 30) * math.pi * 0.94) + 6
    for d in (-1, 1): g.polygon([(64, y + 7), (64 + d * ln, y - 22), (64, y - 9)], fill=255)
os.makedirs('blender/tex', exist_ok=True); im.save('blender/tex/palm_leaf.png'); print('ok')
