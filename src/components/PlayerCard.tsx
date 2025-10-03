'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Player } from '@/types/game'
import { formatCurrency } from '@/lib/utils'

interface PlayerCardProps {
  player: Player
  onUpdate: (player: Player) => void
  onRemove: () => void
}

export default function PlayerCard({ player, onUpdate, onRemove }: PlayerCardProps) {
  const t = useTranslations('player')
  const [customAmount, setCustomAmount] = useState('')
  const [cashOutAmount, setCashOutAmount] = useState('')
  const [editingBuyIn, setEditingBuyIn] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const totalBuyIns = player.buyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0)
  const profitLoss = player.cashOut !== null ? player.cashOut - totalBuyIns : null

  const addBuyIn = (amount: number) => {
    onUpdate({
      ...player,
      buyIns: [...player.buyIns, { amount, timestamp: Date.now() }],
    })
  }

  const handleCustomBuyIn = () => {
    const amount = parseFloat(customAmount)
    if (amount > 0) {
      addBuyIn(amount)
      setCustomAmount('')
    }
  }

  const handleCashOut = () => {
    const amount = parseFloat(cashOutAmount)
    if (amount >= 0) {
      onUpdate({
        ...player,
        cashOut: amount,
        status: 'cashed_out',
      })
      setCashOutAmount('')
    }
  }

  const resetPlayer = () => {
    onUpdate({
      ...player,
      cashOut: null,
      status: 'playing',
    })
  }

  const editBuyIn = (index: number, newAmount: number) => {
    const updatedBuyIns = [...player.buyIns]
    updatedBuyIns[index] = { ...updatedBuyIns[index], amount: newAmount }
    onUpdate({
      ...player,
      buyIns: updatedBuyIns,
    })
    setEditingBuyIn(null)
    setEditAmount('')
  }

  const deleteBuyIn = (index: number) => {
    const updatedBuyIns = player.buyIns.filter((_, i) => i !== index)
    onUpdate({
      ...player,
      buyIns: updatedBuyIns,
    })
  }

  const startEditing = (index: number, currentAmount: number) => {
    setEditingBuyIn(index)
    setEditAmount(currentAmount.toString())
  }

  const cancelEditing = () => {
    setEditingBuyIn(null)
    setEditAmount('')
  }

  const handleEditSave = (index: number) => {
    const newAmount = parseFloat(editAmount)
    if (newAmount > 0) {
      editBuyIn(index, newAmount)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-3 sm:p-4 ${player.status === 'cashed_out' ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-lg font-semibold truncate pr-2">{player.name}</h3>
        {showRemoveConfirm ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => {
                onRemove()
                setShowRemoveConfirm(false)
              }}
              className="text-red-600 hover:text-red-700 text-xs font-semibold"
            >
              {t('confirm')}
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="text-gray-400 hover:text-red-600 text-xs shrink-0"
          >
            {t('remove')}
          </button>
        )}
      </div>

      <div className="mb-3 sm:mb-4">
        <div className="text-xs text-gray-600 mb-1">{t('totalBuyIns')}</div>
        <div className="text-lg sm:text-2xl font-bold">{formatCurrency(totalBuyIns)}</div>
      </div>

      {player.status === 'playing' ? (
        <>
          <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-3">
            <input
              type="number"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={t('buyInPlaceholder')}
              className="w-0 flex-1 min-w-0 px-1.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded text-xs sm:text-sm"
            />
            <button
              onClick={handleCustomBuyIn}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm font-medium shrink-0"
            >
              {t('add')}
            </button>
          </div>

          <div className="border-t pt-2 sm:pt-3">
            <div className="flex gap-1 sm:gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                placeholder={t('cashOutPlaceholder')}
                className="w-0 flex-1 min-w-0 px-1.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded text-xs sm:text-sm"
              />
              <button
                onClick={handleCashOut}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0"
              >
                {t('cashOut')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t pt-2 sm:pt-3">
          <div className="flex justify-between items-center mb-1.5 sm:mb-2">
            <span className="text-xs sm:text-sm text-gray-600">{t('cashedOut')}</span>
            <span className="font-semibold text-xs sm:text-base">{formatCurrency(player.cashOut || 0)}</span>
          </div>
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-gray-600">{t('profitLoss')}</span>
            <span className={`font-bold text-xs sm:text-base ${profitLoss! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitLoss! >= 0 ? '+' : ''}{formatCurrency(profitLoss!)}
            </span>
          </div>
          <button
            onClick={resetPlayer}
            className="w-full py-1.5 sm:py-2 px-3 bg-gray-100 rounded hover:bg-gray-200 text-xs sm:text-sm font-medium"
          >
            {t('resetPlayer')}
          </button>
        </div>
      )}

      {player.buyIns.length > 0 && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
          <div className="text-xs text-gray-500 mb-1 sm:mb-2">{t('buyInHistory')}</div>
          <div className="space-y-1">
            {player.buyIns.map((buyIn, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                {editingBuyIn === index ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs">$</span>
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(index)
                        if (e.key === 'Escape') cancelEditing()
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditSave(index)}
                      className="text-green-600 hover:text-green-700 text-xs"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(index, buyIn.amount)}
                      className="text-xs text-gray-700 hover:text-blue-600 cursor-pointer"
                    >
                      ${buyIn.amount}
                    </button>
                    <button
                      onClick={() => deleteBuyIn(index)}
                      className="text-red-500 hover:text-red-700 text-xs ml-2"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}