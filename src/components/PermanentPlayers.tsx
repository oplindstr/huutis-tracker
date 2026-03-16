'use client'

import { useState, useEffect } from 'react'
import type { Player } from '@/types/database'
import { useOffline } from '@/contexts/OfflineContext'

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

  const { isOnline, savePlayerOffline, getLocalPlayers } = useOffline()

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)

      if (isOnline) {
        // Try to fetch from remote database
        const response = await fetch('/api/players')
        const data = await response.json()

        if (response.ok) {
          setPlayers(data.players)
          onPlayersChange(data.players)
        } else {
          // Fallback to local players
          await loadLocalPlayers()
        }
      } else {
        // Load from local storage
        await loadLocalPlayers()
      }
    } catch (err) {
      console.error('Failed to fetch players:', err)
      await loadLocalPlayers()
    } finally {
      setLoading(false)
    }
  }

  const loadLocalPlayers = async () => {
    try {
      const localPlayers = await getLocalPlayers()
      // Convert local players to Player format
      const formattedPlayers: Player[] = localPlayers.map((p, index) => ({
        id: parseInt(p.temporary_id.replace('player_', '')) || index,
        name: p.name,
        created_at: p.created_at,
      }))

      setPlayers(formattedPlayers)
      onPlayersChange(formattedPlayers)
    } catch (error) {
      console.error('Failed to load local players:', error)
      setError('Failed to load players')
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

      if (isOnline) {
        // Try to add to remote database
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
          // If online but request fails, save offline
          await addPlayerOffline()
        }
      } else {
        // Save offline
        await addPlayerOffline()
      }
    } catch (err) {
      console.error('Failed to add player:', err)
      // Fallback to offline save
      await addPlayerOffline()
    } finally {
      setIsAddingPlayer(false)
    }
  }

  const addPlayerOffline = async () => {
    try {
      const temporaryId = await savePlayerOffline(newPlayerName.trim())

      // Add to local state immediately
      const newPlayer: Player = {
        id: Date.now(), // Temporary ID for UI
        name: newPlayerName.trim(),
        created_at: new Date().toISOString(),
      }

      const updatedPlayers = [...players, newPlayer].sort((a, b) =>
        a.name.localeCompare(b.name),
      )

      setPlayers(updatedPlayers)
      onPlayersChange(updatedPlayers)
      setNewPlayerName('')

      if (isOnline) {
        setError('Saved locally - will sync when connection is stable')
      }
    } catch (error) {
      setError('Failed to save player')
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
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-gray-800'>
          Permanent Players
        </h2>
        {!isOnline && (
          <span className='text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded'>
            Offline Mode
          </span>
        )}
      </div>

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
