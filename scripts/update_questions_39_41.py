# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  39: "**Correct Answer: Maximize performance by transitioning to a direct selection method.**\n\n**Why this is right:** The client currently uses automatic scanning but wants increased typing speed. Direct selection (e.g., joystick, head pointer) is significantly faster than scanning when feasible. Exploring direct access is the best way to meet the stated goal.\n\n**Why other options miss:**\n- *Increase the information conveyed per keystroke* improves efficiency but does not address the fundamental limitation of scanning speed.\n- *Optimize screen layout* helps but still limits the user to scanning tempo.\n\n**Reference anchor:** Cook & Polgar’s Assistive Technologies text notes direct selection as the most efficient access method when motor control allows.",
  41: "**Correct Answer: Mobile arm support.**\n\n**Why this is right:** A client with C4 tetraplegia lacks shoulder/elbow strength. A mobile arm support counterbalances limb weight, enabling self-feeding and grooming when paired with adaptive utensils.\n\n**Why other options miss:**\n- *Customized seating system* addresses posture but not upper-extremity movement.\n- *Lower extremity extensor tone assessment* is important but doesn’t solve the feeding mobility challenge.\n\n**Reference anchor:** SCIRE and AOTA SCI guidelines endorse mobile arm supports for C4-C5 to facilitate self-care."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
