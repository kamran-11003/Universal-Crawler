// Offscreen Document Management
let offscreenCreated = false;

async function createOffscreenDocument() {
  if (offscreenCreated) return true;
  if (!chrome.offscreen) {
    console.warn('⚠️ Offscreen API not available (requires Chrome 109+)');
    return false;
  }
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_SCRAPING'],
      justification: 'Persistent crawling context for web page analysis'
    });
    offscreenCreated = true;
    console.log('✅ Offscreen document created');
    return true;
  } catch (error) {
    if (error.message.includes('Only a single offscreen')) {
      offscreenCreated = true;
      return true;
    }
    console.error('❌ Failed to create offscreen document:', error);
    return false;
  }
}

// Create offscreen document on extension install/startup
chrome.runtime.onInstalled.addListener(() => createOffscreenDocument());
chrome.runtime.onStartup.addListener(() => createOffscreenDocument());

let crawlData = null;
let currentTabId = null; // Store the current tab ID for navigation
let activeNavigations = new Map(); // Track active navigation promises
let scriptInjectionQueue = []; // Queue script injections

console.log('Background script loaded');

// Helper: Inject scripts reliably with bundled files (3-phase loading)
async function injectScriptsReliably(tabId) {
  try {
    console.log('📦 Phase 1: Injecting utils bundle (constants, logger, helpers)...');
    // Phase 1: Utils bundle - Critical utilities (constants and logger first!)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['dist/utils-bundle.js']
    });
    
    console.log('📦 Phase 2: Injecting crawler core bundle (auth, forms, synthetic)...');
    // Phase 2: Crawler core bundle
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['dist/crawler-core-bundle.js']
    });
    
    console.log('📦 Phase 3: Injecting core crawler...');
    // Phase 3: Core crawler (must be separate as it uses classes from bundles)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/core-crawler.js']
    });
    
    console.log('📦 Phase 4: Injecting optional modules bundle...');
    // Phase 4: Advanced modules bundle (can fail gracefully)
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['dist/modules-bundle.js']
      });
    } catch (moduleError) {
      console.warn('⚠️ Optional modules bundle failed to load:', moduleError.message);
    }
    
    console.log('✅ All bundled scripts injected successfully (4 files instead of 30+)');
    return true;
  } catch (error) {
    console.error('❌ Script injection failed:', error);
    throw error;
  }
}

// Helper: Wait for crawler to be ready with health check validation
async function waitForCrawlerReady(tabId, maxAttempts = null) {
  maxAttempts = maxAttempts || 10;
  const interval = 200; // Will use CONSTANTS when available in background context
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CRAWLER_READY_CHECK'
      });
      if (response && response.ready) {
        console.log('✅ Crawler ready after', i + 1, 'attempts');
        return true;
      }
    } catch (error) {
      // Crawler not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Crawler failed to initialize after ${maxAttempts} attempts`);
}

// Helper: Handle navigation failure with smart synthetic fallback
async function handleNavigationFailure(message) {
  console.log('⚠️ Navigation failed, creating smart synthetic data...');
  try {
    // Send message to content script to create smart synthetic
    await chrome.tabs.sendMessage(currentTabId, {
      type: 'CREATE_SMART_SYNTHETIC',
      url: message.url,
                  fromHash: message.fromHash,
                  linkText: message.linkText,
                  depth: message.depth
    });
  } catch (error) {
    console.error('❌ Smart synthetic fallback also failed:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  if (message.type === 'DEBUG_LOG') {
    console.log('CONTENT SCRIPT:', message.message);
    return; // Don't expect response
  }
  
  if (message.type === 'NAVIGATE_AND_CRAWL') {
    console.log('🚀 Navigating to:', message.url);
    
    // Use stored tab ID or query for it
        const tabId = currentTabId;
    if (!tabId) {
      console.error('❌ No active tab ID available');
      handleNavigationFailure(message);
              return;
            }
            
    // Check for duplicate navigation
    const navigationId = `${tabId}-${Date.now()}`;
    if (activeNavigations.has(tabId)) {
      console.log('⚠️ Navigation already in progress for tab', tabId);
              return;
            }
            
    // Create navigation promise
    const navigationPromise = new Promise(async (resolve, reject) => {
      const timeoutDuration = 30000; // 30 seconds
      const timeout = setTimeout(() => {
        reject(new Error(`Navigation timeout after ${timeoutDuration / 1000}s`));
      }, timeoutDuration);
      
      try {
        // Save state BEFORE navigation (critical!)
        await chrome.storage.local.set({
          pendingNavigation: {
            url: message.url,
            fromHash: message.fromHash,
            linkText: message.linkText,
            depth: message.depth,
            timestamp: Date.now()
          }
        });
        
        // Create one-time listener (remove after use)
        const navigationListener = (updatedTabId, changeInfo, tab) => {
          if (updatedTabId !== tabId) return;
          
          if (changeInfo.status === 'complete') {
            console.log('✅ Page loaded:', tab.url);
            
            // Check for GitHub Pages SPA redirect pattern
            if (tab.url.includes('/?/') && tab.url.includes('~and~')) {
              console.log('🎯 GitHub Pages SPA redirect detected in background script');
              
              try {
                // Extract and reconstruct original URL
                const urlObj = new URL(tab.url);
                const pathParam = urlObj.searchParams.get('/');
                
                if (pathParam) {
                  const originalPath = pathParam.replace(/~and~/g, '&');
                  const originalUrl = `${urlObj.origin}${originalPath}${urlObj.hash || ''}`;
                  
                  console.log(`🔄 Reconstructing GitHub Pages URL: ${tab.url} → ${originalUrl}`);
                  
                  // Navigate to original URL
                  chrome.tabs.update(tabId, { url: originalUrl }, (newTab) => {
                    if (chrome.runtime.lastError) {
                      console.error('❌ Failed to navigate to reconstructed URL:', chrome.runtime.lastError);
                      // Continue with current page if redirect fails
                      chrome.tabs.onUpdated.removeListener(navigationListener);
                      clearTimeout(timeout);
                      setTimeout(() => resolve(tab), 1000);
                    } else {
                      console.log('✅ Successfully navigated to reconstructed URL:', originalUrl);
                      // Keep listener active for the new navigation
                    }
                  });
                  return; // Don't resolve yet, wait for reconstructed page to load
                }
              } catch (error) {
                console.error('⚠️ Error processing GitHub Pages redirect:', error);
                // Continue with current page if parsing fails
              }
            }
            
            chrome.tabs.onUpdated.removeListener(navigationListener);
            clearTimeout(timeout);
            
            // Wait a bit for page to stabilize
            const stabilizationDelay = 1000;
            setTimeout(() => {
              resolve(tab);
            }, stabilizationDelay);
          }
        };
        
        chrome.tabs.onUpdated.addListener(navigationListener);
        
        // Start navigation
        chrome.tabs.update(tabId, { url: message.url }, (tab) => {
                      if (chrome.runtime.lastError) {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(navigationListener);
            reject(chrome.runtime.lastError);
                      } else {
            console.log('🔄 Navigation started to:', message.url);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
    
    // Track active navigation
    activeNavigations.set(tabId, navigationPromise);
    
    // Handle navigation completion
    navigationPromise
      .then(async (tab) => {
        console.log('📦 Injecting scripts into:', tab.url);
        
        try {
          // Phase-based script injection
          await injectScriptsReliably(tabId);
          console.log('✅ Scripts injected successfully');
          
          // Health check validation
          await waitForCrawlerReady(tabId);
          console.log('✅ Crawler is ready');
          
          // Send CONTINUE_CRAWL message
          chrome.tabs.sendMessage(tabId, {
            type: 'CONTINUE_CRAWL',
            fromHash: message.fromHash,
            linkText: message.linkText,
            depth: message.depth
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('❌ CONTINUE_CRAWL failed:', chrome.runtime.lastError.message);
            } else {
              console.log('✅ CONTINUE_CRAWL sent successfully');
            }
          });
          
          // Remove from active navigations
          activeNavigations.delete(tabId);
    } catch (error) {
          console.error('❌ Post-navigation setup failed:', error);
          activeNavigations.delete(tabId);
          handleNavigationFailure(message);
        }
      })
      .catch((error) => {
        console.error('❌ Navigation failed:', error);
        activeNavigations.delete(tabId);
        handleNavigationFailure(message);
      });
    
    return; // Don't expect response
  }
  
      if (message.type === 'START_CRAWL') {
        console.log('🚀🚀🚀 START_CRAWL MESSAGE RECEIVED 🚀🚀🚀');
        console.log('Starting crawl...');
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          console.log('Active tab:', tabs[0].url);
          
          // Store the tab ID for navigation
          currentTabId = tabs[0].id;
          
          // Check if scripts are already loaded (avoid duplicate injection)
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: () => {
              console.log('🔍 HEALTH CHECK: Checking if scripts are loaded...');
              const constantsLoaded = typeof window.CONSTANTS !== 'undefined';
              const crawlerLoaded = typeof window.AutoTestAICrawler !== 'undefined';
              console.log(`🔍 HEALTH CHECK: CONSTANTS loaded = ${constantsLoaded}`);
              console.log(`🔍 HEALTH CHECK: AutoTestAICrawler loaded = ${crawlerLoaded}`);
              return constantsLoaded && crawlerLoaded;
            }
          }, (healthCheckResult) => {
            console.log('🔍 Health check callback executed');
            if (chrome.runtime.lastError) {
              console.error('Health check failed:', chrome.runtime.lastError.message);
              return;
            }
            
            const scriptsAlreadyLoaded = healthCheckResult?.[0]?.result;
            console.log(`🔍 Scripts already loaded: ${scriptsAlreadyLoaded}`);
            
            // Only inject if scripts are not already loaded
            if (!scriptsAlreadyLoaded) {
              console.log('📦 Scripts not loaded, injecting bundled scripts...');
              
              chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                files: [
                  'dist/utils-bundle.js',
                  'dist/crawler-core-bundle.js',
                  'dist/modules-bundle.js',
                  'content-scripts/core-crawler.js'
                ]
              }, (result) => {
                if (chrome.runtime.lastError) {
                  console.error('❌ Error injecting bundled scripts:', chrome.runtime.lastError.message);
                  return;
                }
                console.log('✅ All bundled scripts injected successfully (4 files instead of 30+)');
                
                // Start crawler after injection completes
                startCrawlerFunction(tabs[0].id);
              });
            } else {
              console.log('✅ Scripts already loaded, skipping injection');
              
              // Start crawler immediately since scripts are loaded
              startCrawlerFunction(tabs[0].id);
            }
          });
        });
        
        // Helper function to start crawler
        function startCrawlerFunction(tabId) {
          console.log(`🎯 startCrawlerFunction called with tabId: ${tabId}`);
          setTimeout(() => {
            console.log(`🎯 Timeout elapsed, injecting crawler start function...`);
            chrome.scripting.executeScript({
              target: {tabId: tabId},
              func: (enabledModules, optimizationConfig, securityConfig, analyticsConfig) => {
                console.log('=== BACKGROUND SCRIPT EXECUTING CRAWL FUNCTION ===');
                
                if (window.autoTestAICrawler) {
                  console.log('Crawler found, setting modules and starting...');
                  if (enabledModules) {
                    window.autoTestAICrawler.setEnabledModules(enabledModules);
                  }
                  if (optimizationConfig) {
                    window.autoTestAICrawler.setOptimizationConfig(optimizationConfig);
                  }
                  if (securityConfig) {
                    window.autoTestAICrawler.setSecurityConfig(securityConfig);
                  }
                  if (analyticsConfig) {
                    window.autoTestAICrawler.setAnalyticsConfig(analyticsConfig);
                  }
                  window.autoTestAICrawler.start();
                } else {
                  console.error('Crawler not found on page!');
                  if (typeof window.AutoTestAICrawler !== 'undefined') {
                    console.log('Creating new AutoTestAICrawler instance...');
                    window.autoTestAICrawler = new window.AutoTestAICrawler();
                    if (enabledModules) {
                      window.autoTestAICrawler.setEnabledModules(enabledModules);
                    }
                    if (optimizationConfig) {
                      window.autoTestAICrawler.setOptimizationConfig(optimizationConfig);
                    }
                    if (securityConfig) {
                      window.autoTestAICrawler.setSecurityConfig(securityConfig);
                    }
                    if (analyticsConfig) {
                      window.autoTestAICrawler.setAnalyticsConfig(analyticsConfig);
                    }
                    window.autoTestAICrawler.start();
                  }
                }
              },
              args: [
                message.modules || {},
                message.optimization || {},
                message.security || {},
                message.analytics || {}
              ]
            }, (result) => {
              if (chrome.runtime.lastError) {
                console.error('Error executing crawler function:', chrome.runtime.lastError.message);
              } else {
                console.log('Crawler function executed successfully');
              }
            });
          }, 1000); // Brief delay for initialization
        }
        
        return; // Don't expect response
      }
  
  if (message.type === 'START_MULTI_ROLE_CRAWL') {
    console.log('Starting multi-role crawl...', message.enabledRoles);
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      console.log('Active tab:', tabs[0].url);
      
          // Inject all scripts including universal system, authentication modules, and advanced modules
          const scriptsToInject = [
            'utils/helpers.js',
            'utils/enhanced-helpers.js',
            'utils/intelligent-sampler.js',
            'utils/stability-detector.js',
            'utils/error-handler.js',
            'utils/performance-optimizer.js',
            'utils/data-sanitizer.js',
            'utils/input-validator.js',
            'utils/security-validator.js',
            'utils/secure-storage.js',
            'utils/security-manager.js',
            'content-scripts/dom-hasher.js',
            'content-scripts/state-graph.js',
            'content-scripts/universal-event-detector.js',
            'content-scripts/universal-form-handler.js',
            'content-scripts/modules/spa-detector.js',
            'content-scripts/modules/modal-detector.js',
            'content-scripts/modules/performance-monitor.js',
            'content-scripts/modules/accessibility-analyzer.js',
            'content-scripts/modules/network-monitor.js',
            'content-scripts/modules/storage-analyzer.js',
            'content-scripts/modules/websocket-detector.js',
            'content-scripts/modules/cookie-manager.js',
            'content-scripts/auth-handler.js',
            'content-scripts/session-manager.js',
            'content-scripts/modules/journey-mapper.js',
            'content-scripts/modules/heatmap-collector.js',
            'content-scripts/modules/funnel-analyzer.js',
            'content-scripts/modules/report-generator.js',
            'content-scripts/multi-role-crawler.js',
            'content-scripts/core-crawler.js'
          ];
          
          console.log(`📦 Injecting ${scriptsToInject.length} scripts...`);
          
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: scriptsToInject
          }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error injecting scripts:', chrome.runtime.lastError.message);
          sendResponse({success: false, error: chrome.runtime.lastError.message});
          return;
        }
        
        console.log('📦 Scripts injected, validating...');
        
        // Validate scripts loaded successfully with health check
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: () => {
            const requiredClasses = [
              'MultiRoleCrawler',
              'AuthenticationHandler', 
              'SessionManager',
              'AutoTestAICrawler',
              'DOMHasher',
              'StateGraph',
              'UniversalEventDetector',
              'UniversalFormHandler'
            ];
            
            const missingClasses = requiredClasses.filter(cls => typeof window[cls] === 'undefined');
            
            if (missingClasses.length > 0) {
              return {
                success: false,
                missing: missingClasses,
                message: `Missing required classes: ${missingClasses.join(', ')}`
              };
            }
            
            return {
              success: true,
              message: 'All required classes loaded successfully'
            };
          }
        }, (healthCheckResult) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Health check failed:', chrome.runtime.lastError.message);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
            return;
          }
          
          const health = healthCheckResult[0].result;
          
          if (!health.success) {
            console.error('❌ Script validation failed:', health.message);
            console.error('Missing classes:', health.missing);
            sendResponse({success: false, error: health.message});
            return;
          }
          
          console.log('✅ All scripts validated successfully:', health.message);
        });
        
            // Start multi-role crawler after a delay
            setTimeout(() => {
              chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: (enabledRoles, enabledModules, optimizationConfig, securityConfig, analyticsConfig) => {
                  console.log('=== BACKGROUND SCRIPT EXECUTING MULTI-ROLE CRAWL FUNCTION ===');
                  
                  // Wait a bit more for all classes to be available
                  setTimeout(() => {
                    if (window.MultiRoleCrawler && window.AuthenticationHandler && window.SessionManager) {
                      console.log('All classes found, starting multi-role crawler...');
                      const multiRoleCrawler = new window.MultiRoleCrawler();
                      if (enabledModules) {
                        multiRoleCrawler.setEnabledModules(enabledModules);
                      }
                      if (optimizationConfig) {
                        multiRoleCrawler.setOptimizationConfig(optimizationConfig);
                      }
                      if (securityConfig) {
                        multiRoleCrawler.setSecurityConfig(securityConfig);
                      }
                      if (analyticsConfig) {
                        multiRoleCrawler.setAnalyticsConfig(analyticsConfig);
                      }
                      multiRoleCrawler.startMultiRoleCrawl(window.location.href, enabledRoles);
                    } else {
                      console.error('Required classes not found on page!');
                      console.log('MultiRoleCrawler:', typeof window.MultiRoleCrawler);
                      console.log('AuthenticationHandler:', typeof window.AuthenticationHandler);
                      console.log('SessionManager:', typeof window.SessionManager);
                    }
                  }, 500);
                },
                args: [message.enabledRoles, message.modules, message.optimization, message.security, message.analytics]
              }, (result) => {
                if (chrome.runtime.lastError) {
                  console.error('Error executing multi-role crawler function:', chrome.runtime.lastError.message);
                } else {
                  console.log('Multi-role crawler function executed successfully');
                }
              });
            }, 2000);
      });
    });
    return; // Don't expect response
  }
  
  if (message.type === 'STOP_CRAWL') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: () => {
          if (window.autoTestAICrawler) {
            window.autoTestAICrawler.stop();
          }
        }
      });
    });
    return; // Don't expect response
  }
  
  if (message.type === 'CRAWL_PROGRESS') {
    // Forward progress message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'CRAWL_PROGRESS',
      data: message.data
    }).catch(err => console.log('No popup listener for CRAWL_PROGRESS'));
    return true; // Return true for async handling
  }
  
  if (message.type === 'ROLE_CRAWL_START') {
    console.log(`Starting crawl for role: ${message.role}`);
    // Forward role start message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'ROLE_CRAWL_START',
      role: message.role
    }).catch(err => console.log('No popup listener for ROLE_CRAWL_START'));
    return true; // Return true for async handling
  }

  if (message.type === 'ROLE_CRAWL_COMPLETE') {
    console.log(`Completed crawl for role: ${message.role}`);
    // Store role-specific crawl data
    chrome.storage.local.set({[`crawlData_${message.role}`]: message.data});
    // Forward role completion message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'ROLE_CRAWL_COMPLETE',
      role: message.role,
      data: message.data
    }).catch(err => console.log('No popup listener for ROLE_CRAWL_COMPLETE'));
    return true; // Return true for async handling
  }

  if (message.type === 'ROLE_CRAWL_ERROR') {
    console.error(`Error in role crawl for ${message.role}:`, message.error);
    // Forward role error message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'ROLE_CRAWL_ERROR',
      role: message.role,
      error: message.error
    }).catch(err => console.log('No popup listener for ROLE_CRAWL_ERROR'));
    return true; // Return true for async handling
  }

  if (message.type === 'MULTI_ROLE_CRAWL_COMPLETE') {
    console.log('Multi-role crawl completed');
    crawlData = message.data;
    chrome.storage.local.set({multiRoleCrawlData: message.data});
    // Forward completion message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'MULTI_ROLE_CRAWL_COMPLETE',
      data: message.data
    }).catch(err => console.log('No popup listener for MULTI_ROLE_CRAWL_COMPLETE'));
    return true; // Return true for async handling
  }

  if (message.type === 'MULTI_ROLE_CRAWL_ERROR') {
    console.error('Multi-role crawl error:', message.error);
    // Forward error message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'MULTI_ROLE_CRAWL_ERROR',
      error: message.error
    }).catch(err => console.log('No popup listener for MULTI_ROLE_CRAWL_ERROR'));
    return true; // Return true for async handling
  }

  if (message.type === 'CRAWL_COMPLETE') {
    crawlData = message.data;
    chrome.storage.local.set({crawlData: message.data});
    // Forward completion message to popup (catch errors to prevent message port issues)
    chrome.runtime.sendMessage({
      type: 'CRAWL_COMPLETE',
      data: message.data
    }).catch(err => console.log('No popup listener for CRAWL_COMPLETE'));
    return true; // Return true for async handling
  }
  
  if (message.type === 'GET_RESULTS') {
    sendResponse(crawlData);
    return true; // Only this one expects async response
  }
  
  // No return statement for unhandled messages
});
