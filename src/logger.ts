function timestamp(): string {
  return new Date().toISOString().slice(11, 19) + ' UTC'
}

export function logInfo(msg: string): void {
  console.log(`[${timestamp()}] ℹ️  ${msg}`)
}

export function logPass(name: string, mint: string, slot: number): void {
  console.log(`[${timestamp()}] ✅ ${name} (${mint.slice(0, 8)}...) added to watchlist [${slot}/150]`)
}

export function logDrop(name: string, reason: string): void {
  console.log(`[${timestamp()}] 🗑  ${name} dropped — ${reason}`)
}

export function logAlert(name: string, mint: string): void {
  console.log(`[${timestamp()}] 🔥 ALERT fired for ${name} (${mint.slice(0, 8)}...)`)
}

export function logConnect(): void {
  console.log(`[${timestamp()}] 🔌 Connected to PumpPortal`)
}

export function logReconnect(attempt: number, delay: number): void {
  console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay}s (attempt ${attempt})`)
}
