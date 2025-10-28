# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  33: "**Correct Answer: Arts and crafts group to create a collaborative project.**\n\n**Why this is right:** The program aims to improve peer relationships among children with behavioral challenges. Collaborative art projects promote turn-taking, joint problem solving, and shared success—evidence-backed strategies for social skills development.\n\n**Clinical reasoning:** Group OT interventions leverage occupation as a vehicle for social participation. Creative projects allow graded engagement, clear roles, and opportunities for positive peer feedback.\n\n**Why the other options miss:**\n- *Special interest clubs* may reinforce isolated participation if peers have divergent interests.\n- *Yoga classes focused on relaxation* target self-regulation rather than active peer interaction.\n\n**Reference anchor:** AOTA Mental Health Practice Guidelines support cooperative group occupations for social skill acquisition."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
