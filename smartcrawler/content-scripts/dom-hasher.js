chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== DOMHasher SCRIPT LOADING ==='});

if (typeof window.DOMHasher === 'undefined') {
class DOMHasher {
  constructor() {
    this.cache = new WeakMap();
    this.volatileAttrs = ['id', 'data-testid', 'data-timestamp', 'class'];
    this.semanticSelectors = 'form, input, button, a, select, textarea';
  }
  
  generateHash(element = document.body) {
    // Check cache first
    if (this.cache.has(element)) {
      return this.cache.get(element);
    }
    
    const startTime = performance.now();
    const semanticContent = this.extractSemanticContent(element);
    // Include URL path to ensure different pages get unique hashes
    const urlPath = window.location.pathname + window.location.search;
    const combinedContent = `${urlPath}::${semanticContent}`;
    const hash = this.fnv1aHash(combinedContent);
    const duration = performance.now() - startTime;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Hash generated in ${duration.toFixed(2)}ms`});
    this.cache.set(element, hash);
    return hash;
  }
  
  extractSemanticContent(element) {
    // Extract only interactive/meaningful elements
    const interactive = element.querySelectorAll(this.semanticSelectors);
    return Array.from(interactive).map(el => this.normalizeElement(el)).join('|');
  }
  
  normalizeElement(el) {
    const tag = el.tagName.toLowerCase();
    const type = el.type || '';
    const name = el.name || '';
    return `${tag}:${type}:${name}`;
  }
  
  fnv1aHash(str) {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }
  
  generateHashFromUrl(url) {
    // Generate a simple hash from URL for visited tracking
    return this.fnv1aHash(url);
  }
}

// Make DOMHasher available globally
window.DOMHasher = DOMHasher;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== DOMHasher SCRIPT LOADED ==='});
}
