/**
 * Interactive Element Discoverer - Finds all interactive elements on a page
 * Discovers: drag-droppable, resizable, selectable, clickable, hoverable elements
 */

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Interactive Element Discoverer: Loading module...'});

class InteractiveElementDiscoverer {
  constructor() {
    this.discoveredElements = new Map();
  }
  
  /**
   * Discover all interactive elements on the current page
   */
  discoverAll() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔍 Discovering all interactive elements...'});
    
    const elements = {
      draggable: this.findDraggableElements(),
      droppable: this.findDroppableElements(),
      resizable: this.findResizableElements(),
      selectable: this.findSelectableElements(),
      sortable: this.findSortableElements(),
      clickable: this.findClickableElements(),
      hoverable: this.findHoverableElements(),
      contextMenuTriggers: this.findContextMenuTriggers(),
      doubleClickable: this.findDoubleClickableElements(),
      sliders: this.findSliders(),
      accordions: this.findAccordions(),
      tabs: this.findTabs(),
      modals: this.findModals()
    };
    
    const totalCount = Object.values(elements).reduce((sum, arr) => sum + arr.length, 0);
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Found ${totalCount} interactive elements across ${Object.keys(elements).length} categories`});
    
    return elements;
  }
  
  /**
   * Find draggable elements
   */
  findDraggableElements() {
    const selectors = [
      '[draggable="true"]',
      '.draggable',
      '.ui-draggable',
      '[class*="drag"]',
      '[data-draggable]'
    ];
    
    return this.findElements(selectors, 'draggable');
  }
  
  /**
   * Find droppable elements
   */
  findDroppableElements() {
    const selectors = [
      '.droppable',
      '.ui-droppable',
      '[class*="drop"]',
      '[data-droppable]',
      '[ondrop]'
    ];
    
    return this.findElements(selectors, 'droppable');
  }
  
  /**
   * Find resizable elements
   */
  findResizableElements() {
    const selectors = [
      '.resizable',
      '.ui-resizable',
      '[class*="resize"]',
      '[data-resizable]'
    ];
    
    const resizable = this.findElements(selectors, 'resizable');
    
    // Also check for resize handles
    resizable.forEach(el => {
      const handles = el.element.querySelectorAll('[class*="resize-handle"], .ui-resizable-handle');
      if (handles.length > 0) {
        el.hasResizeHandles = true;
        el.handleCount = handles.length;
      }
    });
    
    return resizable;
  }
  
  /**
   * Find selectable elements
   */
  findSelectableElements() {
    const selectors = [
      '.selectable',
      '.ui-selectable',
      '[class*="select"]',
      '.ui-selectee',
      '[data-selectable]'
    ];
    
    return this.findElements(selectors, 'selectable');
  }
  
  /**
   * Find sortable elements
   */
  findSortableElements() {
    const selectors = [
      '.sortable',
      '.ui-sortable',
      '[class*="sort"]',
      '[data-sortable]'
    ];
    
    return this.findElements(selectors, 'sortable');
  }
  
  /**
   * Find clickable elements
   */
  findClickableElements() {
    const selectors = [
      'button',
      '[role="button"]',
      '.btn',
      '.button',
      '[onclick]',
      'a[href]',
      'input[type="button"]',
      'input[type="submit"]',
      '[class*="click"]'
    ];
    
    return this.findElements(selectors, 'clickable').slice(0, 50); // Limit to avoid noise
  }
  
  /**
   * Find hoverable elements (with tooltips, dropdowns, etc.)
   */
  findHoverableElements() {
    const selectors = [
      '[title]',
      '[data-tooltip]',
      '[data-hover]',
      '.tooltip-trigger',
      '[aria-describedby]',
      '.has-tooltip',
      '[onmouseover]',
      '[class*="hover"]'
    ];
    
    return this.findElements(selectors, 'hoverable');
  }
  
  /**
   * Find context menu triggers
   */
  findContextMenuTriggers() {
    const selectors = [
      '[oncontextmenu]',
      '[data-contextmenu]',
      '.context-menu-trigger',
      '[class*="right-click"]'
    ];
    
    return this.findElements(selectors, 'contextmenu');
  }
  
  /**
   * Find double-clickable elements
   */
  findDoubleClickableElements() {
    const selectors = [
      '[ondblclick]',
      '[data-dblclick]',
      '.dblclick',
      '[class*="double-click"]'
    ];
    
    return this.findElements(selectors, 'doubleclick');
  }
  
  /**
   * Find sliders
   */
  findSliders() {
    const selectors = [
      'input[type="range"]',
      '.slider',
      '.ui-slider',
      '[role="slider"]',
      '[class*="slider"]'
    ];
    
    return this.findElements(selectors, 'slider');
  }
  
  /**
   * Find accordions
   */
  findAccordions() {
    const selectors = [
      '.accordion',
      '.ui-accordion',
      '[class*="accordion"]',
      '[role="tablist"]',
      '.collapse'
    ];
    
    const accordions = this.findElements(selectors, 'accordion');
    
    // Find accordion items
    accordions.forEach(acc => {
      const items = acc.element.querySelectorAll('.accordion-item, .ui-accordion-header, [role="tab"]');
      acc.itemCount = items.length;
    });
    
    return accordions;
  }
  
  /**
   * Find tabs
   */
  findTabs() {
    const selectors = [
      '[role="tablist"]',
      '.tabs',
      '.ui-tabs',
      '[class*="tab"]',
      '.nav-tabs'
    ];
    
    const tabs = this.findElements(selectors, 'tabs');
    
    // Find tab panels
    tabs.forEach(tab => {
      const panels = tab.element.querySelectorAll('[role="tabpanel"], .tab-pane');
      tab.panelCount = panels.length;
    });
    
    return tabs;
  }
  
  /**
   * Find modals/dialogs
   */
  findModals() {
    const selectors = [
      '[role="dialog"]',
      '.modal',
      '.dialog',
      '.ui-dialog',
      '[class*="popup"]',
      '[class*="overlay"]'
    ];
    
    const modals = this.findElements(selectors, 'modal');
    
    // Find modal triggers
    const triggers = document.querySelectorAll('[data-toggle="modal"], [data-target*="modal"], .modal-trigger');
    
    return {
      modals: modals,
      triggers: Array.from(triggers).map(t => this.getElementInfo(t, 'modal-trigger'))
    };
  }
  
  /**
   * Find elements by selectors
   */
  findElements(selectors, type) {
    const found = new Set();
    const elements = [];
    
    for (const selector of selectors) {
      try {
        const matches = document.querySelectorAll(selector);
        for (const el of matches) {
          if (!found.has(el) && this.isVisible(el)) {
            found.add(el);
            elements.push(this.getElementInfo(el, type));
          }
        }
      } catch (error) {
        // Invalid selector, skip
      }
    }
    
    return elements;
  }
  
  /**
   * Check if element is visible
   */
  isVisible(element) {
    try {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             rect.width > 0 &&
             rect.height > 0;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get element info
   */
  getElementInfo(element, type) {
    try {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      
      return {
        type,
        element: element,
        tagName: element.tagName?.toLowerCase(),
        id: element.id,
        className: element.className,
        selector: this.getSelector(element),
        text: element.textContent?.trim().substring(0, 50),
        attributes: this.getRelevantAttributes(element),
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(element),
        hasEventListeners: this.hasEventListeners(element),
        ariaRole: element.getAttribute('role'),
        ariaLabel: element.getAttribute('aria-label')
      };
    } catch (error) {
      return {
        type,
        element: element,
        error: error.message
      };
    }
  }
  
  /**
   * Get relevant attributes
   */
  getRelevantAttributes(element) {
    const relevant = ['id', 'class', 'data-*', 'aria-*', 'role', 'title', 'draggable', 'contenteditable'];
    const attrs = {};
    
    for (const attr of element.attributes) {
      if (relevant.some(r => r.includes('*') ? attr.name.startsWith(r.replace('*', '')) : attr.name === r)) {
        attrs[attr.name] = attr.value;
      }
    }
    
    return attrs;
  }
  
  /**
   * Check if element has event listeners
   */
  hasEventListeners(element) {
    // Check for inline event handlers
    const inlineEvents = ['onclick', 'ondblclick', 'onmouseover', 'onmouseout', 'ondragstart', 'ondrop', 'oncontextmenu'];
    return inlineEvents.some(event => element[event] !== null);
  }
  
  /**
   * Get CSS selector for element
   */
  getSelector(element) {
    if (element.id) return `#${element.id}`;
    
    if (element.className) {
      const className = typeof element.className === 'string' ? 
        element.className.split(' ')[0] : 
        element.className.baseVal?.split(' ')[0];
      if (className) return `.${className}`;
    }
    
    // Generate nth-child selector
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName?.toLowerCase()}:nth-child(${index})`;
    }
    
    return element.tagName?.toLowerCase() || 'unknown';
  }
  
  /**
   * Test interactive elements
   */
  async testInteractiveElement(elementInfo, actionSimulator) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🧪 Testing ${elementInfo.type} element: ${elementInfo.selector}`});
    
    try {
      let result;
      
      switch (elementInfo.type) {
        case 'draggable':
          // Find a droppable target or use offset
          const droppable = document.querySelector('.droppable, .ui-droppable');
          result = await actionSimulator.simulateDragDrop(
            elementInfo.element, 
            droppable || { x: 100, y: 100 }
          );
          break;
          
        case 'resizable':
          result = await actionSimulator.simulateResize(elementInfo.element, 50, 50);
          break;
          
        case 'selectable':
          result = await actionSimulator.simulateSelection(elementInfo.element, false);
          break;
          
        case 'hoverable':
          result = await actionSimulator.simulateHover(elementInfo.element);
          break;
          
        case 'doubleclick':
          result = await actionSimulator.simulateDoubleClick(elementInfo.element);
          break;
          
        case 'contextmenu':
          result = await actionSimulator.simulateContextClick(elementInfo.element);
          break;
          
        default:
          result = { action: elementInfo.type, status: 'not implemented' };
      }
      
      return result;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Testing failed for ${elementInfo.type}: ${error.message}`});
      return { action: elementInfo.type, error: error.message };
    }
  }
}

// Make InteractiveElementDiscoverer available globally
window.InteractiveElementDiscoverer = InteractiveElementDiscoverer;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Interactive Element Discoverer: Class registered globally'});
