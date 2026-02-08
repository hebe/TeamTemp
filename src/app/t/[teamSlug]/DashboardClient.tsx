"use client";

import { useState } from "react";
import Sparkline from "@/components/Sparkline";
import MixedSignals from "@/components/MixedSignals";
import Card from "@/components/Card";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import Button from "@/components/Button";

type DataPoint = {
  round_id: string;
  round_created_at: string;
  avg: number;
  spread: number;
  count: number;
  values: number[];
};

type QuestionCard = {
  question_id: string;
  question_text: string;
  isRotating: boolean;
  dataPoints: DataPoint[];
};

type Change = {
  question_text: string;
  delta: number;
  direction: "up" | "down";
};

type Props = {
  teamName: string;
  teamSlug: string;
  scaleMax: number;
  questionCards: QuestionCard[];
  increases: Change[];
  decreases: Change[];
  hasEnoughData: boolean;
  lastRoundId: string | null;
};

const SCALE_LABELS: Record<number, string[]> = {
  3: ["Disagree", "Partly", "Agree"],
  4: ["Disagree", "Somewhat disagree", "Somewhat agree", "Agree"],
  5: ["Str. disagree", "Disagree", "Neutral", "Agree", "Str. agree"],
};

function DistributionBar({
  values,
  scaleMax,
}: {
  values: number[];
  scaleMax: number;
}) {
  const labels = SCALE_LABELS[scaleMax] ?? SCALE_LABELS[3];
  const total = values.length;

  // Count per option
  const counts: number[] = [];
  for (let i = 1; i <= scaleMax; i++) {
    counts.push(values.filter((v) => v === i).length);
  }

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t-2 border-border">
      <p className="text-[0.75rem] text-muted font-medium uppercase tracking-wider mb-2">
        Response distribution (last round)
      </p>
      {labels.map((label, i) => {
        const count = counts[i];
        const pct = total > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[0.75rem] text-muted w-24 shrink-0 text-right">
              {label}
            </span>
            <div className="flex-1 h-5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, minWidth: count > 0 ? "8px" : "0" }}
              />
            </div>
            <span className="text-[0.75rem] font-semibold w-6 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardClient({
  teamName,
  teamSlug,
  scaleMax,
  questionCards,
  increases,
  decreases,
  hasEnoughData,
  lastRoundId,
}: Props) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!hasEnoughData) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-5 py-10">
        <header className="mb-10">
          <Badge variant="brand">TX Temp</Badge>
          <h1 className="text-3xl mt-3">{teamName}</h1>
        </header>
        <Card className="p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl mb-2">Not enough responses yet.</h2>
          <p className="text-muted">
            Results will appear here once enough people have taken the
            temperature. This keeps things anonymous.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-5 py-10">
      <header className="mb-10">
        <Badge variant="brand">TX Temp</Badge>
        <h1 className="text-3xl mt-3">{teamName}</h1>
        {lastRoundId && (
          <a
            href={`/t/${teamSlug}/retro/${lastRoundId}`}
            className="inline-flex items-center gap-2 mt-3 text-[0.875rem] text-brand hover:underline"
          >
            Open retro for latest round →
          </a>
        )}
      </header>

      {/* ── What changed? ─────────────────────────────────────── */}
      {(increases.length > 0 || decreases.length > 0) && (
        <Card className="p-6 mb-8">
          <SectionHeading title="What seems different since last time?" />
          <div className="space-y-3">
            {increases.map((c, i) => (
              <div key={`up-${i}`} className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-up-light text-up text-[0.8125rem] font-bold shrink-0">
                  ↑
                </span>
                <span className="text-[0.9375rem] pt-0.5">
                  &ldquo;{c.question_text}&rdquo;{" "}
                  <span className="text-muted">
                    moved up (+{c.delta.toFixed(2)})
                  </span>
                </span>
              </div>
            ))}
            {decreases.map((c, i) => (
              <div key={`down-${i}`} className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-alert-light text-alert text-[0.8125rem] font-bold shrink-0">
                  ↓
                </span>
                <span className="text-[0.9375rem] pt-0.5">
                  &ldquo;{c.question_text}&rdquo;{" "}
                  <span className="text-muted">
                    moved down ({c.delta.toFixed(2)})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Question Cards (responsive grid) ─────────────────── */}
      {(() => {
        const fixedCards = questionCards.filter((q) => !q.isRotating);
        const rotatingCards = questionCards.filter((q) => q.isRotating);

        const renderCard = (q: QuestionCard) => {
          const latest = q.dataPoints[q.dataPoints.length - 1];
          const prev =
            q.dataPoints.length >= 2
              ? q.dataPoints[q.dataPoints.length - 2]
              : null;
          const delta = prev
            ? Math.round((latest.avg - prev.avg) * 100) / 100
            : null;
          const isExpanded = expandedCards.has(q.question_id);

          return (
            <Card
              key={q.question_id}
              className={`p-5 ${q.isRotating ? "border-dashed border-border/70" : ""}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-2 flex-1">
                  <p className="font-medium leading-snug">
                    {q.question_text}
                  </p>
                  {q.isRotating && (
                    <span className="text-[0.6875rem] text-muted bg-surface-2 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                      Asked {q.dataPoints.length} {q.dataPoints.length === 1 ? "time" : "times"}
                    </span>
                  )}
                </div>
                <MixedSignals
                  spread={latest.spread}
                  scaleMax={scaleMax}
                />
              </div>
              <div className="flex items-center gap-5">
                <Sparkline
                  values={q.dataPoints.map((d) => d.avg)}
                  scaleMax={scaleMax}
                />
                <div>
                  <span className="text-2xl font-bold">
                    {latest.avg.toFixed(1)}
                  </span>
                  <span className="text-muted text-[0.875rem]">/{scaleMax}</span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className={`ml-2 text-[0.875rem] font-semibold ${
                        delta > 0 ? "text-up" : "text-alert"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[0.8125rem] text-muted">
                  {latest.count} responses · last round
                </p>
                <button
                  onClick={() => toggleCard(q.question_id)}
                  className="text-[0.8125rem] text-brand hover:underline cursor-pointer"
                >
                  {isExpanded ? "Hide distribution" : "Show distribution"}
                </button>
              </div>
              {isExpanded && (
                <DistributionBar values={latest.values} scaleMax={scaleMax} />
              )}
            </Card>
          );
        };

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {fixedCards.map(renderCard)}
            </div>
            {rotatingCards.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[0.75rem] text-muted font-medium uppercase tracking-wider">
                    From the rotating pool
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {rotatingCards.map(renderCard)}
                </div>
              </>
            )}
            {rotatingCards.length === 0 && <div className="mb-10" />}
          </>
        );
      })()}

      {/* spacer at bottom */}
      <div className="h-10" />
    </div>
  );
}
