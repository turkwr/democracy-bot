import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../lib/types";
import { setGuildThreshold, setGuildDuration, setGuildVoterRole, getGuildConfig } from "../../db/queries";
import { logger } from "../../lib/logger";

export const setup: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure the democracy bot for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("threshold")
        .setDescription("Set the pass percentage required for a vote to succeed (default: 60%)")
        .addIntegerOption((o) =>
          o
            .setName("percent")
            .setDescription("Percentage (1–100)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("duration")
        .setDescription("Set how long votes stay open in minutes (default: 60)")
        .addIntegerOption((o) =>
          o
            .setName("minutes")
            .setDescription("Minutes (1–10080)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("voters")
        .setDescription("Restrict voting to a specific role (leave empty to allow everyone)")
        .addRoleOption((o) => o.setName("role").setDescription("Role allowed to vote (omit to clear restriction)"))
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "threshold") {
      const percent = interaction.options.getInteger("percent", true);
      setGuildThreshold(interaction.guildId, percent);
      logger.info(`Guild ${interaction.guildId} threshold set to ${percent}% by ${interaction.user.id}`);
      await interaction.reply({ content: `Vote pass threshold set to **${percent}%**.`, ephemeral: true });
      return;
    }

    if (sub === "duration") {
      const minutes = interaction.options.getInteger("minutes", true);
      setGuildDuration(interaction.guildId, minutes);
      logger.info(`Guild ${interaction.guildId} duration set to ${minutes}m by ${interaction.user.id}`);
      await interaction.reply({ content: `Vote duration set to **${minutes} minutes**.`, ephemeral: true });
      return;
    }

    if (sub === "voters") {
      const role = interaction.options.getRole("role");
      setGuildVoterRole(interaction.guildId, role?.id ?? null);
      if (role) {
        logger.info(`Guild ${interaction.guildId} voter role set to ${role.id} by ${interaction.user.id}`);
        await interaction.reply({ content: `Voting is now restricted to members with the **${role.name}** role.`, ephemeral: true });
      } else {
        logger.info(`Guild ${interaction.guildId} voter role cleared by ${interaction.user.id}`);
        await interaction.reply({ content: "Voter role restriction cleared — anyone can vote.", ephemeral: true });
      }
    }
  },
};
