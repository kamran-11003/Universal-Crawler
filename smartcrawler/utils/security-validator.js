chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURITY VALIDATOR SCRIPT LOADING ==='});

if (typeof window.SecurityValidator === 'undefined') {
class SecurityValidator {
  constructor(config = {}) {
    this.xssPatterns = [
      { name: 'scriptTag', pattern: /<script[^>]*>[\s\S]*?<\/script>/gi, severity: 'high' },
      { name: 'javascriptProtocol', pattern: /javascript:/gi, severity: 'high' },
      { name: 'eventHandler', pattern: /on\w+\s*=\s*["'][^"']*["']/gi, severity: 'medium' },
      { name: 'iframe', pattern: /<iframe[^>]*>/gi, severity: 'medium' },
      { name: 'eval', pattern: /eval\s*\(/gi, severity: 'high' },
      { name: 'expression', pattern: /expression\s*\(/gi, severity: 'medium' },
      { name: 'vbscript', pattern: /vbscript:/gi, severity: 'high' },
      { name: 'dataUrl', pattern: /data:\s*text\/html/gi, severity: 'medium' }
    ];
    
    this.dangerousTags = [
      'script', 'iframe', 'object', 'embed', 'applet', 
      'form', 'input', 'button', 'link', 'meta'
    ];
    
    this.dangerousAttributes = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect'
    ];
    
    this.enabled = false;
    this.threatsDetected = 0;
    this.csrfTokensGenerated = 0;
    this.cspChecks = 0;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SecurityValidator initialized with ' + this.xssPatterns.length + ' XSS patterns'});
  }

  detectXSS(content) {
    if (!this.enabled) return { safe: true, threats: [] };
    
    if (!content || typeof content !== 'string') {
      return { safe: true, threats: [] };
    }
    
    const threats = [];
    let totalThreats = 0;
    
    this.xssPatterns.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        threats.push({
          type: pattern.name,
          severity: pattern.severity,
          count: matches.length,
          matches: matches.slice(0, 3) // Limit to first 3 matches
        });
        totalThreats += matches.length;
      }
    });
    
    if (threats.length > 0) {
      this.threatsDetected += threats.length;
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityValidator: Detected ${threats.length} XSS threats (${totalThreats} total instances)`
      });
    }
    
    return { 
      safe: threats.length === 0, 
      threats,
      totalThreats,
      riskLevel: this.calculateRiskLevel(threats)
    };
  }

  calculateRiskLevel(threats) {
    if (threats.length === 0) return 'low';
    
    const highSeverity = threats.filter(t => t.severity === 'high').length;
    const mediumSeverity = threats.filter(t => t.severity === 'medium').length;
    
    if (highSeverity > 0) return 'high';
    if (mediumSeverity > 2) return 'high';
    if (mediumSeverity > 0) return 'medium';
    return 'low';
  }

  sanitizeHTML(html) {
    if (!this.enabled) return html;
    
    if (!html || typeof html !== 'string') {
      return html;
    }
    
    let sanitized = html;
    let sanitizations = 0;
    
    // Remove dangerous tags and their content
    this.dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gi');
      const beforeLength = sanitized.length;
      sanitized = sanitized.replace(regex, '');
      if (sanitized.length !== beforeLength) {
        sanitizations++;
      }
    });
    
    // Remove self-closing dangerous tags
    this.dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
      const beforeLength = sanitized.length;
      sanitized = sanitized.replace(regex, '');
      if (sanitized.length !== beforeLength) {
        sanitizations++;
      }
    });
    
    // Remove dangerous event handlers
    this.dangerousAttributes.forEach(attr => {
      const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      const beforeLength = sanitized.length;
      sanitized = sanitized.replace(regex, '');
      if (sanitized.length !== beforeLength) {
        sanitizations++;
      }
    });
    
    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    
    // Remove data URLs that could contain HTML
    sanitized = sanitized.replace(/data:\s*text\/html[^"'>\s]*/gi, '');
    
    // Remove eval and expression calls
    sanitized = sanitized.replace(/eval\s*\(/gi, '');
    sanitized = sanitized.replace(/expression\s*\(/gi, '');
    
    if (sanitizations > 0) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityValidator: Sanitized HTML with ${sanitizations} dangerous elements removed`
      });
    }
    
    return sanitized;
  }

  generateCSRFToken() {
    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      
      this.csrfTokensGenerated++;
      
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecurityValidator: Generated CSRF token'
      });
      
      return token;
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecurityValidator: Failed to generate CSRF token: ' + error.message
      });
      return null;
    }
  }

  validateCSRFToken(token, expectedToken) {
    if (!this.enabled) return true;
    
    if (!token || !expectedToken) {
      return false;
    }
    
    // More flexible token length validation (common lengths: 32, 40, 43, 64 chars)
    // Different frameworks use different token lengths
    const minTokenLength = 16;
    const maxTokenLength = 128;
    
    if (token.length < minTokenLength || token.length > maxTokenLength ||
        expectedToken.length < minTokenLength || expectedToken.length > maxTokenLength) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityValidator: Invalid CSRF token length (token: ${token.length}, expected: ${expectedToken.length})`
      });
      return false;
    }
    
    // Allow tokens of different lengths if they come from different sources
    // But warn about it
    if (token.length !== expectedToken.length) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityValidator: Warning - CSRF token length mismatch (${token.length} vs ${expectedToken.length})`
      });
    }
    
    const isValid = token === expectedToken;
    
    if (!isValid) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: 'SecurityValidator: CSRF token validation failed - tokens do not match'
      });
    }
    
    return isValid;
  }

  checkContentSecurityPolicy(headers) {
    if (!headers || typeof headers !== 'object') {
      return { compliant: false, issues: ['No headers provided'] };
    }
    
    this.cspChecks++;
    
    const csp = headers['content-security-policy'] || 
               headers['Content-Security-Policy'] ||
               headers['content-security-policy-report-only'] ||
               headers['Content-Security-Policy-Report-Only'];
    
    if (!csp) {
      return { 
        compliant: false, 
        issues: ['No Content Security Policy header found'],
        recommendation: 'Implement CSP header for XSS protection'
      };
    }
    
    const issues = [];
    const warnings = [];
    
    // Check for unsafe directives (less strict - some legitimate use cases)
    // Only flag as issue if BOTH unsafe-inline AND unsafe-eval are present
    const hasUnsafeInline = csp.includes("'unsafe-inline'");
    const hasUnsafeEval = csp.includes("'unsafe-eval'");
    
    if (hasUnsafeInline && hasUnsafeEval) {
      issues.push("Both unsafe-inline and unsafe-eval are allowed (high risk)");
    } else if (hasUnsafeInline) {
      warnings.push("Unsafe inline scripts allowed (may be needed for some frameworks)");
    } else if (hasUnsafeEval) {
      warnings.push("Unsafe eval allowed (may be needed for some libraries)");
    }
    
    if (csp.includes("'unsafe-hashes'")) {
      warnings.push("Unsafe hashes allowed (modern alternative to unsafe-inline)");
    }
    
    // Check for missing important directives (warnings, not issues)
    if (!csp.includes("default-src") && !csp.includes("script-src")) {
      warnings.push("No default-src or script-src directive found");
    }
    
    // Check for overly permissive sources
    if (csp.includes("* ") || csp.includes(" *") || csp === "*") {
      issues.push("Wildcard (*) source allowed - too permissive");
    }
    
    if (!csp.includes("style-src")) {
      warnings.push("Missing style-src directive");
    }
    
    // Check for overly permissive directives
    if (csp.includes("script-src *")) {
      issues.push("Script-src allows all sources");
    }
    
    if (csp.includes("style-src *")) {
      warnings.push("Style-src allows all sources");
    }
    
    const isCompliant = issues.length === 0;
    
    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG', 
      message: `SecurityValidator: CSP check completed - ${isCompliant ? 'compliant' : 'non-compliant'} (${issues.length} issues, ${warnings.length} warnings)`
    });
    
    return { 
      compliant: isCompliant, 
      issues,
      warnings,
      score: this.calculateCSPScore(issues, warnings)
    };
  }

  calculateCSPScore(issues, warnings) {
    let score = 100;
    score -= issues.length * 20; // Major issues reduce score significantly
    score -= warnings.length * 5; // Warnings reduce score slightly
    return Math.max(0, score);
  }

  validateSecureHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
      return { secure: false, issues: ['No headers provided'] };
    }
    
    const issues = [];
    const recommendations = [];
    
    // Check for HTTPS enforcement
    const strictTransportSecurity = headers['strict-transport-security'] || headers['Strict-Transport-Security'];
    if (!strictTransportSecurity) {
      recommendations.push('Implement Strict-Transport-Security header');
    }
    
    // Check for XSS protection
    const xssProtection = headers['x-xss-protection'] || headers['X-XSS-Protection'];
    if (!xssProtection) {
      issues.push('Missing X-XSS-Protection header');
    }
    
    // Check for content type options
    const contentTypeOptions = headers['x-content-type-options'] || headers['X-Content-Type-Options'];
    if (!contentTypeOptions) {
      issues.push('Missing X-Content-Type-Options header');
    }
    
    // Check for frame options
    const frameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];
    if (!frameOptions) {
      issues.push('Missing X-Frame-Options header');
    }
    
    // Check for referrer policy
    const referrerPolicy = headers['referrer-policy'] || headers['Referrer-Policy'];
    if (!referrerPolicy) {
      recommendations.push('Implement Referrer-Policy header');
    }
    
    const isSecure = issues.length === 0;
    
    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG', 
      message: `SecurityValidator: Security headers check - ${isSecure ? 'secure' : 'insecure'} (${issues.length} issues, ${recommendations.length} recommendations)`
    });
    
    return {
      secure: isSecure,
      issues,
      recommendations,
      score: this.calculateSecurityScore(issues, recommendations)
    };
  }

  calculateSecurityScore(issues, recommendations) {
    let score = 100;
    score -= issues.length * 25; // Security issues are critical
    score -= recommendations.length * 10; // Recommendations are important
    return Math.max(0, score);
  }

  detectClickjacking(html) {
    if (!html || typeof html !== 'string') {
      return { vulnerable: false, issues: [] };
    }
    
    const issues = [];
    
    // Check for iframe usage
    const iframeMatches = html.match(/<iframe[^>]*>/gi);
    if (iframeMatches && iframeMatches.length > 0) {
      issues.push(`Found ${iframeMatches.length} iframe(s) - potential clickjacking vector`);
    }
    
    // Check for transparent overlays
    const transparentElements = html.match(/opacity\s*:\s*0|visibility\s*:\s*hidden/gi);
    if (transparentElements && transparentElements.length > 0) {
      issues.push('Found transparent/hidden elements - potential overlay attack');
    }
    
    // Check for pointer-events manipulation
    const pointerEvents = html.match(/pointer-events\s*:\s*none/gi);
    if (pointerEvents && pointerEvents.length > 0) {
      issues.push('Found pointer-events manipulation - potential clickjacking');
    }
    
    const isVulnerable = issues.length > 0;
    
    if (isVulnerable) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', 
        message: `SecurityValidator: Detected potential clickjacking vulnerabilities: ${issues.length} issues`
      });
    }
    
    return {
      vulnerable: isVulnerable,
      issues,
      riskLevel: this.calculateClickjackingRisk(issues)
    };
  }

  calculateClickjackingRisk(issues) {
    if (issues.length === 0) return 'none';
    if (issues.length >= 3) return 'high';
    if (issues.length >= 2) return 'medium';
    return 'low';
  }

  getSecurityStats() {
    return {
      enabled: this.enabled,
      threatsDetected: this.threatsDetected,
      csrfTokensGenerated: this.csrfTokensGenerated,
      cspChecks: this.cspChecks,
      patternsConfigured: this.xssPatterns.length,
      dangerousTags: this.dangerousTags.length,
      dangerousAttributes: this.dangerousAttributes.length
    };
  }

  resetStats() {
    this.threatsDetected = 0;
    this.csrfTokensGenerated = 0;
    this.cspChecks = 0;
  }
}

window.SecurityValidator = SecurityValidator;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SECURITY VALIDATOR SCRIPT LOADED ==='});
}
