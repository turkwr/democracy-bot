import "dotenv/config";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import type { BotClient, Command } from "./lib/types";
import { logger } from "./lib/logger";
import { initDb } from "./db/schema";
import { propose } from "./commands/propose";
import { vote } from "./commands/vote";
import { setup } from "./commands/setup";
import { registerReadyEvent } from "./events/ready";
import { registerInteractionEvent } from "./events/interaction";
import { startExpireJob } from "./jobs/expire-proposals";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.fatal("DISCORD_TOKEN is not set in environment", new Error("Missing DISCORD_TOKEN"));
  process.exit(1);
}

logger.banner({ tag: "democracy-bot", meta: "v1.0.0" });

try {
  initDb();
} catch (err) {
  logger.fatal("Failed to initialize database", err as Error);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as BotClient;

client.commands = new Collection<string, Command>();

const commands: Command[] = [propose, vote, setup];
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

registerReadyEvent(client);
registerInteractionEvent(client);

client.once("ready", () => {
  startExpireJob(client);
});

client.login(token).catch((err: Error) => {
  logger.fatal("Failed to log in to Discord", err);
  process.exit(1);
});
