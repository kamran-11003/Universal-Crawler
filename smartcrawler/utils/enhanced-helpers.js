chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ENHANCED HELPERS SCRIPT LOADING ==='});

if (typeof window.enhancedHelpersLoaded === 'undefined') {
window.enhancedHelpersLoaded = true;

// 🎯 Enhanced Form Extraction with AI Support
function extractFormsEnhanced() {
  try {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Starting enhanced form extraction...'});
    
    // Use Universal Form Handler if available
    if (window.UniversalFormHandler) {
      const handler = new UniversalFormHandler();
      const detectedForms = handler.detectForms();
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Universal handler found ${detectedForms.length} forms`});
      
      return detectedForms.map(form => ({
        element: form.element,
        type: form.type,
        confidence: form.confidence,
        analysis: form.analysis,
        // Convert to legacy format for compatibility
        action: form.analysis.submission.formAction,
        method: form.analysis.submission.formMethod,
        inputCount: Object.values(form.analysis.inputTypes).reduce((sum, arr) => sum + arr.length, 0),
        inputs: flattenInputs(form.analysis.inputTypes),
        hasSubmit: form.analysis.submission.hasSubmitButton,
        formType: form.analysis.purpose.type,
        formSubtype: form.analysis.purpose.subtype,
        id: form.element.id,
        name: form.element.name,
        fieldsets: form.analysis.fieldsets,
        legends: form.analysis.legends,
        labels: form.analysis.labels,
        validation: form.analysis.validation,
        accessibility: form.analysis.accessibility
      }));
    }
    
    // Fallback to original method
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Falling back to original form extraction'});
    return extractForms();
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractFormsEnhanced: ${error.message}`});
    return extractForms(); // Fallback to original
  }
}

// 🔄 Flatten Input Types for Legacy Compatibility
function flattenInputs(inputTypes) {
  try {
    const flattened = [];
    
    Object.entries(inputTypes).forEach(([type, inputs]) => {
      inputs.forEach(input => {
        flattened.push({
          type: type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required,
          value: input.value,
          checked: input.checked,
          options: input.options,
          label: input.label,
          fieldset: input.fieldset,
          validation: input.validation
        });
      });
    });
    
    return flattened;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in flattenInputs: ${error.message}`});
    return [];
  }
}

// 🎯 Enhanced Link Extraction
function extractLinksEnhanced() {
  try {
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
      href: a.href,
      text: a.textContent.trim(),
      title: a.title || '',
      role: a.getAttribute('role') || '',
      ariaLabel: a.getAttribute('aria-label') || '',
      target: a.target || '',
      rel: a.rel || ''
    }));
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Enhanced link extraction found ${links.length} links`});
    return links;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractLinksEnhanced: ${error.message}`});
    return extractLinks(); // Fallback to original
  }
}

// 🎯 Enhanced API Monitoring
class EnhancedAPIMonitor {
  constructor() {
    this.requests = [];
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    try {
      // Enhanced fetch interception
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = Date.now();
        const url = args[0];
        const options = args[1] || {};
        
        try {
          const response = await originalFetch(...args);
          
          this.logRequest({
            url: typeof url === 'string' ? url : url.url,
            method: options.method || 'GET',
            headers: options.headers || {},
            status: response.status,
            statusText: response.statusText,
            duration: Date.now() - startTime,
            type: 'fetch',
            timestamp: Date.now()
          });
          
          return response;
        } catch (error) {
          this.logRequest({
            url: typeof url === 'string' ? url : url.url,
            method: options.method || 'GET',
            headers: options.headers || {},
            status: 0,
            duration: Date.now() - startTime,
            type: 'fetch',
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      };
      
      // Enhanced XHR interception
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const monitor = window.enhancedApiMonitor;
        
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        let method, url, startTime;
        
        xhr.open = function(m, u) {
          method = m;
          url = u;
          return originalOpen.apply(this, arguments);
        };
        
        xhr.send = function(data) {
          startTime = Date.now();
          
          xhr.addEventListener('loadend', () => {
            monitor?.logRequest({
              url: url,
              method: method,
              headers: this.getAllResponseHeaders(),
              status: xhr.status,
              statusText: xhr.statusText,
              duration: Date.now() - startTime,
              type: 'xhr',
              timestamp: Date.now()
            });
          });
          
          return originalSend.apply(this, arguments);
        };
        
        return xhr;
      };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in setupInterceptors: ${error.message}`});
    }
  }
  
  logRequest(requestData) {
    try {
      this.requests.push(requestData);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `API request logged: ${requestData.method} ${requestData.url}`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in logRequest: ${error.message}`});
    }
  }
  
  getRequests() {
    try {
      return this.requests;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in getRequests: ${error.message}`});
      return [];
    }
  }
  
  clearRequests() {
    try {
      this.requests = [];
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Enhanced API requests cleared'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in clearRequests: ${error.message}`});
    }
  }
}

// Initialize enhanced monitor
try {
  window.enhancedApiMonitor = new EnhancedAPIMonitor();
  chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Enhanced API Monitor initialized'});
} catch (error) {
  chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error initializing Enhanced API Monitor: ${error.message}`});
}

function getEnhancedAPIRequests() {
  try {
    return window.enhancedApiMonitor?.getRequests() || [];
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in getEnhancedAPIRequests: ${error.message}`});
    return getAPIRequests(); // Fallback to original
  }
}

function clearEnhancedAPIRequests() {
  try {
    window.enhancedApiMonitor?.clearRequests();
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in clearEnhancedAPIRequests: ${error.message}`});
    clearAPIRequests(); // Fallback to original
  }
}

// Enhanced wait function with better error handling
function waitForIdleEnhanced(timeout = 2000) {
  try {
    // Simple timeout instead of waiting for page to be idle
    return new Promise(resolve => setTimeout(resolve, timeout));
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in waitForIdleEnhanced: ${error.message}`});
    return Promise.resolve();
  }
}

// Enhanced element validation
function validateElement(element) {
  try {
    return element && element.nodeType === Node.ELEMENT_NODE;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in validateElement: ${error.message}`});
    return false;
  }
}

// Enhanced query selector with fallback
function querySelectorEnhanced(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in querySelectorEnhanced: ${error.message}`});
    return null;
  }
}

// Enhanced query selector all with fallback
function querySelectorAllEnhanced(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in querySelectorAllEnhanced: ${error.message}`});
    return [];
  }
}

// Enhanced text extraction
function extractTextContent(element) {
  try {
    if (!validateElement(element)) return '';
    return element.textContent?.trim() || '';
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractTextContent: ${error.message}`});
    return '';
  }
}

// Enhanced attribute extraction
function extractAttribute(element, attribute) {
  try {
    if (!validateElement(element)) return '';
    return element.getAttribute(attribute) || '';
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractAttribute: ${error.message}`});
    return '';
  }
}

// Enhanced form field extraction
function extractFormFieldsEnhanced(formElement) {
  try {
    if (!validateElement(formElement)) return [];
    
    const fields = [];
    const inputs = querySelectorAllEnhanced('input, select, textarea', formElement);
    
    inputs.forEach(input => {
      fields.push({
        type: input.type || input.tagName.toLowerCase(),
        name: extractAttribute(input, 'name'),
        id: extractAttribute(input, 'id'),
        placeholder: extractAttribute(input, 'placeholder'),
        value: input.value || '',
        required: input.required || false,
        label: this.findAssociatedLabel(input),
        options: this.extractSelectOptions(input)
      });
    });
    
    return fields;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractFormFieldsEnhanced: ${error.message}`});
    return [];
  }
}

// Find associated label for input
function findAssociatedLabel(input) {
  try {
    if (!validateElement(input)) return '';
    
    // Method 1: Check for associated label
    const id = extractAttribute(input, 'id');
    if (id) {
      const label = querySelectorEnhanced(`label[for="${id}"]`);
      if (label) return extractTextContent(label);
    }
    
    // Method 2: Check parent label
    const parentLabel = input.closest('label');
    if (parentLabel) return extractTextContent(parentLabel);
    
    // Method 3: Check previous sibling
    const prevSibling = input.previousSibling;
    if (prevSibling && prevSibling.nodeType === Node.TEXT_NODE) {
      return prevSibling.textContent.trim();
    }
    
    return '';
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findAssociatedLabel: ${error.message}`});
    return '';
  }
}

// Extract select options
function extractSelectOptions(selectElement) {
  try {
    if (!validateElement(selectElement) || selectElement.tagName !== 'SELECT') {
      return [];
    }
    
    const options = querySelectorAllEnhanced('option', selectElement);
    return options.map(option => ({
      value: option.value,
      text: extractTextContent(option),
      selected: option.selected
    }));
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractSelectOptions: ${error.message}`});
    return [];
  }
}

// Enhanced DOM traversal
function findParentElement(element, selector) {
  try {
    if (!validateElement(element)) return null;
    return element.closest(selector);
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findParentElement: ${error.message}`});
    return null;
  }
}

// Enhanced element visibility check
function isElementVisible(element) {
  try {
    if (!validateElement(element)) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in isElementVisible: ${error.message}`});
    return false;
  }
}

// Enhanced click simulation
function simulateClick(element) {
  try {
    if (!validateElement(element)) return false;
    
    // Try multiple click methods
    if (element.click) {
      element.click();
      return true;
    }
    
    // Fallback to event dispatch
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(clickEvent);
    return true;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in simulateClick: ${error.message}`});
    return false;
  }
}

// Enhanced form submission
function submitFormEnhanced(formElement) {
  try {
    if (!validateElement(formElement)) return false;
    
    // Try multiple submission methods
    if (formElement.submit) {
      formElement.submit();
      return true;
    }
    
    // Try to find submit button
    const submitButton = querySelectorEnhanced('button[type="submit"], input[type="submit"]', formElement);
    if (submitButton) {
      return simulateClick(submitButton);
    }
    
    // Try any button in the form
    const anyButton = querySelectorEnhanced('button', formElement);
    if (anyButton) {
      return simulateClick(anyButton);
    }
    
    return false;
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in submitFormEnhanced: ${error.message}`});
    return false;
  }
}

// Enhanced error handling wrapper
function safeExecute(func, fallback = null, context = 'Unknown') {
  try {
    return func();
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in ${context}: ${error.message}`});
    return fallback;
  }
}

// Enhanced async error handling wrapper
async function safeExecuteAsync(func, fallback = null, context = 'Unknown') {
  try {
    return await func();
  } catch (error) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in ${context}: ${error.message}`});
    return fallback;
  }
}

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ENHANCED HELPERS SCRIPT LOADED ==='});
}
