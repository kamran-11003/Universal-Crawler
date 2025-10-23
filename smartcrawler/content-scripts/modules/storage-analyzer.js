chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Storage Analyzer: Class registering globally'});

if (typeof window.StorageAnalyzer === 'undefined') {
class StorageAnalyzer {
  constructor() {
    this.storageData = {
      localStorage: {},
      sessionStorage: {},
      indexedDB: {},
      cacheStorage: {}
    };
    this.enabled = false;
    this.storageWatcherInterval = null;
  }

  initialize() {
    this.analyzeLocalStorage();
    this.analyzeSessionStorage();
    this.analyzeIndexedDB();
    this.analyzeCacheStorage();
    this.setupStorageWatchers();
  }

  analyzeLocalStorage() {
    try {
      const data = {
        keys: [],
        size: 0,
        quota: 10485760 // 10MB default
      };
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        data.keys.push({
          key: key,
          size: new Blob([value]).size,
          valueType: this.detectValueType(value)
        });
        data.size += new Blob([value]).size;
      }
      
      this.storageData.localStorage = data;
    } catch (error) {
      this.storageData.localStorage = { error: error.message };
    }
  }

  analyzeSessionStorage() {
    try {
      const data = {
        keys: [],
        size: 0
      };
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        data.keys.push({
          key: key,
          size: new Blob([value]).size,
          valueType: this.detectValueType(value)
        });
        data.size += new Blob([value]).size;
      }
      
      this.storageData.sessionStorage = data;
    } catch (error) {
      this.storageData.sessionStorage = { error: error.message };
    }
  }

  async analyzeIndexedDB() {
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        const databases = await indexedDB.databases();
        const data = {
          databases: databases.map(db => db.name),
          objectStores: []
        };
        
        // Note: Getting object store names requires opening each database
        // This is simplified for performance
        this.storageData.indexedDB = data;
      } else {
        this.storageData.indexedDB = { supported: false };
      }
    } catch (error) {
      this.storageData.indexedDB = { error: error.message };
    }
  }

  async analyzeCacheStorage() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        this.storageData.cacheStorage = {
          caches: cacheNames,
          count: cacheNames.length
        };
      } catch (error) {
        this.storageData.cacheStorage = { error: error.message };
      }
    } else {
      this.storageData.cacheStorage = { supported: false };
    }
  }

  setupStorageWatchers() {
    try {
      // Watch for storage events
      window.addEventListener('storage', (event) => {
        if (this.enabled) {
          this.recordStorageChange({
            type: 'localStorage',
            key: event.key,
            oldValue: event.oldValue,
            newValue: event.newValue,
            timestamp: Date.now()
          });
        }
      });

      // Watch for sessionStorage changes (polling since storage event doesn't fire for same tab)
      this.storageWatcherInterval = setInterval(() => {
        if (this.enabled) {
          this.checkForStorageChanges();
        }
      }, 1000);
    } catch (error) {
      console.warn('Storage watcher setup failed:', error);
    }
  }

  checkForStorageChanges() {
    // Simple change detection by comparing current state
    const currentLocalStorage = this.getStorageSnapshot(localStorage);
    const currentSessionStorage = this.getStorageSnapshot(sessionStorage);
    
    // Emit change events if storage has been modified
    // This is a simplified approach - in a real implementation you'd track previous state
  }

  getStorageSnapshot(storage) {
    const snapshot = {};
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        snapshot[key] = storage.getItem(key);
      }
    } catch (error) {
      console.warn('Storage snapshot failed:', error);
    }
    return snapshot;
  }

  recordStorageChange(change) {
    window.dispatchEvent(new CustomEvent('storage-change', {
      detail: change
    }));
  }

  detectValueType(value) {
    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }

  getStorageData() {
    return this.storageData;
  }

  getStorageMetrics() {
    const totalKeys = (this.storageData.localStorage.keys?.length || 0) + 
                     (this.storageData.sessionStorage.keys?.length || 0);
    
    const totalSize = (this.storageData.localStorage.size || 0) + 
                     (this.storageData.sessionStorage.size || 0);

    return {
      totalKeys,
      totalSize,
      localStorageKeys: this.storageData.localStorage.keys?.length || 0,
      sessionStorageKeys: this.storageData.sessionStorage.keys?.length || 0,
      indexedDBSupported: this.storageData.indexedDB.supported !== false,
      cacheStorageSupported: this.storageData.cacheStorage.supported !== false
    };
  }

  enable() {
    this.enabled = true;
    this.initialize();
  }

  disable() {
    this.enabled = false;
    
    if (this.storageWatcherInterval) {
      clearInterval(this.storageWatcherInterval);
      this.storageWatcherInterval = null;
    }
  }
}

window.StorageAnalyzer = StorageAnalyzer;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Storage Analyzer: Class registered globally'});
}
