"""Responsive images for the photoreal website (V11.2): public/renders/<id>.jpg -> public/renders/w/<id>_{960,1920}.webp,
plus the gateway's 3D preview from a REAL live-WebGL capture (never a render passed off as real-time).
Usage: python tools/web_images.py [live_capture.png]"""
import glob, os, sys
from PIL import Image

os.makedirs('public/renders/w', exist_ok=True)
n = 0
for p in sorted(glob.glob('public/renders/*.jpg')):
    i = os.path.splitext(os.path.basename(p))[0]; im = Image.open(p).convert('RGB')
    for w in (960, 1600, 2560, 3840):   # V12: from the 3840 x 2160 masters, never upscaled
        out = f'public/renders/w/{i}_{w}.webp'
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(p): continue
        if w > im.width: continue
        h = round(im.height * w / im.width)
        (im if w == im.width else im.resize((w, h), Image.LANCZOS)).save(out, 'WEBP', quality=84 if w >= 2560 else 84, method=6)
        n += 1
live = sys.argv[1] if len(sys.argv) > 1 else 'project_artifacts/v11_exterior/web/street_arrival.png'
if os.path.exists(live):
    os.makedirs('public/gateway', exist_ok=True)
    im = Image.open(live).convert('RGB'); w = 960; im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save('public/gateway/preview_3d.webp', 'WEBP', quality=80, method=6)
for f in glob.glob('public/renders/w/*_1920.webp'): os.remove(f)   # V11.5: the 1920 cut was an upscale of a 1600 master
tot = sum(os.path.getsize(f) for f in glob.glob('public/renders/w/*.webp'))
print('webp written', n, '| total', round(tot / 1e6, 1), 'MB')
