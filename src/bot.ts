import { Bot } from 'grammy'
import type { WatchedToken } from './types'
import { getSolPrice } from './priceService'
import { logInfo } from './logger'

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

function resolveIpfs(url: string): string {
  if (url.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + url.slice(7)
  }
  return url
}

async function fetchImageUrl(uri: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(resolveIpfs(uri), { signal: controller.signal })
    if (!res.ok) return null
    const meta = await res.json() as Record<string, unknown>
    const raw = (meta.image ?? meta.image_uri ?? null) as string | null
    return raw ? resolveIpfs(raw) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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

  // Telegram caption limit is 1024 chars
  const caption = text.length <= 1024 ? text : text.slice(0, 1021) + '...'

  let imageUrl: string | null = null
  if (token.uri) {
    imageUrl = await fetchImageUrl(token.uri)
  }

  if (imageUrl) {
    await bot.api.sendPhoto(chatId, imageUrl, {
      caption,
      parse_mode: 'HTML',
    })
  } else {
    if (token.uri) {
      logInfo(`⚠️ Could not fetch image for ${token.symbol}, sending text alert`)
    }
    await bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      // @ts-ignore — grammy type for link_preview_options
      link_preview_options: { is_disabled: true },
    })
  }
}
