'use client'

import { useState, useEffect } from 'react'
import { ScoreTracker } from '@/components/ScoreTracker'
import { PlayerSetup } from '@/components/PlayerSetup'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

export default function Home() {
  const [players, setPlayers] = useState<string[]>([])
  const [gameStarted, setGameStarted] = useState(false)

  // Load saved game state from localStorage
  useEffect(() => {
    const savedPlayers = localStorage.getItem('huutopussi-players')
    const savedGameStarted = localStorage.getItem('huutopussi-game-started')

    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers))
    }
    if (savedGameStarted === 'true') {
      setGameStarted(true)
    }
  }, [])

  const startGame = (playerNames: string[]) => {
    setPlayers(playerNames)
    setGameStarted(true)
    localStorage.setItem('huutopussi-players', JSON.stringify(playerNames))
    localStorage.setItem('huutopussi-game-started', 'true')
  }

  const resetGame = () => {
    setPlayers([])
    setGameStarted(false)
    localStorage.removeItem('huutopussi-players')
    localStorage.removeItem('huutopussi-game-started')
    localStorage.removeItem('huutopussi-scores')
    localStorage.removeItem('huutopussi-rounds')
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4'>
      <ServiceWorkerRegistration />
      <div className='max-w-md mx-auto'>
        {!gameStarted ? (
          <PlayerSetup onStartGame={startGame} />
        ) : (
          <ScoreTracker players={players} onResetGame={resetGame} />
        )}
      </div>
    </div>
  )
}
