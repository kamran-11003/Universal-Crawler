chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== DATA SANITIZER SCRIPT LOADING ==='});

if (typeof window.DataSanitizer === 'undefined') {
class DataSanitizer {
  constructor(config = {}) {
    this.sensitivePatterns = [
      { 
        name: 'creditCard', 
        regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, 
        replacement: '[CREDIT_CARD]' 
      },
      { 
        name: 'ssn', 
        regex: /\b\d{3}-\d{2}-\d{4}\b/g, 
        replacement: '[SSN]' 
      },
      { 
        name: 'email', 
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
        replacement: '[EMAIL]' 
      },
      { 
        name: 'ipAddress', 
        regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 
        replacement: '[IP_ADDRESS]' 
      },
      { 
        name: 'apiKey', 
        regex: /['"](api[_-]?key|token|secret|auth[_-]?token)['"]\s*:\s*['"][^'"]+['"]/gi, 
        replacement: '"$1":"[REDACTED]"' 
      },
      { 
        name: 'password', 
        regex: /['"](password|passwd|pwd)['"]\s*:\s*['"][^'"]+['"]/gi, 
        replacement: '"$1":"[PASSWORD]"' 
      },
      { 
        name: 'phone', 
        regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g, 
        replacement: '[PHONE_NUMBER]' 
      }
    ];
    
    this.sensitiveHeaders = [
      'authorization', 
      'cookie', 
      'x-api-key', 
      'x-auth-token', 
      'x-csrf-token',
      'x-session-id',
      'x-user-id',
      'set-cookie'
    ];
    
    this.enabled = false;
    this.sanitizationCount = 0;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'DataSanitizer initialized with patterns: ' + this.sensitivePatterns.length});
  }

  sanitizeData(data) {
    if (!this.enabled) return data;
    
    try {
      if (typeof data === 'string') {
        return this.sanitizeString(data);
      } else if (typeof data === 'object' && data !== null) {
        return this.sanitizeObject(data);
      }
      return data;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'DataSanitizer error: ' + error.message
      });
      return data;
    }
  }

  sanitizeString(str) {
    if (!str || typeof str !== 'string') return str;
    
    let sanitized = str;
    let changesMade = false;
    
    this.sensitivePatterns.forEach(pattern => {
      const original = sanitized;
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
      if (sanitized !== original) {
        changesMade = true;
        this.sanitizationCount++;
      }
    });
    
    if (changesMade) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `DataSanitizer: Sanitized string data (${this.sanitizationCount} total sanitizations)`
      });
    }
    
    return sanitized;
  }

  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeData(item));
    }
    
    const sanitized = {};
    let changesMade = false;
    
    Object.entries(obj).forEach(([key, value]) => {
      const sanitizedKey = this.sanitizeString(key);
      const sanitizedValue = this.sanitizeData(value);
      
      sanitized[sanitizedKey] = sanitizedValue;
      
      if (sanitizedKey !== key || sanitizedValue !== value) {
        changesMade = true;
      }
    });
    
    if (changesMade) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `DataSanitizer: Sanitized object data (${Object.keys(obj).length} properties)`
      });
    }
    
    return sanitized;
  }

  maskSensitiveHeaders(headers) {
    if (!headers || typeof headers !== 'object') return headers;
    
    const masked = { ...headers };
    let headersMasked = 0;
    
    this.sensitiveHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      const originalHeader = Object.keys(masked).find(key => key.toLowerCase() === lowerHeader);
      
      if (originalHeader && masked[originalHeader]) {
        masked[originalHeader] = '[MASKED]';
        headersMasked++;
      }
    });
    
    if (headersMasked > 0) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `DataSanitizer: Masked ${headersMasked} sensitive headers`
      });
    }
    
    return masked;
  }

  sanitizeFormData(formData) {
    if (!formData || typeof formData !== 'object') return formData;
    
    const sanitized = {};
    let fieldsSanitized = 0;
    
    Object.entries(formData).forEach(([key, value]) => {
      let sanitizedValue = value;
      
      // Check if this looks like a sensitive field
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('secret') || 
          lowerKey.includes('token') || lowerKey.includes('key')) {
        sanitizedValue = '[REDACTED]';
        fieldsSanitized++;
      } else if (typeof value === 'string') {
        sanitizedValue = this.sanitizeString(value);
        if (sanitizedValue !== value) fieldsSanitized++;
      }
      
      sanitized[key] = sanitizedValue;
    });
    
    if (fieldsSanitized > 0) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `DataSanitizer: Sanitized ${fieldsSanitized} form fields`
      });
    }
    
    return sanitized;
  }

  sanitizeNetworkRequest(request) {
    if (!request || typeof request !== 'object') return request;
    
    const sanitized = { ...request };
    
    // Sanitize URL if it contains sensitive data
    if (sanitized.url) {
      sanitized.url = this.sanitizeString(sanitized.url);
    }
    
    // Sanitize headers
    if (sanitized.headers) {
      sanitized.headers = this.maskSensitiveHeaders(sanitized.headers);
    }
    
    // Sanitize request body if present
    if (sanitized.body && typeof sanitized.body === 'string') {
      sanitized.body = this.sanitizeString(sanitized.body);
    }
    
    return sanitized;
  }

  getSanitizationStats() {
    return {
      enabled: this.enabled,
      totalSanitizations: this.sanitizationCount,
      patternsConfigured: this.sensitivePatterns.length,
      sensitiveHeaders: this.sensitiveHeaders.length
    };
  }

  resetStats() {
    this.sanitizationCount = 0;
  }
}

window.DataSanitizer = DataSanitizer;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== DATA SANITIZER SCRIPT LOADED ==='});
}
