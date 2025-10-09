from pathlib import Path
from PIL import Image
import sys

if len(sys.argv) < 3:
    raise SystemExit("Usage: python zoom_image.py <src> <scale>")

src = Path(sys.argv[1])
scale = float(sys.argv[2])
img = Image.open(src)
new_size = (int(img.width * scale), int(img.height * scale))
img = img.resize(new_size)
output = src.with_name(f"zoom-{src.name}")
img.save(output)
print(f"Saved {output}")
