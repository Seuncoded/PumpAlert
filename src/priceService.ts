import { logInfo } from './logger'

const PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
const REFRESH_MS = 5 * 60 * 1000

let solPrice = 0

async function fetchPrice(): Promise<void> {
  try {
    const res = await fetch(PRICE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { solana: { usd: number } }
    solPrice = data.solana.usd
    logInfo(`💲 SOL price updated: $${solPrice}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logInfo(`⚠️  SOL price fetch failed (keeping $${solPrice}): ${msg}`)
  }
}

export async function initPriceService(): Promise<void> {
  await fetchPrice()
  setInterval(fetchPrice, REFRESH_MS)
}

export function getSolPrice(): number {
  return solPrice
}
