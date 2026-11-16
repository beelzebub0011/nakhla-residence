"""V11.3 four-way comparison sheets: A reel reference frame | B Cycles | C live 3D | D photo website.

PRIVATE: column A uses frames from the owner's reference reels (references/private_frames/, git-ignored). The output goes
to REVIEW_PACK/INSTAGRAM_COMPARISONS/ which is ALSO git-ignored — never publish these sheets.
The pairs are matched by subject, time of day and intent; they are NOT geometric matches (different buildings).

    python tools/fourway.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = 'REVIEW_PACK/INSTAGRAM_COMPARISONS'
os.makedirs(OUT, exist_ok=True)
try: font = ImageFont.truetype('arial.ttf', 17)
except Exception: font = ImageFont.load_default()
PAIRS = [
    ('exterior_dusk', 'references/private_frames/REF06_t03.png', (40, 335, 480, 612), 'REF06 @0:03 — tower closing a lit street, golden dusk',
     'public/renders/street_arrival_dusk.jpg', 'project_artifacts/parity/v113_web/street_arrival_dusk.png', 'REVIEW_PACK/PHOTO_MODE_SCREENSHOTS/photo_street_arrival_dusk_en.png'),
    ('interior_blue_hour', 'references/private_frames/REF03_t12.png', (32, 268, 476, 566), 'REF03 @0:12 — great room at blue hour, warm cove light',
     'public/renders/living_evening.jpg', 'REVIEW_PACK/REAL_WEB_SCREENSHOTS/3d_room_A_living_en.png', 'REVIEW_PACK/PHOTO_MODE_SCREENSHOTS/photo_living_golden_en.png'),
]
W, H = 760, 428
for name, ref, crop, rlabel, cyc, live, photo in PAIRS:
    if not os.path.exists(ref): print('missing reference', ref); continue
    cols = [(Image.open(ref).convert('RGB').crop(crop), 'A  ' + rlabel), (Image.open(cyc).convert('RGB'), 'B  NAKHLA — Cycles still'),
            (Image.open(live).convert('RGB'), 'C  NAKHLA — live 3D website (real screenshot)'), (Image.open(photo).convert('RGB'), 'D  NAKHLA — photo website (real screenshot)')]
    sheet = Image.new('RGB', (W * 2, H * 2), (16, 16, 16))
    for i, (im, label) in enumerate(cols):
        im = im.copy(); im.thumbnail((W, H)); tile = Image.new('RGB', (W, H), (16, 16, 16)); tile.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
        d = ImageDraw.Draw(tile); tw = d.textlength(label, font=font) + 14; d.rectangle([0, 0, tw, 26], fill=(0, 0, 0)); d.text((7, 4), label, fill=(255, 255, 255), font=font)
        sheet.paste(tile, ((i % 2) * W, (i // 2) * H))
    sheet.save(os.path.join(OUT, f'FOURWAY_{name}.jpg'), quality=88); print('wrote', name)
