/**
 * API Interceptor - Captures all network requests and responses
 * Critical for modern SPA testing - captures REST, GraphQL, WebSocket
 * Injected at document_start to intercept before page scripts run
 */

class APIInterceptor {
  constructor() {
    this.apiCalls = [];
    this.webSocketConnections = [];
    this.maxStoredCalls = 500; // Prevent memory overflow
    
    console.log('🌐 API Interceptor initialized');
  }
  
  init() {
    this.interceptFetch();
    this.interceptXHR();
    this.interceptWebSocket();
    console.log('✅ All network interceptors active');
  }
  
  // Intercept fetch API
  interceptFetch() {
    const self = this;
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const [resource, options = {}] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      const requestData = {
        type: 'fetch',
        url: url.toString(),
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        timestamp: Date.now()
      };
      
      console.log('📤 Fetch Request:', requestData.method, requestData.url);
      self.captureRequest(requestData);
      
      // Execute original fetch
      return originalFetch.apply(this, args).then(response => {
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        
        // Capture response
        clonedResponse.text().then(body => {
          const responseData = {
            url: url.toString(),
            status: response.status,
            statusText: response.statusText,
            headers: self.headersToObject(response.headers),
            body: self.truncateBody(body),
            timestamp: Date.now()
          };
          
          console.log('📥 Fetch Response:', responseData.status, responseData.url);
          self.captureResponse(responseData);
        }).catch(err => {
          console.warn('⚠️ Failed to read fetch response body:', err);
        });
        
        return response;
      }).catch(error => {
        console.error('❌ Fetch Error:', url, error);
        self.captureError({ url, error: error.message, timestamp: Date.now() });
        throw error;
      });
    };
    
    console.log('✅ Fetch interceptor installed');
  }
  
  // Intercept XMLHttpRequest
  interceptXHR() {
    const self = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._interceptedRequest = {
        type: 'xhr',
        method,
        url: url.toString(),
        timestamp: Date.now()
      };
      
      console.log('📤 XHR Request:', method, url);
      return originalOpen.call(this, method, url, ...rest);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      if (this._interceptedRequest) {
        this._interceptedRequest.body = body;
        self.captureRequest(this._interceptedRequest);
      }
      
      // Listen for completion
      this.addEventListener('load', function() {
        if (this._interceptedRequest) {
          const responseData = {
            url: this._interceptedRequest.url,
            status: this.status,
            statusText: this.statusText,
            headers: this.getAllResponseHeaders(),
            body: self.truncateBody(this.responseText),
            timestamp: Date.now()
          };
          
          console.log('📥 XHR Response:', responseData.status, responseData.url);
          self.captureResponse(responseData);
        }
      });
      
      this.addEventListener('error', function() {
        if (this._interceptedRequest) {
          console.error('❌ XHR Error:', this._interceptedRequest.url);
          self.captureError({
            url: this._interceptedRequest.url,
            error: 'Network error',
            timestamp: Date.now()
          });
        }
      });
      
      return originalSend.call(this, body);
    };
    
    console.log('✅ XMLHttpRequest interceptor installed');
  }
  
  // Intercept WebSocket
  interceptWebSocket() {
    const self = this;
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
      console.log('🔌 WebSocket Connection:', url);
      
      const ws = new originalWebSocket(url, protocols);
      
      const connectionData = {
        url: url.toString(),
        protocols: protocols,
        timestamp: Date.now(),
        messages: []
      };
      
      self.webSocketConnections.push(connectionData);
      
      // Intercept send
      const originalSend = ws.send;
      ws.send = function(data) {
        console.log('📤 WebSocket Send:', url, data);
        connectionData.messages.push({
          direction: 'send',
          data: self.truncateBody(data),
          timestamp: Date.now()
        });
        return originalSend.call(this, data);
      };
      
      // Intercept receive
      ws.addEventListener('message', (event) => {
        console.log('📥 WebSocket Receive:', url, event.data);
        connectionData.messages.push({
          direction: 'receive',
          data: self.truncateBody(event.data),
          timestamp: Date.now()
        });
      });
      
      ws.addEventListener('close', () => {
        console.log('🔌 WebSocket Closed:', url);
        connectionData.closedAt = Date.now();
      });
      
      return ws;
    };
    
    // Copy static properties
    window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
    window.WebSocket.OPEN = originalWebSocket.OPEN;
    window.WebSocket.CLOSING = originalWebSocket.CLOSING;
    window.WebSocket.CLOSED = originalWebSocket.CLOSED;
    
    console.log('✅ WebSocket interceptor installed');
  }
  
  captureRequest(request) {
    // Limit storage
    if (this.apiCalls.length >= this.maxStoredCalls) {
      this.apiCalls.shift(); // Remove oldest
    }
    
    this.apiCalls.push({ direction: 'request', ...request });
    
    // Send to background script for persistent storage
    try {
      chrome.runtime.sendMessage({
        type: 'API_CALL_DETECTED',
        data: request
      });
    } catch (e) {
      console.warn('⚠️ Failed to send API call to background:', e);
    }
  }
  
  captureResponse(response) {
    if (this.apiCalls.length >= this.maxStoredCalls) {
      this.apiCalls.shift();
    }
    
    this.apiCalls.push({ direction: 'response', ...response });
    
    try {
      chrome.runtime.sendMessage({
        type: 'API_RESPONSE_DETECTED',
        data: response
      });
    } catch (e) {
      console.warn('⚠️ Failed to send API response to background:', e);
    }
  }
  
  captureError(error) {
    this.apiCalls.push({ direction: 'error', ...error });
  }
  
  // Convert Headers object to plain object
  headersToObject(headers) {
    const obj = {};
    if (headers && headers.entries) {
      for (const [key, value] of headers.entries()) {
        obj[key] = value;
      }
    }
    return obj;
  }
  
  // Truncate large bodies to prevent memory issues
  truncateBody(body, maxLength = 10000) {
    if (!body) return body;
    
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    
    if (bodyStr.length > maxLength) {
      return bodyStr.substring(0, maxLength) + '... [truncated]';
    }
    
    return bodyStr;
  }
  
  // Get all unique API endpoints
  getAPIEndpoints() {
    const endpoints = new Map();
    
    for (const call of this.apiCalls) {
      if (call.direction === 'request') {
        const key = `${call.method} ${call.url}`;
        
        if (!endpoints.has(key)) {
          endpoints.set(key, {
            method: call.method,
            url: call.url,
            type: call.type,
            callCount: 0,
            sampleRequest: call.body,
            sampleResponse: null,
            firstSeen: call.timestamp
          });
        }
        
        endpoints.get(key).callCount++;
      } else if (call.direction === 'response') {
        // Try to match with request
        const getKey = `GET ${call.url}`;
        const postKey = `POST ${call.url}`;
        
        if (endpoints.has(getKey)) {
          endpoints.get(getKey).sampleResponse = call.body;
        } else if (endpoints.has(postKey)) {
          endpoints.get(postKey).sampleResponse = call.body;
        }
      }
    }
    
    return Array.from(endpoints.values());
  }
  
  // Get WebSocket connections
  getWebSocketConnections() {
    return this.webSocketConnections.map(conn => ({
      url: conn.url,
      protocols: conn.protocols,
      messageCount: conn.messages.length,
      opened: new Date(conn.timestamp).toISOString(),
      closed: conn.closedAt ? new Date(conn.closedAt).toISOString() : 'Still open',
      sampleMessages: conn.messages.slice(0, 10) // First 10 messages
    }));
  }
  
  // Export all captured data
  exportData() {
    return {
      apiEndpoints: this.getAPIEndpoints(),
      webSocketConnections: this.getWebSocketConnections(),
      totalAPICalls: this.apiCalls.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize immediately (before page scripts run)
window.apiInterceptor = new APIInterceptor();
window.apiInterceptor.init();

console.log('🌐 API Interceptor ready - monitoring all network traffic');
