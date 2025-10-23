chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== StateGraph SCRIPT LOADING ==='});

if (typeof window.StateGraph === 'undefined') {
class StateGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.currentNodeHash = null; // Track the current node being crawled
  }
  
  addNode(hash, data) {
    if (!this.nodes.has(hash)) {
      this.nodes.set(hash, {
        id: hash,
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        ...data
      });
      this.currentNodeHash = hash; // Update current node when adding new node
      return true;
    }
    return false;
  }
  
  addEdge(fromHash, toHash, action) {
    this.edges.push({
      from: fromHash,
      to: toHash,
      action: action,
      timestamp: Date.now()
    });
  }
  
  getNode(hash) {
    return this.nodes.has(hash) ? { id: hash, data: this.nodes.get(hash) } : null;
  }
  
  getCurrentNodeHash() {
    return this.currentNodeHash;
  }
  
  setCurrentNodeHash(hash) {
    this.currentNodeHash = hash;
  }
  
  export() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      stats: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length
      }
    };
  }
  
  import(data) {
    // Clear existing data
    this.nodes.clear();
    this.edges = [];
    
    // Import nodes
    if (data.nodes && Array.isArray(data.nodes)) {
      data.nodes.forEach(node => {
        this.nodes.set(node.id, node);
      });
    }
    
    // Import edges
    if (data.edges && Array.isArray(data.edges)) {
      this.edges = [...data.edges];
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Graph imported: ${this.nodes.size} nodes, ${this.edges.length} edges`});
  }
}

// Make StateGraph available globally
window.StateGraph = StateGraph;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== StateGraph SCRIPT LOADED ==='});
}
