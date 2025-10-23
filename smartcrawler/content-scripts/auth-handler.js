chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== AUTH HANDLER SCRIPT LOADING ==='});

if (typeof window.AuthenticationHandler === 'undefined') {
class AuthenticationHandler {
  constructor() {
    this.loginFormSelectors = [
      'form input[type="password"]',
      'form input[name*="password"]',
      'form input[id*="password"]'
    ];
    
    this.usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[name="user"]',
      'input[name="login"]',
      'input[type="email"]'
    ];
    
    this.submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button',
      'input[type="button"]'
    ];
    
    this.authSuccessIndicators = [
      'dashboard',
      'profile',
      'logout',
      'welcome',
      'user-menu',
      'account',
      'settings',
      'secure',
      'authenticated',
      'logged-in',
      'user-info',
      'admin-panel'
    ];
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'AuthenticationHandler initialized'});
  }
  
  // Build URL-encoded payload from current form state
  buildFormPayload(form) {
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value !== 'undefined' && value !== null) {
        params.append(key, value);
      }
    }
    return params;
  }

  // Prefer programmatic submission to avoid browser UI prompts
  async submitLoginViaFetch(formData) {
    const { form } = formData;
    try {
      // Check if this is a non-semantic container (div, section, etc.)
      if (form.tagName.toLowerCase() !== 'form') {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Non-semantic container detected, skipping fetch submission'});
        return false;
      }

      const actionUrl = form.getAttribute('action') || window.location.href;
      const method = (form.getAttribute('method') || 'POST').toUpperCase();
      const encType = (form.getAttribute('enctype') || 'application/x-www-form-urlencoded').toLowerCase();

      let body;
      let headers = {};
      if (encType.includes('multipart/form-data')) {
        body = new FormData(form);
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        body = this.buildFormPayload(form);
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Submitting via fetch: ${method} ${actionUrl}`});

      const resp = await fetch(actionUrl, {
        method,
        body,
        headers,
        credentials: 'include',
        redirect: 'follow'
      });

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Fetch response: status=${resp.status} url=${resp.url}`});

      // Navigate to final URL if provided so the tab reflects the new state
      if (resp.url && resp.url !== window.location.href) {
        try { window.location.href = resp.url; } catch (_) {}
      } else {
        try { window.location.reload(); } catch (_) {}
      }
      return true;
    } catch (e) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Fetch submit failed: ${e.message}`});
      return false;
    }
  }
  
  detectLoginForm() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== DETECTING LOGIN FORM ==='});
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL: ${window.location.href}`});
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Page title: ${document.title}`});
    
    // Strategy 1: Find semantic forms with password fields
    for (const selector of this.loginFormSelectors) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Trying semantic selector: ${selector}`});
      const passwordInput = document.querySelector(selector);
      if (passwordInput) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found password input with selector: ${selector}`});
        const form = passwordInput.closest('form');
        if (form) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found semantic form containing password input`});
          
          const formData = this.extractFormData(form, passwordInput);
          if (formData) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== SEMANTIC LOGIN FORM DETECTED ==='});
            return formData;
          } else {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⚠️ Semantic form found but extractFormData returned null (missing username?)`});
          }
        }
      }
    }
    
    // Strategy 2: Find non-semantic form containers OR semantic forms that failed extraction
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'No complete semantic forms found, trying broader search...'});
    
    // Look for ALL password inputs (both inside and outside form elements)
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found ${passwordInputs.length} password input(s) on page`});
    
    for (const passwordInput of passwordInputs) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Analyzing password input: ${passwordInput.id || passwordInput.name || 'unnamed'}`});
      
      // Try multiple container strategies
      const containers = [];
      
      // 1. Closest form element (if exists)
      const formElement = passwordInput.closest('form');
      if (formElement) {
        containers.push(formElement);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  - Found parent <form> element`});
      }
      
      // 2. Form-like containers
      const formlikeContainer = passwordInput.closest('div[id*="form"], div[class*="form"], div[id*="login"], div[class*="login"], section[id*="form"], section[class*="form"]');
      if (formlikeContainer) {
        containers.push(formlikeContainer);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  - Found form-like container: ${formlikeContainer.tagName}#${formlikeContainer.id || formlikeContainer.className}`});
      }
      
      // 3. Direct parent
      if (passwordInput.parentElement) {
        containers.push(passwordInput.parentElement);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  - Found parent element: ${passwordInput.parentElement.tagName}`});
      }
      
      // 4. Root container (#root for React apps)
      const rootContainer = passwordInput.closest('#root, #app, [id*="root"]');
      if (rootContainer) {
        containers.push(rootContainer);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  - Found root container (React/SPA): ${rootContainer.tagName}#${rootContainer.id}`});
      }
      
      // Try each container
      for (const container of containers) {
        const formData = this.extractFormData(container, passwordInput);
        if (formData) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `=== LOGIN FORM DETECTED in ${container.tagName} ==='`});
          return formData;
        }
      }
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== NO LOGIN FORM FOUND ==='});
    return null;
  }
  
  extractFormData(container, passwordInput) {
    // Find username/email input - Enhanced for React SPAs
    let usernameInput = null;
    
    // Try standard selectors first
    for (const userSelector of this.usernameSelectors) {
      usernameInput = container.querySelector(userSelector);
      if (usernameInput) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found username input with selector: ${userSelector}`});
        break;
      }
    }
    
    // If not found, try more flexible patterns
    if (!usernameInput) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Standard username selectors failed, trying flexible patterns...`});
      
      // Look for inputs with user/username/email in name, id, or placeholder
      const textInputs = container.querySelectorAll('input[type="text"], input:not([type])');
      for (const input of textInputs) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const dataTestId = (input.getAttribute('data-test') || '').toLowerCase();
        
        if (name.includes('user') || name.includes('email') || name.includes('login') ||
            id.includes('user') || id.includes('email') || id.includes('login') ||
            placeholder.includes('user') || placeholder.includes('email') ||
            dataTestId.includes('user') || dataTestId.includes('username')) {
          usernameInput = input;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found username input via flexible pattern: ${input.name || input.id || 'unnamed'}`});
          break;
        }
      }
    }
    
    // If still not found, find any text input before the password
    if (!usernameInput) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Still no username found, looking for any text input before password...`});
      const allInputs = Array.from(container.querySelectorAll('input'));
      const passwordIndex = allInputs.indexOf(passwordInput);
      
      for (let i = passwordIndex - 1; i >= 0; i--) {
        const input = allInputs[i];
        if (input.type === 'text' || input.type === '' || input.type === 'email') {
          usernameInput = input;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found text input before password: ${input.name || input.id || 'unnamed'}`});
          break;
        }
      }
    }
    
    // Find submit button
    let submitButton = null;
    for (const submitSelector of this.submitSelectors) {
      submitButton = container.querySelector(submitSelector);
      if (submitButton) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found submit button: ${submitButton.textContent || submitButton.value || 'unnamed'}`});
        break;
      }
    }
    
    // If we have both username and password, this is a valid login form
    if (usernameInput && passwordInput) {
      const formData = {
        form: container,
        usernameInput: usernameInput,
        passwordInput: passwordInput,
        submitButton: submitButton
      };
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Valid login form found!`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  Username field: ${usernameInput.name || usernameInput.id || 'unnamed'}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  Password field: ${passwordInput.name || passwordInput.id || 'unnamed'}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  Submit button: ${submitButton ? (submitButton.textContent || submitButton.value || 'found') : 'Not found'}`});
      
      return formData;
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Incomplete form - Username: ${usernameInput ? 'found' : 'missing'}, Password: ${passwordInput ? 'found' : 'missing'}`});
    return null;
  }
  
  async fillCredentials(formData, credentials) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Filling credentials...'});
      
      const { form, usernameInput, passwordInput } = formData;
      
      if (!usernameInput || !passwordInput) {
        throw new Error('Username or password input not found');
      }
      
      // Clear existing values
      usernameInput.value = '';
      passwordInput.value = '';
      
      // Fill credentials
      usernameInput.value = credentials.username;
      passwordInput.value = credentials.password;
      
      // Trigger input events to simulate user interaction
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Credentials filled successfully'});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error filling credentials: ${error.message}`});
      return false;
    }
  }
  
  async submitLoginForm(formData) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Submitting login form...'});
      
      const { form, submitButton } = formData;
      
      if (!form) {
        throw new Error('Form not found');
      }
      
      // For React SPAs like SauceLabs, DON'T use fetch - it breaks the app flow
      // Just click the button and let React handle it
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Using direct button click for SPA form submission'});
      
      // Wait a moment for any JavaScript to process the form
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try multiple submission methods
      let submitted = false;
      
      // Method 1: Use provided submit button
      if (submitButton) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Using provided submit button'});
        submitButton.click();
        submitted = true;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Login form submitted via provided button'});
      }
      
      // Method 2: Find submit button within form
      if (!submitted) {
        for (const submitSelector of this.submitSelectors) {
          const button = form.querySelector(submitSelector);
          if (button) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found submit button with selector: ${submitSelector}`});
            button.click();
            submitted = true;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Login form submitted via button click'});
            break;
          }
        }
      }
      
      // Method 3: Find button by text content
      if (!submitted) {
        const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
        for (const button of allButtons) {
          const buttonText = button.textContent.toLowerCase().trim();
          const buttonValue = (button.value || '').toLowerCase().trim();
          if (buttonText.includes('login') || buttonText.includes('sign in') || 
              buttonValue.includes('login') || buttonValue.includes('sign in')) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found login button by text: ${buttonText || buttonValue}`});
            button.click();
            submitted = true;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Login form submitted via text-based button click'});
            break;
          }
        }
      }
      
      // Method 4: Submit form directly
      if (!submitted) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'No submit button found, submitting form directly'});
        form.submit();
        submitted = true;
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Login form submitted directly'});
      }
      
      // Wait for form submission to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return submitted;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error submitting login form: ${error.message}`});
      return false;
    }
  }
  
  async waitForAuthentication(timeout = 20000) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Waiting for authentication (timeout: ${timeout}ms)...`});
    
    const startTime = Date.now();
    const originalUrl = window.location.href;
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentUrl = window.location.href;
        const elapsed = Date.now() - startTime;
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Auth check ${elapsed}ms: ${originalUrl} -> ${currentUrl}`});
        
        if (elapsed > timeout) {
          clearInterval(checkInterval);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication timeout reached'});
          resolve(false);
          return;
        }
        
        // Check if URL changed (redirect happened) - this is the primary success indicator
        if (currentUrl !== originalUrl) {
          clearInterval(checkInterval);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Redirect detected: ${originalUrl} -> ${currentUrl}`});
          
          // Additional check: if we're now on /secure, definitely authenticated
          if (currentUrl.includes('/secure')) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Success: Redirected to /secure page'});
            resolve(true);
            return;
          }
          
          // For other redirects, check if they indicate authentication success
          if (this.detectAuthenticationSuccess()) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected after redirect'});
            resolve(true);
            return;
          }
        }
        
        // Check for authentication success indicators on current page
        if (this.detectAuthenticationSuccess()) {
          clearInterval(checkInterval);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected via page content'});
          resolve(true);
          return;
        }
        
        // Check if we're still on login page after 5 seconds - might indicate form submission failed
        if (elapsed > 5000 && currentUrl === originalUrl) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Still on login page after 5 seconds - checking form state'});
          
          // Check if form was actually submitted by looking for error messages or success indicators
          const errorMessages = document.querySelectorAll('.error, .alert-danger, .invalid-feedback');
          if (errorMessages.length > 0) {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found error messages: ${errorMessages.length}`});
          }
          
          // Check if form fields are cleared (indicates submission attempt)
          const usernameField = document.querySelector('input[name="username"]');
          const passwordField = document.querySelector('input[type="password"]');
          if (usernameField && passwordField) {
            const usernameEmpty = !usernameField.value;
            const passwordEmpty = !passwordField.value;
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Form fields cleared: username=${usernameEmpty}, password=${passwordEmpty}`});
          }
        }
        
        // For fetch-based submissions, also check if we're on a different page than the original login
        if (elapsed > 1000 && currentUrl !== originalUrl && !currentUrl.includes('/login')) {
          clearInterval(checkInterval);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Fetch redirect detected: ${originalUrl} -> ${currentUrl}`});
          resolve(true);
          return;
        }
      }, 500); // Check every 500ms for faster response
    });
  }
  
  detectAuthenticationSuccess() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== CHECKING AUTHENTICATION SUCCESS ==='});
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL: ${window.location.href}`});
    
    // First check if we're still on a login page - if so, definitely not authenticated
    if (window.location.href.includes('/login') || 
        window.location.href.includes('/signin') ||
        window.location.href.includes('/auth')) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Still on login page - not authenticated'});
      return false;
    }
    
    // Check for URL changes (common after login)
    if (window.location.href.includes('dashboard') || 
        window.location.href.includes('profile') ||
        window.location.href.includes('account') ||
        window.location.href.includes('secure') ||
        window.location.href.includes('welcome') ||
        window.location.href.includes('home')) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected via URL'});
      return true;
    }
    
    // Check for authentication success indicators in DOM
    for (const indicator of this.authSuccessIndicators) {
      const elements = document.querySelectorAll(`*[class*="${indicator}" i], *[id*="${indicator}" i]`);
      if (elements.length > 0) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Authentication success detected via DOM indicator: ${indicator}`});
        return true;
      }
    }
    
    // Check for logout buttons (indicates user is logged in)
    const logoutButtons = document.querySelectorAll('*[class*="logout" i], *[id*="logout" i], a[href*="/logout" i]');
    if (logoutButtons.length > 0) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected via logout button'});
      return true;
    }
    
    // Site-specific success flash for the-internet.herokuapp.com
    const flash = document.querySelector('#flash, .flash');
    if (flash && /logged into a secure area|success/i.test(flash.textContent || '')) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected via flash message'});
      return true;
    }
    
    // Also check for logout buttons by text content
    const allButtons = document.querySelectorAll('button, a');
    for (const button of allButtons) {
      if (button.textContent.toLowerCase().includes('logout')) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Authentication success detected via logout text'});
        return true;
      }
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'No authentication success indicators found'});
    return false;
  }
  
  detectLogout() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Checking for logout...'});
    
    // Check if we're back on a login page
    if (this.detectLoginForm()) {
      return true;
    }
    
    // Check for logout indicators in URL
    if (window.location.href.includes('logout') || 
        window.location.href.includes('signout')) {
      return true;
    }
    
    return false;
  }
  
  async performLogin(credentials) {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== STARTING LOGIN PROCESS ==='});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Current URL: ${window.location.href}`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Credentials: ${credentials.username}`});
      
      // Wait for React/SPA to render (important for dynamic forms)
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Step 0: Waiting for page to fully render (React/SPA)...'});
      await this.waitForPageReady();
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SUCCESS: Page ready'});
      
      // Detect login form
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Step 1: Detecting login form...'});
      const formData = this.detectLoginForm();
      if (!formData) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'ERROR: Login form not found!'});
        throw new Error('Login form not found');
      }
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SUCCESS: Login form detected'});
      
      // Fill credentials
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Step 2: Filling credentials...'});
      const filled = await this.fillCredentials(formData, credentials);
      if (!filled) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'ERROR: Failed to fill credentials!'});
        throw new Error('Failed to fill credentials');
      }
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SUCCESS: Credentials filled'});
      
      // Submit form
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Step 3: Submitting login form...'});
      const submitted = await this.submitLoginForm(formData);
      if (!submitted) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'ERROR: Failed to submit login form!'});
        throw new Error('Failed to submit login form');
      }
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SUCCESS: Login form submitted'});
      
      // Wait for authentication
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Step 4: Waiting for authentication...'});
      const success = await this.waitForAuthentication();
      if (!success) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'ERROR: Authentication failed or timed out!'});
        throw new Error('Authentication failed or timed out');
      }
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'SUCCESS: Authentication completed'});
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== LOGIN PROCESS COMPLETED SUCCESSFULLY ==='});
      return true;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `=== LOGIN PROCESS FAILED: ${error.message} ===`});
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error stack: ${error.stack}`});
      return false;
    }
  }
  
  // Wait for React/SPA to render forms
  async waitForPageReady(maxWait = 5000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkReady = () => {
        // Check if password input exists (main indicator of login form)
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (passwordInput) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Page ready - password input found after ${Date.now() - startTime}ms`});
          resolve(true);
          return;
        }
        
        // Timeout check
        if (Date.now() - startTime > maxWait) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `⚠️ Page ready timeout after ${maxWait}ms - proceeding anyway`});
          resolve(true);
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkReady, 100);
      };
      
      checkReady();
    });
  }

  /**
   * Detect AJAX authentication success
   * Monitors: fetch responses, localStorage changes, URL redirects, cookies
   * @param {number} maxWait - Maximum time to wait (ms)
   * @returns {Promise<boolean>}
   */
  async detectAuthSuccess(maxWait = 5000) {
    const startTime = Date.now();
    const initialUrl = window.location.href;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔍 Detecting AJAX auth success...'});
    
    // Monitor fetch responses
    let authSuccess = false;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const cloned = response.clone();
      
      try {
        const json = await cloned.json();
        if (this.isAuthSuccessResponse(json)) {
          authSuccess = true;
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Auth success detected in fetch response'});
        }
      } catch (e) {
        // Not JSON response
      }
      
      return response;
    };
    
    // Check periodically
    while (Date.now() - startTime < maxWait) {
      // Check fetch response
      if (authSuccess) {
        window.fetch = originalFetch; // Restore
        return true;
      }
      
      // Check URL redirect (non-login page)
      if (window.location.href !== initialUrl && !window.location.href.includes('login')) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Auth success detected via URL redirect'});
        window.fetch = originalFetch;
        return true;
      }
      
      // Check localStorage/sessionStorage for tokens
      if (this.detectAuthToken()) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '✅ Auth success detected via token'});
        window.fetch = originalFetch;
        return true;
      }
      
      // Check for auth success indicators
      for (const indicator of this.authSuccessIndicators) {
        if (document.body.textContent.toLowerCase().includes(indicator)) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Auth success detected via indicator: ${indicator}`});
          window.fetch = originalFetch;
          return true;
        }
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    window.fetch = originalFetch; // Restore
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '⚠️ Auth success detection timeout'});
    return false;
  }

  /**
   * Check if JSON response indicates auth success
   * @param {Object} json - Response JSON
   * @returns {boolean}
   */
  isAuthSuccessResponse(json) {
    if (!json || typeof json !== 'object') return false;
    
    // Common success patterns
    const successPatterns = [
      json.success === true,
      json.status === 'success',
      json.status === 'ok',
      json.authenticated === true,
      json.loggedIn === true,
      json.token !== undefined,
      json.accessToken !== undefined,
      json.sessionId !== undefined,
      json.user !== undefined && json.user !== null
    ];
    
    return successPatterns.some(pattern => pattern);
  }

  /**
   * Detect authentication token in storage
   * @returns {boolean}
   */
  detectAuthToken() {
    try {
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (this.looksLikeToken(key, value)) {
          return true;
        }
      }
      
      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        if (this.looksLikeToken(key, value)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if key/value looks like an auth token
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  looksLikeToken(key, value) {
    if (!key || !value) return false;
    
    const tokenKeywords = ['token', 'auth', 'session', 'jwt', 'bearer', 'access', 'refresh'];
    const keyLower = key.toLowerCase();
    
    // Check if key contains token keywords
    const hasTokenKeyword = tokenKeywords.some(keyword => keyLower.includes(keyword));
    
    // Check if value looks like a token (long string, base64-like)
    const looksLikeTokenValue = value.length > 20 && /^[A-Za-z0-9._-]+$/.test(value);
    
    return hasTokenKeyword && looksLikeTokenValue;
  }

  /**
   * Detect available login paths
   * @returns {Promise<Array<string>>}
   */
  async detectLoginPaths() {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔍 Detecting login paths...'});
    
    const commonPaths = [
      '/login', '/signin', '/sign-in', '/log-in',
      '/auth/login', '/user/login', '/account/login',
      '/admin', '/admin/login', '/admin-panel',
      '/administrator', '/wp-admin', '/backend',
      '/portal', '/portal/login', '/customer/login'
    ];
    
    const existingPaths = [];
    
    for (const path of commonPaths) {
      try {
        const fullUrl = new URL(path, window.location.origin).href;
        
        // Try HEAD request first (faster)
        const response = await fetch(fullUrl, { 
          method: 'HEAD', 
          mode: 'no-cors',
          credentials: 'include'
        });
        
        // If HEAD succeeds or returns opaque (CORS), path likely exists
        if (response.ok || response.type === 'opaque' || response.status === 0) {
          existingPaths.push(fullUrl);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Found login path: ${path}`});
        }
      } catch (e) {
        // Path doesn't exist or network error
      }
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found ${existingPaths.length} login paths`});
    return existingPaths;
  }

  /**
   * Attempt login at multiple paths
   * @param {Object} credentials
   * @returns {Promise<Object>}
   */
  async attemptMultiPathLogin(credentials) {
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔄 Attempting multi-path login...'});
    
    const paths = await this.detectLoginPaths();
    
    for (const path of paths) {
      try {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Trying login at: ${path}`});
        
        // Navigate to login path
        window.location.href = path;
        await new Promise(r => setTimeout(r, 2000)); // Wait for page load
        
        // Try to login
        const success = await this.attemptLogin(credentials);
        
        if (success) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Login successful at: ${path}`});
          return { success: true, path: path };
        }
      } catch (error) {
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Login failed at ${path}: ${error.message}`});
      }
    }
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '❌ All login paths failed'});
    return { success: false, path: null };
  }
}

// Make AuthenticationHandler available globally
window.AuthenticationHandler = AuthenticationHandler;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== AUTH HANDLER SCRIPT LOADED ==='});
}