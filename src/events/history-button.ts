import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getProposalHistory, countProposalHistory } from "../db/queries";
import { buildProposalEmbed } from "../lib/proposal-embed";

const PAGE_SIZE = 5;

export async function handleHistoryButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const parts = interaction.customId.split("_");
  const direction = parts[1] as "prev" | "next";
  const currentPage = parseInt(parts[2], 10);
  const newPage = direction === "next" ? currentPage + 1 : currentPage - 1;

  const total = countProposalHistory(interaction.guildId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const proposals = getProposalHistory(interaction.guildId, (newPage - 1) * PAGE_SIZE, PAGE_SIZE);

  const embeds = proposals.map((p) => buildProposalEmbed(p));
  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`history_prev_${newPage}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(newPage <= 1),
    new ButtonBuilder()
      .setCustomId(`history_next_${newPage}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(newPage >= totalPages)
  );

  const header = new EmbedBuilder()
    .setTitle("Vote History")
    .setDescription(`Page ${newPage} of ${totalPages} — ${total} total proposals`)
    .setColor(0xa879ff);

  await interaction.update({ embeds: [header, ...embeds], components: [nav] });
}
