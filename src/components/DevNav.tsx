"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type LinkItem = { href: string; label: string };

const DEMO_ADMIN_TOKEN = "demo-admin-token-abc123";
const DEMO_SLUG = "example";
const SUPER_TOKEN = "dev-super-token";

export default function DevNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [links, setLinks] = useState<LinkItem[]>([]);

  useEffect(() => {
    // Always fetch the demo team so we get a complete set of links
    fetch(`/api/admin/load?adminToken=${encodeURIComponent(DEMO_ADMIN_TOKEN)}`)
      .then((r) => r.json())
      .then((data) => {
        const rounds = data.rounds ?? [];
        const built: LinkItem[] = [{ href: "/", label: "Landing" }];

        const openRound = rounds.find((r: { status: string }) => r.status === "open");
        if (openRound) {
          built.push({ href: `/r/${openRound.token}`, label: "Respond" });
        }

        built.push({ href: `/t/${DEMO_SLUG}`, label: "Dashboard" });

        const closed = rounds
          .filter((r: { status: string }) => r.status === "closed")
          .sort((a: { created_at: string }, b: { created_at: string }) =>
            b.created_at.localeCompare(a.created_at)
          );
        if (closed.length > 0) {
          built.push({ href: `/t/${DEMO_SLUG}/retro/${closed[0].id}`, label: "Retro" });
        }

        built.push({ href: `/admin/${DEMO_ADMIN_TOKEN}`, label: "Admin" });
        built.push({ href: `/super/${SUPER_TOKEN}`, label: "Super" });

        setLinks(built);
      })
      .catch(() => {
        // Fallback if fetch fails — still show all static links
        setLinks([
          { href: "/", label: "Landing" },
          { href: `/t/${DEMO_SLUG}`, label: "Dashboard" },
          { href: `/admin/${DEMO_ADMIN_TOKEN}`, label: "Admin" },
          { href: `/super/${SUPER_TOKEN}`, label: "Super" },
        ]);
      });
  }, [pathname]);

  if (links.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-3 z-50 bg-ink text-white text-[0.75rem] font-medium px-2.5 py-1 rounded-full opacity-40 hover:opacity-100 transition cursor-pointer"
      >
        DEV
      </button>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-sm text-white">
      <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-10">
        <div className="flex items-center gap-1">
          <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/50 mr-3">
            DEV
          </span>
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <a
                key={link.href}
                href={link.href}
                className={`text-[0.8125rem] px-3 py-1 rounded-full transition ${
                  isActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/40 hover:text-white text-[0.8125rem] transition cursor-pointer"
        >
          Hide
        </button>
      </div>
    </nav>
  );
}
