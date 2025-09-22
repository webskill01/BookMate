// src/services/offlineService.js - NEW FILE
export class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingActions = this.loadPendingActions();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Queue actions when offline
  queueAction(action) {
    if (this.isOnline) return null;
    
    this.pendingActions.push({
      ...action,
      timestamp: Date.now(),
      id: `offline_${Date.now()}`
    });
    
    localStorage.setItem('pendingActions', JSON.stringify(this.pendingActions));
    return action.id;
  }

  // Sync when back online
  async syncPendingActions() {
    // Implementation for syncing offline actions
  }
}
