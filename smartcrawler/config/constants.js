// SmartCrawler Constants
// Centralizes all magic numbers and configuration values

const CONSTANTS = {
  // Timeout values (milliseconds)
  TIMEOUTS: {
    SCRIPT_INJECTION_WAIT: 2000,       // Wait after script injection
    PAGE_LOAD_MAX: 30000,              // Maximum page load time
    IFRAME_LOAD: 15000,                // Iframe load timeout
    SMART_SYNTHETIC: 5000,             // HTTP request timeout for smart synthetic
    HEALTH_CHECK_INTERVAL: 200,        // Interval between health checks
    NAVIGATION_TIMEOUT: 30000,         // Navigation timeout
    ADAPTIVE_BASE: 2000,               // Base adaptive wait time
    FORM_FILL_DELAY: 200,              // Delay between form field fills
    AUTH_SUCCESS_WAIT: 5000,           // Wait for auth success detection
    REACT_HYDRATION_WAIT: 5000,        // Wait for React hydration
    WAIT_FOR_FORMS: 5000               // Wait for dynamic forms to load
  },

  // Memory management
  MEMORY: {
    LIMIT_MB: 1024,                    // Memory limit (1GB, was 400MB)
    EXPORT_EVERY_NODES: 100,           // Incremental export frequency
    WARNING_THRESHOLD: 0.8,            // Memory warning threshold (80%)
    MAX_LOGS: 1000,                    // Maximum logs to store
    CACHE_CLEANUP_INTERVAL: 300000     // Cache cleanup every 5 minutes
  },

  // Crawl configuration
  CRAWL: {
    MAX_DEPTH: 10,                     // Default maximum crawl depth
    MAX_LINKS_PER_PAGE: 50,            // Maximum links to process per page
    MAX_CONCURRENT_IFRAMES: 3,         // Maximum concurrent iframes
    ADAPTIVE_WAIT_REACT: 8000,         // Wait time for React SPAs
    ADAPTIVE_WAIT_VUE: 6000,           // Wait time for Vue SPAs
    ADAPTIVE_WAIT_ANGULAR: 7000,       // Wait time for Angular SPAs
    ADAPTIVE_WAIT_DEFAULT: 2000,       // Default wait time
    QUEUE_BATCH_SIZE: 10,              // Process links in batches
    MAX_RETRIES: 3,                    // Maximum retry attempts
    RETRY_DELAY: 1000                  // Delay between retries
  },

  // Cache settings
  CACHE: {
    SMART_SYNTHETIC_TTL: 300000,       // Smart synthetic cache TTL (5 minutes)
    STATE_BACKUP_INTERVAL: 100,        // Backup state every N nodes
    URL_NORMALIZATION_CACHE: 1000,     // Cache size for URL normalization
    SIMILARITY_CACHE: 500              // Cache size for similarity calculations
  },

  // Network & HTTP
  NETWORK: {
    MAX_PARTIAL_HTML_BYTES: 51200,     // 50KB partial HTML fetch
    FETCH_TIMEOUT: 5000,               // General fetch timeout
    HEAD_REQUEST_TIMEOUT: 3000,        // HEAD request timeout
    MAX_REDIRECTS: 5,                  // Maximum redirect follow
    CONCURRENT_REQUESTS: 3             // Maximum concurrent HTTP requests
  },

  // Script injection
  INJECTION: {
    PHASE_DELAY: 500,                  // Delay between injection phases
    MAX_HEALTH_CHECKS: 10,             // Maximum crawler ready checks
    HEALTH_CHECK_INTERVAL: 200,        // Health check interval
    BUNDLE_TIMEOUT: 10000              // Bundle loading timeout
  },

  // URL Normalization
  URL_NORMALIZATION: {
    // Tracking parameters to remove (blacklist)
    TRACKING_PARAMS: [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', '_ga', '_gac', '_gl',
      'mc_cid', 'mc_eid',
      'ref', 'referrer', 'source',
      'campaign', 'ad', 'adgroup',
      'click_id', 'tracking', 'track'
    ],
    
    // Meaningful parameters to keep (whitelist)
    MEANINGFUL_PARAMS: [
      'page', 'p',
      'id', 'item_id', 'product_id',
      'category', 'cat',
      'sort', 'order', 'orderby',
      'filter', 'f',
      'q', 'query', 'search', 's',
      'v', 'video', 'view',
      'tab', 't',
      'lang', 'locale'
    ],
    
    // Domain-specific rules
    DOMAIN_RULES: {
      'youtube.com': ['v', 't', 'list'],
      'youtu.be': ['v', 't'],
      'twitter.com': ['status', 'lang'],
      'x.com': ['status', 'lang'],
      'github.com': ['tab', 'page', 'q'],
      'linkedin.com': ['trk'],
      'facebook.com': ['id', 'set'],
      'instagram.com': ['utm_source'] // Keep for Instagram
    }
  },

  // Deduplication
  DEDUPLICATION: {
    SIMILARITY_THRESHOLD: 0.85,        // Content similarity threshold (85%)
    FINGERPRINT_SIZE: 1024,            // Content fingerprint size (bytes)
    MAX_NORMALIZED_URLS: 10000,        // Cache size for normalized URLs
    MAX_CONTENT_FINGERPRINTS: 5000     // Cache size for content fingerprints
  },

  // Logging
  LOGGING: {
    BUFFER_SIZE: 10,                   // Log buffer size before flush
    MAX_STORED_LOGS: 1000,             // Maximum logs to store in memory
    EXPORT_FILENAME: 'smartcrawler-logs.json'
  },

  // Authentication
  AUTH: {
    MAX_LOGIN_ATTEMPTS: 3,             // Maximum login attempts
    LOGIN_SUCCESS_WAIT: 3000,          // Wait after successful login
    AUTH_TIMEOUT: 10000,               // Authentication timeout
    TOKEN_MIN_LENGTH: 20,              // Minimum token length
    COMMON_LOGIN_PATHS: [
      '/login', '/signin', '/sign-in', '/log-in',
      '/auth/login', '/user/login', '/account/login',
      '/admin', '/admin/login', '/admin-panel',
      '/administrator', '/wp-admin', '/backend',
      '/portal', '/portal/login', '/customer/login'
    ],
    SUCCESS_INDICATORS: [
      'dashboard', 'profile', 'logout', 'welcome',
      'user-menu', 'account', 'settings', 'secure',
      'authenticated', 'logged-in', 'user-info', 'admin-panel'
    ]
  },

  // Form handling
  FORMS: {
    MAX_FORM_FIELDS: 50,               // Maximum form fields to process
    FIELD_FILL_DELAY: 100,             // Delay between field fills
    VALIDATION_WAIT: 300,              // Wait for validation
    SUBMIT_DELAY: 500,                 // Delay before submit
    DYNAMIC_FORM_WAIT: 5000            // Wait for dynamic forms
  },

  // Performance
  PERFORMANCE: {
    NETWORK_IDLE_TIMEOUT: 2000,        // Network idle detection
    MUTATION_IDLE_TIMEOUT: 1000,       // DOM mutation idle detection
    LOAD_EVENT_BUFFER: 500,            // Buffer after load event
    SAMPLE_INTERVAL: 1000,             // Performance sampling interval
    METRICS_RETENTION: 100             // Keep last N metrics
  },

  // Iframe crawler
  IFRAME: {
    WIDTH: 1,                          // Iframe width (hidden)
    HEIGHT: 1,                         // Iframe height (hidden)
    POSITION_TOP: -9999,               // Iframe position (hidden)
    POSITION_LEFT: -9999,              // Iframe position (hidden)
    TIMEOUT: 15000,                    // Iframe load timeout
    MAX_CONCURRENT: 3,                 // Maximum concurrent iframes
    STABILIZATION_DELAY: 1000,         // Wait after iframe load
    SCRIPT_EXECUTION_DELAY: 100        // Wait after script injection
  },

  // Offscreen document
  OFFSCREEN: {
    REASONS: ['DOM_SCRAPING'],
    JUSTIFICATION: 'Persistent crawling context for web page analysis'
  },

  // File exports
  EXPORT: {
    GRAPH_FILENAME: 'state-graph.json',
    LOGS_FILENAME: 'crawler-logs.json',
    REPORT_FILENAME: 'crawl-report.html',
    CHUNK_SIZE: 1000                   // Export in chunks of N nodes
  },

  // Version
  VERSION: '1.0.0',
  BUILD_DATE: new Date().toISOString()
};

// Freeze constants to prevent modification
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.TIMEOUTS);
Object.freeze(CONSTANTS.MEMORY);
Object.freeze(CONSTANTS.CRAWL);
Object.freeze(CONSTANTS.CACHE);
Object.freeze(CONSTANTS.NETWORK);
Object.freeze(CONSTANTS.INJECTION);
Object.freeze(CONSTANTS.URL_NORMALIZATION);
Object.freeze(CONSTANTS.DEDUPLICATION);
Object.freeze(CONSTANTS.LOGGING);
Object.freeze(CONSTANTS.AUTH);
Object.freeze(CONSTANTS.FORMS);
Object.freeze(CONSTANTS.PERFORMANCE);
Object.freeze(CONSTANTS.IFRAME);
Object.freeze(CONSTANTS.OFFSCREEN);
Object.freeze(CONSTANTS.EXPORT);

// Export to window
window.CONSTANTS = CONSTANTS;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}

console.log(`✅ SmartCrawler Constants loaded (v${CONSTANTS.VERSION})`);

