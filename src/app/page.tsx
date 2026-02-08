"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function Home() {
  const [adminLink, setAdminLink] = useState("");
  const router = useRouter();

  // ── Team creation state ──────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<{
    name: string;
    slug: string;
    adminLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGo = () => {
    const trimmed = adminLink.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) {
      const url = new URL(trimmed, window.location.origin);
      router.push(url.pathname);
    } else {
      router.push(`/admin/${trimmed}`);
    }
  };

  const handleCreateTeam = async () => {
    const name = teamName.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreatedTeam(data.team);
        setTeamName("");
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!createdTeam) return;
    const fullLink = `${window.location.origin}${createdTeam.adminLink}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="max-w-[28rem] w-full text-center">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-light mb-5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
              <rect x="13" y="4" width="6" height="20" rx="3" fill="var(--brand)" />
              <circle cx="16" cy="25" r="5" fill="var(--brand)" />
              <circle cx="16" cy="25" r="3" fill="var(--surface)" />
            </svg>
          </div>
          <h1 className="text-4xl mb-3">TeamTemp</h1>
          <p className="text-muted text-lg leading-relaxed">
            A quick, anonymous temperature check for your team.
            <br />
            No tracking. No judgments. Just honest signals.
          </p>
        </div>

        {/* Admin link input */}
        <Card className="p-6 text-left" elevated>
          <p className="font-medium mb-3">
            Have an admin link? Paste it here.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={adminLink}
              onChange={(e) => setAdminLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
              placeholder="Your admin token or link"
              className="flex-1"
            />
            <Button onClick={handleGo} variant="dark">
              Go
            </Button>
          </div>
        </Card>

        {/* ── Create a team ─────────────────────────────────────── */}
        <Card className="p-6 text-left mt-5" elevated>
          {createdTeam ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-up-light text-up text-[0.875rem]">
                  ✓
                </span>
                <p className="font-medium">
                  {createdTeam.name} is ready!
                </p>
              </div>

              <div className="bg-surface-2 rounded-[var(--radius-sm)] p-4 mb-3">
                <p className="text-[0.75rem] text-muted font-medium uppercase tracking-wider mb-1">
                  Your admin link
                </p>
                <code className="text-[0.875rem] font-mono break-all text-ink">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}${createdTeam.adminLink}`
                    : createdTeam.adminLink}
                </code>
              </div>

              <div className="flex gap-2 mb-3">
                <Button onClick={handleCopy} variant="dark" size="sm">
                  {copied ? "Copied!" : "Copy link"}
                </Button>
                <Button
                  onClick={() => router.push(createdTeam.adminLink)}
                  variant="outline"
                  size="sm"
                >
                  Go to admin →
                </Button>
              </div>

              <p className="text-[0.75rem] text-muted leading-relaxed">
                This link is your only way into the admin panel — no login, no password.
                Save it somewhere safe. If you lose it, there&apos;s no way to recover it.
              </p>

              <button
                onClick={() => {
                  setCreatedTeam(null);
                  setCopied(false);
                }}
                className="text-[0.8125rem] text-brand hover:underline mt-3 cursor-pointer"
              >
                Create another team
              </button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">Start a new team</p>
              <p className="text-[0.875rem] text-muted mb-3">
                Free, instant. You&apos;ll get an admin link to manage everything.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  placeholder="Your team name"
                  className="flex-1"
                  disabled={creating}
                  maxLength={100}
                />
                <Button
                  onClick={handleCreateTeam}
                  variant="brand"
                  disabled={creating || !teamName.trim()}
                >
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* How it works */}
        <Card className="p-6 text-left mt-10">
          <h2 className="text-lg mb-4">How it works</h2>
          <ol className="space-y-4">
            {[
              {
                num: "1",
                color: "bg-brand-light text-brand",
                text: "Your team admin creates a round and shares a link — in Slack, email, wherever.",
              },
              {
                num: "2",
                color: "bg-cool-light text-cool",
                text: "Everyone takes 30 seconds to answer a few simple questions. Totally anonymous.",
              },
              {
                num: "3",
                color: "bg-warm-light text-warm",
                text: "The team dashboard shows patterns and changes over time — things worth talking about together.",
              },
            ].map((step) => (
              <li key={step.num} className="flex gap-3 items-start">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[0.8125rem] font-bold shrink-0 ${step.color}`}
                >
                  {step.num}
                </span>
                <span className="text-[0.9375rem] text-muted leading-relaxed pt-0.5">
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <p className="text-[0.8125rem] text-muted mt-10 opacity-70">
          TeamTemp is a shared thermometer on the wall — not a report card.
        </p>
      </div>
    </div>
  );
}
