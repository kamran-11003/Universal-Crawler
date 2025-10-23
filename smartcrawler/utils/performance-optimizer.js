chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== PERFORMANCE OPTIMIZER SCRIPT LOADING ==='});

if (typeof window.PerformanceOptimizer === 'undefined') {
class PerformanceOptimizer {
  constructor(config = {}) {
    this.memoryLimit = config.memoryLimit || (window.CONSTANTS?.MEMORY?.LIMIT_MB || 1024); // MB - now 1GB default
    this.checkpointInterval = config.checkpointInterval || (window.CONSTANTS?.MEMORY?.EXPORT_EVERY_NODES || 100); // nodes
    this.gcThreshold = config.gcThreshold || (window.CONSTANTS?.MEMORY?.WARNING_THRESHOLD || 0.8); // 80% of limit
    this.enabled = false;
    this.crawler = null; // Will be set by crawler
    
    this.metrics = {
      memoryUsage: [],
      cpuUsage: [],
      operationTimes: [],
      gcTriggers: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.operationTimers = new Map();
    this.lastGCTime = 0; // Track last GC time to prevent aggressive cleanup
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Initialized with ${this.memoryLimit}MB memory limit`});
  }

  enable() {
    this.enabled = true;
    this.startMonitoring();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Enabled'});
  }

  disable() {
    this.enabled = false;
    this.stopMonitoring();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Disabled'});
  }

  async checkMemoryUsage() {
    if (!this.enabled) return;

    try {
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
        const totalMB = performance.memory.totalJSHeapSize / (1024 * 1024);
        const limitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
        
        const memoryInfo = {
          used: usedMB,
          total: totalMB,
          limit: limitMB,
          timestamp: Date.now()
        };
        
        this.metrics.memoryUsage.push(memoryInfo);
        
        // Keep only last 50 measurements
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
        }
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`});
        
        // Check if we need to trigger garbage collection (less aggressive)
        // Only trigger if we exceed threshold AND haven't triggered recently
        const now = Date.now();
        const timeSinceLastGC = now - (this.lastGCTime || 0);
        const minGCInterval = 30000; // Minimum 30 seconds between GC triggers
        
        if (usedMB > this.memoryLimit * this.gcThreshold && timeSinceLastGC > minGCInterval) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Memory threshold exceeded (${usedMB.toFixed(2)}MB > ${(this.memoryLimit * this.gcThreshold).toFixed(2)}MB) - triggering GC`});
          this.lastGCTime = now;
          await this.performGarbageCollection();
        }
        
        return memoryInfo;
      } else {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Memory API not available'});
        return null;
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error checking memory: ${error.message}`});
      return null;
    }
  }

  async performGarbageCollection() {
    if (!this.enabled) return;

    try {
      this.metrics.gcTriggers++;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Starting garbage collection (trigger #${this.metrics.gcTriggers})`});
      
      // Clear DOM caches
      this.clearDOMReferences();
      
      // Optimize cache
      this.optimizeCache();
      
      // Clear old metrics data
      this.cleanupMetrics();
      
      // Remove old references
      this.clearOldReferences();
      
      // Note: window.gc() is not available in production Chrome builds
      // Instead, we rely on browser's automatic GC by clearing references
      // and allowing the event loop to handle garbage collection naturally
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Memory cleanup completed (browser GC will run automatically)'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error during GC: ${error.message}`});
    }
  }

  async processIncremental(items, processor, batchSize = 10) {
    if (!this.enabled) {
      // Process all at once if optimization is disabled
      return await Promise.all(items.map(processor));
    }

    const results = [];
    const totalBatches = Math.ceil(items.length / batchSize);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Processing ${items.length} items in ${totalBatches} batches of ${batchSize}`});
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Processing batch ${batchNumber}/${totalBatches}`});
      
      // Process batch
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
      
      // Check memory after each batch
      await this.checkMemoryUsage();
      
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  clearDOMReferences() {
    try {
      // Clear cached DOM elements
      this.cache.clear();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Cleared DOM cache'});
      
      // Clear operation timers
      this.operationTimers.clear();
      
      // Clear any stored DOM references in modules
      if (window.IntelligentSampler && window.IntelligentSampler.prototype) {
        // Clear sampling cache if available
        const sampler = window.IntelligentSampler;
        if (sampler.clearCache) {
          sampler.clearCache();
        }
      }
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error clearing DOM references: ${error.message}`});
    }
  }

  optimizeCache() {
    try {
      if (this.cache.size > this.maxCacheSize) {
        // Remove oldest entries (LRU eviction)
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
        for (const [key] of toRemove) {
          this.cache.delete(key);
        }
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Evicted ${toRemove.length} cache entries`});
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error optimizing cache: ${error.message}`});
    }
  }

  cleanupMetrics() {
    try {
      // Keep only recent metrics
      const maxEntries = 100;
      
      if (this.metrics.memoryUsage.length > maxEntries) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxEntries);
      }
      
      if (this.metrics.operationTimes.length > maxEntries) {
        this.metrics.operationTimes = this.metrics.operationTimes.slice(-maxEntries);
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Cleaned up old metrics'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error cleaning metrics: ${error.message}`});
    }
  }

  clearOldReferences() {
    try {
      // Clear any global references that might be holding memory
      if (window.performance && window.performance.clearResourceTimings) {
        window.performance.clearResourceTimings();
      }
      
      // Clear any stored event listeners or timers
      // This is a placeholder for any cleanup needed by other modules
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Cleared old references'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Error clearing references: ${error.message}`});
    }
  }

  measureOperation(name, operation) {
    if (!this.enabled) {
      return operation();
    }

    const startTime = performance.now();
    this.operationTimers.set(name, startTime);
    
    return Promise.resolve(operation()).then(
      (result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.operationTimes.push({
          name: name,
          duration: duration,
          timestamp: Date.now()
        });
        
        // Keep only last 50 operations
        if (this.metrics.operationTimes.length > 50) {
          this.metrics.operationTimes = this.metrics.operationTimes.slice(-50);
        }
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Operation '${name}' took ${duration.toFixed(2)}ms`});
        
        this.operationTimers.delete(name);
        return result;
      },
      (error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Optimizer: Operation '${name}' failed after ${duration.toFixed(2)}ms: ${error.message}`});
        
        this.operationTimers.delete(name);
        throw error;
      }
    );
  }

  startMonitoring() {
    if (!this.enabled) return;
    
    // Monitor memory every 30 seconds
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Monitoring started'});
  }

  stopMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Monitoring stopped'});
  }

  cleanup() {
    if (!this.enabled) return;
    
    this.stopMonitoring();
    this.clearDOMReferences();
    this.cache.clear();
    this.operationTimers.clear();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Optimizer: Final cleanup completed'});
  }

  getMetrics() {
    if (!this.enabled) return {};

    const currentMemory = performance.memory ? {
      used: performance.memory.usedJSHeapSize / (1024 * 1024),
      total: performance.memory.totalJSHeapSize / (1024 * 1024),
      limit: performance.memory.jsHeapSizeLimit / (1024 * 1024)
    } : null;

    // Calculate cache hit rate
    const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheAccess > 0 ? (this.metrics.cacheHits / totalCacheAccess) : 0;

    // Calculate average operation time
    const avgOperationTime = this.metrics.operationTimes.length > 0
      ? this.metrics.operationTimes.reduce((sum, op) => sum + op.duration, 0) / this.metrics.operationTimes.length
      : 0;

    return {
      enabled: this.enabled,
      config: {
        memoryLimit: this.memoryLimit,
        gcThreshold: this.gcThreshold,
        maxCacheSize: this.maxCacheSize
      },
      currentMemory: currentMemory,
      statistics: {
        gcTriggers: this.metrics.gcTriggers,
        cacheHitRate: cacheHitRate,
        cacheHits: this.metrics.cacheHits,
        cacheMisses: this.metrics.cacheMisses,
        avgOperationTime: avgOperationTime,
        totalOperations: this.metrics.operationTimes.length
      },
      recentMetrics: {
        memoryUsage: this.metrics.memoryUsage.slice(-10),
        operationTimes: this.metrics.operationTimes.slice(-10)
      }
    };
  }

  /**
   * Check memory and trigger incremental export if needed
   */
  async checkMemoryAndExport() {
    if (!this.enabled || !this.crawler) return;

    try {
      const memoryInfo = await this.checkMemoryUsage();
      if (!memoryInfo) return;

      const usagePercent = memoryInfo.used / this.memoryLimit;
      
      if (usagePercent >= this.gcThreshold) {
        console.log(`⚠️ Memory at ${(usagePercent * 100).toFixed(1)}% - triggering incremental export`);
        await this.exportIncrementalState();
      }
    } catch (error) {
      console.error('❌ Memory check and export failed:', error);
    }
  }

  /**
   * Export current state incrementally to prevent data loss
   */
  async exportIncrementalState() {
    if (!this.crawler) return;

    try {
      console.log('📤 Exporting incremental state...');
      
      // Get current crawler state
      const state = this.crawler.graph ? {
        nodes: Array.from(this.crawler.graph.nodes?.values() || []),
        edges: Array.from(this.crawler.graph.edges?.values() || []),
        visited: Array.from(this.crawler.visited || []),
        currentDepth: this.crawler.currentDepth,
        timestamp: Date.now()
      } : null;

      if (state) {
        // Save to chrome storage
        await chrome.storage.local.set({
          incrementalBackup: state,
          backupTimestamp: Date.now()
        });
        
        console.log(`✅ Incremental state exported: ${state.nodes.length} nodes, ${state.edges.length} edges`);
      }
    } catch (error) {
      console.error('❌ Incremental export failed:', error);
    }
  }

  /**
   * Prune similar/duplicate nodes from graph
   * @param {number} similarityThreshold - Similarity threshold (0-1)
   */
  pruneGraph(similarityThreshold = 0.85) {
    if (!this.crawler || !this.crawler.graph) return;

    try {
      console.log(`🔍 Pruning graph with similarity threshold: ${similarityThreshold}`);
      
      const nodes = Array.from(this.crawler.graph.nodes?.values() || []);
      const toRemove = [];
      
      // Compare each node with others
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const similarity = this.calculateSimilarity(nodes[i], nodes[j]);
          if (similarity >= similarityThreshold) {
            toRemove.push(nodes[j].hash);
          }
        }
      }
      
      // Remove duplicate nodes
      if (this.crawler.graph.removeNode) {
        toRemove.forEach(hash => {
          this.crawler.graph.removeNode(hash);
        });
      }
      
      console.log(`✅ Pruned ${toRemove.length} similar nodes from graph`);
      return toRemove.length;
    } catch (error) {
      console.error('❌ Graph pruning failed:', error);
      return 0;
    }
  }

  /**
   * Calculate similarity between two nodes
   * @param {Object} node1
   * @param {Object} node2
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(node1, node2) {
    try {
      // Compare URLs
      if (node1.url === node2.url) return 1.0;
      
      // Compare titles
      const titleSimilarity = this.stringSimilarity(node1.title || '', node2.title || '');
      
      // Compare feature counts
      const features1 = node1.features || {};
      const features2 = node2.features || {};
      
      const linkDiff = Math.abs((features1.linkCount || 0) - (features2.linkCount || 0));
      const formDiff = Math.abs((features1.formCount || 0) - (features2.formCount || 0));
      
      const featureSimilarity = 1 - ((linkDiff + formDiff) / 100);
      
      // Weighted average
      return (titleSimilarity * 0.7) + (featureSimilarity * 0.3);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   * @param {string} str1
   * @param {string} str2
   * @returns {number} Similarity score (0-1)
   */
  stringSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1
   * @param {string} str2
   * @returns {number}
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Set crawler reference for export and pruning
   * @param {Object} crawler
   */
  setCrawler(crawler) {
    this.crawler = crawler;
    console.log('✅ Performance optimizer linked to crawler');
  }
}

window.PerformanceOptimizer = PerformanceOptimizer;
}
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== PERFORMANCE OPTIMIZER SCRIPT LOADED ==='});
