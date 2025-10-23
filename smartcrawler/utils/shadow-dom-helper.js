/**
 * Shadow DOM Support Utility
 * Recursively searches Shadow DOM for elements
 * Essential for modern web components
 */

class ShadowDOMHelper {
  /**
   * Query selector that works with Shadow DOM
   * @param {string} selector - CSS selector
   * @param {Element} root - Root element to start search (defaults to document.body)
   * @returns {Array} Array of matching elements
   */
  static querySelectorDeep(selector, root = document.body) {
    const results = [];
    
    // Search in regular DOM
    const regularResults = root.querySelectorAll(selector);
    results.push(...Array.from(regularResults));
    
    // Recursively search shadow DOMs
    const shadowResults = this.searchShadowDOM(selector, root);
    results.push(...shadowResults);
    
    return results;
  }
  
  /**
   * Recursively search shadow DOMs
   * @param {string} selector - CSS selector
   * @param {Element} root - Root element
   * @returns {Array} Array of matching elements
   */
  static searchShadowDOM(selector, root) {
    const results = [];
    
    // Get all elements that might have shadow roots
    const allElements = root.querySelectorAll('*');
    
    for (const element of allElements) {
      if (element.shadowRoot) {
        // Search within this shadow root
        const shadowResults = element.shadowRoot.querySelectorAll(selector);
        results.push(...Array.from(shadowResults));
        
        // Recursively search nested shadow roots
        const nestedResults = this.searchShadowDOM(selector, element.shadowRoot);
        results.push(...nestedResults);
      }
    }
    
    return results;
  }
  
  /**
   * Find single element (first match) in Shadow DOM
   * @param {string} selector - CSS selector
   * @param {Element} root - Root element to start search
   * @returns {Element|null} First matching element or null
   */
  static querySelectorDeepFirst(selector, root = document.body) {
    // Try regular DOM first
    const regularResult = root.querySelector(selector);
    if (regularResult) return regularResult;
    
    // Search shadow DOMs
    const allElements = root.querySelectorAll('*');
    
    for (const element of allElements) {
      if (element.shadowRoot) {
        // Try this shadow root
        const shadowResult = element.shadowRoot.querySelector(selector);
        if (shadowResult) return shadowResult;
        
        // Recursively search nested shadow roots
        const nestedResult = this.querySelectorDeepFirst(selector, element.shadowRoot);
        if (nestedResult) return nestedResult;
      }
    }
    
    return null;
  }
  
  /**
   * Check if element is inside a shadow DOM
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is in shadow DOM
   */
  static isInShadowDOM(element) {
    let parent = element.parentNode;
    
    while (parent) {
      if (parent instanceof ShadowRoot) {
        return true;
      }
      parent = parent.parentNode || parent.host;
    }
    
    return false;
  }
  
  /**
   * Get the host element of a shadow root
   * @param {Element} element - Element inside shadow DOM
   * @returns {Element|null} Host element or null
   */
  static getShadowHost(element) {
    let parent = element.parentNode;
    
    while (parent) {
      if (parent instanceof ShadowRoot) {
        return parent.host;
      }
      parent = parent.parentNode || parent.host;
    }
    
    return null;
  }
  
  /**
   * Get all shadow roots in the document
   * @param {Element} root - Root element to start search
   * @returns {Array} Array of shadow roots
   */
  static getAllShadowRoots(root = document.body) {
    const shadowRoots = [];
    const allElements = root.querySelectorAll('*');
    
    for (const element of allElements) {
      if (element.shadowRoot) {
        shadowRoots.push(element.shadowRoot);
        
        // Recursively find nested shadow roots
        const nestedRoots = this.getAllShadowRoots(element.shadowRoot);
        shadowRoots.push(...nestedRoots);
      }
    }
    
    return shadowRoots;
  }
  
  /**
   * Extract all forms including those in shadow DOM
   * @returns {Array} Array of form elements
   */
  static getAllForms() {
    return this.querySelectorDeep('form');
  }
  
  /**
   * Extract all inputs including those in shadow DOM
   * @returns {Array} Array of input elements
   */
  static getAllInputs() {
    return this.querySelectorDeep('input, textarea, select');
  }
  
  /**
   * Extract all links including those in shadow DOM
   * @returns {Array} Array of anchor elements
   */
  static getAllLinks() {
    return this.querySelectorDeep('a[href]');
  }
  
  /**
   * Extract all buttons including those in shadow DOM
   * @returns {Array} Array of button elements
   */
  static getAllButtons() {
    return this.querySelectorDeep('button, input[type="button"], input[type="submit"], [role="button"]');
  }
  
  /**
   * Debug: Log all shadow roots found
   */
  static debugShadowRoots() {
    const shadowRoots = this.getAllShadowRoots();
    console.log(`🔍 Found ${shadowRoots.length} shadow root(s):`);
    
    shadowRoots.forEach((shadowRoot, index) => {
      console.log(`  ${index + 1}. Host:`, shadowRoot.host);
      console.log(`     Mode:`, shadowRoot.mode);
      console.log(`     Children:`, shadowRoot.children.length);
    });
    
    return shadowRoots;
  }
}

// Make available globally
window.ShadowDOMHelper = ShadowDOMHelper;

console.log('👻 Shadow DOM Helper loaded');
