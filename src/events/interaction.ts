import { Client, Events, Interaction } from "discord.js";
import type { BotClient } from "../lib/types";
import { handleVoteButton } from "./vote-button";
import { handleHistoryButton } from "./history-button";
import { logger } from "../lib/logger";

export function registerInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const botClient = client as BotClient;
      const command = botClient.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error(`Error executing command /${interaction.commandName}`, err as Error);
        const msg = { content: "An error occurred while executing that command.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith("vote_yes_") || customId.startsWith("vote_no_")) {
        await handleVoteButton(interaction, client);
        return;
      }

      if (customId.startsWith("history_prev_") || customId.startsWith("history_next_")) {
        await handleHistoryButton(interaction);
        return;
      }
    }
  });
}
