import type { Metadata } from "next";
import Link from "next/link";

const milestones = [
  {
    title: "Practice exam engine",
    body: "Timed sessions with adaptive question selection and autosave so you can resume without losing momentum.",
  },
  {
    title: "Deep question rationales",
    body: "Each item links to NBCOT-aligned references, remediation tips, and your vector-store powered insights.",
  },
  {
    title: "Study plan autopilot",
    body: "Dynamic tasks rebalance when you miss a streak or over-index on a domain, keeping you exam-ready.",
  },
];

export const metadata: Metadata = {
  title: "Get the tour",
  description: "Preview the NBCOT StudyPack clone platform before you sign in.",
};

export default function TourPage() {
  return (
    <main className="section-space">
      <div className="container-grid space-y-12">
        <div className="space-y-5">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-sky-600">
            Platform tour
          </span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            Explore the workflows you&apos;ll rely on from signup to exam day.
          </h1>
          <p className="text-lg text-slate-600">
            The full experience spans adaptive exams, flashcards, analytics, and coaching. Here&apos;s how everything connects once you have an account.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {milestones.map((milestone) => (
            <article key={milestone.title} className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="font-heading text-xl text-slate-900">{milestone.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{milestone.body}</p>
            </article>
          ))}
        </div>
        <div className="grid gap-8 rounded-3xl bg-slate-900 p-10 text-slate-100 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <h2 className="font-heading text-2xl text-white">See it in action</h2>
            <p className="text-sm text-slate-300">
              We&apos;re building out full guided walkthroughs. While that ships, join the dashboard preview to explore the navigation, analytics, and resource library stubs.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Create your account
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Platform overview
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
