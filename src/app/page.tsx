'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateGameCode, generateId } from '@/lib/utils'
import { storage } from '@/lib/storage'
import { Game } from '@/types/game'

export default function HomePage() {
  const router = useRouter()
  const [recentGames, setRecentGames] = useState<Game[]>([])

  useEffect(() => {
    const games = storage.getAllGames().slice(-5).reverse()
    setRecentGames(games)
  }, [])

  const createNewGame = () => {
    const code = generateGameCode()
    const game: Game = {
      id: generateId(),
      code,
      players: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    storage.saveGame(game)
    storage.setCurrentGame(game.id)
    router.push(`/game/${code}`)
  }

  const joinGame = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string
    if (code) {
      router.push(`/game/${code.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            4 Bet or Fold
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Free poker home game tracker with automatic balance verification
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Start New Game</h2>
            <p className="text-gray-600 mb-6">
              Create a new game session and share the code with other players
            </p>
            <button
              onClick={createNewGame}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create New Game
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Join Existing Game</h2>
            <p className="text-gray-600 mb-6">
              Enter a game code to join an active session
            </p>
            <form onSubmit={joinGame}>
              <input
                type="text"
                name="code"
                placeholder="Enter game code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 uppercase"
                maxLength={6}
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Join Game
              </button>
            </form>
          </div>
        </div>

        {recentGames.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/game/${game.code}`)}
                >
                  <div>
                    <span className="font-mono font-semibold text-lg">{game.code}</span>
                    <p className="text-sm text-gray-600">
                      {game.players.length} players &bull; {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700">
                    Resume &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 sm:mt-16 text-center text-gray-600 text-sm sm:text-base px-4">
          <p className="mb-6">Track buy-ins and cash-outs for your poker home games with automatic balance verification. No login required.</p>
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <p className="text-xs text-gray-500">
              Made by <a href="https://wilsonlimsetiawan.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-700">WilsonLimSet</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
