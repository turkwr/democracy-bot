import { Client, Guild } from "discord.js";
import type { Proposal } from "../db/queries";
import type { ProposalPayload } from "./proposal-embed";
import { logger } from "./logger";

export async function executeAction(client: Client, proposal: Proposal): Promise<void> {
  const guild = await client.guilds.fetch(proposal.guild_id).catch(() => null);
  if (!guild) {
    logger.warn(`Guild ${proposal.guild_id} not found — skipping action execution`);
    return;
  }

  const payload: ProposalPayload = JSON.parse(proposal.payload);

  try {
    switch (proposal.action_type) {
      case "ban":
        await executeBan(guild, payload);
        break;
      case "kick":
        await executeKick(guild, payload);
        break;
      case "mute":
        await executeMute(guild, payload);
        break;
      case "role":
        await executeRole(guild, payload);
        break;
      case "channel":
        await executeChannel(guild, payload);
        break;
      case "custom":
        logger.info(`Custom proposal #${proposal.id} passed — no action to execute`);
        break;
    }
  } catch (err) {
    if (isPermissionError(err)) {
      logger.warn(`Bot lacks permission to execute action for proposal #${proposal.id}`);
    } else {
      logger.error(`Failed to execute action for proposal #${proposal.id}`, err as Error);
    }
  }
}

async function executeBan(guild: Guild, payload: ProposalPayload): Promise<void> {
  await guild.members.ban(payload.userId!, { reason: payload.reason ?? "Community vote passed" });
  logger.success(`Banned user ${payload.userId} in guild ${guild.id}`);
}

async function executeKick(guild: Guild, payload: ProposalPayload): Promise<void> {
  const member = await guild.members.fetch(payload.userId!).catch(() => null);
  if (!member) {
    logger.warn(`Member ${payload.userId} not found for kick in guild ${guild.id}`);
    return;
  }
  await member.kick(payload.reason ?? "Community vote passed");
  logger.success(`Kicked user ${payload.userId} in guild ${guild.id}`);
}

async function executeMute(guild: Guild, payload: ProposalPayload): Promise<void> {
  const member = await guild.members.fetch(payload.userId!).catch(() => null);
  if (!member) {
    logger.warn(`Member ${payload.userId} not found for mute in guild ${guild.id}`);
    return;
  }

  const durationMs = parseDuration(payload.duration ?? "10m");
  await member.timeout(durationMs, payload.reason ?? "Community vote passed");
  logger.success(`Muted user ${payload.userId} for ${payload.duration} in guild ${guild.id}`);
}

async function executeRole(guild: Guild, payload: ProposalPayload): Promise<void> {
  const member = await guild.members.fetch(payload.userId!).catch(() => null);
  if (!member) {
    logger.warn(`Member ${payload.userId} not found for role action in guild ${guild.id}`);
    return;
  }

  if (payload.action === "add") {
    await member.roles.add(payload.roleId!, "Community vote passed");
    logger.success(`Added role ${payload.roleId} to user ${payload.userId} in guild ${guild.id}`);
  } else {
    await member.roles.remove(payload.roleId!, "Community vote passed");
    logger.success(`Removed role ${payload.roleId} from user ${payload.userId} in guild ${guild.id}`);
  }
}

async function executeChannel(guild: Guild, payload: ProposalPayload): Promise<void> {
  if (payload.action === "create") {
    await guild.channels.create({ name: payload.channelName! });
    logger.success(`Created channel ${payload.channelName} in guild ${guild.id}`);
  } else {
    const channel = guild.channels.cache.find(
      (c) => c.name === payload.channelName
    );
    if (!channel) {
      logger.warn(`Channel ${payload.channelName} not found for deletion in guild ${guild.id}`);
      return;
    }
    await channel.delete("Community vote passed");
    logger.success(`Deleted channel ${payload.channelName} in guild ${guild.id}`);
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 10 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * multipliers[unit];
}

function isPermissionError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes("Missing Permissions") || err.message.includes("403");
  }
  return false;
}
