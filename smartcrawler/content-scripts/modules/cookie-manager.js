chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Cookie Manager: Class registering globally'});

if (typeof window.CookieManager === 'undefined') {
class CookieManager {
  constructor() {
    this.cookies = [];
    this.enabled = false;
    this.cookieWatcherInterval = null;
    this.previousCookieString = '';
  }

  initialize() {
    this.analyzeCookies();
    this.setupCookieWatcher();
  }

  analyzeCookies() {
    try {
      const cookieString = document.cookie;
      const cookieArray = cookieString.split(';').filter(c => c.trim());
      
      this.cookies = cookieArray.map(cookie => {
        const trimmedCookie = cookie.trim();
        const [name, ...valueParts] = trimmedCookie.split('=');
        const value = valueParts.join('='); // Handle values that might contain '='
        
        return {
          name: name,
          value: value,
          domain: window.location.hostname,
          path: '/',
          secure: window.location.protocol === 'https:',
          httpOnly: false, // Can't detect from document.cookie
          sameSite: 'Lax', // Default assumption
          timestamp: Date.now(),
          size: trimmedCookie.length
        };
      });
    } catch (error) {
      console.warn('Cookie analysis failed:', error);
      this.cookies = [];
    }
  }

  setupCookieWatcher() {
    // Poll for cookie changes (since we can't directly watch document.cookie)
    this.cookieWatcherInterval = setInterval(() => {
      if (this.enabled) {
        this.checkForCookieChanges();
      }
    }, 1000);
  }

  checkForCookieChanges() {
    const currentCookieString = document.cookie;
    
    if (currentCookieString !== this.previousCookieString) {
      this.analyzeCookies();
      this.emitCookieChange();
      this.previousCookieString = currentCookieString;
    }
  }

  emitCookieChange() {
    window.dispatchEvent(new CustomEvent('cookie-change', {
      detail: this.cookies
    }));
  }

  checkPrivacyCompliance() {
    const secureCookies = this.cookies.filter(c => c.secure).length;
    const thirdPartyCookies = this.cookies.filter(c => !c.domain.includes(window.location.hostname)).length;
    
    return {
      totalCookies: this.cookies.length,
      secureCookies: secureCookies,
      thirdPartyCookies: thirdPartyCookies,
      complianceIssues: this.identifyComplianceIssues(),
      hasConsentBanner: this.hasConsentBanner()
    };
  }

  identifyComplianceIssues() {
    const issues = [];
    
    // Check for consent banner
    if (this.cookies.length > 0 && !this.hasConsentBanner()) {
      issues.push('No cookie consent banner detected');
    }
    
    // Check for insecure cookies on HTTPS
    if (window.location.protocol === 'https:') {
      const insecureCookies = this.cookies.filter(c => !c.secure);
      if (insecureCookies.length > 0) {
        issues.push(`${insecureCookies.length} cookies not using secure flag`);
      }
    }
    
    // Check for third-party cookies
    const thirdPartyCookies = this.cookies.filter(c => !c.domain.includes(window.location.hostname));
    if (thirdPartyCookies.length > 0) {
      issues.push(`${thirdPartyCookies.length} third-party cookies detected`);
    }
    
    return issues;
  }

  hasConsentBanner() {
    // Simple detection for cookie consent banners
    const bannerSelectors = [
      '[class*="cookie"]', '[id*="cookie"]',
      '[class*="consent"]', '[id*="consent"]',
      '[class*="gdpr"]', '[id*="gdpr"]',
      '[class*="privacy"]', '[id*="privacy"]',
      '[class*="accept"]', '[id*="accept"]'
    ];
    
    return bannerSelectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (error) {
        return false;
      }
    });
  }

  getCookiesByDomain(domain) {
    return this.cookies.filter(c => c.domain.includes(domain));
  }

  getCookiesByType(type) {
    // Simple cookie type detection based on name patterns
    const patterns = {
      session: ['session', 'sid', 'jsessionid'],
      authentication: ['auth', 'token', 'jwt', 'login'],
      tracking: ['_ga', '_gid', '_fbp', '_gcl'],
      preferences: ['pref', 'setting', 'config']
    };
    
    return this.cookies.filter(cookie => {
      const name = cookie.name.toLowerCase();
      return patterns[type]?.some(pattern => name.includes(pattern)) || false;
    });
  }

  getCookies() {
    return this.cookies;
  }

  getMetrics() {
    const compliance = this.checkPrivacyCompliance();
    const sessionCookies = this.getCookiesByType('session');
    const authCookies = this.getCookiesByType('authentication');
    const trackingCookies = this.getCookiesByType('tracking');
    
    return {
      cookies: this.cookies,
      compliance: compliance,
      categories: {
        session: sessionCookies.length,
        authentication: authCookies.length,
        tracking: trackingCookies.length,
        other: this.cookies.length - sessionCookies.length - authCookies.length - trackingCookies.length
      },
      totalSize: this.cookies.reduce((sum, c) => sum + c.size, 0)
    };
  }

  getCookieValue(name) {
    const cookie = this.cookies.find(c => c.name === name);
    return cookie ? cookie.value : null;
  }

  enable() {
    this.enabled = true;
    this.initialize();
  }

  disable() {
    this.enabled = false;
    
    if (this.cookieWatcherInterval) {
      clearInterval(this.cookieWatcherInterval);
      this.cookieWatcherInterval = null;
    }
  }
}

window.CookieManager = CookieManager;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Cookie Manager: Class registered globally'});
}
