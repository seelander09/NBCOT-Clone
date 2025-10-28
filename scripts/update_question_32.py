# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  32: "**Correct Answer: Identify the student's perceived competence and value for everyday activities.**\n\n**Why this is right:** The Child Occupational Self-Assessment (COSA) stems from the Model of Human Occupation. It captures the child's view of their abilities and what matters to them. The primary purpose is to empower client-centered goal setting based on perceived competence and value.\n\n**Clinical reasoning:** COSA results inform motivation, volition patterns, and highlight activities the child wants to improve. It's not a social skills test or a diagnostic tool; rather, it contributes to occupational profile data.\n\n**Why other options miss:**\n- *Determine social development level among peers:* That would require standardized social participation tools (e.g., SFA).\n- *Gather causes of stress:* COSA includes qualitative discussion but its main intent is self-rated competence/value, not stressor analysis.\n\n**Reference anchor:** Kielhofner's MOHO assessments manual describes COSA as a self-report of perceived competence and value guiding client-centered interventions."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
