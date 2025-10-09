# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-questions.json")
updates = {
  24: "**Correct Answer: Provide relevant caregiver training based on the spouse's learning style.**\n\n**Why this is right:** The vignette describes an end-stage neurodegenerative diagnosis with a worried spouse who will become the primary caregiver. OT must equip the caregiver with tailored training strategies so they can support safe ADLs at home. Individualizing instruction to the caregiver's learning preferences ensures carryover.\n\n**Clinical reasoning:** Evidence supports hands-on caregiver training, teach-back, and contextual practice to prevent rehospitalization. OT addresses routines, body mechanics, and cognitive cues.\n\n**Why other options miss:**\n- *Written medication instructions:* Important but does not address the spouse's immediate role in daily care/ADL assistance.\n- *Discussions about assisted living:* Premature; the scenario emphasizes preparing the spouse for home care rather than recommending relocation.\n\n**Reference anchor:** AOTA Practice Guidelines for Adults with Neurodegenerative Disease highlight caregiver-specific training as the most effective discharge preparation."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
