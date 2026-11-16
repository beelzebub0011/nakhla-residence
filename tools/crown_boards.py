"""V11.4 crown preview boards (D18): NAKHLA today | NAKHLA with the open roof crown, for the owner's aesthetic review.
Only NAKHLA's own renders and live captures (no third-party frames). Output: project_artifacts/crown_preview/BOARD_*.jpg
Usage: python tools/crown_boards.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

P = 'project_artifacts/crown_preview'
try:
    F = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 26); FS = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
except Exception:
    F = FS = ImageFont.load_default()
W, H = 960, 540
PAIRS = [
    ('cycles_close', 'Photoreal (Cycles) - close view of the tower top', [('golden', 'crown_close_golden.jpg'), ('dusk', 'crown_close_dusk.jpg'), ('night', 'crown_close_night.jpg')], 'cycles_now', 'cycles_crown'),
    ('live_close', 'Live 3D website - close view of the tower top', [('golden', 'crown_close_golden.png'), ('night', 'crown_close_night.png')], 'live_now', 'live_crown'),
]

def fit(path):
    im = Image.open(path).convert('RGB'); r = min(W / im.width, H / im.height)
    im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    c = Image.new('RGB', (W, H), (18, 20, 20)); c.paste(im, ((W - im.width) // 2, (H - im.height) // 2)); return c

for key, title, rows, before, after in PAIRS:
    rows = [r for r in rows if os.path.exists(os.path.join(P, before, r[1])) and os.path.exists(os.path.join(P, after, r[1]))]
    if not rows: print('skip', key); continue
    top = 60; lab = 34
    board = Image.new('RGB', (2 * W + 30, top + len(rows) * (H + lab) + 50), (12, 13, 13)); d = ImageDraw.Draw(board)
    d.text((14, 14), title + '  -  owner review (D18)', fill=(240, 232, 218), font=F)
    for i, (tag, f) in enumerate(rows):
        y = top + i * (H + lab)
        board.paste(fit(os.path.join(P, before, f)), (10, y)); board.paste(fit(os.path.join(P, after, f)), (W + 20, y))
        d.text((14, y + H + 4), f'TODAY - {tag}', fill=(230, 220, 205), font=FS)
        d.text((W + 24, y + H + 4), f'WITH OPEN ROOF CROWN - {tag}', fill=(230, 220, 205), font=FS)
    d.text((14, board.height - 36), 'Concept only. Boards made for the owner review of 2026-11-14 (the crown was then adopted, D18).', fill=(200, 160, 120), font=FS)
    out = os.path.join(P, f'BOARD_{key}.jpg'); board.save(out, quality=88); print('board', out)
