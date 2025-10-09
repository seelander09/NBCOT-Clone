import re
import base64
from pathlib import Path

root = Path(r"e:/Projects/NBCOT-Clone")
md_path = root / "Keely & Sierra NBCOT study log pre-test.md"
text = md_path.read_text(encoding="utf-8")
pattern = re.compile(r"\[(image\d+)\]: <data:image/(?P<fmt>png|jpeg);base64,(?P<data>[A-Za-z0-9+/=\n\r]+)>")
out_dir = root / "public" / "practice-test"
out_dir.mkdir(parents=True, exist_ok=True)
count = 0

for match in pattern.finditer(text):
    name = match.group(1)
    fmt = match.group("fmt")
    data = match.group("data").encode()
    data = data.replace(b"\n", b"").replace(b"\r", b"")
    try:
        binary = base64.b64decode(data)
    except Exception as exc:
        print(f"Failed to decode {name}: {exc}")
        continue
    file_path = out_dir / f"{name}.{fmt}"
    file_path.write_bytes(binary)
    count += 1

print(f"Extracted {count} images to {out_dir}")
