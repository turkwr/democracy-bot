import { createLogger } from "@turkwr/logger";

export const logger = createLogger({
  gradient: { from: "#a879ff", to: "#ffffff" },
  file: { enabled: true, dir: "logs", prefix: "democracy-bot", minLevel: "info" },
  console: { minLevel: "debug" },
});
