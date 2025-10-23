// Load credential manager
const credentialManager = new CredentialManager();

// UI Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
const statusText = document.getElementById('statusText');
const resultsDiv = document.getElementById('results');
const nodeCountSpan = document.getElementById('nodeCount');
const edgeCountSpan = document.getElementById('edgeCount');
const roleResultsDiv = document.getElementById('roleResults');
const roleStatsDiv = document.getElementById('roleStats');

// Authentication UI Elements
const enableAuthCheckbox = document.getElementById('enableAuth');
const authConfigDiv = document.getElementById('authConfig');
const userUsernameInput = document.getElementById('userUsername');
const userPasswordInput = document.getElementById('userPassword');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const saveUserCredsBtn = document.getElementById('saveUserCreds');
const saveAdminCredsBtn = document.getElementById('saveAdminCreds');
const crawlGuestCheckbox = document.getElementById('crawlGuest');
const crawlUserCheckbox = document.getElementById('crawlUser');
const crawlAdminCheckbox = document.getElementById('crawlAdmin');

let checkInterval = null;

// Get enabled modules configuration
function getEnabledModules() {
  return {
    spa: document.getElementById('enableSPA')?.checked || false,
    modal: document.getElementById('enableModal')?.checked || false,
    performance: document.getElementById('enablePerformance')?.checked || false,
    accessibility: document.getElementById('enableAccessibility')?.checked || false,
    network: document.getElementById('enableNetwork')?.checked || false,
    storage: document.getElementById('enableStorage')?.checked || false,
    websocket: document.getElementById('enableWebSocket')?.checked || false,
    cookie: document.getElementById('enableCookie')?.checked || false
  };
}

// Get optimization configuration
function getOptimizationConfig() {
  return {
    enableSampling: document.getElementById('enableSampling')?.checked || false,
    enableStability: document.getElementById('enableStability')?.checked || false,
    enableRetry: document.getElementById('enableRetry')?.checked || false,
    enableOptimization: document.getElementById('enableOptimization')?.checked || false
  };
}

// Get security configuration
function getSecurityConfig() {
  return {
    enableSanitization: document.getElementById('enableSanitization')?.checked || false,
    enableValidation: document.getElementById('enableValidation')?.checked || false,
    enableXSSProtection: document.getElementById('enableXSSProtection')?.checked || false,
    enableSecureStorage: document.getElementById('enableSecureStorage')?.checked || false
  };
}

// Get analytics configuration
function getAnalyticsConfig() {
  return {
    enableJourneys: document.getElementById('enableJourneys')?.checked || false,
    enableHeatmap: document.getElementById('enableHeatmap')?.checked || false,
    enableFunnel: document.getElementById('enableFunnel')?.checked || false,
    enableReporting: document.getElementById('enableReporting')?.checked || false
  };
}

// Get crawl configuration
function getCrawlConfig() {
  return {
    maxDepth: parseInt(document.getElementById('maxDepth')?.value) || 10,
    maxLinksPerPage: parseInt(document.getElementById('maxLinksPerPage')?.value) || 50,
    strategy: document.getElementById('crawlStrategy')?.value || 'auto'
  };
}

// Save crawl configuration to storage
async function saveCrawlConfig() {
  const config = getCrawlConfig();
  await chrome.storage.local.set({ crawlConfig: config });
  console.log('Crawl configuration saved:', config);
}

// Load crawl configuration from storage
async function loadCrawlConfig() {
  const result = await chrome.storage.local.get(['crawlConfig']);
  if (result.crawlConfig) {
    document.getElementById('maxDepth').value = result.crawlConfig.maxDepth || 10;
    document.getElementById('maxLinksPerPage').value = result.crawlConfig.maxLinksPerPage || 50;
    document.getElementById('crawlStrategy').value = result.crawlConfig.strategy || 'auto';
  }
}

// Save role selections to storage
async function saveRoleSelections() {
  const selections = {
    guest: crawlGuestCheckbox.checked,
    user: crawlUserCheckbox.checked,
    admin: crawlAdminCheckbox.checked
  };
  await chrome.storage.local.set({ roleSelections: selections });
  console.log('Role selections saved:', selections);
}

// Load role selections from storage
async function loadRoleSelections() {
  const result = await chrome.storage.local.get(['roleSelections']);
  if (result.roleSelections) {
    crawlGuestCheckbox.checked = result.roleSelections.guest !== false; // Default to checked
    crawlUserCheckbox.checked = result.roleSelections.user || false;
    crawlAdminCheckbox.checked = result.roleSelections.admin || false;
    console.log('Role selections loaded:', result.roleSelections);
  } else {
    // Default: only guest is checked
    crawlGuestCheckbox.checked = true;
    crawlUserCheckbox.checked = false;
    crawlAdminCheckbox.checked = false;
  }
}

// Update crawl statistics display
function updateCrawlStats(stats) {
  const statsSection = document.getElementById('statsSection');
  if (stats && stats.total > 0) {
    statsSection.style.display = 'block';
    
    // Calculate real page success (iframe + offscreen + navigation)
    const realPages = (stats.iframe || 0) + (stats.offscreen || 0) + (stats.navigation || 0);
    const realPagePercent = ((realPages / stats.total) * 100).toFixed(1);
    
    document.getElementById('realPagePercent').textContent = `${realPagePercent}%`;
    document.getElementById('totalPages').textContent = stats.total;
    
    // Strategy breakdown
    document.getElementById('iframePercent').textContent = 
      `${((stats.iframe || 0) / stats.total * 100).toFixed(1)}% (${stats.iframe || 0})`;
    document.getElementById('offscreenPercent').textContent = 
      `${((stats.offscreen || 0) / stats.total * 100).toFixed(1)}% (${stats.offscreen || 0})`;
    document.getElementById('navPercent').textContent = 
      `${((stats.navigation || 0) / stats.total * 100).toFixed(1)}% (${stats.navigation || 0})`;
    document.getElementById('syntheticPercent').textContent = 
      `${((stats.synthetic || 0) / stats.total * 100).toFixed(1)}% (${stats.synthetic || 0})`;
  }
}

// Add listener for progress updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CRAWL_PROGRESS') {
    nodeCountSpan.textContent = message.nodes;
    edgeCountSpan.textContent = message.edges;
    statusText.textContent = `Crawling... (${message.nodes} pages)`;
  }
  
  if (message.type === 'MEMORY_WARNING') {
    const percent = Math.round(message.percent);
    statusText.textContent = `⚠️ Memory: ${percent}% (${Math.round(message.usage)}MB / ${message.limit}MB)`;
    statusText.style.color = '#ff9800'; // Orange warning
  }
  
  if (message.type === 'MEMORY_CRITICAL') {
    statusText.textContent = `🚨 Memory critical! Crawler stopped automatically`;
    statusText.style.color = '#f44336'; // Red error
    startBtn.disabled = false;
    stopBtn.disabled = true;
    alert(`Memory limit reached: ${Math.round(message.usage)}MB / ${message.limit}MB\nCrawl stopped to prevent crash. Export your data now.`);
  }
  
  if (message.type === 'CRAWL_COMPLETE') {
    statusText.textContent = 'Crawl complete!';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = false;
    nodeCountSpan.textContent = message.data.stats.totalNodes;
    edgeCountSpan.textContent = message.data.stats.totalEdges;
    
    // Clear any polling interval
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }
});

// REMOVED DUPLICATE START/STOP EVENT LISTENERS - Actual listeners are at line 274 (start) and 333 (stop)

exportBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({type: 'GET_RESULTS'}, (data) => {
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: 'crawler_output.json'
      });
    }
  });
});

// Authentication UI Event Listeners
enableAuthCheckbox.addEventListener('change', (e) => {
  authConfigDiv.style.display = e.target.checked ? 'block' : 'none';
});

saveUserCredsBtn.addEventListener('click', async () => {
  const username = userUsernameInput.value.trim();
  const password = userPasswordInput.value.trim();
  
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }
  
  const success = await credentialManager.saveCredentials('user', {
    username: username,
    password: password
  });
  
  if (success) {
    alert('User credentials saved successfully!\n\nNext steps:\n1. Check the "Crawl as User" checkbox below\n2. Click "Start Crawl"');
    // Auto-check the user checkbox
    crawlUserCheckbox.checked = true;
    await saveRoleSelections();
    console.log('✅ User credentials saved, checkbox auto-enabled');
  } else {
    alert('Failed to save user credentials');
  }
});

saveAdminCredsBtn.addEventListener('click', async () => {
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value.trim();
  
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }
  
  const success = await credentialManager.saveCredentials('admin', {
    username: username,
    password: password
  });
  
  if (success) {
    alert('Admin credentials saved successfully!\n\nNext steps:\n1. Check the "Crawl as Admin" checkbox below\n2. Click "Start Crawl"');
    // Auto-check the admin checkbox
    crawlAdminCheckbox.checked = true;
    await saveRoleSelections();
    console.log('✅ Admin credentials saved, checkbox auto-enabled');
  } else {
    alert('Failed to save admin credentials');
  }
});

// Helper Functions
function getEnabledRoles() {
  const roles = [];
  
  if (crawlGuestCheckbox.checked) roles.push('guest');
  if (crawlUserCheckbox.checked) roles.push('user');
  if (crawlAdminCheckbox.checked) roles.push('admin');
  
  return roles;
}

function getEnabledModules() {
  return {
    spa: document.getElementById('enableSPA').checked,
    modal: document.getElementById('enableModal').checked,
    performance: document.getElementById('enablePerformance').checked,
    accessibility: document.getElementById('enableAccessibility').checked,
    network: document.getElementById('enableNetwork').checked,
    storage: document.getElementById('enableStorage').checked,
    websocket: document.getElementById('enableWebSocket').checked,
    cookie: document.getElementById('enableCookie').checked
  };
}

async function checkMissingCredentials(enabledRoles) {
  const missing = [];
  
  for (const role of enabledRoles) {
    if (role !== 'guest') {
      const hasCredentials = await credentialManager.hasCredentials(role);
      if (!hasCredentials) {
        missing.push(role);
      }
    }
  }
  
  return missing;
}

function displayMultiRoleResults(data) {
  resultsDiv.style.display = 'block';
  nodeCountSpan.textContent = data.statistics.totalNodes;
  edgeCountSpan.textContent = data.statistics.totalEdges;
  
  // Display role breakdown
  if (data.roles && data.roles.length > 0) {
    roleResultsDiv.style.display = 'block';
    roleStatsDiv.innerHTML = '';
    
    data.roles.forEach(role => {
      const roleStat = document.createElement('div');
      roleStat.className = 'role-stat';
      roleStat.textContent = `${role.name}: ${role.nodes} nodes, ${role.edges} edges`;
      roleStatsDiv.appendChild(roleStat);
    });
  }
}

function displayResults(data) {
  resultsDiv.style.display = 'block';
  nodeCountSpan.textContent = data.stats.totalNodes;
  edgeCountSpan.textContent = data.stats.totalEdges;
  statusText.textContent = 'Crawl complete!';
  startBtn.disabled = false;
  stopBtn.disabled = true;
  exportBtn.disabled = false;
}

async function loadSavedCredentials() {
  try {
    // Load user credentials
    const userCreds = await credentialManager.loadCredentials('user');
    if (userCreds) {
      userUsernameInput.value = userCreds.username || '';
      userPasswordInput.value = userCreds.password || '';
    }
    
    // Load admin credentials
    const adminCreds = await credentialManager.loadCredentials('admin');
    if (adminCreds) {
      adminUsernameInput.value = adminCreds.username || '';
      adminPasswordInput.value = adminCreds.password || '';
    }
  } catch (error) {
    console.error('Error loading saved credentials:', error);
  }
}

// Start button event listener
startBtn.addEventListener('click', async () => {
  try {
    const enableAuth = enableAuthCheckbox.checked;
    const enabledRoles = getEnabledRoles();
    
    // Debug logging
    console.log('=== START CRAWL DEBUG ===');
    console.log('Enable Auth:', enableAuth);
    console.log('Enabled Roles:', enabledRoles);
    console.log('Guest checkbox:', crawlGuestCheckbox.checked);
    console.log('User checkbox:', crawlUserCheckbox.checked);
    console.log('Admin checkbox:', crawlAdminCheckbox.checked);
    console.log('=========================');
    
    if (enableAuth && enabledRoles.length === 0) {
      alert('Please select at least one role to crawl.\n\nCurrent selections:\n- Guest: ' + crawlGuestCheckbox.checked + '\n- User: ' + crawlUserCheckbox.checked + '\n- Admin: ' + crawlAdminCheckbox.checked);
      return;
    }
    
    if (enableAuth) {
      // Check for missing credentials
      const missing = await checkMissingCredentials(enabledRoles);
      if (missing.length > 0) {
        alert(`Missing credentials for roles: ${missing.join(', ')}`);
        return;
      }
    }
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Starting crawl...';
    resultsDiv.style.display = 'none';
    
    const modules = getEnabledModules();
    const optimization = getOptimizationConfig();
    const security = getSecurityConfig();
    const analytics = getAnalyticsConfig();
    
    if (enableAuth) {
      // Multi-role crawl
      chrome.runtime.sendMessage({
        type: 'START_MULTI_ROLE_CRAWL',
        enabledRoles: enabledRoles,
        modules: modules,
        optimization: optimization,
        security: security,
        analytics: analytics
      });
    } else {
      // Single crawl
      chrome.runtime.sendMessage({
        type: 'START_CRAWL',
        modules: modules,
        optimization: optimization,
        security: security,
        analytics: analytics
      });
    }
  } catch (error) {
    console.error('Error starting crawl:', error);
    alert('Failed to start crawl: ' + error.message);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusText.textContent = 'Ready to crawl';
  }
});

// Stop button event listener
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({type: 'STOP_CRAWL'});
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = 'Crawl stopped';
});

// Export button event listener
exportBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({type: 'EXPORT_JSON'});
});

// Initialize UI
// Configuration functions
function getEnabledModules() {
  return {
    spa: Boolean(document.getElementById('spaCheckbox')?.checked),
    modal: Boolean(document.getElementById('modalCheckbox')?.checked),
    performance: Boolean(document.getElementById('performanceCheckbox')?.checked),
    accessibility: Boolean(document.getElementById('accessibilityCheckbox')?.checked),
    network: Boolean(document.getElementById('networkCheckbox')?.checked),
    storage: Boolean(document.getElementById('storageCheckbox')?.checked),
    websocket: Boolean(document.getElementById('websocketCheckbox')?.checked),
    cookie: Boolean(document.getElementById('cookieCheckbox')?.checked)
  };
}

function getOptimizationConfig() {
  return {
    enableSampling: Boolean(document.getElementById('samplingCheckbox')?.checked),
    enableStability: Boolean(document.getElementById('stabilityCheckbox')?.checked),
    enableRetry: Boolean(document.getElementById('retryCheckbox')?.checked),
    enableOptimization: Boolean(document.getElementById('optimizationCheckbox')?.checked)
  };
}

function getSecurityConfig() {
  return {
    enableSanitization: Boolean(document.getElementById('sanitizationCheckbox')?.checked),
    enableValidation: Boolean(document.getElementById('validationCheckbox')?.checked),
    enableXSSProtection: Boolean(document.getElementById('xssCheckbox')?.checked),
    enableSecureStorage: Boolean(document.getElementById('secureStorageCheckbox')?.checked)
  };
}

function getAnalyticsConfig() {
  return {
    enableJourneys: Boolean(document.getElementById('journeysCheckbox')?.checked),
    enableHeatmap: Boolean(document.getElementById('heatmapCheckbox')?.checked),
    enableFunnel: Boolean(document.getElementById('funnelCheckbox')?.checked),
    enableReporting: Boolean(document.getElementById('reportingCheckbox')?.checked)
  };
}

// Note: getEnabledRoles() is already defined earlier in the file (line 237)
// Removed duplicate function definition to prevent overwriting

// Quick control functions
function selectAllCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  console.log('All checkboxes selected');
}

function deselectAllCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  console.log('All checkboxes deselected');
}

function selectRecommendedCheckboxes() {
  // Deselect all first
  deselectAllCheckboxes();
  
  // Select recommended modules for comprehensive crawling
  const recommended = [
    'enableSPA',           // SPA Navigation Detection
    'enableModal',        // Modal & Popup Detection  
    'enablePerformance',  // Performance Monitoring
    'enableAccessibility', // Accessibility Analysis
    'enableNetwork',      // Network Monitoring
    'enableStorage',      // Storage Analysis
    'enableSampling',     // Intelligent Sampling
    'enableStability',    // Stability Detection
    'enableRetry',        // Auto Retry
    'enableSanitization', // Data Sanitization
    'enableValidation',   // Input Validation
    'enableJourneys',    // User Journey Mapping
    'enableHeatmap',     // Heatmap Data Collection
    'enableFunnel',      // Conversion Funnel Analysis
    'enableReporting'    // Advanced Reporting
  ];
  
  recommended.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
  
  // Keep authentication disabled by default
  document.getElementById('enableAuth').checked = false;
  
  console.log('Recommended modules selected');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved credentials if any
  loadSavedCredentials();
  
  // Load saved crawl configuration
  await loadCrawlConfig();
  
  // Load saved role selections
  await loadRoleSelections();
  
  // Add role selection change listeners
  crawlGuestCheckbox.addEventListener('change', saveRoleSelections);
  crawlUserCheckbox.addEventListener('change', saveRoleSelections);
  crawlAdminCheckbox.addEventListener('change', saveRoleSelections);
  
  // Add quick control event listeners
  document.getElementById('selectAllBtn').addEventListener('click', selectAllCheckboxes);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAllCheckboxes);
  document.getElementById('selectRecommendedBtn').addEventListener('click', selectRecommendedCheckboxes);
  
  // Add crawl configuration change listeners
  document.getElementById('maxDepth').addEventListener('change', saveCrawlConfig);
  document.getElementById('maxLinksPerPage').addEventListener('change', saveCrawlConfig);
  document.getElementById('crawlStrategy').addEventListener('change', saveCrawlConfig);
  
  console.log('Popup initialized with role selections');
});
