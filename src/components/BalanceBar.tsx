'use client'

import { GameState } from '@/types/game'
import { formatCurrency } from '@/lib/utils'

interface BalanceBarProps {
  gameState: GameState
}

export default function BalanceBar({ gameState }: BalanceBarProps) {
  return (
    <div className={`bg-white border-b ${!gameState.isBalanced ? 'border-red-500' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-xs sm:text-sm text-gray-600">Total In</div>
            <div className="text-base sm:text-xl font-bold text-green-600">
              {formatCurrency(gameState.totalIn)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">Total Out</div>
            <div className="text-base sm:text-xl font-bold text-blue-600">
              {formatCurrency(gameState.totalOut)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">
              {gameState.isBalanced ? 'Balance' : gameState.balance > 0 ? 'On Table' : 'Over Paid'}
            </div>
            <div className={`text-base sm:text-xl font-bold ${gameState.isBalanced ? 'text-gray-900' : 'text-red-600'}`}>
              {gameState.isBalanced ? '✓ Balanced' : formatCurrency(Math.abs(gameState.balance))}
            </div>
          </div>
        </div>
        {!gameState.isBalanced && Math.abs(gameState.balance) > 0.01 && (
          <div className="mt-2 text-center">
            <p className="text-xs sm:text-sm text-red-600">
              ⚠️ Pot is not balanced. {gameState.balance > 0 ? 'Missing cash outs' : 'Cash outs exceed buy-ins'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
