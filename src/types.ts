export interface TokenMintEvent {
  signature: string
  mint: string
  traderPublicKey: string
  txType: string
  name: string
  symbol: string
  uri: string
  marketCapSol: number
  initialBuy: number
  vTokensInBondingCurve: number
  vSolInBondingCurve: number
  pool: string
}

export interface TradeEvent {
  signature: string
  mint: string
  traderPublicKey: string
  txType: 'buy' | 'sell'
  solAmount: number
  tokenAmount: number
  bondingCurveKey: string
  vTokensInBondingCurve: number
  vSolInBondingCurve: number
  marketCapSol: number
  name: string
  symbol: string
}

export interface WatchedToken {
  token: TokenMintEvent
  addedAt: number
  firstBuyAt: number | null
  buys: number
  sells: number
  totalSolVolume: number
  alerted: boolean
}
