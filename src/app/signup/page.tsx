import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your StudyPack account",
  description:
    "Claim your practice exam seat and sync progress across flashcards, drills, and study plans.",
};

export default function SignupPage() {
  return (
    <main className="section-space">
      <div className="container-grid max-w-5xl space-y-12">
        <div className="space-y-4">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-sky-600">
            Start for free
          </span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            Create an account to unlock the full StudyPack clone experience.
          </h1>
          <p className="text-lg text-slate-600">
            Choose a plan, complete checkout, and launch into adaptive exams, flashcards, and analytics. While payments are in flight, use the preview login to explore the dashboard.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-card">
            <h2 className="font-heading text-2xl text-slate-900">Create your account</h2>
            <p className="text-sm text-slate-600">
              We&apos;ll store your profile, study preferences, and future purchases under this login.
            </p>
            <SignupForm />
            <p className="text-xs text-slate-400">
              By creating an account you agree to future Terms and Privacy updates once billing goes live.
            </p>
          </section>
          <section className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-card">
            <h2 className="font-heading text-2xl text-slate-900">Preview login</h2>
            <ol className="space-y-4 text-sm text-slate-600">
              <li>
                <strong className="font-heading text-slate-900">1. Enter the seeded credentials</strong>
                <p>We&apos;ll route you into the protected dashboard placeholder immediately.</p>
              </li>
              <li>
                <strong className="font-heading text-slate-900">2. Explore the platform</strong>
                <p>Review exam templates, flashcard decks, and upcoming analytics panels.</p>
              </li>
              <li>
                <strong className="font-heading text-slate-900">3. Upgrade with Stripe</strong>
                <p>Once you&apos;re ready, continue to secure checkout to activate full access.</p>
              </li>
            </ol>
            <LoginForm />
            <p className="text-xs text-slate-400">
              Demo account: candidate@example.com / LetMeIn123!
            </p>
            <div className="pt-4 text-sm text-slate-500">
              <p className="font-semibold text-slate-700">Prefer to talk it through?</p>
              <p>
                Reach out to the team via <Link className="text-sky-600 underline" href="/contact">Contact</Link> to coordinate cohort onboarding or institution billing.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
