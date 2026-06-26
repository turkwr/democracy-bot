import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { Command } from "../../lib/types";
import {
  getActiveProposals,
  getProposalHistory,
  countProposalHistory,
} from "../../db/queries";
import { buildProposalEmbed } from "../../lib/proposal-embed";

const PAGE_SIZE = 5;

export const vote: Command = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("View proposals")
    .addSubcommand((sub) =>
      sub.setName("active").setDescription("List all currently open proposals")
    )
    .addSubcommand((sub) =>
      sub
        .setName("history")
        .setDescription("Browse past proposals")
        .addIntegerOption((o) =>
          o.setName("page").setDescription("Page number (default 1)").setMinValue(1)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "active") {
      const proposals = getActiveProposals(interaction.guildId);

      if (proposals.length === 0) {
        await interaction.reply({ content: "No proposals are currently open.", ephemeral: true });
        return;
      }

      const embeds = proposals.slice(0, 10).map((p) => buildProposalEmbed(p));
      await interaction.reply({ embeds, ephemeral: true });
      return;
    }

    if (sub === "history") {
      const page = (interaction.options.getInteger("page") ?? 1) - 1;
      const total = countProposalHistory(interaction.guildId);
      const proposals = getProposalHistory(interaction.guildId, page * PAGE_SIZE, PAGE_SIZE);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const currentPage = page + 1;

      if (proposals.length === 0) {
        await interaction.reply({ content: "No proposal history yet.", ephemeral: true });
        return;
      }

      const embeds = proposals.map((p) => buildProposalEmbed(p));
      const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`history_prev_${currentPage}`)
          .setLabel("Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage <= 1),
        new ButtonBuilder()
          .setCustomId(`history_next_${currentPage}`)
          .setLabel("Next")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages)
      );

      const header = new EmbedBuilder()
        .setTitle("Vote History")
        .setDescription(`Page ${currentPage} of ${totalPages} — ${total} total proposals`)
        .setColor(0xa879ff);

      await interaction.reply({ embeds: [header, ...embeds], components: [nav], ephemeral: true });
    }
  },
};
