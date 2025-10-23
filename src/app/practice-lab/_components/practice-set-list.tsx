'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { PracticeSetCatalogEntry } from "@/data/practiceSetCatalog";

type PracticeSetListProps = {
  entries: PracticeSetCatalogEntry[];
};

type AnalyticsSnapshot = {
  submissions: number;
  lastSubmittedAt?: string;
  averageAccuracy?: number | null;
  hasSession: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_progress: "In QA",
  coming_soon: "Coming soon",
};

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  coming_soon: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.coming_soon;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${colors}`}>
      {label}
    </span>
  );
}

function formatDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function CoverageMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-700">{value}%</p>
    </div>
  );
}

export function PracticeSetList({ entries }: PracticeSetListProps) {
  const [analyticsById, setAnalyticsById] = useState<Record<string, AnalyticsSnapshot>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function loadAnalytics() {
      const next: Record<string, AnalyticsSnapshot> = {};

      entries.forEach((entry) => {
        let submissions = 0;
        let lastSubmittedAt: string | undefined;
        let averageAccuracy: number | null = null;
        let hasSession = false;

        if (typeof window !== "undefined") {
          try {
            const analyticsRaw = window.localStorage.getItem(entry.analyticsStorageKey);
            if (analyticsRaw) {
              const parsed = JSON.parse(analyticsRaw) as Array<{ submittedAt?: string; accuracyPercent?: number }>;
              if (Array.isArray(parsed) && parsed.length > 0) {
                submissions = parsed.length;
                const lastEntry = parsed[parsed.length - 1];
                lastSubmittedAt = lastEntry?.submittedAt;

                const validAccuracies = parsed
                  .map((record) => (typeof record.accuracyPercent === "number" ? record.accuracyPercent : null))
                  .filter((value): value is number => value !== null);

                if (validAccuracies.length > 0) {
                  averageAccuracy =
                    validAccuracies.reduce((total, value) => total + value, 0) / validAccuracies.length;
                }
              }
            }
          } catch (error) {
            console.warn("Failed to read practice analytics", error);
          }

          try {
            const sessionRaw = window.localStorage.getItem(entry.sessionStorageKey);
            hasSession = Boolean(sessionRaw && sessionRaw.length > 2);
          } catch {
            hasSession = false;
          }
        }

        next[entry.id] = {
          submissions,
          lastSubmittedAt,
          averageAccuracy,
          hasSession,
        };
      });

      setAnalyticsById(next);
    }

    loadAnalytics();
    const handleStorage = (event: StorageEvent) => {
      if (entries.some((entry) => event.key === entry.analyticsStorageKey || event.key === entry.sessionStorageKey)) {
        loadAnalytics();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [entries]);

  const catalogWithAnalytics = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        analytics: analyticsById[entry.id],
      })),
    [entries, analyticsById],
  );

  return (
    <div className="grid gap-4">
      {catalogWithAnalytics.map(({ entry, analytics }) => {
        const formattedLastSubmitted = formatDate(analytics?.lastSubmittedAt);
        const averageAccuracy =
          typeof analytics?.averageAccuracy === "number"
            ? `${Math.round(analytics.averageAccuracy)}%`
            : "n/a";

        return (
          <article
            key={entry.id}
            className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-2xl text-slate-900">{entry.title}</h2>
                <StatusBadge status={entry.status} />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{entry.description}</p>

              <dl className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                <div>
                  <dt className="font-semibold text-slate-700">Questions</dt>
                  <dd className="mt-1 text-slate-900">{entry.questionCount}</dd>
                </div>
                {entry.releaseDate ? (
                  <div>
                    <dt className="font-semibold text-slate-700">Release</dt>
                    <dd className="mt-1 text-slate-900">{entry.releaseDate}</dd>
                  </div>
                ) : null}
                {entry.domains && entry.domains.length > 0 ? (
                  <div>
                    <dt className="font-semibold text-slate-700">Domains</dt>
                    <dd className="mt-1 text-slate-900">{entry.domains.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 flex flex-wrap gap-6">
                <CoverageMeter label="Rationales" value={entry.coverage.rationale} />
                <CoverageMeter label="Book anchors" value={entry.coverage.bookAnchor} />
                <CoverageMeter label="Remediation" value={entry.coverage.remediation} />
              </div>

              <div className="mt-5 flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span className="text-[10px] font-semibold text-slate-600">
                  Submissions: {analytics?.submissions ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-slate-600">
                  Last submitted: {formattedLastSubmitted ?? "n/a"}
                </span>
                <span className="text-[10px] font-semibold text-slate-600">Average accuracy: {averageAccuracy}</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 md:min-w-[220px]">
              <Link
                href={entry.slug}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
              >
                {entry.status === "available" ? "Start practice test" : "View details"}
              </Link>
              {analytics?.hasSession ? (
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Resume session in progress
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
