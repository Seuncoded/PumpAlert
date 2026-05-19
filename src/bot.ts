import { Bot } from 'grammy'
import type { WatchedToken } from './types'

let bot: Bot

export function initBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN!
  bot = new Bot(token)
  return bot
}

export async function sendStartupMessage(): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID!
  await bot.api.sendMessage(chatId, '✅ PumpAlert is live. Monitoring pump.fun for momentum signals...')
}

export async function sendMomentumAlert(watched: WatchedToken, triggerReason: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID!
  const { token } = watched

  const socials: string[] = []
  if (token.twitter) socials.push(`🐦 <a href="${token.twitter}">Twitter</a>`)
  if (token.telegram) socials.push(`✈️ <a href="${token.telegram}">Telegram</a>`)
  if (token.website) socials.push(`🌐 <a href="${token.website}">Website</a>`)

  const socialsLine = socials.length > 0 ? `\n${socials.join('  |  ')}\n` : '\n'

  const text = [
    `🔥 <b>Momentum Alert — $${token.symbol}</b>`,
    ``,
    `<b>Name:</b> ${token.name}`,
    `<b>Mint:</b> <code>${token.mint}</code>`,
    ``,
    `<b>Trigger:</b> ${triggerReason}`,
    `<b>Buys:</b> ${watched.buys}  |  <b>Sells:</b> ${watched.sells}`,
    `<b>Vol:</b> ${watched.totalSolVolume.toFixed(3)} SOL`,
    socialsLine,
    `<a href="https://pump.fun/${token.mint}">🚀 View on pump.fun</a>`,
  ].join('\n')

  await bot.api.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    // @ts-ignore — grammy type for link_preview_options
    link_preview_options: { is_disabled: true },
  })
}
