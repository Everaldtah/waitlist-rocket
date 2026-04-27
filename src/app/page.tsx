export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: "640px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚀</div>
        <h1 style={{ fontSize: "3rem", fontWeight: "900", marginBottom: "16px", background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Waitlist Rocket
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#94a3b8", marginBottom: "40px", lineHeight: "1.7" }}>
          Launch viral waitlists with referral mechanics. Every referral moves your subscribers up the list — creating a self-spreading growth loop.
        </p>
        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px", textAlign: "left" }}>
          <h2 style={{ color: "#e2e8f0", marginBottom: "12px" }}>Create a waitlist via API</h2>
          <pre style={{ background: "#0f172a", padding: "16px", borderRadius: "8px", overflow: "auto", fontSize: "0.85rem", color: "#7dd3fc" }}>{`curl -X POST /api/admin \\
  -H "X-Admin-Token: your-admin-token" \\
  -d '{
    "name": "My Product",
    "description": "Coming soon...",
    "referral_reward": "3 months free"
  }'`}</pre>
        </div>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Self-hosted. Open source. Your data stays yours.
        </p>
      </div>
    </main>
  );
}
