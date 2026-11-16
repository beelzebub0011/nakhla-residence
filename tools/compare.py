"""Side-by-side evidence sheet: Blender Cycles still (left) vs screenshot of the live website (right).
usage: python tools/compare.py <cycles_dir> <web_dir> <out.jpg> name1 name2 ...   (files: <name>.jpg / <name>.png)"""
import sys, os
from PIL import Image, ImageDraw

cyc, web, out, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
W = 800
def load(d, n):
    for ext in ('.jpg', '.png'):
        p = os.path.join(d, n + ext)
        if os.path.exists(p): return Image.open(p).convert('RGB')
    return Image.new('RGB', (1600, 900), '#400')
rows = []
for n in names:
    a, b = load(cyc, n), load(web, n)
    h = int(W * 9 / 16)
    def fit(im):
        r = im.width / im.height; t = 16 / 9
        if r > t: nw = int(im.height * t); im = im.crop(((im.width - nw) // 2, 0, (im.width + nw) // 2, im.height))
        else: nh = int(im.width / t); im = im.crop((0, (im.height - nh) // 2, im.width, (im.height + nh) // 2))
        return im.resize((W, h), Image.LANCZOS)
    row = Image.new('RGB', (W * 2 + 6, h), '#111'); row.paste(fit(a), (0, 0)); row.paste(fit(b), (W + 6, 0))
    d = ImageDraw.Draw(row); d.rectangle((0, 0, 330, 20), fill='#000'); d.text((6, 4), f'{n} - Blender Cycles (offline, path traced)', fill='#fff')
    d.rectangle((W + 6, 0, W + 6 + 330, 20), fill='#000'); d.text((W + 12, 4), f'{n} - live website (real-time WebGL)', fill='#fff')
    rows.append(row)
sheet = Image.new('RGB', (W * 2 + 6, sum(r.height for r in rows) + 6 * (len(rows) - 1)), '#111')
y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
sheet.save(out, quality=88); print(out, sheet.size)
