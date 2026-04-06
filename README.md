# Waitlist Rocket

> Viral waitlist platform with built-in referral mechanics. Grow your pre-launch audience 3-5x faster.

## Problem It Solves

Pre-launch startups need to build email lists before they launch — but plain "notify me" forms get low conversion and zero virality. **Waitlist Rocket** adds referral mechanics: each subscriber gets a unique referral link. Refer 3 friends → jump 150 spots in the queue. This creates a viral loop that makes subscribers actively recruit for you.

Proven by products like Robinhood (1M+ waitlist), Superhuman, and Notion — referral waitlists convert 3-5x better than plain email capture.

## Features

- **One-click setup** — create a waitlist campaign in seconds via API
- **Embeddable widget** — iframe embed for any landing page
- **Referral mechanics** — unique referral codes, configurable rewards
- **Position queue** — subscribers see their spot # and jump when they refer
- **Admin dashboard API** — manage subscribers, view growth analytics
- **CSV export** — download your full list for email marketing
- **Rate limiting** — prevents bot signups
- **Public stats API** — show live subscriber count on your landing page
- **No-code widget** — works without any frontend code changes

## Tech Stack

- **Node.js 18+**
- **Express** — REST API + widget server
- **SQLite (better-sqlite3)** — zero-config embedded storage

## Installation

```bash
git clone https://github.com/Everaldtah/waitlist-rocket
cd waitlist-rocket
npm install
cp .env.example .env
# Edit BASE_URL in .env
node index.js
```

Server at `http://localhost:3000`

## Quick Start

### 1. Create a waitlist campaign
```bash
curl -X POST http://localhost:3000/api/admin/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Launch",
    "slug": "my-app",
    "admin_email": "founder@myapp.com",
    "description": "The fastest way to ship SaaS",
    "reward_text": "Refer 3 friends to skip the line!",
    "referrals_needed": 3,
    "spots_per_referral": 50
  }'
```

**Response:**
```json
{
  "admin_key": "adm_...",
  "widget_url": "http://localhost:3000/widget/my-app",
  "embed_code": "<iframe src=\"...\" ...></iframe>"
}
```

### 2. Embed on your landing page
```html
<iframe src="https://waitlist.yourapp.com/widget/my-app"
        width="100%" height="500" frameborder="0"></iframe>
```

### 3. Or use the API directly
```bash
curl -X POST http://localhost:3000/api/waitlist/my-app/join \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "Jane", "ref": "ABCD1234"}'
```

### 4. Check position
```bash
curl "http://localhost:3000/api/waitlist/my-app/position?email=user@example.com"
```

### 5. Admin: export subscribers
```bash
curl "http://localhost:3000/api/admin/subscribers/export" \
  -H "X-Admin-Key: adm_..." > subscribers.csv
```

### 6. Growth analytics
```bash
curl "http://localhost:3000/api/admin/analytics" -H "X-Admin-Key: adm_..."
```

## How Referrals Work

1. User A signs up → gets position #500 and referral code `XKCD7892`
2. User A shares `https://yourapp.com/widget/my-app?ref=XKCD7892`
3. Each friend who signs up via that link → User A jumps `spots_per_referral` positions ahead
4. Friends also get lower positions since they joined via referral
5. Result: motivated sharing, faster growth

## Monetization Model

| Plan | Price | Campaigns | Subscribers |
|------|-------|-----------|-------------|
| Free | $0 | 1 | 500 |
| Starter | $19/mo | 3 | 5,000 |
| Growth | $49/mo | 10 | 50,000 |
| Scale | $99/mo | Unlimited | Unlimited + custom domain |

**Target market:** Indie hackers, startup founders, product teams building pre-launch audiences.

**Alternatives:** Viral Loops ($49/mo+), KickoffLabs ($29/mo+), Prefinery — all are expensive and complex for solo founders.

**Distribution:** Betalist, Product Hunt, IndieHackers, #buildinpublic on X.

## License

MIT
