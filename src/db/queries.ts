import { getDb } from "./schema";

export interface GuildConfig {
  guild_id: string;
  threshold: number;
  duration_mins: number;
  voter_role_id: string | null;
}

export interface Proposal {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  proposer_id: string;
  action_type: string;
  payload: string;
  status: "open" | "passed" | "failed" | "expired";
  yes_count: number;
  no_count: number;
  created_at: number;
  closes_at: number;
}

export function getGuildConfig(guildId: string): GuildConfig {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM guild_config WHERE guild_id = ?")
    .get(guildId) as GuildConfig | undefined;

  if (existing) return existing;

  db.prepare(
    "INSERT INTO guild_config (guild_id, threshold, duration_mins, voter_role_id) VALUES (?, 60, 60, NULL)"
  ).run(guildId);

  return { guild_id: guildId, threshold: 60, duration_mins: 60, voter_role_id: null };
}

export function setGuildThreshold(guildId: string, threshold: number): void {
  const db = getDb();
  getGuildConfig(guildId);
  db.prepare("UPDATE guild_config SET threshold = ? WHERE guild_id = ?").run(threshold, guildId);
}

export function setGuildDuration(guildId: string, minutes: number): void {
  const db = getDb();
  getGuildConfig(guildId);
  db.prepare("UPDATE guild_config SET duration_mins = ? WHERE guild_id = ?").run(minutes, guildId);
}

export function setGuildVoterRole(guildId: string, roleId: string | null): void {
  const db = getDb();
  getGuildConfig(guildId);
  db.prepare("UPDATE guild_config SET voter_role_id = ? WHERE guild_id = ?").run(roleId, guildId);
}

export function createProposal(data: {
  guild_id: string;
  channel_id: string;
  proposer_id: string;
  action_type: string;
  payload: object;
  duration_mins: number;
}): Proposal {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const closesAt = now + data.duration_mins * 60;

  const result = db
    .prepare(
      `INSERT INTO proposals (guild_id, channel_id, proposer_id, action_type, payload, created_at, closes_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.guild_id,
      data.channel_id,
      data.proposer_id,
      data.action_type,
      JSON.stringify(data.payload),
      now,
      closesAt
    );

  return getProposal(result.lastInsertRowid as number)!;
}

export function setProposalMessageId(id: number, messageId: string): void {
  getDb()
    .prepare("UPDATE proposals SET message_id = ? WHERE id = ?")
    .run(messageId, id);
}

export function getProposal(id: number): Proposal | undefined {
  return getDb()
    .prepare("SELECT * FROM proposals WHERE id = ?")
    .get(id) as Proposal | undefined;
}

export function getActiveProposals(guildId: string): Proposal[] {
  return getDb()
    .prepare("SELECT * FROM proposals WHERE guild_id = ? AND status = 'open' ORDER BY created_at DESC")
    .all(guildId) as Proposal[];
}

export function getExpiredProposals(): Proposal[] {
  const now = Math.floor(Date.now() / 1000);
  return getDb()
    .prepare("SELECT * FROM proposals WHERE status = 'open' AND closes_at <= ?")
    .all(now) as Proposal[];
}

export function getProposalHistory(guildId: string, offset: number, limit: number): Proposal[] {
  return getDb()
    .prepare(
      "SELECT * FROM proposals WHERE guild_id = ? AND status != 'open' ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(guildId, limit, offset) as Proposal[];
}

export function countProposalHistory(guildId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM proposals WHERE guild_id = ? AND status != 'open'")
    .get(guildId) as { cnt: number };
  return row.cnt;
}

export function castVote(proposalId: number, userId: string, choice: "yes" | "no"): boolean {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    db.prepare(
      "INSERT INTO votes (proposal_id, user_id, choice, voted_at) VALUES (?, ?, ?, ?)"
    ).run(proposalId, userId, choice, now);
  } catch {
    return false;
  }

  if (choice === "yes") {
    db.prepare("UPDATE proposals SET yes_count = yes_count + 1 WHERE id = ?").run(proposalId);
  } else {
    db.prepare("UPDATE proposals SET no_count = no_count + 1 WHERE id = ?").run(proposalId);
  }

  return true;
}

export function hasVoted(proposalId: number, userId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM votes WHERE proposal_id = ? AND user_id = ?")
    .get(proposalId, userId);
  return !!row;
}

export function closeProposal(id: number, status: "passed" | "failed" | "expired"): void {
  getDb()
    .prepare("UPDATE proposals SET status = ? WHERE id = ?")
    .run(status, id);
}
