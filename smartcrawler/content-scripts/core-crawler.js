chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== CORE CRAWLER SCRIPT LOADING ==='});
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `DOM ready state: ${document.readyState}`});
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Window location: ${window.location.href}`});

if (typeof window.AutoTestAICrawler === 'undefined') {
class AutoTestAICrawler {
  constructor() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Creating AutoTestAICrawler instance...'});
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `DOMHasher available: ${typeof window.DOMHasher}`});
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `StateGraph available: ${typeof window.StateGraph}`});
    
    this.hasher = new window.DOMHasher();
    this.graph = new window.StateGraph();
    this.isRunning = false;
    this.visited = new Set();
    this.navigationQueue = [];
    this.maxDepth = 10; // Maximum depth for extensive crawling
    this.currentDepth = 0;
    this.crawledCount = 0;
    this.linkQueue = []; // Queue to store all links to crawl
    this.normalizedUrls = new Set(); // Track normalized URLs to prevent duplicates
    this.currentRole = 'guest'; // Default role
    this.useNavigation = true; // Enable navigation-based crawling
    this.navigationTimeout = 5000; // 5 second timeout per page
    this.originalUrl = window.location.href; // Store original URL
    
    // NEW: Enhanced features
    this.useDeepLinkExtraction = true; // Enable deep link discovery
    this.deepLinkExtractionCompleted = false; // Track if deep link extraction already ran
    this.humanBehaviorSimulator = window.HumanBehaviorSimulator ? new window.HumanBehaviorSimulator() : null;
    this.securityChallengeHandler = window.securityChallengeHandler || null; // Initialized by module
    
    // Universal System Integration
    this.universalDetector = null;
    this.universalFormHandler = null;
    this.useUniversalSystem = true; // Enable universal system
    
    // Advanced Modules Integration
    this.modules = {
      spa: null,
      modal: null,
      performance: null,
      accessibility: null,
      network: null,
      storage: null,
      websocket: null,
      cookie: null
    };
    this.enabledModules = {
      spa: false,
      modal: false,
      performance: false,
      accessibility: false,
      network: false,
      storage: false,
      websocket: false,
      cookie: false
    };

    // Week 6 Optimization Systems
    this.intelligentSampler = null;
    this.stabilityDetector = null;
    this.errorHandler = null;
    this.performanceOptimizer = null;

    this.optimizationConfig = {
      enableSampling: false,
      enableStability: false,
      enableRetry: false,
      enableOptimization: false
    };

    // Week 7 Security System
    this.securityManager = null;
    this.securityConfig = {
      enableSanitization: false,
      enableValidation: false,
      enableXSSProtection: false,
      enableSecureStorage: false
    };
    
    // Week 8: Advanced Analytics Modules
    this.journeyMapper = null;
    this.heatmapCollector = null;
    this.funnelAnalyzer = null;
    this.reportGenerator = null;
    this.analyticsConfig = {
      enableJourneys: false,
      enableHeatmap: false,
      enableFunnel: false,
      enableReporting: false
    };
  }

  setOptimizationConfig(config) {
    this.optimizationConfig = config;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Optimization config: ${JSON.stringify(config)}`});
  }

  setSecurityConfig(config) {
    this.securityConfig = config;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Security config: ${JSON.stringify(config)}`});
  }

  setAnalyticsConfig(config) {
    this.analyticsConfig = config;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Analytics config: ${JSON.stringify(config)}`});
  }

  async initializeSecuritySystem() {
    if (typeof window.SecurityManager !== 'undefined') {
      this.securityManager = new window.SecurityManager();
      await this.securityManager.initialize(this.securityConfig);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Security system initialized successfully'});
    } else {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SecurityManager not available, skipping security initialization'});
    }
  }
  
  async start() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawler.start() called'});
    this.isRunning = true;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawler started'});
    
    try {
      // Initialize universal system
      await this.initializeUniversalSystem();
      
      // Initialize advanced modules
      await this.initializeAdvancedModules();
      
      // Initialize optimization systems
      await this.initializeOptimizationSystems();
      
      // Initialize security system
      await this.initializeSecuritySystem();
      
      // Security challenge monitoring is DISABLED by default (too many false positives)
      // Uncomment to enable:
      // if (this.securityChallengeHandler) {
      //   this.securityChallengeHandler.startMonitoring();
      //   chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔒 Security challenge monitoring started'});
      // }
      
      // Initialize analytics modules
      this.initializeAnalyticsModules();
      
      // Intercept JavaScript redirects (GitHub Pages SPA, etc.)
      this.interceptJavaScriptRedirects();
      
      // Wait for page to be fully loaded
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Waiting for page to be fully loaded...'});
      await this.waitForPageLoad();
      
      // Capture initial state
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Capturing initial state...'});
      const initialHash = this.captureCurrentState();
      this.visited.add(window.location.href);
      
      // Track normalized URL for initial page
      const normalizedUrl = this.normalizeUrl(window.location.href);
      this.normalizedUrls.add(normalizedUrl);
      console.log('✅ Initial normalized URL tracked:', normalizedUrl);
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Initial state captured, hash: ${initialHash}`});
      
      // Start breadth-first crawling
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Starting breadth-first crawl...'});
      await this.breadthFirstCrawl(initialHash, 0);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Breadth-first crawl completed'});
      
      this.isRunning = false;
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawler finished'});
      this.sendResults();
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in enhanced crawler start: ${error.message}`});
      this.isRunning = false;
    }
  }
  
  // Initialize Universal System
  async initializeUniversalSystem() {
    try {
      console.log('🚀 CORE CRAWLER: Initializing universal system...');
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🚀 Initializing universal system...'});
      
      if (this.useUniversalSystem) {
        console.log('✅ CORE CRAWLER: Universal system enabled');
        
        if (window.UniversalEventDetector) {
          console.log('🔧 CORE CRAWLER: Creating Universal Event Detector...');
          this.universalDetector = new UniversalEventDetector();
          console.log('✅ CORE CRAWLER: Universal Event Detector initialized');
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Universal Event Detector initialized'});
        } else {
          console.warn('⚠️ CORE CRAWLER: UniversalEventDetector not available');
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '⚠️ UniversalEventDetector not available'});
        }
        
        if (window.UniversalFormHandler) {
          console.log('🔧 CORE CRAWLER: Creating Universal Form Handler...');
          this.universalFormHandler = new UniversalFormHandler();
          console.log('✅ CORE CRAWLER: Universal Form Handler initialized');
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Universal Form Handler initialized'});
        } else {
          console.warn('⚠️ CORE CRAWLER: UniversalFormHandler not available');
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '⚠️ UniversalFormHandler not available'});
        }
        
        if (window.extractLinksEnhanced) {
          console.log('✅ CORE CRAWLER: Enhanced link extraction available');
        }
        
        if (window.extractFormsEnhanced) {
          console.log('✅ CORE CRAWLER: Enhanced form extraction available');
        }
        
        if (window.getEnhancedAPIRequests) {
          console.log('✅ CORE CRAWLER: Enhanced API monitoring available');
        }
        
        console.log('🎯 CORE CRAWLER: Universal system initialization complete');
      } else {
        console.log('❌ CORE CRAWLER: Universal system disabled');
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '❌ Universal system disabled'});
      }
    } catch (error) {
      console.error('❌ CORE CRAWLER: Error initializing universal system:', error);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error initializing universal system: ${error.message}`});
    }
  }

  // Set enabled modules
  setEnabledModules(modules) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Setting enabled modules: ${JSON.stringify(modules)}`});
    this.enabledModules = { ...this.enabledModules, ...modules };
  }

  // Initialize Advanced Modules
  async initializeAdvancedModules() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INITIALIZING ADVANCED MODULES ==='});
    
    try {
      // Initialize SPA Detector
      if (this.enabledModules.spa && typeof window.SPADetector !== 'undefined') {
        this.modules.spa = new window.SPADetector();
        this.modules.spa.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ SPA Detector initialized'});
        
        // Listen for SPA route changes
        window.addEventListener('spa-route-change', (event) => {
          this.handleSPARouteChange(event.detail);
        });
      }

      // Initialize Modal Detector
      if (this.enabledModules.modal && typeof window.ModalDetector !== 'undefined') {
        this.modules.modal = new window.ModalDetector();
        this.modules.modal.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Modal Detector initialized'});
        
        // Listen for modal detection events
        window.addEventListener('modal-detected', (event) => {
          this.handleModalDetected(event.detail);
        });
      }

      // Initialize Performance Monitor
      if (this.enabledModules.performance && typeof window.PerformanceMonitor !== 'undefined') {
        this.modules.performance = new window.PerformanceMonitor();
        this.modules.performance.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Performance Monitor initialized'});
      }

      // Initialize Accessibility Analyzer
      if (this.enabledModules.accessibility && typeof window.AccessibilityAnalyzer !== 'undefined') {
        this.modules.accessibility = new window.AccessibilityAnalyzer();
        this.modules.accessibility.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Accessibility Analyzer initialized'});
      }

      // Initialize Network Monitor
      if (this.enabledModules.network && typeof window.NetworkMonitor !== 'undefined') {
        this.modules.network = new window.NetworkMonitor();
        this.modules.network.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Network Monitor initialized'});
      }

      // Initialize Storage Analyzer
      if (this.enabledModules.storage && typeof window.StorageAnalyzer !== 'undefined') {
        this.modules.storage = new window.StorageAnalyzer();
        this.modules.storage.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Storage Analyzer initialized'});
      }

      // Initialize WebSocket Detector
      if (this.enabledModules.websocket && typeof window.WebSocketDetector !== 'undefined') {
        this.modules.websocket = new window.WebSocketDetector();
        this.modules.websocket.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ WebSocket Detector initialized'});
      }

      // Initialize Cookie Manager
      if (this.enabledModules.cookie && typeof window.CookieManager !== 'undefined') {
        this.modules.cookie = new window.CookieManager();
        this.modules.cookie.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Cookie Manager initialized'});
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ADVANCED MODULES INITIALIZED ==='});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error initializing modules: ${error.message}`});
    }
  }

  async initializeOptimizationSystems() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INITIALIZING OPTIMIZATION SYSTEMS ==='});

      // Initialize Intelligent Sampler
      if (this.optimizationConfig.enableSampling && typeof window.IntelligentSampler !== 'undefined') {
        this.intelligentSampler = new window.IntelligentSampler({
          similarityThreshold: 0.85
        });
        this.intelligentSampler.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Intelligent Sampler initialized'});
      }

      // Initialize Stability Detector
      if (this.optimizationConfig.enableStability && typeof window.StabilityDetector !== 'undefined') {
        this.stabilityDetector = new window.StabilityDetector({
          networkThreshold: 2000,
          domThreshold: 1500,
          mutationThreshold: 5
        });
        this.stabilityDetector.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Stability Detector initialized'});
      }

      // Initialize Error Handler
      if (this.optimizationConfig.enableRetry && typeof window.ErrorHandler !== 'undefined') {
        this.errorHandler = new window.ErrorHandler({
          maxRetries: 3,
          baseDelay: 1000
        });
        this.errorHandler.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Error Handler initialized'});
      }

      // Initialize Performance Optimizer
      if (this.optimizationConfig.enableOptimization && typeof window.PerformanceOptimizer !== 'undefined') {
        this.performanceOptimizer = new window.PerformanceOptimizer({
          memoryLimit: 400
        });
        this.performanceOptimizer.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Performance Optimizer initialized'});
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== OPTIMIZATION SYSTEMS INITIALIZED ==='});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error initializing optimization systems: ${error.message}`});
    }
  }

  // Initialize Security System
  async initializeSecuritySystem() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INITIALIZING SECURITY SYSTEM ==='});
    
    try {
      if (typeof window.SecurityManager !== 'undefined') {
        this.securityManager = new window.SecurityManager();
        await this.securityManager.initialize(this.securityConfig);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Security system initialized'});
      } else {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '❌ SecurityManager not available'});
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error initializing security system: ${error.message}`});
    }
  }

  // Initialize Analytics Modules
  initializeAnalyticsModules() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INITIALIZING ANALYTICS MODULES ==='});
    
    try {
      // Initialize Journey Mapper
      if (typeof window.JourneyMapper !== 'undefined' && this.analyticsConfig?.enableJourneys) {
        this.journeyMapper = new window.JourneyMapper();
        this.journeyMapper.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Journey Mapper initialized'});
      }

      // Initialize Heatmap Collector
      if (typeof window.HeatmapCollector !== 'undefined' && this.analyticsConfig?.enableHeatmap) {
        this.heatmapCollector = new window.HeatmapCollector();
        this.heatmapCollector.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Heatmap Collector initialized'});
      }

      // Initialize Funnel Analyzer
      if (typeof window.FunnelAnalyzer !== 'undefined' && this.analyticsConfig?.enableFunnel) {
        this.funnelAnalyzer = new window.FunnelAnalyzer();
        this.funnelAnalyzer.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Funnel Analyzer initialized'});
      }

      // Initialize Report Generator
      if (typeof window.ReportGenerator !== 'undefined' && this.analyticsConfig?.enableReporting) {
        this.reportGenerator = new window.ReportGenerator();
        this.reportGenerator.enable();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Report Generator initialized'});
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== ANALYTICS MODULES INITIALIZED ==='});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error initializing analytics modules: ${error.message}`});
    }
  }

  // Intercept JavaScript Redirects (GitHub Pages SPA, etc.)
  interceptJavaScriptRedirects() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔒 Setting up JavaScript redirect interception'});
    
    try {
      const originalReplace = window.location.replace;
      const originalAssign = window.location.assign;
      const self = this;
      
      window.location.replace = function(url) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `🚨 JavaScript redirect detected: ${url}`
        });
        
        // Handle GitHub Pages SPA redirect pattern
        if (url.includes('/?/') && url.includes('~and~')) {
          chrome.runtime.sendMessage({
            type: 'DEBUG_LOG', 
            message: `🎯 GitHub Pages SPA redirect detected: ${url}`
          });
          
          try {
            // Extract original path from the redirect
            const urlObj = new URL(url);
            const pathParam = urlObj.searchParams.get('/');
            if (pathParam) {
              const originalPath = pathParam.replace(/~and~/g, '&');
              const originalUrl = `${urlObj.origin}${originalPath}`;
              
              chrome.runtime.sendMessage({
                type: 'DEBUG_LOG', 
                message: `🔄 Reconstructed original URL: ${originalUrl}`
              });
              
              // Navigate to original URL instead
              return originalReplace.call(window.location, originalUrl);
            }
          } catch (e) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `⚠️ Error processing GitHub Pages redirect: ${e.message}`
            });
          }
        }
        
        return originalReplace.call(window.location, url);
      };
      
      window.location.assign = function(url) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `🚨 JavaScript navigation detected: ${url}`
        });
        return originalAssign.call(window.location, url);
      };
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ JavaScript redirect interception enabled'});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error setting up redirect interception: ${error.message}`});
    }
  }

  async waitForPageLoad() {
    if (this.stabilityDetector?.enabled) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Using Stability Detector for page load wait'});
      await this.stabilityDetector.waitForStability({ strict: true });
    } else {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Using fallback page load wait (3 seconds)'});
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Handle SPA route changes
  handleSPARouteChange(routeChange) {
    if (!this.isRunning) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `SPA route change: ${routeChange.type} -> ${routeChange.route}`});
    
    // Generate synthetic hash for the new route
    const newHash = this.generateSyntheticHash(routeChange.route);
    const currentHash = this.hasher.generateHash(document.body);
    
    // Add edge to graph
    this.graph.addEdge(currentHash, newHash, `spa:${routeChange.type}`, {
      route: routeChange.route,
      framework: routeChange.framework,
      timestamp: routeChange.timestamp
    });
    
    // Add node to graph
    this.graph.addNode(newHash, {
      url: routeChange.route,
      type: 'spa_route',
      framework: routeChange.framework,
      timestamp: routeChange.timestamp,
      synthetic: true
    });
  }

  // Handle modal detection
  handleModalDetected(modalData) {
    if (!this.isRunning) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Modal detected: ${modalData.selector}`});
    
    // Store modal data for later inclusion in state capture
    if (!this.graph.modalData) {
      this.graph.modalData = [];
    }
    this.graph.modalData.push(modalData);
  }

  async waitForPageLoad() {
    return new Promise((resolve) => {
      // Check if page is already loaded
      if (document.readyState === 'complete') {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Page already loaded'});
        resolve();
        return;
      }
      
      // Wait for page to load
      const checkLoad = () => {
        if (document.readyState === 'complete') {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Page load complete'});
          resolve();
        } else {
          setTimeout(checkLoad, 100);
        }
      };
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Waiting for page load...'});
      checkLoad();
    });
  }
  
  async start() {
    console.log('🚀 Crawler starting...');
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🚀 Crawler starting...'});
    
    this.isRunning = true;
    
    // Initialize all systems
    await this.initializeUniversalSystem();
    await this.initializeAdvancedModules();
    await this.initializeOptimizationSystems();
    await this.initializeSecuritySystem();
    this.initializeAnalyticsModules(); // Note: Not async
    
    // Capture the initial page state
    console.log('📊 Capturing initial page state...');
    const initialHash = await this.captureEnhancedState();
    console.log(`✅ Initial page captured with hash: ${initialHash}`);
    
    // Mark initial page as visited
    this.visited.add(initialHash);
    this.crawledCount++;
    
    // Save initial state
    await this.saveState();
    
    // Report progress
    this.reportProgress();
    
    // Start breadth-first crawl from the initial page
    console.log('🔍 Starting breadth-first crawl...');
    await this.breadthFirstCrawl(initialHash, 0);
  }
  
  async navigateAndCrawl(link, fromHash, depth = 0) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `navigateAndCrawl starting: ${link.href}`});
      
      // Check if we should use real navigation
      if (this.useNavigation) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Using REAL NAVIGATION to: ${link.href}`});
        
        // Save current state before navigation (includes graph)
        await this.saveState();
        
        // Send navigation request to background script
        // Note: Don't pass graph here, it's already saved in storage
        chrome.runtime.sendMessage({
          type: 'NAVIGATE_AND_CRAWL',
          url: link.href,
          fromHash: fromHash,
          linkText: link.text,
          depth: depth,
          currentRole: this.currentRole,
          tabId: null // Will be set by background script
        });
        
        return true;
      }
      
      // FALLBACK: Use synthetic data if navigation is disabled
      // Find the link element
      const linkElement = Array.from(document.querySelectorAll('a'))
        .find(a => a.href === link.href);
      
      if (!linkElement) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Link element not found: ${link.href}`});
        return false;
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found link element, simulating navigation: ${link.href}`});
      
      // Instead of actually clicking, simulate the navigation by creating synthetic data
      // This avoids the content script destruction issue
      const syntheticHash = this.generateSyntheticHash(link);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Generated synthetic hash: ${syntheticHash}`});
      
      // Create edge from previous page to synthetic page
      this.graph.addEdge(fromHash, syntheticHash, `click:${link.text}`);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Edge created: ${fromHash} -> ${syntheticHash}`});
      
      // Add the synthetic page as a node
      // Initialize smart synthetic generator
      if (!this.smartSynthetic) {
        this.smartSynthetic = new SmartSyntheticGenerator();
      }
      
      // Generate SMART synthetic data with real metadata
      const syntheticData = await this.smartSynthetic.generateSmartSyntheticData(link.href);
      
      // Add synthetic page with REAL metadata
      this.graph.addNode(syntheticHash, {
        ...syntheticData,
        role: this.currentRole,
        depth: link.depth || this.currentDepth + 1
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Successfully created synthetic node for: ${link.href}`});
      
      return true;
      
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Failed to process link ${link.href}: ${error.message}`});
      return false;
    }
  }

  generateSyntheticHash(link) {
    // Generate a consistent hash for the link based on its URL and text
    const content = `${link.href}:${link.text}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Enhanced URL normalization with universal parameter removal
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Handle GitHub Pages SPA redirect URLs (/?/ pattern with ~and~ separator)
      if (urlObj.pathname === '/' && urlObj.search.includes('/?/')) {
        const pathParam = urlObj.searchParams.get('/');
        if (pathParam) {
          // Reconstruct original URL
          const originalPath = pathParam.replace(/~and~/g, '&');
          const reconstructedUrl = `${urlObj.origin}${originalPath}`;
          chrome.runtime.sendMessage({
            type: 'DEBUG_LOG', 
            message: `🔄 Normalizing GitHub Pages SPA URL: ${url} → ${reconstructedUrl}`
          });
          // Recursive call with reconstructed URL
          return this.normalizeUrl(reconstructedUrl);
        }
      }
      
      // Remove tracking parameters using centralized constants
      const trackingParams = window.CONSTANTS?.URL_NORMALIZATION?.TRACKING_PARAMS || [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', '_ga', '_gac', '_gl',
        'mc_cid', 'mc_eid', 'ref', 'referrer', 'source'
      ];
      
      // Get domain-specific rules if available
      const hostname = urlObj.hostname.replace('www.', '');
      const domainRules = window.CONSTANTS?.URL_NORMALIZATION?.DOMAIN_RULES || {};
      const keepParams = domainRules[hostname] || [];
      
      // Remove tracking params but keep domain-specific important params
      trackingParams.forEach(param => {
        if (!keepParams.includes(param)) {
          urlObj.searchParams.delete(param);
        }
      });
      
      // Remove trailing slash for consistency
      let normalizedPath = urlObj.pathname;
      if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
      }
      
      // Rebuild URL with normalized path
      return `${urlObj.origin}${normalizedPath}${urlObj.search}${urlObj.hash}`;
    } catch (e) {
      return url;
    }
  }

  // Enhanced isSamePage method with better comparison
  isSamePage(url1, url2) {
    try {
      const normalized1 = this.normalizeUrl(url1);
      const normalized2 = this.normalizeUrl(url2);
      
      // Compare normalized URLs
      if (normalized1 === normalized2) {
        return true;
      }
      
      // Also check if they have the same base path
      const urlObj1 = new URL(normalized1);
      const urlObj2 = new URL(normalized2);
      
      return urlObj1.origin === urlObj2.origin && 
             urlObj1.pathname === urlObj2.pathname;
    } catch (e) {
      return false;
    }
  }

  // Universal duplicate detection method
  checkForDuplicates(url) {
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check against all visited normalized URLs
    for (const visitedUrl of this.normalizedUrls) {
      if (this.isSamePage(normalizedUrl, visitedUrl)) {
        console.log(`🚫 Duplicate detected: ${url} matches ${visitedUrl}`);
        return true;
      }
    }
    
    return false;
  }

  async waitForNavigation(targetUrl, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let navigationDetected = false;
      
      // Listen for navigation events
      const handleNavigation = () => {
        if (!navigationDetected) {
          navigationDetected = true;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Navigation event detected to: ${window.location.href}`});
          setTimeout(() => {
            resolve(true);
          }, 1000); // Wait for page to settle
        }
      };
      
      // Listen for various navigation events
      window.addEventListener('popstate', handleNavigation);
      window.addEventListener('hashchange', handleNavigation);
      
      // Also check periodically for URL changes
      const checkNavigation = () => {
        if (navigationDetected) {
          return; // Already resolved
        }
        
        // Check if we've navigated to the target URL
        if (window.location.href === targetUrl) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Navigation confirmed to: ${targetUrl}`});
          navigationDetected = true;
          setTimeout(() => {
            resolve(true);
          }, 1000);
          return;
        }
        
        // Check for timeout
        if (Date.now() - startTime > timeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Navigation timeout after ${timeout}ms, assuming same page`});
          // Clean up event listeners
          window.removeEventListener('popstate', handleNavigation);
          window.removeEventListener('hashchange', handleNavigation);
          resolve(true); // Assume navigation worked even if we can't detect it
          return;
        }
        
        // Continue checking
        setTimeout(checkNavigation, 200);
      };
      
      // Start checking immediately
      checkNavigation();
    });
  }
  
  
  captureCurrentState() {
    console.log('📊 CORE CRAWLER: Starting enhanced state capture...');
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '📊 Starting enhanced state capture...'});
    
    const startTime = performance.now();
    
    console.log('🔧 CORE CRAWLER: Generating DOM hash...');
    const hash = this.hasher.generateHash();
    console.log(`✅ CORE CRAWLER: Hash generated: ${hash}`);
    
    // Use enhanced extraction with fallback
    console.log('🔗 CORE CRAWLER: Extracting links...');
    const links = window.extractLinksEnhanced ? extractLinksEnhanced() : extractLinks();
    console.log(`✅ CORE CRAWLER: Found ${links.length} links (enhanced: ${window.extractLinksEnhanced ? 'YES' : 'NO'})`);
    
    console.log('📋 CORE CRAWLER: Extracting forms...');
    const forms = window.extractFormsEnhanced ? extractFormsEnhanced() : extractForms();
    console.log(`✅ CORE CRAWLER: Found ${forms.length} forms (enhanced: ${window.extractFormsEnhanced ? 'YES' : 'NO'})`);
    
    // Log form details
    forms.forEach((form, index) => {
      console.log(`📋 CORE CRAWLER: Form ${index + 1}: ${form.type || 'unknown'} (confidence: ${form.confidence || 'N/A'})`);
      if (form.analysis?.purpose) {
        console.log(`   Purpose: ${form.analysis.purpose.type}/${form.analysis.purpose.subtype} (confidence: ${form.analysis.purpose.confidence})`);
      }
    });
    
    console.log('🌐 CORE CRAWLER: Getting API requests...');
    const apiRequests = window.getEnhancedAPIRequests ? getEnhancedAPIRequests() : getAPIRequests();
    console.log(`✅ CORE CRAWLER: Found ${apiRequests.length} API requests (enhanced: ${window.getEnhancedAPIRequests ? 'YES' : 'NO'})`);
    
    const hasAuth = forms.some(f => f.analysis?.purpose?.type === 'authentication' || f.formType === 'login');
    console.log(`🔐 CORE CRAWLER: Authentication detected: ${hasAuth ? 'YES' : 'NO'}`);
    
    // Collect module data
    console.log('🔧 CORE CRAWLER: Collecting module data...');
    const moduleData = {};
    
    if (this.modules.spa?.enabled) {
      moduleData.spaRoutes = this.modules.spa.getRouteChanges();
      moduleData.spaFramework = this.modules.spa.getFrameworkInfo();
    }
    
    if (this.modules.modal?.enabled) {
      moduleData.modals = this.modules.modal.getModals();
      moduleData.visibleModals = this.modules.modal.getVisibleModals();
    }
    
    if (this.modules.performance?.enabled) {
      moduleData.performance = this.modules.performance.getMetrics();
    }
    
    if (this.modules.accessibility?.enabled) {
      moduleData.accessibility = {
        issues: this.modules.accessibility.getIssues(),
        summary: this.modules.accessibility.getSummary(),
        wcagLevel: this.modules.accessibility.getWCAGLevel()
      };
    }

    if (this.modules.network?.enabled) {
      moduleData.network = this.modules.network.getMetrics();
    }

    if (this.modules.storage?.enabled) {
      moduleData.storage = this.modules.storage.getStorageData();
    }

    if (this.modules.websocket?.enabled) {
      moduleData.websocket = this.modules.websocket.getMetrics();
    }

    if (this.modules.cookie?.enabled) {
      moduleData.cookie = this.modules.cookie.getMetrics();
    }

    // Week 6 Optimization Systems Data
    if (this.intelligentSampler?.enabled) {
      moduleData.sampling = this.intelligentSampler.getMetrics();
    }
    if (this.stabilityDetector?.enabled) {
      moduleData.stability = this.stabilityDetector.getMetrics();
    }
    if (this.errorHandler?.enabled) {
      moduleData.errors = this.errorHandler.getMetrics();
    }
    if (this.performanceOptimizer?.enabled) {
      moduleData.performance = this.performanceOptimizer.getMetrics();
    }

    // Week 8 Analytics Data Collection
    if (this.journeyMapper?.enabled) {
      moduleData.journeys = this.journeyMapper.getJourneys();
    }
    if (this.heatmapCollector?.enabled) {
      moduleData.heatmap = this.heatmapCollector.getHeatmapData();
    }
    if (this.funnelAnalyzer?.enabled) {
      moduleData.funnel = this.funnelAnalyzer.getFunnelData();
    }
    
    // NEW: Collect API Interceptor data
    let apiInterceptorData = {};
    if (window.apiInterceptor) {
      apiInterceptorData = window.apiInterceptor.exportData();
      console.log(`🌐 Captured ${apiInterceptorData.totalAPICalls} API calls, ${apiInterceptorData.apiEndpoints.length} unique endpoints`);
    }
    
    console.log('💾 CORE CRAWLER: Adding node to graph...');
    this.graph.addNode(hash, {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      role: this.currentRole, // Add role tracking
      features: {
        linkCount: links.length,
        formCount: forms.length,
        apiCount: apiRequests.length + (apiInterceptorData.totalAPICalls || 0),
        hasAuth: hasAuth,
        apiEndpoints: apiInterceptorData.apiEndpoints?.length || 0,
        webSocketConnections: apiInterceptorData.webSocketConnections?.length || 0
      },
      links: links,
      forms: forms,
      network: {
        requests: apiRequests,
        apiEndpoints: apiInterceptorData.apiEndpoints || [],        // NEW: Intercepted API endpoints
        webSockets: apiInterceptorData.webSocketConnections || []   // NEW: WebSocket connections
      },
      modules: moduleData  // NEW: Module data
    });
    
    // Incremental export every N nodes (memory optimization)
    const exportInterval = window.CONSTANTS?.MEMORY?.EXPORT_EVERY_NODES || 100;
    if (this.graph.nodes.size % exportInterval === 0) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `📦 Incremental export triggered at ${this.graph.nodes.size} nodes`});
      this.performIncrementalExport();
    }
    
    // Memory warning check
    this.checkMemoryUsage();
    
    // Clear requests for next state
    console.log('🧹 CORE CRAWLER: Clearing API requests...');
    if (window.clearEnhancedAPIRequests) {
      clearEnhancedAPIRequests();
      console.log('✅ CORE CRAWLER: Enhanced API requests cleared');
    } else {
      clearAPIRequests();
      console.log('✅ CORE CRAWLER: Standard API requests cleared');
    }
    
    const duration = performance.now() - startTime;
    console.log(`🎯 CORE CRAWLER: Enhanced state capture completed in ${duration.toFixed(2)}ms`);
    console.log(`📊 CORE CRAWLER: State summary - Links: ${links.length}, Forms: ${forms.length}, APIs: ${apiRequests.length}, Auth: ${hasAuth ? 'YES' : 'NO'}`);
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🎯 Enhanced state capture completed in ${duration.toFixed(2)}ms - Hash: ${hash}`});
    return hash;
  }
  
  // Save crawler state to chrome storage
  async saveState() {
    try {
      const state = {
        graph: this.graph.export(),
        visited: Array.from(this.visited),
        currentDepth: this.currentDepth,
        crawledCount: this.crawledCount,
        currentRole: this.currentRole,
        maxDepth: this.maxDepth,
        linkQueue: this.linkQueue, // Save the link queue
        normalizedUrls: Array.from(this.normalizedUrls), // Save normalized URLs
        deepLinkExtractionCompleted: this.deepLinkExtractionCompleted // CRITICAL: Save flag to prevent re-running
      };
      
      await chrome.storage.local.set({ crawlerState: state });
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ State saved - URLs: ${this.normalizedUrls.size}, Queue: ${this.linkQueue.length}, DeepLinkDone: ${this.deepLinkExtractionCompleted}`});
      return true;
    } catch (error) {
      console.error('❌ Error saving crawler state:', error);
      return false;
    }
  }
  
  // Restore crawler state from chrome storage
  async restoreState() {
    try {
      const result = await chrome.storage.local.get('crawlerState');
      if (result.crawlerState) {
        const state = result.crawlerState;
        
        // Restore graph
        this.graph.import(state.graph);
        
        // Restore other properties
        this.visited = new Set(state.visited);
        this.currentDepth = state.currentDepth;
        this.crawledCount = state.crawledCount;
        this.currentRole = state.currentRole;
        this.maxDepth = state.maxDepth;
        this.linkQueue = state.linkQueue || []; // Restore the link queue
        this.normalizedUrls = new Set(state.normalizedUrls || []); // Restore normalized URLs
        this.deepLinkExtractionCompleted = state.deepLinkExtractionCompleted || false; // CRITICAL: Restore flag
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ State restored - Nodes: ${state.graph.nodes?.length || 0}, Edges: ${state.graph.edges?.length || 0}, Queue: ${this.linkQueue.length}, DeepLinkDone: ${this.deepLinkExtractionCompleted}`});
        return true;
      }
      console.log('⚠️ No crawler state found to restore');
      return false;
    } catch (error) {
      console.error('❌ Error restoring crawler state:', error);
      return false;
    }
  }
  
  // Enhanced state capture method
  async captureEnhancedState() {
    console.log('📊 captureEnhancedState: Starting...');
    const hash = this.captureCurrentState();
    console.log(`✅ captureEnhancedState: Completed with hash ${hash}`);
    return hash;
  }
  
  // Enhanced breadth-first crawl with robust URL processing
  async breadthFirstCrawl(startHash, depth = 0) {
    try {
      console.log(`🚀 breadthFirstCrawl: Starting from hash ${startHash} at depth ${depth}/${this.maxDepth}`);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🚀 breadthFirstCrawl: depth=${depth}/${this.maxDepth}`});
      
      // Simulate human behavior to evade bot detection
      if (this.humanBehaviorSimulator && depth > 0) {
        await this.humanBehaviorSimulator.simulateHumanBehavior();
      }
      
      // Update current depth
      this.currentDepth = depth;
      
      // Check if we've reached max depth
      if (depth >= this.maxDepth) {
        console.log('🏁 Reached maximum depth');
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🏁 Reached max depth, completing crawl'});
        this.sendResults();
        return;
      }
      
      // Get the current node
      const node = this.graph.getNode(startHash);
      if (!node) {
        console.error('❌ Node not found for hash', startHash);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Node not found: ${startHash}`});
        this.sendResults();
        return;
      }
      
      console.log(`✅ Processing: ${node.data ? node.data.url : 'NO DATA'}`);
      
      // Extract links from current page
      const currentLinks = await this.extractLinksFromCurrentPage();
      console.log(`🔗 Found ${currentLinks.length} links on page`);
      
      // Test interactive elements (with timeout protection)
      try {
        await Promise.race([
          this.testInteractiveElements(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);
      } catch (interactiveError) {
        console.warn('⚠️ Interactive testing skipped:', interactiveError.message);
      }
      
      // Process links and add to queue
      const validLinks = this.filterAndQueueLinks(currentLinks, node.data.url);
      console.log(`📋 Added ${validLinks.length} valid links to queue (total: ${this.linkQueue.length})`);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `� Queue: ${this.linkQueue.length} links`});
      
      // If no valid links found, check queue
      if (validLinks.length === 0) {
        if (this.linkQueue.length > 0) {
          console.log(`📋 Processing queue: ${this.linkQueue.length} links`);
          await this.processNextQueuedLink();
        } else {
          console.log(`🏁 No more links, crawl complete`);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🏁 Crawl complete'});
          this.sendResults();
        }
        return;
      }
      
      // Always process from queue (ensures BFS order)
      if (this.linkQueue.length > 0) {
        console.log(`🔄 Processing queue: ${this.linkQueue.length} links remaining`);
        await this.processNextQueuedLink();
      } else {
        console.log(`🏁 Queue empty, crawl complete`);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🏁 Crawl complete'});
        this.sendResults();
      }
    
    } catch (error) {
      console.error('❌ Crawl error:', error.message);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error: ${error.message}`});
      this.sendResults();
    }
  }
  
  // Extract links directly from current page DOM
  async extractLinksFromCurrentPage() {
    try {
      console.log(`🔍 Extracting links from: ${window.location.href}`);
      const allLinks = [];
      
      // Extract regular DOM links (with Shadow DOM support)
      if (window.ShadowDOMHelper) {
        try {
          const shadowDOMLinks = window.ShadowDOMHelper.getAllLinks();
          console.log(`👻 Found ${shadowDOMLinks.length} links (including Shadow DOM)`);
          allLinks.push(...shadowDOMLinks);
        } catch (shadowError) {
          console.error('Shadow DOM extraction failed:', shadowError.message);
          const regularLinks = document.querySelectorAll('a[href]');
          allLinks.push(...Array.from(regularLinks));
        }
      } else {
        const regularLinks = document.querySelectorAll('a[href]');
        allLinks.push(...Array.from(regularLinks));
      }
      
      const currentUrl = window.location.href;
      const currentUrlObj = new URL(currentUrl);
      
      const links = Array.from(allLinks)
        .map(link => ({
          href: link.href,
          text: link.textContent?.trim() || '',
          title: link.title || ''
        }))
        .filter(link => {
          // Basic HTTP check
          if (!link.href || !link.href.startsWith('http')) {
            return false;
          }
          
          try {
            const linkUrl = new URL(link.href);
            
            // Skip if it's just an anchor link (same page with hash)
            if (linkUrl.pathname === currentUrlObj.pathname && 
                linkUrl.search === currentUrlObj.search && 
                linkUrl.hash !== '') {
              return false;
            }
            
            // Skip if it's the exact same page
            if (linkUrl.pathname === currentUrlObj.pathname && 
                linkUrl.search === currentUrlObj.search) {
              return false;
            }
            
            return true;
          } catch (e) {
            return false;
          }
        });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 extractLinksFromCurrentPage: Filtered to ${links.length} valid links`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 PRE-CHECK: window.DeepLinkExtractor=${typeof window.DeepLinkExtractor}, useDeepLinkExtraction=${this.useDeepLinkExtraction}, deepLinkExtractionCompleted=${this.deepLinkExtractionCompleted}`});
      
      // 2. ENHANCED: Use Deep Link Extractor for hidden/dynamic links (ONLY ONCE on first page)
      if (window.DeepLinkExtractor && this.useDeepLinkExtraction && !this.deepLinkExtractionCompleted) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 Using Deep Link Extractor for comprehensive discovery (FIRST TIME ONLY)...`});
        
        // Mark as completed to prevent running again
        this.deepLinkExtractionCompleted = true;
        
        // WAIT for deep link extraction to complete (critical for page discovery)
        try {
          const extractor = new window.DeepLinkExtractor();
          const deepLinks = await extractor.extractAllLinks();
          
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🎯 Deep Link Extractor found ${deepLinks.length} total links`});
          
          // Add these to the queue directly
          let addedCount = 0;
          deepLinks.forEach(deepLink => {
            try {
              const url = new URL(deepLink.href);
              // Only add if same origin and not already queued
              if (url.origin === currentUrlObj.origin) {
                const normalized = this.normalizeUrl(deepLink.href);
                // Check if already visited (not just queued)
                let alreadyVisited = false;
                for (const visitedUrl of this.normalizedUrls) {
                  if (this.isSamePage(normalized, visitedUrl)) {
                    alreadyVisited = true;
                    break;
                  }
                }
                
                if (!alreadyVisited) {
                  const linkHash = this.hasher.generateHashFromUrl(deepLink.href);
                  this.linkQueue.push({
                    url: deepLink.href,
                    text: deepLink.text || deepLink.href,
                    fromHash: this.graph.getCurrentNodeHash?.(),
                    depth: this.currentDepth + 1,
                    hash: linkHash,
                    source: deepLink.source || 'deep-extraction'
                  });
                  addedCount++;
                  // DON'T add to normalizedUrls here - only add when actually visiting
                }
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });
          
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Deep Link Extractor added ${addedCount}/${deepLinks.length} new links to queue. New queue size: ${this.linkQueue.length}`});
          
          // CRITICAL: Save state immediately after adding links to preserve queue
          await this.saveState();
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `💾 State saved after Deep Link Extractor - Queue: ${this.linkQueue.length}, DeepLinkDone: ${this.deepLinkExtractionCompleted}`});
        } catch (error) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⚠️ Deep Link Extractor failed: ${error.message}`});
        }
      } else if (this.deepLinkExtractionCompleted) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⏭️ Skipping Deep Link Extractor (already ran on first page)`});
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 extractLinksFromCurrentPage: Found ${links.length} valid HTTP links on page (after filtering)`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 extractLinksFromCurrentPage: Returning ${links.length} links`});
      return links;
    } catch (error) {
      console.error('❌ extractLinksFromCurrentPage: Error extracting links:', error);
      console.error('❌ extractLinksFromCurrentPage: Error stack:', error.stack);
      return [];
    }
  }
  
  // Filter links and add valid ones to queue
  filterAndQueueLinks(links, currentUrl) {
    try {
      console.log(`🔍 Filtering ${links.length} links from ${currentUrl}`);
      const validLinks = [];
      const currentOrigin = new URL(currentUrl).origin;
      const currentUrlObj = new URL(currentUrl);
    
    let externalCount = 0;
    let duplicateCount = 0;
    let anchorCount = 0;
    let samePageCount = 0;
    
    links.forEach(link => {
      try {
        const linkUrl = new URL(link.href);
        
        // Only process same-origin links
        if (linkUrl.origin !== currentOrigin) {
          externalCount++;
          return;
        }
        
        // Filter out anchor links (same page with hash fragments)
        if (linkUrl.pathname === currentUrlObj.pathname && 
            linkUrl.search === currentUrlObj.search && 
            linkUrl.hash !== '') {
          anchorCount++;
          return;
        }
        
        // Filter out same page links (ignoring hash)
        if (linkUrl.pathname === currentUrlObj.pathname && 
            linkUrl.search === currentUrlObj.search) {
          samePageCount++;
          return;
        }
        
        // Check for duplicates using normalized URLs
        const normalizedUrl = this.normalizeUrl(link.href);
        if (this.normalizedUrls.has(normalizedUrl)) {
          duplicateCount++;
          console.log(`🚫 Skipping duplicate link (normalized URL already visited): ${link.href} -> ${normalizedUrl}`);
          return;
        }
        
        // CRITICAL FIX: Also check if any node in the graph already has this normalized URL
        // This prevents revisiting pages with different tracking params
        const existingNodes = this.graph.nodes || new Map();
        for (const [hash, node] of existingNodes) {
          if (node && node.data && node.data.url) {
            const existingNormalizedUrl = this.normalizeUrl(node.data.url);
            if (existingNormalizedUrl === normalizedUrl) {
              duplicateCount++;
              console.log(`🚫 Skipping link - page already in graph: ${link.href} -> ${normalizedUrl} (matches node ${hash})`);
              return;
            }
          }
        }
        
        // Additional check: make sure this is actually a different page
        const linkPath = linkUrl.pathname;
        const currentPath = currentUrlObj.pathname;
        
        // Skip if it's just a different hash on the same page
        if (linkPath === currentPath && linkUrl.search === currentUrlObj.search) {
          samePageCount++;
          console.log(`🚫 Skipping same page variation: ${link.href}`);
          return;
        }
        
        // Add to queue
        const linkHash = this.hasher.generateHashFromUrl(link.href);
        this.linkQueue.push({
          url: link.href,
          text: link.text,
          fromHash: this.graph.getCurrentNodeHash?.(),
          depth: this.currentDepth + 1,
          hash: linkHash
        });
        
        // Don't add to normalizedUrls yet - only add when actually visiting in processNextQueuedLink
        // this.normalizedUrls.add(normalizedUrl);
        validLinks.push(link);
        
      } catch (error) {
        // Invalid link, skip
      }
    });
    
    console.log(`� Filter results: ${validLinks.length} valid, ${duplicateCount} duplicates, ${externalCount} external`);
    console.log(`� Queue size: ${this.linkQueue.length}`);
    
    return validLinks;
    } catch (error) {
      console.error(`❌ Filter error:`, error.message);
      return [];
    }
  }
  
  // Process the next queued link
  async processNextQueuedLink() {
    if (this.linkQueue.length === 0) {
      console.log('🏁 Queue empty, crawl complete');
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🏁 Crawl complete'});
      this.sendResults();
      return;
    }
    
    const nextLink = this.linkQueue.shift();
    
    // Check if we've reached max depth
    if (nextLink.depth >= this.maxDepth) {
      console.log(`🏁 Max depth reached (${nextLink.depth}/${this.maxDepth})`);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🏁 Max depth reached'});
      this.sendResults();
      return;
    }
    
    console.log(`🔄 Processing: ${nextLink.url} (depth ${nextLink.depth}, queue: ${this.linkQueue.length})`);
    
    // Check for duplicates BEFORE navigation
    const normalizedUrl = this.normalizeUrl(nextLink.url);
    
    for (const visitedUrl of this.normalizedUrls) {
      if (this.isSamePage(normalizedUrl, visitedUrl)) {
        console.log(`🚫 Duplicate detected, skipping: ${nextLink.url}`);
        await this.processNextQueuedLink();
        return;
      }
    }
    
    // Mark as visited
    this.visited.add(nextLink.hash);
    this.normalizedUrls.add(normalizedUrl);
    
    // Navigate to the link
    chrome.runtime.sendMessage({
      type: 'NAVIGATE_AND_CRAWL',
      url: nextLink.url,
      fromHash: nextLink.fromHash,
      linkText: nextLink.text,
      depth: nextLink.depth
    });
  }
  
  reportProgress() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `reportProgress: crawled=${this.crawledCount}, visited=${this.visited.size}, depth=${this.currentDepth}`});
    chrome.runtime.sendMessage({
      type: 'CRAWL_PROGRESS',
      data: {
        crawled: this.crawledCount,
        visited: this.visited.size,
        depth: this.currentDepth
      }
    });
  }
  
  /**
   * Test interactive elements on the current page
   */
  async testInteractiveElements() {
    try {
      // Check if modules are available
      if (!window.InteractiveElementDiscoverer || !window.ActionSimulator || !window.StateVerifier) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: '⚠️ Interactive testing modules not available, skipping...'
        });
        return;
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🧪 Testing interactive elements on page...'});
      
      // Initialize modules
      const discoverer = new window.InteractiveElementDiscoverer();
      const simulator = new window.ActionSimulator();
      const verifier = new window.StateVerifier();
      
      // Discover all interactive elements
      const elements = discoverer.discoverAll();
      
      // Count total elements
      const totalCount = Object.values(elements).reduce((sum, arr) => {
        if (Array.isArray(arr)) return sum + arr.length;
        if (arr.modals && arr.triggers) return sum + arr.modals.length + arr.triggers.length;
        return sum;
      }, 0);
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `🔍 Found ${totalCount} interactive elements to test`
      });
      
      // Test a sample of each type (limit to avoid too much time)
      const testResults = {
        draggable: [],
        resizable: [],
        selectable: [],
        hoverable: [],
        contextmenu: [],
        doubleclick: []
      };
      
      // Test draggable elements (limit to 3)
      if (elements.draggable && elements.draggable.length > 0) {
        const toTest = elements.draggable.slice(0, 3);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.draggable.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Draggable test failed: ${error.message}`
            });
          }
        }
      }
      
      // Test resizable elements (limit to 3)
      if (elements.resizable && elements.resizable.length > 0) {
        const toTest = elements.resizable.slice(0, 3);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.resizable.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Resizable test failed: ${error.message}`
            });
          }
        }
      }
      
      // Test selectable elements (limit to 5)
      if (elements.selectable && elements.selectable.length > 0) {
        const toTest = elements.selectable.slice(0, 5);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.selectable.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Selectable test failed: ${error.message}`
            });
          }
        }
      }
      
      // Test hoverable elements (limit to 5)
      if (elements.hoverable && elements.hoverable.length > 0) {
        const toTest = elements.hoverable.slice(0, 5);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.hoverable.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Hoverable test failed: ${error.message}`
            });
          }
        }
      }
      
      // Test context menu triggers (limit to 3)
      if (elements.contextMenuTriggers && elements.contextMenuTriggers.length > 0) {
        const toTest = elements.contextMenuTriggers.slice(0, 3);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.contextmenu.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Context menu test failed: ${error.message}`
            });
          }
        }
      }
      
      // Test double-clickable elements (limit to 3)
      if (elements.doubleClickable && elements.doubleClickable.length > 0) {
        const toTest = elements.doubleClickable.slice(0, 3);
        for (const elInfo of toTest) {
          try {
            const result = await discoverer.testInteractiveElement(elInfo, simulator);
            testResults.doubleclick.push(result);
          } catch (error) {
            chrome.runtime.sendMessage({
              type: 'DEBUG_LOG', 
              message: `❌ Double-click test failed: ${error.message}`
            });
          }
        }
      }
      
      // Count successful tests
      const testsRun = Object.values(testResults).reduce((sum, arr) => sum + arr.length, 0);
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `✅ Completed ${testsRun} interactive element tests`
      });
      
      // Store results in current node
      const currentHash = this.graph.getCurrentNodeHash?.();
      if (currentHash) {
        const node = this.graph.getNode(currentHash);
        if (node && node.data) {
          node.data.interactiveElements = elements;
          node.data.interactionTests = testResults;
          node.data.interactiveElementCount = totalCount;
          node.data.testsRun = testsRun;
        }
      }
      
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `❌ Interactive element testing failed: ${error.message}`
      });
    }
  }
  
  sendResults() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'sendResults: Starting to send results...'});
    let results = this.graph.export();
    
    // Add Week 8 Analytics Data
    if (this.analyticsConfig && (this.analyticsConfig.enableJourneys || this.analyticsConfig.enableHeatmap || this.analyticsConfig.enableFunnel)) {
      results.analytics = {};
      
      if (this.journeyMapper?.enabled) {
        results.analytics.journeys = this.journeyMapper.getJourneys();
      }
      if (this.heatmapCollector?.enabled) {
        results.analytics.heatmap = this.heatmapCollector.getHeatmapData();
      }
      if (this.funnelAnalyzer?.enabled) {
        results.analytics.funnel = this.funnelAnalyzer.getFunnelData();
      }
    }
    
    // Generate report if enabled
    if (this.reportGenerator?.enabled) {
      try {
        const reportData = this.reportGenerator.generateReport(results);
        if (reportData) {
          results.analytics = results.analytics || {};
          results.analytics.report = reportData;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'sendResults: Report generated successfully'});
        }
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `sendResults: Report generation failed: ${error.message}`});
      }
    }
    
    // Apply security sanitization if enabled
    if (this.securityManager) {
      try {
        results = this.securityManager.sanitizeOutput(results);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'sendResults: Results sanitized by security manager'});
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `sendResults: Security sanitization failed: ${error.message}`});
      }
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `sendResults: Results prepared - nodes: ${results.stats.totalNodes}, edges: ${results.stats.totalEdges}`});
    chrome.runtime.sendMessage({
      type: 'CRAWL_COMPLETE',
      data: results
    });
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'sendResults: Results sent successfully'});
  }
  
  // NEW: Pause crawler (called by security challenge handler)
  pauseCrawl() {
    console.log('⏸️ Crawler paused by security challenge');
    this.isRunning = false;
  }
  
  // NEW: Resume crawler (called after security challenge completion)
  resumeCrawl() {
    console.log('▶️ Crawler resumed after security challenge');
    this.isRunning = true;
  }
  
  // Save crawler state to storage
  async saveState() {
    try {
      const state = {
        graph: this.graph.export(),
        visited: Array.from(this.visited),
        currentDepth: this.currentDepth,
        crawledCount: this.crawledCount,
        currentRole: this.currentRole,
        maxDepth: this.maxDepth,
        linkQueue: this.linkQueue, // Save the link queue
        normalizedUrls: Array.from(this.normalizedUrls), // Save normalized URLs
        deepLinkExtractionCompleted: this.deepLinkExtractionCompleted // CRITICAL: Save flag to prevent re-running
      };
      
      await chrome.storage.local.set({ crawlerState: state });
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ State saved - URLs: ${this.normalizedUrls.size}, Queue: ${this.linkQueue.length}, DeepLinkDone: ${this.deepLinkExtractionCompleted}`});
      return true;
    } catch (error) {
      console.error('❌ Failed to save crawler state:', error);
      return false;
    }
  }
  
  // Restore crawler state from storage
  async restoreState() {
    try {
      const result = await chrome.storage.local.get(['crawlerState']);
      const state = result.crawlerState;
      
      if (!state) {
        console.log('⚠️ No saved crawler state found');
        return false;
      }
      
      // Restore graph
      this.graph.import(state.graph);
      
      // Restore visited set
      this.visited = new Set(state.visited || []);
      
      // Restore other properties
      this.currentDepth = state.currentDepth || 0;
      this.crawledCount = state.crawledCount || 0;
      this.currentRole = state.currentRole || 'guest';
      this.maxDepth = state.maxDepth || 10;
      
      // Restore link queue and normalized URLs
      this.linkQueue = state.linkQueue || []; // Restore the link queue
      this.normalizedUrls = new Set(state.normalizedUrls || []); // Restore normalized URLs
      this.deepLinkExtractionCompleted = state.deepLinkExtractionCompleted || false; // CRITICAL: Restore flag
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ State restored - Nodes: ${state.graph.nodes?.length || 0}, Edges: ${state.graph.edges?.length || 0}, Queue: ${this.linkQueue.length}, DeepLinkDone: ${this.deepLinkExtractionCompleted}`});
      
      return true;
    } catch (error) {
      console.error('❌ Failed to restore crawler state:', error);
      return false;
    }
  }

  stop() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawler stop() called'});
    this.isRunning = false;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Crawler stopped'});
  }
  
  // Incremental export - save progress periodically
  performIncrementalExport() {
    try {
      const exportData = this.graph.export();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `crawler_backup_${timestamp}.json`;
      
      // Save to chrome.storage.local as backup
      chrome.storage.local.set({
        [`backup_${Date.now()}`]: {
          data: exportData,
          timestamp: Date.now(),
          nodeCount: this.graph.nodes.size
        }
      }).then(() => {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', 
          message: `✅ Incremental backup saved: ${this.graph.nodes.size} nodes`
        });
      });
      
      // Keep only last 3 backups to save space
      chrome.storage.local.get(null, (items) => {
        const backupKeys = Object.keys(items).filter(k => k.startsWith('backup_')).sort();
        if (backupKeys.length > 3) {
          const toRemove = backupKeys.slice(0, backupKeys.length - 3);
          chrome.storage.local.remove(toRemove);
        }
      });
      
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `⚠️ Incremental export failed: ${error.message}`
      });
    }
  }
  
  // Check memory usage and warn if approaching limit
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    try {
      const usedMemoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = window.CONSTANTS?.MEMORY?.LIMIT_MB || 1024;
      const warningThreshold = window.CONSTANTS?.MEMORY?.WARNING_THRESHOLD || 0.8;
      
      const usagePercent = usedMemoryMB / limitMB;
      
      if (usagePercent >= warningThreshold && usagePercent < 0.95) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG',
          message: `⚠️ Memory warning: ${usedMemoryMB.toFixed(0)}MB / ${limitMB}MB (${(usagePercent * 100).toFixed(0)}%)`
        });
        chrome.runtime.sendMessage({
          type: 'MEMORY_WARNING',
          usage: usedMemoryMB,
          limit: limitMB,
          percent: usagePercent * 100
        });
      } else if (usagePercent >= 0.95) {
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG',
          message: `🚨 Memory critical: ${usedMemoryMB.toFixed(0)}MB / ${limitMB}MB - stopping crawler`
        });
        chrome.runtime.sendMessage({
          type: 'MEMORY_CRITICAL',
          usage: usedMemoryMB,
          limit: limitMB
        });
        this.stop(); // Auto-stop to prevent crash
      }
    } catch (error) {
      // Ignore memory check errors
    }
  }
  
  // NEW: Pause crawler (called by security challenge handler)
  pauseCrawl() {
    console.log('⏸️ Crawler paused by security challenge');
    this.isRunning = false;
  }
  
  // NEW: Resume crawler (called after security challenge completion)
  resumeCrawl() {
    console.log('▶️ Crawler resumed after security challenge');
    this.isRunning = true;
  }
}

// Make AutoTestAICrawler available globally
window.AutoTestAICrawler = AutoTestAICrawler;

// Initialize crawler instance
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Creating global crawler instance...'});
window.autoTestAICrawler = new AutoTestAICrawler();
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Crawler instance created: ${typeof window.autoTestAICrawler}`});

// Add message listener for crawler control
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Health check handler
  if (message.type === 'CRAWLER_READY_CHECK') {
    const ready = window.autoTestAICrawler !== undefined &&
                  window.DOMHasher !== undefined &&
                  window.StateGraph !== undefined;
    sendResponse({ ready: ready });
    return false; // Sync response
  }
  
  // Smart synthetic creation handler
  if (message.type === 'CREATE_SMART_SYNTHETIC') {
    (async () => {
      try {
        if (!window.autoTestAICrawler.smartSynthetic) {
          window.autoTestAICrawler.smartSynthetic = new SmartSyntheticGenerator();
        }
        
        const syntheticData = await window.autoTestAICrawler.smartSynthetic.generateSmartSyntheticData(message.url);
        const syntheticHash = window.autoTestAICrawler.hasher.generateHashFromUrl(message.url);
        
        // Add synthetic page to graph
        window.autoTestAICrawler.graph.addNode(syntheticHash, {
          ...syntheticData,
          role: window.autoTestAICrawler.currentRole,
          depth: message.depth || window.autoTestAICrawler.currentDepth + 1
        });
        
        // Add edge from previous page
        if (message.fromHash) {
          window.autoTestAICrawler.graph.addEdge(message.fromHash, syntheticHash, `click:${message.linkText || 'link'}`);
        }
        
        // Save state
        await window.autoTestAICrawler.saveState();
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Smart synthetic data created for: ${message.url}`});
        sendResponse({ success: true });
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Smart synthetic failed: ${error.message}`});
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Async response
  }
  
  if (message.type === 'CONTINUE_CRAWL') {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '📥 CONTINUE_CRAWL message received'});
    
    (async () => {
      try {
        // Restore state from storage
        await window.autoTestAICrawler.restoreState();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ State restored after navigation'});
        
        // Capture current page state
        const newHash = window.autoTestAICrawler.captureCurrentState();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ New page captured with hash: ${newHash}`});
        
        // CRITICAL FIX: Track normalized URL to prevent revisiting with different params
        const normalizedCurrentUrl = window.autoTestAICrawler.normalizeUrl(window.location.href);
        window.autoTestAICrawler.normalizedUrls.add(normalizedCurrentUrl);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Normalized URL tracked: ${normalizedCurrentUrl}`});
        
        // Add edge from previous hash
        window.autoTestAICrawler.graph.addEdge(message.fromHash, newHash, `click:${message.linkText || 'link'}`);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Edge added: ${message.fromHash} -> ${newHash}`});
        
        // Update progress
        window.autoTestAICrawler.crawledCount++;
        window.autoTestAICrawler.reportProgress();
        
        // Save state
        await window.autoTestAICrawler.saveState();
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ State saved'});
        
        // Resume BFS from the new state
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔄 Resuming BFS from hash ${newHash} at depth ${message.depth}`});
        await window.autoTestAICrawler.breadthFirstCrawl(newHash, message.depth);
        
        sendResponse({success: true});
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error in CONTINUE_CRAWL: ${error.message}`});
        console.error('❌ Error in CONTINUE_CRAWL:', error);
        sendResponse({success: false, error: error.message});
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

// Initialize crawler instance
window.autoTestAICrawler = new window.AutoTestAICrawler();

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== CORE CRAWLER SCRIPT LOADED ==='});
}

// Make AutoTestAICrawler available globally
window.AutoTestAICrawler = AutoTestAICrawler;

