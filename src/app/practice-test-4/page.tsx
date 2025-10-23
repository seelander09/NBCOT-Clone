import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth";
import practiceQuestions4 from "@/data/practiceQuestions4";
import { PracticeTestShell } from "@/app/practice-test/practice-test-shell";

export const metadata: Metadata = {
  title: "Practice test 4",
  description:
    "Second full-length NBCOT-style practice session powered by the new screenshot batch. Capture responses now, backfill rationales and answer keys later.",
};

export default async function PracticeTestFourPage() {
  await requireAuth();

  return (
    <main className="bg-slate-950/5">
      <div className="container-grid py-12">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Practice lab</p>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-slate-900">
            NBCOT practice test experience — Set 4
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            This run uses the second batch of screenshots you uploaded. Work straight from the images for now,
            then plug in answer keys, rationales, and book anchors when they&apos;re ready. Progress saves locally so you can pause and resume.
          </p>
        </header>
        <PracticeTestShell
          questions={practiceQuestions4}
          sessionStorageKey="nbcot-practice-session-otr4"
          analyticsStorageKey="nbcot-practice-analytics-otr4"
        />
      </div>
    </main>
  );
}
