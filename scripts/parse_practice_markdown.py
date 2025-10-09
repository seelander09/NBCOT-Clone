import re
import json
from pathlib import Path

def clean_text(value: str) -> str:
    replacements = {
        "\u2019": "'",
        "\u2018": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u00a0": " ",
        "\ufffd": "'",
    }
    for bad, good in replacements.items():
        value = value.replace(bad, good)
    return value

root = Path(r"e:/Projects/NBCOT-Clone")
md_path = root / "Keely & Sierra NBCOT study log pre-test.md"
text = md_path.read_text(encoding="utf-8")
text = re.sub(r"\[image\d+\]: <data:image/[^>]+>\s*", "", text, flags=re.DOTALL)
lines = text.splitlines()
entries = []
current = None
expected = 1
question_pattern = re.compile(r"^(\d+)(?:\\)?(?:[\.\)]\s*|\s+)(.*)")
image_pattern = re.compile(r"!\[\]\[(image\d+)\]")

for raw_line in lines:
    stripped = raw_line.strip()
    if not stripped:
        if current is not None:
            current['body'].append('')
        continue

    match = question_pattern.match(stripped)
    if match:
        number = int(match.group(1))
        headline = clean_text(match.group(2).strip())
        if number >= expected:
            if current is not None:
                content = '\n'.join(current['body']).strip()
                current['content'] = clean_text(content)
                del current['body']
                entries.append(current)
            current = {
                'order': number,
                'headline': headline,
                'images': [],
                'body': []
            }
            expected = number + 1
            continue

    if current is None:
        continue

    image_match = image_pattern.search(stripped)
    if image_match:
        current['images'].append(image_match.group(1))
        continue

    current['body'].append(clean_text(raw_line))

if current is not None:
    content = '\n'.join(current['body']).strip()
    current['content'] = clean_text(content)
    del current['body']
    entries.append(current)

entries.sort(key=lambda item: item['order'])
output_path = root / 'src' / 'data' / 'practice-questions.json'
output_path.write_text(json.dumps(entries, indent=2), encoding='utf-8')
print(f"Parsed {len(entries)} questions to {output_path}")
