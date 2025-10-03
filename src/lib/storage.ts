import { Game } from '@/types/game'

const STORAGE_KEY = 'poker_games'
const CURRENT_GAME_KEY = 'current_game_id'
const GAME_EXPIRY_DAYS = 30

export const storage = {
  saveGame(game: Game): void {
    if (typeof window === 'undefined') return

    const games = this.getAllGames()
    const existingIndex = games.findIndex(g => g.id === game.id)

    if (existingIndex >= 0) {
      games[existingIndex] = game
    } else {
      games.push(game)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
    this.cleanupOldGames()
  },

  getGame(id: string): Game | null {
    if (typeof window === 'undefined') return null

    const games = this.getAllGames()
    return games.find(g => g.id === id) || null
  },

  getGameByCode(code: string): Game | null {
    if (typeof window === 'undefined') return null

    const games = this.getAllGames()
    return games.find(g => g.code === code) || null
  },

  getAllGames(): Game[] {
    if (typeof window === 'undefined') return []

    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  },

  setCurrentGame(gameId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(CURRENT_GAME_KEY, gameId)
  },

  getCurrentGameId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CURRENT_GAME_KEY)
  },

  cleanupOldGames(): void {
    if (typeof window === 'undefined') return

    const games = this.getAllGames()
    const cutoffTime = Date.now() - (GAME_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    const activeGames = games.filter(g => g.updatedAt > cutoffTime)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeGames))
  }
}