"""PRIVATE four-way boards: Form Architects reel frame | NAKHLA Cycles | NAKHLA live WebGL | NAKHLA photo site.
The reference frames are third-party (Instagram, viewed read-only in the owner's session); the boards go to the
git-ignored project_artifacts/reference_study/comparisons/ and must never be published.
Usage: python tools/fa_boards.py <json spec>   spec = [{"id","ref","refLabel","cycles","live","photo","title"}]
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = 'project_artifacts/reference_study/comparisons'
os.makedirs(OUT, exist_ok=True)
spec = json.load(open(sys.argv[1], encoding='utf-8'))
try:
    F = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22); FS = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16)
except Exception:
    F = FS = ImageFont.load_default()
H = 520
def fit(path, w, h):
    im = Image.open(path).convert('RGB'); r = min(w / im.width, h / im.height)
    im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    c = Image.new('RGB', (w, h), (18, 20, 20)); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); return c
for s in spec:
    cols = [('A  REFERENCE (private)', s['ref'], 300),
            ('B  NAKHLA — Blender Cycles', s['cycles'], 820),
            ('C  NAKHLA — live WebGL website', s['live'], 820),
            ('D  NAKHLA — photo website (real screenshot)', s['photo'], 820)]
    W = sum(c[2] for c in cols) + 10 * (len(cols) + 1)
    board = Image.new('RGB', (W, H + 120), (12, 13, 13)); d = ImageDraw.Draw(board)
    d.text((14, 10), s['title'], fill=(240, 232, 218), font=F)
    x = 10
    for label, path, w in cols:
        if path and os.path.exists(path): board.paste(fit(path, w, H), (x, 50))
        else: d.rectangle([x, 50, x + w, 50 + H], outline=(90, 90, 90)); d.text((x + 12, 60), 'NOT AVAILABLE', fill=(200, 120, 120), font=FS)
        d.text((x + 4, 56 + H), label, fill=(230, 220, 205), font=FS)
        x += w + 10
    d.text((14, H + 90), 'PRIVATE — reference frame belongs to its owner; never publish. ' + s.get('refLabel', ''), fill=(200, 140, 120), font=FS)
    board.save(os.path.join(OUT, f"FA_FOURWAY_{s['id']}.jpg"), quality=88)
    print('board', s['id'])
