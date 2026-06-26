import { Client, TextChannel } from "discord.js";
import cron from "node-cron";
import { getExpiredProposals, getGuildConfig, closeProposal, getProposal } from "../db/queries";
import { buildProposalEmbed, buildVoteButtons } from "../lib/proposal-embed";
import { executeAction } from "../lib/execute-action";
import { logger } from "../lib/logger";

export function startExpireJob(client: Client): void {
  cron.schedule("* * * * *", async () => {
    logger.debug("Expire job tick");

    const expired = getExpiredProposals();
    if (expired.length === 0) return;

    for (const proposal of expired) {
      const config = getGuildConfig(proposal.guild_id);
      const total = proposal.yes_count + proposal.no_count;

      if (total === 0) {
        closeProposal(proposal.id, "expired");
        logger.warn(`Proposal #${proposal.id} expired with zero votes`);
        logger.event(`Proposal #${proposal.id} closed as expired`);
        await updateProposalMessage(client, proposal.id);
        continue;
      }

      const yesPercent = (proposal.yes_count / total) * 100;
      const passed = yesPercent >= config.threshold;
      const newStatus = passed ? "passed" : "failed";

      closeProposal(proposal.id, newStatus);
      logger.event(`Proposal #${proposal.id} closed as ${newStatus} (${yesPercent.toFixed(1)}% yes)`);

      await updateProposalMessage(client, proposal.id);

      if (passed) {
        const fresh = getProposal(proposal.id)!;
        await executeAction(client, fresh);
      }
    }
  });

  logger.info("Proposal expiry scheduler started");
}

async function updateProposalMessage(client: Client, proposalId: number): Promise<void> {
  const proposal = getProposal(proposalId);
  if (!proposal?.message_id) return;

  try {
    const guild = await client.guilds.fetch(proposal.guild_id).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(proposal.channel_id).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) return;

    const msg = await channel.messages.fetch(proposal.message_id).catch(() => null);
    if (!msg) return;

    const embed = buildProposalEmbed(proposal, true);
    const disabledRow = buildVoteButtons(proposal.id, true);
    await msg.edit({ embeds: [embed], components: [disabledRow] });
  } catch (err) {
    logger.error(`Failed to update message for proposal #${proposalId}`, err as Error);
  }
}
