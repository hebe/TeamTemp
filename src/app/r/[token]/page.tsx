"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";

type RoundQuestion = {
  id: string;
  question_text: string;
  kind: string;
  position: number;
};

const SCALE_LABELS: Record<number, string[]> = {
  3: ["Disagree", "Partly", "Agree"],
  4: ["Disagree", "Somewhat disagree", "Somewhat agree", "Agree"],
  5: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
};

const DONE_QUOTES = [
  { text: "The first step to fixing anything is noticing it.", by: null },
  { text: "Honest signals beat polished silence.", by: null },
  { text: "Small shifts, noticed early, prevent big surprises.", by: null },
  { text: "You can\u2019t improve what you don\u2019t talk about.", by: null },
  { text: "A team that checks in stays in sync.", by: null },
  { text: "Temperature taken. Now it\u2019s data, not just a feeling.", by: null },
  { text: "Thirty seconds of honesty can save thirty days of drift.", by: null },
  { text: "Patterns only emerge when people show up.", by: null },
];

export default function RespondPage() {
  const params = useParams();
  const token = params.token as string;

  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [scaleMax, setScaleMax] = useState(3);
  const [allowFreeText, setAllowFreeText] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeText, setFreeText] = useState("");
  const [state, setState] = useState<
    "loading" | "ready" | "done" | "error" | "closed"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [responseCount, setResponseCount] = useState<number | null>(null);
  const [doneQuote] = useState(
    () => DONE_QUOTES[Math.floor(Math.random() * DONE_QUOTES.length)]
  );
  const [reversed] = useState(() => Math.random() < 0.5);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/round?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        setErrorMsg("This link doesn\u2019t seem to work.");
        setState("error");
        return;
      }

      const data = await res.json();

      if (data.round?.status === "closed") {
        setState("closed");
        return;
      }

      setScaleMax(data.settings.scale_max);
      setAllowFreeText(data.settings.allow_free_text);
      setQuestions(data.questions as RoundQuestion[]);
      setState("ready");
    } catch {
      setErrorMsg("Something went wrong loading this round.");
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Build scale options: each item has a label and its actual value (1..scaleMax)
  const baseLabels = SCALE_LABELS[scaleMax] ?? SCALE_LABELS[3];
  const scaleOptions = baseLabels.map((label, i) => ({
    label,
    value: i + 1,
  }));
  const displayOptions = reversed ? [...scaleOptions].reverse() : scaleOptions;

  const handleSelect = (value: number) => {
    const q = questions[currentIdx];
    setAnswers({ ...answers, [q.id]: value });
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else if (allowFreeText) {
        setCurrentIdx(questions.length);
      } else {
        handleSubmit({ ...answers, [q.id]: value });
      }
    }, 250);
  };

  const handleSubmit = async (finalAnswers?: Record<string, number>) => {
    const ans = finalAnswers ?? answers;
    const payload = {
      token,
      answers: Object.entries(ans).map(([rqId, val]) => ({
        round_question_id: rqId,
        value: val,
      })),
      freeText: freeText.trim() || undefined,
    };
    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setResponseCount(data.responseCount ?? null);
      setState("done");
    } else {
      setErrorMsg("Could not save your response. Try again?");
      setState("error");
    }
  };

  // ── Status screens ──

  const CenterScreen = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="text-center max-w-sm">{children}</div>
    </div>
  );

  if (state === "loading") {
    return (
      <CenterScreen>
        <div className="w-10 h-10 rounded-full border-[3px] border-border border-t-brand animate-spin mx-auto" />
      </CenterScreen>
    );
  }

  if (state === "error") {
    return (
      <CenterScreen>
        <h1 className="text-2xl mb-2">Hmm.</h1>
        <p className="text-muted">{errorMsg}</p>
      </CenterScreen>
    );
  }

  if (state === "closed") {
    return (
      <CenterScreen>
        <h1 className="text-2xl mb-2">This round has ended.</h1>
        <p className="text-muted">
          Thanks for checking — the next one will be along soon.
        </p>
      </CenterScreen>
    );
  }

  if (state === "done") {
    return (
      <CenterScreen>
        {/* Checkmark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-up-light mb-5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path d="M6 14.5L11.5 20L22 8" stroke="var(--up)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-3xl mb-2">Thanks.</h1>
        <p className="text-muted text-lg mb-8">Temperature recorded.</p>

        {/* Response count */}
        {responseCount !== null && (
          <div className="bg-surface border-2 border-border rounded-[var(--radius)] px-6 py-4 mb-6 shadow-card-sm">
            <p className="text-[2rem] font-bold leading-none mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              {responseCount}
            </p>
            <p className="text-[0.8125rem] text-muted">
              {responseCount === 1 ? "response" : "responses"} so far this round
            </p>
          </div>
        )}

        {/* Rotating quote */}
        <div className="max-w-xs mx-auto mt-2">
          <p className="text-[0.9375rem] text-muted italic leading-relaxed">
            &ldquo;{doneQuote.text}&rdquo;
          </p>
        </div>

        {/* Close hint */}
        <p className="text-[0.8125rem] text-muted mt-8">
          You can now close this window.
        </p>
      </CenterScreen>
    );
  }

  // ── Free text screen ──
  if (currentIdx >= questions.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <div className="max-w-md w-full">
          <p className="text-[0.8125rem] text-muted mb-1 font-medium uppercase tracking-wider">
            Last thing — totally optional
          </p>
          <h1 className="text-2xl mb-5">
            Anything on your mind you&apos;d like to share?
          </h1>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Whatever feels worth mentioning..."
            rows={3}
            className="w-full mb-5 resize-none"
          />
          <Button
            onClick={() => handleSubmit()}
            size="lg"
            className="w-full"
          >
            {freeText.trim() ? "Send it" : "Skip & finish"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Question screen ──
  const q = questions[currentIdx];
  const selectedValue = answers[q.id];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-10">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= currentIdx ? "bg-brand" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Question counter */}
        <p className="text-[0.8125rem] text-muted font-medium uppercase tracking-wider mb-2">
          {currentIdx + 1} of {questions.length}
        </p>

        {/* Question text */}
        <h1 className="text-2xl mb-8 leading-snug">{q.question_text}</h1>

        {/* Scale buttons */}
        <div className="space-y-3">
          {displayOptions.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full text-left px-5 py-4
                  rounded-[var(--radius)] border-2
                  text-[0.9375rem] font-medium
                  transition-all duration-150 cursor-pointer
                  active:scale-[0.98]
                  ${
                    isSelected
                      ? "border-brand bg-brand-light text-brand shadow-card-sm"
                      : "border-border bg-surface hover:border-brand/30 hover:shadow-card-sm"
                  }
                `}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Back button */}
        {currentIdx > 0 && (
          <button
            onClick={() => setCurrentIdx(currentIdx - 1)}
            className="mt-6 text-[0.875rem] text-muted hover:text-ink transition cursor-pointer"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
