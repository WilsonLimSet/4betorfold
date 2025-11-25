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
  const [lastAddedAmount, setLastAddedAmount] = useState<number | null>(null)

  const totalBuyIns = player.buyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0)
  const profitLoss = player.cashOut !== null ? player.cashOut - totalBuyIns : null

  const addBuyIn = (amount: number) => {
    onUpdate({
      ...player,
      buyIns: [...player.buyIns, { amount, timestamp: Date.now() }],
    })
    // Show feedback for quick buy-in buttons
    setLastAddedAmount(amount)
    setTimeout(() => setLastAddedAmount(null), 1000)
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
    <div className={`bg-white rounded-xl shadow-md p-4 ${player.status === 'cashed_out' ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-base sm:text-lg font-semibold truncate pr-2">{player.name}</h3>
        {showRemoveConfirm ? (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                onRemove()
                setShowRemoveConfirm(false)
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold active:bg-red-700"
            >
              {t('confirm')}
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs active:bg-gray-200"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 active:bg-red-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-600 mb-1">{t('totalBuyIns')}</div>
        <div className="text-2xl font-bold">{formatCurrency(totalBuyIns)}</div>
      </div>

      {player.status === 'playing' ? (
        <>
          {/* Quick buy-in buttons */}
          <div className="flex gap-2 mb-3">
            {[25, 50, 100].map((amount) => (
              <button
                key={amount}
                onClick={() => addBuyIn(amount)}
                disabled={lastAddedAmount !== null}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  lastAddedAmount === amount
                    ? 'bg-green-500 text-white scale-95'
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                } ${lastAddedAmount !== null && lastAddedAmount !== amount ? 'opacity-50' : ''}`}
              >
                {lastAddedAmount === amount ? '✓' : `$${amount}`}
              </button>
            ))}
          </div>

          {/* Custom buy-in */}
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={t('buyInPlaceholder')}
              className="w-0 flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleCustomBuyIn}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shrink-0 active:bg-blue-800"
            >
              {t('add')}
            </button>
          </div>

          {/* Cash out */}
          <div className="border-t pt-3">
            {totalBuyIns > 0 && (
              <button
                onClick={() => setCashOutAmount(totalBuyIns.toString())}
                className="w-full mb-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100"
              >
                {t('fillWithBuyIn') || `Fill with $${totalBuyIns}`}
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                placeholder={t('cashOutPlaceholder')}
                className="w-0 flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleCashOut}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold whitespace-nowrap shrink-0 active:bg-green-800"
              >
                {t('cashOut')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t pt-3">
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">{t('cashedOut')}</span>
              <span className="font-semibold text-base">{formatCurrency(player.cashOut || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('profitLoss')}</span>
              <span className={`font-bold text-lg ${profitLoss! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitLoss! >= 0 ? '+' : ''}{formatCurrency(profitLoss!)}
              </span>
            </div>
          </div>
          <button
            onClick={resetPlayer}
            className="w-full py-2.5 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium active:bg-gray-300"
          >
            {t('resetPlayer')}
          </button>
        </div>
      )}

      {player.buyIns.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500 mb-2">{t('buyInHistory')}</div>
          <div className="space-y-1.5">
            {player.buyIns.map((buyIn, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                {editingBuyIn === index ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(index)
                        if (e.key === 'Escape') cancelEditing()
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditSave(index)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg active:bg-green-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg active:bg-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(index, buyIn.amount)}
                      className="text-sm text-gray-700 hover:text-blue-600 py-1 px-1 -ml-1 rounded active:bg-gray-100"
                    >
                      ${buyIn.amount}
                    </button>
                    <button
                      onClick={() => deleteBuyIn(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg active:bg-red-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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