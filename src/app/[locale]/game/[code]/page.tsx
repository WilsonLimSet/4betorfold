'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Game, Player, GameState } from '@/types/game'
import { storage } from '@/lib/storage'
import { exportToCSV, generateId } from '@/lib/utils'
import PlayerCard from '@/components/PlayerCard'
import BalanceBar from '@/components/BalanceBar'
import AddPlayerModal from '@/components/AddPlayerModal'
import LanguageSelector from '@/components/LanguageSelector'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('game')
  const code = params.code as string

  const [game, setGame] = useState<Game | null>(null)
  const [gameState, setGameState] = useState<GameState>({
    totalIn: 0,
    totalOut: 0,
    isBalanced: true,
    balance: 0,
  })
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const loadGame = useCallback(() => {
    const existingGame = storage.getGameByCode(code.toUpperCase())

    if (!existingGame) {
      const urlParams = new URLSearchParams(window.location.search)
      const gameData = urlParams.get('data')

      if (gameData) {
        try {
          const decodedGame = JSON.parse(atob(gameData))
          storage.saveGame(decodedGame)
          setGame(decodedGame)
        } catch (e) {
          console.error('Invalid game data', e)
        }
      } else {
        const newGame: Game = {
          id: generateId(),
          code: code.toUpperCase(),
          players: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        storage.saveGame(newGame)
        setGame(newGame)
      }
    } else {
      setGame(existingGame)
    }
  }, [code])

  const calculateGameState = useCallback(() => {
    if (!game) return

    const totalIn = game.players.reduce((sum, player) => {
      const playerBuyIns = player.buyIns.reduce((s, b) => s + b.amount, 0)
      return sum + playerBuyIns
    }, 0)

    const totalOut = game.players.reduce((sum, player) => {
      return sum + (player.cashOut || 0)
    }, 0)

    const balance = totalIn - totalOut
    const isBalanced = Math.abs(balance) < 0.01

    setGameState({ totalIn, totalOut, balance, isBalanced })
  }, [game])

  useEffect(() => {
    loadGame()
    const interval = setInterval(loadGame, 2000)
    return () => clearInterval(interval)
  }, [loadGame])

  useEffect(() => {
    calculateGameState()
  }, [calculateGameState])

  const updateGame = (updatedGame: Game) => {
    updatedGame.updatedAt = Date.now()
    storage.saveGame(updatedGame)
    setGame(updatedGame)
  }

  const addPlayer = (name: string) => {
    if (!game) return

    const newPlayer: Player = {
      id: generateId(),
      name,
      buyIns: [],
      cashOut: null,
      status: 'playing',
    }

    updateGame({
      ...game,
      players: [...game.players, newPlayer],
    })
    setShowAddPlayer(false)
  }

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const downloadCSV = () => {
    if (!game) return
    const csv = exportToCSV(game)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poker-game-${game.code}.csv`
    a.click()
  }

  const shareSummary = async () => {
    if (!game) return

    const lines: string[] = []

    // Sort players by profit (winners first)
    const sortedPlayers = [...game.players].sort((a, b) => {
      const aTotal = a.buyIns.reduce((sum, bi) => sum + bi.amount, 0)
      const bTotal = b.buyIns.reduce((sum, bi) => sum + bi.amount, 0)
      const aProfit = (a.cashOut || 0) - aTotal
      const bProfit = (b.cashOut || 0) - bTotal
      return bProfit - aProfit
    })

    sortedPlayers.forEach(player => {
      const totalBuyIn = player.buyIns.reduce((sum, bi) => sum + bi.amount, 0)
      const profit = (player.cashOut || 0) - totalBuyIn
      const profitStr = profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`
      lines.push(`${player.name}: ${profitStr}`)
    })

    lines.push('')
    lines.push(`Total In: $${gameState.totalIn} | Out: $${gameState.totalOut}`)

    const summary = lines.join('\n')

    // Try native share first (mobile), fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ text: summary })
        return
      } catch {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    await navigator.clipboard.writeText(summary)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('back')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="font-mono font-bold text-lg">{game.code}</div>
                <div className="text-xs text-gray-500 hidden sm:block">4 Bet or Fold</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={copyLink}
                className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                aria-label={copiedLink ? t('copied') : t('copyLink')}
                title={copiedLink ? t('copied') : t('copyLink')}
              >
                {copiedLink ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </button>
              <button
                onClick={shareSummary}
                className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                aria-label={t('shareSummary')}
                title={t('shareSummary')}
              >
                {copiedSummary ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={downloadCSV}
                className="hidden sm:block p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                aria-label={t('exportCSV')}
                title={t('exportCSV')}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BalanceBar gameState={gameState} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => setShowAddPlayer(true)}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('addPlayer')}
          </button>
        </div>

        {game.players.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">{t('noPlayers')}</p>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('addFirstPlayer')}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {game.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onUpdate={(updatedPlayer) => {
                  updateGame({
                    ...game,
                    players: game.players.map((p) =>
                      p.id === updatedPlayer.id ? updatedPlayer : p
                    ),
                  })
                }}
                onRemove={() => {
                  updateGame({
                    ...game,
                    players: game.players.filter((p) => p.id !== player.id),
                  })
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-gray-200 flex justify-center">
          <LanguageSelector />
        </div>
      </div>

      {showAddPlayer && (
        <AddPlayerModal
          onAdd={addPlayer}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
    </div>
  )
}