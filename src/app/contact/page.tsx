import type { Metadata } from "next";

const contactChannels = [
  {
    label: "Product questions",
    detail: "product@nbcot-clone.test",
    note: "Expect a reply within one business day.",
  },
  {
    label: "Institution partnerships",
    detail: "partnerships@nbcot-clone.test",
    note: "We support cohort pricing, LMS integrations, and analytics exports.",
  },
  {
    label: "Technical support",
    detail: "+1 (800) 555-0198",
    note: "Call or text 9am-10pm ET while we build out chat support.",
  },
];

export const metadata: Metadata = {
  title: "Talk with our team",
  description: "Reach out for product, partnership, or technical support questions.",
};

export default function ContactPage() {
  return (
    <main className="section-space">
      <div className="container-grid space-y-12">
        <header className="space-y-4">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-sky-600">
            Contact
          </span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            We&apos;re here to help you cross the finish line.
          </h1>
          <p className="text-lg text-slate-600">
            Drop us a note below or reach out directly. We can fast-track onboarding, billing, or technical troubleshooting as you explore the StudyPack clone.
          </p>
        </header>
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <form className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-card">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Jamie Rivera"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@school.edu"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="topic">
                Topic
              </label>
              <select
                id="topic"
                name="topic"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                defaultValue="product"
              >
                <option value="product">Product question</option>
                <option value="partnership">Partnership inquiry</option>
                <option value="support">Technical support</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Share how we can help."
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
            >
              Send message
            </button>
            <p className="text-xs text-slate-400">
              Submissions land in our shared inbox while we wire up live chat and CRM automations.
            </p>
          </form>
          <aside className="space-y-4 rounded-3xl bg-slate-900 p-8 text-slate-100">
            <h2 className="font-heading text-2xl text-white">Direct lines</h2>
            <p className="text-sm text-slate-300">
              Prefer to skip the form? Reach out using the contact info below and we&apos;ll route your request.
            </p>
            <ul className="space-y-4 text-sm text-slate-100">
              {contactChannels.map((channel) => (
                <li key={channel.label} className="space-y-1">
                  <p className="font-heading text-base text-white">{channel.label}</p>
                  <p className="font-mono text-slate-100">{channel.detail}</p>
                  <p className="text-xs text-slate-300">{channel.note}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
