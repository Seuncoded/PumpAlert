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

function subscribe(socket: WebSocket, method: string, keys?: string[]): void {
  const payload: Record<string, unknown> = { method }
  if (keys) payload.keys = keys
  socket.send(JSON.stringify(payload))
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
  })

  ws.on('message', (data: WebSocket.RawData) => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(data.toString())
    } catch {
      return
    }

    if (parsed.txType === 'create') {
      const token = parsed as unknown as TokenMintEvent
      const name = (token.name ?? '').trim()
      const symbol = (token.symbol ?? '').trim()

      if (!name) { logDrop('(no name)', 'empty name'); return }
      if (!symbol) { logDrop(name, 'empty symbol'); return }
      if (!token.initialBuy || token.initialBuy <= 0) { logDrop(name, 'no initial buy'); return }

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

    } else if (parsed.txType === 'buy' || parsed.txType === 'sell') {
      const trade = parsed as unknown as TradeEvent
      const triggered = handleTrade(trade)
      if (triggered) {
        const reason = buildTriggerReason(triggered)
        sendMomentumAlert(triggered, reason).catch(() => {})
        logAlert(triggered.token.name, triggered.token.mint)
        subscribe(ws!, 'unsubscribeTokenTrade', [trade.mint])
      }

    } else {
      console.log('UNKNOWN MSG:', JSON.stringify(parsed).slice(0, 150))
    }
  })

  ws.on('close', () => {
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
