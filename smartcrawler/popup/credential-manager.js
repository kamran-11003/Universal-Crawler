chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== CREDENTIAL MANAGER SCRIPT LOADING ==='});

class CredentialManager {
  constructor() {
    this.roles = ['guest', 'user', 'admin'];
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'CredentialManager initialized with roles: ' + this.roles.join(', ')});
  }
  
  async saveCredentials(role, credentials) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Saving credentials for role: ${role}`});
      
      // Basic obfuscation using btoa
      const obfuscated = btoa(JSON.stringify(credentials));
      
      await chrome.storage.local.set({
        [`auth_${role}`]: obfuscated
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Credentials saved for role: ${role}`});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error saving credentials for ${role}: ${error.message}`});
      return false;
    }
  }
  
  async loadCredentials(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Loading credentials for role: ${role}`});
      
      const result = await chrome.storage.local.get([`auth_${role}`]);
      
      if (result[`auth_${role}`]) {
        const credentials = JSON.parse(atob(result[`auth_${role}`]));
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Credentials loaded for role: ${role}`});
        return credentials;
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `No credentials found for role: ${role}`});
      return null;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error loading credentials for ${role}: ${error.message}`});
      return null;
    }
  }
  
  async deleteCredentials(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Deleting credentials for role: ${role}`});
      
      await chrome.storage.local.remove([`auth_${role}`]);
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Credentials deleted for role: ${role}`});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error deleting credentials for ${role}: ${error.message}`});
      return false;
    }
  }
  
  async getAllCredentials() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Loading all credentials'});
      
      const credentials = {};
      
      for (const role of this.roles) {
        if (role !== 'guest') { // Guest doesn't need credentials
          const creds = await this.loadCredentials(role);
          if (creds) {
            credentials[role] = creds;
          }
        }
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Loaded credentials for ${Object.keys(credentials).length} roles`});
      return credentials;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error loading all credentials: ${error.message}`});
      return {};
    }
  }
  
  async hasCredentials(role) {
    try {
      const result = await chrome.storage.local.get([`auth_${role}`]);
      return !!result[`auth_${role}`];
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error checking credentials for ${role}: ${error.message}`});
      return false;
    }
  }
  
  validateCredentials(credentials) {
    if (!credentials) {
      return false;
    }
    
    // Basic validation - check for username and password
    if (!credentials.username || !credentials.password) {
      return false;
    }
    
    // Check for minimum length
    if (credentials.username.length < 1 || credentials.password.length < 1) {
      return false;
    }
    
    return true;
  }
}

// Make CredentialManager available globally
window.CredentialManager = CredentialManager;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== CREDENTIAL MANAGER SCRIPT LOADED ==='});
