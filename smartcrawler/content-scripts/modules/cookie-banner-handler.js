/**
 * Cookie Banner Handler - Auto-dismisses GDPR/cookie consent banners
 * Prevents content blocking and improves crawling coverage
 * Supports: OneTrust, Cookie Consent, TrustArc, Didomi, Quantcast, custom implementations
 */

class CookieBannerHandler {
  constructor() {
    // Comprehensive list of cookie banner selectors (most common vendors + generic)
    this.selectors = [
      // Generic accept buttons
      'button[id*="accept" i]',
      'button[class*="accept" i]',
      'a[id*="accept" i]',
      'a[class*="accept" i]',
      '[role="button"][id*="accept" i]',
      '[role="button"][class*="accept" i]',
      
      // Generic cookie/consent buttons
      'button[id*="cookie" i]',
      'button[class*="cookie" i]',
      'button[id*="consent" i]',
      'button[class*="consent" i]',
      'button[id*="gdpr" i]',
      'button[class*="gdpr" i]',
      
      // ARIA labels
      '[aria-label*="accept" i]',
      '[aria-label*="agree" i]',
      '[aria-label*="cookie" i]',
      '[aria-label*="consent" i]',
      
      // Specific vendors (most popular)
      '#onetrust-accept-btn-handler',                    // OneTrust
      '#onetrust-pc-btn-handler',                        // OneTrust settings
      '.onetrust-close-btn-handler',                     // OneTrust close
      '.cookie-consent-accept',                           // Generic Cookie Consent
      '.cc-dismiss',                                      // Cookie Consent (cookieconsent.js)
      '.cc-allow',                                        // Cookie Consent
      '.cc-btn-accept-all',                              // Cookie Consent
      '#truste-consent-button',                          // TrustArc
      '.truste-button1',                                 // TrustArc
      '.trustarc-agree-btn',                             // TrustArc
      '#didomi-notice-agree-button',                     // Didomi
      '.didomi-continue-without-agreeing',               // Didomi
      '.qc-cmp-button[mode="primary"]',                  // Quantcast
      '.qc-cmp-button:not([mode="secondary"])',          // Quantcast
      '#CybotCookiebotDialogBodyButtonAccept',           // Cookiebot
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', // Cookiebot
      '.optanon-alert-box-button-middle',                // OneTrust (old)
      '.call',                                            // Some custom implementations
      '.cookie-banner-accept',                           // Custom
      '.gdpr-accept',                                    // Custom
      '#cookie-accept',                                  // Custom
      '.accept-cookies',                                 // Custom
      
      // Text-based matching (for buttons without specific classes)
      'button:contains("Accept")',
      'button:contains("I agree")',
      'button:contains("I Accept")',
      'button:contains("OK")',
      'button:contains("Got it")',
      'button:contains("Agree")',
      'button:contains("Allow all")',
      'button:contains("Accept all")',
      'button:contains("Continue")',
      'a:contains("Accept")',
      'a:contains("I agree")'
    ];
    
    this.bannerContainerSelectors = [
      '[id*="cookie" i]',
      '[class*="cookie" i]',
      '[id*="consent" i]',
      '[class*="consent" i]',
      '[id*="gdpr" i]',
      '[class*="gdpr" i]',
      '[role="dialog"][aria-label*="cookie" i]',
      '[role="dialog"][aria-label*="consent" i]',
      '.cookie-banner',
      '.consent-banner',
      '#cookie-bar',
      '#cookie-notice'
    ];
    
    this.dismissalAttempts = 0;
    this.maxAttempts = 3;
  }
  
  /**
   * Main method to dismiss all cookie banners
   * @returns {boolean} True if any banner was dismissed
   */
  async dismissBanners() {
    console.log('🍪 Cookie Banner Handler: Starting banner detection and dismissal');
    
    let dismissed = false;
    
    // Try clicking accept buttons
    dismissed = await this.clickAcceptButtons();
    
    // If no button found, try to hide overlays
    if (!dismissed) {
      dismissed = this.hideOverlays();
    }
    
    // Set up observer for late-loading banners
    this.observeForLateBanners();
    
    if (dismissed) {
      console.log('✅ Cookie banner(s) successfully dismissed');
    } else {
      console.log('ℹ️ No cookie banners detected (or already dismissed)');
    }
    
    return dismissed;
  }
  
  /**
   * Try to click accept buttons
   */
  async clickAcceptButtons() {
    let dismissed = false;
    
    for (const selector of this.selectors) {
      const button = this.findButton(selector);
      
      if (button && this.isVisible(button) && !button.hasAttribute('data-cookie-dismissed')) {
        try {
          console.log(`🍪 Clicking cookie banner button: ${selector}`);
          
          // Mark as clicked to avoid duplicates
          button.setAttribute('data-cookie-dismissed', 'true');
          
          // Try multiple click methods
          button.click();
          button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          
          dismissed = true;
          this.dismissalAttempts++;
          
          // Wait for banner to disappear
          await this.wait(500);
          
          // Check if banner is gone
          if (!this.isVisible(button)) {
            console.log(`✅ Cookie banner dismissed successfully using: ${selector}`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to click cookie button: ${selector}`, error);
        }
      }
    }
    
    return dismissed;
  }
  
  /**
   * Find button using selector (handles :contains() pseudo-selector)
   */
  findButton(selector) {
    // Handle :contains() pseudo-selector
    if (selector.includes(':contains(')) {
      const match = selector.match(/:contains\("([^"]+)"\)/);
      if (match) {
        const text = match[1];
        const tag = selector.split(':')[0];
        const elements = document.querySelectorAll(tag);
        
        return Array.from(elements).find(el => 
          el.textContent.toLowerCase().includes(text.toLowerCase()) &&
          this.isLikelyCookieButton(el)
        );
      }
    }
    
    // Standard querySelector
    return document.querySelector(selector);
  }
  
  /**
   * Check if element is likely a cookie consent button
   */
  isLikelyCookieButton(element) {
    const text = element.textContent.toLowerCase();
    const id = (element.id || '').toLowerCase();
    
    // Get className safely (might be SVG element)
    let className = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        className = element.className.toLowerCase();
      } else if (element.className.baseVal !== undefined) {
        className = element.className.baseVal.toLowerCase(); // SVG
      } else if (element.getAttribute) {
        className = (element.getAttribute('class') || '').toLowerCase();
      }
    }
    
    const cookieKeywords = ['cookie', 'consent', 'gdpr', 'privacy', 'accept', 'agree', 'allow'];
    
    return cookieKeywords.some(keyword => 
      text.includes(keyword) || 
      id.includes(keyword) || 
      className.includes(keyword)
    );
  }
  
  /**
   * Check if element is visible
   */
  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    
    return element.offsetParent !== null && 
           style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
  }
  
  /**
   * Hide cookie banner overlays (fallback method)
   */
  hideOverlays() {
    let hidden = false;
    
    for (const selector of this.bannerContainerSelectors) {
      const overlays = document.querySelectorAll(selector);
      
      for (const overlay of overlays) {
        const style = window.getComputedStyle(overlay);
        
        // Check if it's a fixed/absolute positioned overlay
        if ((style.position === 'fixed' || style.position === 'absolute') && 
            this.isVisible(overlay)) {
          
          console.log(`🍪 Hiding cookie banner overlay: ${selector}`);
          overlay.style.display = 'none';
          overlay.setAttribute('data-cookie-hidden', 'true');
          hidden = true;
        }
      }
    }
    
    return hidden;
  }
  
  /**
   * Set up MutationObserver to catch late-loading banners
   */
  observeForLateBanners() {
    if (this.observer) return; // Already observing
    
    this.observer = new MutationObserver(async (mutations) => {
      // Check if any cookie-related elements were added
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const id = (node.id || '').toLowerCase();
              // Safe className extraction (handle SVG elements)
              let className = '';
              if (node.className) {
                if (typeof node.className === 'string') {
                  className = node.className.toLowerCase();
                } else if (node.className.baseVal) {
                  className = node.className.baseVal.toLowerCase();
                } else if (node.getAttribute) {
                  className = (node.getAttribute('class') || '').toLowerCase();
                }
              }
              
              if (id.includes('cookie') || id.includes('consent') || id.includes('gdpr') ||
                  className.includes('cookie') || className.includes('consent') || className.includes('gdpr')) {
                
                console.log('🍪 Late-loading cookie banner detected, dismissing...');
                await this.wait(500); // Wait for banner to fully render
                await this.dismissBanners();
                break;
              }
            }
          }
        }
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('👀 Observing for late-loading cookie banners');
  }
  
  /**
   * Stop observing (cleanup)
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log('🛑 Stopped observing for cookie banners');
    }
  }
  
  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-run on page load
(async () => {
  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const handler = new CookieBannerHandler();
  await handler.dismissBanners();
  
  // Make available globally
  window.cookieBannerHandler = handler;
})();

console.log('🍪 Cookie Banner Handler loaded');
