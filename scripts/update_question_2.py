import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
data = json.loads(path.read_text())
for item in data:
    if item["order"] == 2:
        item["content"] = (
            "**Correct Answer: Help the child identify ways to discuss concerns with peers and teachers.**\n\n"
            "**Why this is right:** Prader-Willi syndrome comes with social and emotional vulnerability. NBCOT expects the OTR to begin with client-centered coaching that builds the student's self-advocacy skills. Helping the child script language for peers and teachers directly addresses the stated barrier (bullying and feeling unheard) and aligns with occupation-based psychosocial intervention.\n\n"
            "**Clinical reasoning:** Before escalating to the team you gather the student's voice, validate feelings, and co-create communication strategies (role-play, social stories, assertiveness scripts). This respects IDEA's mandate for student participation in planning and supports social participation goals.\n\n"
            "**Why other options miss the mark**\n- *Discuss with the interprofessional team first:* Skipping over the student's perspective reduces autonomy and delays equipping the child with immediate coping tools. Team input is useful later but not the first therapeutic move.\n- *Provide opportunities to resolve bullying:* Jumping straight into anti-bullying groups puts the burden on the child without preparatory skill-building and may heighten anxiety.\n\n"
            "**Book / practice anchor:** AOTA Occupational Therapy Practice Guidelines for Children and Youth emphasize student-led communication planning as the first step when addressing bullying before systems-level actions."
        )
        break

path.write_text(json.dumps(data, indent=2))
