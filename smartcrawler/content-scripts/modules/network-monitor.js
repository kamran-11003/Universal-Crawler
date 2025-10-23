chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Network Monitor: Class registering globally'});

if (typeof window.NetworkMonitor === 'undefined') {
class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.wsConnections = [];
    this.enabled = false;
    this.maxRequests = 500; // Limit stored requests
    this.originalFetch = null;
    this.originalXHROpen = null;
    this.originalXHRSend = null;
  }

  initialize() {
    this.interceptFetch();
    this.interceptXHR();
    this.trackResourceTiming();
  }

  interceptFetch() {
    this.originalFetch = window.fetch;
    const monitor = this;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      const options = args[1] || {};
      
      try {
        const response = await monitor.originalFetch(...args);
        const endTime = performance.now();
        
        monitor.recordRequest({
          url: url,
          method: options.method || 'GET',
          type: 'fetch',
          status: response.status,
          statusText: response.statusText,
          responseTime: endTime - startTime,
          size: response.headers.get('content-length') || 0,
          contentType: response.headers.get('content-type'),
          timestamp: Date.now(),
          headers: monitor.extractHeaders(response.headers),
          cors: response.type === 'cors'
        });
        
        return response;
      } catch (error) {
        monitor.recordRequest({
          url: url,
          method: options.method || 'GET',
          type: 'fetch',
          status: 0,
          error: error.message,
          responseTime: performance.now() - startTime,
          timestamp: Date.now()
        });
        throw error;
      }
    };
  }

  interceptXHR() {
    const monitor = this;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._networkMonitor = { method, url, startTime: performance.now() };
      return monitor.originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
      const monitorData = this._networkMonitor;
      
      this.addEventListener('load', () => {
        if (window.networkMonitorInstance?.enabled) {
          window.networkMonitorInstance.recordRequest({
            url: monitorData.url,
            method: monitorData.method,
            type: 'xhr',
            status: this.status,
            statusText: this.statusText,
            responseTime: performance.now() - monitorData.startTime,
            size: this.response?.length || 0,
            contentType: this.getResponseHeader('content-type'),
            timestamp: Date.now()
          });
        }
      });
      
      this.addEventListener('error', () => {
        if (window.networkMonitorInstance?.enabled) {
          window.networkMonitorInstance.recordRequest({
            url: monitorData.url,
            method: monitorData.method,
            type: 'xhr',
            status: 0,
            error: 'Network error',
            responseTime: performance.now() - monitorData.startTime,
            timestamp: Date.now()
          });
        }
      });
      
      return monitor.originalXHRSend.apply(this, arguments);
    };
  }

  trackResourceTiming() {
    const monitor = this;
    
    try {
      const observer = new PerformanceObserver((list) => {
        if (!monitor.enabled) return;
        
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            monitor.recordRequest({
              url: entry.name,
              type: 'resource',
              resourceType: entry.initiatorType,
              responseTime: entry.duration,
              size: entry.transferSize,
              timestamp: Date.now(),
              timing: {
                dns: entry.domainLookupEnd - entry.domainLookupStart,
                tcp: entry.connectEnd - entry.connectStart,
                request: entry.responseStart - entry.requestStart,
                response: entry.responseEnd - entry.responseStart
              }
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  recordRequest(request) {
    if (!this.enabled) return;
    
    // Categorize request
    request.category = this.categorizeRequest(request.url);
    
    this.requests.push(request);
    
    // Limit stored requests
    if (this.requests.length > this.maxRequests) {
      this.requests.shift();
    }
    
    // Emit event for crawler
    window.dispatchEvent(new CustomEvent('network-request', {
      detail: request
    }));
  }

  categorizeRequest(url) {
    if (url.includes('/api/') || url.includes('/graphql')) return 'api';
    if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/i)) return 'static';
    if (!url.startsWith(window.location.origin)) return 'third-party';
    return 'navigation';
  }

  extractHeaders(headers) {
    const headerObj = {};
    try {
      for (const [key, value] of headers.entries()) {
        headerObj[key] = value;
      }
    } catch (error) {
      console.warn('Could not extract headers:', error);
    }
    return headerObj;
  }

  getRequests() {
    return this.requests;
  }

  getMetrics() {
    return {
      totalRequests: this.requests.length,
      byCategory: this.groupByCategory(),
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      requests: this.requests
    };
  }

  groupByCategory() {
    const grouped = {};
    this.requests.forEach(req => {
      grouped[req.category] = (grouped[req.category] || 0) + 1;
    });
    return grouped;
  }

  calculateAverageResponseTime() {
    if (this.requests.length === 0) return 0;
    const sum = this.requests.reduce((acc, req) => acc + (req.responseTime || 0), 0);
    return sum / this.requests.length;
  }

  calculateErrorRate() {
    if (this.requests.length === 0) return 0;
    const errors = this.requests.filter(req => req.status >= 400 || req.error).length;
    return (errors / this.requests.length) * 100;
  }

  enable() {
    this.enabled = true;
    this.initialize();
    window.networkMonitorInstance = this;
  }

  disable() {
    this.enabled = false;
    window.networkMonitorInstance = null;
    
    // Restore original functions if they were intercepted
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }
  }
}

window.NetworkMonitor = NetworkMonitor;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Network Monitor: Class registered globally'});
}
