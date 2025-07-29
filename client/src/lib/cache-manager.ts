import { queryClient } from './queryClient';

export interface CacheConfig {
  // Auto clear cache every X minutes (default: 30 minutes)
  autoCleanupInterval: number;
  // Clear cache when user is idle for X minutes (default: 10 minutes)
  idleCleanupDelay: number;
  // Clear cache when memory usage is high
  memoryThreshold: number;
  // Enable/disable auto cleanup
  enabled: boolean;
}

class CacheManager {
  private config: CacheConfig = {
    autoCleanupInterval: 30 * 60 * 1000, // 30 minutes
    idleCleanupDelay: 10 * 60 * 1000, // 10 minutes
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enabled: true
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    if (this.config.enabled) {
      this.initialize();
    }
  }

  private initialize() {
    // Start auto cleanup timer
    this.startAutoCleanup();
    
    // Monitor user activity for idle cleanup
    this.setupIdleMonitoring();
    
    // Monitor memory usage (browser only)
    if (typeof window !== 'undefined') {
      this.setupMemoryMonitoring();
    }

    // Clear cache on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearCache();
      });
    }
  }

  private startAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.clearCache();

    }, this.config.autoCleanupInterval);
  }

  private setupIdleMonitoring() {
    const resetIdleTimer = () => {
      this.lastActivity = Date.now();
      
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      this.idleTimer = setTimeout(() => {
        this.clearCache();

      }, this.config.idleCleanupDelay);
    };

    if (typeof window !== 'undefined') {
      // Monitor user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        window.addEventListener(event, resetIdleTimer, { passive: true });
      });

      // Initial timer setup
      resetIdleTimer();
    }
  }

  private setupMemoryMonitoring() {
    if ('memory' in performance && (performance as any).memory) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        if (memInfo?.usedJSHeapSize > this.config.memoryThreshold) {
          this.clearCache();
        }
      }, 60000); // Check every minute
    }
  }

  public clearCache() {
    try {
      // Clear React Query cache
      queryClient.clear();
      
      // Clear browser caches if available
      if (typeof window !== 'undefined') {
        // Clear localStorage (selective - only cache-related items)
        this.clearSelectiveStorage('localStorage');
        
        // Clear sessionStorage (selective - only cache-related items)
        this.clearSelectiveStorage('sessionStorage');
        
        // Clear browser cache if Service Worker is available
        this.clearBrowserCache();
      }
      

    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private clearSelectiveStorage(storageType: 'localStorage' | 'sessionStorage') {
    try {
      const storage = window[storageType];
      const keysToRemove: string[] = [];
      
      // Only remove cache-related keys, preserve important user data
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && (
          key.includes('cache') ||
          key.includes('query') ||
          key.includes('temp') ||
          key.startsWith('REACT_QUERY_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn(`Failed to clear ${storageType}:`, error);
    }
  }

  private async clearBrowserCache() {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.warn('Failed to clear browser cache:', error);
      }
    }
  }

  public forceCleanup() {
    this.clearCache();
  }

  public updateConfig(newConfig: Partial<CacheConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled) {
      // Restart with new config
      this.cleanup();
      this.initialize();
    } else {
      this.cleanup();
    }
  }

  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  public getCacheStats() {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.observers.length > 0).length,
      lastActivity: this.lastActivity,
      memoryUsage: typeof window !== 'undefined' && 'memory' in performance 
        ? (performance as any).memory 
        : null
    };
  }

  private cleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  public destroy() {
    this.cleanup();
  }
}

// Create and export the cache manager instance
export const cacheManager = new CacheManager({
  autoCleanupInterval: 30 * 60 * 1000, // 30 minutes
  idleCleanupDelay: 10 * 60 * 1000, // 10 minutes
  enabled: true
});

// Hook for React components to use cache manager
export function useCacheManager() {
  return {
    clearCache: () => cacheManager.clearCache(),
    forceCleanup: () => cacheManager.forceCleanup(),
    getStats: () => cacheManager.getCacheStats(),
    updateConfig: (config: Partial<CacheConfig>) => cacheManager.updateConfig(config)
  };
}