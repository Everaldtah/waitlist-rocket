"use client";

import { useState } from "react";

interface Props {
  waitlistId: string;
  ctaText: string;
  referralCode?: string;
}

interface JoinResult {
  position: number;
  referral_link: string;
  referral_code: string;
  thank_you_message: string;
  waitlist_name: string;
}

export default function WaitlistForm({ waitlistId, ctaText, referralCode }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: waitlistId, email, name: name || undefined, ref: referralCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (result?.referral_link) {
      await navigator.clipboard.writeText(result.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (result) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
          You're #{result.position}!
        </h2>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>{result.thank_you_message}</p>

        <div style={{ background: "#F5F3FF", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
          <p style={{ fontWeight: "600", color: "#4F46E5", marginBottom: "8px" }}>📣 Share to move up the list!</p>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", wordBreak: "break-all", marginBottom: "12px" }}>
            {result.referral_link}
          </p>
          <button
            onClick={copyLink}
            style={{ background: copied ? "#059669" : "#4F46E5", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", width: "100%" }}
          >
            {copied ? "✓ Copied!" : "Copy referral link"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <a
            href={`https://twitter.com/intent/tweet?text=I just joined the ${encodeURIComponent(result.waitlist_name)} waitlist! Join here: ${encodeURIComponent(result.referral_link)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#1DA1F2", color: "white", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }}
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(result.referral_link)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#0A66C2", color: "white", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }}
          >
            Share on LinkedIn
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "12px" }}>
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      {error && <p style={{ color: "#DC2626", fontSize: "0.9rem", marginBottom: "12px" }}>{error}</p>}
      <button
        type="submit"
        disabled={loading}
        style={{ width: "100%", padding: "14px", background: loading ? "#A5B4FC" : "#4F46E5", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Joining..." : ctaText}
      </button>
    </form>
  );
}
