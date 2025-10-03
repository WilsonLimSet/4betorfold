export interface Player {
  id: string
  name: string
  buyIns: BuyIn[]
  cashOut: number | null
  status: 'playing' | 'cashed_out'
}

export interface BuyIn {
  amount: number
  timestamp: number
}

export interface Game {
  id: string
  code: string
  players: Player[]
  createdAt: number
  updatedAt: number
}

export interface GameState {
  totalIn: number
  totalOut: number
  isBalanced: boolean
  balance: number
}