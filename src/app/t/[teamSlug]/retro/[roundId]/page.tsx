import {
  getTeamBySlug,
  getTeamSettings,
  getRoundById,
  getRoundAggregates,
  getSubmissionCount,
  getFreeTexts,
  getPreviousRound,
  normalizeAvg,
  normalizeSpread,
} from "@/lib/queries";
import { notFound } from "next/navigation";
import Card from "@/components/Card";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ teamSlug: string; roundId: string }>;
};

export default async function RetroPage({ params }: PageProps) {
  const { teamSlug, roundId } = await params;

  const team = await getTeamBySlug(teamSlug);
  if (!team) notFound();

  const settings = await getTeamSettings(team.id);
  const minResponses = settings?.min_responses_to_show ?? 4;

  const round = await getRoundById(roundId);
  if (!round || round.team_id !== team.id) notFound();

  const count = await getSubmissionCount(roundId);

  if (count < minResponses) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-5 py-10">
        <header className="mb-10">
          <Badge variant="brand">TeamTemp — Retro</Badge>
          <h1 className="text-3xl mt-3">{team.name}</h1>
        </header>
        <Card className="p-10 text-center">
          <h2 className="text-xl mb-2">Not enough responses yet.</h2>
          <p className="text-muted">
            We need at least {minResponses} responses before showing
            anything here.
          </p>
        </Card>
      </div>
    );
  }

  const aggregates = await getRoundAggregates(roundId);
  const freeTexts = await getFreeTexts(roundId);

  // Previous round data for computing drops
  const prevRoundId = await getPreviousRound(roundId);
  const prevAggregates = prevRoundId ? await getRoundAggregates(prevRoundId) : [];
  const prevByQuestion = new Map(prevAggregates.map((a) => [a.question_id, a]));

  // ── Computed sections ──────────────────────────────────────────────
  // This round's scale (all questions in a single round share the same scale)
  const roundScaleMax = round.scale_max ?? 3;

  // Sort by normalized avg so comparisons work across different scales
  const byNormAvg = [...aggregates].sort(
    (a, b) => normalizeAvg(a.avg, a.scale_max) - normalizeAvg(b.avg, b.scale_max)
  );
  const byNormAvgDesc = [...aggregates].sort(
    (a, b) => normalizeAvg(b.avg, b.scale_max) - normalizeAvg(a.avg, a.scale_max)
  );
  const byNormSpread = [...aggregates].sort(
    (a, b) => normalizeSpread(b.spread, b.scale_max) - normalizeSpread(a.spread, a.scale_max)
  );

  // Did the scale change between prev and current round?
  const prevRoundScaleMax = prevAggregates.length > 0 ? (prevAggregates[0].scale_max ?? 3) : roundScaleMax;
  const scaleChanged = prevRoundScaleMax !== roundScaleMax;

  // Round scores: all questions with their averages (for the scores box)
  // Deltas use normalized values when scales differ
  const roundScores = aggregates.map((a) => {
    const prev = prevByQuestion.get(a.question_id);
    let delta: number | null = null;
    if (prev) {
      const normCurr = normalizeAvg(a.avg, a.scale_max);
      const normPrev = normalizeAvg(prev.avg, prev.scale_max);
      delta = Math.round((normCurr - normPrev) * 100) / 100;
    }
    return {
      question_text: a.question_text,
      avg: a.avg,
      scale_max: a.scale_max,
      delta,
    };
  });

  // Worth celebrating: pick ONE thing — either best improvement or highest normalized score
  let celebration: { question_text: string; reason: string } | null = null;

  const improvements: { question_text: string; normDelta: number }[] = [];
  if (prevAggregates.length > 0) {
    for (const agg of aggregates) {
      const prev = prevByQuestion.get(agg.question_id);
      if (prev) {
        const normDelta = normalizeAvg(agg.avg, agg.scale_max) - normalizeAvg(prev.avg, prev.scale_max);
        if (normDelta > 0.05) {
          improvements.push({ question_text: agg.question_text, normDelta });
        }
      }
    }
    improvements.sort((a, b) => b.normDelta - a.normDelta);
  }

  if (improvements.length > 0) {
    const best = improvements[0];
    celebration = {
      question_text: best.question_text,
      reason: `Moved up +${(best.normDelta * 100).toFixed(0)}% since last round`,
    };
  } else {
    // Fall back to highest normalized score above 83%
    const highScorer = byNormAvgDesc.find((a) => normalizeAvg(a.avg, a.scale_max) >= 0.83);
    if (highScorer) {
      celebration = {
        question_text: highScorer.question_text,
        reason: `Scored ${highScorer.avg.toFixed(1)}/${highScorer.scale_max} — that's strong`,
      };
    }
  }

  // Biggest drops: largest negative normalized delta compared to previous round
  const drops: { question_text: string; normDelta: number }[] = [];
  if (prevAggregates.length > 0) {
    for (const agg of aggregates) {
      const prev = prevByQuestion.get(agg.question_id);
      if (prev) {
        const normDelta = normalizeAvg(agg.avg, agg.scale_max) - normalizeAvg(prev.avg, prev.scale_max);
        if (normDelta < -0.05) {
          drops.push({ question_text: agg.question_text, normDelta });
        }
      }
    }
    drops.sort((a, b) => a.normDelta - b.normDelta); // most negative first
  }

  // Highest spread: top 3 by normalized standard deviation
  const highSpread = byNormSpread
    .filter((a) => normalizeSpread(a.spread, a.scale_max) > 0.3)
    .slice(0, 3)
    .map((a) => ({
      question_text: a.question_text,
      normSpread: normalizeSpread(a.spread, a.scale_max),
    }));

  // Signals worth discussing (lowest normalized avg + outlier spread)
  const signalsWorthDiscussing = [
    ...byNormAvg.slice(0, 2).map((a) => ({
      question_text: a.question_text,
      reason: `Avg ${a.avg.toFixed(1)}/${a.scale_max} — seems like this could use attention`,
    })),
    ...byNormSpread
      .filter(
        (a) => !byNormAvg.slice(0, 2).find((b) => b.question_id === a.question_id)
      )
      .slice(0, 1)
      .map((a) => ({
        question_text: a.question_text,
        reason: `High spread — people seem to experience this differently`,
      })),
  ];

  const questionsToAsk = [
    "What might be behind this signal?",
    "Is this something we can influence — or is it coming from outside the team?",
    "Has anyone noticed this shifting recently?",
    "What would \u2018slightly better\u2019 look like here?",
  ];

  const experiments = [
    "Try one small change for the next two weeks, then check again.",
    "Have one person own this topic and report back next round.",
    "Schedule a 15-minute chat to dig deeper before the next temperature check.",
    "Write down one concrete thing the team could start, stop, or keep doing.",
  ];

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-5 py-10">
      <header className="mb-10">
        <a
          href={`/t/${teamSlug}`}
          className="text-[0.875rem] text-muted hover:text-ink transition inline-flex items-center gap-1"
        >
          ← Back to dashboard
        </a>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="brand">Retro</Badge>
        </div>
        <h1 className="text-3xl mt-3">{team.name}</h1>
        <p className="text-[0.875rem] text-muted mt-1">
          Round from{" "}
          {new Date(round.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}{" "}
          · {count} responses
        </p>
      </header>

      {/* ── This round's scores (full width, top) ──────────────── */}
      <Card className="p-6 mb-5">
        <SectionHeading
          title="This round's signals"
          subtitle={`${count} responses · ${aggregates.length} questions${scaleChanged ? " · scale changed since last round" : ""}`}
        />
        <div className="space-y-2.5">
          {roundScores.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3"
            >
              <span className="text-[0.9375rem] flex-1">{s.question_text}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${((s.avg - 1) / (s.scale_max - 1)) * 100}%` }}
                  />
                </div>
                <span className="text-[0.875rem] font-semibold w-12 text-right">
                  {s.avg.toFixed(1)}/{s.scale_max}
                </span>
                {s.delta !== null && s.delta !== 0 && (
                  <span
                    className={`text-[0.75rem] font-semibold w-12 text-right ${
                      s.delta > 0 ? "text-up" : "text-alert"
                    }`}
                  >
                    {s.delta > 0 ? "+" : ""}{(s.delta * 100).toFixed(0)}%
                  </span>
                )}
                {(s.delta === null || s.delta === 0) && (
                  <span className="w-12" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Worth Celebrating (single item, conditional) ────────── */}
      {celebration && (
        <Card className="p-6 mb-5 border-2 border-up/20">
          <SectionHeading
            title="Worth celebrating"
            subtitle="Sometimes it helps to notice what's working."
          />
          <div className="flex items-center gap-3 bg-up-light rounded-[var(--radius-sm)] px-4 py-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface text-up text-[1rem] shrink-0">
              ✦
            </span>
            <div>
              <p className="text-[0.9375rem] font-medium">&ldquo;{celebration.question_text}&rdquo;</p>
              <p className="text-[0.8125rem] text-muted mt-0.5">{celebration.reason}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Top row: Signals + Free text side by side ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* ── Signals Worth Discussing ────────────────────────── */}
        <Card className="p-6">
          <SectionHeading
            title="Signals worth discussing"
            subtitle="These stood out — not as problems, just as things that might be worth talking about."
          />
          <div className="space-y-3">
            {signalsWorthDiscussing.map((s, i) => (
              <div
                key={i}
                className="bg-surface-2 rounded-[var(--radius-sm)] p-4"
              >
                <p className="font-medium mb-1">
                  &ldquo;{s.question_text}&rdquo;
                </p>
                <p className="text-[0.8125rem] text-muted">{s.reason}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Free Text ──────────────────────────────────────── */}
        {freeTexts.length > 0 ? (
          <Card className="p-6">
            <SectionHeading
              title="What people wrote"
              subtitle="Anonymous and unedited."
            />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {freeTexts.map((ft, i) => (
                <div
                  key={i}
                  className="bg-surface-2 rounded-[var(--radius-sm)] p-4 text-[0.9375rem] italic"
                >
                  &ldquo;{ft.text}&rdquo;
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 flex items-center justify-center">
            <p className="text-muted text-[0.9375rem]">No free text this round.</p>
          </Card>
        )}
      </div>

      {/* ── Middle row: Biggest Drops + Highest Spread ────────── */}
      {(drops.length > 0 || highSpread.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* ── Biggest Drops ──────────────────────────────────── */}
          {drops.length > 0 ? (
            <Card className="p-6">
              <SectionHeading
                title="Biggest drops"
                subtitle="These moved down since last round."
              />
              <div className="space-y-2">
                {drops.slice(0, 3).map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-alert-light text-alert text-[0.8125rem] font-bold shrink-0">
                      ↓
                    </span>
                    <div>
                      <span className="text-[0.9375rem]">&ldquo;{d.question_text}&rdquo;</span>
                      <span className="text-[0.8125rem] text-alert font-semibold ml-2">
                        {(d.normDelta * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 flex items-center justify-center">
              <p className="text-muted text-[0.9375rem]">No notable drops since last round.</p>
            </Card>
          )}

          {/* ── Highest Spread ─────────────────────────────────── */}
          {highSpread.length > 0 ? (
            <Card className="p-6">
              <SectionHeading
                title="Highest spread"
                subtitle="People answered these quite differently — could be worth exploring."
              />
              <div className="space-y-2">
                {highSpread.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-warm-light text-warm text-[0.8125rem] font-bold shrink-0">
                      ~
                    </span>
                    <div>
                      <span className="text-[0.9375rem]">&ldquo;{s.question_text}&rdquo;</span>
                      <span className="text-[0.8125rem] text-muted ml-2">
                        spread: {(s.normSpread * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 flex items-center justify-center">
              <p className="text-muted text-[0.9375rem]">Responses were fairly aligned.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Bottom row: Questions + Experiments side by side ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* ── Questions to Ask ────────────────────────────────── */}
        <Card className="p-6">
          <SectionHeading
            title="Questions to ask"
            subtitle="Try picking one or two of these to discuss together."
          />
          <ul className="space-y-3">
            {questionsToAsk.map((q, i) => (
              <li
                key={i}
                className="text-[0.9375rem] border-l-[3px] border-brand pl-4 py-0.5"
              >
                {q}
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Small Experiments ───────────────────────────────── */}
        <Card className="p-6">
          <SectionHeading
            title="Small experiments to try"
            subtitle="Not big commitments — just things to try and see."
          />
          <ul className="space-y-3">
            {experiments.map((e, i) => (
              <li
                key={i}
                className="text-[0.9375rem] border-l-[3px] border-warm pl-4 py-0.5"
              >
                {e}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
