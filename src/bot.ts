import { Bot } from 'grammy'
import type { WatchedToken } from './types'
import { getSolPrice } from './priceService'

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

  const price = getSolPrice()
  const marketCapUsd = price > 0
    ? ` (~$${(token.marketCapSol * price).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
    : ''

  const shortUri = token.uri ? token.uri.slice(0, 30) + '...' : null
  const metaLine = shortUri
    ? `\n📄 <a href="${token.uri}">Metadata</a> <code>${shortUri}</code>\n`
    : '\n'

  const text = [
    `🔥 <b>Momentum Alert — $${token.symbol}</b>`,
    ``,
    `<b>Name:</b> ${token.name}`,
    `<b>Mint:</b> <code>${token.mint}</code>`,
    `<b>Market Cap:</b> ${token.marketCapSol.toFixed(2)} SOL${marketCapUsd}`,
    ``,
    `<b>Trigger:</b> ${triggerReason}`,
    `<b>Buys:</b> ${watched.buys}  |  <b>Sells:</b> ${watched.sells}`,
    `<b>Vol:</b> ${watched.totalSolVolume.toFixed(3)} SOL`,
    metaLine,
    `<a href="https://pump.fun/${token.mint}">🚀 View on pump.fun</a>`,
  ].join('\n')

  await bot.api.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    // @ts-ignore — grammy type for link_preview_options
    link_preview_options: { is_disabled: true },
  })
}
