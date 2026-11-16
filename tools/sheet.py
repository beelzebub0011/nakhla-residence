import sys, glob, os
from PIL import Image, ImageDraw
src, out, cols, tw = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
names = sys.argv[5:] if len(sys.argv) > 5 else None
files = sorted(glob.glob(os.path.join(src, '*.png')) + glob.glob(os.path.join(src, '*.jpg')))
if names: files = [f for f in files if any(n in os.path.basename(f) for n in names)]
ims = [Image.open(f).convert('RGB') for f in files]
th = int(tw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), '#111')
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    d.text((x + 6, y + 4), os.path.basename(f)[:-4], fill='#ff0')
sheet.save(out, quality=88)
print(out, sheet.size)
