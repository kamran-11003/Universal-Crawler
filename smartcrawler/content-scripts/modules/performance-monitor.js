console.log('=== PERFORMANCE MONITOR SCRIPT LOADING ===');

if (typeof window.PerformanceMonitor === 'undefined') {
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      webVitals: {},
      memory: {},
      timing: {},
      resources: [],
      navigation: {}
    };
    this.enabled = false;
    this.observers = [];
    this.collectionTimeout = null;
  }

  initialize() {
    if (this.enabled) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Initializing...'});
    
    this.collectWebVitals();
    this.collectMemoryMetrics();
    this.collectTimingMetrics();
    this.collectResourceMetrics();
    this.collectNavigationMetrics();
    
    // Set timeout to collect final metrics
    this.collectionTimeout = setTimeout(() => {
      this.collectFinalMetrics();
    }, 3000);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Initialization complete'});
  }

  collectWebVitals() {
    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.webVitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: LCP collected: ${this.metrics.webVitals.LCP}ms`});
        });
        
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.push(lcpObserver);
        } catch (error) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: LCP observer error: ${error.message}`});
        }

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.metrics.webVitals.FID = entry.processingStart - entry.startTime;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: FID collected: ${this.metrics.webVitals.FID}ms`});
          });
        });
        
        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.push(fidObserver);
        } catch (error) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: FID observer error: ${error.message}`});
        }

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
          this.metrics.webVitals.CLS = clsScore;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: CLS updated: ${this.metrics.webVitals.CLS}`});
        });
        
        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.push(clsObserver);
        } catch (error) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: CLS observer error: ${error.message}`});
        }
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Web Vitals error: ${error.message}`});
    }

    // First Contentful Paint (FCP)
    try {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.webVitals.FCP = entry.startTime;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: FCP collected: ${this.metrics.webVitals.FCP}ms`});
        }
      });
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: FCP error: ${error.message}`});
    }

    // Time to First Byte (TTFB)
    try {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        this.metrics.webVitals.TTFB = navTiming.responseStart - navTiming.requestStart;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: TTFB collected: ${this.metrics.webVitals.TTFB}ms`});
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: TTFB error: ${error.message}`});
    }
  }

  collectMemoryMetrics() {
    try {
      if (performance.memory) {
        this.metrics.memory = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        };
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Memory collected: ${this.metrics.memory.usedPercentage.toFixed(2)}% used`});
      } else {
        this.metrics.memory = {
          available: false,
          reason: 'performance.memory not available'
        };
      }
    } catch (error) {
      this.metrics.memory = {
        available: false,
        error: error.message
      };
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Memory error: ${error.message}`});
    }
  }

  collectTimingMetrics() {
    try {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        this.metrics.timing = {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
          domInteractive: navTiming.domInteractive,
          totalTime: navTiming.loadEventEnd - navTiming.fetchStart,
          domLoading: navTiming.domLoading,
          responseStart: navTiming.responseStart,
          responseEnd: navTiming.responseEnd,
          requestStart: navTiming.requestStart
        };
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Timing collected - Total: ${this.metrics.timing.totalTime}ms`});
      } else {
        this.metrics.timing = {
          available: false,
          reason: 'Navigation timing not available'
        };
      }
    } catch (error) {
      this.metrics.timing = {
        available: false,
        error: error.message
      };
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Timing error: ${error.message}`});
    }
  }

  collectResourceMetrics() {
    try {
      const resources = performance.getEntriesByType('resource');
      this.metrics.resources = resources.map((resource) => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize || 0,
        protocol: resource.nextHopProtocol || 'unknown',
        startTime: resource.startTime,
        endTime: resource.startTime + resource.duration
      }));
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: ${this.metrics.resources.length} resources collected`});
    } catch (error) {
      this.metrics.resources = [];
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Resource collection error: ${error.message}`});
    }
  }

  collectNavigationMetrics() {
    try {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        this.metrics.navigation = {
          type: navTiming.type,
          redirectCount: navTiming.redirectCount,
          redirectTime: navTiming.redirectEnd - navTiming.redirectStart,
          dnsTime: navTiming.domainLookupEnd - navTiming.domainLookupStart,
          tcpTime: navTiming.connectEnd - navTiming.connectStart,
          sslTime: navTiming.secureConnectionStart > 0 ? navTiming.connectEnd - navTiming.secureConnectionStart : 0,
          requestTime: navTiming.responseStart - navTiming.requestStart,
          responseTime: navTiming.responseEnd - navTiming.responseStart,
          domProcessingTime: navTiming.domComplete - navTiming.domLoading
        };
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Navigation metrics collected'});
      }
    } catch (error) {
      this.metrics.navigation = {
        available: false,
        error: error.message
      };
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Navigation error: ${error.message}`});
    }
  }

  collectFinalMetrics() {
    // Update memory metrics one more time
    this.collectMemoryMetrics();
    
    // Calculate performance score
    this.calculatePerformanceScore();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Final metrics collected'});
  }

  calculatePerformanceScore() {
    try {
      const webVitals = this.metrics.webVitals;
      let score = 100;
      
      // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
      if (webVitals.LCP) {
        if (webVitals.LCP > 4000) score -= 30;
        else if (webVitals.LCP > 2500) score -= 15;
      }
      
      // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
      if (webVitals.FID) {
        if (webVitals.FID > 300) score -= 25;
        else if (webVitals.FID > 100) score -= 10;
      }
      
      // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
      if (webVitals.CLS) {
        if (webVitals.CLS > 0.25) score -= 20;
        else if (webVitals.CLS > 0.1) score -= 10;
      }
      
      this.metrics.performanceScore = Math.max(0, score);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Performance score: ${this.metrics.performanceScore}`});
    } catch (error) {
      this.metrics.performanceScore = null;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Performance Monitor: Score calculation error: ${error.message}`});
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      url: window.location.href
    };
  }

  getWebVitals() {
    return this.metrics.webVitals;
  }

  getMemoryUsage() {
    return this.metrics.memory;
  }

  getPerformanceScore() {
    return this.metrics.performanceScore;
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.initialize();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Enabled'});
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    // Disconnect all observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    });
    this.observers = [];
    
    // Clear timeout
    if (this.collectionTimeout) {
      clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Performance Monitor: Disabled'});
  }

  cleanup() {
    this.disable();
    this.metrics = {
      webVitals: {},
      memory: {},
      timing: {},
      resources: [],
      navigation: {}
    };
  }
}

window.PerformanceMonitor = PerformanceMonitor;
}

console.log('=== PERFORMANCE MONITOR SCRIPT LOADED ===');
