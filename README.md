# waitlist-rocket

> Viral waitlist builder with referral mechanics, position tracking, and social sharing for pre-launch products.

## The Problem

Pre-launch waitlists are one of the highest-leverage growth tools, but most founders use a simple Google Form — no viral loop, no position visibility, no referral reward. Tools like Viral Loops cost $99-$299/month. **waitlist-rocket** is self-hosted, open-source, and ships everything you need out of the box.

## Features

- **Viral referral system** — each referral moves subscriber up **3 spots** automatically
- **Position tracking** — subscribers see their exact position and can check anytime
- **Beautiful waitlist page** — hosted at `/w/[id]` with live count of people ahead
- **Social sharing buttons** — X/Twitter and LinkedIn share buttons with pre-filled text
- **Confirmation emails** — auto-sent with referral link on signup (SMTP required)
- **Embed widget** — drop an `<iframe>` into any website or landing page
- **Admin dashboard API** — view all waitlists, subscriber counts, top referrers
- **JSON Feed** — machine-readable subscriber data for export
- **Multi-waitlist** — host unlimited waitlists from one instance

## Tech Stack

- Next.js 14 (App Router, Server Components)
- TypeScript
- better-sqlite3 (zero-config local DB)
- Nodemailer (confirmation emails)
- Deployed on Vercel / Railway / self-hosted

## Installation

```bash
git clone https://github.com/Everaldtah/waitlist-rocket.git
cd waitlist-rocket
npm install

cp .env.example .env.local
# Set ADMIN_TOKEN and NEXT_PUBLIC_BASE_URL

npm run dev
```

## Usage

### Create a waitlist
```bash
curl -X POST http://localhost:3000/api/admin \
  -H "X-Admin-Token: your-secret-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SuperApp",
    "description": "The app that does everything. Launching Q3 2026.",
    "cta_text": "Get early access",
    "thank_you_message": "You'\''re in! Share to skip the line.",
    "referral_reward": "3 months free Pro plan"
  }'
```

Response includes:
- `public_url` — share this link on social media / your landing page
- `embed_code` — drop this iframe anywhere

### Public waitlist page
`http://localhost:3000/w/{waitlist_id}` — fully styled page with referral form

### With referral tracking
`http://localhost:3000/w/{waitlist_id}?ref={referral_code}`

### Check subscriber position
```bash
curl "http://localhost:3000/api/status?email=user@example.com&waitlist_id=WAITLIST_ID"
```

### View admin stats
```bash
curl http://localhost:3000/api/admin \
  -H "X-Admin-Token: your-secret-admin-token"
```

## Referral Mechanics

1. User joins waitlist → gets unique referral link
2. User shares link with friends
3. Each friend who joins via the link → referrer moves up **3 positions**
4. No cap — incentivizes aggressive sharing
5. Top referrers surfaced in admin dashboard

## Monetization Model

| Plan | Price | Features |
|------|-------|---------|
| Free | $0 | 1 waitlist, 500 subscribers |
| Starter | $19/mo | 5 waitlists, 10K subscribers, custom domain |
| Growth | $49/mo | Unlimited waitlists, 100K subscribers, analytics, email sequences |
| Agency | $149/mo | White-label, client management, priority support |

**Revenue drivers:** Target indie hackers, product launchers, and agencies running pre-launch campaigns. Offer "launch package" upsell with email sequence automation. Partner with Product Hunt launch services. High LTV from repeat launchers.

## License

MIT
