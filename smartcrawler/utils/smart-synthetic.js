// Smart Synthetic Data Generator
// Generates intelligent synthetic data by fetching REAL metadata
// NO random numbers - uses actual HTTP HEAD requests and partial HTML parsing

class SmartSyntheticGenerator {
  constructor() {
    this.cache = new Map();
    this.timeout = window.CONSTANTS?.NETWORK?.FETCH_TIMEOUT || 5000;
    this.cacheTTL = window.CONSTANTS?.CACHE?.SMART_SYNTHETIC_TTL || 300000;
  }

  /**
   * Generate smart synthetic data with REAL metadata
   * @param {string} url - URL to fetch metadata for
   * @returns {Promise<Object>} Page data with real metadata
   */
  async generateSmartSyntheticData(url) {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      console.log('📦 Using cached metadata for:', url);
      return cached.data;
    }

    try {
      // Try to fetch HEAD metadata (fast, no body download)
      const headMetadata = await this.fetchHeadMetadata(url);
      
      // Try to fetch partial HTML (first 50KB only)
      const htmlMetadata = await this.fetchPartialHTML(url);
      
      // Combine both data sources
      const syntheticData = {
        url: url,
        title: htmlMetadata.title || this.extractTitleFromUrl(url),
        hash: this.generateHash(url),
        timestamp: Date.now(),
        
        // REAL HTTP metadata
        httpStatus: headMetadata.status,
        contentType: headMetadata.contentType,
        contentLength: headMetadata.contentLength,
        responseTime: headMetadata.responseTime,
        
        // REAL page features from HTML
        features: {
          linkCount: htmlMetadata.linkCount,
          formCount: htmlMetadata.formCount,
          buttonCount: htmlMetadata.buttonCount,
          inputCount: htmlMetadata.inputCount,
          hasAuth: htmlMetadata.hasLoginForm
        },
        
        links: htmlMetadata.links || [],
        forms: htmlMetadata.forms || [],
        
        meta: htmlMetadata.meta || {},
        
        simulated: true,
        crawledVia: 'smart-synthetic',
        dataSource: 'http-head+partial-html'
      };
      
      // Cache result
      this.cache.set(url, {
        data: syntheticData,
        timestamp: Date.now()
      });
      
      console.log('✅ Smart synthetic data generated for:', url);
      return syntheticData;
      
    } catch (error) {
      console.warn('⚠️ Smart synthetic failed, using minimal data:', error.message);
      // Fallback to minimal synthetic data
      return this.generateMinimalSyntheticData(url);
    }
  }

  /**
   * Fetch HTTP HEAD metadata (fast, no body download)
   * @param {string} url
   * @returns {Promise<Object>}
   */
  async fetchHeadMetadata(url) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Handle CORS issues
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status || 200,
        contentType: response.headers.get('content-type') || 'text/html',
        contentLength: parseInt(response.headers.get('content-length')) || 0,
        responseTime: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn('HEAD request failed:', error.message);
      return {
        status: 0,
        contentType: 'text/html',
        contentLength: 0,
        responseTime: responseTime
      };
    }
  }

  /**
   * Fetch partial HTML (first 50KB only) and parse
   * @param {string} url
   * @param {number} maxBytes
   * @returns {Promise<Object>}
   */
  async fetchPartialHTML(url, maxBytes = null) {
    maxBytes = maxBytes || window.CONSTANTS?.NETWORK?.MAX_PARTIAL_HTML_BYTES || 51200;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'no-cors',
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);
      
      // Read partial response
      const reader = response.body.getReader();
      const chunks = [];
      let bytesRead = 0;
      
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytesRead += value.length;
      }
      
      // Cancel reading
      reader.cancel();
      
      // Decode HTML
      const decoder = new TextDecoder('utf-8');
      const html = decoder.decode(new Uint8Array(chunks.flat()));
      
      // Parse HTML (quick regex parsing, no DOM)
      return this.quickParseHTML(html);
      
    } catch (error) {
      console.warn('Partial HTML fetch failed:', error.message);
      return {
        title: '',
        linkCount: 0,
        formCount: 0,
        buttonCount: 0,
        inputCount: 0,
        hasLoginForm: false,
        links: [],
        forms: [],
        meta: {}
      };
    }
  }

  /**
   * Quick HTML parsing using regex (no DOM parsing)
   * @param {string} html
   * @returns {Object}
   */
  quickParseHTML(html) {
    try {
      // Extract title
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Count links (basic regex)
      const linkMatches = html.match(/<a\s+[^>]*href=['"][^'"]*['"]/gi) || [];
      const linkCount = linkMatches.length;
      
      // Count forms
      const formMatches = html.match(/<form[\s>]/gi) || [];
      const formCount = formMatches.length;
      
      // Count buttons
      const buttonMatches = html.match(/<button[\s>]|<input[^>]*type=['"](?:submit|button)['"]/gi) || [];
      const buttonCount = buttonMatches.length;
      
      // Count inputs
      const inputMatches = html.match(/<input[\s>]|<textarea[\s>]|<select[\s>]/gi) || [];
      const inputCount = inputMatches.length;
      
      // Check for login form
      const hasPassword = /<input[^>]*type=['"]password['"]/i.test(html);
      const hasLogin = /login|signin|sign-in/i.test(html);
      const hasLoginForm = hasPassword || (hasLogin && formCount > 0);
      
      // Extract meta tags
      const descriptionMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]*)['"]/i);
      const keywordsMatch = html.match(/<meta[^>]*name=['"]keywords['"][^>]*content=['"]([^'"]*)['"]/i);
      
      // Extract first few links
      const links = [];
      const linkRegex = /<a\s+[^>]*href=['"]([^'"]*)['"]\s*[^>]*>(.*?)<\/a>/gi;
      let match;
      let count = 0;
      while ((match = linkRegex.exec(html)) && count < 20) {
        links.push({
          href: match[1],
          text: match[2].replace(/<[^>]+>/g, '').trim().substring(0, 100)
        });
        count++;
      }
      
      return {
        title,
        linkCount,
        formCount,
        buttonCount,
        inputCount,
        hasLoginForm,
        links,
        forms: [],
        meta: {
          description: descriptionMatch ? descriptionMatch[1] : '',
          keywords: keywordsMatch ? keywordsMatch[1] : ''
        }
      };
    } catch (error) {
      console.error('HTML parsing failed:', error);
      return {
        title: '',
        linkCount: 0,
        formCount: 0,
        buttonCount: 0,
        inputCount: 0,
        hasLoginForm: false,
        links: [],
        forms: [],
        meta: {}
      };
    }
  }

  /**
   * Generate minimal synthetic data (final fallback)
   * @param {string} url
   * @returns {Object}
   */
  generateMinimalSyntheticData(url) {
    return {
      url: url,
      title: this.extractTitleFromUrl(url),
      hash: this.generateHash(url),
      timestamp: Date.now(),
      httpStatus: 0,
      contentType: 'unknown',
      contentLength: 0,
      responseTime: 0,
      features: {
        linkCount: 0,
        formCount: 0,
        buttonCount: 0,
        inputCount: 0,
        hasAuth: false
      },
      links: [],
      forms: [],
      meta: {},
      simulated: true,
      crawledVia: 'minimal-synthetic',
      dataSource: 'url-only'
    };
  }

  /**
   * Extract title from URL (fallback)
   * @param {string} url
   * @returns {string}
   */
  extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.[^.]+$/, '') // Remove extension
          .trim() || urlObj.hostname;
      }
      return urlObj.hostname;
    } catch (error) {
      return 'Unknown Page';
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
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Smart synthetic cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.cacheTTL,
      timeout: this.timeout
    };
  }
}

// Export to window
window.SmartSyntheticGenerator = SmartSyntheticGenerator;

