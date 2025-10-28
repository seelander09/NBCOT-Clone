# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  43: "**Correct Answer: Educate the patient on increasing exercise tolerance through energy conservation strategies.**\n\n**Why this is right:** Knowledge domain question focusing on cardiac rehab acute phase. Teaching energy conservation and monitoring exertion (e.g., MET levels, Borg scale) is essential for safety immediately post-event.\n\n**Why other options miss:** incorrect,
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
