// SmartCrawler Build Script
// Creates concatenated bundles (no complex bundling to avoid chrome extension issues)

const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'smartcrawler', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('🔨 SmartCrawler Build Starting...\n');

// Helper function to concatenate files
function concatenateFiles(files, outputFile, description) {
  console.log(`📦 Creating: ${description}`);
  
  let concatenated = '';
  for (const file of files) {
    const filePath = path.join(__dirname, 'smartcrawler', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      concatenated += `\n// ========== ${file} ==========\n`;
      concatenated += content;
      concatenated += `\n// ========== END ${file} ==========\n\n`;
    } else {
      console.warn(`  ⚠️  File not found: ${file}`);
    }
  }
  
  const outputPath = path.join(distDir, outputFile);
  fs.writeFileSync(outputPath, concatenated, 'utf8');
  console.log(`  ✅ ${outputFile} created (${Math.round(concatenated.length / 1024)}KB)\n`);
}

// Bundle 1: Utils Bundle (Critical utilities loaded first)
concatenateFiles([
  'config/constants.js',
  'utils/logger.js',
  'utils/helpers.js',
  'utils/enhanced-helpers.js',
  'utils/adaptive-timer.js',
  'utils/shadow-dom-helper.js',            // NEW: Shadow DOM support
  'utils/human-behavior-simulator.js',     // NEW: Bot detection evasion
  'content-scripts/dom-hasher.js',
  'content-scripts/state-graph.js'
], 'utils-bundle.js', 'Utils Bundle (constants, logger, helpers, shadow DOM)');

// Bundle 2: Crawler Core Bundle
concatenateFiles([
  'utils/smart-synthetic.js',
  'utils/iframe-crawler.js',
  'content-scripts/auth-handler.js',
  'content-scripts/universal-event-detector.js',
  'content-scripts/universal-form-handler.js',
  'content-scripts/handlers/react-form-handler.js'
], 'crawler-core-bundle.js', 'Crawler Core Bundle (smart synthetic, iframe, auth, forms)');

// Bundle 3: Advanced Modules Bundle
concatenateFiles([
  'utils/intelligent-sampler.js',
  'utils/stability-detector.js',
  'utils/error-handler.js',
  'utils/performance-optimizer.js',
  'utils/data-sanitizer.js',
  'utils/input-validator.js',
  'utils/security-validator.js',
  'utils/secure-storage.js',
  'utils/security-manager.js',
  'content-scripts/modules/api-interceptor.js',        // NEW: API endpoint discovery
  'content-scripts/modules/deep-link-extractor.js',    // NEW: Enhanced link discovery
  'content-scripts/modules/cookie-banner-handler.js',  // NEW: Cookie banner dismissal
  'content-scripts/modules/security-challenge-handler.js', // NEW: reCAPTCHA/2FA detection
  'content-scripts/modules/action-simulator.js',       // NEW: Interactive element testing
  'content-scripts/modules/interactive-element-discoverer.js', // NEW: Find draggable, resizable, etc.
  'content-scripts/modules/state-verifier.js',         // NEW: State change validation
  'content-scripts/modules/network-monitor.js',
  'content-scripts/modules/storage-analyzer.js',
  'content-scripts/modules/websocket-detector.js',
  'content-scripts/modules/cookie-manager.js',
  'content-scripts/modules/spa-detector.js',
  'content-scripts/modules/modal-detector.js',
  'content-scripts/modules/performance-monitor.js',
  'content-scripts/modules/accessibility-analyzer.js',
  'content-scripts/modules/heatmap-collector.js',
  'content-scripts/modules/funnel-analyzer.js',
  'content-scripts/modules/journey-mapper.js',
  'content-scripts/modules/report-generator.js'
], 'modules-bundle.js', 'Advanced Modules Bundle (API, links, security, interaction testing, analytics)');

console.log('✅ Build Complete! 33+ files → 3 bundles');
console.log('\n📊 Bundle Summary:');
console.log('  - utils-bundle.js: Constants, Logger, Helpers, Shadow DOM, Human Behavior');
console.log('  - crawler-core-bundle.js: Smart Synthetic, Iframe, Auth, Forms');
console.log('  - modules-bundle.js: API Interceptor, Deep Links, Security Challenges, Interaction Testing, Analytics');
console.log('\n💡 Next: Load extension and test script injection time (target: <500ms)');
console.log('\n🆕 New Features:');
console.log('  ✅ API Interceptor - Captures all fetch/XHR/WebSocket calls');
console.log('  ✅ Deep Link Extractor - Finds React/Vue routes + hidden links');
console.log('  ✅ Cookie Banner Handler - Auto-dismisses GDPR banners');
console.log('  ✅ Security Challenge Handler - Prompts user for reCAPTCHA/2FA');
console.log('  ✅ Shadow DOM Support - Searches web components');
console.log('  ✅ Human Behavior Simulator - Evades bot detection');
console.log('  ✅ Enhanced Validation Extraction - Captures all client-side rules');
console.log('  ✅ Action Simulator - Drag-drop, hover, double-click, right-click, resize');
console.log('  ✅ Interactive Element Discoverer - Finds draggable, droppable, resizable, selectable elements');
console.log('  ✅ State Verifier - Validates element state changes after interactions');

