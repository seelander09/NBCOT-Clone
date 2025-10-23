'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ReactMarkdown, { type Components } from "react-markdown";

import type { PracticeQuestion } from "@/data/practiceQuestions";

const EXPORT_SUCCESS_RESET_MS = 2500;
const DEFAULT_SESSION_STORAGE_KEY = "nbcot-practice-session-v1";
const DEFAULT_SESSION_ANALYTICS_KEY = "nbcot-practice-analytics-v1";

const domainBadgeClasses: Record<PracticeQuestion["domain"]["id"], string> = {
  domain1: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  domain2: "bg-amber-100 text-amber-700 border border-amber-200",
  domain3: "bg-sky-100 text-sky-700 border border-sky-200",
  domain4: "bg-slate-200 text-slate-700 border border-slate-300",
};


type PracticeTestShellProps = {
  questions: PracticeQuestion[];
  sessionStorageKey?: string;
  analyticsStorageKey?: string;
};

type AnswerState = Record<string, string[] | undefined>;

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

type DomainSummaryRow = {
  domainId: PracticeQuestion["domain"]["id"];
  domainTitle: string;
  shortTitle: string;
  total: number;
  answered: number;
  correct: number;
  timeMs: number;
};

function computeDomainSummary(
  questions: PracticeQuestion[],
  answers: AnswerState,
  questionTimers: Record<string, number>,
): DomainSummaryRow[] {
  const domainMap = new Map<PracticeQuestion["domain"]["id"], DomainSummaryRow>();

  for (const question of questions) {
    const existing =
      domainMap.get(question.domain.id) ??
      {
        domainId: question.domain.id,
        domainTitle: question.domain.title,
        shortTitle: question.domain.shortTitle,
        total: 0,
        answered: 0,
        correct: 0,
        timeMs: 0,
      };

    const responses = normalizeSelections(answers[question.id]);
    const comparison = selectionsMatch(responses, question.answerKey);
    const timeOnQuestionSeconds = questionTimers[question.id] ?? 0;

    existing.total += 1;
    if (responses.length > 0) {
      existing.answered += 1;
    }
    if (comparison === true) {
      existing.correct += 1;
    }
    if (timeOnQuestionSeconds > 0) {
      existing.timeMs += timeOnQuestionSeconds * 1000;
    }

    domainMap.set(question.domain.id, existing);
  }

  return Array.from(domainMap.values());
}

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

export function PracticeTestShell({
  questions,
  sessionStorageKey,
  analyticsStorageKey,
}: PracticeTestShellProps) {
  const sessionKey = sessionStorageKey ?? DEFAULT_SESSION_STORAGE_KEY;
  const analyticsKey = analyticsStorageKey ?? DEFAULT_SESSION_ANALYTICS_KEY;
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [reviewFlags, setReviewFlags] = useState<ReviewFlagState>({});
  const [remediationById, setRemediationById] = useState<Record<string, RemediationState>>({});
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [questionTimers, setQuestionTimers] = useState<Record<string, number>>({});
  const [questionTimerEnabled, setQuestionTimerEnabled] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<{
    correct: number;
    total: number;
    details: Array<{
      questionId: string;
      order: number;
      answerKey: string[];
      response: string[];
      isCorrect: boolean;
    }>;
  } | null>(null);

  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSessionHydrated, setIsSessionHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(sessionKey);
      if (!raw) {
        setIsSessionHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<{
        answers: AnswerState;
        revealedAnswers: Record<string, boolean>;
        reviewFlags: ReviewFlagState;
        activeIndex: number;
        questionTimers: Record<string, number>;
        questionTimerEnabled: boolean;
        elapsedMs: number;
        isSubmitted: boolean;
        submissionSummary: PracticeTestShell["submissionSummary"];
      }>;

      setAnswers(parsed.answers ?? {});
      setRevealedAnswers(parsed.revealedAnswers ?? {});
      setReviewFlags(parsed.reviewFlags ?? {});

      const safeIndex = Math.min(parsed.activeIndex ?? 0, Math.max(questions.length - 1, 0));
      setActiveIndex(safeIndex);

      if (parsed.questionTimers) {
        setQuestionTimers(parsed.questionTimers);
      }
      if (typeof parsed.questionTimerEnabled === "boolean") {
        setQuestionTimerEnabled(parsed.questionTimerEnabled);
      }

      if (typeof parsed.elapsedMs === "number" && Number.isFinite(parsed.elapsedMs)) {
        setElapsedMs(parsed.elapsedMs);
        setSessionStart(Date.now() - parsed.elapsedMs);
      }

      if (parsed.isSubmitted) {
        setIsSubmitted(true);
      }
      if (parsed.submissionSummary) {
        setSubmissionSummary(parsed.submissionSummary);
      }
    } catch (error) {
      console.warn("Failed to hydrate practice test session", error);
    } finally {
      setIsSessionHydrated(true);
    }
  }, [questions.length, sessionKey]);

  useEffect(() => {
    if (!isSessionHydrated || typeof window === "undefined") {
      return;
    }

    try {
      const payload = {
        answers,
        revealedAnswers,
        reviewFlags,
        activeIndex,
        questionTimers,
        questionTimerEnabled,
        elapsedMs,
        isSubmitted,
        submissionSummary,
      };
      window.localStorage.setItem(sessionKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist practice test session", error);
    }
  }, [
    answers,
    revealedAnswers,
    reviewFlags,
    activeIndex,
    questionTimers,
    questionTimerEnabled,
    elapsedMs,
    isSubmitted,
    submissionSummary,
    isSessionHydrated,
    sessionKey,
  ]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setElapsedMs(Date.now() - sessionStart);
    }, 1000);

    return () => window.clearInterval(handle);
  }, [sessionStart]);

  useEffect(() => {
    if (!questionTimerEnabled || isSubmitted) {
      return;
    }

    const questionId = questions[activeIndex].id;
    setQuestionTimers((prev) =>
      prev[questionId] !== undefined ? prev : { ...prev, [questionId]: 0 },
    );

    const handle = window.setInterval(() => {
      setQuestionTimers((prev) => {
        const current = prev[questionId] ?? 0;
        return { ...prev, [questionId]: current + 1 };
      });
    }, 1000);

    return () => window.clearInterval(handle);
  }, [activeIndex, questionTimerEnabled, isSubmitted, questions]);

  const activeQuestion = questions[activeIndex];
  const remediationState = remediationById[activeQuestion.id];
  const keywords = useMemo(() => activeQuestion.keywords, [activeQuestion.keywords]);
  const isAnswerRevealed = Boolean(revealedAnswers[activeQuestion.id]);

  useEffect(() => {
    if (!isAnswerRevealed) {
      return;
    }

    if (remediationState?.status === "loading" || remediationState?.status === "ready" || remediationState?.status === "error") {
      return;
    }

    if (!activeQuestion.remediationPrompt && keywords.length === 0) {
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
        keywords,
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
  }, [activeQuestion.id, activeQuestion.remediationPrompt, isAnswerRevealed, keywords, remediationState?.status]);

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

  const rawActiveAnswer = answers[activeQuestion.id];
  const activeAnswer = useMemo(() => rawActiveAnswer ?? [], [rawActiveAnswer]);
  const choiceOptions = useMemo(() => activeQuestion.options ?? [], [activeQuestion.options]);
  const hasSelectableOptions = choiceOptions.length > 0;
  const vectorItems = useMemo(
    () => (remediationState?.status === "ready" ? remediationState.items : []),
    [remediationState],
  );
  const bookAnswerFallback = useMemo(() => {
    if (!activeQuestion.bookAnswer) {
      return undefined;
    }
    return {
      id: `${activeQuestion.id}-book-fallback`,
      title: activeQuestion.bookAnswer.title,
      excerpt: activeQuestion.bookAnswer.excerpt,
      source: activeQuestion.bookAnswer.source,
    };
  }, [activeQuestion.bookAnswer, activeQuestion.id]);
  const hasVectorMatches = vectorItems.length > 0;
  const topRemediationItem = hasVectorMatches ? vectorItems[0] : bookAnswerFallback;
  const additionalRemediationItems = useMemo(
    () => (hasVectorMatches ? vectorItems.slice(1) : []),
    [hasVectorMatches, vectorItems],
  );
  const hasAnyBookSupport = Boolean(topRemediationItem);
  const remediationStatus = remediationState?.status ?? "idle";
  const requiredSelections = activeQuestion.requiredSelections ?? activeQuestion.answerKey?.length ?? 0;
  const isMultiSelect = hasSelectableOptions && requiredSelections > 1;
  const activeAnswerIsCorrect = selectionsMatch(activeAnswer, activeQuestion.answerKey);
  const answerKeySet = useMemo(
    () => new Set(activeQuestion.answerKey ?? []),
    [activeQuestion.answerKey],
  );
  const showRevealFeedback = isAnswerRevealed && answerKeySet.size > 0;
  const activeQuestionSeconds = questionTimers[activeQuestion.id] ?? 0;
  const formattedQuestionTime = formatDuration(activeQuestionSeconds * 1000);
  const hasStoredAnswerKey = (activeQuestion.answerKey?.length ?? 0) > 0;
  const hasActiveSelection = activeAnswer.length > 0;
  const revealButtonDisabled = !isAnswerRevealed && activeAnswer.length === 0;

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

  const domainSummaryForUi = useMemo(() => {
    const rows = computeDomainSummary(questions, answers, questionTimers);
    return rows.map((entry) => {
      const accuracyRatio = entry.answered > 0 ? entry.correct / entry.answered : null;
      return {
        ...entry,
        accuracyRatio,
        accuracyPercent: accuracyRatio !== null ? Math.round(accuracyRatio * 100) : null,
        timeSeconds: Math.round(entry.timeMs / 1000),
        timeFormatted: formatDuration(entry.timeMs),
      };
    });
  }, [answers, questionTimers, questions]);

  const answerStatus = useMemo(() => {
    return questions.reduce<Record<string, "unanswered" | "correct" | "incorrect">>((acc, question) => {
      const response = normalizeSelections(answers[question.id]);
      const comparison = selectionsMatch(response, question.answerKey);
      if (response.length === 0) {
        acc[question.id] = "unanswered";
      } else if (comparison === true) {
        acc[question.id] = "correct";
      } else {
        acc[question.id] = "incorrect";
      }
      return acc;
    }, {});
  }, [answers, questions]);

  const correctQuestionOrders = submissionSummary
    ? submissionSummary.details.filter((detail) => detail.isCorrect).map((detail) => detail.order)
    : [];
  const incorrectQuestionOrders = submissionSummary
    ? submissionSummary.details.filter((detail) => !detail.isCorrect).map((detail) => detail.order)
    : [];

  const printableSummaryRows = useMemo(() => {
    if (!submissionSummary) {
      return [];
    }

    return submissionSummary.details
      .map((detail) => {
        const question = questions.find((item) => item.id === detail.questionId);
        if (!question) {
          return null;
        }

        const baseSnippet = question.prompt ?? question.content ?? question.headline;
        const normalizedSnippet = baseSnippet.replace(/\s+/g, " ").trim();
        const snippet =
          normalizedSnippet.length > 140 ? `${normalizedSnippet.slice(0, 137)}...` : normalizedSnippet;
        const timeSeconds = questionTimers[question.id] ?? 0;

        return {
          questionId: detail.questionId,
          order: detail.order,
          domainId: question.domain.id,
          domainTitle: question.domain.title,
          domainShort: question.domain.shortTitle,
          isCorrect: detail.isCorrect,
          timeSeconds,
          timeFormatted: formatDuration(timeSeconds * 1000),
          snippet,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [questionTimers, questions, submissionSummary]);

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

  const handleSelectAnswer = useCallback(
    (choice: string) => {
      if (!hasSelectableOptions || isSubmitted) {
        return;
      }
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
    },
    [activeQuestion.id, hasSelectableOptions, isMultiSelect, isSubmitted, requiredSelections],
  );

  const handleRevealAnswer = useCallback(() => {
    setRevealedAnswers((prev) => ({ ...prev, [activeQuestion.id]: true }));
  }, [activeQuestion.id]);

  const handleHideAnswer = useCallback(() => {
    setRevealedAnswers((prev) => {
      if (!prev[activeQuestion.id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[activeQuestion.id];
      return next;
    });
  }, [activeQuestion.id]);

  function toggleReviewFlag() {
    setReviewFlags((prev) => ({ ...prev, [activeQuestion.id]: !prev[activeQuestion.id] }));
  }

  function handleToggleQuestionTimer() {
    if (isSubmitted) {
      return;
    }
    setQuestionTimerEnabled((prev) => !prev);
  }

  function handleSubmitTest() {
    if (isSubmitted) {
      return;
    }

    const domainSummaryRows = computeDomainSummary(questions, answers, questionTimers);

    const details = exportRows.map((row) => ({
      questionId: row.questionId,
      order: row.order,
      answerKey: row.answerKey,
      response: row.response,
      isCorrect: row.isCorrect,
    }));

    const correct = details.filter((detail) => detail.isCorrect).length;

    const domainBreakdown = domainSummaryRows.map((entry) => {
      const accuracyRatio = entry.answered > 0 ? entry.correct / entry.answered : null;
      return {
        ...entry,
        timeSeconds: Math.round(entry.timeMs / 1000),
        accuracyRatio,
        accuracyPercent: accuracyRatio !== null ? Math.round(accuracyRatio * 100) : null,
      };
    });

    const overallAccuracyRatio = scorableCount > 0 ? correctCount / scorableCount : null;
    const overallAccuracyPercent = overallAccuracyRatio !== null ? Math.round(overallAccuracyRatio * 100) : null;

    const analyticsPayload = {
      submittedAt: new Date().toISOString(),
      totalDurationMs: elapsedMs,
      totalQuestions: questions.length,
      answered: answeredCount,
      scorable: scorableCount,
      correct: correctCount,
      accuracyRatio: overallAccuracyRatio,
      accuracyPercent: overallAccuracyPercent,
      domainBreakdown,
    };

    if (typeof window !== "undefined") {
      try {
        const existingRaw = window.localStorage.getItem(analyticsKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const nextLog = Array.isArray(existing) ? [...existing, analyticsPayload] : [analyticsPayload];
        window.localStorage.setItem(analyticsKey, JSON.stringify(nextLog));
      } catch (error) {
        console.warn("Failed to persist practice test analytics", error);
      }
    }

    setSubmissionSummary({
      correct,
      total: details.length,
      details,
    });
    setIsSubmitted(true);
  }

  function handleResetSession() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset this practice session? All saved progress will be cleared.");
      if (!confirmed) {
        return;
      }
    }

    setAnswers({});
    setRevealedAnswers({});
    setReviewFlags({});
    setQuestionTimers({});
    setQuestionTimerEnabled(true);
    setIsSubmitted(false);
    setSubmissionSummary(null);
    setActiveIndex(0);
    setRemediationById({});
    setElapsedMs(0);
    setSessionStart(Date.now());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(sessionKey);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === "INPUT" || tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true") {
          return;
        }
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        if (activeIndex < questions.length - 1) {
          setActiveIndex(activeIndex + 1);
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        if (activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        }
        return;
      }

      if (event.key === "Enter") {
        if (isSubmitted) {
          return;
        }
        if (!isAnswerRevealed && activeAnswer.length > 0) {
          event.preventDefault();
          handleRevealAnswer();
        } else if (isAnswerRevealed) {
          event.preventDefault();
          handleHideAnswer();
        }
        return;
      }

      if (!hasSelectableOptions || isSubmitted) {
        return;
      }

      const numericIndex = Number.parseInt(event.key, 10);
      if (!Number.isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= choiceOptions.length) {
        event.preventDefault();
        handleSelectAnswer(choiceOptions[numericIndex - 1].key);
        return;
      }

      if (event.key.length === 1) {
        const letter = event.key.toLowerCase();
        const match = choiceOptions.find((option) => option.key.toLowerCase() === letter);
        if (match) {
          event.preventDefault();
          handleSelectAnswer(match.key);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeAnswer,
    activeIndex,
    choiceOptions,
    handleHideAnswer,
    handleRevealAnswer,
    handleSelectAnswer,
    hasSelectableOptions,
    isAnswerRevealed,
    isSubmitted,
    questions.length,
  ]);

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
              <dd className="font-semibold text-slate-900">{accuracy !== null ? `${accuracy}%` : "n/a"}</dd>
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
            <button
              type="button"
              onClick={handleResetSession}
              className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
            >
              Reset session
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

        {isSubmitted && submissionSummary ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Results summary
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                Score:{" "}
                <span className="font-semibold text-slate-900">
                  {submissionSummary.correct} / {submissionSummary.total}
                </span>
              </p>
              <p>
                Accuracy:{" "}
                <span className="font-semibold text-slate-900">
                  {Math.round((submissionSummary.correct / submissionSummary.total) * 100)}%
                </span>
              </p>
            </div>
            <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Correct
                </p>
                <p className="mt-2 text-xs">
                  {correctQuestionOrders.length > 0 ? correctQuestionOrders.join(", ") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                  Needs review
                </p>
                <p className="mt-2 text-xs">
                  {incorrectQuestionOrders.length > 0 ? incorrectQuestionOrders.join(", ") : "-"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Detailed breakdown</p>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.print();
                  }
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Print summary
              </button>
            </div>
            {domainSummaryForUi.length > 0 ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {domainSummaryForUi.map((domain) => (
                  <div
                    key={domain.domainId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{domain.domainTitle}</span>
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                        {domain.timeFormatted}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span>
                        {domain.correct} / {domain.answered} correct
                      </span>
                      <span>
                        {domain.answered} answered of {domain.total}
                      </span>
                      <span>
                        Accuracy: {domain.accuracyPercent !== null ? `${domain.accuracyPercent}%` : "n/a"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {printableSummaryRows.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Question review
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="max-h-80 overflow-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <caption className="sr-only">Session question summary with domains and time spent</caption>
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">#</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Domain</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Time</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Prompt snippet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printableSummaryRows.map((row) => (
                          <tr
                            key={row.questionId}
                            className={classNames(
                              "border-t border-slate-200",
                              row.isCorrect ? "bg-white" : "bg-rose-50/40",
                            )}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.order}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{row.domainShort}</td>
                            <td
                              className={classNames(
                                "px-4 py-3 text-xs font-semibold",
                                row.isCorrect ? "text-emerald-600" : "text-rose-600",
                              )}
                            >
                              {row.isCorrect ? "Correct" : "Needs review"}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{row.timeFormatted}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{row.snippet}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Rows in rose highlight items that need review. Use the question navigator to jump back to specific
                  questions and revisit rationales.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Use the question navigator to jump back to specific items. Circles are color-coded once the
                test is submitted.
              </p>
            )}
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navigate questions
          </div>
          <div className="grid grid-cols-6 gap-2">
            {questions.map((question, index) => {
              const isActive = index === activeIndex;
              const isAnswered = (answers[question.id]?.length ?? 0) > 0;
              const isFlagged = Boolean(reviewFlags[question.id]);
              const status = answerStatus[question.id] ?? "unanswered";

              let baseClasses = "border-slate-200 bg-white text-slate-600 hover:border-slate-400";
              if (isSubmitted) {
                if (status === "correct") {
                  baseClasses = "border-emerald-500 bg-emerald-50 text-emerald-700";
                } else if (status === "incorrect") {
                  baseClasses = "border-rose-400 bg-rose-50 text-rose-700";
                } else {
                  baseClasses = "border-slate-200 bg-white text-slate-500";
                }
              } else if (isActive) {
                baseClasses = "border-sky-500 bg-sky-50 text-sky-600";
              } else if (isAnswered) {
                baseClasses = "border-emerald-200 bg-emerald-50 text-emerald-600";
              }

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={classNames(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                    baseClasses,
                    isActive && "ring-2 ring-offset-2 ring-sky-300",
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
                domainBadgeClasses[activeQuestion.domain.id],
              )}
            >
              {activeQuestion.domain.title}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>
            <span className="font-semibold text-slate-700">Time on this question:</span> {formattedQuestionTime}
          </span>
          <button
            type="button"
            onClick={handleToggleQuestionTimer}
            disabled={isSubmitted}
            className={classNames(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              isSubmitted
                ? "cursor-not-allowed border-slate-200 text-slate-400"
                : questionTimerEnabled
                  ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100"
                  : "border-emerald-300 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50",
            )}
          >
            {questionTimerEnabled ? "Pause timer" : "Resume timer"}
          </button>
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
            ) : null}

          <div className="mt-8 space-y-4">
            {hasSelectableOptions ? (
              <>
                {isMultiSelect ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Select {requiredSelections || (activeQuestion.answerKey?.length ?? 0)} choices
                  </p>
                ) : null}
                <div className="flex flex-col gap-3">
                  {choiceOptions.map((choice) => {
                    const isSelected = activeAnswer.includes(choice.key);
                    const isCorrectChoice = answerKeySet.has(choice.key);
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        data-testid="answer-option"
                        data-choice-key={choice.key}
                        onClick={() => handleSelectAnswer(choice.key)}
                        className={classNames(
                          "flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                          showRevealFeedback
                            ? isCorrectChoice
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : isSelected
                                ? "border-rose-400 bg-rose-50 text-rose-700"
                                : "border-slate-200 text-slate-600"
                            : isSelected
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50",
                        )}
                      >
                        <span className="text-base font-semibold">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                            {choice.key}
                          </span>
                          {choice.label}
                          {showRevealFeedback && isCorrectChoice ? (
                            <span className="ml-3 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Correct
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This knowledge card does not have multiple-choice responses. Review the summary below and continue when you are ready.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {hasSelectableOptions ? (
                <button
                  type="button"
                  onClick={isAnswerRevealed ? handleHideAnswer : handleRevealAnswer}
                  className={classNames(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    isAnswerRevealed
                      ? "border border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-200"
                      : "border border-sky-500 bg-sky-50 text-sky-700 hover:border-sky-500/80 hover:bg-sky-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
                  )}
                  disabled={revealButtonDisabled}
                >
                  {isAnswerRevealed ? "Hide answer & rationale" : "Reveal answer & rationale"}
                </button>
              ) : null}
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
            <div className="pt-2">
              {!isSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  className={classNames(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    answeredCount > 0
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-100"
                      : "cursor-not-allowed border-slate-200 text-slate-400",
                  )}
                  disabled={answeredCount === 0}
                >
                  Submit practice test
                </button>
              ) : (
                <span className="text-sm font-semibold text-emerald-600">
                  Test submitted. Use the navigator to review each item.
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            {hasStoredAnswerKey ? (
              isAnswerRevealed ? (
                <p>
                  {activeAnswerIsCorrect === true
                    ? "Correct! Your selections match the stored answer key for this question."
                    : `Stored answer key: ${activeQuestion.answerKey!.join(", ")}. Your selections: ${normalizeSelections(activeAnswer).join(", ") || "-"}.`}
                </p>
              ) : hasActiveSelection ? (
                <p>
                  Answer saved. Click <span className="font-semibold text-slate-800">Reveal answer &amp; rationale</span> when you want to check your work.
                </p>
              ) : (
                <p>
                  Select an option to capture your response. Reveal the answer only after you&apos;re ready to check the stored key.
                </p>
              )
            ) : isAnswerRevealed ? (
              <p>Answer key not imported for this question yet. Your response will still be included in the export.</p>
            ) : (
              <p>No stored answer key for this question yet. We&apos;ll keep your response logged for the session export.</p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {isAnswerRevealed ? (
              <p>
                Review the detailed rationale and supporting citations in the panels to the right to confirm your understanding.
              </p>
            ) : (
              <p>Reveal the answer to view the detailed rationale.</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">AI deep dive & rationale</h2>
            {isAnswerRevealed ? (
              activeQuestion.content ? (
                <div className="mt-3">
                  <ReactMarkdown components={markdownComponents}>{activeQuestion.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  We do not have a written rationale imported for this question yet. Use the screenshot above and jot your takeaway so the team can backfill the explanation.
                </p>
              )
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Reveal the answer when you&apos;re ready to see the full walkthrough and explanation.
              </p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">Book anchor (vector store)</h2>
            {isAnswerRevealed ? (
              <>
                {topRemediationItem ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{topRemediationItem.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{topRemediationItem.excerpt}</p>
                    {topRemediationItem.source ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {topRemediationItem.source}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {additionalRemediationItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {additionalRemediationItems.map((item) => (
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
                ) : hasVectorMatches ? (
                  <p className="mt-4 text-sm text-slate-500">
                    This excerpt is the closest match from the vector store. No additional anchors were returned for this query.
                  </p>
                ) : remediationStatus === "ready" ? (
                  hasAnyBookSupport ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Your primary citation is highlighted with the answer recap above. No additional vector matches were returned for this question.
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      No direct vector matches found yet. Use the highlights below or add keywords to the vector store to backfill a citation.
                    </p>
                  )
                ) : remediationStatus === "loading" ? (
                  <p className="mt-4 text-sm text-slate-500">Pulling textbook matches from the vector store.</p>
                ) : remediationStatus === "error" ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Vector store lookup unavailable right now. Use the manual notes below while the integration is offline.
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Select an answer to trigger the book lookup or drop keywords into the store.
                  </p>
                )}
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
                {referenceSnippets.length === 0 && remediationStatus === "ready" && !hasAnyBookSupport ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Drop keywords (e.g., Pedretti chapter titles or ICD-10 terminology) into the vector store to backfill a citation for this question.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Reveal the answer to see supporting citations, vector matches, and study log highlights.
              </p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-heading text-xl text-slate-900">Why NBCOT asks this question</h2>
            <p className="mt-4 text-sm text-slate-600">{activeQuestion.domain.summary}</p>
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










