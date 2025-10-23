// Offscreen Document for Persistent Crawling Context
// Uses Offscreen Document API (Chrome 109+) to maintain state across navigations

console.log('=== OFFSCREEN DOCUMENT INITIALIZING ===');

class OffscreenCrawler {
  constructor() {
    this.iframeCrawler = new IframeCrawler();
    this.status = 'idle'; // idle, crawling, error
    this.crawledCount = 0;
    
    this.updateStatus('ready');
    console.log('✅ Offscreen crawler initialized');
  }

  /**
   * Crawl a URL using the iframe crawler
   * @param {string} url - URL to crawl
   * @returns {Promise<Object>} Crawl result
   */
  async crawlURL(url) {
    try {
      this.updateStatus('crawling');
      console.log('🔄 Offscreen crawling:', url);
      
      const result = await this.iframeCrawler.crawlViaIframe(url, null);
      
      this.crawledCount++;
      this.updateCrawledCount();
      this.updateStatus('ready');
      
      console.log('✅ Offscreen crawl success:', url);
      return result;
    } catch (error) {
      console.error('❌ Offscreen crawl failed:', error);
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * Get crawler statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.iframeCrawler.getStats(),
      status: this.status,
      crawledCount: this.crawledCount
    };
  }

  /**
   * Update status display
   * @param {string} status
   */
  updateStatus(status) {
    this.status = status;
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }

  /**
   * Update crawled count display
   */
  updateCrawledCount() {
    const countEl = document.getElementById('crawled-count');
    if (countEl) {
      countEl.textContent = this.crawledCount;
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.iframeCrawler.cleanupAll();
    this.updateStatus('idle');
  }
}

// Initialize offscreen crawler
const offscreenCrawler = new OffscreenCrawler();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message.type);
  
  if (message.type === 'CRAWL_IN_OFFSCREEN') {
    // Handle crawl request
    offscreenCrawler.crawlURL(message.url)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Async response
  }
  
  if (message.type === 'GET_OFFSCREEN_STATS') {
    // Return statistics
    const stats = offscreenCrawler.getStats();
    sendResponse({ success: true, stats });
    return false; // Sync response
  }
  
  if (message.type === 'CLEANUP_OFFSCREEN') {
    // Cleanup resources
    offscreenCrawler.cleanup();
    sendResponse({ success: true });
    return false; // Sync response
  }
  
  return false;
});

console.log('✅ Offscreen document ready');

