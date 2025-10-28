# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  29: "**Correct Answer: Lower-slide door tracks to reduce current obstructions.**\n\n**Why this is right:** The client has tetraplegia and relies on mobility devices. Lowering or replacing sliding-door tracks removes the floor-level barrier, enabling smooth wheelchair access while preserving privacy doors.\n\n**Clinical reasoning:** Environmental modifications that eliminate thresholds and railings align with ADA principles. Rubber ramps or lower tracks prevent catching casters while maintaining door functionality.\n\n**Why other options miss:**\n- *Door stops to prevent full closing:* Compromises privacy and does not address the floor obstacle.\n- *Fabric loops on doorknobs:* Useful for lever grip but the issue is the floor rail.\n\n**Reference anchor:** AOTA Home Modification Practice Guidelines advocate altering thresholds/tracks for wheelchair-accessible doorways."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
