import rawPracticeQuestions from "./practice-tests/otr-set-4/questions.json";
import { buildPracticeQuestions, type RawPracticeQuestion } from "./practiceQuestions";

const practiceQuestions4 = buildPracticeQuestions(rawPracticeQuestions as RawPracticeQuestion[], {
  idPrefix: "otr4-q",
});

export default practiceQuestions4;
