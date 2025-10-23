import rawPracticeQuestions from "./practice-questions-4.json";
import { buildPracticeQuestions, type RawPracticeQuestion } from "./practiceQuestions";

const practiceQuestions4 = buildPracticeQuestions(rawPracticeQuestions as RawPracticeQuestion[], {
  idPrefix: "otr4-q",
});

export default practiceQuestions4;
