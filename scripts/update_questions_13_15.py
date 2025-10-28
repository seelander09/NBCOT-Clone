# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  13: "**Correct Answer: Establish a journal club where staff read peer-reviewed pediatric articles and log applicable takeaways.**\n\n**Why this is right:** Domain 4 scenarios ask you to maintain NBCOT certification requirements efficiently. A journal club leverages no-cost evidence, supports ongoing professional development, and creates documentation demonstrating competency—ideal when budgets for conferences disappear.\n\n**Clinical reasoning:** NBCOT's Professional Development and Maintenance program accepts structured journal clubs with reflective summaries. They promote collaborative evidence translation versus informal storytelling.\n\n**Why the other options miss:**\n- *Informal discussions about past practices:* Not evidence-based, lacks documentation, and will not satisfy CE requirements.\n- *Watch online videos casually:* Without verifying peer review or recording learning, this fails renewal criteria.\n\n**Reference anchor:** NBCOT Certification Renewal Handbook (2024) lists documented journal clubs as valid PDUs.",
  14: "**Correct Answer: Audit the real community transportation routes included in the student's transition plan.**\n\n**Why this is right:** Transition-age travel training requires on-the-ground assessment of bus stops, curb cuts, and wayfinding barriers. The OT must verify environmental access to tailor interventions and meet IDEA mandates.\n\n**Clinical reasoning:** OT practice guidelines emphasize environmental assessments to promote independent community mobility; real-world data informs graded travel practice.\n\n**Why other options fall short:**\n- *Online route maps* ignore real-time barriers (construction, lighting).\n- *Classroom-only simulations* lack ecological validity and may compromise safety.\n\n**Reference anchor:** AOTA Transition Planning resources recommend community-based environmental scans for public transportation training.",
  15: "**Correct Answer: Emphasize community participation (primary prevention) before recommending adaptive devices (secondary) for rheumatoid arthritis.**\n\n**Why this is right:** The question frames prevention tiers. Primary prevention builds joint protection habits and general wellness before deformity. Secondary/tertiary measures (adaptive equipment, deformity management classes) follow if impairment progresses.\n\n**NBCOT emphasis:** Understand prevention levels in rheumatologic care—primary (wellness education), secondary (early detection/splinting), tertiary (managing established deformity).\n\n**Why alternative priorities misalign:** Jumping to adaptive devices or self-help groups bypasses the prevention sequence.\n\n**Reference anchor:** Pedretti & Early, Rheumatic Diseases chapter, details prevention stratification in RA intervention."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
