'use client'

import { useState, useEffect } from 'react'
import { ScoreTracker } from '@/components/ScoreTracker'
import { PlayerSetup } from '@/components/PlayerSetup'
import { Statistics } from '@/components/Statistics'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

type AppView = 'setup' | 'game' | 'stats'

export default function Home() {
  const [players, setPlayers] = useState<string[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [currentView, setCurrentView] = useState<AppView>('setup')
  const [isTrackedGame, setIsTrackedGame] = useState(false)
  const [gameId, setGameId] = useState<number | string | undefined>()

  // Load saved game state from localStorage (for quick games only)
  useEffect(() => {
    const savedPlayers = localStorage.getItem('huutopussi-players')
    const savedGameStarted = localStorage.getItem('huutopussi-game-started')
    const savedGameType = localStorage.getItem('huutopussi-game-type')
    const savedGameId = localStorage.getItem('huutopussi-game-id')

    if (savedPlayers && savedGameStarted === 'true') {
      setPlayers(JSON.parse(savedPlayers))
      setGameStarted(true)
      setCurrentView('game')
      setIsTrackedGame(savedGameType === 'tracked')

      // Handle both numeric and string game IDs
      if (savedGameId) {
        const parsedId = parseInt(savedGameId)
        setGameId(isNaN(parsedId) ? savedGameId : parsedId)
      }
    }
  }, [])

  const startGame = (
    playerNames: string[],
    isPermanentGame: boolean,
    newGameId?: number | string,
  ) => {
    setPlayers(playerNames)
    setGameStarted(true)
    setCurrentView('game')
    setIsTrackedGame(isPermanentGame)
    setGameId(newGameId)

    // Save to localStorage
    localStorage.setItem('huutopussi-players', JSON.stringify(playerNames))
    localStorage.setItem('huutopussi-game-started', 'true')
    localStorage.setItem(
      'huutopussi-game-type',
      isPermanentGame ? 'tracked' : 'quick',
    )
    if (newGameId) {
      localStorage.setItem('huutopussi-game-id', newGameId.toString())
    }
  }

  const resetGame = () => {
    setPlayers([])
    setGameStarted(false)
    setCurrentView('setup')
    setIsTrackedGame(false)
    setGameId(undefined)

    // Clear localStorage
    localStorage.removeItem('huutopussi-players')
    localStorage.removeItem('huutopussi-game-started')
    localStorage.removeItem('huutopussi-scores')
    localStorage.removeItem('huutopussi-rounds')
    localStorage.removeItem('huutopussi-auction')
    localStorage.removeItem('huutopussi-game-type')
    localStorage.removeItem('huutopussi-game-id')
  }

  const renderNavigation = () => {
    if (currentView === 'game') {
      return (
        <div className='mb-4 bg-white rounded-lg shadow-sm p-2'>
          <div className='flex gap-2'>
            <button
              onClick={() => setCurrentView('setup')}
              className='px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors'
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
            >
              📊 Stats
            </button>
            <div className='flex-1 text-center text-sm text-gray-600 flex items-center justify-center'>
              {isTrackedGame ? '🏆 Tracked Game' : '⚡ Quick Game'}
            </div>
          </div>
        </div>
      )
    }

    if (currentView === 'stats') {
      return (
        <div className='mb-4 bg-white rounded-lg shadow-sm p-2'>
          <div className='flex gap-2'>
            <button
              onClick={() => setCurrentView(gameStarted ? 'game' : 'setup')}
              className='px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors'
            >
              ← Back
            </button>
            <div className='flex-1 text-center text-sm text-gray-600 flex items-center justify-center'>
              📊 Statistics
            </div>
          </div>
        </div>
      )
    }

    if (currentView === 'setup') {
      return (
        <div className='mb-4 bg-white rounded-lg shadow-sm p-2'>
          <div className='flex gap-2 justify-end'>
            <button
              onClick={() => setCurrentView('stats')}
              className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
            >
              📊 Statistics
            </button>
          </div>
        </div>
      )
    }
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'setup':
        return <PlayerSetup onStartGame={startGame} />
      case 'game':
        return (
          <ScoreTracker
            players={players}
            onResetGame={resetGame}
            isTrackedGame={isTrackedGame}
            gameId={gameId}
          />
        )
      case 'stats':
        return <Statistics />
      default:
        return <PlayerSetup onStartGame={startGame} />
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4'>
      <ServiceWorkerRegistration />
      <div className='max-w-md mx-auto'>
        {/* Header */}
        {currentView === 'setup' && (
          <div className='text-center mb-6'>
            <h1 className='text-4xl font-bold text-white mb-2'>
              🃏 Huutopussi
            </h1>
            <p className='text-green-100'>Score Tracker</p>
          </div>
        )}

        {/* Navigation */}
        {renderNavigation()}

        {/* Current View */}
        {renderCurrentView()}
      </div>
    </div>
  )
}
