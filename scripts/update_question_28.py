# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  28: "**Correct Answer: Increase exposure to natural daylight.**\n\n**Why this is right:** Sleep hygiene focuses on circadian regulation. Exposure to natural daylight anchors the sleep-wake cycle, especially for clients with insomnia or irregular routines. This evidence-based intervention has strong support for improving sleep efficiency.\n\n**Clinical reasoning:** OT practitioners addressing sleep prioritize environmental modifications (light, temperature) and activity schedules. Daytime bright light cues melatonin suppression, promoting nighttime sleep onset.\n\n**Why other options miss:**\n- *Reading in bed before sleep:* Introduces conditioned arousal; bed should be reserved for sleep/sex per sleep hygiene guidelines.\n- *Taking one nap during the day:* Daytime napping can reduce sleep drive unless restricted to specific therapeutic protocols.\n\n**Reference anchor:** AOTA's Sleep to Be Well toolkit and CDC sleep hygiene recommendations highlight daytime light exposure as a core strategy."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
