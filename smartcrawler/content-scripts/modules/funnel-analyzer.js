console.log('=== FUNNEL ANALYZER SCRIPT LOADING ===');

if (typeof window.FunnelAnalyzer === 'undefined') {
class FunnelAnalyzer {
  constructor(config = {}) {
    this.enabled = false;
    this.config = {
      autoDetectFunnels: true,
      trackTimeInSteps: true,
      trackDropOffReasons: true,
      maxFunnelSteps: 10,
      stepTimeoutMs: 300000, // 5 minutes
      ...config
    };
    
    this.funnels = {};
    this.currentFunnel = null;
    this.currentStep = null;
    this.stepStartTime = null;
    this.eventListeners = [];
    
    // Common e-commerce funnel patterns
    this.defaultFunnels = {
      'ecommerce': {
        name: 'E-commerce Purchase Funnel',
        steps: [
          { name: 'Homepage', urlPattern: /\/$/, selector: null },
          { name: 'Category', urlPattern: /\/category\/|\/products\/|\/shop\//, selector: null },
          { name: 'Product', urlPattern: /\/product\/|\/item\/|\/p\//, selector: null },
          { name: 'Cart', urlPattern: /\/cart\/|\/basket\//, selector: null },
          { name: 'Checkout', urlPattern: /\/checkout\/|\/order\//, selector: null },
          { name: 'Success', urlPattern: /\/success\/|\/thank-you\/|\/complete\//, selector: null }
        ]
      },
      'todo': {
        name: 'Todo Application Funnel',
        steps: [
          { name: 'Landing', urlPattern: /\/$/, selector: null },
          { name: 'Add Todo', urlPattern: /.*/, selector: 'input[placeholder*="todo"], input[placeholder*="task"]' },
          { name: 'Complete Todo', urlPattern: /.*/, selector: 'input[type="checkbox"], .toggle' },
          { name: 'Clear Completed', urlPattern: /.*/, selector: 'button:contains("clear"), .clear-completed' }
        ]
      },
      'contact': {
        name: 'Contact Form Funnel',
        steps: [
          { name: 'Landing', urlPattern: /\/$/, selector: null },
          { name: 'Contact Form', urlPattern: /\/contact\/|\/contact-us\//, selector: null },
          { name: 'Form Fill', urlPattern: /.*/, selector: 'form' },
          { name: 'Form Submit', urlPattern: /.*/, selector: 'button[type="submit"], input[type="submit"]' },
          { name: 'Success', urlPattern: /\/success\/|\/thank-you\//, selector: null }
        ]
      }
    };
    
    console.log('Funnel Analyzer initialized');
  }

  /**
   * Define a custom funnel
   */
  defineFunnel(funnelId, steps) {
    this.funnels[funnelId] = {
      name: steps.name || `Custom Funnel ${funnelId}`,
      steps: steps.steps || steps,
      startTime: Date.now(),
      sessions: [],
      currentSession: null
    };
    
    console.log(`Funnel defined: ${funnelId}`);
  }

  /**
   * Auto-detect funnel based on URL patterns
   */
  autoDetectFunnel() {
    if (!this.enabled || !this.config.autoDetectFunnels) return null;
    
    const currentUrl = window.location.href;
    const pathname = window.location.pathname;
    
    // Check against default funnels
    for (const [funnelId, funnel] of Object.entries(this.defaultFunnels)) {
      for (const step of funnel.steps) {
        if (step.urlPattern.test(pathname)) {
          this.defineFunnel(funnelId, funnel);
          return funnelId;
        }
      }
    }
    
    // Try to detect common patterns
    if (pathname.includes('/product/') || pathname.includes('/item/')) {
      this.defineFunnel('detected_ecommerce', this.defaultFunnels.ecommerce);
      return 'detected_ecommerce';
    }
    
    if (pathname.includes('/contact') || document.querySelector('form')) {
      this.defineFunnel('detected_contact', this.defaultFunnels.contact);
      return 'detected_contact';
    }
    
    return null;
  }

  /**
   * Start tracking a funnel session
   */
  startFunnelSession(funnelId) {
    if (!this.enabled || !this.funnels[funnelId]) return;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      funnelId: funnelId,
      startTime: Date.now(),
      endTime: null,
      steps: [],
      completed: false,
      currentStepIndex: -1,
      dropOffReason: null,
      url: window.location.href
    };
    
    this.funnels[funnelId].sessions.push(session);
    this.funnels[funnelId].currentSession = session;
    this.currentFunnel = funnelId;
    
    console.log(`Funnel session started: ${funnelId} - ${sessionId}`);
  }

  /**
   * Track progress through funnel steps
   */
  trackFunnelProgress(stepName, element = null) {
    if (!this.enabled || !this.currentFunnel || !this.funnels[this.currentFunnel]) return;
    
    const funnel = this.funnels[this.currentFunnel];
    const session = funnel.currentSession;
    if (!session) return;
    
    // Find step in funnel definition
    const stepIndex = funnel.steps.findIndex(step => 
      step.name.toLowerCase() === stepName.toLowerCase() ||
      (step.selector && element && this.elementMatchesSelector(element, step.selector))
    );
    
    if (stepIndex === -1) {
      console.log(`Step not found in funnel: ${stepName}`);
      return;
    }
    
    // End previous step if exists
    if (this.currentStep && this.stepStartTime) {
      this.endStep(session, this.currentStep, this.stepStartTime);
    }
    
    // Start new step
    this.startStep(session, stepIndex, stepName, element);
  }

  /**
   * Start tracking a funnel step
   */
  startStep(session, stepIndex, stepName, element) {
    this.currentStep = stepIndex;
    this.stepStartTime = Date.now();
    
    const stepData = {
      index: stepIndex,
      name: stepName,
      startTime: this.stepStartTime,
      endTime: null,
      duration: 0,
      url: window.location.href,
      element: element ? this.getElementSelector(element) : null,
      completed: false,
      dropOffReason: null
    };
    
    session.steps[stepIndex] = stepData;
    session.currentStepIndex = stepIndex;
    
    console.log(`Funnel step started: ${stepName} (index: ${stepIndex})`);
  }

  /**
   * End tracking a funnel step
   */
  endStep(session, stepIndex, startTime, reason = 'completed') {
    if (session.steps[stepIndex]) {
      session.steps[stepIndex].endTime = Date.now();
      session.steps[stepIndex].duration = session.steps[stepIndex].endTime - startTime;
      session.steps[stepIndex].completed = true;
      session.steps[stepIndex].dropOffReason = reason === 'completed' ? null : reason;
      
      console.log(`Funnel step ended: ${session.steps[stepIndex].name} (${session.steps[stepIndex].duration}ms)`);
    }
  }

  /**
   * Check if element matches selector
   */
  elementMatchesSelector(element, selector) {
    if (!element || !selector) return false;
    
    try {
      // Handle :contains() pseudo-selector
      if (selector.includes(':contains(')) {
        const parts = selector.split(':contains(');
        const baseSelector = parts[0];
        const text = parts[1].replace(/\)$/, '');
        
        if (element.matches(baseSelector)) {
          return element.textContent.includes(text);
        }
        return false;
      }
      
      return element.matches(selector);
    } catch (error) {
      console.warn('Error matching selector:', error);
      return false;
    }
  }

  /**
   * Get CSS selector for an element
   */
  getElementSelector(element) {
    if (!element || !element.tagName) return null;
    
    try {
      if (element.id) return `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        }
      }
      if (element.name) return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
      
      return element.tagName.toLowerCase();
    } catch (error) {
      return element.tagName?.toLowerCase() || 'unknown';
    }
  }

  /**
   * Detect drop-off reasons
   */
  detectDropOffReason() {
    const reasons = [];
    
    // Check for form errors
    const formErrors = document.querySelectorAll('.error, .invalid, [aria-invalid="true"]');
    if (formErrors.length > 0) {
      reasons.push('form_errors');
    }
    
    // Check for loading states
    const loadingElements = document.querySelectorAll('[aria-busy="true"], .loading, .spinner');
    if (loadingElements.length > 0) {
      reasons.push('loading_timeout');
    }
    
    // Check for network errors
    if (window.navigator.onLine === false) {
      reasons.push('network_error');
    }
    
    // Check for high prices or out of stock
    const priceElements = document.querySelectorAll('[class*="price"], [id*="price"]');
    priceElements.forEach(el => {
      const text = el.textContent;
      if (text.includes('$') && parseFloat(text.replace(/[^0-9.]/g, '')) > 1000) {
        reasons.push('high_price');
      }
    });
    
    const stockElements = document.querySelectorAll('[class*="stock"], [id*="stock"]');
    stockElements.forEach(el => {
      if (el.textContent.toLowerCase().includes('out of stock')) {
        reasons.push('out_of_stock');
      }
    });
    
    return reasons.length > 0 ? reasons.join(', ') : 'unknown';
  }

  /**
   * Calculate conversion rates for a funnel
   */
  calculateConversionRates(funnelId) {
    if (!this.funnels[funnelId]) return null;
    
    const funnel = this.funnels[funnelId];
    const steps = funnel.steps.map((step, index) => {
      const entered = funnel.sessions.filter(session => 
        session.steps[index] && session.steps[index].startTime
      ).length;
      
      const completed = funnel.sessions.filter(session => 
        session.steps[index] && session.steps[index].completed
      ).length;
      
      const avgTimeSpent = funnel.sessions
        .filter(session => session.steps[index] && session.steps[index].duration > 0)
        .reduce((sum, session) => sum + session.steps[index].duration, 0) / 
        Math.max(completed, 1);
      
      const dropOffReasons = funnel.sessions
        .filter(session => session.steps[index] && session.steps[index].dropOffReason)
        .map(session => session.steps[index].dropOffReason);
      
      return {
        name: step.name,
        urlPattern: step.urlPattern.toString(),
        entered,
        completed,
        conversionRate: entered > 0 ? Math.round((completed / entered) * 100 * 100) / 100 : 0,
        avgTimeSpent: Math.round(avgTimeSpent),
        dropOffReasons: [...new Set(dropOffReasons)]
      };
    });
    
    const overallConversion = steps.length > 0 && steps[0].entered > 0 
      ? Math.round((steps[steps.length - 1].completed / steps[0].entered) * 100 * 100) / 100 
      : 0;
    
    return {
      name: funnel.name,
      steps,
      overallConversion,
      totalSessions: funnel.sessions.length,
      completedSessions: funnel.sessions.filter(s => s.completed).length
    };
  }

  /**
   * Get all funnel data
   */
  getFunnelData() {
    const result = {};
    
    for (const [funnelId, funnel] of Object.entries(this.funnels)) {
      result[funnelId] = this.calculateConversionRates(funnelId);
    }
    
    return result;
  }

  /**
   * Initialize automatic funnel detection
   */
  initializeAutoDetection() {
    if (!this.enabled || !this.config.autoDetectFunnels) return;
    
    // Try to auto-detect funnel on page load
    const detectedFunnel = this.autoDetectFunnel();
    if (detectedFunnel) {
      this.startFunnelSession(detectedFunnel);
    }
    
    // Listen for URL changes (SPA navigation)
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        
        // Check if we're still in the same funnel
        if (this.currentFunnel && this.funnels[this.currentFunnel]) {
          const funnel = this.funnels[this.currentFunnel];
          const matchingStep = funnel.steps.find(step => 
            step.urlPattern.test(window.location.pathname)
          );
          
          if (matchingStep) {
            this.trackFunnelProgress(matchingStep.name);
          }
        } else {
          // Try to detect new funnel
          const detectedFunnel = this.autoDetectFunnel();
          if (detectedFunnel) {
            this.startFunnelSession(detectedFunnel);
          }
        }
      }
    };
    
    // Check for URL changes periodically
    setInterval(checkUrlChange, 1000);
    
    // Listen for popstate events (back/forward navigation)
    const popstateHandler = () => {
      setTimeout(checkUrlChange, 100);
    };
    window.addEventListener('popstate', popstateHandler);
    this.eventListeners.push({ event: 'popstate', handler: popstateHandler });
    
    console.log('Funnel auto-detection initialized');
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Enable the funnel analyzer
   */
  enable() {
    this.enabled = true;
    this.initializeAutoDetection();
    console.log('Funnel Analyzer enabled');
  }

  /**
   * Disable the funnel analyzer
   */
  disable() {
    this.removeEventListeners();
    this.enabled = false;
    console.log('Funnel Analyzer disabled');
  }

  /**
   * Clear all funnel data
   */
  clear() {
    this.funnels = {};
    this.currentFunnel = null;
    this.currentStep = null;
    this.stepStartTime = null;
    console.log('Funnel Analyzer data cleared');
  }
}

// Make available globally
window.FunnelAnalyzer = FunnelAnalyzer;
}

console.log('=== FUNNEL ANALYZER SCRIPT LOADED ===');
