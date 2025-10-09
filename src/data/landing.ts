export type Feature = {
  title: string;
  summary: string;
  description: string;
};

export type ValueProp = {
  title: string;
  description: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const heroContent = {
  eyebrow: "OT & OTA Candidates",
  title: "Master the NBCOT exam with confidence",
  subtitle:
    "A modern StudyPack experience with a full-length practice exam, mini tests, flashcards, and personalized study planning guidance.",
  price: "",
  priceNote: "Introductory price per practice exam access.",
  primaryCta: "Start your practice exam",
  secondaryCta: "Preview study tools",
};

export const studyPackFeatures: Feature[] = [
  {
    title: "Full Practice Exam",
    summary: "Replicates the timing, structure, and scaled scoring you'll see on exam day.",
    description:
      "Simulate the official test interface with domain-weighted questions, pacing guidance, and a performance report mapped to NBCOT score bands.",
  },
  {
    title: "Practice Tests",
    summary: "Shorter drills to sharpen skills across key NBCOT domains.",
    description:
      "Select by domain, difficulty, or time commitment. Compare progress across attempts and see where you stack up against peers.",
  },
  {
    title: "Mini Tests",
    summary: "Quick-hit quizzes with instant rationales and references.",
    description:
      "Use mini tests between study sessions to reinforce the rationales behind correct answers and avoid repeating mistakes.",
  },
  {
    title: "Flashcards",
    summary: "Curated decks plus your own custom cards.",
    description:
      "Review by exam domain, filter by weak areas, and build custom decks fed by our knowledge graph and vector search.",
  },
  {
    title: "Knowledge Match",
    summary: "Gamified drill for rapid recall and categorization.",
    description:
      "Match clinical scenarios to NBCOT domains under timed pressure to boost retrieval speed and confidence.",
  },
  {
    title: "My Study Plan",
    summary: "Dynamic study roadmap tuned to your performance trends.",
    description:
      "Get adaptive task recommendations, resource suggestions, and calendar-friendly scheduling that fits your timeline.",
  },
];

export const valueProps: ValueProp[] = [
  {
    title: "Built with NBCOT-aligned data",
    description:
      "Questions are generated and reviewed against the latest NBCOT exam blueprint so every session mirrors the competencies that matter.",
  },
  {
    title: "Actionable analytics",
    description:
      "Translate practice results into insights with scaled scores, domain proficiency charts, and recommended next steps.",
  },
  {
    title: "Learner-first experience",
    description:
      "Clean interface, mobile-ready layouts, and accessibility features make it easy to study whenever and wherever you have time.",
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "The practice exam felt just like test day. Seeing my scaled score ahead of time let me focus on the domains that needed attention.",
    name: "Jordan R.",
    role: "OTR Candidate",
  },
  {
    quote:
      "Mini tests and flashcards kept me consistent. I loved the rationales—they finally made the tricky questions click.",
    name: "Sam P.",
    role: "COTA Candidate",
  },
  {
    quote:
      "The study plan synced perfectly with my semester schedule. It highlighted what to review between fieldwork days.",
    name: "Alex M.",
    role: "OTD Student",
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "Is this an official NBCOT product?",
    answer:
      "We are an independent platform built to mirror the NBCOT StudyPack experience for practice purposes. While we reference the exam blueprint, we are not affiliated with or endorsed by NBCOT.",
  },
  {
    question: "How long do I have access after purchasing?",
    answer:
      "Each  purchase unlocks 60 days of access to the practice exam, analytics dashboard, and study tools. Renew anytime to refresh your attempts and new content drops.",
  },
  {
    question: "Can I review rationales after finishing a practice exam?",
    answer:
      "Yes. Review mode provides full rationales, references, and remediation tips for every question so you understand the \"why\" behind each answer.",
  },
  {
    question: "Do you offer group or institutional pricing?",
    answer:
      "We have bulk pricing for programs supporting multiple cohorts. Contact us at support@nbcot-clone.com and we'll tailor a plan for your students.",
  },
];

