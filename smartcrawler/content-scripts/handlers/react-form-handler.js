// React Form Handler
// Specialized handler for React forms that bypasses React's synthetic event system

console.log('=== REACT FORM HANDLER LOADING ===');

if (typeof window.ReactFormHandler === 'undefined') {
class ReactFormHandler {
  constructor() {
    this.reactDetected = false;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'ReactFormHandler initialized'});
  }

  /**
   * Detect if React is present on the page
   * @returns {boolean}
   */
  detectReact() {
    this.reactDetected = !!(
      window.React ||
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
      document.querySelector('[data-reactroot]') ||
      document.querySelector('[data-reactid]') ||
      window.__webpack_require__ ||
      Array.from(document.scripts).some(s => s.src.includes('react'))
    );
    
    if (this.reactDetected) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ React detected on page'});
    }
    
    return this.reactDetected;
  }

  /**
   * Wait for React to hydrate/mount
   * @param {number} maxWait - Maximum time to wait (ms)
   * @returns {Promise<boolean>}
   */
  async waitForReactHydration(maxWait = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // Check if React root is hydrated
      const root = document.querySelector('#root, #app, [data-reactroot]');
      if (root && root.children.length > 0) {
        // Wait a bit more to be safe
        await new Promise(r => setTimeout(r, 500));
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ React hydrated'});
        return true;
      }
      
      await new Promise(r => setTimeout(r, 200));
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '⚠️ React hydration timeout'});
    return false;
  }

  /**
   * Check if element has React event handlers
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  hasReactEventHandlers(element) {
    const keys = Object.keys(element);
    return keys.some(key => key.startsWith('__react'));
  }

  /**
   * Set React input value (bypasses React's value control)
   * @param {HTMLInputElement} input
   * @param {string} value
   * @returns {boolean}
   */
  setReactInputValue(input, value) {
    try {
      // Get the native value setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      
      // Set value directly (bypasses React)
      nativeInputValueSetter.call(input, value);
      
      // Trigger React synthetic events
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Blur to trigger validation
      const blurEvent = new Event('blur', { bubbles: true });
      input.dispatchEvent(blurEvent);
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ React input value set: ${input.name || input.id}`});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Failed to set React input: ${error.message}`});
      return false;
    }
  }

  /**
   * Fill React form with credentials
   * @param {HTMLFormElement} form
   * @param {Object} credentials
   * @returns {Promise<boolean>}
   */
  async fillReactForm(form, credentials) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '📝 Filling React form...'});
      
      // Wait for React to be ready
      await this.waitForReactHydration();
      
      // Find username field
      const usernameField = form.querySelector(
        'input[name="username"], input[name="email"], input[name="user"], input[type="email"], input[name="login"]'
      );
      
      // Find password field
      const passwordField = form.querySelector(
        'input[type="password"], input[name="password"]'
      );
      
      if (!usernameField || !passwordField) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '❌ Username or password field not found'});
        return false;
      }
      
      // Focus username field first
      usernameField.focus();
      await new Promise(r => setTimeout(r, 100));
      
      // Set username
      const usernameSet = this.setReactInputValue(usernameField, credentials.username);
      await new Promise(r => setTimeout(r, 200));
      
      // Focus password field
      passwordField.focus();
      await new Promise(r => setTimeout(r, 100));
      
      // Set password
      const passwordSet = this.setReactInputValue(passwordField, credentials.password);
      await new Promise(r => setTimeout(r, 200));
      
      if (!usernameSet || !passwordSet) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '❌ Failed to set form values'});
        return false;
      }
      
      // Trigger form validation
      await this.triggerReactValidation(form);
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ React form filled successfully'});
      return true;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ React form fill error: ${error.message}`});
      return false;
    }
  }

  /**
   * Trigger React form validation
   * @param {HTMLFormElement} form
   * @returns {Promise<void>}
   */
  async triggerReactValidation(form) {
    try {
      // Trigger form-level events
      const formEvent = new Event('change', { bubbles: true });
      form.dispatchEvent(formEvent);
      
      // Wait for validation
      await new Promise(r => setTimeout(r, 300));
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ React validation triggered'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⚠️ React validation error: ${error.message}`});
    }
  }

  /**
   * Submit React form
   * @param {HTMLFormElement} form
   * @returns {Promise<boolean>}
   */
  async submitReactForm(form) {
    try {
      // Try to find submit button
      const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type="button"])'
      );
      
      if (submitButton) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔘 Clicking React submit button'});
        submitButton.click();
      } else {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '📤 Submitting React form directly'});
        form.submit();
      }
      
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ React form submit error: ${error.message}`});
      return false;
    }
  }
}

window.ReactFormHandler = ReactFormHandler;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ ReactFormHandler loaded'});
}

