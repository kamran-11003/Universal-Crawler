chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURE STORAGE SCRIPT LOADING ==='});

if (typeof window.SecureStorage === 'undefined') {
class SecureStorage {
  constructor(config = {}) {
    this.storageKey = 'autotestai_secure_data';
    this.encryptionKey = null;
    this.enabled = false;
    this.encryptionCount = 0;
    this.decryptionCount = 0;
    this.keyGenerationTime = 0;
    
    // Web Crypto API support check
    this.cryptoSupported = typeof crypto !== 'undefined' && 
                          typeof crypto.subtle !== 'undefined' &&
                          typeof crypto.getRandomValues !== 'undefined';
    
    if (!this.cryptoSupported) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Web Crypto API not supported, falling back to plain storage'
      });
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SecureStorage initialized - Crypto API: ' + this.cryptoSupported});
  }

  async initialize() {
    if (!this.enabled) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Not enabled, skipping initialization'
      });
      return;
    }
    
    if (!this.cryptoSupported) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Crypto API not supported, cannot initialize secure storage'
      });
      return;
    }
    
    try {
      const startTime = performance.now();
      this.encryptionKey = await this.generateEncryptionKey();
      this.keyGenerationTime = performance.now() - startTime;
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Initialized with key generation time: ${this.keyGenerationTime.toFixed(2)}ms`
      });
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Failed to initialize: ' + error.message
      });
      this.enabled = false;
    }
  }

  async generateEncryptionKey() {
    if (!this.cryptoSupported) {
      throw new Error('Web Crypto API not supported');
    }
    
    try {
      const keyMaterial = crypto.getRandomValues(new Uint8Array(32));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      throw new Error(`Failed to generate encryption key: ${error.message}`);
    }
  }

  async encryptData(data) {
    if (!this.enabled || !this.encryptionKey || !this.cryptoSupported) {
      return data;
    }
    
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encoded = encoder.encode(JSON.stringify(data));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encoded
      );

      this.encryptionCount++;
      
      const result = {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        timestamp: Date.now(),
        algorithm: 'AES-GCM-256'
      };
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Encrypted data (${this.encryptionCount} total encryptions)`
      });
      
      return result;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Encryption failed: ' + error.message
      });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  async decryptData(encryptedData) {
    if (!this.enabled || !this.encryptionKey || !this.cryptoSupported) {
      return encryptedData;
    }
    
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv) {
      throw new Error('Invalid encrypted data format');
    }
    
    try {
      const encrypted = new Uint8Array(encryptedData.encrypted);
      const iv = new Uint8Array(encryptedData.iv);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encrypted
      );

      const decoder = new TextDecoder();
      const result = JSON.parse(decoder.decode(decrypted));
      
      this.decryptionCount++;
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Decrypted data (${this.decryptionCount} total decryptions)`
      });
      
      return result;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Decryption failed: ' + error.message
      });
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async storeSecure(key, data) {
    if (!this.enabled || !this.cryptoSupported) {
      // Fall back to plain storage
      await chrome.storage.local.set({ [key]: data });
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Stored data in plain format (security disabled): ${key}`
      });
      return;
    }
    
    try {
      const encrypted = await this.encryptData(data);
      await chrome.storage.local.set({ [key]: encrypted });
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Stored encrypted data: ${key}`
      });
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Failed to store data for key ${key}: ${error.message}`
      });
      throw error;
    }
  }

  async retrieveSecure(key) {
    const result = await chrome.storage.local.get([key]);
    if (!result[key]) {
      return null;
    }
    
    if (!this.enabled || !this.cryptoSupported) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Retrieved plain data: ${key}`
      });
      return result[key];
    }
    
    try {
      const decrypted = await this.decryptData(result[key]);
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Retrieved and decrypted data: ${key}`
      });
      return decrypted;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Failed to decrypt data for key ${key}: ${error.message}`
      });
      return null;
    }
  }

  async clearSecure(key) {
    await chrome.storage.local.remove([key]);
    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG', 
      message: `SecureStorage: Cleared data for key: ${key}`
    });
  }

  validateHTTPS(url) {
    if (!this.enabled) return true;
    
    try {
      const parsed = new URL(url);
      const isHTTPS = parsed.protocol === 'https:';
      
      if (!isHTTPS) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `SecureStorage: HTTPS validation failed for URL: ${url}`
        });
      }
      
      return isHTTPS;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: URL validation error: ${error.message}`
      });
      return false;
    }
  }

  async generateSecureRandom(length = 32) {
    if (!this.cryptoSupported) {
      throw new Error('Web Crypto API not supported for secure random generation');
    }
    
    try {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Generated ${length} bytes of secure random data`
      });
      
      return Array.from(array);
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Failed to generate secure random: ' + error.message
      });
      throw new Error(`Secure random generation failed: ${error.message}`);
    }
  }

  async generateSecureToken(length = 32) {
    try {
      const randomBytes = await this.generateSecureRandom(length);
      return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Failed to generate secure token: ' + error.message
      });
      throw error;
    }
  }

  async validateCertificate(url) {
    if (!this.enabled) return { valid: true, warnings: [] };
    
    // This is a placeholder for certificate validation
    // In a real implementation, this would check certificate validity
    const warnings = [];
    
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol !== 'https:') {
        warnings.push('Non-HTTPS connection detected');
      }
      
      // Check for localhost (which might use self-signed certificates)
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        warnings.push('Localhost connection - certificate may be self-signed');
      }
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Certificate validation completed for ${parsed.hostname}`
      });
      
      return {
        valid: true,
        warnings,
        hostname: parsed.hostname,
        protocol: parsed.protocol
      };
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Certificate validation failed: ' + error.message
      });
      return {
        valid: false,
        error: error.message,
        warnings: []
      };
    }
  }

  async secureHash(data) {
    if (!this.cryptoSupported) {
      throw new Error('Web Crypto API not supported for hashing');
    }
    
    try {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(JSON.stringify(data));
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Generated SHA-256 hash'
      });
      
      return hashHex;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Hashing failed: ' + error.message
      });
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  getStorageStats() {
    return {
      enabled: this.enabled,
      cryptoSupported: this.cryptoSupported,
      encryptionCount: this.encryptionCount,
      decryptionCount: this.decryptionCount,
      keyGenerationTime: this.keyGenerationTime,
      hasEncryptionKey: !!this.encryptionKey
    };
  }

  resetStats() {
    this.encryptionCount = 0;
    this.decryptionCount = 0;
    this.keyGenerationTime = 0;
  }

  async testEncryptionDecryption() {
    if (!this.enabled || !this.cryptoSupported) {
      return { success: false, error: 'Secure storage not enabled or crypto not supported' };
    }
    
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      
      const encrypted = await this.encryptData(testData);
      const decrypted = await this.decryptData(encrypted);
      
      const success = JSON.stringify(testData) === JSON.stringify(decrypted);
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecureStorage: Encryption/decryption test ${success ? 'passed' : 'failed'}`
      });
      
      return { success, testData, decrypted };
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecureStorage: Encryption/decryption test failed: ' + error.message
      });
      return { success: false, error: error.message };
    }
  }
}

window.SecureStorage = SecureStorage;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURE STORAGE SCRIPT LOADED ==='});
}
