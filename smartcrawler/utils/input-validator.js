chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INPUT VALIDATOR SCRIPT LOADING ==='});

if (typeof window.InputValidator === 'undefined') {
class InputValidator {
  constructor(config = {}) {
    this.validationRules = {
      url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      selector: /^[a-zA-Z][a-zA-Z0-9_\-#.\[\]=:()>\s]*$/,
      depth: (val) => Number.isInteger(val) && val >= 0 && val <= 50,
      timeout: (val) => Number.isInteger(val) && val >= 1000 && val <= 3600000,
      hostname: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      port: (val) => Number.isInteger(val) && val >= 1 && val <= 65535
    };
    
    this.allowedProtocols = ['http:', 'https:'];
    this.forbiddenProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
    this.enabled = false;
    this.validationCount = 0;
    this.rejectionCount = 0;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'InputValidator initialized with ' + Object.keys(this.validationRules).length + ' validation rules'});
  }

  validateInput(input, type) {
    if (!this.enabled) return true;
    
    try {
      const rule = this.validationRules[type];
      if (!rule) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `InputValidator: Unknown validation type: ${type}`
        });
        return false;
      }

      let isValid;
      if (typeof rule === 'function') {
        isValid = rule(input);
      } else if (rule instanceof RegExp) {
        isValid = rule.test(input);
      } else {
        isValid = false;
      }

      this.validationCount++;
      if (!isValid) {
        this.rejectionCount++;
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `InputValidator: Rejected ${type} input: ${String(input).substring(0, 50)}`
        });
      }

      return isValid;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'InputValidator error: ' + error.message
      });
      return false;
    }
  }

  sanitizeURL(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    try {
      const parsed = new URL(url);
      
      // Check for forbidden protocols
      if (this.forbiddenProtocols.includes(parsed.protocol)) {
        throw new Error(`Forbidden protocol: ${parsed.protocol}`);
      }
      
      // Check for allowed protocols
      if (!this.allowedProtocols.includes(parsed.protocol)) {
        throw new Error(`Unsupported protocol: ${parsed.protocol}`);
      }
      
      // Validate hostname
      if (!this.validateInput(parsed.hostname, 'hostname')) {
        throw new Error('Invalid hostname');
      }
      
      // Validate port if present
      if (parsed.port && !this.validateInput(parseInt(parsed.port), 'port')) {
        throw new Error('Invalid port number');
      }
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `InputValidator: Validated URL: ${parsed.hostname}`
      });
      
      return parsed.href;
    } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }
  }

  sanitizeSelector(selector) {
    if (!selector || typeof selector !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    let sanitized = selector.replace(/[^a-zA-Z0-9\s\-_#\.\[\]=:()>]/g, '');
    
    // Validate the sanitized selector
    if (!this.validateInput(sanitized, 'selector')) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `InputValidator: Rejected dangerous selector: ${selector}`
      });
      return '';
    }
    
    if (sanitized !== selector) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `InputValidator: Sanitized selector: ${selector} -> ${sanitized}`
      });
    }
    
    return sanitized;
  }

  sanitizeFormData(formData) {
    if (!formData || typeof formData !== 'object') {
      return {};
    }

    const sanitized = {};
    let fieldsSanitized = 0;
    
    Object.entries(formData).forEach(([key, value]) => {
      const sanitizedKey = this.escapeHTML(key);
      const sanitizedValue = this.escapeHTML(String(value));
      
      sanitized[sanitizedKey] = sanitizedValue;
      
      if (sanitizedKey !== key || sanitizedValue !== String(value)) {
        fieldsSanitized++;
      }
    });
    
    if (fieldsSanitized > 0) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `InputValidator: Sanitized ${fieldsSanitized} form fields`
      });
    }
    
    return sanitized;
  }

  escapeHTML(str) {
    if (!str || typeof str !== 'string') return str;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return str.replace(/[&<>"'/]/g, char => map[char]);
  }

  unescapeHTML(str) {
    if (!str || typeof str !== 'string') return str;
    
    const map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/'
    };
    
    return str.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g, char => map[char]);
  }

  validateJSON(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return { valid: false, error: 'Input must be a string' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Additional validation for parsed object
      if (typeof parsed === 'object' && parsed !== null) {
        // Check for circular references
        const seen = new Set();
        const hasCircular = this.checkCircularReference(parsed, seen);
        if (hasCircular) {
          return { valid: false, error: 'Circular reference detected' };
        }
      }
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'InputValidator: Valid JSON parsed successfully'
      });
      
      return { valid: true, data: parsed };
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `InputValidator: JSON validation failed: ${error.message}`
      });
      return { valid: false, error: error.message };
    }
  }

  checkCircularReference(obj, seen) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    
    if (seen.has(obj)) {
      return true;
    }
    
    seen.add(obj);
    
    for (const value of Object.values(obj)) {
      if (this.checkCircularReference(value, seen)) {
        return true;
      }
    }
    
    seen.delete(obj);
    return false;
  }

  validateCrawlParameters(params) {
    const validated = {};
    const errors = [];
    
    // Validate maxDepth
    if (params.maxDepth !== undefined) {
      if (this.validateInput(params.maxDepth, 'depth')) {
        validated.maxDepth = params.maxDepth;
      } else {
        errors.push('Invalid maxDepth: must be integer between 0-50');
      }
    }
    
    // Validate timeout
    if (params.timeout !== undefined) {
      if (this.validateInput(params.timeout, 'timeout')) {
        validated.timeout = params.timeout;
      } else {
        errors.push('Invalid timeout: must be integer between 1000-3600000ms');
      }
    }
    
    // Validate URL
    if (params.url) {
      try {
        validated.url = this.sanitizeURL(params.url);
      } catch (error) {
        errors.push(`Invalid URL: ${error.message}`);
      }
    }
    
    // Validate selectors
    if (params.selectors && Array.isArray(params.selectors)) {
      validated.selectors = params.selectors
        .map(selector => this.sanitizeSelector(selector))
        .filter(selector => selector.length > 0);
      
      if (validated.selectors.length !== params.selectors.length) {
        errors.push('Some selectors were rejected or sanitized');
      }
    }
    
    return {
      valid: errors.length === 0,
      validated,
      errors
    };
  }

  sanitizeSearchParams(searchParams) {
    if (!searchParams) return '';
    
    if (typeof searchParams === 'string') {
      try {
        const params = new URLSearchParams(searchParams);
        const sanitized = new URLSearchParams();
        
        for (const [key, value] of params) {
          const sanitizedKey = this.escapeHTML(key);
          const sanitizedValue = this.escapeHTML(value);
          sanitized.append(sanitizedKey, sanitizedValue);
        }
        
        return sanitized.toString();
      } catch (error) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `InputValidator: Failed to sanitize search params: ${error.message}`
        });
        return '';
      }
    }
    
    return searchParams;
  }

  getValidationStats() {
    return {
      enabled: this.enabled,
      totalValidations: this.validationCount,
      totalRejections: this.rejectionCount,
      rejectionRate: this.validationCount > 0 ? (this.rejectionCount / this.validationCount * 100).toFixed(2) + '%' : '0%'
    };
  }

  resetStats() {
    this.validationCount = 0;
    this.rejectionCount = 0;
  }
}

window.InputValidator = InputValidator;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INPUT VALIDATOR SCRIPT LOADED ==='});
}
