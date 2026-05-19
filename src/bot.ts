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

function buildTriggerLine(watched: WatchedToken): string {
  const { buys, sells, totalSolVolume, firstBuyAt } = watched
  const totalTrades = buys + sells
  const pressure = totalTrades > 0 ? Math.round((buys / totalTrades) * 100) : 0
  const sellStr = `${sells} ${sells === 1 ? 'sell' : 'sells'}`
  const buyStr = `${buys} ${buys === 1 ? 'buy' : 'buys'}`

  if (buys >= 10 && firstBuyAt !== null) {
    const elapsed = Math.round((Date.now() - firstBuyAt) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    return `⚡ ${buys} buys in ${timeStr} | ${sellStr} | ${pressure}% pressure`
  }

  if (pressure >= 70) {
    return `⚡ ${pressure}% pressure | ${buyStr} | ${sellStr}`
  }

  return `⚡ ${totalSolVolume.toFixed(2)} SOL vol | ${buyStr} | ${sellStr}`
}

function usd(sol: number, price: number): string {
  return (sol * price).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export async function sendMomentumAlert(watched: WatchedToken): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID!
  const { token } = watched

  const price = getSolPrice()
  const mcapUsd = price > 0 ? ` ($${usd(token.marketCapSol, price)})` : ''
  const volUsd  = price > 0 ? ` ($${usd(watched.totalSolVolume, price)})` : ''

  const text = [
    `<b>$${token.symbol} — ${token.name}</b>`,
    `<code>${token.mint}</code>`,
    ``,
    buildTriggerLine(watched),
    ``,
    `💵 Vol: ${volUsd ? volUsd.trim() + ' ' : ''}(${watched.totalSolVolume.toFixed(2)} SOL)`,
    `💰 MCap: ${mcapUsd ? mcapUsd.trim() + ' ' : ''}(${token.marketCapSol.toFixed(2)} SOL)`,
    ``,
    `<a href="https://pump.fun/${token.mint}">🚀 pump.fun</a>  |  <a href="https://dexscreener.com/solana/${token.mint}">DexScreener</a>  |  <a href="https://rugcheck.xyz/tokens/${token.mint}">RugCheck</a>`,
  ].join('\n')

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
