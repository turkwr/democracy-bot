# democracy-bot

Every mod action goes to a vote. Ban, kick, mute, or create channels — only if the community says yes.

No moderation action executes immediately. Every action is proposed, voted on by the community, and only auto-executed if the configured threshold is reached before the deadline.

---

## Features

### Proposal commands (`/propose`)

| Command | Description |
|---|---|
| `/propose ban [user] [reason]` | Propose banning a user |
| `/propose kick [user] [reason]` | Propose kicking a user |
| `/propose mute [user] [duration] [reason]` | Propose timing out a user (e.g. `10m`, `1h`, `1d`) |
| `/propose role [user] [role] [add\|remove]` | Propose adding or removing a role |
| `/propose channel [name] [create\|delete]` | Propose creating or deleting a channel |
| `/propose custom [title] [description]` | Freeform community vote — no automatic execution |

### Vote commands (`/vote`)

| Command | Description |
|---|---|
| `/vote active` | List all currently open proposals with live vote counts |
| `/vote history [page]` | Paginated history of closed proposals and their outcomes |

### Setup commands (`/setup`) — requires Manage Server

| Command | Description |
|---|---|
| `/setup threshold [percent]` | Pass percentage required for a vote to succeed (default: 60%) |
| `/setup duration [minutes]` | How long a vote stays open (default: 60 minutes) |
| `/setup voters [role]` | Restrict voting to a specific role; omit to allow everyone |

---

## Requirements

- **Node.js** 18 or later
- A Discord application with a bot token
- Bot permissions required in the server:
  - `Ban Members`
  - `Kick Members`
  - `Moderate Members` (for timeouts)
  - `Manage Roles`
  - `Manage Channels`
  - `Send Messages`
  - `Read Message History`
  - `Use Application Commands`

---

## Installation

**1. Clone the repository**

```
git clone https://github.com/turkwr/democracy-bot.git
cd democracy-bot
```

**2. Install dependencies**

```
npm install
```

**3. Configure environment variables**

Copy `.env.example` to `.env` and fill in your values:

```
cp .env.example .env
```

**4. Deploy slash commands**

For guild-scoped commands (instant, recommended during development):

```
npm run deploy
```

For global commands (may take up to 1 hour to propagate):

Unset `GUILD_ID` in your `.env`, then run `npm run deploy`.

**5. Start the bot**

```
npm run build && npm start
```

Or run in development mode without building:

```
npm run dev
```

---

## Environment variables

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_guild_id_for_dev_deploy
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Your bot's token from the Discord developer portal |
| `CLIENT_ID` | Yes | Your application's client ID |
| `GUILD_ID` | No | Guild ID for instant command deployment during development |

---

## How voting works

1. A server member runs `/propose <action>` with the relevant options.
2. The bot posts an embed in the channel with the proposed action and Yes / No buttons.
3. Eligible members vote by clicking the buttons. Each member gets one vote per proposal.
4. The vote closes when:
   - The configured duration expires (checked every minute by the scheduler), or
   - The outcome becomes mathematically determined before the deadline.
5. If the percentage of Yes votes meets or exceeds the configured threshold, the proposal **passes** and the bot executes the action immediately using its own permissions.
6. If the vote fails or expires, the embed updates to reflect the outcome and no action is taken.
7. All proposals and vote records are stored locally in SQLite (`data/democracy.db`).

---

## License

MIT
