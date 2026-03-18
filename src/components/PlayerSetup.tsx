import React, { useState } from 'react'
import { PermanentPlayers } from './PermanentPlayers'
import { OnlineStatus } from './OnlineStatus'
import { useOffline } from '@/contexts/OfflineContext'
import type { Player } from '@/types/database'

interface PlayerSetupProps {
  onStartGame: (
    players: string[],
    isPermanentGame: boolean,
    gameId?: number | string,
  ) => void
}

export const PlayerSetup = ({ onStartGame }: PlayerSetupProps) => {
  const [manualPlayers, setManualPlayers] = useState(['', ''])
  const [permanentPlayers, setPermanentPlayers] = useState<Player[]>([])
  const [selectedPermanentPlayers, setSelectedPermanentPlayers] = useState<
    Player[]
  >([])
  const [gameMode, setGameMode] = useState<'manual' | 'permanent'>('permanent')
  const [error, setError] = useState('')

  const { isOnline, saveGameOffline } = useOffline()

  const updateManualPlayer = (index: number, name: string) => {
    const updated = [...manualPlayers]
    updated[index] = name
    setManualPlayers(updated)
  }

  const addManualPlayer = () => {
    if (manualPlayers.length < 6) {
      setManualPlayers([...manualPlayers, ''])
    }
  }

  const removeManualPlayer = (index: number) => {
    setManualPlayers(manualPlayers.filter((_, i) => i !== index))
  }

  const togglePermanentPlayer = (player: Player) => {
    setSelectedPermanentPlayers((prev) => {
      const isSelected = prev.some((p) => p.id === player.id)
      if (isSelected) {
        return prev.filter((p) => p.id !== player.id)
      } else if (prev.length < 6) {
        return [...prev, player]
      }
      return prev
    })
  }

  const startGame = async (players: string[], isPermanentGame: boolean) => {
    // Don't create database entry yet - wait until first scoring
    onStartGame(players, isPermanentGame)
  }

  // Game creation now happens when first hand is scored

  const handleStartGame = () => {
    let playersToUse: string[] = []
    let isPermanentGame = false

    if (gameMode === 'permanent') {
      if (selectedPermanentPlayers.length < 2) {
        setError('At least 2 permanent players are required')
        return
      }
      playersToUse = selectedPermanentPlayers.map((p) => p.name)
      isPermanentGame = true
    } else {
      const validPlayers = manualPlayers.filter((name) => name.trim() !== '')

      if (validPlayers.length < 2) {
        setError('At least 2 players are required')
        return
      }

      const uniquePlayers = [...new Set(validPlayers)]
      if (uniquePlayers.length !== validPlayers.length) {
        setError('Player names must be unique')
        return
      }

      playersToUse = validPlayers
      isPermanentGame = false
    }

    setError('')
    startGame(playersToUse, isPermanentGame)
  }

  return (
    <>
      <OnlineStatus />
      <div className='space-y-6'>
        <div className='bg-white rounded-xl shadow-lg p-6'>
          <h2 className='text-xl font-semibold text-gray-800 mb-4'>
            Game Type
          </h2>
          <div className='flex gap-4'>
            <button
              onClick={() => setGameMode('permanent')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                gameMode === 'permanent'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className='font-medium'>Tracked Game</div>
              <div className='text-sm opacity-75'>
                Use permanent players + stats
              </div>
            </button>
            <button
              onClick={() => setGameMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                gameMode === 'manual'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className='font-medium'>Quick Game</div>
              <div className='text-sm opacity-75'>
                Enter player names manually
              </div>
            </button>
          </div>
        </div>

        {gameMode === 'permanent' ? (
          <PermanentPlayers
            onPlayersChange={setPermanentPlayers}
            selectedPlayers={selectedPermanentPlayers}
            onTogglePlayer={togglePermanentPlayer}
          />
        ) : (
          <div className='bg-white rounded-xl shadow-lg p-6 space-y-6'>
            <div className='text-center'>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                🃏 Huutopussi
              </h1>
              <p className='text-gray-800'>Score Tracker</p>
            </div>

            <div className='space-y-4'>
              <h2 className='text-xl font-semibold text-gray-800'>
                Add Players
              </h2>

              {manualPlayers.map((player, index) => (
                <div key={index} className='flex gap-2'>
                  <input
                    type='text'
                    value={player}
                    onChange={(e) => updateManualPlayer(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'
                    maxLength={20}
                  />
                  {manualPlayers.length > 2 && (
                    <button
                      onClick={() => removeManualPlayer(index)}
                      className='px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {manualPlayers.length < 6 && (
                <button
                  onClick={addManualPlayer}
                  className='w-full py-2 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-green-500 hover:text-green-500 transition-colors'
                >
                  + Add Player
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className='bg-white rounded-xl shadow-lg p-4'>
            <div className='text-red-500 text-center'>{error}</div>
          </div>
        )}

        <div className='bg-white rounded-xl shadow-lg p-6'>
          <button
            onClick={handleStartGame}
            disabled={
              (gameMode === 'permanent' &&
                selectedPermanentPlayers.length < 2) ||
              (gameMode === 'manual' &&
                manualPlayers.filter((p) => p.trim()).length < 2)
            }
            className='w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
          >
            {gameMode === 'permanent'
              ? 'Start Tracked Game'
              : 'Start Quick Game'}
          </button>
        </div>
      </div>
    </>
  )
}
