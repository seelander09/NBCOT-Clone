'use client';

import { useEffect, useMemo, useState } from 'react';

type SummaryRow = {
  testId: string;
  testLabel: string;
  attempts: number;
  accuracyPercent: number | null;
  totalDurationMinutes: number;
};

type DomainAggregate = {
  domainId: string;
  domainTitle: string;
  answered: number;
  correct: number;
  timeSeconds: number;
};

export function AnalyticsSummary() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [domains, setDomains] = useState<DomainAggregate[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics'));
    const nextRows: SummaryRow[] = [];
    const domainMap = new Map<string, DomainAggregate>();

    keys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        if (!value) return;
        const entries = JSON.parse(value) as Array<{
          testId: string;
          testLabel: string;
          accuracyPercent?: number | null;
          totalDurationMs?: number;
          domainBreakdown?: Array<{
            domainId: string;
            domainTitle: string;
            answered: number;
            correct: number;
            timeSeconds: number;
          }>;
        }>;

        if (!Array.isArray(entries) || entries.length === 0) return;

        const last = entries[entries.length - 1];
        const attempts = entries.length;
        const accuracyPercentValues = entries
          .map((e) => (typeof e.accuracyPercent === 'number' ? e.accuracyPercent : null))
          .filter((n): n is number => n !== null);
        const accuracyPercent =
          accuracyPercentValues.length > 0
            ? Math.round(
                accuracyPercentValues.reduce((sum, n) => sum + n, 0) / accuracyPercentValues.length,
              )
            : null;
        const totalDurationMinutes = Math.round(
          (entries.reduce((sum, e) => sum + (e.totalDurationMs ?? 0), 0) / 1000 / 60) * 10,
        ) / 10;

        nextRows.push({
          testId: last.testId,
          testLabel: last.testLabel,
          attempts,
          accuracyPercent,
          totalDurationMinutes,
        });

        // Aggregate domains across entries
        for (const entry of entries) {
          for (const d of entry.domainBreakdown ?? []) {
            const key = d.domainId;
            const existing = domainMap.get(key) ?? {
              domainId: d.domainId,
              domainTitle: d.domainTitle,
              answered: 0,
              correct: 0,
              timeSeconds: 0,
            };
            existing.answered += d.answered;
            existing.correct += d.correct;
            existing.timeSeconds += d.timeSeconds;
            domainMap.set(key, existing);
          }
        }
      } catch {
        // ignore invalid
      }
    });

    setRows(nextRows);
    setDomains(Array.from(domainMap.values()));
  }, []);

  const sortedRows = useMemo(() => rows.sort((a, b) => (b.accuracyPercent ?? -1) - (a.accuracyPercent ?? -1)), [rows]);
  const sortedDomains = useMemo(
    () => domains.sort((a, b) => (b.correct / Math.max(1, b.answered)) - (a.correct / Math.max(1, a.answered))),
    [domains],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Analytics</p>
        <h2 className="mt-3 font-heading text-2xl text-slate-900">Cross-set summary</h2>
        <p className="mt-2 text-sm text-slate-600">Complete a practice test to populate your analytics here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Analytics</p>
      <h2 className="mt-3 font-heading text-2xl text-slate-900">Cross-set summary</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">By practice set</p>
          <div className="mt-2 divide-y divide-slate-200">
            {sortedRows.map((row) => (
              <div key={row.testId} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{row.testLabel}</p>
                  <p className="text-xs text-slate-500">Attempts: {row.attempts} · Time: {row.totalDurationMinutes}m</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {row.accuracyPercent !== null ? `${row.accuracyPercent}%` : 'n/a'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">By domain</p>
          <div className="mt-2 divide-y divide-slate-200">
            {sortedDomains.map((d) => {
              const acc = d.answered > 0 ? Math.round((d.correct / d.answered) * 100) : null;
              const mins = Math.round((d.timeSeconds / 60) * 10) / 10;
              return (
                <div key={d.domainId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{d.domainTitle}</p>
                    <p className="text-xs text-slate-500">Answered: {d.answered} · Time: {mins}m</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{acc !== null ? `${acc}%` : 'n/a'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


