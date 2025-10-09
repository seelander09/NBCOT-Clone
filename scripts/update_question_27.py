# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-questions.json")
updates = {
  27: "**Correct Answer: Develop a policy outlining specific methods for implementing evidence-based standards into daily practice.**\n\n**Why this is right:** The process improvement review revealed inconsistent uptake of evidence despite awareness. A policy creates clear expectations, workflows, and accountability for incorporating new research. This aligns with Domain 4 responsibilities (management/quality).\n\n**Clinical reasoning:** Policies ensure evidence translation is systematic rather than optional. They can include citation procedures, in-service requirements, and documentation expectations.\n\n**Why other options miss:**\n- *Include evidence-based practices in new staff orientation only:* Orientation reaches new hires but not current staff or ongoing updates.\n- *Conduct in-service training promoting resource use:* Helpful, but without policy infrastructure the effect may fade.\n\n**Reference anchor:** AOTA's Guidelines for Supervision and the OT Manager's Toolkit emphasize policy development for sustained evidence-based practice adoption."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
