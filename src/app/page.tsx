"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function Home() {
  const router = useRouter();

  // ── Create team form ──────────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<{
    name: string;
    slug: string;
    adminLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Recover form ──────────────────────────────────────────────────
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverSent, setRecoverSent] = useState(false);

  const handleCreateTeam = async () => {
    const name = teamName.trim();
    const email = teamEmail.trim();
    if (!name || !email || creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreatedTeam(data.team);
        setTeamName("");
        setTeamEmail("");
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

  const handleRecover = async () => {
    const email = recoverEmail.trim();
    if (!email || recovering) return;

    setRecovering(true);
    try {
      await fetch("/api/teams/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Still show the message to avoid revealing information
    } finally {
      setRecoverSent(true);
      setRecovering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="max-w-[56rem] w-full">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-light mb-5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
              <rect x="13" y="4" width="6" height="20" rx="3" fill="var(--brand)" />
              <circle cx="16" cy="25" r="5" fill="var(--brand)" />
              <circle cx="16" cy="25" r="3" fill="var(--surface)" />
            </svg>
          </div>
          <h1 className="text-4xl mb-3">TeamTemp</h1>
          <p className="text-muted text-lg leading-relaxed max-w-md mx-auto">
            A quick, anonymous temperature check for your team.
            <br />
            No tracking. No judgments. Just honest signals.
          </p>
        </div>

        {/* ── Two action cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Left card: Create a new team */}
          <Card className="p-6 text-left" elevated>
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
                  Save this link somewhere safe. You can also recover it
                  later via the email you provided.
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
                <h2 className="text-lg mb-1">Set up a new team</h2>
                <p className="text-[0.875rem] text-muted mb-4">
                  Free, instant. You&apos;ll get an admin link to manage everything.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Your team name"
                    className="w-full"
                    disabled={creating}
                    maxLength={100}
                  />
                  <input
                    type="email"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    placeholder="Admin email"
                    className="w-full"
                    disabled={creating}
                  />
                  <Button
                    onClick={handleCreateTeam}
                    variant="brand"
                    className="w-full"
                    disabled={creating || !teamName.trim() || !teamEmail.trim()}
                  >
                    {creating ? "Creating\u2026" : "Create team"}
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Right card: Recover admin link */}
          <Card className="p-6 text-left" elevated>
            {recoverSent ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-light text-brand text-[0.875rem]">
                    ✓
                  </span>
                  <p className="font-medium">Check your email</p>
                </div>
                <p className="text-[0.875rem] text-muted leading-relaxed">
                  If this email is registered with a team, we&apos;ve sent the
                  admin link. Check your inbox (and spam folder).
                </p>
                <button
                  onClick={() => {
                    setRecoverSent(false);
                    setRecoverEmail("");
                  }}
                  className="text-[0.8125rem] text-brand hover:underline mt-4 cursor-pointer"
                >
                  Try a different email
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg mb-1">Recover admin link</h2>
                <p className="text-[0.875rem] text-muted mb-4">
                  Lost your admin link? We&apos;ll send it to the email you
                  used when creating the team.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRecover()}
                    placeholder="Admin email"
                    className="w-full"
                    disabled={recovering}
                  />
                  <Button
                    onClick={handleRecover}
                    variant="dark"
                    className="w-full"
                    disabled={recovering || !recoverEmail.trim()}
                  >
                    {recovering ? "Sending\u2026" : "Send admin link"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── Team member note ─────────────────────────────────────── */}
        <Card className="p-5 mt-5 text-center">
          <p className="text-[0.875rem] text-muted leading-relaxed">
            <span className="font-medium text-ink">Looking for your check-in link?</span>{" "}
            Your team admin shares it when it&apos;s time to check in.
            Look for it in your Slack or email!
          </p>
        </Card>

        {/* ── Footer tagline ──────────────────────────────────────── */}
        <p className="text-[0.8125rem] text-muted mt-10 opacity-70 text-center">
          TeamTemp is a shared thermometer on the wall — not a report card.
        </p>
      </div>
    </div>
  );
}
