console.log('=== JOURNEY MAPPER SCRIPT LOADING ===');

if (typeof window.JourneyMapper === 'undefined') {
class JourneyMapper {
  constructor(config = {}) {
    this.enabled = false;
    this.config = {
      trackClicks: true,
      trackFormFills: true,
      trackNavigation: true,
      trackTiming: true,
      maxJourneys: 100,
      ...config
    };
    
    this.journeys = [];
    this.currentJourney = null;
    this.eventListeners = [];
    
    console.log('Journey Mapper initialized');
  }

  /**
   * Start tracking a new user journey
   */
  startJourney(trigger = 'manual') {
    if (!this.enabled) return;
    
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentJourney = {
      id: journeyId,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      trigger: trigger,
      steps: [],
      pathHash: '',
      completed: false,
      url: window.location.href,
      title: document.title
    };
    
    // Record initial state
    this.recordAction('journey_start', null, 'Initial page load', window.location.href);
    
    console.log(`Journey started: ${journeyId}`);
  }

  /**
   * Record a user action in the current journey
   */
  recordAction(action, element, description, url = window.location.href) {
    if (!this.enabled || !this.currentJourney) return;
    
    const step = {
      timestamp: Date.now(),
      action: action,
      element: element ? this.getElementSelector(element) : null,
      elementText: element ? this.getElementText(element) : null,
      elementType: element ? element.tagName.toLowerCase() : null,
      description: description,
      url: url,
      stateHash: this.getCurrentStateHash(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      }
    };
    
    this.currentJourney.steps.push(step);
    
    // Update path hash
    this.updatePathHash(step);
    
    console.log(`Action recorded: ${action} - ${description}`);
  }

  /**
   * End the current journey
   */
  endJourney(reason = 'manual') {
    if (!this.enabled || !this.currentJourney) return;
    
    this.currentJourney.endTime = Date.now();
    this.currentJourney.duration = this.currentJourney.endTime - this.currentJourney.startTime;
    this.currentJourney.completed = true;
    this.currentJourney.endReason = reason;
    
    // Record final state
    this.recordAction('journey_end', null, `Journey ended: ${reason}`, window.location.href);
    
    // Save journey
    this.journeys.push({ ...this.currentJourney });
    
    // Limit journey count
    if (this.journeys.length > this.config.maxJourneys) {
      this.journeys.shift();
    }
    
    console.log(`Journey ended: ${this.currentJourney.id}, duration: ${this.currentJourney.duration}ms`);
    
    this.currentJourney = null;
  }

  /**
   * Get a CSS selector for an element
   */
  getElementSelector(element) {
    if (!element || !element.tagName) return null;
    
    try {
      // Try ID first
      if (element.id) {
        return `#${element.id}`;
      }
      
      // Try class combination
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        }
      }
      
      // Try name attribute
      if (element.name) {
        return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
      }
      
      // Try text content for buttons/links
      if (['button', 'a', 'span'].includes(element.tagName.toLowerCase())) {
        const text = element.textContent?.trim();
        if (text && text.length < 50) {
          return `${element.tagName.toLowerCase()}:contains("${text}")`;
        }
      }
      
      // Fallback to tag name
      return element.tagName.toLowerCase();
    } catch (error) {
      console.warn('Error generating element selector:', error);
      return element.tagName?.toLowerCase() || 'unknown';
    }
  }

  /**
   * Get text content from an element
   */
  getElementText(element) {
    if (!element) return null;
    
    try {
      // For form elements, get value or placeholder
      if (element.tagName === 'INPUT') {
        return element.value || element.placeholder || element.name || element.type;
      }
      if (element.tagName === 'TEXTAREA') {
        return element.value || element.placeholder || element.name;
      }
      if (element.tagName === 'SELECT') {
        return element.value || element.options[element.selectedIndex]?.text || element.name;
      }
      
      // For other elements, get text content
      const text = element.textContent?.trim();
      return text && text.length > 0 ? text.substring(0, 100) : null;
    } catch (error) {
      console.warn('Error getting element text:', error);
      return null;
    }
  }

  /**
   * Get current state hash (DOM-based)
   */
  getCurrentStateHash() {
    try {
      // Create a simple hash based on current URL and key elements
      const keyElements = document.querySelectorAll('input, button, a, form');
      const elementData = Array.from(keyElements).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        value: el.value
      }));
      
      return btoa(JSON.stringify({
        url: window.location.href,
        elements: elementData
      })).substring(0, 16);
    } catch (error) {
      return `hash_${Date.now().toString(36)}`;
    }
  }

  /**
   * Update the path hash for the journey
   */
  updatePathHash(step) {
    const pathStep = `${step.action}_${step.element || 'unknown'}`;
    this.currentJourney.pathHash = this.currentJourney.pathHash 
      ? `${this.currentJourney.pathHash}->${pathStep}`
      : pathStep;
  }

  /**
   * Initialize event listeners for automatic tracking
   */
  initializeEventListeners() {
    if (!this.enabled) return;
    
    // Click tracking
    if (this.config.trackClicks) {
      const clickHandler = (event) => {
        if (this.currentJourney) {
          this.recordAction('click', event.target, `Clicked on ${event.target.tagName}`);
        }
      };
      document.addEventListener('click', clickHandler, true);
      this.eventListeners.push({ event: 'click', handler: clickHandler });
    }
    
    // Form submission tracking
    if (this.config.trackFormFills) {
      const submitHandler = (event) => {
        if (this.currentJourney) {
          this.recordAction('form_submit', event.target, 'Form submitted');
        }
      };
      document.addEventListener('submit', submitHandler, true);
      this.eventListeners.push({ event: 'submit', handler: submitHandler });
    }
    
    // Navigation tracking
    if (this.config.trackNavigation) {
      const popstateHandler = (event) => {
        if (this.currentJourney) {
          this.recordAction('navigation', null, 'Page navigation via history API');
        }
      };
      window.addEventListener('popstate', popstateHandler);
      this.eventListeners.push({ event: 'popstate', handler: popstateHandler });
    }
    
    console.log('Journey Mapper event listeners initialized');
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ event, handler }) => {
      if (event === 'popstate') {
        window.removeEventListener(event, handler);
      } else {
        document.removeEventListener(event, handler, true);
      }
    });
    this.eventListeners = [];
  }

  /**
   * Get all captured journeys
   */
  getJourneys() {
    return {
      total: this.journeys.length,
      journeys: this.journeys.map(journey => ({
        ...journey,
        stepCount: journey.steps.length,
        avgTimePerStep: journey.steps.length > 0 ? journey.duration / journey.steps.length : 0
      })),
      summary: this.generateJourneySummary()
    };
  }

  /**
   * Generate summary statistics
   */
  generateJourneySummary() {
    if (this.journeys.length === 0) {
      return {
        totalJourneys: 0,
        avgDuration: 0,
        avgSteps: 0,
        mostCommonActions: [],
        completionRate: 0
      };
    }
    
    const totalDuration = this.journeys.reduce((sum, j) => sum + j.duration, 0);
    const totalSteps = this.journeys.reduce((sum, j) => sum + j.steps.length, 0);
    const completedJourneys = this.journeys.filter(j => j.completed).length;
    
    // Count action frequencies
    const actionCounts = {};
    this.journeys.forEach(journey => {
      journey.steps.forEach(step => {
        actionCounts[step.action] = (actionCounts[step.action] || 0) + 1;
      });
    });
    
    const mostCommonActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
    
    return {
      totalJourneys: this.journeys.length,
      avgDuration: Math.round(totalDuration / this.journeys.length),
      avgSteps: Math.round(totalSteps / this.journeys.length),
      mostCommonActions,
      completionRate: Math.round((completedJourneys / this.journeys.length) * 100)
    };
  }

  /**
   * Enable the journey mapper
   */
  enable() {
    this.enabled = true;
    this.startJourney('auto_start');
    this.initializeEventListeners();
    
    // Add cleanup on page unload to prevent memory leaks
    this.unloadHandler = () => {
      this.disable();
    };
    window.addEventListener('beforeunload', this.unloadHandler);
    
    console.log('Journey Mapper enabled with cleanup handler');
  }

  /**
   * Disable the journey mapper
   */
  disable() {
    if (this.currentJourney) {
      this.endJourney('disabled');
    }
    this.removeEventListeners();
    
    // Remove unload handler if it exists
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
    
    this.enabled = false;
    console.log('Journey Mapper disabled and cleaned up');
  }

  /**
   * Clear all journey data
   */
  clear() {
    this.journeys = [];
    if (this.currentJourney) {
      this.currentJourney = null;
    }
    console.log('Journey Mapper data cleared');
  }
}

// Make available globally
window.JourneyMapper = JourneyMapper;
}

console.log('=== JOURNEY MAPPER SCRIPT LOADED ===');
