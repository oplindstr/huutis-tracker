'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { syncService } from '@/lib/sync-service'
import { offlineStorage } from '@/lib/offline-storage'
import type { SyncStatus } from '@/lib/sync-service'

interface OfflineContextType {
  isOnline: boolean
  syncStatus: SyncStatus
  hasPendingSync: boolean
  manualSync: () => Promise<void>
  syncCurrentGame: () => Promise<void>
  savePlayerOffline: (name: string) => Promise<string>
  deleteLocalGame: () => void
  getLocalPlayers: () => Promise<any[]>
  cacheRemotePlayers: (players: any[]) => Promise<void>
  getAllPlayersForUI: () => Promise<any[]>
  isCacheStale: (maxAgeMinutes?: number) => Promise<boolean>
  refreshPlayersCache: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    inProgress: false,
    totalItems: 0,
    syncedItems: 0,
    errors: [],
  })
  const [hasPendingSync, setHasPendingSync] = useState(false)

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine)

    // Set up event listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set up auto-sync
    syncService.setupAutoSync()

    // Check for pending sync on load
    checkPendingSync()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkPendingSync = async () => {
    try {
      const pending = await offlineStorage.hasPendingSync()
      setHasPendingSync(pending)
    } catch (error) {
      console.error('Failed to check pending sync:', error)

      // If it's an IndexedDB issue, try to inform the user and reset
      if (
        error instanceof Error &&
        (error.message.includes('object store') ||
          error.message.includes('IDBDatabase') ||
          error.name === 'NotFoundError')
      ) {
        console.log('IndexedDB corruption detected, attempting to reset...')
        // Don't fail silently, but also don't break the app
        setHasPendingSync(false)
        setSyncStatus((prev) => ({
          ...prev,
          errors: [...prev.errors, 'Offline storage reset due to corruption'],
        }))
      } else {
        // Other errors should still be handled normally
        setHasPendingSync(false)
      }
    }
  }

  const manualSync = async () => {
    try {
      setSyncStatus({ ...syncStatus, inProgress: true })
      const status = await syncService.manualSync()
      setSyncStatus(status)
      await checkPendingSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
      setSyncStatus({
        ...syncStatus,
        inProgress: false,
        errors: [...syncStatus.errors, `Manual sync failed: ${error}`],
      })
    }
  }

  const saveGameOffline = async (gameData: any): Promise<string> => {
    try {
      const tempId = await offlineStorage.saveGameOffline({
        id: '', // Will be set by server
        players: gameData.players,
        winner: gameData.winner,
        final_scores: gameData.final_scores || [],
        rounds_played: gameData.rounds_played || 0,
        duration_minutes: gameData.duration_minutes,
        completed: gameData.completed || false,
        created_at: new Date().toISOString(),
      })

      await checkPendingSync()
      return tempId
    } catch (error) {
      console.error('Failed to save game offline:', error)

      // For IndexedDB errors, provide a more specific error message
      if (
        error instanceof Error &&
        (error.message.includes('object store') ||
          error.message.includes('IDBDatabase') ||
          error.name === 'NotFoundError')
      ) {
        throw new Error(
          'Offline storage unavailable. Please try refreshing the page.',
        )
      }

      throw error
    }
  }

  const savePlayerOffline = async (name: string): Promise<string> => {
    try {
      const tempId = await offlineStorage.savePlayerOffline(name)
      await checkPendingSync()
      return tempId
    } catch (error) {
      console.error('Failed to save player offline:', error)

      // For IndexedDB errors, provide a more specific error message
      if (
        error instanceof Error &&
        (error.message.includes('object store') ||
          error.message.includes('IDBDatabase') ||
          error.name === 'NotFoundError')
      ) {
        throw new Error(
          'Offline storage unavailable. Please try refreshing the page.',
        )
      }

      throw error
    }
  }

  const updateGameOffline = async (
    gameId: string,
    updates: any,
  ): Promise<void> => {
    await offlineStorage.updateGameOffline(gameId, updates)
    await checkPendingSync()
  }

  const getLocalPlayers = async () => {
    return await offlineStorage.getAllLocalPlayers()
  }

  const cacheRemotePlayers = async (players: any[]): Promise<void> => {
    await offlineStorage.cacheRemotePlayers(players)
  }

  const getAllPlayersForUI = async () => {
    return await offlineStorage.getAllPlayersForUI()
  }

  const isCacheStale = async (maxAgeMinutes?: number): Promise<boolean> => {
    return await offlineStorage.isCacheStale(maxAgeMinutes)
  }

  const refreshPlayersCache = async (): Promise<void> => {
    await syncService.refreshPlayersCache()
  }

  const syncCurrentGame = async (): Promise<void> => {
    try {
      const savedScores = localStorage.getItem('huutopussi-scores')
      const savedRounds = localStorage.getItem('huutopussi-rounds')
      const savedPlayers = localStorage.getItem('huutopussi-players')
      const savedAuction = localStorage.getItem('huutopussi-auction')

      if (!savedScores || !savedPlayers) {
        throw new Error('No game data found to sync')
      }

      const scores = JSON.parse(savedScores)
      const players = JSON.parse(savedPlayers)
      const gameCompleted =
        localStorage.getItem('huutopussi-completed') === 'true'
      const winner = localStorage.getItem('huutopussi-winner')
      const startTime = localStorage.getItem('huutopussi-start-time')

      // Calculate final scores
      const finalScores = new Array(players.length).fill(0)
      scores.forEach((score: any) => {
        score.scores.forEach((s: number, index: number) => {
          finalScores[index] += s
        })
      })

      const gameDuration = startTime
        ? Math.round((Date.now() - parseInt(startTime)) / (1000 * 60))
        : 0

      if (isOnline) {
        // Create game in database
        const response = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            players,
            winner: winner || null,
            final_scores: finalScores,
            rounds_played: scores.length,
            duration_minutes: gameDuration,
            completed: gameCompleted,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create game in database')
        }

        const data = await response.json()
        const gameId = data.game.id

        // Save each round
        for (let i = 0; i < scores.length; i++) {
          const score = scores[i]
          await fetch(`/api/games/${gameId}/rounds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scores: score.scores,
              auction_winner:
                score.auctionWinner !== undefined && score.auctionWinner !== -1
                  ? players[score.auctionWinner]
                  : undefined,
              initial_bid: score.initialBid,
              promise_increased: score.promiseIncreased,
              final_promise: score.finalPromise,
            }),
          })
        }
      } else {
        // Save to offline storage
        await offlineStorage.saveGameOffline({
          id: '',
          players,
          winner: winner || undefined,
          final_scores: finalScores,
          rounds_played: scores.length,
          duration_minutes: gameDuration,
          completed: gameCompleted,
          created_at: new Date().toISOString(),
        })
      }

      await checkPendingSync()
    } catch (error) {
      console.error('Failed to sync current game:', error)
      throw error
    }
  }

  const deleteLocalGame = (): void => {
    localStorage.removeItem('huutopussi-scores')
    localStorage.removeItem('huutopussi-rounds')
    localStorage.removeItem('huutopussi-auction')
    localStorage.removeItem('huutopussi-players')
    localStorage.removeItem('huutopussi-completed')
    localStorage.removeItem('huutopussi-winner')
    localStorage.removeItem('huutopussi-start-time')
  }

  const deleteGame = async (
    gameId: string | number,
    isOfflineGame: boolean,
  ): Promise<void> => {
    console.log('deleteGame called with:', { gameId, isOfflineGame })

    try {
      if (isOfflineGame) {
        // Delete from offline storage
        console.log('Deleting from offline storage')
        await offlineStorage.deleteGameOffline(gameId as string)
        console.log('Offline deletion successful')
      } else {
        // Delete from database via API
        console.log('Deleting from database via API')
        const response = await fetch(`/api/games/${gameId}`, {
          method: 'DELETE',
        })

        console.log('API response:', {
          status: response.status,
          ok: response.ok,
        })

        // If game is already deleted (404), treat as success
        if (!response.ok && response.status !== 404) {
          const errorText = await response.text()
          console.error('API deletion failed:', errorText)
          throw new Error(
            `Failed to delete game from database: ${response.status} - ${errorText}`,
          )
        }
        console.log('Database deletion successful or game already deleted')
      }

      await checkPendingSync()
      console.log('Delete game completed successfully')
    } catch (error) {
      console.error('Failed to delete game:', error)

      // For IndexedDB errors, provide a more specific error message
      if (
        error instanceof Error &&
        (error.message.includes('object store') ||
          error.message.includes('IDBDatabase') ||
          error.name === 'NotFoundError')
      ) {
        throw new Error(
          'Offline storage unavailable. Please try refreshing the page.',
        )
      }

      // For other errors (like network issues), just log and continue
      // The caller will handle local cleanup
      throw error
    }
  }

  const value: OfflineContextType = {
    isOnline,
    syncStatus,
    hasPendingSync,
    manualSync,
    syncCurrentGame,
    savePlayerOffline,
    deleteLocalGame,
    getLocalPlayers,
    cacheRemotePlayers,
    getAllPlayersForUI,
    isCacheStale,
    refreshPlayersCache,
  }

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  )
}

export function useOffline() {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}
