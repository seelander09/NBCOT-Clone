'use client';

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ReactMarkdown, { type Components } from "react-markdown";

import type { PracticeQuestion } from "@/data/practiceQuestions";

const ANSWER_KEYS = ["A", "B", "C", "D"];
const DEFAULT_OPTIONS = ANSWER_KEYS.map((key) => ({ key, label: key }));
const EXPORT_SUCCESS_RESET_MS = 2500;

const categoryBadgeClasses: Record<PracticeQuestion["category"], string> = {
  task: "bg-sky-100 text-sky-700 border border-sky-200",
  knowledge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  mixed: "bg-amber-100 text-amber-700 border border-amber-200",
  other: "bg-slate-200 text-slate-700 border border-slate-300",
};

const CATEGORY_RATIONALE: Record<PracticeQuestion["category"], string> = {
  task:
    "NBCOT leans on task-based vignettes to confirm you can translate textbook frameworks into safe, functional choices in real occupations.",
  knowledge:
    "Pure knowledge checks appear when NBCOT wants fast recall of standards, contraindications, or frameworks tied to safety and ethics.",
  mixed:
    "Mixed prompts intentionally combine recall and clinical reasoning so you must weigh evidence, contraindications, and client cues in the same breath.",
  other:
    "This scenario type often appears as an edge case and is meant to test your flexibility with less common practice situations.",
};

type PracticeTestShellProps = {
  questions: PracticeQuestion[];
};

type AnswerState = Record<string, string | undefined>;

type ReviewFlagState = Record<string, boolean>;

type RemediationSnippet = {
  id: string;
  title?: string;
  excerpt: string;
  source?: string;
};

type RemediationState = {
  status: "idle" | "loading" | "ready" | "error";
  items: RemediationSnippet[];
};

type ExportState = "idle" | "success";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mt-3 text-sm text-slate-700 first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="text-slate-700">{children}</em>,
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-slate-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h3: ({ children }) => <h3 className="mt-6 font-heading text-lg text-slate-900">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-5 font-heading text-base text-slate-900">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-sky-300 pl-4 text-sm text-slate-600">{children}</blockquote>
  ),
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function extractReferenceSnippets(content: string): string[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.filter((line) => /pedretti|kohlman|barthel|oasis|ayres|frames of reference|reference|assessment/i.test(line));
}

function sanitizeExcerpt(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function formatDuration(ms: number): string {
  if (ms <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    const remMinutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${remMinutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function normalizeSelections(values: string[] | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  const unique = Array.from(new Set(values));
  return unique
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .sort();
}

function selectionsMatch(selected: string[] | undefined, answerKey: string[] | undefined): boolean | null {
  if (!answerKey || answerKey.length === 0) {
    return null;
  }

  const normalizedSelected = normalizeSelections(selected);
  if (normalizedSelected.length === 0) {
    return null;
  }

  const normalizedKey = normalizeSelections(answerKey);
  if (normalizedSelected.length !== normalizedKey.length) {
    return false;
  }

  return normalizedSelected.every((value, index) => value === normalizedKey[index]);
}

export function PracticeTestShell({ questions }: PracticeTestShellProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [reviewFlags, setReviewFlags] = useState<ReviewFlagState>({});
  const [remediationById, setRemediationById] = useState<Record<string, RemediationState>>({});
  const [exportState, setExportState] = useState<ExportState>("idle");

  const [sessionStart] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setElapsedMs(Date.now() - sessionStart);
    }, 1000);

    return () => window.clearInterval(handle);
  }, [sessionStart]);

  const activeQuestion = questions[activeIndex];
  const remediationState = remediationById[activeQuestion.id];
  const keywordKey = activeQuestion.keywords.join("|");

  useEffect(() => {
    if (remediationState?.status === "loading" || remediationState?.status === "ready" || remediationState?.status === "error") {
      return;
    }

    if (!activeQuestion.remediationPrompt && activeQuestion.keywords.length === 0) {
      setRemediationById((prev) => ({
        ...prev,
        [activeQuestion.id]: { status: "error", items: [] },
      }));
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setRemediationById((prev) => ({
      ...prev,
      [activeQuestion.id]: { status: "loading", items: [] },
    }));

    fetch("/api/remediation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: activeQuestion.id,
        keywords: activeQuestion.keywords,
        prompt: activeQuestion.remediationPrompt,
        limit: 3,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return { items: [] };
        }

        try {
          return (await response.json()) as { items?: RemediationSnippet[] };
        } catch (error) {
          console.warn("Failed to parse remediation response", error);
          return { items: [] };
        }
      })
      .then((payload) => {
        if (cancelled) return;

        const items = Array.isArray(payload?.items)
          ? payload.items
              .map((item, index) => ({
                id: item?.id ?? `${activeQuestion.id}-remediation-${index}`,
                title: item?.title ?? "Reference excerpt",
                excerpt: sanitizeExcerpt(item?.excerpt ?? item?.source ?? item?.title ?? ""),
                source: sanitizeExcerpt(item?.source),
              }))
              .filter((item) => item.excerpt.length > 0)
          : [];

        setRemediationById((prev) => ({
          ...prev,
          [activeQuestion.id]: { status: "ready", items },
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Remediation lookup failed", error);
        setRemediationById((prev) => ({
          ...prev,
          [activeQuestion.id]: { status: "error", items: [] },
        }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeQuestion.id, activeQuestion.remediationPrompt, activeQuestion.keywords, activeQuestion.keywords.length, keywordKey, remediationState?.status]);

  const referenceSnippets = useMemo(
    () => extractReferenceSnippets(activeQuestion.content),
    [activeQuestion.content],
  );

  const answeredCount = useMemo(
    () =>
      questions.reduce((count, question) => {
        const response = answers[question.id];
        return count + ((response?.length ?? 0) > 0 ? 1 : 0);
      }, 0),
    [answers, questions],
  );

  const { scorableCount, correctCount } = useMemo(() => {
    let scorable = 0;
    let correct = 0;

    for (const question of questions) {
      if (question.answerKey && question.answerKey.length > 0) {
        scorable += 1;
        const response = answers[question.id];
        const comparison = selectionsMatch(response, question.answerKey);
        if (comparison === true) {
          correct += 1;
        }
      }
    }

    return { scorableCount: scorable, correctCount: correct };
  }, [answers, questions]);

  const accuracy = scorableCount > 0 ? Math.round((correctCount / scorableCount) * 100) : null;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const allAnswered = answeredCount === questions.length;
  const elapsedFormatted = formatDuration(elapsedMs);
  const canExport = answeredCount > 0;

  const activeAnswer = answers[activeQuestion.id] ?? [];
  const choiceOptions = activeQuestion.options ?? DEFAULT_OPTIONS;
  const requiredSelections = activeQuestion.requiredSelections ?? activeQuestion.answerKey?.length ?? 0;
  const isMultiSelect = requiredSelections > 1;
  const activeAnswerIsCorrect = selectionsMatch(activeAnswer, activeQuestion.answerKey);

  const showVectorRemediation = remediationState?.status === "ready" && remediationState.items.length > 0;

  const exportRows = useMemo(
    () =>
      questions.map((question) => {
        const response = normalizeSelections(answers[question.id]);
        const isCorrect = selectionsMatch(response, question.answerKey) === true;
        return {
          order: question.order,
          questionId: question.id,
          response,
          isCorrect,
          answerKey: question.answerKey ?? [],
          flagged: Boolean(reviewFlags[question.id]),
        };
      }),
    [answers, questions, reviewFlags],
  );

  function handleExport(format: "json" | "csv") {
    if (!canExport) {
      return;
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      durationMs: elapsedMs,
      answeredCount,
      scorableCount,
      correctCount,
      accuracy,
      responses: exportRows,
    };

    let blob: Blob;
    let filename: string;

    if (format === "json") {
      blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
      filename = `practice-test-${summary.generatedAt}.json`;
    } else {
      const header = ["order", "questionId", "response", "isCorrect", "answerKey", "flagged"];
      const lines = [header.join(",")];
      exportRows.forEach((row) => {
        const answerKeyValue = row.answerKey.join("|");
        const responseValue = Array.isArray(row.response) ? row.response.join("|") : String(row.response ?? "");
        const csvValues = [
          row.order,
          row.questionId,
          responseValue,
          row.isCorrect,
          answerKeyValue,
          row.flagged,
        ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`);
        lines.push(csvValues.join(","));
      });
      blob = new Blob([lines.join("\n")], { type: "text/csv" });
      filename = `practice-test-${summary.generatedAt}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportState("success");
    window.setTimeout(() => setExportState("idle"), EXPORT_SUCCESS_RESET_MS);
  }

  function handleSelectAnswer(choice: string) {
    setAnswers((prev) => {
      const existing = prev[activeQuestion.id] ?? [];
      let updated: string[];

      if (isMultiSelect) {
        if (existing.includes(choice)) {
          updated = existing.filter((value) => value !== choice);
        } else {
          updated = [...existing, choice];
          const limit = requiredSelections > 0 ? requiredSelections : undefined;
          if (limit && updated.length > limit) {
            updated = updated.slice(updated.length - limit);
          }
        }
      } else if (existing.length === 1 && existing[0] === choice) {
        updated = [];
      } else {
        updated = [choice];
      }

      const next: AnswerState = { ...prev };
      if (updated.length > 0) {
        next[activeQuestion.id] = updated;
      } else {
        delete next[activeQuestion.id];
      }
      return next;
    });
  }

  function toggleReviewFlag() {
    setReviewFlags((prev) => ({ ...prev, [activeQuestion.id]: !prev[activeQuestion.id] }));
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-16 pt-8 lg:grid-cols-[280px_1fr] lg:px-8">
      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Session summary</div>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt>Time elapsed</dt>
              <dd className="font-semibold text-slate-900">{elapsedFormatted}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Answered</dt>
              <dd className="font-semibold text-slate-900">{answeredCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Scorable</dt>
              <dd className="font-semibold text-slate-900">{scorableCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Score</dt>
              <dd className="font-semibold text-slate-900">{correctCount} / {scorableCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Accuracy</dt>
              <dd className="font-semibold text-slate-900">{accuracy !== null ? `${accuracy}%` : "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("json")}
              disabled={!canExport}
              className={classNames(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
                canExport
                  ? "border-sky-400 text-sky-600 hover:border-sky-500 hover:bg-sky-50"
                  : "cursor-not-allowed border-slate-200 text-slate-400",
              )}
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={!canExport}
              className={classNames(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
                canExport
                  ? "border-emerald-400 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50"
                  : "cursor-not-allowed border-slate-200 text-slate-400",
              )}
            >
              Export CSV
            </button>
          </div>
          {exportState === "success" ? (
            <p className="mt-3 text-xs text-emerald-600">Responses exported.</p>
          ) : null}
          {allAnswered ? (
            <p className="mt-3 text-xs text-slate-500">All questions answered. Review items flagged or export your session.</p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Session progress
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm text-slate-600">
              <span>Answered</span>
              <span className="font-semibold text-slate-900">{answeredCount}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">{progress}% complete</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navigate questions
          </div>
          <div className="grid grid-cols-6 gap-2">
            {questions.map((question, index) => {
              const isActive = index === activeIndex;
              const isAnswered = (answers[question.id]?.length ?? 0) > 0;
              const isFlagged = Boolean(reviewFlags[question.id]);

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={classNames(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                    isActive && "border-sky-500 bg-sky-50 text-sky-600",
                    !isActive && "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                    isAnswered && !isActive && "bg-emerald-50 text-emerald-600 border-emerald-200",
                    isFlagged && "ring-2 ring-offset-2 ring-amber-400",
                  )}
                  aria-label={`Jump to question ${question.order}`}
                >
                  {question.order}
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={classNames(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                categoryBadgeClasses[activeQuestion.category],
              )}
            >
              {activeQuestion.category === "other"
                ? "Scenario"
                : `${activeQuestion.category.charAt(0).toUpperCase()}${activeQuestion.category.slice(1)} based`}
            </span>
            {reviewFlags[activeQuestion.id] ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Marked for review
              </span>
            ) : null}
            {activeAnswer.length > 0 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Answer saved
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            <h1 className="font-heading text-2xl tracking-tight text-slate-900">
              Question {activeQuestion.order}
            </h1>
            {activeQuestion.subheadline ? (
              <p className="text-sm text-slate-600">{activeQuestion.subheadline}</p>
            ) : null}
            {activeQuestion.headline && activeQuestion.subheadline !== activeQuestion.headline ? (
              <p className="text-sm text-slate-500">{activeQuestion.headline}</p>
            ) : null}
            {activeQuestion.prompt ? (
              <div className="pt-2 text-base text-slate-700">
                <ReactMarkdown components={markdownComponents}>{activeQuestion.prompt}</ReactMarkdown>
              </div>
            ) : null}
          </div>

          {activeQuestion.imagePaths.length > 0 ? (
            <div className="mt-6 space-y-4">
              {activeQuestion.imagePaths.map((imagePath, index) => (
                <div
                  key={imagePath}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                >
                  <div className="relative mx-auto w-full max-w-3xl">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={imagePath}
                        alt={`Question ${activeQuestion.order} reference ${index + 1}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 768px"
                        priority={index === 0}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No uploaded screenshot for this item yet. Use the rationale panel below to review the written prompt.
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isMultiSelect ? (
              <p className="w-full text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Select {requiredSelections || (activeQuestion.answerKey?.length ?? 0)} choices
              </p>
            ) : null}
            {choiceOptions.map((choice) => {
              const isSelected = activeAnswer.includes(choice.key);
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => handleSelectAnswer(choice.key)}
                  className={classNames(
                    "flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    isSelected
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50",
                  )}
                >
                  <span className="text-base font-semibold">{choice.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={toggleReviewFlag}
              className={classNames(
                "ml-auto rounded-full border px-4 py-2 text-sm font-semibold transition",
                reviewFlags[activeQuestion.id]
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              {reviewFlags[activeQuestion.id] ? "Remove review flag" : "Mark for review"}
            </button>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            {activeQuestion.answerKey?.length ? (
              activeAnswer.length > 0 ? (
                <p>
                  {activeAnswerIsCorrect === true
                    ? "✅ Your selections match the stored answer key for this question."
                    : `📝 Stored answer key: ${activeQuestion.answerKey.join(", ")}. Your selections: ${normalizeSelections(activeAnswer).join(", ") || "—"}.`}
                </p>
              ) : (
                <p>
                  Answer key loaded.{" "}
                  {isMultiSelect
                    ? `Select ${requiredSelections || activeQuestion.answerKey.length} choices to compare against the stored key (${activeQuestion.answerKey.join(", ")}).`
                    : `Select a choice to compare against the stored key (${activeQuestion.answerKey.join(", ")}).`}
                </p>
              )
            ) : (
              <p>Answer key not imported for this question yet. Your response will still be included in the export.</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">AI deep dive & rationale</h2>
            {activeQuestion.content ? (
              <div className="mt-3">
                <ReactMarkdown components={markdownComponents}>{activeQuestion.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                We do not have a written rationale imported for this question yet. Use the screenshot above and jot your takeaway so the team can backfill the explanation.
              </p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">Book anchor (vector store)</h2>
            {remediationState?.status === "loading" ? (
              <p className="mt-4 text-sm text-slate-500">Pulling textbook matches from the vector store.</p>
            ) : null}
            {remediationState?.status === "error" ? (
              <p className="mt-4 text-sm text-slate-500">
                Vector store lookup unavailable right now. Use the manual notes below while the integration is offline.
              </p>
            ) : null}
            {showVectorRemediation ? (
              <div className="mt-4 space-y-3">
                {remediationState.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.excerpt}</p>
                    {item.source ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {item.source}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {!showVectorRemediation && remediationState?.status === "ready" ? (
              <p className="mt-4 text-sm text-slate-500">
                No direct vector matches found for this prompt. Use the highlights from your imported study notes below.
              </p>
            ) : null}
            {referenceSnippets.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Study log highlights
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {referenceSnippets.map((snippet, index) => (
                    <li key={`${activeQuestion.id}-ref-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                      {snippet}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {referenceSnippets.length === 0 && remediationState?.status !== "loading" && !showVectorRemediation ? (
              <p className="mt-4 text-sm text-slate-500">
                Drop keywords (e.g., Pedretti chapter titles or ICD-10 terminology) into the vector store to backfill a citation for this question.
              </p>
            ) : null}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">Why NBCOT loves this prompt</h2>
            <p className="mt-4 text-sm text-slate-600">{CATEGORY_RATIONALE[activeQuestion.category]}</p>
            {activeQuestion.keywords.length > 0 ? (
              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  High-yield keywords
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeQuestion.keywords.map((keyword) => (
                    <span
                      key={`${activeQuestion.id}-${keyword}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </div>
  );
}






