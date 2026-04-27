import { notFound } from "next/navigation";
import db from "@/lib/db";
import WaitlistForm from "@/components/WaitlistForm";

interface Props {
  params: { id: string };
  searchParams: { ref?: string };
}

export default function WaitlistPage({ params, searchParams }: Props) {
  const waitlist = db.prepare("SELECT * FROM waitlists WHERE id = ?").get(params.id) as any;
  if (!waitlist) notFound();

  const totalCount = (db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE waitlist_id = ?").get(params.id) as any).n;

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "48px", maxWidth: "480px", width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
        {waitlist.logo_url && (
          <img src={waitlist.logo_url} alt={waitlist.name} style={{ width: "60px", height: "60px", borderRadius: "12px", marginBottom: "20px" }} />
        )}
        <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#1e293b", marginBottom: "8px" }}>{waitlist.name}</h1>
        {waitlist.description && (
          <p style={{ color: "#64748b", marginBottom: "24px", lineHeight: "1.6" }}>{waitlist.description}</p>
        )}
        {totalCount > 0 && (
          <div style={{ background: "#F5F3FF", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", fontSize: "0.9rem", color: "#6D28D9" }}>
            🔥 <strong>{totalCount.toLocaleString()}</strong> people already on the waitlist
          </div>
        )}
        <WaitlistForm waitlistId={params.id} ctaText={waitlist.cta_text} referralCode={searchParams.ref} />
        {waitlist.referral_reward && (
          <p style={{ fontSize: "0.85rem", color: "#6B7280", marginTop: "16px", textAlign: "center" }}>
            🎁 Refer friends to earn: <strong>{waitlist.referral_reward}</strong>
          </p>
        )}
      </div>
    </main>
  );
}
