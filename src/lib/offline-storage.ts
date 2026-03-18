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

export interface CachedPlayer {
  id: number // Real database ID
  name: string
  created_at: string
  cached_at: string // When it was cached locally
}

class OfflineStorageService {
  private dbName = 'huutopussi-offline'
  private gamesStore = 'pending-games'
  private playersStore = 'pending-players'
  private cachedPlayersStore = 'cached-players' // New store for remote players
  private settingsStore = 'app-settings'

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Increase version to force proper upgrade and fix any corruption
      const request = indexedDB.open(this.dbName, 2)
      
      request.onerror = () => {
        console.error('IndexedDB open error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Verify all expected stores exist
        const expectedStores = [this.gamesStore, this.playersStore, this.cachedPlayersStore, this.settingsStore]
        const missingStores = expectedStores.filter(store => !db.objectStoreNames.contains(store))
        
        if (missingStores.length > 0) {
          console.error('Missing object stores:', missingStores)
          db.close()
          // Delete and recreate database if stores are missing
          const deleteRequest = indexedDB.deleteDatabase(this.dbName)
          deleteRequest.onsuccess = () => {
            // Retry with fresh database
            this.initDB().then(resolve).catch(reject)
          }
          deleteRequest.onerror = () => reject(new Error('Failed to recreate database'))
          return
        }
        
        resolve(db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        console.log('Upgrading IndexedDB from version', event.oldVersion, 'to', event.newVersion)
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(this.gamesStore)) {
          console.log('Creating games store')
          const gamesStore = db.createObjectStore(this.gamesStore, { keyPath: 'temporary_id' })
          gamesStore.createIndex('synced', 'synced', { unique: false })
          gamesStore.createIndex('created_at', 'created_at', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(this.playersStore)) {
          console.log('Creating players store')
          const playersStore = db.createObjectStore(this.playersStore, { keyPath: 'temporary_id' })
          playersStore.createIndex('synced', 'synced', { unique: false })
          playersStore.createIndex('name', 'name', { unique: false })
        }

        if (!db.objectStoreNames.contains(this.cachedPlayersStore)) {
          console.log('Creating cached players store')
          const cachedPlayersStore = db.createObjectStore(this.cachedPlayersStore, { keyPath: 'id' })
          cachedPlayersStore.createIndex('name', 'name', { unique: false })
          cachedPlayersStore.createIndex('cached_at', 'cached_at', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(this.settingsStore)) {
          console.log('Creating settings store')
          db.createObjectStore(this.settingsStore, { keyPath: 'key' })
        }
      }
    })
  }

  // Helper method to safely execute database operations with retry
  private async executeWithRetry<T>(operation: (db: IDBDatabase) => Promise<T>, maxRetries: number = 1): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const db = await this.initDB()
        return await operation(db)
      } catch (error) {
        console.error(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // If it's an object store error, clear the database and retry
        if (error instanceof Error && error.message.includes('object store')) {
          console.log('Object store error detected, clearing database...')
          try {
            await this.clearDatabase()
          } catch (clearError) {
            console.error('Failed to clear database:', clearError)
          }
        }
      }
    }
    
    throw new Error('Database operation failed after all retries')
  }

  // Clear and recreate database
  private async clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    })
  }

  // Save game locally
  async saveGameOffline(gameData: Omit<PendingGame, 'temporary_id' | 'synced'>): Promise<string> {
    const temporary_id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pendingGame: PendingGame = {
      ...gameData,
      temporary_id,
      synced: 'false'
    }

    return this.executeWithRetry(async (db) => {
      return new Promise<string>((resolve, reject) => {
        const transaction = db.transaction([this.gamesStore], 'readwrite')
        const store = transaction.objectStore(this.gamesStore)
        const request = store.add(pendingGame)
        
        request.onsuccess = () => resolve(temporary_id)
        request.onerror = () => reject(request.error)
      })
    })
  }

  // Save player locally
  async savePlayerOffline(name: string): Promise<string> {
    const temporary_id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pendingPlayer: PendingPlayer = {
      temporary_id,
      name: name.trim(),
      created_at: new Date().toISOString(),
      synced: 'false'
    }

    return this.executeWithRetry(async (db) => {
      return new Promise<string>((resolve, reject) => {
        const transaction = db.transaction([this.playersStore], 'readwrite')
        const store = transaction.objectStore(this.playersStore)
        const request = store.add(pendingPlayer)
        
        request.onsuccess = () => resolve(temporary_id)
        request.onerror = () => reject(request.error)
      })
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

  // Delete game from offline storage
  async deleteGameOffline(temporaryId: string): Promise<void> {
    return this.executeWithRetry(async (db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.gamesStore], 'readwrite')
        const store = transaction.objectStore(this.gamesStore)
        const request = store.delete(temporaryId)
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
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

  // Cache remote players locally
  async cacheRemotePlayers(players: { id: number; name: string; created_at: string }[]): Promise<void> {
    return this.executeWithRetry(async (db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.cachedPlayersStore], 'readwrite')
        const store = transaction.objectStore(this.cachedPlayersStore)
        
        // Clear existing cached players first
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => {
          // Add new players
          let completed = 0
          const total = players.length
          
          if (total === 0) {
            resolve()
            return
          }
          
          const checkComplete = () => {
            completed++
            if (completed === total) resolve()
          }
          
          players.forEach(player => {
            const cachedPlayer: CachedPlayer = {
              ...player,
              cached_at: new Date().toISOString()
            }
            
            const addRequest = store.add(cachedPlayer)
            addRequest.onsuccess = () => checkComplete()
            addRequest.onerror = () => checkComplete() // Continue even if some fail
          })
        }
        
        clearRequest.onerror = () => reject(clearRequest.error)
        transaction.onerror = () => reject(transaction.error)
      })
    })
  }

  // Get all cached remote players
  async getCachedPlayers(): Promise<CachedPlayer[]> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.cachedPlayersStore], 'readonly')
      const store = transaction.objectStore(this.cachedPlayersStore)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Get all players (cached + pending) in a unified format
  async getAllPlayersForUI(): Promise<{ id: number; name: string; created_at: string; isLocal?: boolean }[]> {
    try {
      const [cachedPlayers, pendingPlayers] = await Promise.all([
        this.getCachedPlayers(),
        this.getAllLocalPlayers()
      ])

      const combinedPlayers: { id: number; name: string; created_at: string; isLocal?: boolean }[] = []

      // Add cached remote players
      cachedPlayers.forEach(player => {
        combinedPlayers.push({
          id: player.id,
          name: player.name,
          created_at: player.created_at
        })
      })

      // Add pending players (avoid duplicates by name)
      pendingPlayers.forEach(player => {
        const existsInCache = cachedPlayers.some(cached => 
          cached.name.toLowerCase() === player.name.toLowerCase()
        )
        
        if (!existsInCache) {
          combinedPlayers.push({
            id: Date.now() + Math.random(), // Temporary numeric ID for UI
            name: player.name,
            created_at: player.created_at,
            isLocal: true
          })
        }
      })

      // Sort by name
      return combinedPlayers.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Failed to get combined players:', error)
      return []
    }
  }

  // Check if cached data is stale (older than specified minutes)
  async isCacheStale(maxAgeMinutes: number = 60): Promise<boolean> {
    try {
      const cachedPlayers = await this.getCachedPlayers()
      
      if (cachedPlayers.length === 0) {
        return true // No cache = stale
      }
      
      // Check the newest cached player
      const newestCacheTime = Math.max(...cachedPlayers.map(p => 
        new Date(p.cached_at).getTime()
      ))
      
      const staleTime = Date.now() - (maxAgeMinutes * 60 * 1000)
      return newestCacheTime < staleTime
    } catch (error) {
      console.error('Failed to check cache staleness:', error)
      return true // Assume stale on error
    }
  }
}

export const offlineStorage = new OfflineStorageService()