chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INTELLIGENT SAMPLER SCRIPT LOADING ==='});

if (typeof window.IntelligentSampler === 'undefined') {
class IntelligentSampler {
  constructor(config = {}) {
    this.similarityThreshold = config.similarityThreshold || 0.85;
    this.samplingRules = {
      'product-list': { maxItems: 3, strategy: 'random' },
      'pagination': { maxItems: 2, strategy: 'first-last' },
      'search-results': { maxItems: 5, strategy: 'diverse' },
      'blog-posts': { maxItems: 2, strategy: 'recent' },
      'infinite-scroll': { maxItems: 5, strategy: 'progressive' }
    };
    this.seenPatterns = new Map();
    this.sampleCache = new Map();
    this.enabled = false;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Initialized with ${this.similarityThreshold} similarity threshold`});
  }

  enable() {
    this.enabled = true;
    this.seenPatterns.clear();
    this.sampleCache.clear();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Intelligent Sampler: Enabled'});
  }

  disable() {
    this.enabled = false;
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Intelligent Sampler: Disabled'});
  }

  shouldSample(url, content, metadata = {}) {
    if (!this.enabled) return true;

    try {
      // Detect pattern type
      const pattern = this.detectPattern(url, content);
      if (!pattern) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: No pattern detected for ${url} - allowing crawl`});
        return true;
      }

      // Check if we've seen this pattern before
      if (!this.seenPatterns.has(pattern)) {
        this.seenPatterns.set(pattern, []);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: New pattern detected: ${pattern}`});
      }

      const existingSamples = this.seenPatterns.get(pattern);
      const rule = this.samplingRules[pattern] || { maxItems: 3, strategy: 'random' };

      // Check if we've reached the limit for this pattern
      if (existingSamples.length >= rule.maxItems) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Pattern ${pattern} limit reached (${rule.maxItems}) - skipping ${url}`});
        return false;
      }

      // Check similarity with existing samples
      const contentHash = this.generateContentHash(content);
      for (const sample of existingSamples) {
        const similarity = this.calculateSimilarity(contentHash, sample.hash);
        if (similarity > this.similarityThreshold) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: High similarity (${similarity.toFixed(2)}) detected - skipping ${url}`});
          return false;
        }
      }

      // Add to samples
      existingSamples.push({
        url: url,
        hash: contentHash,
        timestamp: Date.now(),
        metadata: metadata
      });

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Added sample for ${pattern} - ${existingSamples.length}/${rule.maxItems}`});
      return true;

    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Error in shouldSample: ${error.message}`});
      return true; // Default to allowing crawl on error
    }
  }

  detectPattern(url, content) {
    try {
      const urlLower = url.toLowerCase();
      const contentLower = content.toLowerCase();

      // Product list detection
      if (urlLower.includes('product') || urlLower.includes('item') || 
          contentLower.includes('add to cart') || contentLower.includes('price') ||
          contentLower.includes('buy now')) {
        return 'product-list';
      }

      // Pagination detection
      if (urlLower.includes('page') || urlLower.includes('p=') || 
          contentLower.includes('next page') || contentLower.includes('page 1 of')) {
        return 'pagination';
      }

      // Search results detection
      if (urlLower.includes('search') || urlLower.includes('q=') ||
          contentLower.includes('search results') || contentLower.includes('found')) {
        return 'search-results';
      }

      // Blog posts detection
      if (urlLower.includes('blog') || urlLower.includes('post') ||
          contentLower.includes('posted on') || contentLower.includes('author')) {
        return 'blog-posts';
      }

      // Infinite scroll detection
      if (contentLower.includes('load more') || contentLower.includes('infinite') ||
          contentLower.includes('scroll to load')) {
        return 'infinite-scroll';
      }

      return null;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Error detecting pattern: ${error.message}`});
      return null;
    }
  }

  calculateSimilarity(hash1, hash2) {
    try {
      // Use Jaccard similarity on feature sets
      const features1 = this.extractFeatures(hash1);
      const features2 = this.extractFeatures(hash2);

      const intersection = new Set([...features1].filter(x => features2.has(x)));
      const union = new Set([...features1, ...features2]);

      return intersection.size / union.size;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Error calculating similarity: ${error.message}`});
      return 0;
    }
  }

  generateContentHash(content) {
    try {
      // Extract key structural features for comparison
      const features = {
        linkCount: (content.match(/<a[^>]*>/gi) || []).length,
        formCount: (content.match(/<form[^>]*>/gi) || []).length,
        inputCount: (content.match(/<input[^>]*>/gi) || []).length,
        buttonCount: (content.match(/<button[^>]*>/gi) || []).length,
        imageCount: (content.match(/<img[^>]*>/gi) || []).length,
        divCount: (content.match(/<div[^>]*>/gi) || []).length,
        classCount: (content.match(/class="[^"]*"/gi) || []).length,
        idCount: (content.match(/id="[^"]*"/gi) || []).length,
        textLength: content.length,
        wordCount: content.split(/\s+/).length
      };

      return JSON.stringify(features);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Intelligent Sampler: Error generating hash: ${error.message}`});
      return content.substring(0, 1000); // Fallback to truncated content
    }
  }

  extractFeatures(hash) {
    try {
      const features = JSON.parse(hash);
      return new Set(Object.keys(features).map(key => `${key}:${features[key]}`));
    } catch (error) {
      // If not JSON, treat as string and extract words
      return new Set(hash.toLowerCase().split(/\s+/).slice(0, 50));
    }
  }

  getMetrics() {
    if (!this.enabled) return {};

    const metrics = {
      enabled: this.enabled,
      similarityThreshold: this.similarityThreshold,
      patterns: {},
      totalSamples: 0,
      totalSkipped: 0
    };

    for (const [pattern, samples] of this.seenPatterns) {
      const rule = this.samplingRules[pattern] || { maxItems: 3 };
      metrics.patterns[pattern] = {
        samples: samples.length,
        maxAllowed: rule.maxItems,
        strategy: rule.strategy,
        urls: samples.map(s => s.url)
      };
      metrics.totalSamples += samples.length;
    }

    return metrics;
  }

  clearCache() {
    this.seenPatterns.clear();
    this.sampleCache.clear();
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Intelligent Sampler: Cache cleared'});
  }
}

window.IntelligentSampler = IntelligentSampler;
}
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== INTELLIGENT SAMPLER SCRIPT LOADED ==='});
