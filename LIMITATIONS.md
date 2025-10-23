# SmartCrawler - Known Limitations & Constraints

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Status**: Production-Ready with Known Constraints

---

## 📋 Table of Contents
1. [Browser & Environment Limitations](#browser--environment-limitations)
2. [Security & Policy Restrictions](#security--policy-restrictions)
3. [Performance & Resource Constraints](#performance--resource-constraints)
4. [Detection & Analysis Limitations](#detection--analysis-limitations)
5. [Network & Communication Constraints](#network--communication-constraints)
6. [Framework & Technology Limitations](#framework--technology-limitations)
7. [Ethical & Legal Boundaries](#ethical--legal-boundaries)

---

## 🌐 Browser & Environment Limitations

### Chrome-Only Extension
**Limitation**: SmartCrawler is built exclusively for Google Chrome (Manifest V3)

**Impact**:
- ❌ Firefox: Not compatible (uses different manifest format)
- ❌ Safari: Not compatible (uses different extension APIs)
- ❌ Edge: May work (Chromium-based) but not officially tested
- ❌ Opera: May work (Chromium-based) but not officially tested

**Reason**: Chrome Manifest V3 APIs (`chrome.scripting`, `chrome.storage.local`, offscreen documents)

**Workaround**: None (would require complete rewrite for other browsers)

---

### Manifest V3 Constraints
**Limitation**: Service worker-based architecture (no persistent background page)

**Impact**:
- ⚠️ Background script terminates after 5 minutes of inactivity
- ⚠️ Cannot hold long-lived connections (WebSockets, Server-Sent Events)
- ⚠️ Must use chrome.alarms for scheduled tasks (minimum 1-minute interval)
- ⚠️ Cannot use `eval()` or remote code execution

**Reason**: Chrome enforced Manifest V3 migration (V2 deprecated January 2023)

**Workaround**: Offscreen document (`offscreen.html`) for DOM parsing

---

### Content Security Policy (CSP)
**Limitation**: Cannot inject scripts on sites with strict CSP headers

**Impact**:
- ❌ GitHub: `script-src 'self'` blocks content scripts
- ❌ Google Services: Strict CSP prevents injection
- ❌ Banking Sites: Security policies block extensions
- ❌ Government Portals: High-security CSP configurations

**Error Message**: "Refused to execute inline script because it violates CSP"

**Workaround**: Extension must respect CSP (no bypass - ethical constraint)

**Example Sites That Block**:
```
github.com
accounts.google.com
*.bank.com
*.gov
```

---

### Same-Origin Policy
**Limitation**: Cannot access cross-origin iframes or content

**Impact**:
- ❌ Embedded maps (Google Maps, Mapbox)
- ❌ Payment processors (Stripe, PayPal iframes)
- ❌ Social media widgets (Facebook Like, Twitter Feed)
- ❌ Advertisement iframes (cross-origin ad networks)

**Reason**: Browser security model prevents cross-origin access

**Workaround**: Can only access same-origin iframes

**Example**:
```javascript
// ✅ Can access (same origin)
<iframe src="/embedded-form"></iframe>

// ❌ Cannot access (cross-origin)
<iframe src="https://external-site.com/widget"></iframe>
```

---

## 🔒 Security & Policy Restrictions

### CAPTCHA & Bot Detection
**Limitation**: SmartCrawler DOES NOT bypass CAPTCHA or bot detection

**Impact**:
- ❌ Google reCAPTCHA: Crawl stops at challenge page
- ❌ hCaptcha: Requires manual intervention
- ❌ Cloudflare Bot Management: May be blocked
- ❌ Imperva (Incapsula): May trigger rate limiting

**Ethical Stance**: We respect security measures

**Workaround**: Manual CAPTCHA solving (extension pauses, user solves, crawl resumes)

---

### Authentication & Credentials
**Limitation**: Limited authentication support

**Supported**:
- ✅ Form-based login (username/password)
- ✅ Session cookies (persisted in credential manager)
- ✅ Basic HTTP Auth (via popup)

**Not Supported**:
- ❌ OAuth 2.0 flows (requires redirect handling)
- ❌ SAML authentication (enterprise SSO)
- ❌ 2FA/MFA (time-based codes, SMS, authenticator apps)
- ❌ Biometric authentication (fingerprint, face ID)

**Workaround**: User must manually handle 2FA, then extension continues

---

### Rate Limiting & IP Blocking
**Limitation**: Extension cannot bypass server-side rate limiting

**Impact**:
- ⚠️ Too Many Requests (429): Crawl pauses, retries after delay
- ⚠️ IP Ban (403): Crawl stops, requires manual IP rotation
- ⚠️ Aggressive Firewall: May block all requests from detected bot

**Built-in Protection**:
```javascript
// Adaptive timing (1-3 seconds between requests)
Math.floor(Math.random() * 2000) + 1000

// Human behavior simulation (mouse movements, delays)
simulateHumanBehavior()
```

**Workaround**: Reduce `maxDepth` or increase delays in `constants.js`

---

## ⚡ Performance & Resource Constraints

### Memory Limitations
**Limitation**: Chrome extension memory limit (~1GB)

**Impact**:
- ⚠️ Large crawls (1000+ pages): May hit memory limit
- ⚠️ Memory leak: Unhandled promises accumulate
- ⚠️ Large forms (1000+ inputs): DOM parsing slows down

**Mitigation**:
```javascript
// Max depth cap (prevents infinite crawls)
maxDepth: 10

// Queue size limit (prevents memory explosion)
if (this.linkQueue.length > 1000) {
  console.warn("Queue limit reached, pausing crawl");
}
```

**Workaround**: Restart extension periodically (clears memory)

---

### Crawl Depth & Breadth
**Limitation**: Maximum crawl depth is 10 levels (configurable)

**Impact**:
- ⚠️ Deep sites (10+ levels): Won't be fully crawled
- ⚠️ Breadth-first approach: May prioritize shallow pages over deep ones

**Configuration**:
```javascript
// constants.js
maxDepth: 10 // Increase at your own risk (memory usage!)
```

**Example**:
```
Homepage (depth 0)
  ├─ Category (depth 1)
  │   ├─ Subcategory (depth 2)
  │   │   ├─ ... (depth 3-9)
  │   │   │   └─ Page (depth 10) ✅ CRAWLED
  │   │   │       └─ Child (depth 11) ❌ SKIPPED
```

---

### Crawl Speed
**Limitation**: Intentionally slow (1-3 seconds per page) to simulate human behavior

**Impact**:
- ⏱️ Large sites (100+ pages): May take 3-5 minutes
- ⏱️ Small sites (10-20 pages): Takes 30-60 seconds

**Why Slow?**:
- Respect server resources
- Avoid rate limiting
- Mimic human browsing patterns

**Not Configurable**: Speed is intentionally capped for ethical reasons

---

### Bundle Size
**Limitation**: Extension size is 537KB (uncompressed)

**Breakdown**:
- Core: 128KB (core-crawler.js)
- Modules: 348KB (all detection & analysis modules)
- Utils: 61KB (helpers, validators, simulators)

**Impact**:
- ⚠️ Chrome Web Store limit: 2GB (we're well under)
- ⚠️ Load time: ~200-500ms initial load
- ⚠️ Memory footprint: ~50-100MB base + crawl data

**Future**: May increase with new features (AI models, ML classification)

---

## 🔍 Detection & Analysis Limitations

### Checkbox Tree Detection
**Limitation**: Requires minimum structure for detection

**Requirements**:
- ✅ Minimum 2 checkboxes (otherwise not a "tree")
- ✅ Visible elements (hidden trees not detected)
- ✅ Nested structure (flat checkbox lists not considered trees)

**Edge Cases**:
```html
<!-- ❌ Not Detected: Single checkbox -->
<input type="checkbox"> Agree to terms

<!-- ❌ Not Detected: Flat list (no hierarchy) -->
<input type="checkbox"> Option 1
<input type="checkbox"> Option 2
<input type="checkbox"> Option 3

<!-- ✅ Detected: Nested structure -->
<ul>
  <li><input type="checkbox"> Parent
    <ul>
      <li><input type="checkbox"> Child</li>
    </ul>
  </li>
</ul>
```

**Workaround**: None (intentional design - we only care about hierarchical trees)

---

### Form Detection
**Limitation**: May miss dynamically generated forms

**Scenarios**:
- ⚠️ AJAX-loaded forms: Only detected if loaded before timeout
- ⚠️ JavaScript-generated forms: Requires mutation observer (implemented)
- ⚠️ Shadow DOM forms: Only detected if `mode: 'open'` (not `mode: 'closed'`)
- ⚠️ Modal forms: Detected if visible during crawl

**Mitigation**:
```javascript
// 30-second timeout for interactive testing
const INTERACTIVE_TESTING_TIMEOUT = 30000;

// Mutation observer watches for new forms
new MutationObserver(callback).observe(document.body, {
  childList: true,
  subtree: true
});
```

**False Positives**: Rare (deduplication handles most cases)

---

### SPA (Single Page Application) Detection
**Limitation**: Relies on framework signatures

**Supported Frameworks**:
- ✅ React (checks for `_reactRootContainer` or `__REACT_DEVTOOLS_GLOBAL_HOOK__`)
- ✅ Angular (checks for `ng-version` or `getAllAngularRootElements`)
- ✅ Vue (checks for `__VUE__` or `__VUE_DEVTOOLS_GLOBAL_HOOK__`)

**Not Detected**:
- ❌ Custom SPA frameworks (homegrown solutions)
- ❌ Svelte (no global markers)
- ❌ Preact (minimal footprint, hard to detect)
- ❌ Alpine.js (too lightweight)

**Impact**: May not apply SPA-specific timing strategies

---

### Shadow DOM
**Limitation**: Only `mode: 'open'` shadow roots are accessible

**Impact**:
```javascript
// ✅ Can access (open mode)
element.attachShadow({ mode: 'open' });

// ❌ Cannot access (closed mode)
element.attachShadow({ mode: 'closed' });
```

**Use Cases**:
- ✅ Web Components (usually open)
- ❌ Third-party widgets (often closed for security)

**Workaround**: None (browser security restriction)

---

## 🌐 Network & Communication Constraints

### Request Timeouts
**Limitation**: Fixed timeout values

**Timeouts**:
```javascript
// Interactive element testing
INTERACTIVE_TESTING_TIMEOUT: 30000 // 30 seconds

// Iframe loading
IFRAME_LOAD_TIMEOUT: 15000 // 15 seconds

// Fetch API requests
FETCH_TIMEOUT: 5000 // 5 seconds

// Mutation observer debounce
MUTATION_DEBOUNCE: 2000 // 2 seconds
```

**Impact**:
- ⚠️ Slow sites: May timeout before content loads
- ⚠️ Large forms: 30s may not be enough for complex interactions
- ⚠️ Iframes: 15s may be insufficient for heavy embeds

**Workaround**: Modify values in `constants.js` (increase at your own risk)

---

### API Interception
**Limitation**: Can only intercept requests made from page context

**Supported**:
- ✅ `fetch()` API (intercepted via window.fetch override)
- ✅ `XMLHttpRequest` (intercepted via XHR prototype)
- ✅ WebSocket connections (detected via WebSocket constructor)

**Not Supported**:
- ❌ Service Worker requests (runs in separate context)
- ❌ Browser-initiated requests (navigation, images, CSS)
- ❌ Cross-origin requests blocked by CORS

**Impact**: API analysis may be incomplete for complex apps

---

### WebSocket Monitoring
**Limitation**: Can detect but not intercept WebSocket messages

**What We Can Do**:
- ✅ Detect WebSocket connections
- ✅ Log connection URL
- ✅ Track connection state (open, closed)

**What We Cannot Do**:
- ❌ Read message contents (encrypted/binary data)
- ❌ Modify messages (no man-in-the-middle)
- ❌ Persist messages across page reloads

**Use Case**: Real-time apps (chat, live updates) are detected but not fully analyzed

---

## 🛠️ Framework & Technology Limitations

### Framework-Specific Issues

#### React
**Known Issues**:
- ⚠️ React 18 Concurrent Mode: May cause timing issues
- ⚠️ Server Components: Not detected (no client-side markers)
- ⚠️ React Native Web: Not supported

#### Vue
**Known Issues**:
- ⚠️ Vue 3 Teleport: May miss forms in teleported content
- ⚠️ Vue Composition API: No special handling (works with basic detection)

#### Angular
**Known Issues**:
- ⚠️ Lazy-loaded modules: Only detected after load
- ⚠️ Ahead-of-Time (AOT) compilation: Harder to detect

#### Other Frameworks
- ❌ Svelte: Not explicitly supported
- ❌ Ember.js: No special detection
- ❌ Backbone.js: Legacy framework, no support
- ❌ jQuery: Detected but no special handling

---

### CSS Frameworks
**Limitation**: No special handling for CSS frameworks

**Tested Frameworks**:
- ✅ Bootstrap: Works (standard HTML)
- ✅ Tailwind CSS: Works (utility classes don't affect detection)
- ✅ Material-UI: Works (React component library)
- ✅ Ant Design: Works (checkbox tree explicitly supported)

**Not Tested**:
- ⚠️ Bulma, Foundation, Semantic UI (should work but not verified)

---

## ⚖️ Ethical & Legal Boundaries

### Ethical Constraints
**What We Will NOT Do**:
1. ❌ **Bypass Security Measures**: No CAPTCHA solving, no rate limit evasion
2. ❌ **Exploit Vulnerabilities**: No SQL injection testing, no XSS detection
3. ❌ **Scrape Personal Data**: No PII collection (names, emails, SSNs)
4. ❌ **Violate Terms of Service**: User responsible for checking site ToS
5. ❌ **Automate Malicious Actions**: No spam, no DDoS, no brute force

**What We Do**:
- ✅ Simulate normal human browsing behavior
- ✅ Respect `robots.txt` (user should check manually)
- ✅ Rate limit ourselves (1-3 seconds per page)
- ✅ Identify as browser extension (User-Agent unchanged)

---

### Legal Disclaimer
**User Responsibility**:
- 🔴 YOU are responsible for using this tool legally and ethically
- 🔴 Check target site's Terms of Service before crawling
- 🔴 Obtain permission for pentesting or security audits
- 🔴 Do not use on sites you do not own or have permission to test
- 🔴 Respect copyright and data privacy laws (GDPR, CCPA)

**Developer Liability**:
- We provide this tool "AS IS" without warranty
- We are not liable for misuse or legal consequences
- Users must comply with all applicable laws

---

### Use Case Restrictions
**Intended Use Cases**:
- ✅ Personal website auditing (your own sites)
- ✅ QA testing (with employer permission)
- ✅ Academic research (public sites, educational purpose)
- ✅ Accessibility testing (WCAG compliance)

**Prohibited Use Cases**:
- ❌ Competitive intelligence (scraping competitor data)
- ❌ Unauthorized pentesting (without written permission)
- ❌ Data harvesting (collecting user data for resale)
- ❌ Automated trading (exploiting website functionality)

---

## 📊 Summary Table

| Category | Limitation | Impact | Workaround |
|----------|-----------|--------|------------|
| **Browser** | Chrome-only | ❌ No Firefox/Safari | None |
| **Manifest** | V3 Service Worker | ⚠️ 5-min timeout | Use offscreen doc |
| **Security** | No CAPTCHA bypass | ❌ Stops at CAPTCHA | Manual solving |
| **CSP** | Cannot inject on strict CSP | ❌ GitHub, banks | None (respect CSP) |
| **Memory** | ~1GB limit | ⚠️ Large crawls fail | Restart extension |
| **Depth** | Max 10 levels | ⚠️ Deep sites incomplete | Increase in config |
| **Speed** | 1-3 sec/page | ⏱️ Slow crawls | None (intentional) |
| **Checkbox Trees** | Min 2 checkboxes | ⚠️ Single checkbox skipped | None (by design) |
| **Forms** | Dynamic forms | ⚠️ May miss AJAX forms | 30s timeout helps |
| **Shadow DOM** | Closed mode | ❌ Cannot access | None (browser limit) |
| **Timeouts** | Fixed values | ⚠️ Slow sites timeout | Modify constants.js |
| **WebSocket** | No message reading | ⚠️ Can't analyze messages | None (security) |
| **Frameworks** | React/Vue/Angular only | ⚠️ Svelte not supported | Generic detection |

---

## 🔮 Future Improvements

**Planned Enhancements** (No ETA):
1. 🔄 Cross-browser support (Firefox, Safari) via WebExtensions Polyfill
2. 🤖 AI-powered form detection (TensorFlow.js model)
3. 📊 Better performance for 1000+ page crawls (streaming to disk)
4. 🔐 OAuth 2.0 flow support (handle redirects)
5. 📡 WebSocket message decryption (for testing environments)

**Not Planned**:
- ❌ CAPTCHA bypass (ethical constraint)
- ❌ IP rotation / proxy support (encourage ethical use)
- ❌ Automated exploitation (security risk)

---

## 📞 Support & Feedback

**Reporting Limitations**:
If you encounter a limitation not documented here, please:
1. Check if it's a bug or expected behavior
2. Review this document for known constraints
3. Report via GitHub Issues with:
   - Site URL (if public)
   - Browser version
   - Extension version
   - Console logs
   - Steps to reproduce

**Contact**:
- GitHub Issues: [Create Issue](https://github.com/yourusername/smartcrawler/issues)
- Email: Not available (use GitHub)

---

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Status**: Living document (updated as limitations discovered)

---

*This tool is designed for ethical web analysis and QA testing. Use responsibly and respect website terms of service.*
