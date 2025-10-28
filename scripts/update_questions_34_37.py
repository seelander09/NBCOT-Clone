# -*- coding: utf-8 -*-
import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
updates = {
  34: "**Correct Answer: Stall shower with a zero-entry and door width of 33–36 in (84–91 cm).**\n\n**Why this is right:** The child uses a wheelchair and requires maximum assistance; a curbless shower with adequate door width allows safe transfer and caregiver access. It matches ADA guidelines and pediatric complex care standards.\n\n**Why other options miss:**\n- *Standard bathtub with padded seat:* Transfers into a tub are unsafe and difficult for dependent wheelchair users.\n- *Bath/shower combo with grab bar:* Still requires stepping over a tub wall and is not feasible for total assist transfers.\n\n**Reference anchor:** AOTA Home Modifications guidelines recommend zero-threshold roll-in showers for wheelchair users needing maximal assistance.",
  35: "**Correct Answer: Results from a sensory profile would help identify contributing factors to the motor delays.**\n\n**Why this is right:** The first-grade student shows handwriting difficulties, motor coordination issues, and challenges keeping up with peers—behaviors often linked to sensory processing deficits. A sensory profile provides data on modulation/praxis to inform intervention.\n\n**Why other options miss:**\n- *Assuming motor skills exceed peers* disregards evidence of struggles.\n- *Concluding developmental level is on track* contradicts observed delays.\n\n**Reference anchor:** Case-Smith & O'Brien emphasize sensory processing evaluations for children with coordination and handwriting issues.",
  36: "**Correct Answer: Further assessment of development and emotional function is indicated.**\n\n**Why this is right:** The 2-year-old shows mixed abilities (self-feeding, stacking) but lacks imitation, gross motor behaviors, and eye contact; irritability was observed. This red-flag pattern warrants comprehensive developmental/emotional evaluation rather than quick conclusions.\n\n**Why other options miss:**\n- *Age-appropriate development* ignores multiple delays.\n- *Fine and gross motor delays only* underestimates potential broader developmental concerns.\n\n**Reference anchor:** AOTA Early Intervention guidelines recommend comprehensive assessment when multiple developmental domains present atypically.",
  37: "**Correct Answer: Role-play a social script with the student related to eating in the cafeteria.**\n\n**Why this is right:** Role-playing provides rehearsal of expected behaviors, builds social cognition, and allows immediate feedback—ideal for students with autism to generalize cafeteria routines.\n\n**Why other options miss:**\n- *Have the student create a social story alone:* Without guided teaching, the student may not internalize the behaviors.\n- *Checklist use* supports monitoring but doesn't teach nuanced social interactions.\n\n**Reference anchor:** Gray’s Social Stories and AOTA autism practice guidelines highlight guided role-play as an evidence-based intervention for cafeteria behavior."
}

data = json.loads(path.read_text())
for item in data:
    if item['order'] in updates:
        item['content'] = updates[item['order']]

path.write_text(json.dumps(data, indent=2))
