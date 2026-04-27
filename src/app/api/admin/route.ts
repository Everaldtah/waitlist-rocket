import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || req.headers.get("authorization")?.replace("Bearer ", "");
  return token === process.env.ADMIN_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, logo_url, cta_text, thank_you_message, referral_reward } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const id = uuidv4();
  const adminToken = nanoid(32);

  db.prepare(
    "INSERT INTO waitlists (id, name, description, logo_url, cta_text, thank_you_message, referral_reward, admin_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id, name, description || null, logo_url || null,
    cta_text || "Join the waitlist",
    thank_you_message || "You're on the list! Share to move up.",
    referral_reward || null,
    adminToken
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return NextResponse.json({
    id,
    name,
    admin_token: adminToken,
    public_url: `${baseUrl}/w/${id}`,
    api_join_url: `${baseUrl}/api/join`,
    embed_code: `<iframe src="${baseUrl}/w/${id}/embed" width="100%" height="400" frameborder="0"></iframe>`,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const waitlists = db.prepare("SELECT * FROM waitlists").all() as any[];

  const result = waitlists.map((w) => {
    const totalSubs = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ?").get(w.id) as any).n;
    const confirmedSubs = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ? AND status = 'confirmed'").get(w.id) as any).n;
    const top10 = db.prepare("SELECT email, name, referral_count, position FROM subscribers WHERE waitlist_id = ? ORDER BY referral_count DESC LIMIT 10").all(w.id);

    return {
      ...w,
      admin_token: undefined,
      total_subscribers: totalSubs,
      confirmed: confirmedSubs,
      top_referrers: top10,
    };
  });

  return NextResponse.json(result);
}
