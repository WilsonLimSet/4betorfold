'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { generateGameCode, generateId } from '@/lib/utils'
import { storage } from '@/lib/storage'
import { Game } from '@/types/game'
import LanguageSelector from '@/components/LanguageSelector'

export default function HomePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('home')
  const [recentGames, setRecentGames] = useState<Game[]>([])

  useEffect(() => {
    const games = storage.getAllGames().slice(-5).reverse()
    setRecentGames(games)
  }, [])

  const createNewGame = () => {
    console.log('Creating new game...')
    const code = generateGameCode()
    console.log('Generated code:', code)
    const game: Game = {
      id: generateId(),
      code,
      players: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    console.log('Game object:', game)
    storage.saveGame(game)
    storage.setCurrentGame(game.id)
    console.log('Navigating to:', `/${locale}/game/${code}`)
    router.push(`/${locale}/game/${code}`)
  }

  const joinGame = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string
    if (code) {
      router.push(`/${locale}/game/${code.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            {t('title')}
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t('startNewGame')}</h2>
            <p className="text-gray-600 mb-6">
              {t('startNewGameDescription')}
            </p>
            <button
              onClick={createNewGame}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('createNewGameButton')}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t('joinExistingGame')}</h2>
            <p className="text-gray-600 mb-6">
              {t('joinGameDescription')}
            </p>
            <form onSubmit={joinGame}>
              <input
                type="text"
                name="code"
                placeholder={t('gameCodePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 uppercase"
                maxLength={6}
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {t('joinGameButton')}
              </button>
            </form>
          </div>
        </div>

        {recentGames.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t('recentGames')}</h2>
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/${locale}/game/${game.code}`)}
                >
                  <div>
                    <span className="font-mono font-semibold text-lg">{game.code}</span>
                    <p className="text-sm text-gray-600">
                      {game.players.length} {t('players')} • {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700">
                    {t('resume')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 sm:mt-16 text-center text-gray-600 text-sm sm:text-base px-4">
          <p className="mb-6">{t('description')}</p>
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <p className="text-xs text-gray-500">
              {t('madeBy')} <a href="https://wilsonlimsetiawan.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-700">WilsonLimSet</a>
            </p>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  )
}
