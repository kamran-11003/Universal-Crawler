// Iframe-Based Crawler for Same-Origin Pages
// Avoids navigation issues by loading pages in hidden iframes

class IframeCrawler {
  constructor() {
    this.maxConcurrent = window.CONSTANTS?.IFRAME?.MAX_CONCURRENT || 3;
    this.activeIframes = new Map();
    this.timeout = window.CONSTANTS?.IFRAME?.TIMEOUT || 15000;
    this.stats = {
      total: 0,
      success: 0,
      failure: 0
    };
  }

  /**
   * Main crawling method - loads URL in hidden iframe and extracts data
   * @param {string} url - URL to crawl
   * @param {string} fromHash - Hash of parent page
   * @returns {Promise<Object>} Page data
   */
  async crawlViaIframe(url, fromHash) {
    this.stats.total++;
    
    // Check concurrent limit
    if (this.activeIframes.size >= this.maxConcurrent) {
      throw new Error(`Max concurrent iframes (${this.maxConcurrent}) reached`);
    }

    return new Promise((resolve, reject) => {
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = `${window.CONSTANTS?.IFRAME?.POSITION_TOP || -9999}px`;
      iframe.style.left = `${window.CONSTANTS?.IFRAME?.POSITION_LEFT || -9999}px`;
      iframe.style.width = `${window.CONSTANTS?.IFRAME?.WIDTH || 1}px`;
      iframe.style.height = `${window.CONSTANTS?.IFRAME?.HEIGHT || 1}px`;
      iframe.style.visibility = 'hidden';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      
      const iframeId = `iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      iframe.id = iframeId;
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.stats.failure++;
        this.cleanupIframe(iframe);
        reject(new Error(`Iframe load timeout after ${this.timeout}ms`));
      }, this.timeout);
      
      // Track active iframe
      this.activeIframes.set(iframeId, { iframe, timeoutId, url });
      
      // Load handler
      iframe.onload = async () => {
        try {
          clearTimeout(timeoutId);
          
          // Wait a bit for dynamic content
          await new Promise(r => setTimeout(r, window.CONSTANTS?.IFRAME?.STABILIZATION_DELAY || 1000));
          
          // Inject data extraction script
          await this.injectScriptsToIframe(iframe);
          
          // Capture state
          const pageData = await this.captureIframeState(iframe, url);
          
          this.stats.success++;
          this.cleanupIframe(iframe);
          resolve(pageData);
        } catch (error) {
          this.stats.failure++;
          this.cleanupIframe(iframe);
          reject(error);
        }
      };
      
      // Error handler
      iframe.onerror = () => {
        clearTimeout(timeoutId);
        this.stats.failure++;
        this.cleanupIframe(iframe);
        reject(new Error('Iframe failed to load'));
      };
      
      // Append and load
      document.body.appendChild(iframe);
      iframe.src = url;
    });
  }

  /**
   * Inject inline data extraction script into iframe
   * @param {HTMLIFrameElement} iframe
   */
  async injectScriptsToIframe(iframe) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Create inline script to avoid CSP issues
      const script = iframeDoc.createElement('script');
      script.textContent = `
        (function() {
          // FNV-1a hash function
          function generateHash(str) {
            let hash = 2166136261;
            for (let i = 0; i < str.length; i++) {
              hash ^= str.charCodeAt(i);
              hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
            }
            return (hash >>> 0).toString(36);
          }

          // Extract page data
          window.__crawlerData = {
            url: window.location.href,
            title: document.title || 'Untitled',
            hash: generateHash(window.location.href),
            timestamp: Date.now(),
            features: {
              linkCount: document.querySelectorAll('a[href]').length,
              formCount: document.querySelectorAll('form').length,
              buttonCount: document.querySelectorAll('button, input[type="submit"], input[type="button"]').length,
              inputCount: document.querySelectorAll('input, textarea, select').length,
              imageCount: document.querySelectorAll('img').length,
              hasAuth: !!(
                document.querySelector('input[type="password"]') ||
                document.querySelector('input[name*="password"]') ||
                document.querySelector('[href*="login"]') ||
                document.querySelector('[href*="signin"]')
              )
            },
            links: Array.from(document.querySelectorAll('a[href]')).slice(0, 100).map(a => ({
              href: a.href,
              text: (a.textContent || a.innerText || '').trim().substring(0, 100),
              rel: a.rel,
              target: a.target
            })),
            forms: Array.from(document.querySelectorAll('form')).map(f => ({
              action: f.action,
              method: f.method || 'GET',
              inputCount: f.querySelectorAll('input, textarea, select').length,
              hasPassword: !!f.querySelector('input[type="password"]')
            })),
            meta: {
              description: document.querySelector('meta[name="description"]')?.content || '',
              keywords: document.querySelector('meta[name="keywords"]')?.content || '',
              viewport: document.querySelector('meta[name="viewport"]')?.content || ''
            },
            simulated: false,
            crawledVia: 'iframe'
          };
        })();
      `;
      
      iframeDoc.body.appendChild(script);
      
      // Wait for script to execute
      await new Promise(r => setTimeout(r, window.CONSTANTS?.IFRAME?.SCRIPT_EXECUTION_DELAY || 100));
      
      return true;
    } catch (error) {
      console.error('Failed to inject scripts to iframe:', error);
      throw error;
    }
  }

  /**
   * Extract captured state from iframe
   * @param {HTMLIFrameElement} iframe
   * @param {string} url
   * @returns {Object} Page data
   */
  async captureIframeState(iframe, url) {
    try {
      const iframeWindow = iframe.contentWindow;
      
      if (!iframeWindow.__crawlerData) {
        throw new Error('Crawler data not found in iframe');
      }
      
      return iframeWindow.__crawlerData;
    } catch (error) {
      console.error('Failed to capture iframe state:', error);
      // Return minimal data
      return {
        url: url,
        title: 'Error: Could not extract data',
        hash: this.generateHash(url),
        timestamp: Date.now(),
        features: {
          linkCount: 0,
          formCount: 0,
          buttonCount: 0,
          inputCount: 0,
          imageCount: 0,
          hasAuth: false
        },
        links: [],
        forms: [],
        meta: {},
        simulated: true,
        crawledVia: 'iframe-failed',
        error: error.message
      };
    }
  }

  /**
   * Remove iframe from DOM and clean up
   * @param {HTMLIFrameElement} iframe
   */
  cleanupIframe(iframe) {
    try {
      const iframeId = iframe.id;
      
      // Clear timeout if exists
      const iframeData = this.activeIframes.get(iframeId);
      if (iframeData && iframeData.timeoutId) {
        clearTimeout(iframeData.timeoutId);
      }
      
      // Remove from tracking
      this.activeIframes.delete(iframeId);
      
      // Remove from DOM
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    } catch (error) {
      console.error('Failed to cleanup iframe:', error);
    }
  }

  /**
   * Generate FNV-1a hash
   * @param {string} str
   * @returns {string}
   */
  generateHash(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  /**
   * Get success rate statistics
   * @returns {Object}
   */
  getStats() {
    const successRate = this.stats.total > 0 
      ? ((this.stats.success / this.stats.total) * 100).toFixed(1) 
      : '0.0';
    
    return {
      total: this.stats.total,
      success: this.stats.success,
      failure: this.stats.failure,
      successRate: successRate + '%',
      activeIframes: this.activeIframes.size
    };
  }

  /**
   * Clean up all active iframes
   */
  cleanupAll() {
    for (const [iframeId, data] of this.activeIframes.entries()) {
      this.cleanupIframe(data.iframe);
    }
  }
}

// Export to window
window.IframeCrawler = IframeCrawler;

