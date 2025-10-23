// Adaptive Timer System
// Uses multiple signals to detect when page is truly ready
// Avoids fixed delays, adapts to page speed and framework

class AdaptiveTimer {
  constructor() {
    this.networkRequestsInFlight = 0;
    this.lastMutationTime = Date.now();
    this.domContentLoadedFired = false;
    this.loadEventFired = false;
  }

  /**
   * Wait for page to be ready using multiple signals
   * @param {string} framework - Detected framework (react, vue, angular, unknown)
   * @param {number} maxTimeout - Maximum wait time
   * @returns {Promise<string>} Signal that completed first
   */
  async waitForPageReady(framework = 'unknown', maxTimeout = null) {
    maxTimeout = maxTimeout || window.CONSTANTS?.TIMEOUTS?.PAGE_LOAD_MAX || 30000;
    
    const signals = [];
    
    // Signal 1: Network idle
    signals.push(this.waitForNetworkIdle().then(() => 'network-idle'));
    
    // Signal 2: DOMContentLoaded
    signals.push(this.waitForDOMContentLoaded().then(() => 'dom-content-loaded'));
    
    // Signal 3: DOM mutations stopped
    signals.push(this.waitForMutationsStop().then(() => 'mutations-stopped'));
    
    // Signal 4: Load event
    signals.push(this.waitForLoadEvent().then(() => 'load-event'));
    
    // Signal 5: Framework-specific timeout
    const frameworkTimeout = this.getFrameworkTimeout(framework);
    signals.push(this.createTimeout(Math.min(frameworkTimeout, maxTimeout)).then(() => 'framework-timeout'));
    
    // Signal 6: Maximum timeout (safety)
    signals.push(this.createTimeout(maxTimeout).then(() => 'max-timeout'));
    
    try {
      const winner = await Promise.race(signals);
      console.log(`✅ Page ready signal: ${winner} (framework: ${framework})`);
      return winner;
    } catch (error) {
      console.error('❌ Adaptive timer error:', error);
      return 'error';
    }
  }

  /**
   * Wait for network to be idle (no requests for 2 seconds)
   * @returns {Promise<void>}
   */
  async waitForNetworkIdle() {
    const idleTime = window.CONSTANTS?.PERFORMANCE?.NETWORK_IDLE_TIMEOUT || 2000;
    
    return new Promise((resolve) => {
      // Monitor performance entries for network activity
      const checkNetworkIdle = () => {
        const entries = performance.getEntriesByType('resource');
        const recentRequests = entries.filter(entry => {
          return (Date.now() - entry.responseEnd) < idleTime;
        });
        
        if (recentRequests.length === 0) {
          resolve();
        } else {
          setTimeout(checkNetworkIdle, 500);
        }
      };
      
      // Start checking after initial delay
      setTimeout(checkNetworkIdle, 1000);
    });
  }

  /**
   * Wait for DOMContentLoaded event
   * @returns {Promise<void>}
   */
  async waitForDOMContentLoaded() {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', () => {
        // Add buffer after DOMContentLoaded
        const buffer = window.CONSTANTS?.PERFORMANCE?.LOAD_EVENT_BUFFER || 500;
        setTimeout(resolve, buffer);
      }, { once: true });
    });
  }

  /**
   * Wait for DOM mutations to stop
   * @returns {Promise<void>}
   */
  async waitForMutationsStop() {
    const idleTime = window.CONSTANTS?.PERFORMANCE?.MUTATION_IDLE_TIMEOUT || 1000;
    
    return new Promise((resolve) => {
      let lastMutationTime = Date.now();
      
      const observer = new MutationObserver(() => {
        lastMutationTime = Date.now();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      
      const checkIdle = () => {
        const timeSinceLastMutation = Date.now() - lastMutationTime;
        
        if (timeSinceLastMutation >= idleTime) {
          observer.disconnect();
          resolve();
        } else {
          setTimeout(checkIdle, 500);
        }
      };
      
      // Start checking after initial delay
      setTimeout(checkIdle, 1000);
    });
  }

  /**
   * Wait for window load event
   * @returns {Promise<void>}
   */
  async waitForLoadEvent() {
    if (document.readyState === 'complete') {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      window.addEventListener('load', () => {
        // Add buffer after load
        const buffer = window.CONSTANTS?.PERFORMANCE?.LOAD_EVENT_BUFFER || 500;
        setTimeout(resolve, buffer);
      }, { once: true });
    });
  }

  /**
   * Get framework-specific timeout
   * @param {string} framework
   * @returns {number} Timeout in milliseconds
   */
  getFrameworkTimeout(framework) {
    const timeouts = {
      'react': window.CONSTANTS?.CRAWL?.ADAPTIVE_WAIT_REACT || 8000,
      'vue': window.CONSTANTS?.CRAWL?.ADAPTIVE_WAIT_VUE || 6000,
      'angular': window.CONSTANTS?.CRAWL?.ADAPTIVE_WAIT_ANGULAR || 7000,
      'svelte': 5000,
      'unknown': window.CONSTANTS?.CRAWL?.ADAPTIVE_WAIT_DEFAULT || 2000
    };
    
    return timeouts[framework.toLowerCase()] || timeouts['unknown'];
  }

  /**
   * Create a timeout promise
   * @param {number} ms
   * @returns {Promise<void>}
   */
  createTimeout(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Quick page ready check (for simple pages)
   * @returns {Promise<void>}
   */
  async waitForQuickReady() {
    // Just wait for DOM interactive state
    if (document.readyState !== 'loading') {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  /**
   * Detect current framework on page
   * @returns {string}
   */
  detectFramework() {
    // Check for React
    if (window.React || 
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
        document.querySelector('[data-reactroot]')) {
      return 'react';
    }
    
    // Check for Vue
    if (window.Vue || 
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || 
        document.querySelector('[data-v-]')) {
      return 'vue';
    }
    
    // Check for Angular
    if (window.ng || 
        window.getAllAngularRootElements) {
      return 'angular';
    }
    
    // Check for Svelte
    if (document.querySelector('[class*="svelte-"]')) {
      return 'svelte';
    }
    
    return 'unknown';
  }

  /**
   * Wait for page ready with auto-detected framework
   * @param {number} maxTimeout
   * @returns {Promise<string>}
   */
  async waitForPageReadyAuto(maxTimeout = null) {
    const framework = this.detectFramework();
    return this.waitForPageReady(framework, maxTimeout);
  }
}

// Export to window
window.AdaptiveTimer = AdaptiveTimer;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdaptiveTimer;
}

console.log('✅ AdaptiveTimer loaded');

