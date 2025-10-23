import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth";
import { practiceSetCatalog } from "@/data/practiceSetCatalog";

import { PracticeSetList } from "./_components/practice-set-list";

export const metadata: Metadata = {
  title: "Practice lab catalog",
  description: "Browse available NBCOT-style practice exams and track what is coming next.",
};

export default async function PracticeLabCatalogPage() {
  await requireAuth();

  return (
    <main className="bg-slate-950/5 min-h-screen">
      <div className="container-grid py-12">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Practice lab</p>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-slate-900">Practice sets library</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Choose from the available full-length exams. Approved sets include rationales, book anchors, and remediation hooks.
            In-progress sets display their current QA status so you know what is coming soon.
          </p>
        </header>
        <PracticeSetList entries={practiceSetCatalog} />
      </div>
    </main>
  );
}
