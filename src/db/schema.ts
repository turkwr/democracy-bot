import Database from "better-sqlite3";
import path from "path";
import { logger } from "../lib/logger";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized — call initDb() first");
  }
  return db;
}

export function initDb(): void {
  const dbPath = path.resolve(process.cwd(), "data", "democracy.db");
  const fs = require("fs");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id      TEXT PRIMARY KEY,
      threshold     INTEGER NOT NULL DEFAULT 60,
      duration_mins INTEGER NOT NULL DEFAULT 60,
      voter_role_id TEXT
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT    NOT NULL,
      channel_id    TEXT    NOT NULL,
      message_id    TEXT,
      proposer_id   TEXT    NOT NULL,
      action_type   TEXT    NOT NULL,
      payload       TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'open',
      yes_count     INTEGER NOT NULL DEFAULT 0,
      no_count      INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      closes_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      proposal_id INTEGER NOT NULL REFERENCES proposals(id),
      user_id     TEXT    NOT NULL,
      choice      TEXT    NOT NULL,
      voted_at    INTEGER NOT NULL,
      PRIMARY KEY (proposal_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_guild   ON proposals(guild_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_status  ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_proposals_closes  ON proposals(closes_at);
  `);

  logger.success("Database initialized");
}
