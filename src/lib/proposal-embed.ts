import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import type { Proposal } from "../db/queries";

export type ProposalPayload = {
  userId?: string;
  username?: string;
  reason?: string;
  duration?: string;
  roleId?: string;
  roleName?: string;
  action?: string;
  channelName?: string;
  title?: string;
  description?: string;
};

const ACTION_LABELS: Record<string, string> = {
  ban: "Ban User",
  kick: "Kick User",
  mute: "Mute User",
  role: "Modify Role",
  channel: "Modify Channel",
  custom: "Community Vote",
};

export function buildProposalEmbed(proposal: Proposal, closingNow = false): EmbedBuilder {
  const payload: ProposalPayload = JSON.parse(proposal.payload);
  const total = proposal.yes_count + proposal.no_count;
  const yesPercent = total > 0 ? Math.round((proposal.yes_count / total) * 100) : 0;

  let description = buildDescription(proposal.action_type, payload);
  const statusLine = buildStatusLine(proposal, closingNow);

  let color: number;
  if (proposal.status === "open") {
    color = 0xa879ff;
  } else if (proposal.status === "passed") {
    color = Colors.Green;
  } else {
    color = Colors.Red;
  }

  return new EmbedBuilder()
    .setTitle(ACTION_LABELS[proposal.action_type] ?? "Proposal")
    .setDescription(description)
    .addFields(
      { name: "Votes", value: `Yes: **${proposal.yes_count}** | No: **${proposal.no_count}**${total > 0 ? ` (${yesPercent}% yes)` : ""}`, inline: false },
      { name: "Status", value: statusLine, inline: false }
    )
    .setFooter({ text: `Proposal #${proposal.id}` })
    .setTimestamp()
    .setColor(color);
}

function buildDescription(actionType: string, payload: ProposalPayload): string {
  switch (actionType) {
    case "ban":
      return `**Target:** <@${payload.userId}>\n**Reason:** ${payload.reason ?? "No reason provided"}`;
    case "kick":
      return `**Target:** <@${payload.userId}>\n**Reason:** ${payload.reason ?? "No reason provided"}`;
    case "mute":
      return `**Target:** <@${payload.userId}>\n**Duration:** ${payload.duration}\n**Reason:** ${payload.reason ?? "No reason provided"}`;
    case "role":
      return `**Target:** <@${payload.userId}>\n**Role:** <@&${payload.roleId}> (${payload.roleName})\n**Action:** ${payload.action}`;
    case "channel":
      return `**Channel:** ${payload.channelName}\n**Action:** ${payload.action}`;
    case "custom":
      return `**${payload.title}**\n${payload.description}`;
    default:
      return "No details available.";
  }
}

function buildStatusLine(proposal: Proposal, closingNow: boolean): string {
  if (closingNow || proposal.status !== "open") {
    if (proposal.status === "passed") return "Passed — action executed.";
    if (proposal.status === "failed") return "Failed — not enough votes.";
    if (proposal.status === "expired") return "Expired — no votes cast.";
    return "Closed.";
  }
  return `Closes <t:${proposal.closes_at}:R>`;
}

export function buildVoteButtons(proposalId: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vote_yes_${proposalId}`)
      .setLabel("Yes")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`vote_no_${proposalId}`)
      .setLabel("No")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}
