'use client'

import { useTranslations } from 'next-intl'
import { GameState } from '@/types/game'
import { formatCurrency } from '@/lib/utils'

interface BalanceBarProps {
  gameState: GameState
}

export default function BalanceBar({ gameState }: BalanceBarProps) {
  const t = useTranslations('game')
  return (
    <div className={`bg-white border-b ${!gameState.isBalanced ? 'border-red-500' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-xs sm:text-sm text-gray-600">{t('totalIn')}</div>
            <div className="text-base sm:text-xl font-bold text-green-600">
              {formatCurrency(gameState.totalIn)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">{t('totalOut')}</div>
            <div className="text-base sm:text-xl font-bold text-blue-600">
              {formatCurrency(gameState.totalOut)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">
              {gameState.isBalanced ? t('balance') : gameState.balance > 0 ? t('onTable') : t('overPaid')}
            </div>
            <div className={`text-base sm:text-xl font-bold ${gameState.isBalanced ? 'text-gray-900' : 'text-red-600'}`}>
              {gameState.isBalanced ? t('balanced') : formatCurrency(Math.abs(gameState.balance))}
            </div>
          </div>
        </div>
        {!gameState.isBalanced && Math.abs(gameState.balance) > 0.01 && (
          <div className="mt-2 text-center">
            <p className="text-xs sm:text-sm text-red-600">
              ⚠️ {t('potNotBalanced')} {gameState.balance > 0 ? t('missingCashOuts') : t('cashOutsExceed')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}