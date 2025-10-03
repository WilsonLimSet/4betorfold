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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="text-gray-600 hover:text-gray-900 shrink-0 text-sm"
              >
                {t('back')}
              </button>
              <div className="text-xs sm:text-sm font-bold text-blue-600">
                4 Bet or Fold
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">{t('gameCode')}</span>
                <span className="font-mono font-bold text-base sm:text-lg">{game.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLink}
                  className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  {copiedLink ? t('copied') : t('copyLink')}
                </button>
                <button
                  onClick={downloadCSV}
                  className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  {t('exportCSV')}
                </button>
              </div>
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
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
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