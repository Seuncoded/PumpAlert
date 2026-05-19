import WebSocket from 'ws'
import { addToWatchlist, handleTrade, getWatchedMints, watchlistSize } from './monitor'
import { sendMomentumAlert } from './bot'
import { logConnect, logReconnect, logPass, logDrop, logAlert, logInfo } from './logger'
import type { TokenMintEvent, TradeEvent } from './types'

const WS_URL = 'wss://pumpportal.fun/api/data'

let ws: WebSocket | null = null
let reconnectAttempt = 0
let intentionalClose = false

function buildTriggerReason(entry: { buys: number; sells: number; totalSolVolume: number; addedAt: number }): string {
  const totalTrades = entry.buys + entry.sells
  const buyPressure = totalTrades > 0 ? Math.round((entry.buys / totalTrades) * 100) : 0
  const elapsed = Math.round((Date.now() - entry.addedAt) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  return `${entry.buys} buys in ${timeStr} | ${buyPressure}% buy pressure | ${entry.totalSolVolume.toFixed(2)} SOL vol`
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

function subscribe(socket: WebSocket, method: string, keys?: string[]): void {
  const payload: Record<string, unknown> = { method }
  if (keys) payload.keys = keys
  const msg = JSON.stringify(payload)
  console.log('Sending subscription:', msg)
  socket.send(msg)
}

function connect(): void {
  ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    reconnectAttempt = 0
    logConnect()
    subscribe(ws!, 'subscribeNewToken')

    const mints = getWatchedMints()
    if (mints.length > 0) {
      logInfo(`Resubscribing to ${mints.length} watched token(s)`)
      for (const mint of mints) {
        subscribe(ws!, 'subscribeTokenTrade', [mint])
      }
    }

    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      console.log('💓 WS alive, waiting for events...')
    }, 30_000)
  })

  ws.on('message', (data: WebSocket.RawData) => {
    console.log('RAW:', data.toString().slice(0, 200))
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(data.toString())
    } catch {
      return
    }

    if (parsed.txType !== undefined) {
      // Trade event
      const trade = parsed as unknown as TradeEvent
      const triggered = handleTrade(trade)
      if (triggered) {
        const reason = buildTriggerReason(triggered)
        sendMomentumAlert(triggered, reason).catch(() => {})
        logAlert(triggered.token.name, triggered.token.mint)
        subscribe(ws!, 'unsubscribeTokenTrade', [trade.mint])
      }
    } else if (parsed.mint !== undefined) {
      // New token event
      const token = parsed as unknown as TokenMintEvent
      const name = token.name ?? 'Unknown'
      const descOk = typeof token.description === 'string' && token.description.length > 20
      const hasSocial = !!(token.twitter || token.telegram)

      if (!descOk) { logDrop(name, 'description too short'); return }
      if (!hasSocial) { logDrop(name, 'no Twitter or Telegram'); return }

      const added = addToWatchlist(token)
      if (!added) {
        if (watchlistSize() >= 150) {
          logDrop(name, 'watchlist cap reached')
        }
        return
      }

      const slot = watchlistSize()
      logPass(name, token.mint, slot)
      subscribe(ws!, 'subscribeTokenTrade', [token.mint])
    }
  })

  ws.on('close', () => {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (intentionalClose) return
    scheduleReconnect()
  })

  ws.on('error', (err: Error) => {
    logInfo(`WebSocket error: ${err.message}`)
  })
}

function scheduleReconnect(): void {
  const BASE = 2
  const MAX = 30
  const delay = Math.min(BASE * Math.pow(2, reconnectAttempt), MAX)
  reconnectAttempt++
  logReconnect(reconnectAttempt, delay)
  setTimeout(connect, delay * 1000)
}

export function startWatcher(): void {
  intentionalClose = false
  connect()
}

export function stopWatcher(): void {
  intentionalClose = true
  ws?.close()
}
