// Sync service for uploading offline data to remote database
import { offlineStorage } from './offline-storage'
import type { PendingGame, PendingPlayer } from './offline-storage'

export interface SyncStatus {
  inProgress: boolean
  totalItems: number
  syncedItems: number
  errors: string[]
  lastSyncTime?: Date
}

class SyncService {
  private syncInProgress = false
  private syncStatus: SyncStatus = {
    inProgress: false,
    totalItems: 0,
    syncedItems: 0,
    errors: []
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  // Full sync of all pending data
  async syncAllData(): Promise<SyncStatus> {
    if (this.syncInProgress) {
      return this.syncStatus
    }

    if (!this.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    this.syncInProgress = true
    this.syncStatus = {
      inProgress: true,
      totalItems: 0,
      syncedItems: 0,
      errors: [],
      lastSyncTime: new Date()
    }

    try {
      // Get all unsynced data
      const [unsyncedPlayers, unsyncedGames] = await Promise.all([
        offlineStorage.getUnsyncedPlayers(),
        offlineStorage.getUnsyncedGames()
      ])

      this.syncStatus.totalItems = unsyncedPlayers.length + unsyncedGames.length

      // If nothing to sync
      if (this.syncStatus.totalItems === 0) {
        this.syncStatus.inProgress = false
        return this.syncStatus
      }

      // Sync players first (games might depend on them)
      for (const player of unsyncedPlayers) {
        try {
          await this.syncPlayer(player)
          this.syncStatus.syncedItems++
        } catch (error) {
          console.error('Failed to sync player:', player.name, error)
          this.syncStatus.errors.push(`Failed to sync player "${player.name}": ${error}`)
        }
      }

      // Sync games
      for (const game of unsyncedGames) {
        try {
          await this.syncGame(game)
          this.syncStatus.syncedItems++
        } catch (error) {
          console.error('Failed to sync game:', game.temporary_id, error)
          this.syncStatus.errors.push(`Failed to sync game: ${error}`)
        }
      }

      // Clean up synced data if no errors
      if (this.syncStatus.errors.length === 0) {
        await offlineStorage.clearSyncedData()
      }

    } catch (error) {
      console.error('Sync failed:', error)
      this.syncStatus.errors.push(`Sync failed: ${error}`)
    } finally {
      this.syncStatus.inProgress = false
      this.syncInProgress = false
    }

    return this.syncStatus
  }

  // Sync a single player
  private async syncPlayer(player: PendingPlayer): Promise<void> {
    if (player.synced === 'true') return

    const response = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: player.name }),
    })

    if (!response.ok) {
      const error = await response.json()
      // If player already exists, that's ok - mark as synced
      if (response.status === 400 && error.error?.includes('already exists')) {
        await offlineStorage.markPlayerAsSynced(player.temporary_id)
        return
      }
      throw new Error(error.error || 'Failed to sync player')
    }

    await offlineStorage.markPlayerAsSynced(player.temporary_id)
  }

  // Sync a single game
  private async syncGame(game: PendingGame): Promise<void> {
    if (game.synced === 'true') return

    // Create the game first
    const createResponse = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: game.players }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(error.error || 'Failed to create game')
    }

    const { game: createdGame } = await createResponse.json()

    // If the game is completed, update it with the final data
    if (game.completed) {
      const updateResponse = await fetch(`/api/games/${createdGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: game.winner,
          final_scores: game.final_scores,
          rounds_played: game.rounds_played,
          duration_minutes: game.duration_minutes,
          completed: true
        }),
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.json()
        throw new Error(error.error || 'Failed to update game')
      }
    }

    await offlineStorage.markGameAsSynced(game.temporary_id)
  }

  // Auto-sync when coming online
  setupAutoSync(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Device is now online, checking for pending sync...')
      this.autoSync()
    })

    window.addEventListener('offline', () => {
      console.log('Device is now offline')
    })

    // Initial sync check
    if (this.isOnline()) {
      setTimeout(() => this.autoSync(), 1000)
    }
  }

  // Auto-sync with error handling
  private async autoSync(): Promise<void> {
    try {
      const hasPending = await offlineStorage.hasPendingSync()
      if (hasPending) {
        console.log('Syncing pending data...')
        await this.syncAllData()
        console.log('Auto-sync completed')
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    }
  }

  // Manual sync trigger
  async manualSync(): Promise<SyncStatus> {
    if (!this.isOnline()) {
      throw new Error('Device is offline')
    }

    return await this.syncAllData()
  }
}

export const syncService = new SyncService()