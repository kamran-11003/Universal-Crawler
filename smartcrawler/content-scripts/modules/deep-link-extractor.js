/**
 * Deep Link Extractor - Discovers hidden and dynamically loaded links
 * Extracts: React/Vue routes, hidden menus, JavaScript-defined routes, accordion content
 */

chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Deep Link Extractor: Loading module...'});

class DeepLinkExtractor {
  constructor() {
    this.discoveredLinks = new Set();
    this.visitedInteractions = new Set();
  }
  
  /**
   * Extract all possible links from the page
   * @returns {Array} Array of link objects {href, text, source}
   */
  async extractAllLinks() {
    console.log('🔍 Deep Link Extractor: Starting comprehensive link discovery');
    
    const links = [];
    
    // 1. Extract visible links (baseline)
    const visibleLinks = this.extractVisibleLinks();
    links.push(...visibleLinks);
    console.log(`✅ Found ${visibleLinks.length} visible links`);
    
    // 2. Extract React Router routes
    const reactRoutes = this.extractReactRoutes();
    links.push(...reactRoutes);
    console.log(`✅ Found ${reactRoutes.length} React routes`);
    
    // 3. Extract Vue Router routes
    const vueRoutes = this.extractVueRoutes();
    links.push(...vueRoutes);
    console.log(`✅ Found ${vueRoutes.length} Vue routes`);
    
    // 4. Extract Angular routes
    const angularRoutes = this.extractAngularRoutes();
    links.push(...angularRoutes);
    console.log(`✅ Found ${angularRoutes.length} Angular routes`);
    
    // 5. Simulate interactions to reveal hidden links
    const hiddenLinks = await this.extractHiddenLinks();
    links.push(...hiddenLinks);
    console.log(`✅ Found ${hiddenLinks.length} hidden links`);
    
    // 6. Intercept React Router navigation (history API)
    const interceptedRoutes = this.interceptHistoryAPI();
    links.push(...interceptedRoutes);
    console.log(`✅ Found ${interceptedRoutes.length} intercepted routes`);
    
    // 7. Extract from sitemap if available
    const sitemapLinks = await this.extractFromSitemap();
    links.push(...sitemapLinks);
    console.log(`✅ Found ${sitemapLinks.length} sitemap links`);
    
    // Deduplicate
    const uniqueLinks = this.deduplicateLinks(links);
    console.log(`🎯 Total unique links discovered: ${uniqueLinks.length}`);
    
    return uniqueLinks;
  }
  
  extractVisibleLinks() {
    const links = [];
    const anchors = document.querySelectorAll('a[href]');
    
    console.log(`🔗 Found ${anchors.length} total <a> tags in DOM`);
    
    for (const anchor of anchors) {
      if (anchor.href && anchor.href.startsWith('http')) {
        links.push({
          href: anchor.href,
          text: anchor.textContent?.trim() || '',
          title: anchor.title || '',
          source: 'visible-dom',
          isVisible: this.isElementVisible(anchor)
        });
      }
    }
    
    // Log how many are actually visible vs hidden
    const visibleCount = links.filter(l => l.isVisible).length;
    console.log(`👁️ ${visibleCount} visible, ${links.length - visibleCount} hidden links`);
    
    return links;
  }
  
  /**
   * Check if element is visible (doesn't filter out, just tags)
   */
  isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return element.offsetParent !== null && 
           style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           rect.width > 0 &&
           rect.height > 0;
  }
  
  extractReactRoutes() {
    const routes = [];
    
    try {
      // Method 1: Check React Router in window
      if (window.__REACT_ROUTER__) {
        const reactRoutes = window.__REACT_ROUTER__.routes || [];
        reactRoutes.forEach(route => {
          if (route.path) {
            routes.push({
              href: window.location.origin + route.path,
              text: route.path,
              title: route.name || route.path,
              source: 'react-router'
            });
          }
        });
      }
      
      // Method 2: Check for React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const reactInstances = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers || new Map();
        
        for (const [id, renderer] of reactInstances) {
          try {
            // Try to access React Router state
            if (renderer && renderer.getCurrentFiber) {
              const fiber = renderer.getCurrentFiber();
              if (fiber && fiber.stateNode && fiber.stateNode.props && fiber.stateNode.props.routes) {
                fiber.stateNode.props.routes.forEach(route => {
                  if (route.path) {
                    routes.push({
                      href: window.location.origin + route.path,
                      text: route.path,
                      source: 'react-fiber'
                    });
                  }
                });
              }
            }
          } catch (e) {
            // Skip if can't access
          }
        }
      }
      
      // Method 3: Parse bundled JavaScript for route definitions
      const scripts = document.querySelectorAll('script[src]');
      for (const script of scripts) {
        if (script.src.includes('main') || script.src.includes('bundle') || script.src.includes('app')) {
          try {
            // Common React Router patterns:
            // - path: "/products/:id"
            // - { path: '/about', component: About }
            // Note: We can't actually fetch these due to CORS, but we'll try
            // In practice, this is handled by parseJavaScriptRoutes for inline scripts
          } catch (e) {
            // Can't fetch external scripts due to CORS
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error extracting React routes:', error);
    }
    
    return routes;
  }
  
  extractVueRoutes() {
    const routes = [];
    
    try {
      // Check for Vue Router
      if (window.$router) {
        const vueRoutes = window.$router.options.routes || [];
        vueRoutes.forEach(route => {
          if (route.path) {
            routes.push({
              href: window.location.origin + route.path,
              text: route.name || route.path,
              title: route.meta?.title || route.path,
              source: 'vue-router'
            });
          }
        });
      }
      
      // Check for Vue 3
      if (window.__VUE__) {
        // Try to access router from Vue instance
        const apps = document.querySelectorAll('[data-v-app]');
        apps.forEach(app => {
          try {
            const vueInstance = app.__vueParentComponent;
            if (vueInstance && vueInstance.appContext && vueInstance.appContext.config.globalProperties.$router) {
              const router = vueInstance.appContext.config.globalProperties.$router;
              const vueRoutes = router.options.routes || [];
              vueRoutes.forEach(route => {
                if (route.path) {
                  routes.push({
                    href: window.location.origin + route.path,
                    text: route.path,
                    source: 'vue3-router'
                  });
                }
              });
            }
          } catch (e) {
            // Skip if can't access
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Error extracting Vue routes:', error);
    }
    
    return routes;
  }
  
  extractAngularRoutes() {
    const routes = [];
    
    try {
      // Check for Angular router
      if (window.ng) {
        const rootComponents = document.querySelectorAll('[ng-version]');
        rootComponents.forEach(root => {
          try {
            const component = window.ng.getComponent(root);
            if (component && component.router) {
              const config = component.router.config || [];
              config.forEach(route => {
                if (route.path) {
                  routes.push({
                    href: window.location.origin + '/' + route.path,
                    text: route.path,
                    source: 'angular-router'
                  });
                }
              });
            }
          } catch (e) {
            // Skip if can't access
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Error extracting Angular routes:', error);
    }
    
    return routes;
  }
  
  async extractHiddenLinks() {
    const hiddenLinks = [];
    
    // Mark all currently visible links
    document.querySelectorAll('a[href]').forEach(link => {
      link.setAttribute('data-discovered-before-interaction', 'true');
    });
    
    // 0. FIRST: Try to extract routes from global state (fastest, most reliable)
    await this.extractRoutesFromGlobalState(hiddenLinks);
    
    // 1. Hover over menu items to reveal dropdowns
    await this.interactWithMenus(hiddenLinks);
    
    // 2. Click accordion/tab buttons
    await this.interactWithAccordions(hiddenLinks);
    
    // 3. Click hamburger menus
    await this.interactWithHamburgerMenus(hiddenLinks);
    
    // 4. Expand collapsed sections
    await this.interactWithCollapsibles(hiddenLinks);
    
    // 5. NEW: Click on navigation cards/sections (for landing pages)
    await this.interactWithNavigationCards(hiddenLinks);
    
    // 6. NEW: Expand sidebar navigation groups
    await this.expandSidebarGroups(hiddenLinks);
    
    // 7. NEW: Click ID-based navigation items (li[id="item-0"], etc.)
    await this.interactWithIdBasedNavigation(hiddenLinks);
    
    return hiddenLinks;
  }
  
  async extractRoutesFromGlobalState(hiddenLinks) {
    console.log('🔍 Searching for routes in global state and DOM data...');
    
    try {
      // Strategy 1: Check if sidebar items have data attributes with URLs
      const sidebarItems = document.querySelectorAll('li[id^="item-"], ul.menu-list > li, .element-list li');
      
      console.log(`🔍 Found ${sidebarItems.length} sidebar items to analyze`);
      
      for (const item of sidebarItems) {
        // Check for data attributes
        const dataUrl = item.getAttribute('data-url') || 
                       item.getAttribute('data-href') || 
                       item.getAttribute('data-route') ||
                       item.getAttribute('data-path');
        
        if (dataUrl) {
          const fullUrl = dataUrl.startsWith('http') ? dataUrl : window.location.origin + dataUrl;
          const textElement = item.querySelector('.text, span.text');
          const itemText = textElement ? textElement.textContent.trim() : item.textContent.trim();
          
          hiddenLinks.push({
            href: fullUrl,
            text: itemText,
            title: itemText,
            source: 'data-attribute'
          });
          
          console.log(`✅ Found route from data attribute: ${fullUrl}`);
        }
      }
      
      // Strategy 1.5: Direct DOM inspection of ALL sidebar items
      // Extract text and predict URLs (works for most convention-following sites)
      if (sidebarItems.length > 0) {
        console.log(`🎯 Extracting routes from ${sidebarItems.length} sidebar items via text analysis...`);
        
        sidebarItems.forEach(item => {
          const textElement = item.querySelector('.text, span.text');
          const itemText = textElement ? textElement.textContent.trim() : item.textContent.trim();
          
          if (itemText && itemText.length > 0 && itemText.length < 50) {
            // Convert text to URL slug (common pattern: "Text Box" -> "text-box")
            const slug = itemText.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9\-]/g, '')
              .replace(/--+/g, '-')
              .replace(/^-|-$/g, '');
            
            if (slug && slug.length > 0) {
              const predictedUrl = window.location.origin + '/' + slug;
              hiddenLinks.push({
                href: predictedUrl,
                text: itemText,
                title: itemText,
                source: 'sidebar-text-predicted'
              });
              console.log(`🔮 Predicted URL from sidebar text "${itemText}": ${predictedUrl}`);
            }
          }
        });
      }
      
      // Strategy 2: Search window object for route arrays
      // Common patterns: window.routes, window.appRoutes, window.__ROUTES__, etc.
      const possibleRouteKeys = ['routes', 'appRoutes', 'menuItems', 'navigationItems', '__ROUTES__', 'config', '__INITIAL_STATE__'];
      
      for (const key of possibleRouteKeys) {
        if (window[key] && Array.isArray(window[key])) {
          console.log(`📦 Found potential route array: window.${key}`);
          
          window[key].forEach(route => {
            let url = null;
            let text = null;
            
            // Handle different route object shapes
            if (typeof route === 'string') {
              url = route;
            } else if (route && typeof route === 'object') {
              url = route.url || route.path || route.href || route.route;
              text = route.name || route.label || route.text || route.title;
              
              // Also check nested list property (DemoQA pattern)
              if (route.list && Array.isArray(route.list)) {
                route.list.forEach(subRoute => {
                  const subUrl = subRoute.url || subRoute.path;
                  const subText = subRoute.name || subRoute.label;
                  
                  if (subUrl) {
                    const fullUrl = subUrl.startsWith('http') ? subUrl : window.location.origin + '/' + subUrl.replace(/^\//, '');
                    hiddenLinks.push({
                      href: fullUrl,
                      text: subText || subUrl,
                      title: subText || subUrl,
                      source: `global-state-${key}`
                    });
                    console.log(`✅ Found nested route: ${fullUrl}`);
                  }
                });
              }
            }
            
            if (url) {
              const fullUrl = url.startsWith('http') ? url : window.location.origin + '/' + url.replace(/^\//, '');
              hiddenLinks.push({
                href: fullUrl,
                text: text || url,
                title: text || url,
                source: `global-state-${key}`
              });
              console.log(`✅ Found route from window.${key}: ${fullUrl}`);
            }
          });
        }
      }
      
      // Strategy 3: Search for React component props (if React DevTools exposed)
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers) {
        console.log('🔍 Searching React component tree for routes...');
        
        // Try to find route config in React Fiber tree
        const reactRoot = document.querySelector('[data-reactroot], #root, #app');
        if (reactRoot && reactRoot._reactRootContainer) {
          // This is a deep search - skip for now to avoid performance issues
          console.log('⚠️ React root found but deep search skipped (performance)');
        }
      }
      
      console.log(`📊 Extracted ${hiddenLinks.length} routes from global state and sidebar analysis`);
      
    } catch (error) {
      console.warn('⚠️ Error extracting routes from global state:', error);
    }
  }
  
  async interactWithMenus(hiddenLinks) {
    const menus = document.querySelectorAll('.menu, .nav, [role="navigation"], .navbar, [class*="menu"], [class*="nav"]');
    
    for (const menu of menus) {
      const menuId = this.getElementIdentifier(menu);
      
      if (this.visitedInteractions.has(menuId)) continue;
      this.visitedInteractions.add(menuId);
      
      // Hover
      menu.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
      await this.wait(300);
      
      // Click
      menu.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await this.wait(300);
      
      // Extract newly visible links
      this.extractNewlyVisibleLinks(hiddenLinks, 'menu-hover');
    }
  }
  
  async interactWithAccordions(hiddenLinks) {
    const accordions = document.querySelectorAll(
      '[role="tab"], .accordion-trigger, .tab-button, [class*="accordion"], [class*="tab"], summary'
    );
    
    for (const accordion of accordions) {
      const accordionId = this.getElementIdentifier(accordion);
      
      if (this.visitedInteractions.has(accordionId)) continue;
      this.visitedInteractions.add(accordionId);
      
      accordion.click();
      await this.wait(300);
      
      this.extractNewlyVisibleLinks(hiddenLinks, 'accordion-click');
    }
  }
  
  async interactWithHamburgerMenus(hiddenLinks) {
    const hamburgers = document.querySelectorAll(
      '.hamburger, .menu-toggle, [aria-label*="menu" i], [class*="burger"]'
    );
    
    for (const hamburger of hamburgers) {
      const hamburgerId = this.getElementIdentifier(hamburger);
      
      if (this.visitedInteractions.has(hamburgerId)) continue;
      this.visitedInteractions.add(hamburgerId);
      
      hamburger.click();
      await this.wait(500);
      
      this.extractNewlyVisibleLinks(hiddenLinks, 'hamburger-click');
    }
  }
  
  async interactWithCollapsibles(hiddenLinks) {
    const collapsibles = document.querySelectorAll(
      '[class*="collapse"], [class*="expand"], [aria-expanded="false"]'
    );
    
    for (const collapsible of collapsibles) {
      // Skip if not a clickable element
      if (!collapsible || typeof collapsible.click !== 'function') continue;
      
      const collapsibleId = this.getElementIdentifier(collapsible);
      
      if (this.visitedInteractions.has(collapsibleId)) continue;
      this.visitedInteractions.add(collapsibleId);
      
      try {
        collapsible.click();
        await this.wait(300);
        
        this.extractNewlyVisibleLinks(hiddenLinks, 'collapsible-click');
      } catch (error) {
        // Skip if click fails
        console.warn('⚠️ Failed to click collapsible:', error.message);
      }
    }
  }
  
  extractNewlyVisibleLinks(hiddenLinks, source) {
    const newLinks = document.querySelectorAll('a[href]:not([data-discovered-before-interaction])');
    
    newLinks.forEach(link => {
      if (link.href && link.href.startsWith('http')) {
        hiddenLinks.push({
          href: link.href,
          text: link.textContent?.trim() || '',
          title: link.title || '',
          source: source
        });
        link.setAttribute('data-discovered-before-interaction', 'true');
      }
    });
  }
  
  async interactWithNavigationCards(hiddenLinks) {
    console.log('🔍 Looking for navigation cards/sections...');
    
    // Strategy 1: Find elements with onclick attributes
    const onclickCards = document.querySelectorAll(
      '.card[onclick], div[onclick*="location"], section[onclick], ' +
      '[class*="card"][onclick], [class*="section"][onclick], ' +
      '[class*="category"][onclick], [class*="tile"][onclick]'
    );
    
    console.log(`🎴 Found ${onclickCards.length} cards with onclick attributes`);
    
    for (const card of onclickCards) {
      const cardId = this.getElementIdentifier(card);
      
      if (this.visitedInteractions.has(cardId)) continue;
      
      // Check if the onclick contains URL navigation
      const onclick = card.getAttribute('onclick') || '';
      const urlMatch = onclick.match(/location\s*=\s*['"]([^'"]+)['"]/);
      
      if (urlMatch) {
        const url = urlMatch[1];
        const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
        
        console.log(`✅ Found navigation card (onclick) -> ${fullUrl}`);
        
        hiddenLinks.push({
          href: fullUrl,
          text: card.textContent?.trim()?.substring(0, 50) || url,
          title: card.getAttribute('title') || card.getAttribute('aria-label') || '',
          source: 'navigation-card-onclick'
        });
        
        this.visitedInteractions.add(cardId);
      }
    }
    
    // Strategy 2: Find clickable navigation elements (cards, sections with cursor:pointer)
    // These are typically React/Vue components with event listeners
    const clickableElements = document.querySelectorAll(
      '.card, .category, .tile, section, ' +
      '[class*="card"], [class*="category"], [class*="tile"], [class*="section"], ' +
      '[class*="nav-item"], [class*="menu-item"], [class*="grid-item"]'
    );
    
    console.log(`🎴 Found ${clickableElements.length} potential clickable navigation elements`);
    
    // Mark all visible links before clicking
    document.querySelectorAll('a[href]').forEach(link => {
      if (!link.hasAttribute('data-discovered-before-interaction')) {
        link.setAttribute('data-discovered-before-interaction', 'true');
      }
    });
    
    let clickedCount = 0;
    for (const element of clickableElements) {
      // Skip if already visited
      const elementId = this.getElementIdentifier(element);
      if (this.visitedInteractions.has(elementId)) continue;
      
      // Check if element looks clickable (has pointer cursor or contains links)
      const style = window.getComputedStyle(element);
      const hasPointerCursor = style.cursor === 'pointer';
      const hasOnClickListener = element.onclick !== null;
      
      // Also check if element has children with links (might navigate programmatically)
      const hasLinks = element.querySelector('a[href]') !== null;
      
      if (hasPointerCursor || hasOnClickListener || (!hasLinks && element.children.length > 0)) {
        this.visitedInteractions.add(elementId);
        
        // Try clicking to see if it navigates or reveals links
        const beforeUrl = window.location.href;
        const linksBefore = document.querySelectorAll('a[href]:not([data-discovered-before-interaction])').length;
        
        try {
          // Get className safely (might be SVG element)
          let elemClassName = '';
          if (element.className) {
            if (typeof element.className === 'string') {
              elemClassName = element.className;
            } else if (element.className.baseVal !== undefined) {
              elemClassName = element.className.baseVal; // SVG
            }
          }
          console.log(`🖱️ Clicking potential navigation element: ${elemClassName || element.tagName}`);
          
          // Simulate a real click
          element.click();
          await this.wait(500); // Wait for navigation or DOM updates
          
          const afterUrl = window.location.href;
          const linksAfter = document.querySelectorAll('a[href]:not([data-discovered-before-interaction])').length;
          
          // Check if page navigated
          if (afterUrl !== beforeUrl) {
            console.log(`✅ Click caused navigation to: ${afterUrl}`);
            // Don't continue clicking, let the crawler handle the new page
            return hiddenLinks;
          }
          
          // Check if new links appeared
          if (linksAfter > linksBefore) {
            console.log(`✅ Click revealed ${linksAfter - linksBefore} new links`);
            this.extractNewlyVisibleLinks(hiddenLinks, 'navigation-card-click');
          }
          
          clickedCount++;
          // Limit clicks to prevent infinite loops
          if (clickedCount >= 10) {
            console.log('⚠️ Reached maximum click limit (10), stopping card interactions');
            break;
          }
        } catch (error) {
          console.warn('⚠️ Failed to click navigation element:', error.message);
        }
      }
    }
    
    console.log(`🖱️ Clicked ${clickedCount} navigation elements`);
  }
  
  async expandSidebarGroups(hiddenLinks) {
    console.log('🔍 Looking for sidebar navigation groups...');
    
    // Look for collapsed sidebar groups
    const sidebarGroups = document.querySelectorAll(
      '.menu-list [aria-expanded="false"], ' +
      '.sidebar [aria-expanded="false"], ' +
      '[class*="sidebar"] [aria-expanded="false"], ' +
      '.element-group .header, ' +
      '[class*="group-header"], ' +
      '[class*="menu-item"].show > div, ' +
      '.left-pannel .element-list > div'  // DemoQA specific
    );
    
    console.log(`📂 Found ${sidebarGroups.length} collapsed sidebar groups`);
    
    for (const group of sidebarGroups) {
      // Skip if not a clickable element
      if (!group || typeof group.click !== 'function') continue;
      
      const groupId = this.getElementIdentifier(group);
      
      if (this.visitedInteractions.has(groupId)) continue;
      this.visitedInteractions.add(groupId);
      
      // Get className safely
      const className = group.className && typeof group.className === 'string' 
        ? group.className 
        : (group.getAttribute && group.getAttribute('class')) || 'unknown';
      
      console.log(`🔓 Expanding sidebar group: ${className}`);
      
      try {
        // Try clicking to expand
        group.click();
        await this.wait(400);
        
        // Extract links that became visible
        this.extractNewlyVisibleLinks(hiddenLinks, 'sidebar-group-expansion');
      } catch (error) {
        // Skip if click fails
        console.warn('⚠️ Failed to expand sidebar group:', error.message);
      }
    }
  }
  
  async interactWithIdBasedNavigation(hiddenLinks) {
    console.log('🔍 Looking for ID-based navigation items...');
    
    // Target list items with IDs that likely trigger navigation
    const idBasedItems = document.querySelectorAll(
      'li[id^="item-"], ' +
      'li[id^="menu-"], ' +
      'li[id^="nav-"], ' +
      'ul.menu-list > li[id], ' +
      '[class*="menu"] li[id], ' +
      '[class*="sidebar"] li[id], ' +
      '.element-list li[id]'
    );
    
    console.log(`🎯 Found ${idBasedItems.length} ID-based navigation items`);
    
    if (idBasedItems.length === 0) {
      console.log('⚠️ No ID-based navigation items found, skipping');
      return;
    }
    
    // Store the original URL before any clicking
    const originalUrl = window.location.href;
    console.log(`📍 Original URL before clicking: ${originalUrl}`);
    
    // NEW STRATEGY: Click each item, capture URL, navigate back
    // This is the ONLY reliable way to discover actual URLs
    console.log('🔄 Strategy: Click each item → Capture URL → Navigate back');
    
    const discoveredUrls = [];
    
    for (let i = 0; i < idBasedItems.length && i < 20; i++) {
      const item = idBasedItems[i];
      if (!item || typeof item.click !== 'function') continue;
      
      const itemId = item.id || 'unknown';
      const textElement = item.querySelector('.text, span.text');
      const itemText = textElement ? textElement.textContent.trim() : item.textContent.trim().substring(0, 30);
      
      try {
        console.log(`\n[${i + 1}/${idBasedItems.length}] 🖱️ Clicking "${itemText}" (id="${itemId}")...`);
        
        const beforeUrl = window.location.href;
        console.log(`  📍 Before click: ${beforeUrl}`);
        
        // Click and wait for navigation
        item.click();
        await this.wait(800); // Wait for navigation to complete
        
        const afterUrl = window.location.href;
        console.log(`  📍 After click: ${afterUrl}`);
        
        if (afterUrl !== beforeUrl) {
          console.log(`  ✅ Successfully navigated to: ${afterUrl}`);
          
          discoveredUrls.push({
            href: afterUrl,
            text: itemText,
            title: itemText,
            source: 'id-nav-clicked'
          });
          
          // Navigate back to continue discovering
          console.log(`  ⏪ Navigating back to: ${originalUrl}`);
          window.history.back();
          await this.wait(1000); // Wait longer for back navigation
          
          // Verify we're back
          const finalUrl = window.location.href;
          console.log(`  📍 After back: ${finalUrl}`);
          
          if (finalUrl !== originalUrl) {
            console.warn(`  ⚠️ Not back at original URL!`);
            console.warn(`  Expected: ${originalUrl}`);
            console.warn(`  Got: ${finalUrl}`);
            
            // Try to navigate directly to original URL
            console.log(`  🔄 Forcing navigation to original URL...`);
            window.location.href = originalUrl;
            await this.wait(1500);
            
            const retryUrl = window.location.href;
            console.log(`  📍 After forced navigation: ${retryUrl}`);
          } else {
            console.log(`  ✅ Successfully returned to original URL`);
          }
        } else {
          console.log(`  ⚠️ No navigation occurred (URL unchanged)`);
        }
        
      } catch (error) {
        console.warn(`  ❌ Error clicking item "${itemId}":`, error.message);
      }
    }
    
    console.log(`\n📊 Discovered ${discoveredUrls.length} URLs by clicking sidebar items`);
    console.log(`📋 URLs discovered:`, discoveredUrls.map(u => u.href));
    
    hiddenLinks.push(...discoveredUrls);
  }
  
  interceptHistoryAPI() {
    const routes = [];
    
    console.log('🔍 Setting up history API interceptor for SPA navigation...');
    
    // Store discovered routes in a global Set to track across navigations
    if (!window.__CRAWLER_DISCOVERED_ROUTES__) {
      window.__CRAWLER_DISCOVERED_ROUTES__ = new Set();
      
      // Intercept pushState (React Router, Vue Router, Angular Router all use this)
      const originalPushState = history.pushState;
      history.pushState = function(state, title, url) {
        if (url) {
          const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
          window.__CRAWLER_DISCOVERED_ROUTES__.add(fullUrl);
          console.log(`� Intercepted history.pushState: ${fullUrl}`);
        }
        return originalPushState.apply(this, arguments);
      };
      
      // Intercept replaceState
      const originalReplaceState = history.replaceState;
      history.replaceState = function(state, title, url) {
        if (url) {
          const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
          window.__CRAWLER_DISCOVERED_ROUTES__.add(fullUrl);
          console.log(`🔀 Intercepted history.replaceState: ${fullUrl}`);
        }
        return originalReplaceState.apply(this, arguments);
      };
      
      console.log('✅ History API interceptor installed');
    }
    
    // Return any routes discovered so far
    window.__CRAWLER_DISCOVERED_ROUTES__.forEach(url => {
      routes.push({
        href: url,
        text: url.split('/').pop() || url,
        title: url,
        source: 'history-api-intercepted'
      });
    });
    
    return routes;
  }
  
  async extractFromSitemap() {
    const links = [];
    
    try {
      // Try common sitemap locations
      const sitemapUrls = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap',
        '/robots.txt' // May contain sitemap reference
      ];
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await fetch(window.location.origin + sitemapUrl);
          if (response.ok) {
            const text = await response.text();
            
            // Parse XML sitemap
            if (text.includes('<urlset') || text.includes('<sitemapindex')) {
              const urlMatches = text.matchAll(/<loc>(.*?)<\/loc>/g);
              for (const match of urlMatches) {
                links.push({
                  href: match[1],
                  text: match[1],
                  source: 'sitemap'
                });
              }
            }
            
            // Parse robots.txt
            if (sitemapUrl === '/robots.txt') {
              const sitemapMatches = text.matchAll(/Sitemap:\\s*(.*)/gi);
              for (const match of sitemapMatches) {
                // Recursively fetch these sitemaps
                try {
                  const sitemapResponse = await fetch(match[1]);
                  if (sitemapResponse.ok) {
                    const sitemapText = await sitemapResponse.text();
                    const urlMatches = sitemapText.matchAll(/<loc>(.*?)<\/loc>/g);
                    for (const urlMatch of urlMatches) {
                      links.push({
                        href: urlMatch[1],
                        text: urlMatch[1],
                        source: 'sitemap'
                      });
                    }
                  }
                } catch (e) {
                  // Skip if can't fetch
                }
              }
            }
            
            console.log(`✅ Found sitemap at ${sitemapUrl}`);
            break; // Found one, no need to check others
          }
        } catch (e) {
          // Sitemap not found, try next
        }
      }
    } catch (error) {
      console.warn('⚠️ Error extracting sitemap:', error);
    }
    
    return links;
  }
  
  deduplicateLinks(links) {
    const seen = new Set();
    const unique = [];
    
    for (const link of links) {
      // Normalize URL for comparison
      try {
        const url = new URL(link.href);
        // Remove trailing slash and hash for comparison
        const normalized = url.origin + url.pathname.replace(/\/$/, '') + url.search;
        
        if (!seen.has(normalized)) {
          seen.add(normalized);
          unique.push(link);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    return unique;
  }
  
  getElementIdentifier(element) {
    // Create unique identifier for element
    if (!element) return 'null-element';
    
    // Get className safely (might be SVGAnimatedString or not a string)
    let className = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        className = element.className;
      } else if (element.className.baseVal) {
        // SVG element
        className = element.className.baseVal;
      } else if (element.getAttribute) {
        className = element.getAttribute('class') || '';
      }
    }
    
    return element.id || 
           className + '-' + element.tagName + '-' + Array.from(element.parentElement?.children || []).indexOf(element);
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Make available globally
window.DeepLinkExtractor = DeepLinkExtractor;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Deep Link Extractor: Class registered globally'});
console.log('🔍 Deep Link Extractor loaded');
