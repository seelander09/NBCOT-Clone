import type { Metadata } from "next";
import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import practiceQuestions from "@/data/practiceQuestions";

import { PracticeTestShell } from "./practice-test-shell";

export const metadata: Metadata = {
  title: "Practice test",
  description: "Full-length NBCOT-style practice session with rationales, book anchors, and exam strategy cues.",
};

export default async function PracticeTestPage() {
  await requireAuth();

  return (
    <main className="bg-slate-950/5">
      <div className="container-grid py-12">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Practice lab</p>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-slate-900">
            NBCOT practice test experience
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Work through the screenshots you uploaded, capture your answers, and tap into the structured rationales and textbook anchors imported from your study log. Use the navigator to jump between items and flag anything you want to revisit before you score the session.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/practice-lab"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Explore all practice sets
            </Link>
          </div>
        </header>
        <PracticeTestShell questions={practiceQuestions} />
      </div>
    </main>
  );
}
