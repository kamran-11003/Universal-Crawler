console.log('=== MODAL DETECTOR SCRIPT LOADING ===');

if (typeof window.ModalDetector === 'undefined') {
class ModalDetector {
  constructor() {
    this.modals = [];
    this.observer = null;
    this.enabled = false;
    
    this.modalSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '.modal',
      '.popup',
      '.dialog',
      '[aria-modal="true"]',
      '.overlay',
      '.modal-dialog',
      '.modal-content',
      '[data-modal]',
      '[data-dialog]',
      '.lightbox',
      '.popup-content',
      '.modal-backdrop'
    ];
  }

  initialize() {
    if (this.enabled) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Modal Detector: Initializing...'});
    
    this.setupMutationObserver();
    this.detectExistingModals();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Modal Detector: Found ${this.modals.length} existing modals`});
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.checkForModal(node);
            
            // Also check child elements
            if (node.querySelectorAll) {
              node.querySelectorAll('*').forEach((child) => {
                this.checkForModal(child);
              });
            }
          }
        });
        
        // Check for attribute changes that might make an element a modal
        mutation.attributeName && mutation.target.nodeType === 1 && 
        this.checkForModal(mutation.target);
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal', 'class', 'data-modal', 'data-dialog']
    });
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Modal Detector: Mutation observer setup complete'});
  }

  detectExistingModals() {
    this.modalSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          this.analyzeModal(element);
        });
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Modal Detector: Error with selector ${selector}: ${error.message}`});
      }
    });
  }

  checkForModal(node) {
    if (!node || !node.matches) return;
    
    this.modalSelectors.forEach((selector) => {
      try {
        if (node.matches(selector)) {
          this.analyzeModal(node);
        }
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  analyzeModal(element) {
    // Skip if already analyzed
    if (element.dataset.modalAnalyzed) return;
    
    const modalData = {
      id: this.generateUniqueId(),
      selector: this.generateSelector(element),
      role: element.getAttribute('role'),
      ariaModal: element.getAttribute('aria-modal'),
      title: this.extractModalTitle(element),
      content: this.extractModalContent(element),
      isVisible: this.isVisible(element),
      buttons: this.extractButtons(element),
      formElements: this.extractFormElements(element),
      position: this.getElementPosition(element),
      timestamp: Date.now(),
      element: element
    };

    // Mark as analyzed
    element.dataset.modalAnalyzed = 'true';

    this.modals.push(modalData);

    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Modal Detector: Modal detected - ${modalData.selector}`});

    // Emit event for crawler
    window.dispatchEvent(new CustomEvent('modal-detected', {
      detail: modalData
    }));
  }

  generateUniqueId() {
    return 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSelector(element) {
    if (element.id) return `#${element.id}`;
    
    // Get className safely (might be SVG element)
    let classNameStr = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        classNameStr = element.className;
      } else if (element.className.baseVal !== undefined) {
        classNameStr = element.className.baseVal; // SVG
      } else if (element.getAttribute) {
        classNameStr = element.getAttribute('class') || '';
      }
    }
    
    if (classNameStr) {
      const classes = classNameStr.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  extractModalTitle(element) {
    const titleSelectors = [
      '[role="heading"]',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '.modal-title',
      '.dialog-title',
      '.popup-title',
      '[aria-label]',
      'title'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }
    
    // Check aria-label on the element itself
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }
    
    return '';
  }

  extractModalContent(element) {
    const content = {
      text: element.textContent.substring(0, 200).trim(),
      hasForm: element.querySelector('form') !== null,
      hasButtons: element.querySelectorAll('button, [role="button"]').length,
      hasInputs: element.querySelectorAll('input, select, textarea').length,
      hasImages: element.querySelectorAll('img').length,
      hasLinks: element.querySelectorAll('a').length
    };
    
    return content;
  }

  extractButtons(element) {
    const buttons = [];
    const buttonElements = element.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
    
    buttonElements.forEach((btn, index) => {
      // Get className safely (might be SVG element)
      let btnClassName = '';
      if (btn.className) {
        if (typeof btn.className === 'string') {
          btnClassName = btn.className;
        } else if (btn.className.baseVal !== undefined) {
          btnClassName = btn.className.baseVal; // SVG
        } else if (btn.getAttribute) {
          btnClassName = btn.getAttribute('class') || '';
        }
      }
      
      buttons.push({
        index: index,
        text: btn.textContent.trim() || btn.value || '',
        type: btn.getAttribute('type') || 'button',
        className: btnClassName,
        id: btn.id,
        selector: this.generateSelector(btn)
      });
    });
    
    return buttons;
  }

  extractFormElements(element) {
    const forms = [];
    const formElements = element.querySelectorAll('form');
    
    formElements.forEach((form, index) => {
      forms.push({
        index: index,
        action: form.getAttribute('action'),
        method: form.getAttribute('method'),
        inputCount: form.querySelectorAll('input, select, textarea').length,
        selector: this.generateSelector(form)
      });
    });
    
    return forms;
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0
    };
  }

  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0;
  }

  getModals() {
    return this.modals;
  }

  getVisibleModals() {
    return this.modals.filter(modal => modal.isVisible);
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.initialize();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Modal Detector: Enabled'});
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Modal Detector: Disabled'});
  }

  cleanup() {
    this.disable();
    this.modals = [];
  }
}

window.ModalDetector = ModalDetector;
}

console.log('=== MODAL DETECTOR SCRIPT LOADED ===');
