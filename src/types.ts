export interface TokenMintEvent {
  mint: string
  name: string
  symbol: string
  description: string
  image_uri: string
  twitter: string | null
  telegram: string | null
  website: string | null
  creator: string
  market_cap: number
  virtual_sol_reserves: number
  virtual_token_reserves: number
  created_timestamp: number
}

export interface TradeEvent {
  mint: string
  txType: 'buy' | 'sell'
  solAmount: number
  tokenAmount: number
  trader: string
  timestamp: number
}

export interface WatchedToken {
  token: TokenMintEvent
  addedAt: number
  buys: number
  sells: number
  totalSolVolume: number
  alerted: boolean
}
