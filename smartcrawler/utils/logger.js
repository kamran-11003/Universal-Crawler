// Enhanced Logging System for SmartCrawler
// Replaces console.log with structured logging and export functionality

class Logger {
  constructor(componentName = 'Unknown') {
    this.componentName = componentName;
    this.buffer = [];
    this.bufferLimit = 10; // Send to background after 10 messages
    this.enabled = {
      DEBUG: true,
      INFO: true,
      WARN: true,
      ERROR: true
    };
    this.allLogs = []; // Keep all logs for export
    this.maxLogs = 1000; // Limit stored logs to prevent memory issues
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level
   * @param {Array} args
   * @returns {string}
   */
  formatMessage(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    return `[${timestamp}] [${level}] [${this.componentName}] ${message}`;
  }

  /**
   * Internal log method
   * @param {string} level
   * @param {Array} args
   */
  _log(level, ...args) {
    if (!this.enabled[level]) return;
    
    const formattedMessage = this.formatMessage(level, args);
    
    // Add to buffer
    this.buffer.push({
      level,
      component: this.componentName,
      message: formattedMessage,
      timestamp: Date.now(),
      args: args
    });
    
    // Add to all logs (for export)
    this.allLogs.push({
      level,
      component: this.componentName,
      message: formattedMessage,
      timestamp: Date.now(),
      args: args
    });
    
    // Trim all logs if exceeding limit
    if (this.allLogs.length > this.maxLogs) {
      this.allLogs = this.allLogs.slice(-this.maxLogs);
    }
    
    // Console output (with appropriate method)
    const consoleMethod = level === 'ERROR' ? console.error :
                         level === 'WARN' ? console.warn :
                         level === 'DEBUG' ? console.debug :
                         console.log;
    consoleMethod(formattedMessage);
    
    // Flush buffer if limit reached
    if (this.buffer.length >= this.bufferLimit) {
      this.flush();
    }
  }

  /**
   * Debug level logging
   * @param {...any} args
   */
  debug(...args) {
    this._log('DEBUG', ...args);
  }

  /**
   * Info level logging
   * @param {...any} args
   */
  info(...args) {
    this._log('INFO', ...args);
  }

  /**
   * Warning level logging
   * @param {...any} args
   */
  warn(...args) {
    this._log('WARN', ...args);
  }

  /**
   * Error level logging
   * @param {...any} args
   */
  error(...args) {
    this._log('ERROR', ...args);
  }

  /**
   * Flush buffer to background (send via chrome.runtime.sendMessage)
   */
  flush() {
    if (this.buffer.length === 0) return;
    
    const logsToSend = [...this.buffer];
    this.buffer = [];
    
    try {
      chrome.runtime.sendMessage({
        type: 'LOGGER_FLUSH',
        logs: logsToSend
      });
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  /**
   * Enable/disable specific log level
   * @param {string} level
   * @param {boolean} enabled
   */
  setLevel(level, enabled) {
    if (this.enabled.hasOwnProperty(level)) {
      this.enabled[level] = enabled;
    }
  }

  /**
   * Enable all log levels
   */
  enableAll() {
    Object.keys(this.enabled).forEach(level => {
      this.enabled[level] = true;
    });
  }

  /**
   * Disable all log levels
   */
  disableAll() {
    Object.keys(this.enabled).forEach(level => {
      this.enabled[level] = false;
    });
  }

  /**
   * Export logs as JSON file
   * @param {string} filename
   */
  exportLogs(filename = 'smartcrawler-logs.json') {
    const logData = {
      component: this.componentName,
      exportTime: new Date().toISOString(),
      totalLogs: this.allLogs.length,
      logs: this.allLogs
    };
    
    const dataStr = JSON.stringify(logData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    
    this.info(`Logs exported to ${filename}`);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.allLogs = [];
    this.buffer = [];
    this.info('Logs cleared');
  }

  /**
   * Get log statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      total: this.allLogs.length,
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0
    };
    
    this.allLogs.forEach(log => {
      if (stats.hasOwnProperty(log.level)) {
        stats[log.level]++;
      }
    });
    
    return stats;
  }

  /**
   * Filter logs by level
   * @param {string} level
   * @returns {Array}
   */
  filterByLevel(level) {
    return this.allLogs.filter(log => log.level === level);
  }

  /**
   * Get logs within time range
   * @param {number} startTime - Unix timestamp
   * @param {number} endTime - Unix timestamp
   * @returns {Array}
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.allLogs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }
}

// Create global logger instance for backward compatibility
window.Logger = Logger;

// Create a default logger
if (typeof window.logger === 'undefined') {
  window.logger = new Logger('Global');
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}

