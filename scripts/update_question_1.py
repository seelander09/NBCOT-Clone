import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
data = json.loads(path.read_text())
for item in data:
    if item["order"] == 1:
        item["content"] = (
            "**Correct Answer: Problem-solve potential accessibility issues and modifications needed in the school environment.**\n\n"
            "**Why this is right:** Transition conferences that happen before a medically fragile student re-enters school focus on the immediate supports the student will need to access the educational setting safely. The rehab team comes to the table so the school-based providers can understand current strengths/limits, collaborate on seating, mobility, emergency plans, and environmental modifications. IDEA and AOTA school-based practice guidelines call out environmental accessibility as the primary agenda for medical-to-school transition meetings.\n\n"
            "**NBCOT is testing:** Can you prioritize functional access when multiple needs compete? The exam wants you to pick the option that ensures safe school participation on day one, not long-range paperwork.\n\n"
            "**Why the other options fall short**\n- *Identify IEP goals for the remainder of the academic year:* Long-term academic goals are addressed in scheduled IEP meetings. This transition meeting is about re-entry logistics, not drafting annual goals.\n- *Review functional gains made in rehabilitation:* The rehab summary is shared, but the question asks for the *primary purpose*. Discussing progress informs the conversation, yet the actionable output must be accessibility planning so the child can participate immediately.\n\n"
            "**Book / practice anchor:** AOTA School-based Practice Guideline (3rd ed.) and IDEA 2004 both specify that hospital-to-school transition meetings prioritize environmental modifications, emergency procedures, and assistive technology that enable safe access to curriculum."
        )
        break

path.write_text(json.dumps(data, indent=2))
