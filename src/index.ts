import 'dotenv/config'
import { initBot, sendStartupMessage } from './bot'
import { startWatcher, stopWatcher } from './watcher'
import { logInfo } from './logger'

function validateEnv(): void {
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'PUMPPORTAL_API_KEY']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

async function main(): Promise<void> {
  validateEnv()
  initBot()
  await sendStartupMessage()
  startWatcher()

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function shutdown(): void {
  logInfo('Shutting down PumpAlert...')
  stopWatcher()
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal startup error:', err.message)
  process.exit(1)
})
