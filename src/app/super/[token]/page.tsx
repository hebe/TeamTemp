"use client";

import { useState, useEffect } from "react";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  admin_token: string;
  admin_email: string;
  created_at: string;
  roundCount: number;
  submissionCount: number;
  lastRoundDate: string | null;
};

export default function SuperAdminPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Fetch teams once token is available
  useEffect(() => {
    if (!token) return;

    fetch(`/api/super/teams?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.teams) {
          setTeams(data.teams);
        }
        setLoading(false);
      })
      .catch(() => {
        setUnauthorized(true);
        setLoading(false);
      });
  }, [token]);

  const handleCopyAdminLink = (team: TeamRow) => {
    const url = `${window.location.origin}/admin/${team.admin_token}`;
    navigator.clipboard.writeText(url);
    setCopiedTeamId(team.id);
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  // ── Unauthorized ──
  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <Card className="p-10 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-alert-light mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                stroke="var(--alert)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl mb-2">Not authorized</h1>
          <p className="text-muted">
            This token doesn&apos;t match. Double-check your super-admin link.
          </p>
        </Card>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen max-w-5xl mx-auto px-5 py-10">
      <header className="mb-8">
        <Badge variant="muted">Super Admin</Badge>
        <h1 className="text-3xl mt-3">All Teams</h1>
        <p className="text-muted mt-1">
          {teams.length} {teams.length === 1 ? "team" : "teams"} registered
        </p>
      </header>

      {teams.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted">
            No teams yet. Create one from the{" "}
            <a href="/" className="text-brand hover:underline">
              landing page
            </a>
            .
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.875rem]">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Admin email</th>
                  <th className="px-5 py-3 font-semibold text-center">Rounds</th>
                  <th className="px-5 py-3 font-semibold text-center">Responses</th>
                  <th className="px-5 py-3 font-semibold">Last round</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold text-right">Links</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <span className="font-medium">{team.name}</span>
                        <span className="text-muted ml-2 text-[0.75rem]">
                          /{team.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted text-[0.8125rem]">
                      {team.admin_email}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums">
                      {team.roundCount}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums">
                      {team.submissionCount}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {team.lastRoundDate
                        ? formatDate(team.lastRoundDate)
                        : "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDate(team.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/t/${team.slug}`}
                          className="text-brand hover:underline text-[0.8125rem]"
                        >
                          Dashboard
                        </a>
                        <a
                          href={`/admin/${team.admin_token}`}
                          className="text-brand hover:underline text-[0.8125rem]"
                        >
                          Admin
                        </a>
                        <button
                          onClick={() => handleCopyAdminLink(team)}
                          className="text-brand hover:underline text-[0.8125rem] cursor-pointer"
                        >
                          {copiedTeamId === team.id ? "Copied!" : "Copy link"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="h-10" />
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
