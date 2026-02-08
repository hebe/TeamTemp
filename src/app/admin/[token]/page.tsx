"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import SectionHeading from "@/components/SectionHeading";

type Question = {
  id: string;
  text: string;
};

type QSetItem = {
  id: string;
  question_id: string;
  kind: "fixed" | "rotating_pool";
  position: number;
  question?: Question;
};

type RoundSummary = {
  question_text: string;
  avg: number;
  count: number;
};

type Round = {
  id: string;
  token: string;
  status: string;
  opens_at: string;
  closes_at: string | null;
  created_at: string;
  responseCount: number;
  summary: RoundSummary[];
};

type Settings = {
  cadence: string;
  scale_max: number;
  min_responses_to_show: number;
  allow_free_text: boolean;
};

type RoundAnalytics = {
  round_id: string;
  round_date: string;
  avg: number;
  spread: number;
  count: number;
  distribution: number[];
};

type QuestionAnalytics = {
  question_id: string;
  question_text: string;
  rounds: RoundAnalytics[];
};

type AnalyticsData = {
  scaleMax: number;
  questions: QuestionAnalytics[];
};

const SCALE_LABELS: Record<number, string[]> = {
  3: ["Disagree", "Partly", "Agree"],
  4: ["Disagree", "Smw. disagree", "Smw. agree", "Agree"],
  5: ["Str. disagree", "Disagree", "Neutral", "Agree", "Str. agree"],
};

function AnalyticsTable({ data }: { data: AnalyticsData }) {
  const labels = SCALE_LABELS[data.scaleMax] ?? SCALE_LABELS[3];

  if (data.questions.length === 0) {
    return (
      <p className="text-muted text-[0.9375rem] text-center py-8">
        No closed rounds with enough data yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {data.questions.map((q) => {
        // Latest first
        const rounds = [...q.rounds].reverse();
        const needsScroll = rounds.length > 5;
        return (
          <div key={q.question_id}>
            <h4 className="text-[0.9375rem] font-semibold mb-3">
              {q.question_text}
            </h4>
            <div className={needsScroll ? "max-h-[14rem] overflow-y-auto pr-1" : ""}>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead className={needsScroll ? "sticky top-0 bg-surface z-10" : ""}>
                    <tr className="border-b-2 border-border">
                      <th className="text-left text-muted font-medium py-2 pr-4 min-w-[80px]">
                        Round
                      </th>
                      <th className="text-right text-muted font-medium py-2 px-2 w-14">
                        Avg
                      </th>
                      <th className="text-right text-muted font-medium py-2 px-2 w-14">
                        n
                      </th>
                      {labels.map((label, i) => (
                        <th
                          key={i}
                          className="text-center text-muted font-medium py-2 px-1 min-w-[60px]"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r) => {
                      const maxDist = Math.max(...r.distribution, 1);
                      return (
                        <tr
                          key={r.round_id}
                          className="border-b border-border/50"
                        >
                          <td className="py-2.5 pr-4 text-muted">
                            {new Date(r.round_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold">
                            {r.avg.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted">
                            {r.count}
                          </td>
                          {r.distribution.map((count, i) => (
                            <td key={i} className="py-2.5 px-1">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-full max-w-[40px] h-4 bg-surface-2 rounded-sm overflow-hidden">
                                  <div
                                    className="h-full bg-brand rounded-sm transition-all"
                                    style={{
                                      width: `${(count / maxDist) * 100}%`,
                                      minWidth: count > 0 ? "3px" : "0",
                                    }}
                                  />
                                </div>
                                <span className="font-medium w-4 text-right">
                                  {count}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const params = useParams();
  const adminToken = params.token as string;

  const [team, setTeam] = useState<{ name: string; slug: string } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fixedItems, setFixedItems] = useState<QSetItem[]>([]);
  const [rotatingItems, setRotatingItems] = useState<QSetItem[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newQ, setNewQ] = useState<{ text: string; kind: "fixed" | "rotating_pool" }>({
    text: "",
    kind: "rotating_pool",
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/load?adminToken=${encodeURIComponent(adminToken)}`);
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();
      if (!data.team) { setLoading(false); return; }

      setTeam(data.team);
      if (data.settings) setSettings(data.settings);
      setFixedItems(data.fixedItems ?? []);
      setRotatingItems(data.rotatingItems ?? []);
      setRounds(data.rounds ?? []);
    } catch { /* silently handle */ }
    setLoading(false);
  }, [adminToken]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?adminToken=${encodeURIComponent(adminToken)}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch { /* silently handle */ }
  }, [adminToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showAnalytics && !analytics) {
      loadAnalytics();
    }
  }, [showAnalytics, analytics, loadAnalytics]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleCreateRound = async () => {
    const res = await fetch("/api/admin/create-round", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken }),
    });
    const data = await res.json();
    if (data.ok) {
      flash(`Round created! Respond link: ${window.location.origin}${data.round.respondLink}`);
      load();
    } else flash(`Error: ${data.error}`);
  };

  const handleCloseRound = async (roundId: string) => {
    const res = await fetch("/api/admin/close-round", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken, roundId }),
    });
    const data = await res.json();
    if (data.ok) { flash("Round closed."); load(); }
  };

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    await fetch("/api/admin/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken, ...updates }),
    });
    flash("Settings updated.");
    load();
  };

  const handleAddQuestion = async () => {
    if (!newQ.text.trim()) return;
    const res = await fetch("/api/admin/questions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken, ...newQ }),
    });
    const data = await res.json();
    if (data.ok) {
      flash("Question added.");
      setNewQ({ text: "", kind: "rotating_pool" });
      load();
    }
  };

  const handleRemoveQuestion = async (itemId: string, questionId: string) => {
    await fetch("/api/admin/questions", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken, questionSetItemId: itemId, questionId }),
    });
    flash("Question removed.");
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-border border-t-brand animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-2">Not found</h1>
          <p className="text-muted">This admin link doesn&apos;t match any team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-5 py-10">
      <header className="mb-10">
        <Badge variant="muted">Admin</Badge>
        <h1 className="text-3xl mt-3">{team.name}</h1>
        <a
          href={`/t/${team.slug}`}
          className="text-[0.875rem] text-brand hover:underline inline-flex items-center gap-1 mt-1"
        >
          View dashboard →
        </a>
      </header>

      {/* Flash message */}
      {message && (
        <div className="bg-brand-light text-brand border-2 border-brand/20 px-5 py-3 rounded-[var(--radius-sm)] mb-6 text-[0.9375rem] font-medium break-all">
          {message}
        </div>
      )}

      {/* ── Rounds (full width) ───────────────────────────────── */}
      <Card className="p-6 mb-5">
        <SectionHeading title="Rounds">
          <Button onClick={handleCreateRound} size="sm">
            + New round
          </Button>
        </SectionHeading>

        {rounds.length > 0 && (
          <div className={`space-y-2 ${rounds.length > 6 ? "max-h-[28rem] overflow-y-auto pr-1" : ""}`}>
            {rounds.map((r) => {
              const isExpanded = expandedRounds.has(r.id);
              const toggleExpand = () => {
                setExpandedRounds((prev) => {
                  const next = new Set(prev);
                  if (next.has(r.id)) next.delete(r.id);
                  else next.add(r.id);
                  return next;
                });
              };

              return (
                <div key={r.id}>
                  <div
                    className={`flex items-center justify-between bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3 ${
                      r.status === "closed" ? "cursor-pointer hover:bg-surface-2/80 transition-colors" : ""
                    }`}
                    onClick={r.status === "closed" ? toggleExpand : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={r.status === "open" ? "up" : "muted"} dot>
                        {r.status}
                      </Badge>
                      <span className="text-[0.875rem] text-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-[0.8125rem] text-muted">
                        {r.responseCount} response{r.responseCount !== 1 ? "s" : ""}
                      </span>
                      {r.status === "closed" && (
                        <span className="text-[0.75rem] text-muted/60">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {r.status === "open" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                `${window.location.origin}/r/${r.token}`
                              )
                            }
                          >
                            Copy link
                          </Button>
                          <Button
                            variant="alert"
                            size="sm"
                            onClick={() => handleCloseRound(r.id)}
                          >
                            Close
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded summary for closed rounds */}
                  {isExpanded && r.summary.length > 0 && (
                    <div className="ml-4 mt-1 mb-2 px-4 py-3 bg-surface rounded-[var(--radius-sm)] border border-border/50">
                      <div className="space-y-2">
                        {r.summary.map((s, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[0.8125rem] text-muted flex-1 truncate">
                              {s.question_text}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-16 h-2 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand rounded-full"
                                  style={{
                                    width: `${((s.avg - 1) / ((settings?.scale_max ?? 3) - 1)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[0.75rem] font-semibold w-8 text-right">
                                {s.avg.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Analytics (full width, togglable) ──────────────────── */}
      <Card className="p-6 mb-5">
        <SectionHeading
          title="Detailed analytics"
          subtitle="Distribution of responses per question, across rounds."
        >
          <Button
            size="sm"
            variant={showAnalytics ? "dark" : "outline"}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? "Hide" : "Show analytics"}
          </Button>
        </SectionHeading>

        {showAnalytics && (
          analytics ? (
            <AnalyticsTable data={analytics} />
          ) : (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-brand animate-spin" />
            </div>
          )
        )}
      </Card>

      {/* ── Fixed + Rotating side by side ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* ── Fixed Questions ──────────────────────────────────── */}
        <Card className="p-6">
          <SectionHeading
            title="Fixed questions"
            subtitle="These appear in every round."
          />
          <ul className="space-y-2">
            {fixedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3"
              >
                <span className="text-[0.9375rem]">{item.question?.text}</span>
                <Button
                  variant="alert"
                  size="sm"
                  onClick={() => handleRemoveQuestion(item.id, item.question_id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Rotating Pool ───────────────────────────────────── */}
        <Card className="p-6">
          <SectionHeading
            title="Rotating pool"
            subtitle="One of these is picked each round, cycling through them."
          />
          <ul className="space-y-2">
            {rotatingItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3"
              >
                <span className="text-[0.9375rem]">{item.question?.text}</span>
                <Button
                  variant="alert"
                  size="sm"
                  onClick={() => handleRemoveQuestion(item.id, item.question_id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Add Question + Settings side by side ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* ── Add Question ────────────────────────────────────── */}
        <Card className="p-6">
          <SectionHeading title="Add a question" />
          <div className="space-y-3">
            <input
              type="text"
              value={newQ.text}
              onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
              placeholder="e.g. I feel supported by my team."
              className="w-full"
            />
            <select
              value={newQ.kind}
              onChange={(e) =>
                setNewQ({ ...newQ, kind: e.target.value as "fixed" | "rotating_pool" })
              }
              className="w-full"
            >
              <option value="fixed">Fixed</option>
              <option value="rotating_pool">Rotating pool</option>
            </select>
            <Button onClick={handleAddQuestion} variant="dark">
              Add question
            </Button>
          </div>
        </Card>

        {/* ── Settings ────────────────────────────────────────── */}
        {settings && (
          <Card className="p-6">
            <SectionHeading title="Settings" />
            <div className="space-y-5">
              <div>
                <label className="text-[0.8125rem] text-muted font-medium block mb-1.5">
                  Cadence
                </label>
                <select
                  value={settings.cadence}
                  onChange={(e) =>
                    handleUpdateSettings({ cadence: e.target.value as Settings["cadence"] })
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-[0.8125rem] text-muted font-medium block mb-1.5">
                  Scale (number of options per question)
                </label>
                <select
                  value={settings.scale_max}
                  onChange={(e) =>
                    handleUpdateSettings({ scale_max: parseInt(e.target.value) as 3 | 4 | 5 })
                  }
                >
                  <option value={3}>3 (Disagree / Partly / Agree)</option>
                  <option value={4}>4 (Disagree → Agree, no neutral)</option>
                  <option value={5}>5 (Strongly disagree → Strongly agree)</option>
                </select>
              </div>
              <div>
                <label className="text-[0.8125rem] text-muted font-medium block mb-1.5">
                  Minimum responses before showing results
                </label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={settings.min_responses_to_show}
                  onChange={(e) =>
                    handleUpdateSettings({ min_responses_to_show: parseInt(e.target.value) })
                  }
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allow_free_text}
                  onChange={(e) =>
                    handleUpdateSettings({ allow_free_text: e.target.checked })
                  }
                  id="freeText"
                />
                <label htmlFor="freeText" className="text-[0.9375rem]">
                  Allow free text at end
                </label>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
