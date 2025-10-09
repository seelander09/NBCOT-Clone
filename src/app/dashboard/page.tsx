import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard preview",
  description: "Placeholder dashboard gated behind future authentication logic.",
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const displayName = user.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : user.email;

  return (
    <main className="section-space">
      <div className="container-grid space-y-8">
        <header className="space-y-3">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-sky-600">
            Dashboard preview
          </span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-base text-slate-600">
            This protected area will surface your active exam sessions, flashcard streaks, and study plan tasks once authentication is fully wired up.
          </p>
        </header>
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Exams
            </p>
            <h2 className="mt-3 font-heading text-2xl text-slate-900">Session timeline</h2>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;ll pull your latest attempts, scaled scores, and rationales here.
            </p>
          </article>
          <article className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Flashcards
            </p>
            <h2 className="mt-3 font-heading text-2xl text-slate-900">Next-up queue</h2>
            <p className="mt-2 text-sm text-slate-600">
              Adaptive deck suggestions and spaced repetition streaks appear in this slot.
            </p>
          </article>
          <article className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Study plan
            </p>
            <h2 className="mt-3 font-heading text-2xl text-slate-900">Today&apos;s focus</h2>
            <p className="mt-2 text-sm text-slate-600">
              Upcoming tasks and reminders populate here along with streak protections.
            </p>
          </article>
        </section>
        <section className="rounded-3xl bg-slate-900 p-8 text-slate-100">
          <h2 className="font-heading text-2xl text-white">Integration notes</h2>
          <p className="mt-2 text-sm text-slate-300">
            Authentication now routes through NextAuth and Prisma. Downstream pages should continue importing <code>requireAuth</code> for a consistent guard.
          </p>
        </section>
      </div>
    </main>
  );
}
