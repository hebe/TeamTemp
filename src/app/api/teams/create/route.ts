import { NextRequest, NextResponse } from "next/server";
import { createTeam } from "@/lib/queries";

/**
 * POST /api/teams/create
 * Self-service team creation. Accepts { name } and returns the admin link.
 */
export async function POST(request: NextRequest) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Team name is required" },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Team name too long (max 100 characters)" },
      { status: 400 }
    );
  }

  const result = await createTeam(name);

  return NextResponse.json(
    {
      ok: true,
      team: {
        name: result.team.name,
        slug: result.team.slug,
        adminLink: result.adminLink,
      },
    },
    { status: 201 }
  );
}
