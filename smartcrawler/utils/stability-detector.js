chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== STABILITY DETECTOR SCRIPT LOADING ==='});

if (typeof window.StabilityDetector === 'undefined') {
class StabilityDetector {
  constructor(config = {}) {
    this.networkThreshold = config.networkThreshold || 2000; // ms
    this.domThreshold = config.domThreshold || 1500; // ms
    this.mutationThreshold = config.mutationThreshold || 5; // per second
    this.performanceThreshold = config.performanceThreshold || 100; // ms
    this.timeout = config.timeout || 30000; // max wait
    this.enabled = false;
    
    this.mutationObserver = null;
    this.performanceObserver = null;
    this.mutationCount = 0;
    this.lastMutationTime = 0;
    this.networkRequestCount = 0;
    this.lastNetworkTime = 0;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Initialized with ${this.networkThreshold}ms network threshold`});
  }

  enable() {
    this.enabled = true;
    this.resetCounters();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Enabled'});
  }

  disable() {
    this.enabled = false;
    this.cleanup();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Disabled'});
  }

  async waitForStability(options = {}) {
    if (!this.enabled) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Not enabled - using fallback wait'});
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }

    const strictMode = options.strict !== false; // Default true
    const timeout = options.timeout || this.timeout;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Starting stability check (strict: ${strictMode}, timeout: ${timeout}ms)`});

    try {
      this.resetCounters();
      this.startMonitoring();

      const checks = [
        this.waitForNetworkIdle(),
        this.waitForDOMStable(),
        this.waitForMutationQuiet(),
        this.waitForPerformanceIdle()
      ];

      let result;
      if (strictMode) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Using strict mode - all checks must pass'});
        result = await Promise.all(checks);
      } else {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Using race mode - any check can pass'});
        result = await Promise.race(checks);
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Stability achieved'});
      return result;

    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Error during stability check: ${error.message}`});
      // Fallback to simple timeout
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      this.cleanup();
    }
  }

  startMonitoring() {
    // Monitor DOM mutations
    this.mutationObserver = new MutationObserver((mutations) => {
      this.mutationCount += mutations.length;
      this.lastMutationTime = Date.now();
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    // Monitor performance entries
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.networkRequestCount++;
            this.lastNetworkTime = Date.now();
          }
        }
      });
      this.performanceObserver.observe({ entryTypes: ['resource', 'measure'] });
    }

    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Monitoring started'});
  }

  async waitForNetworkIdle() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100;
      let lastRequestTime = this.lastNetworkTime;

      const checkNetwork = () => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        // Check if enough time has passed since last network request
        if (timeSinceLastRequest >= this.networkThreshold) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Network idle detected (${timeSinceLastRequest}ms since last request)`});
          resolve({ type: 'network', duration: timeSinceLastRequest });
          return;
        }

        // Check timeout
        if (now - startTime > this.timeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Network idle timeout reached'});
          reject(new Error('Network idle timeout'));
          return;
        }

        // Update last request time if we see new activity
        if (this.lastNetworkTime > lastRequestTime) {
          lastRequestTime = this.lastNetworkTime;
        }

        setTimeout(checkNetwork, checkInterval);
      };

      checkNetwork();
    });
  }

  async waitForDOMStable() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100;
      let lastReadyStateChange = Date.now();

      const checkDOM = () => {
        const now = Date.now();
        const timeSinceChange = now - lastReadyStateChange;

        // Check if document is ready and stable
        if (document.readyState === 'complete' && timeSinceChange >= this.domThreshold) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: DOM stable detected (${timeSinceChange}ms since last change)`});
          resolve({ type: 'dom', duration: timeSinceChange, readyState: document.readyState });
          return;
        }

        // Check timeout
        if (now - startTime > this.timeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: DOM stable timeout reached'});
          reject(new Error('DOM stable timeout'));
          return;
        }

        // Update change time if readyState changed
        if (document.readyState !== 'complete') {
          lastReadyStateChange = now;
        }

        setTimeout(checkDOM, checkInterval);
      };

      checkDOM();
    });
  }

  async waitForMutationQuiet() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 1000; // Check every second
      let lastMutationCheck = startTime;
      let lastMutationCount = 0;

      const checkMutations = () => {
        const now = Date.now();
        const timeSinceLastCheck = now - lastMutationCheck;
        const mutationsSinceLastCheck = this.mutationCount - lastMutationCount;
        const mutationRate = mutationsSinceLastCheck / (timeSinceLastCheck / 1000);

        // Check if mutation rate is below threshold
        if (mutationRate < this.mutationThreshold) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Mutation quiet detected (${mutationRate.toFixed(2)} mutations/sec)`});
          resolve({ type: 'mutation', rate: mutationRate, totalMutations: this.mutationCount });
          return;
        }

        // Check timeout
        if (now - startTime > this.timeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Mutation quiet timeout reached'});
          reject(new Error('Mutation quiet timeout'));
          return;
        }

        lastMutationCheck = now;
        lastMutationCount = this.mutationCount;

        setTimeout(checkMutations, checkInterval);
      };

      checkMutations();
    });
  }

  async waitForPerformanceIdle() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100;
      let longTaskDetected = false;

      // Monitor for long tasks
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > this.performanceThreshold) {
              longTaskDetected = true;
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Stability Detector: Long task detected (${entry.duration}ms)`});
            }
          }
        });

        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // Long task API not supported
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Long task API not supported'});
        }
      }

      const checkPerformance = () => {
        const now = Date.now();
        const timeSinceStart = now - startTime;

        // If no long tasks detected for a while, consider idle
        if (!longTaskDetected && timeSinceStart > 1000) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Performance idle detected'});
          resolve({ type: 'performance', duration: timeSinceStart });
          return;
        }

        // Check timeout
        if (timeSinceStart > this.timeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Performance idle timeout reached'});
          reject(new Error('Performance idle timeout'));
          return;
        }

        longTaskDetected = false; // Reset for next check
        setTimeout(checkPerformance, checkInterval);
      };

      checkPerformance();
    });
  }

  resetCounters() {
    this.mutationCount = 0;
    this.lastMutationTime = Date.now();
    this.networkRequestCount = 0;
    this.lastNetworkTime = Date.now();
  }

  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stability Detector: Cleanup completed'});
  }

  getMetrics() {
    if (!this.enabled) return {};

    return {
      enabled: this.enabled,
      thresholds: {
        network: this.networkThreshold,
        dom: this.domThreshold,
        mutation: this.mutationThreshold,
        performance: this.performanceThreshold
      },
      currentState: {
        mutationCount: this.mutationCount,
        networkRequestCount: this.networkRequestCount,
        documentReadyState: document.readyState,
        lastMutationTime: this.lastMutationTime,
        lastNetworkTime: this.lastNetworkTime
      }
    };
  }
}

window.StabilityDetector = StabilityDetector;
}
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== STABILITY DETECTOR SCRIPT LOADED ==='});
