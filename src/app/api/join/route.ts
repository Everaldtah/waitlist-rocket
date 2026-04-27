import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { waitlist_id, email, name, ref } = await req.json();

  if (!waitlist_id || !email) {
    return NextResponse.json({ error: "waitlist_id and email required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const waitlist = db.prepare("SELECT * FROM waitlists WHERE id = ?").get(waitlist_id) as any;
  if (!waitlist) {
    return NextResponse.json({ error: "Waitlist not found" }, { status: 404 });
  }

  const existing = db.prepare("SELECT * FROM subscribers WHERE waitlist_id = ? AND email = ?").get(waitlist_id, email) as any;
  if (existing) {
    return NextResponse.json({
      message: "Already on the waitlist",
      position: existing.position,
      referral_code: existing.referral_code,
      referral_count: existing.referral_count,
    });
  }

  const totalOnList = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ?").get(waitlist_id) as any).n;
  const position = totalOnList + 1;
  const referralCode = nanoid(8);
  const id = uuidv4();

  db.prepare(
    "INSERT INTO subscribers (id, waitlist_id, email, name, referral_code, referred_by, position) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, waitlist_id, email, name || null, referralCode, ref || null, position);

  if (ref) {
    const referrer = db.prepare("SELECT * FROM subscribers WHERE referral_code = ? AND waitlist_id = ?").get(ref, waitlist_id) as any;
    if (referrer) {
      db.prepare("UPDATE subscribers SET referral_count = referral_count + 1, position = MAX(1, position - 3) WHERE id = ?").run(referrer.id);
    }
  }

  await sendConfirmationEmail(email, name, waitlist, position, referralCode);

  return NextResponse.json({
    message: "You're on the waitlist!",
    position,
    referral_code: referralCode,
    referral_link: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/w/${waitlist_id}?ref=${referralCode}`,
    waitlist_name: waitlist.name,
    thank_you_message: waitlist.thank_you_message,
  }, { status: 201 });
}

async function sendConfirmationEmail(email: string, name: string | null, waitlist: any, position: number, referralCode: string) {
  if (!process.env.SMTP_HOST) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const referralLink = `${baseUrl}/w/${waitlist.id}?ref=${referralCode}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:30px">
  <h1 style="color:#4F46E5">You're #${position} on the ${waitlist.name} waitlist! 🚀</h1>
  <p>${waitlist.thank_you_message}</p>
  <div style="background:#F5F3FF;border-radius:8px;padding:20px;margin:20px 0">
    <h3 style="color:#4F46E5;margin:0 0 10px">Move up the list!</h3>
    <p>Share your unique referral link. Each friend who joins moves you <strong>3 spots forward</strong>.</p>
    <a href="${referralLink}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:8px">
      Share your link →
    </a>
    <p style="font-size:12px;color:#6B7280;word-break:break-all">${referralLink}</p>
  </div>
  ${waitlist.referral_reward ? `<p>🎁 <strong>Reward:</strong> ${waitlist.referral_reward}</p>` : ""}
</div>`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `You're on the ${waitlist.name} waitlist! 🚀`,
      html,
    });
  } catch (e) {
    console.error("[waitlist-rocket] Email send failed:", e);
  }
}
