chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== HELPERS SCRIPT LOADING ==='});

if (typeof window.helpersLoaded === 'undefined') {
window.helpersLoaded = true;

function waitForIdle(timeout = 2000) {
  // Simple timeout instead of waiting for page to be idle
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function extractLinks() {
  return Array.from(document.querySelectorAll('a[href]')).map(a => ({
    href: a.href,
    text: a.textContent.trim()
  }));
}

function extractForms() {
  return Array.from(document.querySelectorAll('form')).map(form => {
    const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    
    const inputDetails = inputs.map(input => ({
      type: input.type,
      name: input.name,
      placeholder: input.placeholder,
      required: input.required,
      pattern: input.pattern,
      minLength: input.minLength,
      maxLength: input.maxLength
    }));
    
    // Detect form purpose
    const hasPassword = inputs.some(i => i.type === 'password');
    const hasEmail = inputs.some(i => i.type === 'email');
    const hasSubmit = form.querySelector('[type="submit"], button[type="submit"]') !== null;
    const hasRadio = inputs.some(i => i.type === 'radio');
    const hasCheckbox = inputs.some(i => i.type === 'checkbox');
    const hasTextarea = inputs.some(i => i.type === 'textarea');
    
    let formType = 'generic';
    if (hasPassword && hasEmail) {
      formType = inputs.length <= 3 ? 'login' : 'registration';
    } else if (hasPassword) {
      formType = 'login';
    } else if (inputs.length > 5 && (hasEmail || inputs.some(i => i.type === 'text'))) {
      formType = 'contact'; // Forms with many fields are often contact forms
    } else if (inputs.length > 8) {
      formType = 'complex'; // Complex multi-field forms
    } else if (hasRadio && hasCheckbox) {
      formType = 'order'; // Forms with radio and checkbox are often order forms
    } else if (hasTextarea) {
      formType = 'feedback'; // Forms with textarea are often feedback forms
    }
    
    return {
      action: form.action,
      method: form.method || 'GET',
      inputCount: inputs.length,
      inputs: inputDetails,
      hasSubmit: hasSubmit,
      formType: formType,
      id: form.id,
      name: form.name
    };
  });
}

class APIMonitor {
  constructor() {
    this.requests = [];
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        this.logRequest({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: Date.now() - startTime,
          type: 'fetch'
        });
        return response;
      } catch (error) {
        this.logRequest({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration: Date.now() - startTime,
          type: 'fetch',
          error: error.message
        });
        throw error;
      }
    };
    
    // Intercept XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const monitor = window.apiMonitor;
      
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      let method, url, startTime;
      
      xhr.open = function(m, u) {
        method = m;
        url = u;
        return originalOpen.apply(this, arguments);
      };
      
      xhr.send = function() {
        startTime = Date.now();
        
        xhr.addEventListener('loadend', () => {
          monitor?.logRequest({
            url: url,
            method: method,
            status: xhr.status,
            duration: Date.now() - startTime,
            type: 'xhr'
          });
        });
        
        return originalSend.apply(this, arguments);
      };
      
      return xhr;
    };
  }
  
  logRequest(requestData) {
    this.requests.push({
      ...requestData,
      timestamp: Date.now()
    });
  }
  
  getRequests() {
    return this.requests;
  }
  
  clearRequests() {
    this.requests = [];
  }
}

// Initialize global monitor
window.apiMonitor = new APIMonitor();

function getAPIRequests() {
  return window.apiMonitor?.getRequests() || [];
}

function clearAPIRequests() {
  window.apiMonitor?.clearRequests();
}

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== HELPERS SCRIPT LOADED ==='});
}
