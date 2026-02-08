import { NextRequest, NextResponse } from "next/server";
import { getTeamByEmail } from "@/lib/queries";

/**
 * POST /api/teams/recover
 * Admin link recovery. Accepts { email } and always returns success
 * to prevent revealing whether the email exists in the system.
 *
 * TODO: When email sending is configured (Vercel + Resend/Postmark),
 * actually send the admin link to the registered email.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Look up team — result is NOT exposed to the client
  const _team = await getTeamByEmail(email);

  // TODO: Send the admin link when email is configured:
  // if (_team) {
  //   await sendEmail(_team.admin_email, {
  //     subject: "Your TeamTemp admin link",
  //     body: `Here's your admin link: ${origin}/admin/${_team.admin_token}`,
  //   });
  // }

  void _team; // suppress unused warning

  // Always return success regardless of whether the email exists
  return NextResponse.json({ ok: true });
}
