'use client'

import { useState } from 'react'

interface PlayerSetupProps {
  onStartGame: (players: string[]) => void
}

export function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [players, setPlayers] = useState<string[]>(['', ''])
  const [error, setError] = useState('')

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([...players, ''])
    }
  }

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index))
    }
  }

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players]
    newPlayers[index] = name
    setPlayers(newPlayers)
  }

  const handleStartGame = () => {
    const validPlayers = players.filter((name) => name.trim() !== '')

    if (validPlayers.length < 2) {
      setError('At least 2 players are required')
      return
    }

    const uniquePlayers = [...new Set(validPlayers)]
    if (uniquePlayers.length !== validPlayers.length) {
      setError('Player names must be unique')
      return
    }

    setError('')
    onStartGame(validPlayers)
  }

  return (
    <div className='bg-white rounded-xl shadow-lg p-6 space-y-6'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>🃏 Huutopussi</h1>
        <p className='text-gray-600'>Score Tracker</p>
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-800'>Add Players</h2>

        {players.map((player, index) => (
          <div key={index} className='flex gap-2'>
            <input
              type='text'
              value={player}
              onChange={(e) => updatePlayer(index, e.target.value)}
              placeholder={`Player ${index + 1}`}
              className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500'
              maxLength={20}
            />
            {players.length > 2 && (
              <button
                onClick={() => removePlayer(index)}
                className='px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {players.length < 6 && (
          <button
            onClick={addPlayer}
            className='w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-green-500 hover:text-green-500 transition-colors'
          >
            + Add Player
          </button>
        )}

        {error && (
          <div className='text-red-500 text-sm text-center'>{error}</div>
        )}

        <button
          onClick={handleStartGame}
          className='w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors'
        >
          Start Game
        </button>
      </div>

      <div className='text-xs text-gray-500 text-center'>
        <p>
          Huutopussi is a Finnish card game where players try to reach 500
          points first.
        </p>
      </div>
    </div>
  )
}
