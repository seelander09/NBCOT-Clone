# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  26: "**Correct Answer: Electronic inline phonetic spell-check software with auditory cues.**\n\n**Why this is right:** The student has low handwriting speed and persistent legibility issues despite remediation. Inline spell-check with auditory feedback supports written output by providing immediate phoneme-grapheme pairing, reducing cognitive load, and reinforcing literacy.\n\n**Clinical reasoning:** OT focuses on access to curriculum. Auditory spell-check scaffolds orthographic awareness for students with dysgraphia/dyslexia, aligning with assistive technology tiers (Tier III).\n\n**Why other options fall short:**\n- *Word prediction with frequent highlighting:* Supports word retrieval but may slow typing further without phonological cues.\n- *Picture-supported libraries with text-to-speech:* Better for comprehension or emergent writers; this student already writes at grade level but slowly.\n\n**Reference anchor:** AOTA Assistive Technology guidelines emphasize phonetic spell-check and auditory feedback for middle-grade students with dysgraphia."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
