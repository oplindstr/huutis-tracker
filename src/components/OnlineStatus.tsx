'use client'

import { useOffline } from '@/contexts/OfflineContext'

export function OnlineStatus() {
  const { isOnline, syncStatus, hasPendingSync, manualSync } = useOffline()

  const handleSync = async () => {
    if (!syncStatus.inProgress) {
      try {
        await manualSync()
      } catch (error) {
        console.error('Sync failed:', error)
      }
    }
  }

  return (
    <div className='fixed top-4 right-4 z-50'>
      {/* Online/Offline indicator */}
      <div className='flex items-center gap-2 mb-2'>
        <div
          className={`w-3 h-3 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className='text-sm font-medium text-gray-700'>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync status */}
      {(hasPendingSync || syncStatus.inProgress) && (
        <div className='bg-white rounded-lg shadow-lg p-3 max-w-sm'>
          {syncStatus.inProgress ? (
            <div className='flex items-center gap-2'>
              <div className='animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full' />
              <div className='text-sm'>
                <div className='font-medium text-gray-900'>Syncing...</div>
                <div className='text-gray-600'>
                  {syncStatus.syncedItems} / {syncStatus.totalItems}
                </div>
              </div>
            </div>
          ) : hasPendingSync && isOnline ? (
            <div className='flex items-center justify-between'>
              <div className='text-sm'>
                <div className='font-medium text-gray-900'>Sync pending</div>
                <div className='text-gray-600'>Tap to sync now</div>
              </div>
              <button
                onClick={handleSync}
                className='bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors'
              >
                Sync
              </button>
            </div>
          ) : hasPendingSync && !isOnline ? (
            <div className='text-sm'>
              <div className='font-medium text-gray-900'>Offline changes</div>
              <div className='text-gray-600'>Will sync when online</div>
            </div>
          ) : null}

          {/* Error messages */}
          {syncStatus.errors.length > 0 && (
            <div className='mt-2 pt-2 border-t'>
              <div className='text-sm font-medium text-red-700 mb-1'>
                Sync errors:
              </div>
              {syncStatus.errors.slice(-3).map((error, index) => (
                <div key={index} className='text-xs text-red-600'>
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
