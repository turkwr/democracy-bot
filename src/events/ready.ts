import { Client, Events } from "discord.js";
import { logger } from "../lib/logger";

export function registerReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    logger.info(`Logged in as ${c.user.tag}`);
  });
}
