import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../lib/types";
import { getGuildConfig, createProposal, setProposalMessageId } from "../../db/queries";
import { buildProposalEmbed, buildVoteButtons } from "../../lib/proposal-embed";
import { logger } from "../../lib/logger";

export const propose: Command = {
  data: new SlashCommandBuilder()
    .setName("propose")
    .setDescription("Propose a moderation action for community vote")
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Propose banning a user")
        .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Propose kicking a user")
        .addUserOption((o) => o.setName("user").setDescription("User to kick").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("mute")
        .setDescription("Propose muting a user")
        .addUserOption((o) => o.setName("user").setDescription("User to mute").setRequired(true))
        .addStringOption((o) =>
          o.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(true)
        )
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the mute"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("role")
        .setDescription("Propose adding or removing a role from a user")
        .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role to add/remove").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("Add or remove the role")
            .setRequired(true)
            .addChoices({ name: "add", value: "add" }, { name: "remove", value: "remove" })
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Propose creating or deleting a channel")
        .addStringOption((o) =>
          o.setName("name").setDescription("Channel name").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("Create or delete")
            .setRequired(true)
            .addChoices({ name: "create", value: "create" }, { name: "delete", value: "delete" })
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("custom")
        .setDescription("Propose a freeform community vote")
        .addStringOption((o) => o.setName("title").setDescription("Vote title").setRequired(true))
        .addStringOption((o) =>
          o.setName("description").setDescription("Vote description").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const config = getGuildConfig(interaction.guildId);
    let payload: object;

    switch (sub) {
      case "ban": {
        const user = interaction.options.getUser("user", true);
        payload = { userId: user.id, username: user.username, reason: interaction.options.getString("reason") };
        break;
      }
      case "kick": {
        const user = interaction.options.getUser("user", true);
        payload = { userId: user.id, username: user.username, reason: interaction.options.getString("reason") };
        break;
      }
      case "mute": {
        const user = interaction.options.getUser("user", true);
        payload = {
          userId: user.id,
          username: user.username,
          duration: interaction.options.getString("duration", true),
          reason: interaction.options.getString("reason"),
        };
        break;
      }
      case "role": {
        const user = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        payload = {
          userId: user.id,
          username: user.username,
          roleId: role.id,
          roleName: role.name,
          action: interaction.options.getString("action", true),
        };
        break;
      }
      case "channel": {
        payload = {
          channelName: interaction.options.getString("name", true),
          action: interaction.options.getString("action", true),
        };
        break;
      }
      case "custom": {
        payload = {
          title: interaction.options.getString("title", true),
          description: interaction.options.getString("description", true),
        };
        break;
      }
      default:
        await interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
        return;
    }

    const proposal = createProposal({
      guild_id: interaction.guildId,
      channel_id: interaction.channelId,
      proposer_id: interaction.user.id,
      action_type: sub,
      payload,
      duration_mins: config.duration_mins,
    });

    const embed = buildProposalEmbed(proposal);
    const row = buildVoteButtons(proposal.id);

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    setProposalMessageId(proposal.id, msg.id);
    logger.info(`Proposal #${proposal.id} (${sub}) created in guild ${interaction.guildId} by ${interaction.user.id}`);
  },
};
