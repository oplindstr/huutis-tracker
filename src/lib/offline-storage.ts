// Offline storage and sync service
import type { Game, Player } from '@/types/database'

export interface PendingGame {
  id: string
  players: string[]
  winner?: string
  final_scores: number[]
  rounds_played: number
  duration_minutes?: number
  completed: boolean
  created_at: string
  synced: 'true' | 'false'  // Use string instead of boolean for IndexedDB compatibility
  temporary_id: string
}

export interface PendingPlayer {
  temporary_id: string
  name: string
  created_at: string
  synced: 'true' | 'false'  // Use string instead of boolean for IndexedDB compatibility
}

class OfflineStorageService {
  private dbName = 'huutopussi-offline'
  private gamesStore = 'pending-games'
  private playersStore = 'pending-players'
  private settingsStore = 'app-settings'

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(this.gamesStore)) {
          const gamesStore = db.createObjectStore(this.gamesStore, { keyPath: 'temporary_id' })
          gamesStore.createIndex('synced', 'synced', { unique: false })
          gamesStore.createIndex('created_at', 'created_at', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(this.playersStore)) {
          const playersStore = db.createObjectStore(this.playersStore, { keyPath: 'temporary_id' })
          playersStore.createIndex('synced', 'synced', { unique: false })
          playersStore.createIndex('name', 'name', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(this.settingsStore)) {
          db.createObjectStore(this.settingsStore, { keyPath: 'key' })
        }
      }
    })
  }

  // Save game locally
  async saveGameOffline(gameData: Omit<PendingGame, 'temporary_id' | 'synced'>): Promise<string> {
    const db = await this.initDB()
    const temporary_id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pendingGame: PendingGame = {
      ...gameData,
      temporary_id,
      synced: 'false'
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.gamesStore], 'readwrite')
      const store = transaction.objectStore(this.gamesStore)
      const request = store.add(pendingGame)
      
      request.onsuccess = () => resolve(temporary_id)
      request.onerror = () => reject(request.error)
    })
  }

  // Save player locally
  async savePlayerOffline(name: string): Promise<string> {
    const db = await this.initDB()
    const temporary_id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pendingPlayer: PendingPlayer = {
      temporary_id,
      name: name.trim(),
      created_at: new Date().toISOString(),
      synced: 'false'
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.playersStore], 'readwrite')
      const store = transaction.objectStore(this.playersStore)
      const request = store.add(pendingPlayer)
      
      request.onsuccess = () => resolve(temporary_id)
      request.onerror = () => reject(request.error)
    })
  }

  // Get all unsynced games
  async getUnsyncedGames(): Promise<PendingGame[]> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.gamesStore], 'readonly')
      const store = transaction.objectStore(this.gamesStore)
      const index = store.index('synced')
      const request = index.openCursor(IDBKeyRange.only('false'))
      const results: PendingGame[] = []
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Get all unsynced players
  async getUnsyncedPlayers(): Promise<PendingPlayer[]> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.playersStore], 'readonly')
      const store = transaction.objectStore(this.playersStore)
      const index = store.index('synced')
      const request = index.openCursor(IDBKeyRange.only('false'))
      const results: PendingPlayer[] = []
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Mark game as synced
  async markGameAsSynced(temporaryId: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.gamesStore], 'readwrite')
      const store = transaction.objectStore(this.gamesStore)
      const request = store.get(temporaryId)
      
      request.onsuccess = () => {
        const game = request.result
        if (game) {
          game.synced = 'true'
          const updateRequest = store.put(game)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Mark player as synced
  async markPlayerAsSynced(temporaryId: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.playersStore], 'readwrite')
      const store = transaction.objectStore(this.playersStore)
      const request = store.get(temporaryId)
      
      request.onsuccess = () => {
        const player = request.result
        if (player) {
          player.synced = 'true'
          const updateRequest = store.put(player)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Get all local players (for offline play)
  async getAllLocalPlayers(): Promise<PendingPlayer[]> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.playersStore], 'readonly')
      const store = transaction.objectStore(this.playersStore)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Update game locally
  async updateGameOffline(temporaryId: string, updates: Partial<PendingGame>): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.gamesStore], 'readwrite')
      const store = transaction.objectStore(this.gamesStore)
      const request = store.get(temporaryId)
      
      request.onsuccess = () => {
        const game = request.result
        if (game) {
          Object.assign(game, updates, { synced: 'false' }) // Mark as needing sync
          const updateRequest = store.put(game)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error('Game not found'))
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Check if we have sync pending
  async hasPendingSync(): Promise<boolean> {
    const [unsyncedGames, unsyncedPlayers] = await Promise.all([
      this.getUnsyncedGames(),
      this.getUnsyncedPlayers()
    ])
    
    return unsyncedGames.length > 0 || unsyncedPlayers.length > 0
  }

  // Clear all synced data (cleanup)
  async clearSyncedData(): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.gamesStore, this.playersStore], 'readwrite')
      
      const gamesStore = transaction.objectStore(this.gamesStore)
      const playersStore = transaction.objectStore(this.playersStore)
      
      const gamesIndex = gamesStore.index('synced')
      const playersIndex = playersStore.index('synced')
      
      let completed = 0
      const checkComplete = () => {
        completed++
        if (completed === 2) resolve()
      }
      
      // Clear synced games
      const gamesCursor = gamesIndex.openCursor(IDBKeyRange.only('true'))
      gamesCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          checkComplete()
        }
      }
      
      // Clear synced players
      const playersCursor = playersIndex.openCursor(IDBKeyRange.only('true'))
      playersCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          checkComplete()
        }
      }
      
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

export const offlineStorage = new OfflineStorageService()