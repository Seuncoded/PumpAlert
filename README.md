# PumpAlert

PumpAlert monitors pump.fun in real-time and sends Telegram alerts when a newly launched token shows early momentum signals. It filters tokens by social presence, tracks buy pressure and SOL volume within a 10-minute window, and fires a single alert per token when any threshold is crossed.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your values in .env
```

### Environment variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) on Telegram |
| `TELEGRAM_CHAT_ID` | Your chat/channel ID (see below) |

**How to get your TELEGRAM_CHAT_ID:** Message [@userinfobot](https://t.me/userinfobot) on Telegram — it replies with your user ID. For a group or channel, add the bot to it and use the group's ID (starts with `-100`).

## Run

```bash
npm start
```

## Deploy on Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app), create a new project, and connect your GitHub repo
3. Add environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
4. Railway auto-detects `railway.toml` and deploys with `ts-node`

## Momentum thresholds

Any **one** of these triggers an alert:

| Threshold | Value |
|---|---|
| Minimum buys | 10 buys |
| Buy pressure | ≥ 70% buys vs total trades |
| SOL volume | ≥ 3 SOL |

## Watchlist

- **Cap:** 150 tokens tracked simultaneously
- **Window:** 10 minutes — tokens expire after 10 min with no alert
- **Stage 1 filter:** token must have description > 20 chars AND at least one of Twitter / Telegram
