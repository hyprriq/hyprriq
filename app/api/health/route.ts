import { NextResponse } from "next/server";

// Health check endpoint. Public (allow-listed in middleware) so UptimeRobot
// and Vercel can probe it without auth. Expanded with dependency checks
// (Supabase, Inngest) in Session 8.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
