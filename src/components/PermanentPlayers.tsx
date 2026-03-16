'use client'

import { useState, useEffect } from 'react'
import type { Player } from '@/types/database'

interface PermanentPlayersProps {
  onPlayersChange: (players: Player[]) => void
  selectedPlayers: Player[]
  onTogglePlayer: (player: Player) => void
}

export function PermanentPlayers({
  onPlayersChange,
  selectedPlayers,
  onTogglePlayer,
}: PermanentPlayersProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [isAddingPlayer, setIsAddingPlayer] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/players')
      const data = await response.json()

      if (response.ok) {
        setPlayers(data.players)
        onPlayersChange(data.players)
      } else {
        setError(data.error || 'Failed to fetch players')
      }
    } catch (err) {
      setError('Failed to fetch players')
    } finally {
      setLoading(false)
    }
  }

  const addPlayer = async () => {
    if (!newPlayerName.trim()) {
      setError('Player name is required')
      return
    }

    if (newPlayerName.length > 50) {
      setError('Player name too long (max 50 characters)')
      return
    }

    if (
      players.some(
        (p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase(),
      )
    ) {
      setError('Player already exists')
      return
    }

    try {
      setIsAddingPlayer(true)
      setError('')

      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        const updatedPlayers = [...players, data.player].sort((a, b) =>
          a.name.localeCompare(b.name),
        )
        setPlayers(updatedPlayers)
        onPlayersChange(updatedPlayers)
        setNewPlayerName('')
      } else {
        setError(data.error || 'Failed to add player')
      }
    } catch (err) {
      setError('Failed to add player')
    } finally {
      setIsAddingPlayer(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addPlayer()
    }
  }

  const isPlayerSelected = (player: Player) => {
    return selectedPlayers.some((p) => p.id === player.id)
  }

  if (loading) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-6 space-y-4'>
        <h2 className='text-xl font-semibold text-gray-800'>
          Permanent Players
        </h2>
        <div className='animate-pulse space-y-2'>
          <div className='h-4 bg-gray-200 rounded w-3/4'></div>
          <div className='h-4 bg-gray-200 rounded w-1/2'></div>
          <div className='h-4 bg-gray-200 rounded w-2/3'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-xl shadow-lg p-6 space-y-4'>
      <h2 className='text-xl font-semibold text-gray-800'>Permanent Players</h2>

      {/* Add New Player */}
      <div className='flex gap-2'>
        <input
          type='text'
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder='Add new player...'
          className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'
          maxLength={50}
          disabled={isAddingPlayer}
        />
        <button
          onClick={addPlayer}
          disabled={isAddingPlayer || !newPlayerName.trim()}
          className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
        >
          {isAddingPlayer ? '...' : '+'}
        </button>
      </div>

      {error && <div className='text-red-500 text-sm'>{error}</div>}

      {/* Player List */}
      {players.length === 0 ? (
        <div className='text-gray-500 text-center py-4 italic'>
          No players yet. Add some permanent players above!
        </div>
      ) : (
        <div className='space-y-2 max-h-64 overflow-y-auto'>
          {players.map((player) => (
            <div
              key={player.id}
              onClick={() => onTogglePlayer(player)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isPlayerSelected(player)
                  ? 'bg-green-100 border-green-500 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className='flex items-center justify-between'>
                <span className='font-medium'>{player.name}</span>
                <div className='text-sm text-gray-500'>
                  {isPlayerSelected(player) ? '✓' : '○'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPlayers.length > 0 && (
        <div className='pt-2 border-t'>
          <div className='text-sm text-gray-600 mb-2'>
            Selected ({selectedPlayers.length}):
          </div>
          <div className='flex flex-wrap gap-2'>
            {selectedPlayers.map((player) => (
              <span
                key={player.id}
                className='px-2 py-1 bg-green-100 text-green-800 rounded-lg text-sm'
              >
                {player.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
