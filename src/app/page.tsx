"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function Home() {
  const [adminLink, setAdminLink] = useState("");
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
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
          <h1 className="text-4xl mb-3">TX Temp</h1>
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
          TX Temp is a shared thermometer on the wall — not a report card.
        </p>
      </div>
    </div>
  );
}
