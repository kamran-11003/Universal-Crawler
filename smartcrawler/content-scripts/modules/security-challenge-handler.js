/**
 * reCAPTCHA and 2FA Handler
 * Detects security challenges and prompts user for manual intervention
 * Does not attempt to bypass (ethical considerations)
 */

class SecurityChallengeHandler {
  constructor() {
    this.challengeDetected = false;
    this.challengeType = null;
    this.userNotified = false;
  }
  
  /**
   * Check for reCAPTCHA, hCaptcha, 2FA, OTP challenges
   * @returns {Object} { detected: boolean, type: string, message: string }
   */
  detectChallenges() {
    const challenges = {
      recaptcha: this.detectRecaptcha(),
      hcaptcha: this.detectHCaptcha(),
      twofa: this.detect2FA(),
      otp: this.detectOTP(),
      customCaptcha: this.detectCustomCaptcha()
    };
    
    // Check which challenge is present
    for (const [type, detected] of Object.entries(challenges)) {
      if (detected) {
        this.challengeDetected = true;
        this.challengeType = type;
        return {
          detected: true,
          type: type,
          message: this.getChallengeMessage(type),
          element: detected.element || null
        };
      }
    }
    
    return { detected: false, type: null, message: null };
  }
  
  /**
   * Detect Google reCAPTCHA (v2, v3, Enterprise)
   */
  detectRecaptcha() {
    // reCAPTCHA v2 (checkbox) - ONLY detect if visible
    const recaptchaV2 = document.querySelector('.g-recaptcha, #recaptcha, iframe[src*="google.com/recaptcha"]');
    if (recaptchaV2 && this.isVisible(recaptchaV2)) {
      console.log('🔒 Detected: Google reCAPTCHA v2 (visible)');
      return { detected: true, version: 'v2', element: recaptchaV2 };
    }
    
    // reCAPTCHA v3 (invisible) - Check if challenge is ACTIVE (badge visible)
    const recaptchaBadge = document.querySelector('.grecaptcha-badge');
    if (recaptchaBadge && this.isVisible(recaptchaBadge)) {
      // Only detect if there's an actual challenge overlay
      const recaptchaFrame = document.querySelector('iframe[src*="recaptcha"][src*="bframe"]');
      if (recaptchaFrame && this.isVisible(recaptchaFrame)) {
        console.log('🔒 Detected: Google reCAPTCHA v3 (active challenge)');
        return { detected: true, version: 'v3', element: recaptchaFrame };
      }
    }
    
    return false;
  }
  
  /**
   * Check if element is visible (moved up for use in detectRecaptcha)
   */
  isVisible(element) {
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
  
  /**
   * Detect hCaptcha
   */
  detectHCaptcha() {
    const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha.com"]');
    if (hcaptcha || window.hcaptcha) {
      console.log('🔒 Detected: hCaptcha');
      return { detected: true, element: hcaptcha };
    }
    return false;
  }
  
  /**
   * Detect 2FA/MFA prompts
   */
  detect2FA() {
    const indicators = [
      // Text content
      document.body.textContent.toLowerCase().includes('two-factor'),
      document.body.textContent.toLowerCase().includes('2fa'),
      document.body.textContent.toLowerCase().includes('multi-factor'),
      document.body.textContent.toLowerCase().includes('mfa'),
      document.body.textContent.toLowerCase().includes('authenticator'),
      document.body.textContent.toLowerCase().includes('verification code'),
      
      // Input fields
      document.querySelector('input[name*="2fa" i]'),
      document.querySelector('input[name*="mfa" i]'),
      document.querySelector('input[name*="authenticator" i]'),
      document.querySelector('input[placeholder*="authenticator" i]'),
      
      // QR code for setup
      document.querySelector('img[alt*="qr code" i]'),
      document.querySelector('canvas[id*="qr" i]')
    ];
    
    const detected = indicators.some(indicator => indicator);
    
    if (detected) {
      console.log('🔒 Detected: Two-Factor Authentication (2FA/MFA)');
      return { detected: true, element: document.querySelector('input[name*="2fa" i], input[name*="mfa" i]') };
    }
    
    return false;
  }
  
  /**
   * Detect OTP (One-Time Password) inputs
   */
  detectOTP() {
    const indicators = [
      // Common OTP input patterns
      document.querySelectorAll('input[type="text"][maxlength="1"]').length >= 4,  // 4-6 digit split inputs
      document.querySelector('input[name*="otp" i]'),
      document.querySelector('input[name*="code" i]'),
      document.querySelector('input[placeholder*="otp" i]'),
      document.querySelector('input[placeholder*="code" i]'),
      document.querySelector('input[autocomplete="one-time-code"]'),
      
      // Text content
      document.body.textContent.toLowerCase().includes('enter the code'),
      document.body.textContent.toLowerCase().includes('verification code'),
      document.body.textContent.toLowerCase().includes('one-time password'),
      document.body.textContent.toLowerCase().includes('otp')
    ];
    
    const detected = indicators.some(indicator => indicator);
    
    if (detected) {
      console.log('🔒 Detected: One-Time Password (OTP)');
      return { 
        detected: true, 
        element: document.querySelector('input[name*="otp" i], input[name*="code" i], input[autocomplete="one-time-code"]')
      };
    }
    
    return false;
  }
  
  /**
   * Detect custom CAPTCHA implementations
   */
  detectCustomCaptcha() {
    const indicators = [
      document.querySelector('[id*="captcha" i]'),
      document.querySelector('[class*="captcha" i]'),
      document.querySelector('img[alt*="captcha" i]'),
      document.querySelector('canvas[id*="captcha" i]'),
      document.body.textContent.toLowerCase().includes('enter the characters'),
      document.body.textContent.toLowerCase().includes('solve the puzzle')
    ];
    
    const detected = indicators.some(indicator => indicator);
    
    if (detected) {
      console.log('🔒 Detected: Custom CAPTCHA');
      return { detected: true, element: indicators.find(i => i) };
    }
    
    return false;
  }
  
  /**
   * Get user-friendly message for challenge type
   */
  getChallengeMessage(type) {
    const messages = {
      recaptcha: '🤖 reCAPTCHA Detected\n\nPlease solve the reCAPTCHA challenge manually, then the crawler will continue automatically.',
      hcaptcha: '🤖 hCaptcha Detected\n\nPlease solve the hCaptcha challenge manually, then the crawler will continue automatically.',
      twofa: '🔐 Two-Factor Authentication Required\n\nPlease complete the 2FA verification:\n1. Enter your authentication code from your authenticator app\n2. Or use your backup code\n3. Click Submit\n\nThe crawler will continue after verification.',
      otp: '📱 One-Time Password Required\n\nPlease enter the verification code:\n1. Check your email or SMS for the code\n2. Enter the code in the input field\n3. Click Submit\n\nThe crawler will continue after verification.',
      customCaptcha: '🔐 Security Challenge Detected\n\nPlease solve the security challenge manually, then the crawler will continue automatically.'
    };
    
    return messages[type] || 'Security challenge detected. Please complete it manually.';
  }
  
  /**
   * Prompt user for manual intervention
   */
  async promptUser(challengeInfo) {
    if (this.userNotified) return; // Already notified
    
    this.userNotified = true;
    
    console.warn('⚠️ Security challenge detected:', challengeInfo.type);
    
    // Send message to popup UI
    try {
      chrome.runtime.sendMessage({
        type: 'SECURITY_CHALLENGE_DETECTED',
        challengeType: challengeInfo.type,
        message: challengeInfo.message,
        url: window.location.href
      });
    } catch (e) {
      console.warn('Failed to send challenge notification to popup:', e);
    }
    
    // Show in-page notification
    this.showInPageNotification(challengeInfo);
    
    // Wait for user to complete challenge
    await this.waitForChallengeCompletion(challengeInfo);
  }
  
  /**
   * Show floating notification on page
   */
  showInPageNotification(challengeInfo) {
    // Remove existing notification if any
    const existing = document.getElementById('crawler-security-challenge-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'crawler-security-challenge-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 2147483647;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      </style>
      <div style="position: relative;">
        <button id="challenge-close-btn" style="
          position: absolute;
          top: -10px;
          right: -10px;
          width: 30px;
          height: 30px;
          background: rgba(255,255,255,0.3);
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.3)'">
          ✕
        </button>
        <div style="display: flex; align-items: start; gap: 12px;">
          <div style="font-size: 32px; animation: pulse 2s infinite;">${this.getChallengeIcon(challengeInfo.type)}</div>
          <div style="flex: 1;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
              Crawler Paused
            </div>
            <div style="font-size: 14px; line-height: 1.5; white-space: pre-line;">
              ${challengeInfo.message}
            </div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.2); border-radius: 6px; font-size: 12px;">
              ⏱️ Waiting for you to complete the challenge...
            </div>
          </div>
        </div>
        <button id="challenge-completed-btn" style="
          margin-top: 15px;
          width: 100%;
          padding: 12px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        ">
          ✓ I've Completed the Challenge - Resume Crawl
        </button>
        <button id="challenge-false-alarm-btn" style="
          margin-top: 8px;
          width: 100%;
          padding: 8px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        ">
          ❌ False Alarm - No Challenge Present
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add close button handler
    document.getElementById('challenge-close-btn').addEventListener('click', () => {
      notification.remove();
      this.userNotified = false;
      console.log('🚫 User closed challenge notification');
    });
    
    // Add completed button handler
    document.getElementById('challenge-completed-btn').addEventListener('click', () => {
      notification.remove();
      this.userNotified = false;
      console.log('✅ User confirmed challenge completion, resuming crawl');
      
      // Notify crawler to resume
      chrome.runtime.sendMessage({
        type: 'SECURITY_CHALLENGE_COMPLETED',
        challengeType: challengeInfo.type
      });
    });
    
    // Add false alarm button handler
    document.getElementById('challenge-false-alarm-btn').addEventListener('click', () => {
      notification.remove();
      this.userNotified = false;
      this.challengeDetected = false;
      console.log('❌ User reported false alarm, stopping monitoring for this session');
      
      // Stop monitoring to prevent future false positives
      this.stopMonitoring();
      
      // Notify crawler to resume
      chrome.runtime.sendMessage({
        type: 'SECURITY_CHALLENGE_COMPLETED',
        challengeType: 'false-alarm'
      });
    });
  }
  
  /**
   * Get icon for challenge type
   */
  getChallengeIcon(type) {
    const icons = {
      recaptcha: '🤖',
      hcaptcha: '🤖',
      twofa: '🔐',
      otp: '📱',
      customCaptcha: '🔐'
    };
    return icons[type] || '⚠️';
  }
  
  /**
   * Wait for challenge to be completed
   */
  async waitForChallengeCompletion(challengeInfo) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const stillPresent = this.detectChallenges();
        
        if (!stillPresent.detected || stillPresent.type !== challengeInfo.type) {
          console.log('✅ Security challenge appears to be completed');
          clearInterval(checkInterval);
          
          // Remove notification
          const notification = document.getElementById('crawler-security-challenge-notification');
          if (notification) notification.remove();
          
          this.userNotified = false;
          resolve();
        }
      }, 2000); // Check every 2 seconds
      
      // Also listen for manual confirmation
      const messageListener = (message) => {
        if (message.type === 'SECURITY_CHALLENGE_COMPLETED' && 
            message.challengeType === challengeInfo.type) {
          clearInterval(checkInterval);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve();
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
    });
  }
  
  /**
   * Continuous monitoring for security challenges
   */
  startMonitoring() {
    // Initial check (async but don't await - runs in background)
    this.checkAndPrompt().catch(err => console.warn('Check prompt error:', err));
    
    // Set up periodic checking
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndPrompt().catch(err => console.warn('Check prompt error:', err));
    }, 3000); // Check every 3 seconds
    
    // Also use MutationObserver for immediate detection
    this.setupMutationObserver();
    
    console.log('👀 Security challenge monitoring started');
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    console.log('🛑 Security challenge monitoring stopped');
  }
  
  /**
   * Check for challenges and prompt if found
   */
  async checkAndPrompt() {
    const challengeInfo = this.detectChallenges();
    
    if (challengeInfo.detected && !this.userNotified) {
      console.log('⚠️ Security challenge detected, pausing crawl');
      
      // Pause crawler
      if (window.autoTestAICrawler) {
        window.autoTestAICrawler.pauseCrawl?.();
      }
      
      // Prompt user
      await this.promptUser(challengeInfo);
      
      // Resume crawler
      if (window.autoTestAICrawler) {
        window.autoTestAICrawler.resumeCrawl?.();
      }
    }
  }
  
  /**
   * Set up MutationObserver for immediate detection
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if any added node looks like a challenge
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
              
              if (id.includes('captcha') || id.includes('recaptcha') || id.includes('hcaptcha') ||
                  className.includes('captcha') || className.includes('recaptcha') || className.includes('hcaptcha')) {
                console.log('🔒 Security challenge element added to DOM');
                await this.checkAndPrompt().catch(err => console.warn('Check prompt error:', err));
                break;
              }
            }
          }
        }
      }
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize but DON'T auto-start monitoring (crawler will start it when needed)
window.securityChallengeHandler = new SecurityChallengeHandler();

console.log('🔒 Security Challenge Handler loaded (monitoring will start when crawler begins)');
