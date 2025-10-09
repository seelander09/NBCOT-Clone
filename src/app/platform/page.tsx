import type { Metadata } from "next";

const pillars = [
  {
    name: "Adaptive prep",
    focus: "Tune every session to your weak domains while spacing repeat exposure across the item bank.",
  },
  {
    name: "Connected resources",
    focus: "Flashcards, drills, and full exams pull from a unified NBCOT-aligned knowledge graph.",
  },
  {
    name: "Evidence-driven analytics",
    focus: "Scaled scoring, confidence intervals, and remediation recommendations update after every action.",
  },
];

const roadmap = [
  {
    label: "Q4 2025",
    items: [
      "Integrate production-grade auth + entitlement checks",
      "Launch exam session autosave + multi-device resume",
      "Ship v1 analytics dashboard with scaled score trends",
    ],
  },
  {
    label: "Q1 2026",
    items: [
      "Vector-store driven remediation suggestions inside review mode",
      "Full spaced-repetition scheduling across decks",
      "Coach handoff workflow for cohort partners",
    ],
  },
];

export const metadata: Metadata = {
  title: "Platform overview",
  description: "Understand the product pillars behind the NBCOT StudyPack clone roadmap.",
};

export default function PlatformPage() {
  return (
    <main className="section-space">
      <div className="container-grid space-y-12">
        <header className="space-y-4">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-sky-600">
            Platform pillars
          </span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            A connected prep environment built for NBCOT candidates.
          </h1>
          <p className="text-lg text-slate-600">
            Everything we build ladders up to fast feedback, realistic practice, and measurable improvement. This outline keeps the product and engineering roadmap aligned.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.name} className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="font-heading text-xl text-slate-900">{pillar.name}</h2>
              <p className="mt-3 text-sm text-slate-600">{pillar.focus}</p>
            </article>
          ))}
        </section>
        <section className="space-y-6 rounded-3xl bg-slate-900 p-10 text-white">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl">Delivery roadmap</h2>
            <p className="text-sm text-slate-200">
              Upcoming milestones anchor our integration work with content, payments, and analytics infrastructure.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {roadmap.map((phase) => (
              <div key={phase.label} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-heading text-lg text-white">{phase.label}</h3>
                <ul className="space-y-2 text-sm text-slate-100">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 h-2 w-2 rounded-full bg-sky-300"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
