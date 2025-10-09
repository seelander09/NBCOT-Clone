import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-questions.json")
data = json.loads(path.read_text())
for item in data:
    if item["order"] == 3:
        item["content"] = (
            "**Correct Answer: Identify a method for color-coding similarly shaped toiletry items.**\n\n"
            "**Why this is right:** Cataracts cause decreased contrast sensitivity, glare intolerance, and difficulty identifying items that look similar. High-contrast labeling strategies allow the client to discriminate shampoo vs. conditioner vs. lotion safely during ADLs, supporting independence without surgery.\n\n"
            "**Clinical reasoning:** Environmental modifications that increase contrast and tactile cues are first-line OT interventions for low vision. Using brightly colored elastic bands, tactile stickers, or raised paint dots on containers follows AOTA Low Vision guidelines for compensatory ADL strategies.\n\n"
            "**Why the other options miss:**\n- *Maximize natural light:* Helpful but insufficient alone; cataracts often worsen with glare. Without contrast cues the client still risks confusion.\n- *Provide over-the-counter glasses:* Not indicated. Cataracts reflect lens opacity rather than refractive error, so magnifiers or readers will not restore clarity.\n\n"
            "**Book anchor:** Warren & Barstow, Occupational Therapy Interventions for Adults with Low Vision, highlight contrast labeling and tactile cues as evidence-based strategies for cataract-related ADL challenges."
        )
        break

path.write_text(json.dumps(data, indent=2))
