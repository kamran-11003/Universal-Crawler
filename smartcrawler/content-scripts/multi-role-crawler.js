chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== MULTI-ROLE CRAWLER SCRIPT LOADING ==='});

if (typeof window.MultiRoleCrawler === 'undefined') {
class MultiRoleCrawler {
  constructor() {
    this.roles = ['guest', 'user', 'admin'];
    this.currentRole = 'guest';
    this.roleGraphs = new Map();
    this.isRunning = false;
    
    // Initialize handlers immediately if classes are available
    if (window.AuthenticationHandler) {
      this.authHandler = new AuthenticationHandler();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'AuthenticationHandler initialized in constructor'});
    } else {
      this.authHandler = null;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'AuthenticationHandler not available in constructor'});
    }
    
    if (window.SessionManager) {
      this.sessionManager = new SessionManager();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SessionManager initialized in constructor'});
    } else {
      this.sessionManager = null;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SessionManager not available in constructor'});
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'MultiRoleCrawler initialized'});
  }
  
  setEnabledModules(modules) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `MultiRoleCrawler: Setting enabled modules: ${JSON.stringify(modules)}`});
    // Store modules for passing to core crawler instances
    this.enabledModules = modules;
  }

  setOptimizationConfig(config) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `MultiRoleCrawler: Setting optimization config: ${JSON.stringify(config)}`});
    // Store optimization config for passing to core crawler instances
    this.optimizationConfig = config;
  }

  setSecurityConfig(config) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `MultiRoleCrawler: Setting security config: ${JSON.stringify(config)}`});
    // Store security config for passing to core crawler instances
    this.securityConfig = config;
  }

  setAnalyticsConfig(config) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `MultiRoleCrawler: Setting analytics config: ${JSON.stringify(config)}`});
    // Store analytics config for passing to core crawler instances
    this.analyticsConfig = config;
  }
  
  async startMultiRoleCrawl(startUrl, enabledRoles) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== MULTI-ROLE CRAWLER STARTED ==='});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting multi-role crawl for roles: ${enabledRoles.join(', ')}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL: ${window.location.href}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Page title: ${document.title}`});
      
      this.isRunning = true;
      this.roleGraphs.clear();
      
      // Validate enabled roles
      const validRoles = enabledRoles.filter(role => this.roles.includes(role));
      if (validRoles.length === 0) {
        throw new Error('No valid roles provided');
      }
      
      // Process each role sequentially
      for (const role of validRoles) {
        if (!this.isRunning) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawling stopped by user'});
          break;
        }
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `=== PROCESSING ROLE: ${role} ===`});
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Role type check: ${role !== 'guest' ? 'AUTHENTICATED' : 'GUEST'}`});
        
        chrome.runtime.sendMessage({
          type: 'ROLE_CRAWL_START',
          role: role
        });
        
        try {
          if (role !== 'guest') {
            // Perform authentication for authenticated roles
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting authentication for ${role}...`});
            
            // Initialize handlers if not already initialized
            if (!this.authHandler && window.AuthenticationHandler) {
              this.authHandler = new AuthenticationHandler();
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'AuthenticationHandler initialized during crawl'});
            }
            
            if (!this.authHandler) {
              throw new Error('AuthenticationHandler not available');
            }
            
            await this.authenticateRole(role);
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authentication completed for ${role}`});
            
            // After authentication, we should be on the authenticated page
            const currentUrl = window.location.href;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL after authentication: ${currentUrl}`});
            
            // Wait for the page to settle after authentication
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if we're actually on the authenticated page
            const finalUrl = window.location.href;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Final URL after wait: ${finalUrl}`});
            
            if (finalUrl.includes('/secure')) {
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Successfully redirected to secure page'});
            } else {
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Still on login page - authentication may have failed'});
            }
          }
          
          // Start crawl for this role
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting crawl for ${role}...`});
          await this.crawlAsRole(role);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Crawl completed for ${role}`});
          
          // Capture session after crawl for authenticated roles
          if (role !== 'guest') {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Capturing session for ${role}...`});
            
            // Initialize session manager if not already initialized
            if (!this.sessionManager && window.SessionManager) {
              this.sessionManager = new SessionManager();
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SessionManager initialized during crawl'});
            }
            
            if (this.sessionManager) {
              await this.sessionManager.captureSession();
              await this.sessionManager.saveSessionToStorage();
              chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Session captured for ${role}`});
            }
          }
          
          const roleData = this.roleGraphs.get(role);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Sending role completion for ${role} with ${roleData ? roleData.stats.totalNodes : 0} nodes`});
          
          chrome.runtime.sendMessage({
            type: 'ROLE_CRAWL_COMPLETE',
            role: role,
            data: roleData
          });
          
        } catch (error) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error crawling as ${role}: ${error.message}`});
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error stack: ${error.stack}`});
          
          chrome.runtime.sendMessage({
            type: 'ROLE_CRAWL_ERROR',
            role: role,
            error: error.message
          });
        }
      }
      
      // Merge all role graphs
      const mergedData = this.mergeRoleGraphs();
      
      this.isRunning = false;
      
      chrome.runtime.sendMessage({
        type: 'MULTI_ROLE_CRAWL_COMPLETE',
        data: mergedData
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Multi-role crawl completed successfully'});
      return mergedData;
      
    } catch (error) {
      this.isRunning = false;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Multi-role crawl failed: ${error.message}`});
      
      chrome.runtime.sendMessage({
        type: 'MULTI_ROLE_CRAWL_ERROR',
        error: error.message
      });
      
      throw error;
    }
  }
  
  async authenticateRole(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authenticating role: ${role}`});
      
      // Load credentials for this role
      const credentials = await this.loadCredentialsForRole(role);
      
      if (!credentials) {
        throw new Error(`No credentials found for role: ${role}`);
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Loaded credentials for ${role}: ${credentials.username}`});
      
      // Check if already authenticated
      if (this.authHandler.detectAuthenticationSuccess()) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Already authenticated as ${role}`});
        return true;
      }
      
      // Perform login
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting login process for ${role}...`});
      const success = await this.authHandler.performLogin(credentials);
      
      if (!success) {
        throw new Error(`Authentication failed for role: ${role}`);
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Login process completed for ${role}`});
      
      // Wait for page to settle after authentication/redirect
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authentication successful, waiting for page to settle...`});
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify we're on an authenticated page
      const currentUrl = window.location.href;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL after authentication: ${currentUrl}`});
      
      // Check if authentication was successful by looking at the URL or page content
      if (this.authHandler.detectAuthenticationSuccess()) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Successfully authenticated as ${role} on page: ${currentUrl}`});
        return true;
      } else {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authentication may have failed - still on login page or no success indicators found`});
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Page title: ${document.title}`});
        // Don't throw error, continue with crawling as the page might have changed
        return true;
      }
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authentication failed for ${role}: ${error.message}`});
      throw error;
    }
  }
  
  async loadCredentialsForRole(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Loading credentials for role: ${role}`});
      
      // Load credentials directly from Chrome storage
      const result = await chrome.storage.local.get([`auth_${role}`]);
      
      if (result[`auth_${role}`]) {
        const credentials = JSON.parse(atob(result[`auth_${role}`]));
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Credentials loaded for ${role}`});
        return credentials;
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `No credentials found for ${role}`});
      return null;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error loading credentials for ${role}: ${error.message}`});
      return null;
    }
  }
  
  async crawlAsRole(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `=== STARTING CRAWL AS ROLE: ${role} ===`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL: ${window.location.href}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Page title: ${document.title}`});
      
      this.currentRole = role;
      
      if (role === 'guest') {
        // For guest role, use synthetic approach
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting guest crawl with synthetic approach`});
        
        const crawler = new AutoTestAICrawler();
        crawler.currentRole = role;
        crawler.useNavigation = false; // Use synthetic approach
        if (this.enabledModules) {
          crawler.setEnabledModules(this.enabledModules);
        }
        await crawler.start();
        
        const graphData = crawler.graph.export();
        graphData.role = role;
        graphData.crawlTimestamp = Date.now();
        this.roleGraphs.set(role, graphData);
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Completed guest crawl - nodes: ${graphData.stats.totalNodes}, edges: ${graphData.stats.totalEdges}`});
        return graphData;
        
      } else {
        // For authenticated roles, crawl the current authenticated page
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Starting authenticated crawl for ${role} from current page`});
        
        const currentUrl = window.location.href;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current authenticated page URL: ${currentUrl}`});
        
        // Wait for the authenticated page to fully load
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Waiting for authenticated page to fully load...'});
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for page to load
        
        // Verify we're still on the authenticated page
        const finalUrl = window.location.href;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Final URL after wait: ${finalUrl}`});
        
        // Create a new crawler instance for the authenticated page
        const crawler = new AutoTestAICrawler();
        crawler.currentRole = role;
        crawler.useNavigation = true; // ENABLE navigation for authenticated crawling
        if (this.enabledModules) {
          crawler.setEnabledModules(this.enabledModules);
        }
        if (this.optimizationConfig) {
          crawler.setOptimizationConfig(this.optimizationConfig);
        }
        if (this.securityConfig) {
          crawler.setSecurityConfig(this.securityConfig);
        }
        if (this.analyticsConfig) {
          crawler.setAnalyticsConfig(this.analyticsConfig);
        }
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🚀 Starting authenticated crawl with navigation ENABLED - will discover new pages`});
        
        // Start crawling from the authenticated page
        await crawler.start();
        
        // Store graph for this role
        const graphData = crawler.graph.export();
        graphData.role = role;
        graphData.crawlTimestamp = Date.now();
        
        this.roleGraphs.set(role, graphData);
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Completed ${role} authenticated crawl - nodes: ${graphData.stats.totalNodes}, edges: ${graphData.stats.totalEdges}`});
        
        return graphData;
      }
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error crawling as ${role}: ${error.message}`});
      throw error;
    }
  }
  
  mergeRoleGraphs() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Merging role graphs...'});
      
      const mergedData = {
        roles: [],
        nodes: [],
        edges: [],
        statistics: {
          totalNodes: 0,
          totalEdges: 0,
          roles: {}
        },
        metadata: {
          crawlTimestamp: Date.now(),
          totalRoles: this.roleGraphs.size,
          crawlDuration: 0
        }
      };
      
      // Process each role's graph
      for (const [role, graph] of this.roleGraphs.entries()) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Merging graph for role: ${role}`});
        
        // Add role information
        mergedData.roles.push({
          name: role,
          nodes: graph.nodes ? graph.nodes.length : 0,
          edges: graph.edges ? graph.edges.length : 0,
          crawlTimestamp: graph.crawlTimestamp || Date.now()
        });
        
        // Add role statistics
        mergedData.statistics.roles[role] = {
          nodes: graph.nodes ? graph.nodes.length : 0,
          edges: graph.edges ? graph.edges.length : 0
        };
        
        // Add nodes with role annotation
        if (graph.nodes) {
          graph.nodes.forEach(node => {
            node.role = role;
            node.crawlTimestamp = graph.crawlTimestamp || Date.now();
            mergedData.nodes.push(node);
          });
        }
        
        // Add edges with role annotation
        if (graph.edges) {
          graph.edges.forEach(edge => {
            edge.role = role;
            edge.crawlTimestamp = graph.crawlTimestamp || Date.now();
            mergedData.edges.push(edge);
          });
        }
      }
      
      // Calculate total statistics
      mergedData.statistics.totalNodes = mergedData.nodes.length;
      mergedData.statistics.totalEdges = mergedData.edges.length;
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Merged graphs - total nodes: ${mergedData.statistics.totalNodes}, total edges: ${mergedData.statistics.totalEdges}`});
      
      return mergedData;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error merging role graphs: ${error.message}`});
      throw error;
    }
  }
  
  async switchToRole(role) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Switching to role: ${role}`});
      
      if (role === 'guest') {
        // For guest, just clear any existing authentication
        this.currentRole = 'guest';
        return true;
      }
      
      // Load and restore session for authenticated roles
      const sessionData = await this.sessionManager.loadSessionFromStorage();
      
      if (sessionData && this.sessionManager.isSessionValid(sessionData)) {
        await this.sessionManager.restoreSession(sessionData);
        this.currentRole = role;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Switched to ${role} using existing session`});
        return true;
      }
      
      // If no valid session, need to authenticate
      await this.authenticateRole(role);
      this.currentRole = role;
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Switched to ${role} after authentication`});
      return true;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error switching to role ${role}: ${error.message}`});
      throw error;
    }
  }
  
  stop() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Stopping multi-role crawler'});
    this.isRunning = false;
  }
  
  getCurrentRole() {
    return this.currentRole;
  }
  
  getRoleGraph(role) {
    return this.roleGraphs.get(role);
  }
  
  getAllRoleGraphs() {
    return this.roleGraphs;
  }
  
  async clearAllSessions() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Clearing all sessions'});
      
      await chrome.storage.local.remove(['current_session']);
      this.sessionManager.clearSession();
      this.roleGraphs.clear();
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'All sessions cleared'});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error clearing sessions: ${error.message}`});
      return false;
    }
  }
}

// Make MultiRoleCrawler available globally
window.MultiRoleCrawler = MultiRoleCrawler;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== MULTI-ROLE CRAWLER SCRIPT LOADED ==='});
}
