import json
from pathlib import Path

path = Path(r"e:/Projects/NBCOT-Clone/src/data/practice-tests/otr-baseline/questions.json")
data = json.loads(path.read_text())
for item in data:
    if item["order"] == 7:
        item["content"] = (
            "**Correct Answer: Define and discuss the relapse-prevention plan the teen recommended.**\n\n"
            "**Why this is right:** Family-centered relapse prevention hinges on shared understanding of triggers, coping strategies, and roles. Having the family rehearse the teenager's plan builds buy-in, clarifies expectations, and sets up consistent support at home -- exactly what the question frames as the group goal.\n\n"
            "**OT reasoning:** Motivational interviewing and relapse-prevention models (Marlatt and Gordon) emphasize collaborative planning, spotting early warning signs, and agreeing on responses. The OTR facilitates the conversation so caregivers know how to reinforce coping strategies in real time.\n\n"
            "**Why the alternatives miss:**\n- *Review group rules about healthy food or drug use:* A rules recap is generic and does not tailor relapse supports to the adolescent's triggers.\n- *Provide calorie-tracking devices:* Nutrition tracking is unrelated to substance-use prevention unless the case specifically involves an eating co-disorder.\n\n"
            "**Book anchor:** AOTA Substance Use Disorder practice guidelines describe OT's role in guiding families through relapse-prevention planning, ensuring everyone can implement coping strategies and environmental adjustments."
        )
        break

path.write_text(json.dumps(data, indent=2))
