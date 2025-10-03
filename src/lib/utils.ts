import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Game, Player, BuyIn } from "@/types/game"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function exportToCSV(game: Game): string {
  const lines = ['Player,Buy-ins,Cash Out,Profit/Loss']

  game.players.forEach((player: Player) => {
    const totalBuyIns = player.buyIns.reduce((sum: number, buyIn: BuyIn) => sum + buyIn.amount, 0)
    const cashOut = player.cashOut || 0
    const profitLoss = cashOut - totalBuyIns
    lines.push(`${player.name},${totalBuyIns},${cashOut},${profitLoss}`)
  })

  return lines.join('\n')
}