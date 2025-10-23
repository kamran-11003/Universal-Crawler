console.log('=== HEATMAP COLLECTOR SCRIPT LOADING ===');

if (typeof window.HeatmapCollector === 'undefined') {
class HeatmapCollector {
  constructor(config = {}) {
    this.enabled = false;
    this.config = {
      trackClicks: true,
      trackHovers: true,
      trackScroll: true,
      clickThreshold: 100, // ms
      hoverThreshold: 500, // ms
      scrollThreshold: 100, // ms
      maxDataPoints: 1000,
      ...config
    };
    
    this.heatmapData = {
      clicks: [],
      hovers: [],
      scrollDepth: [],
      scrollPositions: []
    };
    
    this.eventListeners = [];
    this.hoverStartTime = null;
    this.hoverElement = null;
    this.lastScrollTime = 0;
    this.maxScrollDepth = 0;
    
    console.log('Heatmap Collector initialized');
  }

  /**
   * Track click events with coordinates
   */
  trackClick(event) {
    if (!this.enabled || !this.config.trackClicks) return;
    
    const clickData = {
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      element: this.getElementSelector(event.target),
      elementText: this.getElementText(event.target),
      elementType: event.target.tagName.toLowerCase(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      pageX: event.pageX,
      pageY: event.pageY,
      url: window.location.href
    };
    
    this.heatmapData.clicks.push(clickData);
    
    // Limit data points
    if (this.heatmapData.clicks.length > this.config.maxDataPoints) {
      this.heatmapData.clicks.shift();
    }
    
    console.log(`Click tracked: (${clickData.x}, ${clickData.y}) on ${clickData.element}`);
  }

  /**
   * Track hover events with duration
   */
  trackHover(event, type) {
    if (!this.enabled || !this.config.trackHovers) return;
    
    if (type === 'start') {
      this.hoverStartTime = Date.now();
      this.hoverElement = event.target;
    } else if (type === 'end' && this.hoverStartTime && this.hoverElement) {
      const duration = Date.now() - this.hoverStartTime;
      
      if (duration >= this.config.hoverThreshold) {
        const hoverData = {
          timestamp: this.hoverStartTime,
          duration: duration,
          element: this.getElementSelector(this.hoverElement),
          elementText: this.getElementText(this.hoverElement),
          elementType: this.hoverElement.tagName.toLowerCase(),
          x: event.clientX,
          y: event.clientY,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          url: window.location.href
        };
        
        this.heatmapData.hovers.push(hoverData);
        
        // Limit data points
        if (this.heatmapData.hovers.length > this.config.maxDataPoints) {
          this.heatmapData.hovers.shift();
        }
        
        console.log(`Hover tracked: ${duration}ms on ${hoverData.element}`);
      }
      
      this.hoverStartTime = null;
      this.hoverElement = null;
    }
  }

  /**
   * Track scroll events and depth
   */
  trackScroll(event) {
    if (!this.enabled || !this.config.trackScroll) return;
    
    const now = Date.now();
    if (now - this.lastScrollTime < this.config.scrollThreshold) return;
    
    this.lastScrollTime = now;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const windowHeight = window.innerHeight;
    const scrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
    
    // Update max scroll depth
    this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollDepth);
    
    const scrollData = {
      timestamp: now,
      scrollTop: scrollTop,
      scrollLeft: window.pageXOffset || document.documentElement.scrollLeft,
      scrollDepth: scrollDepth,
      maxScrollDepth: this.maxScrollDepth,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      documentHeight: documentHeight,
      url: window.location.href
    };
    
    // Only record significant scroll depth changes (every 25%)
    const lastDepth = this.heatmapData.scrollDepth[this.heatmapData.scrollDepth.length - 1];
    if (!lastDepth || Math.abs(scrollDepth - lastDepth.scrollDepth) >= 25) {
      this.heatmapData.scrollDepth.push(scrollData);
    }
    
    // Always record scroll positions for smooth tracking
    this.heatmapData.scrollPositions.push(scrollData);
    
    // Limit data points
    if (this.heatmapData.scrollPositions.length > this.config.maxDataPoints) {
      this.heatmapData.scrollPositions.shift();
    }
    
    console.log(`Scroll tracked: ${scrollDepth}% depth`);
  }

  /**
   * Get CSS selector for an element
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
   * Initialize event listeners for automatic tracking
   */
  initializeEventListeners() {
    if (!this.enabled) return;
    
    // Click tracking
    if (this.config.trackClicks) {
      const clickHandler = (event) => {
        this.trackClick(event);
      };
      document.addEventListener('click', clickHandler, true);
      this.eventListeners.push({ event: 'click', handler: clickHandler });
    }
    
    // Hover tracking
    if (this.config.trackHovers) {
      const mouseEnterHandler = (event) => {
        this.trackHover(event, 'start');
      };
      const mouseLeaveHandler = (event) => {
        this.trackHover(event, 'end');
      };
      
      document.addEventListener('mouseenter', mouseEnterHandler, true);
      document.addEventListener('mouseleave', mouseLeaveHandler, true);
      
      this.eventListeners.push({ event: 'mouseenter', handler: mouseEnterHandler });
      this.eventListeners.push({ event: 'mouseleave', handler: mouseLeaveHandler });
    }
    
    // Scroll tracking
    if (this.config.trackScroll) {
      const scrollHandler = (event) => {
        this.trackScroll(event);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
      this.eventListeners.push({ event: 'scroll', handler: scrollHandler });
    }
    
    console.log('Heatmap Collector event listeners initialized');
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ event, handler }) => {
      if (event === 'scroll') {
        window.removeEventListener(event, handler);
      } else {
        document.removeEventListener(event, handler, true);
      }
    });
    this.eventListeners = [];
  }

  /**
   * Get aggregated heatmap data
   */
  getHeatmapData() {
    return {
      clicks: this.heatmapData.clicks,
      hovers: this.heatmapData.hovers,
      scrollDepth: this.heatmapData.scrollDepth,
      scrollPositions: this.heatmapData.scrollPositions,
      summary: this.generateHeatmapSummary()
    };
  }

  /**
   * Generate summary statistics
   */
  generateHeatmapSummary() {
    const totalClicks = this.heatmapData.clicks.length;
    const totalHovers = this.heatmapData.hovers.length;
    const avgScrollDepth = this.heatmapData.scrollDepth.length > 0 
      ? this.heatmapData.scrollDepth.reduce((sum, s) => sum + s.scrollDepth, 0) / this.heatmapData.scrollDepth.length 
      : 0;
    
    // Find most clicked elements
    const clickCounts = {};
    this.heatmapData.clicks.forEach(click => {
      clickCounts[click.element] = (clickCounts[click.element] || 0) + 1;
    });
    
    const mostClicked = Object.entries(clickCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([element, count]) => ({ element, count }));
    
    // Find most hovered elements
    const hoverCounts = {};
    this.heatmapData.hovers.forEach(hover => {
      hoverCounts[hover.element] = (hoverCounts[hover.element] || 0) + 1;
    });
    
    const mostHovered = Object.entries(hoverCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([element, count]) => ({ element, count }));
    
    return {
      totalClicks,
      totalHovers,
      avgScrollDepth: Math.round(avgScrollDepth),
      maxScrollDepth: this.maxScrollDepth,
      mostClicked,
      mostHovered,
      dataPoints: {
        clicks: this.heatmapData.clicks.length,
        hovers: this.heatmapData.hovers.length,
        scrollDepth: this.heatmapData.scrollDepth.length,
        scrollPositions: this.heatmapData.scrollPositions.length
      }
    };
  }

  /**
   * Get click heatmap data for visualization
   */
  getClickHeatmap() {
    return this.heatmapData.clicks.map(click => ({
      x: click.x,
      y: click.y,
      value: 1,
      element: click.element,
      timestamp: click.timestamp
    }));
  }

  /**
   * Get scroll depth data for visualization
   */
  getScrollDepthHeatmap() {
    return this.heatmapData.scrollDepth.map(scroll => ({
      depth: scroll.scrollDepth,
      timestamp: scroll.timestamp,
      url: scroll.url
    }));
  }

  /**
   * Enable the heatmap collector
   */
  enable() {
    this.enabled = true;
    this.initializeEventListeners();
    
    // Add cleanup on page unload to prevent memory leaks
    this.unloadHandler = () => {
      this.disable();
    };
    window.addEventListener('beforeunload', this.unloadHandler);
    
    console.log('Heatmap Collector enabled with cleanup handler');
  }

  /**
   * Disable the heatmap collector
   */
  disable() {
    this.removeEventListeners();
    
    // Remove unload handler if it exists
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
    
    this.enabled = false;
    console.log('Heatmap Collector disabled and cleaned up');
  }

  /**
   * Clear all heatmap data
   */
  clear() {
    this.heatmapData = {
      clicks: [],
      hovers: [],
      scrollDepth: [],
      scrollPositions: []
    };
    this.maxScrollDepth = 0;
    console.log('Heatmap Collector data cleared');
  }
}

// Make available globally
window.HeatmapCollector = HeatmapCollector;
}

console.log('=== HEATMAP COLLECTOR SCRIPT LOADED ===');
