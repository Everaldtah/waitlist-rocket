import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "waitlist.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS waitlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    cta_text TEXT DEFAULT 'Join the waitlist',
    thank_you_message TEXT DEFAULT 'You''re on the list!',
    referral_reward TEXT,
    admin_token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    waitlist_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    referral_count INTEGER DEFAULT 0,
    position INTEGER,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(waitlist_id, email),
    FOREIGN KEY (waitlist_id) REFERENCES waitlists(id)
  );
`);

export default db;
