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
  saveGameOffline: (gameData: any) => Promise<string>
  savePlayerOffline: (name: string) => Promise<string>
  updateGameOffline: (gameId: string, updates: any) => Promise<void>
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

  const value: OfflineContextType = {
    isOnline,
    syncStatus,
    hasPendingSync,
    manualSync,
    saveGameOffline,
    savePlayerOffline,
    updateGameOffline,
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
