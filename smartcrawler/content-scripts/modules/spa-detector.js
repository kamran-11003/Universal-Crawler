console.log('=== SPA DETECTOR SCRIPT LOADING ===');

if (typeof window.SPADetector === 'undefined') {
class SPADetector {
  constructor() {
    this.routeChanges = [];
    this.frameworks = {
      react: false,
      vue: false,
      angular: false,
      generic: false
    };
    this.enabled = false;
    this.originalPushState = null;
    this.originalReplaceState = null;
  }

  initialize() {
    if (this.enabled) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Initializing...'});
    
    this.detectFramework();
    this.setupRouteMonitoring();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `SPA Detector: Framework detected: ${this.getActiveFramework()}`});
  }

  detectFramework() {
    // Check for GitHub Pages SPA redirect script
    if (this.detectGitHubPagesSPA()) {
      this.frameworks.githubPagesSPA = true;
      if (!this.config) this.config = {};
      this.config.delayAfterInteraction = 3000;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: GitHub Pages SPA detected - 3s wait time'});
      return; // Skip other checks if GitHub Pages SPA
    }
    
    // Check for React (DEV + PRODUCTION)
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||  // Dev mode
        document.querySelector('[data-reactroot]') ||  // Dev mode
        window.React ||  // Dev mode
        window.__webpack_require__ ||  // Production webpack
        document.querySelector('[class*="react-"]') ||  // Production classes
        document.querySelector('[class*="React"]') ||  // Production classes
        Array.from(document.scripts).some(s => s.src.includes('react'))) {  // Bundle check
      this.frameworks.react = true;
      // Set adaptive wait time: 8s for React SPAs
      if (!this.config) this.config = {};
      this.config.delayAfterInteraction = 8000;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: React (production) detected - 8s wait time'});
    }
    
    // Check for Vue (including Vue 3)
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ||
        window.Vue ||
        document.querySelector('[data-v-]') ||
        document.querySelector('[data-v-app]') ||  // Vue 3
        document.querySelector('#app.__vue_app__')) {  // Vue 3
      this.frameworks.vue = true;
      if (!this.config) this.config = {};
      this.config.delayAfterInteraction = 6000;  // 6s for Vue
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Vue framework detected - 6s wait time'});
    }
    
    // Check for Angular
    if (window.ng || 
        window.getAllAngularRootElements ||
        document.querySelector('[ng-app], [ng-controller]')) {
      this.frameworks.angular = true;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Angular framework detected'});
    }
    
    // Check for other SPA indicators
    if (!this.frameworks.react && !this.frameworks.vue && !this.frameworks.angular) {
      // Look for common SPA patterns
      if (document.querySelector('[data-router], [data-route]') ||
          window.location.hash.includes('/') ||
          window.history.state !== null) {
        this.frameworks.generic = true;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Generic SPA patterns detected'});
      }
    }
  }

  detectGitHubPagesSPA() {
    // Check for GitHub Pages SPA redirect script in page scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const scriptText = script.textContent || '';
      if (scriptText.includes('Single Page Apps for GitHub Pages') ||
          scriptText.includes('spa-github-pages') ||
          scriptText.includes('redirect from a GitHub Pages 404 page')) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: '🎯 GitHub Pages SPA redirect script detected in page'
        });
        return true;
      }
    }
    
    // Check for redirect patterns in current URL
    const url = window.location.href;
    if (url.includes('/?/') && url.includes('~and~')) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: '🎯 GitHub Pages SPA URL pattern detected in current URL'
      });
      return true;
    }
    
    // Check for 404.html redirect marker
    if (window.location.search.includes('redirect=') && 
        document.title.includes('404')) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: '🎯 GitHub Pages 404 redirect detected'
      });
      return true;
    }
    
    return false;
  }

  setupRouteMonitoring() {
    // Store original methods
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    // Monitor pushState
    history.pushState = (...args) => {
      this.onRouteChange('pushState', args[2]);
      return this.originalPushState.apply(history, args);
    };

    // Monitor replaceState
    history.replaceState = (...args) => {
      this.onRouteChange('replaceState', args[2]);
      return this.originalReplaceState.apply(history, args);
    };

    // Monitor popstate
    window.addEventListener('popstate', (event) => {
      this.onRouteChange('popstate', window.location.href);
    });

    // Monitor hash changes
    window.addEventListener('hashchange', (event) => {
      this.onRouteChange('hashchange', window.location.href);
    });

    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Route monitoring setup complete'});
  }

  onRouteChange(type, newRoute) {
    if (!this.enabled) return;
    
    const routeChange = {
      type: type,
      route: newRoute,
      timestamp: Date.now(),
      framework: this.getActiveFramework(),
      previousRoute: this.routeChanges.length > 0 ? this.routeChanges[this.routeChanges.length - 1].route : window.location.href
    };
    
    this.routeChanges.push(routeChange);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `SPA Detector: Route change detected - ${type}: ${newRoute}`});
    
    // Emit event for crawler integration
    window.dispatchEvent(new CustomEvent('spa-route-change', {
      detail: routeChange
    }));
  }

  getActiveFramework() {
    for (const [name, active] of Object.entries(this.frameworks)) {
      if (active) return name;
    }
    return 'generic';
  }

  getRouteChanges() {
    return this.routeChanges;
  }

  getFrameworkInfo() {
    return {
      detected: this.frameworks,
      active: this.getActiveFramework(),
      isSPA: Object.values(this.frameworks).some(f => f)
    };
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.initialize();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Enabled'});
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    // Restore original methods
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SPA Detector: Disabled'});
  }

  cleanup() {
    this.disable();
    this.routeChanges = [];
  }
}

window.SPADetector = SPADetector;
}

console.log('=== SPA DETECTOR SCRIPT LOADED ===');
