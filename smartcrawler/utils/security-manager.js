chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURITY MANAGER SCRIPT LOADING ==='});

if (typeof window.SecurityManager === 'undefined') {
class SecurityManager {
  constructor(config = {}) {
    this.dataSanitizer = null;
    this.inputValidator = null;
    this.securityValidator = null;
    this.secureStorage = null;
    
    this.config = {
      enableSanitization: false,
      enableValidation: false,
      enableXSSProtection: false,
      enableSecureStorage: false
    };
    
    this.securityLog = [];
    this.initializationTime = 0;
    this.totalSecurityEvents = 0;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SecurityManager initialized with default config'});
  }

  async initialize(config) {
    const startTime = performance.now();
    
    try {
      this.config = { ...this.config, ...config };
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityManager: Initializing with config - Sanitization: ${this.config.enableSanitization}, Validation: ${this.config.enableValidation}, XSS: ${this.config.enableXSSProtection}, Storage: ${this.config.enableSecureStorage}`
      });

      // Initialize Data Sanitizer
      if (this.config.enableSanitization && typeof window.DataSanitizer !== 'undefined') {
        this.dataSanitizer = new window.DataSanitizer();
        this.dataSanitizer.enabled = true;
        this.logSecurityEvent({
          type: 'INITIALIZATION',
          component: 'DataSanitizer',
          message: 'Data sanitization enabled'
        });
      }

      // Initialize Input Validator
      if (this.config.enableValidation && typeof window.InputValidator !== 'undefined') {
        this.inputValidator = new window.InputValidator();
        this.inputValidator.enabled = true;
        this.logSecurityEvent({
          type: 'INITIALIZATION',
          component: 'InputValidator',
          message: 'Input validation enabled'
        });
      }

      // Initialize Security Validator
      if (this.config.enableXSSProtection && typeof window.SecurityValidator !== 'undefined') {
        this.securityValidator = new window.SecurityValidator();
        this.securityValidator.enabled = true;
        this.logSecurityEvent({
          type: 'INITIALIZATION',
          component: 'SecurityValidator',
          message: 'XSS protection enabled'
        });
      }

      // Initialize Secure Storage
      if (this.config.enableSecureStorage && typeof window.SecureStorage !== 'undefined') {
        this.secureStorage = new window.SecureStorage();
        this.secureStorage.enabled = true;
        await this.secureStorage.initialize();
        this.logSecurityEvent({
          type: 'INITIALIZATION',
          component: 'SecureStorage',
          message: 'Secure storage enabled'
        });
      }
      
      this.initializationTime = performance.now() - startTime;
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityManager: Initialization completed in ${this.initializationTime.toFixed(2)}ms`
      });
      
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecurityManager: Initialization failed: ' + error.message
      });
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityManager',
        message: 'Initialization failed: ' + error.message,
        severity: 'high'
      });
    }
  }

  // Wrapper methods for safe data processing
  sanitizeOutput(data) {
    if (!this.dataSanitizer?.enabled) return data;
    
    try {
      const sanitized = this.dataSanitizer.sanitizeData(data);
      this.logSecurityEvent({
        type: 'SANITIZATION',
        component: 'DataSanitizer',
        message: 'Output data sanitized',
        dataSize: JSON.stringify(data).length
      });
      return sanitized;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'DataSanitizer',
        message: 'Sanitization failed: ' + error.message,
        severity: 'medium'
      });
      return data; // Return original data if sanitization fails
    }
  }

  validateInput(input, type) {
    if (!this.inputValidator?.enabled) return true;
    
    try {
      const isValid = this.inputValidator.validateInput(input, type);
      this.logSecurityEvent({
        type: 'VALIDATION',
        component: 'InputValidator',
        message: `Input validation ${isValid ? 'passed' : 'failed'}`,
        inputType: type,
        result: isValid
      });
      return isValid;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'InputValidator',
        message: 'Validation failed: ' + error.message,
        severity: 'medium'
      });
      return false; // Fail safe
    }
  }

  checkXSS(content) {
    if (!this.securityValidator?.enabled) return { safe: true, threats: [] };
    
    try {
      const result = this.securityValidator.detectXSS(content);
      this.logSecurityEvent({
        type: 'XSS_CHECK',
        component: 'SecurityValidator',
        message: `XSS check completed - ${result.safe ? 'safe' : 'threats detected'}`,
        threatCount: result.threats?.length || 0,
        riskLevel: result.riskLevel
      });
      return result;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityValidator',
        message: 'XSS check failed: ' + error.message,
        severity: 'high'
      });
      return { safe: false, threats: [{ type: 'ERROR', message: error.message }] };
    }
  }

  async secureStore(key, data) {
    if (!this.secureStorage?.enabled) {
      await chrome.storage.local.set({ [key]: data });
      return;
    }
    
    try {
      await this.secureStorage.storeSecure(key, data);
      this.logSecurityEvent({
        type: 'SECURE_STORAGE',
        component: 'SecureStorage',
        message: 'Data stored securely',
        key: key,
        dataSize: JSON.stringify(data).length
      });
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecureStorage',
        message: 'Secure storage failed: ' + error.message,
        severity: 'high'
      });
      throw error;
    }
  }

  async secureRetrieve(key) {
    if (!this.secureStorage?.enabled) {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    }
    
    try {
      const data = await this.secureStorage.retrieveSecure(key);
      this.logSecurityEvent({
        type: 'SECURE_RETRIEVAL',
        component: 'SecureStorage',
        message: 'Data retrieved securely',
        key: key
      });
      return data;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecureStorage',
        message: 'Secure retrieval failed: ' + error.message,
        severity: 'high'
      });
      return null;
    }
  }

  sanitizeHTML(html) {
    if (!this.securityValidator?.enabled) return html;
    
    try {
      const sanitized = this.securityValidator.sanitizeHTML(html);
      if (sanitized !== html) {
        this.logSecurityEvent({
          type: 'HTML_SANITIZATION',
          component: 'SecurityValidator',
          message: 'HTML content sanitized',
          originalSize: html.length,
          sanitizedSize: sanitized.length
        });
      }
      return sanitized;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityValidator',
        message: 'HTML sanitization failed: ' + error.message,
        severity: 'medium'
      });
      return html; // Return original if sanitization fails
    }
  }

  validateURL(url) {
    if (!this.inputValidator?.enabled) return { valid: true, url };
    
    try {
      const sanitized = this.inputValidator.sanitizeURL(url);
      this.logSecurityEvent({
        type: 'URL_VALIDATION',
        component: 'InputValidator',
        message: 'URL validated successfully',
        url: url.substring(0, 50) + '...'
      });
      return { valid: true, url: sanitized };
    } catch (error) {
      this.logSecurityEvent({
        type: 'VALIDATION_FAILED',
        component: 'InputValidator',
        message: 'URL validation failed: ' + error.message,
        severity: 'medium',
        url: url.substring(0, 50) + '...'
      });
      return { valid: false, error: error.message };
    }
  }

  sanitizeFormData(formData) {
    if (!this.inputValidator?.enabled && !this.dataSanitizer?.enabled) {
      return formData;
    }
    
    try {
      let sanitized = formData;
      
      // First sanitize with InputValidator for HTML escaping
      if (this.inputValidator?.enabled) {
        sanitized = this.inputValidator.sanitizeFormData(sanitized);
      }
      
      // Then sanitize with DataSanitizer for PII detection
      if (this.dataSanitizer?.enabled) {
        sanitized = this.dataSanitizer.sanitizeFormData(sanitized);
      }
      
      if (JSON.stringify(sanitized) !== JSON.stringify(formData)) {
        this.logSecurityEvent({
          type: 'FORM_SANITIZATION',
          component: 'Combined',
          message: 'Form data sanitized',
          fieldCount: Object.keys(formData).length
        });
      }
      
      return sanitized;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'FormSanitization',
        message: 'Form sanitization failed: ' + error.message,
        severity: 'medium'
      });
      return formData; // Return original if sanitization fails
    }
  }

  generateCSRFToken() {
    if (!this.securityValidator?.enabled) return null;
    
    try {
      const token = this.securityValidator.generateCSRFToken();
      this.logSecurityEvent({
        type: 'CSRF_TOKEN',
        component: 'SecurityValidator',
        message: 'CSRF token generated'
      });
      return token;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityValidator',
        message: 'CSRF token generation failed: ' + error.message,
        severity: 'high'
      });
      return null;
    }
  }

  validateCSRFToken(token, expectedToken) {
    if (!this.securityValidator?.enabled) return true;
    
    try {
      const isValid = this.securityValidator.validateCSRFToken(token, expectedToken);
      this.logSecurityEvent({
        type: 'CSRF_VALIDATION',
        component: 'SecurityValidator',
        message: `CSRF token validation ${isValid ? 'passed' : 'failed'}`,
        result: isValid
      });
      return isValid;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityValidator',
        message: 'CSRF validation failed: ' + error.message,
        severity: 'high'
      });
      return false;
    }
  }

  checkContentSecurityPolicy(headers) {
    if (!this.securityValidator?.enabled) return { compliant: true, issues: [] };
    
    try {
      const result = this.securityValidator.checkContentSecurityPolicy(headers);
      this.logSecurityEvent({
        type: 'CSP_CHECK',
        component: 'SecurityValidator',
        message: `CSP check completed - ${result.compliant ? 'compliant' : 'non-compliant'}`,
        issueCount: result.issues?.length || 0,
        score: result.score
      });
      return result;
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityValidator',
        message: 'CSP check failed: ' + error.message,
        severity: 'medium'
      });
      return { compliant: false, issues: [error.message] };
    }
  }

  logSecurityEvent(event) {
    const securityEvent = {
      timestamp: Date.now(),
      id: this.generateEventId(),
      ...event
    };
    
    this.securityLog.push(securityEvent);
    this.totalSecurityEvents++;
    
    // Keep only last 1000 events to prevent memory bloat
    if (this.securityLog.length > 1000) {
      this.securityLog = this.securityLog.slice(-1000);
    }
    
    // Log high severity events immediately
    if (event.severity === 'high') {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        message: `SECURITY ALERT: ${event.component} - ${event.message}`
      });
    }
  }

  generateEventId() {
    return 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getSecurityReport() {
    const report = {
      config: this.config,
      initializationTime: this.initializationTime,
      totalEvents: this.totalSecurityEvents,
      recentEvents: this.securityLog.slice(-50), // Last 50 events
      summary: {
        totalEvents: this.totalSecurityEvents,
        threats: this.securityLog.filter(e => e.type === 'THREAT' || e.type === 'XSS_CHECK' && !e.safe).length,
        sanitizations: this.securityLog.filter(e => e.type.includes('SANITIZATION')).length,
        validations: this.securityLog.filter(e => e.type === 'VALIDATION').length,
        errors: this.securityLog.filter(e => e.type === 'ERROR').length
      },
      componentStats: this.getComponentStats()
    };
    
    return report;
  }

  getComponentStats() {
    const stats = {};
    
    if (this.dataSanitizer) {
      stats.dataSanitizer = this.dataSanitizer.getSanitizationStats();
    }
    
    if (this.inputValidator) {
      stats.inputValidator = this.inputValidator.getValidationStats();
    }
    
    if (this.securityValidator) {
      stats.securityValidator = this.securityValidator.getSecurityStats();
    }
    
    if (this.secureStorage) {
      stats.secureStorage = this.secureStorage.getStorageStats();
    }
    
    return stats;
  }

  resetStats() {
    this.securityLog = [];
    this.totalSecurityEvents = 0;
    this.initializationTime = 0;
    
    if (this.dataSanitizer) {
      this.dataSanitizer.resetStats();
    }
    
    if (this.inputValidator) {
      this.inputValidator.resetStats();
    }
    
    if (this.securityValidator) {
      this.securityValidator.resetStats();
    }
    
    if (this.secureStorage) {
      this.secureStorage.resetStats();
    }
    
    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG',
      message: 'SecurityManager: All statistics reset'
    });
  }

  async runSecurityTests() {
    const tests = [];
    
    try {
      // Test Data Sanitizer
      if (this.dataSanitizer?.enabled) {
        const testData = { email: 'test@example.com', creditCard: '1234-5678-9012-3456' };
        const sanitized = this.dataSanitizer.sanitizeData(testData);
        tests.push({
          component: 'DataSanitizer',
          test: 'PII Sanitization',
          passed: !sanitized.email?.includes('@') && !sanitized.creditCard?.includes('1234')
        });
      }
      
      // Test Input Validator
      if (this.inputValidator?.enabled) {
        const validUrl = this.inputValidator.validateInput('https://example.com', 'url');
        const invalidUrl = this.inputValidator.validateInput('javascript:alert(1)', 'url');
        tests.push({
          component: 'InputValidator',
          test: 'URL Validation',
          passed: validUrl && !invalidUrl
        });
      }
      
      // Test Security Validator
      if (this.securityValidator?.enabled) {
        const xssResult = this.securityValidator.detectXSS('<script>alert(1)</script>');
        tests.push({
          component: 'SecurityValidator',
          test: 'XSS Detection',
          passed: !xssResult.safe && xssResult.threats.length > 0
        });
      }
      
      // Test Secure Storage
      if (this.secureStorage?.enabled) {
        const storageTest = await this.secureStorage.testEncryptionDecryption();
        tests.push({
          component: 'SecureStorage',
          test: 'Encryption/Decryption',
          passed: storageTest.success
        });
      }
      
      const passedTests = tests.filter(t => t.passed).length;
      
      this.logSecurityEvent({
        type: 'SECURITY_TEST',
        component: 'SecurityManager',
        message: `Security tests completed: ${passedTests}/${tests.length} passed`,
        testResults: tests
      });
      
      return {
        total: tests.length,
        passed: passedTests,
        failed: tests.length - passedTests,
        results: tests
      };
      
    } catch (error) {
      this.logSecurityEvent({
        type: 'ERROR',
        component: 'SecurityManager',
        message: 'Security tests failed: ' + error.message,
        severity: 'high'
      });
      
      return {
        total: tests.length,
        passed: tests.filter(t => t.passed).length,
        failed: tests.length - tests.filter(t => t.passed).length,
        error: error.message,
        results: tests
      };
    }
  }
}

window.SecurityManager = SecurityManager;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURITY MANAGER SCRIPT LOADED ==='});
}
