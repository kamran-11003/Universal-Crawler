chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'WebSocket Detector: Class registering globally'});

if (typeof window.WebSocketDetector === 'undefined') {
class WebSocketDetector {
  constructor() {
    this.connections = [];
    this.enabled = false;
    this.originalWebSocket = null;
  }

  initialize() {
    this.interceptWebSocket();
  }

  interceptWebSocket() {
    if (typeof window.WebSocket === 'undefined') {
      console.warn('WebSocket not supported in this environment');
      return;
    }

    this.originalWebSocket = window.WebSocket;
    const detector = this;
    
    window.WebSocket = function(url, protocols) {
      const ws = new detector.originalWebSocket(url, protocols);
      
      const connectionData = {
        id: Date.now() + Math.random(), // Simple ID generation
        url: url,
        protocol: protocols,
        state: 'connecting',
        messages: [],
        connected: false,
        timestamp: Date.now()
      };
      
      detector.connections.push(connectionData);
      
      ws.addEventListener('open', () => {
        connectionData.state = 'open';
        connectionData.connected = true;
        detector.emitEvent('websocket-open', connectionData);
      });
      
      ws.addEventListener('message', (event) => {
        const messageData = {
          type: 'incoming',
          data: event.data,
          timestamp: Date.now(),
          size: event.data ? event.data.length : 0
        };
        
        connectionData.messages.push(messageData);
        detector.emitEvent('websocket-message', {
          connection: connectionData,
          message: messageData
        });
      });
      
      ws.addEventListener('close', (event) => {
        connectionData.state = 'closed';
        connectionData.connected = false;
        connectionData.closeCode = event.code;
        connectionData.closeReason = event.reason;
        detector.emitEvent('websocket-close', connectionData);
      });
      
      ws.addEventListener('error', (error) => {
        connectionData.state = 'error';
        connectionData.error = error.message || 'WebSocket error';
        detector.emitEvent('websocket-error', connectionData);
      });
      
      // Intercept send method
      const originalSend = ws.send.bind(ws);
      ws.send = function(data) {
        const messageData = {
          type: 'outgoing',
          data: data,
          timestamp: Date.now(),
          size: data ? data.length : 0
        };
        
        connectionData.messages.push(messageData);
        detector.emitEvent('websocket-send', {
          connection: connectionData,
          message: messageData
        });
        
        return originalSend(data);
      };
      
      return ws;
    };
    
    // Copy static properties from original WebSocket
    Object.setPrototypeOf(window.WebSocket, this.originalWebSocket);
    Object.setPrototypeOf(window.WebSocket.prototype, this.originalWebSocket.prototype);
  }

  emitEvent(eventName, data) {
    if (this.enabled) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  getConnections() {
    return this.connections;
  }

  getActiveConnections() {
    return this.connections.filter(c => c.connected);
  }

  getMetrics() {
    const totalMessages = this.connections.reduce((sum, c) => sum + c.messages.length, 0);
    const incomingMessages = this.connections.reduce((sum, c) => 
      sum + c.messages.filter(m => m.type === 'incoming').length, 0);
    const outgoingMessages = this.connections.reduce((sum, c) => 
      sum + c.messages.filter(m => m.type === 'outgoing').length, 0);

    return {
      totalConnections: this.connections.length,
      activeConnections: this.connections.filter(c => c.connected).length,
      totalMessages: totalMessages,
      incomingMessages: incomingMessages,
      outgoingMessages: outgoingMessages,
      connections: this.connections
    };
  }

  getConnectionById(id) {
    return this.connections.find(c => c.id === id);
  }

  getConnectionsByUrl(url) {
    return this.connections.filter(c => c.url.includes(url));
  }

  clearOldConnections(maxAge = 300000) { // 5 minutes default
    const cutoffTime = Date.now() - maxAge;
    this.connections = this.connections.filter(c => c.timestamp > cutoffTime);
  }

  enable() {
    this.enabled = true;
    this.initialize();
  }

  disable() {
    this.enabled = false;
    
    // Restore original WebSocket if it was intercepted
    if (this.originalWebSocket) {
      window.WebSocket = this.originalWebSocket;
    }
  }
}

window.WebSocketDetector = WebSocketDetector;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'WebSocket Detector: Class registered globally'});
}
