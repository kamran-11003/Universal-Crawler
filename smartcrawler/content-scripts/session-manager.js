chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SESSION MANAGER SCRIPT LOADING ==='});

if (typeof window.SessionManager === 'undefined') {
class SessionManager {
  constructor() {
    this.sessionData = {
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      tokens: [],
      timestamp: null
    };
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SessionManager initialized'});
  }
  
  async captureSession() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Capturing session data...'});
      
      // Capture cookies for current domain
      const cookies = await this.captureCookies();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Captured ${cookies.length} cookies`});
      
      // Capture localStorage
      const localStorageData = this.captureLocalStorage();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Captured ${Object.keys(localStorageData).length} localStorage items`});
      
      // Capture sessionStorage
      const sessionStorageData = this.captureSessionStorage();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Captured ${Object.keys(sessionStorageData).length} sessionStorage items`});
      
      // Extract tokens from storage
      const tokens = this.extractTokens(localStorageData, sessionStorageData);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Extracted ${tokens.length} tokens`});
      
      this.sessionData = {
        cookies: cookies,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        tokens: tokens,
        timestamp: Date.now(),
        domain: window.location.hostname,
        url: window.location.href
      };
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Session data captured successfully'});
      return this.sessionData;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error capturing session: ${error.message}`});
      return null;
    }
  }
  
  async captureCookies() {
    try {
      // Content scripts cannot access chrome.cookies directly
      // For now, return empty array - cookies will be handled by background script if needed
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Cookies capture skipped - not available in content script'});
      return [];
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error capturing cookies: ${error.message}`});
      return [];
    }
  }
  
  captureLocalStorage() {
    const localStorageData = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error capturing localStorage: ${error.message}`});
    }
    
    return localStorageData;
  }
  
  captureSessionStorage() {
    const sessionStorageData = {};
    
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key);
        }
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error capturing sessionStorage: ${error.message}`});
    }
    
    return sessionStorageData;
  }
  
  extractTokens(localStorageData, sessionStorageData) {
    const tokens = [];
    const tokenKeys = [
      'auth_token', 'user_token', 'session_token', 'jwt', 'access_token',
      'refresh_token', 'bearer_token', 'api_token', 'csrf_token'
    ];
    
    // Check localStorage
    for (const [key, value] of Object.entries(localStorageData)) {
      if (tokenKeys.some(tokenKey => key.toLowerCase().includes(tokenKey.toLowerCase()))) {
        tokens.push({
          key: key,
          value: value,
          storage: 'localStorage'
        });
      }
    }
    
    // Check sessionStorage
    for (const [key, value] of Object.entries(sessionStorageData)) {
      if (tokenKeys.some(tokenKey => key.toLowerCase().includes(tokenKey.toLowerCase()))) {
        tokens.push({
          key: key,
          value: value,
          storage: 'sessionStorage'
        });
      }
    }
    
    return tokens;
  }
  
  async restoreSession(sessionData) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Restoring session data...'});
      
      if (!sessionData) {
        throw new Error('No session data provided');
      }
      
      // Restore cookies
      const cookieCount = await this.restoreCookies(sessionData.cookies || []);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Restored ${cookieCount} cookies`});
      
      // Restore localStorage
      const localStorageCount = this.restoreLocalStorage(sessionData.localStorage || {});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Restored ${localStorageCount} localStorage items`});
      
      // Restore sessionStorage
      const sessionStorageCount = this.restoreSessionStorage(sessionData.sessionStorage || {});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Restored ${sessionStorageCount} sessionStorage items`});
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Session data restored successfully'});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error restoring session: ${error.message}`});
      return false;
    }
  }
  
  async restoreCookies(cookies) {
    let restoredCount = 0;
    
    for (const cookie of cookies) {
      try {
        await chrome.cookies.set({
          url: `https://${cookie.domain}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate
        });
        restoredCount++;
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error restoring cookie ${cookie.name}: ${error.message}`});
      }
    }
    
    return restoredCount;
  }
  
  restoreLocalStorage(localStorageData) {
    let restoredCount = 0;
    
    try {
      for (const [key, value] of Object.entries(localStorageData)) {
        localStorage.setItem(key, value);
        restoredCount++;
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error restoring localStorage: ${error.message}`});
    }
    
    return restoredCount;
  }
  
  restoreSessionStorage(sessionStorageData) {
    let restoredCount = 0;
    
    try {
      for (const [key, value] of Object.entries(sessionStorageData)) {
        sessionStorage.setItem(key, value);
        restoredCount++;
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error restoring sessionStorage: ${error.message}`});
    }
    
    return restoredCount;
  }
  
  isSessionValid(sessionData = null) {
    const data = sessionData || this.sessionData;
    
    if (!data || !data.timestamp) {
      return false;
    }
    
    // Check if session is still valid (not expired)
    const age = Date.now() - data.timestamp;
    const maxAge = 3600000; // 1 hour
    
    if (age > maxAge) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Session expired (age: ${age}ms > ${maxAge}ms)`});
      return false;
    }
    
    // Check if we're on the same domain
    if (data.domain && data.domain !== window.location.hostname) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Domain mismatch: ${data.domain} vs ${window.location.hostname}`});
      return false;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Session is valid (age: ${age}ms)`});
    return true;
  }
  
  async saveSessionToStorage(sessionData = null) {
    try {
      const data = sessionData || this.sessionData;
      
      if (!data) {
        throw new Error('No session data to save');
      }
      
      await chrome.storage.local.set({
        'current_session': data
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Session saved to storage'});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error saving session to storage: ${error.message}`});
      return false;
    }
  }
  
  async loadSessionFromStorage() {
    try {
      const result = await chrome.storage.local.get(['current_session']);
      
      if (result.current_session) {
        this.sessionData = result.current_session;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Session loaded from storage'});
        return this.sessionData;
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'No session found in storage'});
      return null;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error loading session from storage: ${error.message}`});
      return null;
    }
  }
  
  clearSession() {
    try {
      this.sessionData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        tokens: [],
        timestamp: null
      };
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Session data cleared'});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error clearing session: ${error.message}`});
      return false;
    }
  }
}

// Make SessionManager available globally
window.SessionManager = SessionManager;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SESSION MANAGER SCRIPT LOADED ==='});
}
