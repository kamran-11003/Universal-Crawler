chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ERROR HANDLER SCRIPT LOADING ==='});

if (typeof window.ErrorHandler === 'undefined') {
class ErrorHandler {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.baseDelay = config.baseDelay || 1000; // ms
    this.maxDelay = config.maxDelay || 10000; // ms
    this.errorLog = [];
    this.enabled = false;
    this.retryableErrors = new Set([
      'network', 'timeout', 'connection', 'fetch', 'xhr'
    ]);
    this.nonRetryableErrors = new Set([
      'script', 'security', 'authentication', 'permission', 'syntax'
    ]);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Initialized with ${this.maxRetries} max retries, ${this.baseDelay}ms base delay`});
  }

  enable() {
    this.enabled = true;
    this.errorLog = [];
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Enabled'});
  }

  disable() {
    this.enabled = false;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Disabled'});
  }

  async executeWithRetry(operation, context = {}) {
    if (!this.enabled) {
      try {
        return await operation();
      } catch (error) {
        this.logError(error, { ...context, attempt: 0, retriesDisabled: true });
        throw error;
      }
    }

    let lastError;
    const startTime = Date.now();

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 0) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Operation succeeded on attempt ${attempt + 1} after ${duration}ms`});
        }
        
        return result;
      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Attempt ${attempt + 1} failed - ${errorType}: ${error.message}`});
        
        // Check if error is retriable
        if (!this.isRetriable(errorType)) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Non-retriable error (${errorType}) - stopping retries`});
          this.logError(error, { ...context, attempt, errorType, nonRetriable: true });
          throw error;
        }
        
        // Check if we have more attempts
        if (attempt >= this.maxRetries - 1) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: All ${this.maxRetries} retry attempts exhausted`});
          break;
        }
        
        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Waiting ${delay}ms before retry ${attempt + 2}`});
        
        // Log the error before retrying
        this.logError(error, { ...context, attempt, errorType, retrying: true, nextDelay: delay });
        
        // Wait before retry
        await this.sleep(delay);
      }
    }
    
    // All retries failed - handle final failure
    const duration = Date.now() - startTime;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: All retries failed after ${duration}ms`});
    
    return this.handleFailure(lastError, { ...context, totalDuration: duration });
  }

  categorizeError(error) {
    try {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name.toLowerCase();
      const errorString = error.toString().toLowerCase();

      // Network-related errors
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
          errorMessage.includes('connection') || errorMessage.includes('timeout') ||
          errorMessage.includes('cors') || errorMessage.includes('net::')) {
        return 'network';
      }

      // Timeout errors
      if (errorMessage.includes('timeout') || errorName.includes('timeout') ||
          errorMessage.includes('timed out')) {
        return 'timeout';
      }

      // Authentication errors
      if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') || errorMessage.includes('401') ||
          errorMessage.includes('403')) {
        return 'authentication';
      }

      // Script errors
      if (errorMessage.includes('script') || errorMessage.includes('syntax') ||
          errorName.includes('syntax') || errorName.includes('reference')) {
        return 'script';
      }

      // Security errors
      if (errorMessage.includes('security') || errorMessage.includes('permission') ||
          errorMessage.includes('blocked') || errorMessage.includes('csp')) {
        return 'security';
      }

      // XHR/Fetch specific errors
      if (errorMessage.includes('xhr') || errorMessage.includes('xmlhttprequest') ||
          errorMessage.includes('fetch')) {
        return 'fetch';
      }

      // Default to unknown
      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  isRetriable(errorType) {
    if (this.retryableErrors.has(errorType)) {
      return true;
    }
    
    if (this.nonRetryableErrors.has(errorType)) {
      return false;
    }
    
    // Default: retry unknown errors
    return true;
  }

  calculateBackoff(attempt) {
    // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attempt),
      this.maxDelay
    );
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.floor(delay + jitter);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logError(error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: this.categorizeError(error)
      },
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errorLog.push(errorEntry);
    
    // Keep only last 100 errors to prevent memory bloat
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG',
      message: `Error Handler: Logged ${errorEntry.error.type} error - ${errorEntry.error.message}`
    });
  }

  handleFailure(error, context = {}) {
    const errorType = this.categorizeError(error);
    
    // Apply graceful degradation strategies based on error type
    switch (errorType) {
      case 'network':
      case 'timeout':
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Network failure - returning null'});
        return null;
        
      case 'authentication':
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Authentication failure - returning false'});
        return false;
        
      case 'script':
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Script error - returning empty object'});
        return {};
        
      case 'security':
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Security error - returning null'});
        return null;
        
      default:
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error Handler: Unknown error type (${errorType}) - returning null`});
        return null;
    }
  }

  getMetrics() {
    if (!this.enabled) return {};

    const errorTypes = {};
    let totalErrors = 0;
    let totalRetries = 0;

    for (const entry of this.errorLog) {
      const type = entry.error.type;
      errorTypes[type] = (errorTypes[type] || 0) + 1;
      totalErrors++;
      
      if (entry.context.retrying) {
        totalRetries++;
      }
    }

    return {
      enabled: this.enabled,
      config: {
        maxRetries: this.maxRetries,
        baseDelay: this.baseDelay,
        maxDelay: this.maxDelay
      },
      statistics: {
        totalErrors: totalErrors,
        totalRetries: totalRetries,
        errorTypes: errorTypes,
        recentErrors: this.errorLog.slice(-10) // Last 10 errors
      }
    };
  }

  clearErrorLog() {
    this.errorLog = [];
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Error Handler: Error log cleared'});
  }
}

window.ErrorHandler = ErrorHandler;
}
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ERROR HANDLER SCRIPT LOADED ==='});
