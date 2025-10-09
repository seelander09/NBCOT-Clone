import Link from "next/link";
import {
  faqItems,
  heroContent,
  studyPackFeatures,
  testimonials,
  valueProps,
} from "@/data/landing";

const practiceTestHref = process.env.SKIP_AUTH === "true" ? "/practice-test" : "/signup";
const stats = [
  { label: "Questions in the bank", value: "1,200+" },
  { label: "Average score boost", value: "+12 points" },
  { label: "Learners served", value: "9,800+" },
];

const resourceHighlights = [
  {
    title: "Adaptive exam engine",
    body: "Powered by your NBCOT-aligned vector store to serve new questions and avoid repeats across attempts.",
  },
  {
    title: "Evidence-based rationales",
    body: "Every explanation points you to frameworks and references so you can keep expanding your clinical reasoning.",
  },
  {
    title: "Progress that sticks",
    body: "Study streaks, reminders, and cross-device continuity keep momentum strong between class, fieldwork, and life.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      <HeroSection />
      <InclusionsSection />
      <ValuePropsSection />
      <HighlightsSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="section-space">
      <div className="container-grid grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700">
            {heroContent.eyebrow}
          </span>
          <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {heroContent.title}
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            {heroContent.subtitle}
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href={practiceTestHref}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
            >
              {heroContent.primaryCta}
            </Link>
            <Link
              href="/tour"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-sky-700 transition hover:border-sky-200 hover:bg-sky-50"
            >
              {heroContent.secondaryCta}
            </Link>
          </div>
          <div className="flex items-center gap-4 pt-4 text-sm text-slate-500">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-semibold text-sky-700">
                {heroContent.price}
              </span>
              <span>per practice exam</span>
            </div>
            <span>·</span>
            <span>{heroContent.priceNote}</span>
          </div>
        </div>
        <div className="grid gap-6 rounded-3xl bg-white p-8 shadow-card">
          <div className="grid gap-3">
            <h2 className="font-heading text-2xl text-slate-900">What you&apos;ll see inside</h2>
            <p className="text-base text-slate-600">
              Track progress across domains, watch your scaled score climb, and hone in on the tasks that drive a pass on exam day.
            </p>
          </div>
          <dl className="grid gap-4 text-sm text-slate-500">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-100 px-4 py-3">
                <dt className="text-slate-500">{stat.label}</dt>
                <dd className="font-heading text-xl text-slate-900">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Practice exam sessions are timed, autosave progress, and transition into review mode with rationales and references once your clock runs out.
          </div>
        </div>
      </div>
    </section>
  );
}

function InclusionsSection() {
  return (
    <section className="section-space bg-white">
      <div className="container-grid space-y-12">
        <div className="max-w-3xl space-y-4">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-sky-600">
            Everything in the StudyPack
          </span>
          <h2 className="font-heading text-3xl tracking-tight text-slate-900 sm:text-4xl">
            Built to mirror the official NBCOT StudyPack—minus the  price tag.
          </h2>
          <p className="text-lg text-slate-600">
            Unlock all the tools you expect: full-length practice exam, on-demand drills, flashcards, and personalized planning so you arrive on exam day ready.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {studyPackFeatures.map((feature) => (
            <article key={feature.title} className="h-full rounded-3xl border border-slate-100 bg-slate-50/40 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-card">
              <div className="space-y-2">
                <h3 className="font-heading text-xl text-slate-900">{feature.title}</h3>
                <p className="font-semibold text-slate-700">{feature.summary}</p>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuePropsSection() {
  return (
    <section className="section-space">
      <div className="container-grid grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <h2 className="font-heading text-3xl tracking-tight text-slate-900 sm:text-4xl">
            Designed around what helps candidates pass.
          </h2>
          <p className="text-lg text-slate-600">
            Each feature is anchored in feedback from thousands of OT and OTA candidates and powered by a high-quality vector store of NBCOT-aligned content.
          </p>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            Learn about the platform ?
          </Link>
        </div>
        <div className="grid gap-6">
          {valueProps.map((prop) => (
            <div key={prop.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
              <h3 className="font-heading text-xl text-slate-900">{prop.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightsSection() {
  return (
    <section className="section-space bg-slate-900 text-slate-100">
      <div className="container-grid grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="space-y-5">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-sky-300">
            What makes us different
          </span>
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Practice powered by intelligent retrieval and exam-day realism.
          </h2>
          <p className="text-base text-slate-200">
            Your existing NBCOT data store gives us a deep bank of authentic scenarios. We layer in adaptive delivery, timer logic, and exam-day ergonomics to replicate the pressure and pacing you&apos;ll face on the real test.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {resourceHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-heading text-lg text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-200">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-slate-800 p-8 shadow-card">
          <h3 className="font-heading text-2xl text-white">How the practice exam works</h3>
          <ol className="mt-6 space-y-4 text-sm text-slate-200">
            <li>
              <strong className="font-heading text-sky-200">01 · Set your exam window</strong>
              <p>Choose the domains to emphasize, schedule your timer, and lock in accommodations if needed.</p>
            </li>
            <li>
              <strong className="font-heading text-sky-200">02 · Focus and respond</strong>
              <p>Navigate single-best-answer, multi-select, and clinical simulation prompts in an interface modeled on NBCOT.</p>
            </li>
            <li>
              <strong className="font-heading text-sky-200">03 · Review & plan</strong>
              <p>Receive scaled scores, domain heat maps, remediation links, and study plan adjustments automatically.</p>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="section-space bg-white">
      <div className="container-grid space-y-10">
        <div className="max-w-3xl space-y-4">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-sky-600">
            Loved by candidates
          </span>
          <h2 className="font-heading text-3xl tracking-tight text-slate-900 sm:text-4xl">
            Real feedback from learners who hit their target score.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="flex h-full flex-col justify-between rounded-3xl border border-slate-100 bg-slate-50/60 p-6">
              <blockquote className="text-sm text-slate-700">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-slate-900">
                {testimonial.name}
                <span className="block text-xs font-normal text-slate-500">
                  {testimonial.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="section-space">
      <div className="container-grid grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <h2 className="font-heading text-3xl tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="text-base text-slate-600">
            Everything you need to know about pricing, exam access, and how our practice tools compare to the official StudyPack.
          </p>
        </div>
        <div className="space-y-4">
          {faqItems.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-3xl border border-slate-100 bg-white p-6 transition hover:border-sky-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-900">
                <span>{faq.question}</span>
                <span className="text-sky-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="section-space bg-gradient-to-br from-sky-600 via-sky-500 to-sky-700 text-white">
      <div className="container-grid flex flex-col gap-6 text-center sm:text-left sm:gap-8 sm:rounded-3xl sm:bg-white/5 sm:p-12">
        <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
          Ready to see how close you are to passing?
        </h2>
        <p className="text-base text-sky-50">
          Launch your full-length practice exam, review detailed analytics, and stay on top of your study plan for just .
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
          <Link
            href={practiceTestHref}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-sky-700 shadow-lg shadow-sky-900/20 transition hover:bg-slate-100"
          >
            Create your account
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Talk with our team
          </Link>
        </div>
      </div>
    </section>
  );
}



