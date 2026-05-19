import type { TokenMintEvent, TradeEvent, WatchedToken } from './types'

const WATCHLIST_CAP = 150
const WINDOW_MS = 10 * 60 * 1000
const BUY_WINDOW_MS = 5 * 60 * 1000

const MIN_BUYS = 10
const MIN_BUY_PRESSURE = 0.70
const MIN_BUY_PRESSURE_MIN_TRADES = 5
const MIN_SOL_VOL = 3

const watchlist = new Map<string, WatchedToken>()

setInterval(() => cleanExpired(), 60_000)

export function addToWatchlist(token: TokenMintEvent): boolean {
  if (watchlist.size >= WATCHLIST_CAP) return false
  if (watchlist.has(token.mint)) return false
  watchlist.set(token.mint, {
    token,
    addedAt: Date.now(),
    firstBuyAt: null,
    buys: 0,
    sells: 0,
    totalSolVolume: 0,
    alerted: false,
  })
  return true
}

export function handleTrade(trade: TradeEvent): WatchedToken | null {
  const entry = watchlist.get(trade.mint)
  if (!entry || entry.alerted) return null

  if (trade.txType === 'buy') {
    if (entry.buys === 0) entry.firstBuyAt = Date.now()
    entry.buys++
  } else {
    entry.sells++
  }
  entry.totalSolVolume += trade.solAmount

  const totalTrades = entry.buys + entry.sells
  const buyPressure = totalTrades > 0 ? entry.buys / totalTrades : 0
  const buyWindowOk = entry.firstBuyAt !== null && (Date.now() - entry.firstBuyAt) <= BUY_WINDOW_MS

  const triggered =
    (entry.buys >= MIN_BUYS && buyWindowOk) ||
    (buyPressure >= MIN_BUY_PRESSURE && totalTrades >= MIN_BUY_PRESSURE_MIN_TRADES) ||
    entry.totalSolVolume >= MIN_SOL_VOL

  if (triggered) {
    entry.alerted = true
    return entry
  }

  return null
}

export function cleanExpired(): number {
  const cutoff = Date.now() - WINDOW_MS
  let removed = 0
  for (const [mint, entry] of watchlist) {
    if (entry.addedAt < cutoff) {
      watchlist.delete(mint)
      removed++
    }
  }
  return removed
}

export function watchlistSize(): number {
  return watchlist.size
}

export function getWatchedMints(): string[] {
  return Array.from(watchlist.keys())
}
