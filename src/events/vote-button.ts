import { ButtonInteraction, Client, GuildMember } from "discord.js";
import {
  getProposal,
  getGuildConfig,
  castVote,
  hasVoted,
  closeProposal,
} from "../db/queries";
import { buildProposalEmbed, buildVoteButtons } from "../lib/proposal-embed";
import { executeAction } from "../lib/execute-action";
import { logger } from "../lib/logger";

export async function handleVoteButton(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const parts = interaction.customId.split("_");
  const choice = parts[1] as "yes" | "no";
  const proposalId = parseInt(parts[2], 10);

  const proposal = getProposal(proposalId);
  if (!proposal || proposal.status !== "open") {
    await interaction.reply({ content: "This proposal is no longer open.", ephemeral: true });
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({ content: "Cannot vote outside of a server.", ephemeral: true });
    return;
  }

  const config = getGuildConfig(interaction.guildId);

  if (config.voter_role_id) {
    const member = interaction.member as GuildMember | null;
    if (!member?.roles.cache.has(config.voter_role_id)) {
      await interaction.reply({
        content: `You must have the <@&${config.voter_role_id}> role to vote.`,
        ephemeral: true,
      });
      return;
    }
  }

  if (hasVoted(proposalId, interaction.user.id)) {
    await interaction.reply({ content: "You have already voted on this proposal.", ephemeral: true });
    return;
  }

  castVote(proposalId, interaction.user.id, choice);
  logger.event(`User ${interaction.user.id} voted ${choice} on proposal #${proposalId}`);

  const updated = getProposal(proposalId)!;
  const total = updated.yes_count + updated.no_count;
  const yesPercent = total > 0 ? (updated.yes_count / total) * 100 : 0;

  const nowMs = Date.now();
  const isExpired = nowMs >= updated.closes_at * 1000;

  if (isExpired || yesPercent >= config.threshold || (total > 0 && updated.no_count / total * 100 > 100 - config.threshold)) {
    const passed = yesPercent >= config.threshold;
    const newStatus = passed ? "passed" : "failed";
    closeProposal(proposalId, newStatus);
    logger.event(`Proposal #${proposalId} closed as ${newStatus} (${yesPercent.toFixed(1)}% yes)`);

    const closedProposal = getProposal(proposalId)!;
    const embed = buildProposalEmbed(closedProposal, true);
    const disabledRow = buildVoteButtons(proposalId, true);

    await interaction.update({ embeds: [embed], components: [disabledRow] });

    if (passed) {
      await executeAction(client, closedProposal);
    }
    return;
  }

  const embed = buildProposalEmbed(updated);
  const row = buildVoteButtons(proposalId);
  await interaction.update({ embeds: [embed], components: [row] });
  await interaction.followUp({ content: `Your vote (${choice}) has been recorded.`, ephemeral: true });
}
