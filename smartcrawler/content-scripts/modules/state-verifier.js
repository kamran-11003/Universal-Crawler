/**
 * State Verifier - Captures and validates element state changes
 * Validates: class changes, attribute changes, position changes, visibility changes
 */

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'State Verifier: Loading module...'});

class StateVerifier {
  constructor() {
    this.stateSnapshots = new Map();
  }
  
  /**
   * Capture initial state of an element
   */
  captureInitialState(element, stateId) {
    try {
      const state = this.captureElementState(element);
      this.stateSnapshots.set(stateId, {
        initial: state,
        timestamp: Date.now()
      });
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `📸 Captured initial state for ${stateId}: ${JSON.stringify(state).substring(0, 100)}...`
      });
      
      return state;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Failed to capture initial state: ${error.message}`});
      return null;
    }
  }
  
  /**
   * Capture current element state
   */
  captureElementState(element) {
    try {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      
      return {
        // Element identity
        tagName: element.tagName?.toLowerCase(),
        id: element.id,
        
        // Classes
        className: this.getClassName(element),
        classList: this.getClassList(element),
        
        // Attributes
        attributes: this.captureAttributes(element),
        
        // Position & size
        position: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        },
        
        // Visibility
        visibility: {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          isVisible: this.isVisible(element)
        },
        
        // Content
        textContent: element.textContent?.trim().substring(0, 100),
        innerHTML: element.innerHTML?.substring(0, 200),
        value: element.value,
        
        // State attributes
        disabled: element.disabled,
        checked: element.checked,
        selected: element.selected,
        readOnly: element.readOnly,
        
        // ARIA attributes
        ariaExpanded: element.getAttribute('aria-expanded'),
        ariaHidden: element.getAttribute('aria-hidden'),
        ariaSelected: element.getAttribute('aria-selected'),
        ariaChecked: element.getAttribute('aria-checked'),
        ariaPressed: element.getAttribute('aria-pressed'),
        
        // Computed styles (relevant ones)
        styles: {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          border: computed.border,
          transform: computed.transform,
          transition: computed.transition,
          zIndex: computed.zIndex
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * Get className (handle SVG elements)
   */
  getClassName(element) {
    try {
      if (typeof element.className === 'string') {
        return element.className;
      } else if (element.className && element.className.baseVal) {
        return element.className.baseVal;
      }
      return '';
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Get classList (handle SVG elements)
   */
  getClassList(element) {
    try {
      if (element.classList) {
        return Array.from(element.classList);
      }
      const className = this.getClassName(element);
      return className ? className.split(/\s+/).filter(c => c) : [];
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Capture all attributes
   */
  captureAttributes(element) {
    const attrs = {};
    try {
      for (const attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
    } catch (error) {
      // Ignore
    }
    return attrs;
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
             parseFloat(style.opacity) > 0 &&
             rect.width > 0 &&
             rect.height > 0;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Verify state changes after an action
   */
  verifyStateChange(element, stateId, expectedChanges = {}) {
    try {
      const snapshot = this.stateSnapshots.get(stateId);
      if (!snapshot) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⚠️ No initial state found for ${stateId}`});
        return { verified: false, reason: 'No initial state' };
      }
      
      const currentState = this.captureElementState(element);
      const changes = this.compareStates(snapshot.initial, currentState);
      
      // Store final state
      snapshot.final = currentState;
      snapshot.changes = changes;
      snapshot.verifiedAt = Date.now();
      
      // Verify expected changes
      const verification = this.validateExpectedChanges(changes, expectedChanges);
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `✅ State verification for ${stateId}: ${verification.verified ? 'PASSED' : 'FAILED'} (${changes.length} changes detected)`
      });
      
      return {
        verified: verification.verified,
        changes: changes,
        changeCount: changes.length,
        expectedChanges: expectedChanges,
        verification: verification,
        duration: snapshot.verifiedAt - snapshot.timestamp
      };
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ State verification failed: ${error.message}`});
      return { verified: false, error: error.message };
    }
  }
  
  /**
   * Compare two states and return differences
   */
  compareStates(initial, current) {
    const changes = [];
    
    try {
      // Compare classes
      const initialClasses = new Set(initial.classList || []);
      const currentClasses = new Set(current.classList || []);
      
      for (const cls of currentClasses) {
        if (!initialClasses.has(cls)) {
          changes.push({
            type: 'class',
            action: 'added',
            value: cls
          });
        }
      }
      
      for (const cls of initialClasses) {
        if (!currentClasses.has(cls)) {
          changes.push({
            type: 'class',
            action: 'removed',
            value: cls
          });
        }
      }
      
      // Compare attributes
      const initialAttrs = initial.attributes || {};
      const currentAttrs = current.attributes || {};
      
      for (const [key, value] of Object.entries(currentAttrs)) {
        if (initialAttrs[key] !== value) {
          changes.push({
            type: 'attribute',
            name: key,
            from: initialAttrs[key],
            to: value
          });
        }
      }
      
      // Compare position
      if (initial.position && current.position) {
        const posChange = {
          x: current.position.x - initial.position.x,
          y: current.position.y - initial.position.y,
          width: current.position.width - initial.position.width,
          height: current.position.height - initial.position.height
        };
        
        if (Math.abs(posChange.x) > 1 || Math.abs(posChange.y) > 1) {
          changes.push({
            type: 'position',
            delta: posChange,
            from: initial.position,
            to: current.position
          });
        }
        
        if (Math.abs(posChange.width) > 1 || Math.abs(posChange.height) > 1) {
          changes.push({
            type: 'size',
            delta: { width: posChange.width, height: posChange.height },
            from: { width: initial.position.width, height: initial.position.height },
            to: { width: current.position.width, height: current.position.height }
          });
        }
      }
      
      // Compare visibility
      if (initial.visibility?.isVisible !== current.visibility?.isVisible) {
        changes.push({
          type: 'visibility',
          from: initial.visibility?.isVisible,
          to: current.visibility?.isVisible
        });
      }
      
      // Compare state attributes
      const stateAttrs = ['disabled', 'checked', 'selected', 'readOnly'];
      for (const attr of stateAttrs) {
        if (initial[attr] !== current[attr]) {
          changes.push({
            type: 'state',
            name: attr,
            from: initial[attr],
            to: current[attr]
          });
        }
      }
      
      // Compare ARIA attributes
      const ariaAttrs = ['ariaExpanded', 'ariaHidden', 'ariaSelected', 'ariaChecked', 'ariaPressed'];
      for (const attr of ariaAttrs) {
        if (initial[attr] !== current[attr]) {
          changes.push({
            type: 'aria',
            name: attr,
            from: initial[attr],
            to: current[attr]
          });
        }
      }
      
      // Compare text content
      if (initial.textContent !== current.textContent) {
        changes.push({
          type: 'content',
          name: 'textContent',
          from: initial.textContent,
          to: current.textContent
        });
      }
      
      // Compare value (for inputs)
      if (initial.value !== current.value) {
        changes.push({
          type: 'value',
          from: initial.value,
          to: current.value
        });
      }
      
    } catch (error) {
      changes.push({ type: 'error', message: error.message });
    }
    
    return changes;
  }
  
  /**
   * Validate expected changes occurred
   */
  validateExpectedChanges(actualChanges, expectedChanges) {
    const results = {
      verified: true,
      matched: [],
      missing: [],
      unexpected: []
    };
    
    try {
      // If no expectations, just verify something changed
      if (!expectedChanges || Object.keys(expectedChanges).length === 0) {
        results.verified = actualChanges.length > 0;
        results.reason = actualChanges.length > 0 ? 'Changes detected' : 'No changes detected';
        return results;
      }
      
      // Check for expected class changes
      if (expectedChanges.classAdded || expectedChanges.classRemoved) {
        const classChanges = actualChanges.filter(c => c.type === 'class');
        
        if (expectedChanges.classAdded) {
          const found = classChanges.some(c => c.action === 'added' && c.value.includes(expectedChanges.classAdded));
          if (found) {
            results.matched.push(`class added: ${expectedChanges.classAdded}`);
          } else {
            results.missing.push(`class added: ${expectedChanges.classAdded}`);
            results.verified = false;
          }
        }
        
        if (expectedChanges.classRemoved) {
          const found = classChanges.some(c => c.action === 'removed' && c.value.includes(expectedChanges.classRemoved));
          if (found) {
            results.matched.push(`class removed: ${expectedChanges.classRemoved}`);
          } else {
            results.missing.push(`class removed: ${expectedChanges.classRemoved}`);
            results.verified = false;
          }
        }
      }
      
      // Check for position changes
      if (expectedChanges.positionChanged) {
        const posChanges = actualChanges.filter(c => c.type === 'position');
        if (posChanges.length > 0) {
          results.matched.push('position changed');
        } else {
          results.missing.push('position changed');
          results.verified = false;
        }
      }
      
      // Check for size changes
      if (expectedChanges.sizeChanged) {
        const sizeChanges = actualChanges.filter(c => c.type === 'size');
        if (sizeChanges.length > 0) {
          results.matched.push('size changed');
        } else {
          results.missing.push('size changed');
          results.verified = false;
        }
      }
      
      // Check for visibility changes
      if (expectedChanges.visibilityChanged !== undefined) {
        const visChanges = actualChanges.filter(c => c.type === 'visibility');
        if (visChanges.length > 0 && visChanges[0].to === expectedChanges.visibilityChanged) {
          results.matched.push(`visibility: ${expectedChanges.visibilityChanged}`);
        } else {
          results.missing.push(`visibility: ${expectedChanges.visibilityChanged}`);
          results.verified = false;
        }
      }
      
    } catch (error) {
      results.verified = false;
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Get state snapshot
   */
  getStateSnapshot(stateId) {
    return this.stateSnapshots.get(stateId);
  }
  
  /**
   * Clear state snapshot
   */
  clearStateSnapshot(stateId) {
    this.stateSnapshots.delete(stateId);
  }
  
  /**
   * Clear all snapshots
   */
  clearAllSnapshots() {
    this.stateSnapshots.clear();
  }
}

// Make StateVerifier available globally
window.StateVerifier = StateVerifier;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'State Verifier: Class registered globally'});
