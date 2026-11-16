"""V11 exterior round 2 before/after sheet -> reports/BEFORE_AFTER_exterior_r2.jpg

Rows = the five street views. Columns = Cycles round 1 (from git commit 26d79e5) | Cycles round 2 (public/renders) |
live WebGL round 2 (project_artifacts/parity/r2_web). Same cameras (src/domain/views.ts).

    python tools/before_after_r2.py
"""
import io, subprocess
from PIL import Image, ImageDraw, ImageFont

R1 = '26d79e5'
VIEWS = ['street_arrival', 'street_arrival_dusk', 'street_arrival_night', 'street_entrance', 'street_entrance_night']
W, H = 640, 360
try: font = ImageFont.truetype('arial.ttf', 15)
except Exception: font = ImageFont.load_default()

def git_img(rev, path):
    data = subprocess.run(['git', 'show', f'{rev}:{path}'], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data)).convert('RGB')

def label(im, text):
    d = ImageDraw.Draw(im); w = d.textlength(text, font=font) + 12; d.rectangle([0, 0, w, 22], fill=(0, 0, 0)); d.text((6, 3), text, fill=(255, 255, 255), font=font); return im

sheet = Image.new('RGB', (W * 3, H * len(VIEWS)), (20, 20, 20))
for r, v in enumerate(VIEWS):
    cols = [(git_img(R1, f'public/renders/{v}.jpg'), f'Cycles round 1: {v}'),
            (Image.open(f'public/renders/{v}.jpg').convert('RGB'), f'Cycles round 2: {v}'),
            (Image.open(f'project_artifacts/parity/r2_web/{v}.png').convert('RGB'), f'Live 3D round 2: {v}')]
    for c, (im, t) in enumerate(cols): sheet.paste(label(im.resize((W, H), Image.LANCZOS), t), (c * W, r * H))
sheet.save('reports/BEFORE_AFTER_exterior_r2.jpg', quality=88)
print('reports/BEFORE_AFTER_exterior_r2.jpg', sheet.size)
