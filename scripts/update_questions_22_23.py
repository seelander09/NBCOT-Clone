# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  22: "**Correct Answer: Meet with the teacher and parents to discuss initial recommendations before the IEP meeting.**\n\n**Why this is right:** Pre-meetings ensure the family understands the evaluation, can ask clarifying questions, and helps the OT frame recommendations in IDEA-friendly language before the formal team convenes. Collaborative prep reduces surprises and boosts parent participation—core tenets of special education law.\n\n**Clinical reasoning:** Family-centered practice calls for transparent, collaborative planning. The OT can align proposed accommodations, prioritize goals, and gather parent input about meaningful outcomes.\n\n**Why other choices fall short:**\n- *Have parents submit a prioritized goal list without discussion:* Useful, but lacks the collaborative context and may not reflect realistic OT scope.\n- *Provide only a written summary:* Documentation is important, yet parents may misinterpret without dialogue.\n\n**Reference anchor:** IDEA mandates that families participate in developing IEP recommendations; AOTA School-Based Practice Guidelines endorse pre-meeting collaboration to ensure shared decision-making.",
  23: "**Correct Answer: Tenodesis orthosis.**\n\n**Why this is right:** A C5 (ASIA B) injury leaves elbow flexors/deltoids intact but lacks wrist extensors. A mobile arm support provides shoulder/elbow assistance but does not create functional prehension. A tenodesis orthosis allows the client to use passive grasp by extending the wrist with residual musculature (if present) or future training, making it the most effective self-feeding assist.\n\n**Clinical reasoning:** Tenodesis is introduced early to encourage functional grip using gravity and stretch. Mechanical feeders are last-resort options when active participation is not possible.\n\n**Why other options miss:**\n- *Mobile arm support:* Helpful at lower levels (C4) but the goal is hand function; MAS alone will not help grasp utensils.\n- *Mechanical feeder:* Limits active participation and is typically used when no prehension potential exists.\n\n**Reference anchor:** SCIRE and AOTA guidelines for SCI rehabilitation recommend tenodesis training/orthoses as the go-to adaptive device for C5 self-feeding goals."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
