# Offline PWA Features

Your Huutopussi Tracker now supports offline functionality! Here's how it works:

## 🔄 Automatic Offline Storage

### Players

- When you add permanent players while offline, they're stored locally on your device
- When you come back online, they'll automatically sync to the database
- You can play games with local players even when offline

### Games

- Tracked games created while offline are stored in your browser's local database
- All game progress (scores, rounds, winners) is saved locally
- When you reconnect to the internet, games will automatically sync to the remote database

## 📱 Smart Sync System

### Visual Indicators

- **Online Status**: Green dot = online, Red dot = offline
- **Sync Status**: Shows when data is being synced or needs syncing
- **Offline Mode**: Components show when running in offline mode

### Auto-Sync

- Automatically syncs when you come back online
- Background sync happens without interrupting your games
- Manual sync button available for immediate synchronization

### Conflict Resolution

- Prevents duplicate players from being created
- Handles sync errors gracefully
- Shows clear status messages for any sync issues

## 🎮 Offline Gaming Features

### Game Types

1. **Quick Games**: Always work offline (stored in localStorage)
2. **Tracked Games**:
   - Online: Normal database storage
   - Offline: Local storage with sync when reconnected

### Data Storage

- Uses IndexedDB for robust offline storage
- Automatically manages storage space
- Cleans up synced data to save space

## 🛠️ Technical Details

### Browser Support

- Works with all modern browsers that support IndexedDB
- PWA features work on mobile devices
- Installable as a native-like app

### Data Sync

- Player data syncs first (games depend on players)
- Games sync after players are synchronized
- Failed syncs are retried automatically
- Clear error messages for any sync failures

## 💡 Usage Tips

1. **Best Practice**: Start tracked games while online when possible
2. **Offline Play**: All game features work offline, scores are preserved
3. **Storage**: Offline data persists until successfully synced
4. **Manual Sync**: Use the sync button if automatic sync doesn't trigger
5. **Network Issues**: App continues working during poor connectivity

Your game progress is never lost, whether you're online or offline!
