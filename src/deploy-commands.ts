import "dotenv/config";
import { REST, Routes } from "discord.js";
import { propose } from "./commands/propose";
import { vote } from "./commands/vote";
import { setup } from "./commands/setup";
import { logger } from "./lib/logger";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  logger.fatal("DISCORD_TOKEN and CLIENT_ID must be set", new Error("Missing env vars"));
  process.exit(1);
}

const commands = [propose, vote, setup].map((c) => c.data.toJSON());
const rest = new REST().setToken(token);

(async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.success(`Deployed ${commands.length} guild commands to ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.success(`Deployed ${commands.length} global commands`);
    }
  } catch (err) {
    logger.error("Failed to deploy commands", err as Error);
    process.exit(1);
  }
})();
