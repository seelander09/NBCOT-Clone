import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
data = json.loads(path.read_text())
for item in data:
    if item["order"] == 8:
        item["content"] = (
            "**Correct Answer: Sit at the table with the resident and encourage gentle conversation; ask if needed eyewear, hearing aids, or dentures are in place; ensure the meal matches the prescribed diet/texture.**\n\n"
            "**Why this combination works:** The OTR is screening natural self-feeding performance. Best practice is to observe in context, confirm the resident has all personal adaptive devices, and verify the tray aligns with the dysphagia or cardiac diet ordered. These steps establish safety and an authentic performance baseline before providing cues or assistance.\n\n"
            "**Clinical reasoning:**\n- Sitting with the resident normalizes the meal, lets you gauge trunk control, utensil handling, and cognitive engagement.\n- Low vision or sensory aids (glasses, dentures, hearing aids) must be in place to judge true ability; otherwise you are really testing impairment, not functional performance.\n- Diet confirmation prevents aspiration or dietary errors common after transitions from hospital to SNF. Aspiration precautions are always the first OT safety check for post-stroke mealtimes.\n\n"
            "**Why the other options wait:**\n- *Mutually enjoyable topics* come later to grade social participation once safety is established.\n- *Hand-over-hand assistance* would skew the screening and is reserved for intervention after you document baseline.\n- *Exploring customs* is valuable for the occupational profile but can be folded into conversation once initial safety checks are complete.\n\n"
            "**Book anchor:** Arvedson & Brodsky, and the AOTA Feeding, Eating, and Swallowing guideline, emphasize verifying equipment, diet orders, and context before scoring self-feeding."
        )
        break

path.write_text(json.dumps(data, indent=2))
