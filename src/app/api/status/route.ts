import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const waitlist_id = searchParams.get("waitlist_id");

  if (!email || !waitlist_id) {
    return NextResponse.json({ error: "email and waitlist_id required" }, { status: 400 });
  }

  const sub = db.prepare("SELECT * FROM subscribers WHERE email = ? AND waitlist_id = ?").get(email, waitlist_id) as any;
  if (!sub) {
    return NextResponse.json({ error: "Email not found on this waitlist" }, { status: 404 });
  }

  const totalOnList = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ?").get(waitlist_id) as any).n;
  const aheadCount = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ? AND position < ?").get(waitlist_id, sub.position) as any).n;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return NextResponse.json({
    email: sub.email,
    name: sub.name,
    position: sub.position,
    total_on_list: totalOnList,
    ahead_of: aheadCount,
    percentile: Math.round((1 - aheadCount / Math.max(totalOnList, 1)) * 100),
    referral_code: sub.referral_code,
    referral_count: sub.referral_count,
    referral_link: `${baseUrl}/w/${waitlist_id}?ref=${sub.referral_code}`,
    status: sub.status,
    joined_at: sub.created_at,
  });
}
