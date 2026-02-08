import {
  getTeamBySlug,
  getTeamSettings,
  getRoundById,
  getRoundAggregates,
  getSubmissionCount,
  getFreeTexts,
  getPreviousRound,
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
  const scaleMax = settings?.scale_max ?? 3;
  const minResponses = settings?.min_responses_to_show ?? 4;

  const round = await getRoundById(roundId);
  if (!round || round.team_id !== team.id) notFound();

  const count = await getSubmissionCount(roundId);

  if (count < minResponses) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-5 py-10">
        <header className="mb-10">
          <Badge variant="brand">TX Temp — Retro</Badge>
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

  const byAvg = [...aggregates].sort((a, b) => a.avg - b.avg);
  const byAvgDesc = [...aggregates].sort((a, b) => b.avg - a.avg);
  const bySpread = [...aggregates].sort((a, b) => b.spread - a.spread);

  // Worth celebrating: highest averages (above 65% of scale)
  const worthCelebrating = byAvgDesc
    .filter((a) => a.avg >= scaleMax * 0.65)
    .slice(0, 3)
    .map((a) => ({
      question_text: a.question_text,
      avg: a.avg,
    }));

  // Biggest drops: largest negative delta compared to previous round
  const drops: { question_text: string; delta: number }[] = [];
  if (prevAggregates.length > 0) {
    for (const agg of aggregates) {
      const prev = prevByQuestion.get(agg.question_id);
      if (prev) {
        const delta = Math.round((agg.avg - prev.avg) * 100) / 100;
        if (delta < -0.1) {
          drops.push({ question_text: agg.question_text, delta });
        }
      }
    }
    drops.sort((a, b) => a.delta - b.delta); // most negative first
  }

  // Highest spread: top 3 by standard deviation
  const highSpread = bySpread
    .filter((a) => a.spread > 0.3)
    .slice(0, 3)
    .map((a) => ({
      question_text: a.question_text,
      spread: a.spread,
    }));

  // Signals worth discussing (lowest avg + outlier spread)
  const signalsWorthDiscussing = [
    ...byAvg.slice(0, 2).map((a) => ({
      question_text: a.question_text,
      reason: `Avg ${a.avg.toFixed(1)} — seems like this could use attention`,
    })),
    ...bySpread
      .filter(
        (a) => !byAvg.slice(0, 2).find((b) => b.question_id === a.question_id)
      )
      .slice(0, 1)
      .map((a) => ({
        question_text: a.question_text,
        reason: `High spread (${a.spread.toFixed(2)}) — people seem to experience this differently`,
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

      {/* ── Worth Celebrating (full width, top) ──────────────────── */}
      {worthCelebrating.length > 0 && (
        <Card className="p-6 mb-5 border-2 border-up/20">
          <SectionHeading
            title="Worth celebrating"
            subtitle="These are looking good. Sometimes it helps to notice what's working."
          />
          <div className="space-y-2">
            {worthCelebrating.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-up-light rounded-[var(--radius-sm)] px-4 py-3"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface text-up text-[0.875rem] font-bold shrink-0">
                  {item.avg.toFixed(1)}
                </span>
                <span className="text-[0.9375rem]">&ldquo;{item.question_text}&rdquo;</span>
              </div>
            ))}
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
                        {d.delta.toFixed(2)}
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
                        spread: {s.spread.toFixed(2)}
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
