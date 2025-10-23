/**
 * Action Simulator - Simulates user interactions to discover dynamic content
 * Handles: drag-drop, hover, double-click, right-click, resize, etc.
 */

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Action Simulator: Loading module...'});

class ActionSimulator {
  constructor() {
    this.discoveredStates = new Map();
    this.actionHistory = [];
  }
  
  /**
   * Simulate drag-and-drop interaction
   */
  async simulateDragDrop(draggable, target) {
    try {
      const draggableRect = draggable.getBoundingClientRect();
      const startX = draggableRect.left + draggableRect.width / 2;
      const startY = draggableRect.top + draggableRect.height / 2;
      
      let endX, endY;
      if (typeof target === 'object' && target.x !== undefined) {
        // Offset-based drag
        endX = startX + target.x;
        endY = startY + target.y;
      } else {
        // Target element-based drag
        const targetRect = target.getBoundingClientRect();
        endX = targetRect.left + targetRect.width / 2;
        endY = targetRect.top + targetRect.height / 2;
      }
      
      // Capture before state
      const beforeState = this.captureElementState(draggable);
      
      // Simulate drag events
      this.fireMouseEvent(draggable, 'mousedown', startX, startY);
      await this.sleep(50);
      
      this.fireMouseEvent(document, 'mousemove', endX, endY);
      await this.sleep(50);
      
      this.fireMouseEvent(draggable, 'mouseup', endX, endY);
      await this.sleep(100);
      
      // Also try HTML5 drag events
      this.fireDragEvent(draggable, 'dragstart', startX, startY);
      this.fireDragEvent(document, 'drag', endX, endY);
      this.fireDragEvent(target, 'dragenter', endX, endY);
      this.fireDragEvent(target, 'dragover', endX, endY);
      this.fireDragEvent(target, 'drop', endX, endY);
      this.fireDragEvent(draggable, 'dragend', endX, endY);
      
      // Capture after state
      await this.sleep(100);
      const afterState = this.captureElementState(draggable);
      
      const result = {
        action: 'dragdrop',
        element: this.getElementInfo(draggable),
        target: typeof target === 'object' && target.x !== undefined ? target : this.getElementInfo(target),
        beforeState,
        afterState,
        stateChanged: this.detectStateChange(beforeState, afterState),
        newElementsDiscovered: this.detectNewElements(),
        timestamp: Date.now()
      };
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Drag-drop simulation failed:', error);
      return { action: 'dragdrop', error: error.message };
    }
  }
  
  /**
   * Simulate hover interaction
   */
  async simulateHover(element) {
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const beforeState = this.capturePageState();
      
      // Fire hover events
      this.fireMouseEvent(element, 'mouseover', x, y);
      this.fireMouseEvent(element, 'mouseenter', x, y);
      await this.sleep(300); // Wait for tooltips/dropdowns
      
      const afterState = this.capturePageState();
      
      const result = {
        action: 'hover',
        element: this.getElementInfo(element),
        beforeState,
        afterState,
        newElementsDiscovered: this.detectNewElements(),
        tooltipsAppeared: this.detectTooltips(),
        menusAppeared: this.detectMenus(),
        timestamp: Date.now()
      };
      
      // Unhover
      this.fireMouseEvent(element, 'mouseout', x, y);
      this.fireMouseEvent(element, 'mouseleave', x, y);
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Hover simulation failed:', error);
      return { action: 'hover', error: error.message };
    }
  }
  
  /**
   * Simulate double-click
   */
  async simulateDoubleClick(element) {
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const beforeState = this.capturePageState();
      
      this.fireMouseEvent(element, 'dblclick', x, y);
      await this.sleep(100);
      
      const afterState = this.capturePageState();
      
      const result = {
        action: 'doubleclick',
        element: this.getElementInfo(element),
        beforeState,
        afterState,
        alertsDetected: this.detectAlerts(),
        newWindowsOpened: this.detectNewWindows(),
        timestamp: Date.now()
      };
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Double-click simulation failed:', error);
      return { action: 'doubleclick', error: error.message };
    }
  }
  
  /**
   * Simulate right-click (context menu)
   */
  async simulateContextClick(element) {
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const beforeState = this.capturePageState();
      
      this.fireMouseEvent(element, 'contextmenu', x, y);
      await this.sleep(200);
      
      const afterState = this.capturePageState();
      
      const result = {
        action: 'contextmenu',
        element: this.getElementInfo(element),
        beforeState,
        afterState,
        contextMenuAppeared: this.detectContextMenu(),
        timestamp: Date.now()
      };
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Context click simulation failed:', error);
      return { action: 'contextmenu', error: error.message };
    }
  }
  
  /**
   * Simulate resize interaction
   */
  async simulateResize(element, deltaX, deltaY) {
    try {
      const resizeHandle = element.querySelector('.ui-resizable-handle, [class*="resize"]') || element;
      const rect = resizeHandle.getBoundingClientRect();
      const startX = rect.right;
      const startY = rect.bottom;
      const endX = startX + deltaX;
      const endY = startY + deltaY;
      
      const beforeState = this.captureElementState(element);
      
      this.fireMouseEvent(resizeHandle, 'mousedown', startX, startY);
      await this.sleep(50);
      
      this.fireMouseEvent(document, 'mousemove', endX, endY);
      await this.sleep(50);
      
      this.fireMouseEvent(resizeHandle, 'mouseup', endX, endY);
      await this.sleep(100);
      
      const afterState = this.captureElementState(element);
      
      const result = {
        action: 'resize',
        element: this.getElementInfo(element),
        delta: { x: deltaX, y: deltaY },
        beforeState,
        afterState,
        dimensionsChanged: {
          width: afterState.boundingBox.width - beforeState.boundingBox.width,
          height: afterState.boundingBox.height - beforeState.boundingBox.height
        },
        timestamp: Date.now()
      };
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Resize simulation failed:', error);
      return { action: 'resize', error: error.message };
    }
  }
  
  /**
   * Simulate selection (for selectable lists)
   */
  async simulateSelection(element, multiSelect = false) {
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const beforeState = this.captureElementState(element);
      
      // Simulate click with optional Ctrl/Cmd for multi-select
      const modifiers = multiSelect ? { ctrlKey: true, metaKey: true } : {};
      this.fireMouseEvent(element, 'mousedown', x, y, modifiers);
      this.fireMouseEvent(element, 'mouseup', x, y, modifiers);
      this.fireMouseEvent(element, 'click', x, y, modifiers);
      await this.sleep(50);
      
      const afterState = this.captureElementState(element);
      
      const result = {
        action: 'select',
        element: this.getElementInfo(element),
        multiSelect,
        beforeState,
        afterState,
        classChanged: beforeState.className !== afterState.className,
        timestamp: Date.now()
      };
      
      this.actionHistory.push(result);
      return result;
      
    } catch (error) {
      console.error('Selection simulation failed:', error);
      return { action: 'select', error: error.message };
    }
  }
  
  /**
   * Fire mouse event
   */
  fireMouseEvent(element, eventType, x, y, modifiers = {}) {
    const event = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: eventType === 'contextmenu' ? 2 : 0,
      ...modifiers
    });
    
    element.dispatchEvent(event);
  }
  
  /**
   * Fire drag event
   */
  fireDragEvent(element, eventType, x, y) {
    const event = new DragEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      dataTransfer: new DataTransfer()
    });
    
    element.dispatchEvent(event);
  }
  
  /**
   * Capture element state
   */
  captureElementState(element) {
    try {
      const computed = window.getComputedStyle(element);
      return {
        className: element.className,
        id: element.id,
        attributes: Array.from(element.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        })),
        boundingBox: element.getBoundingClientRect(),
        computedStyle: {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          width: computed.width,
          height: computed.height
        },
        innerHTML: element.innerHTML.substring(0, 200)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * Capture page state
   */
  capturePageState() {
    return {
      documentHeight: document.documentElement.scrollHeight,
      visibleElements: document.querySelectorAll('*:not([hidden]):not([style*="display: none"])').length,
      modals: document.querySelectorAll('[role="dialog"], .modal, .popup:not([hidden])').length,
      tooltips: document.querySelectorAll('[role="tooltip"], .tooltip:not([hidden])').length
    };
  }
  
  /**
   * Detect state change
   */
  detectStateChange(before, after) {
    return {
      classChanged: before.className !== after.className,
      positionChanged: before.boundingBox.x !== after.boundingBox.x || before.boundingBox.y !== after.boundingBox.y,
      sizeChanged: before.boundingBox.width !== after.boundingBox.width || before.boundingBox.height !== after.boundingBox.height,
      styleChanged: JSON.stringify(before.computedStyle) !== JSON.stringify(after.computedStyle)
    };
  }
  
  /**
   * Detect new elements
   */
  detectNewElements() {
    const newElements = [];
    const allElements = document.querySelectorAll('*');
    
    for (const el of allElements) {
      if (!this.discoveredStates.has(el)) {
        const computed = window.getComputedStyle(el);
        if (computed.display !== 'none' && computed.visibility !== 'hidden') {
          newElements.push(this.getElementInfo(el));
          this.discoveredStates.set(el, true);
        }
      }
    }
    
    return newElements;
  }
  
  /**
   * Detect tooltips
   */
  detectTooltips() {
    const tooltips = document.querySelectorAll('[role="tooltip"], .tooltip, [class*="tooltip"]');
    return Array.from(tooltips)
      .filter(t => window.getComputedStyle(t).display !== 'none')
      .map(t => ({
        text: t.textContent?.trim(),
        selector: this.getElementInfo(t).selector
      }));
  }
  
  /**
   * Detect menus
   */
  detectMenus() {
    const menus = document.querySelectorAll('[role="menu"], .menu, .dropdown-menu, [class*="context"]');
    return Array.from(menus)
      .filter(m => window.getComputedStyle(m).display !== 'none')
      .map(m => ({
        items: m.querySelectorAll('[role="menuitem"], li, a').length,
        selector: this.getElementInfo(m).selector
      }));
  }
  
  /**
   * Detect context menu
   */
  detectContextMenu() {
    const contextMenus = document.querySelectorAll('[role="menu"], .context-menu, [id*="context"], [class*="context"]');
    return Array.from(contextMenus).some(cm => window.getComputedStyle(cm).display !== 'none');
  }
  
  /**
   * Detect alerts (would be caught by window event listeners)
   */
  detectAlerts() {
    // Note: Real alerts block execution, so this detects custom alert-like elements
    const alerts = document.querySelectorAll('[role="alert"], .alert, [class*="alert"]');
    return Array.from(alerts)
      .filter(a => window.getComputedStyle(a).display !== 'none')
      .map(a => ({
        text: a.textContent?.trim(),
        type: a.className
      }));
  }
  
  /**
   * Detect new windows (would be tracked separately)
   */
  detectNewWindows() {
    // This would need to be tracked at the window level
    return false;
  }
  
  /**
   * Get element info
   */
  getElementInfo(element) {
    return {
      tagName: element.tagName?.toLowerCase(),
      id: element.id,
      className: element.className,
      selector: this.getSelector(element),
      text: element.textContent?.trim().substring(0, 50)
    };
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
    return element.tagName?.toLowerCase() || 'unknown';
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get action history
   */
  getActionHistory() {
    return this.actionHistory;
  }
}

// Make ActionSimulator available globally
window.ActionSimulator = ActionSimulator;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Action Simulator: Class registered globally'});
