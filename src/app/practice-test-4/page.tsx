import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth";
import { getPracticeTestSetById } from "@/data/practiceTestSets";
import { PracticeTestShell } from "@/app/practice-test/practice-test-shell";

export const metadata: Metadata = {
  title: "Practice test 4",
  description:
    "Second full-length NBCOT-style practice session powered by the new screenshot batch. Capture responses now, backfill rationales and answer keys later.",
};

export default async function PracticeTestFourPage() {
  await requireAuth();
  const practiceSet = getPracticeTestSetById("otr-set-4");

  if (!practiceSet) {
    throw new Error("Practice set 4 is unavailable.");
  }

  return (
    <main className="bg-slate-950/5">
      <div className="container-grid py-12">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Practice lab</p>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-slate-900">{practiceSet.title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">{practiceSet.description}</p>
        </header>
        <PracticeTestShell
          questions={practiceSet.questions}
          testId={practiceSet.id}
          testLabel={practiceSet.title}
          testSlug={practiceSet.slug}
          sessionStorageKey={practiceSet.sessionStorageKey}
          analyticsStorageKey={practiceSet.analyticsStorageKey}
        />
      </div>
    </main>
  );
}
