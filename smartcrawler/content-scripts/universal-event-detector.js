chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== UNIVERSAL EVENT DETECTOR SCRIPT LOADING ==='});

if (typeof window.UniversalEventDetector === 'undefined') {
class UniversalEventDetector {
  constructor() {
    this.interactionPoints = [];
    this.eventPatterns = new Map();
    this.learnedBehaviors = new Map();
    this.geminiApiKey = 'AIzaSyC495337JLVzngj2QTQGfEvO9CgSdSoK1c';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.apiCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'UniversalEventDetector initialized with Gemini API'});
  }
  
  // 🎯 Main Analysis Method
  async analyzeWebsite() {
    try {
      console.log('🚀 UNIVERSAL EVENT DETECTOR: Starting comprehensive website analysis...');
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🚀 Starting comprehensive website analysis...'});
      
      const startTime = performance.now();
      
      const analysis = {
        interactionPoints: await this.discoverInteractionPoints(),
        eventPatterns: await this.analyzeEventPatterns(),
        navigationMethods: await this.discoverNavigationMethods(),
        formBehaviors: await this.analyzeFormBehaviors(),
        stateChanges: await this.monitorStateChanges(),
        aiAnalysis: await this.performAIAnalysis()
      };
      
      const duration = performance.now() - startTime;
      console.log(`✅ UNIVERSAL EVENT DETECTOR: Analysis complete in ${duration.toFixed(2)}ms`);
      console.log(`📊 UNIVERSAL EVENT DETECTOR: Found ${analysis.interactionPoints.total} interaction points`);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Analysis complete in ${duration.toFixed(2)}ms - Found ${analysis.interactionPoints.total} interaction points`});
      
      return analysis;
    } catch (error) {
      console.error('❌ UNIVERSAL EVENT DETECTOR: Error in analyzeWebsite:', error);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error in analyzeWebsite: ${error.message}`});
      return this.getFallbackAnalysis();
    }
  }
  
  // 🔍 Discover ALL Interaction Points
  async discoverInteractionPoints() {
    try {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Discovering interaction points...'});
      
      const interactions = {
        clicks: this.findClickableElements(),
        inputs: this.findInputElements(),
        forms: this.findFormElements(),
        navigation: this.findNavigationElements(),
        dynamic: this.findDynamicElements()
      };
      
      const totalInteractions = Object.values(interactions).reduce((sum, arr) => sum + arr.length, 0);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Found ${totalInteractions} total interaction points`});
      
      return this.categorizeInteractions(interactions);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in discoverInteractionPoints: ${error.message}`});
      return { total: 0, byType: {}, interactions: {} };
    }
  }
  
  // 🎪 Universal Clickable Element Detection
  findClickableElements() {
    try {
      const clickables = [];
      
      // Strategy 1: Standard clickable elements
      const standard = document.querySelectorAll('a, button, input[type="button"], input[type="submit"]');
      clickables.push(...Array.from(standard).map(el => ({
        element: el,
        type: 'standard',
        confidence: 1.0,
        metadata: this.extractElementMetadata(el)
      })));
      
      // Strategy 2: Elements with click handlers
      const withHandlers = Array.from(document.querySelectorAll('*')).filter(el => {
        return this.hasClickHandler(el);
      });
      clickables.push(...withHandlers.map(el => ({
        element: el,
        type: 'event-handler',
        confidence: 0.9,
        metadata: this.extractElementMetadata(el)
      })));
      
      // Strategy 3: Elements with cursor pointer
      const pointerElements = Array.from(document.querySelectorAll('*')).filter(el => {
        try {
          const style = window.getComputedStyle(el);
          return style.cursor === 'pointer';
        } catch (e) {
          return false;
        }
      });
      clickables.push(...pointerElements.map(el => ({
        element: el,
        type: 'visual-cue',
        confidence: 0.7,
        metadata: this.extractElementMetadata(el)
      })));
      
      // Strategy 4: Elements with role="button"
      const roleButtons = document.querySelectorAll('[role="button"], [role="link"]');
      clickables.push(...Array.from(roleButtons).map(el => ({
        element: el,
        type: 'aria-role',
        confidence: 0.8,
        metadata: this.extractElementMetadata(el)
      })));
      
      // Strategy 5: Elements with click-related classes/IDs
      const clickClasses = document.querySelectorAll('[class*="click"], [class*="btn"], [class*="link"], [id*="click"], [id*="btn"], [id*="link"]');
      clickables.push(...Array.from(clickClasses).map(el => ({
        element: el,
        type: 'naming-pattern',
        confidence: 0.6,
        metadata: this.extractElementMetadata(el)
      })));
      
      return this.deduplicateAndRank(clickables);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findClickableElements: ${error.message}`});
      return [];
    }
  }
  
  // 📝 Universal Form Detection
  findFormElements() {
    try {
      const forms = [];
      
      // Strategy 1: Standard forms
      const standardForms = document.querySelectorAll('form');
      forms.push(...Array.from(standardForms).map(form => ({
        element: form,
        type: 'standard-form',
        confidence: 1.0,
        analysis: this.analyzeFormStructure(form)
      })));
      
      // Strategy 2: Form-like containers
      const formContainers = this.findFormLikeContainers();
      forms.push(...formContainers.map(container => ({
        element: container,
        type: 'container-form',
        confidence: 0.8,
        analysis: this.analyzeFormStructure(container)
      })));
      
      // Strategy 3: Input groups
      const inputGroups = this.findInputGroups();
      forms.push(...inputGroups.map(group => ({
        element: group.container,
        type: 'input-group',
        confidence: 0.7,
        analysis: this.analyzeFormStructure(group.container)
      })));
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findFormElements: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Find Form-Like Containers
  findFormLikeContainers() {
    try {
      const containers = [];
      
      // Look for divs with form-related IDs/classes
      const formSelectors = [
        'div[id*="form"]',
        'div[class*="form"]',
        'section[id*="form"]',
        'section[class*="form"]',
        'div[id*="login"]',
        'div[class*="login"]',
        'div[id*="auth"]',
        'div[class*="auth"]'
      ];
      
      formSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const inputCount = el.querySelectorAll('input, select, textarea').length;
          if (inputCount >= 2) { // Minimum 2 inputs to be considered a form
            containers.push(el);
          }
        });
      });
      
      return containers;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findFormLikeContainers: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Find Input Groups
  findInputGroups() {
    try {
      const groups = [];
      const allInputs = document.querySelectorAll('input, select, textarea');
      
      // Group inputs by proximity
      const processedInputs = new Set();
      
      allInputs.forEach(input => {
        if (processedInputs.has(input)) return;
        
        const container = input.closest('div, section, form, article, main');
        if (container) {
          const relatedInputs = Array.from(container.querySelectorAll('input, select, textarea'));
          if (relatedInputs.length >= 2) {
            groups.push({
              container: container,
              inputs: relatedInputs
            });
            
            relatedInputs.forEach(inp => processedInputs.add(inp));
          }
        }
      });
      
      return groups;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findInputGroups: ${error.message}`});
      return [];
    }
  }
  
  // 🧠 AI-Powered Form Analysis
  async analyzeFormStructure(container) {
    try {
      const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
      const basicAnalysis = {
        inputTypes: this.categorizeInputs(inputs),
        relationships: this.findInputRelationships(inputs),
        submission: this.analyzeSubmissionMethod(container),
        validation: this.extractValidationPatterns(inputs),
        accessibility: this.analyzeAccessibility(container)
      };
      
      // Get AI analysis
      const aiAnalysis = await this.performFormAIAnalysis(container, inputs);
      
      return {
        ...basicAnalysis,
        aiAnalysis: aiAnalysis,
        purpose: aiAnalysis?.purpose || this.inferFormPurpose(container, inputs)
      };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in analyzeFormStructure: ${error.message}`});
      return this.getFallbackFormAnalysis(container);
    }
  }
  
  // 🤖 AI Form Analysis using Gemini
  async performFormAIAnalysis(container, inputs) {
    try {
      const cacheKey = container.outerHTML.slice(0, 500); // Use first 500 chars as cache key
      
      // Check cache first
      if (this.apiCache.has(cacheKey)) {
        const cached = this.apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Using cached AI analysis'});
          return cached.data;
        }
      }
      
      const formHTML = container.outerHTML;
      const context = {
        url: window.location.href,
        pageTitle: document.title,
        formHTML: formHTML.slice(0, 2000) // Limit size
      };
      
      const prompt = `
      Analyze this HTML form and determine its purpose. Consider:
      - Input types and names
      - Form action and method  
      - Page context and URL
      - Form structure and labels
      
      HTML: ${context.formHTML}
      URL: ${context.url}
      Page: ${context.pageTitle}
      
      Return JSON only:
      {
        "type": "authentication|registration|contact|search|order|other",
        "subtype": "login|signup|feedback|checkout|etc",
        "confidence": 0.8,
        "reasoning": "explanation",
        "submissionMethod": "form|button|ajax|custom"
      }
      `;
      
      const response = await this.callGeminiAPI(prompt);
      
      if (response) {
        // Cache successful response
        this.apiCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `AI form analysis: ${JSON.stringify(response)}`});
        return response;
      }
      
      return null;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `AI form analysis failed: ${error.message}`});
      return null;
    }
  }
  
  // 🤖 Call Gemini API
  async callGeminiAPI(prompt) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('Invalid API response structure');
      }
      
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { error: 'Could not parse AI response' };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Gemini API error: ${error.message}`});
      return null;
    }
  }
  
  // 🔧 Helper Methods
  hasClickHandler(element) {
    try {
      const events = ['onclick', 'onmousedown', 'onmouseup'];
      return events.some(event => element.hasAttribute(event)) ||
             element.addEventListener !== undefined; // Has event listener capability
    } catch (error) {
      return false;
    }
  }
  
  extractElementMetadata(element) {
    try {
      return {
        tagName: element.tagName?.toLowerCase() || '',
        type: element.type || '',
        id: element.id || '',
        className: element.className || '',
        textContent: element.textContent?.slice(0, 50) || '',
        href: element.href || '',
        role: element.getAttribute('role') || '',
        ariaLabel: element.getAttribute('aria-label') || ''
      };
    } catch (error) {
      return {
        tagName: 'unknown',
        type: '',
        id: '',
        className: '',
        textContent: '',
        href: '',
        role: '',
        ariaLabel: ''
      };
    }
  }
  
  categorizeInputs(inputs) {
    try {
      const categories = {};
      inputs.forEach(input => {
        const type = input.type || input.tagName.toLowerCase();
        if (!categories[type]) categories[type] = [];
        categories[type].push({
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required
        });
      });
      return categories;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in categorizeInputs: ${error.message}`});
      return {};
    }
  }
  
  findInputRelationships(inputs) {
    try {
      const relationships = [];
      
      // Group radio buttons by name
      const radioGroups = {};
      inputs.forEach(input => {
        if (input.type === 'radio' && input.name) {
          if (!radioGroups[input.name]) radioGroups[input.name] = [];
          radioGroups[input.name].push(input);
        }
      });
      
      Object.entries(radioGroups).forEach(([name, radios]) => {
        if (radios.length > 1) {
          relationships.push({
            type: 'radio-group',
            name: name,
            count: radios.length
          });
        }
      });
      
      return relationships;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findInputRelationships: ${error.message}`});
      return [];
    }
  }
  
  analyzeSubmissionMethod(container) {
    try {
      const submitButton = container.querySelector('button[type="submit"], input[type="submit"]');
      const form = container.tagName === 'FORM' ? container : container.querySelector('form');
      
      return {
        hasSubmitButton: !!submitButton,
        submitButtonText: submitButton?.textContent || submitButton?.value || '',
        formAction: form?.action || '',
        formMethod: form?.method || 'GET',
        formTarget: form?.target || ''
      };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in analyzeSubmissionMethod: ${error.message}`});
      return {
        hasSubmitButton: false,
        submitButtonText: '',
        formAction: '',
        formMethod: 'GET',
        formTarget: ''
      };
    }
  }
  
  extractValidationPatterns(inputs) {
    try {
      const patterns = {};
      inputs.forEach(input => {
        if (input.pattern || input.required || input.min || input.max) {
          patterns[input.name || input.id || 'unnamed'] = {
            pattern: input.pattern,
            required: input.required,
            min: input.min,
            max: input.max,
            minLength: input.minLength,
            maxLength: input.maxLength
          };
        }
      });
      return patterns;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractValidationPatterns: ${error.message}`});
      return {};
    }
  }
  
  analyzeAccessibility(container) {
    try {
      const labels = Array.from(container.querySelectorAll('label'));
      const fieldsets = Array.from(container.querySelectorAll('fieldset'));
      const legends = Array.from(container.querySelectorAll('legend'));
      
      return {
        labelCount: labels.length,
        fieldsetCount: fieldsets.length,
        legendCount: legends.length,
        hasAriaLabels: container.querySelectorAll('[aria-label]').length > 0
      };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in analyzeAccessibility: ${error.message}`});
      return {
        labelCount: 0,
        fieldsetCount: 0,
        legendCount: 0,
        hasAriaLabels: false
      };
    }
  }
  
  inferFormPurpose(container, inputs) {
    try {
      const hasPassword = inputs.some(i => i.type === 'password');
      const hasEmail = inputs.some(i => i.type === 'email');
      const hasUsername = inputs.some(i => i.name?.includes('user') || i.name?.includes('login'));
      const hasConfirmPassword = inputs.filter(i => i.type === 'password').length > 1;
      const hasMessage = inputs.some(i => i.tagName === 'textarea');
      const hasSearch = inputs.some(i => i.type === 'search' || i.name?.includes('search'));
      
      if (hasPassword && hasEmail && inputs.length <= 4) {
        return { type: 'authentication', subtype: 'login', confidence: 0.9 };
      } else if (hasPassword && hasConfirmPassword && inputs.length > 4) {
        return { type: 'authentication', subtype: 'registration', confidence: 0.9 };
      } else if (hasMessage && hasEmail) {
        return { type: 'communication', subtype: 'contact', confidence: 0.8 };
      } else if (hasSearch) {
        return { type: 'navigation', subtype: 'search', confidence: 0.9 };
      } else {
        return { type: 'generic', subtype: 'unknown', confidence: 0.3 };
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in inferFormPurpose: ${error.message}`});
      return { type: 'generic', subtype: 'unknown', confidence: 0.1 };
    }
  }
  
  deduplicateAndRank(clickables) {
    try {
      const seen = new Set();
      const unique = [];
      
      clickables.forEach(clickable => {
        const key = clickable.element.outerHTML;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(clickable);
        }
      });
      
      return unique.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in deduplicateAndRank: ${error.message}`});
      return [];
    }
  }
  
  categorizeInteractions(interactions) {
    try {
      return {
        total: Object.values(interactions).reduce((sum, arr) => sum + arr.length, 0),
        byType: {
          clicks: interactions.clicks.length,
          inputs: interactions.inputs.length,
          forms: interactions.forms.length,
          navigation: interactions.navigation.length,
          dynamic: interactions.dynamic.length
        },
        interactions: interactions
      };
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in categorizeInteractions: ${error.message}`});
      return { total: 0, byType: {}, interactions: {} };
    }
  }
  
  // Placeholder methods for other analysis types
  async analyzeEventPatterns() {
    try {
      return { patterns: [], confidence: 0.5 };
    } catch (error) {
      return { patterns: [], confidence: 0.0 };
    }
  }
  
  async discoverNavigationMethods() {
    try {
      return { methods: ['link', 'form', 'javascript'], confidence: 0.7 };
    } catch (error) {
      return { methods: [], confidence: 0.0 };
    }
  }
  
  async analyzeFormBehaviors() {
    try {
      return { behaviors: [], confidence: 0.6 };
    } catch (error) {
      return { behaviors: [], confidence: 0.0 };
    }
  }
  
  async monitorStateChanges() {
    try {
      return { changes: [], confidence: 0.4 };
    } catch (error) {
      return { changes: [], confidence: 0.0 };
    }
  }
  
  // 🤖 Call Gemini API
  async callGeminiAPI(prompt) {
    try {
      console.log('🤖 UNIVERSAL EVENT DETECTOR: Calling Gemini API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('Invalid API response structure');
      }
      
      console.log(`✅ UNIVERSAL EVENT DETECTOR: API response received: ${responseText.slice(0, 100)}...`);
      
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ UNIVERSAL EVENT DETECTOR: JSON parsed successfully:', result);
        return result;
      }
      
      console.log('⚠️ UNIVERSAL EVENT DETECTOR: No JSON found in response');
      return { error: 'Could not parse AI response' };
    } catch (error) {
      console.error('❌ UNIVERSAL EVENT DETECTOR: Gemini API error:', error);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Gemini API error: ${error.message}`});
      return null;
    }
  }

  async performAIAnalysis() {
    try {
      console.log('🤖 UNIVERSAL EVENT DETECTOR: Starting AI website analysis...');
      const pageContext = {
        url: window.location.href,
        title: document.title,
        elementCount: document.querySelectorAll('*').length,
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input, select, textarea').length
      };
      
      console.log(`📊 UNIVERSAL EVENT DETECTOR: Analyzing ${pageContext.url}`);
      console.log(`📈 UNIVERSAL EVENT DETECTOR: Elements: ${pageContext.elementCount}, Forms: ${pageContext.formCount}, Inputs: ${pageContext.inputCount}`);
      
      const prompt = `
      Analyze this webpage and provide insights:
      URL: ${pageContext.url}
      Title: ${pageContext.title}
      Elements: ${pageContext.elementCount}
      Forms: ${pageContext.formCount}
      Inputs: ${pageContext.inputCount}
      
      Return JSON:
      {
        "websiteType": "ecommerce|blog|application|portal|other",
        "complexity": "simple|moderate|complex",
        "interactionLevel": "low|medium|high",
        "formTypes": ["login", "contact", "search", "etc"],
        "confidence": 0.8
      }
      `;
      
      const response = await this.callGeminiAPI(prompt);
      
      if (response) {
        console.log('✅ UNIVERSAL EVENT DETECTOR: AI website analysis complete:', response);
        chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ AI website analysis: ${JSON.stringify(response)}`});
        return response;
      } else {
        console.log('⚠️ UNIVERSAL EVENT DETECTOR: AI analysis returned null');
        return null;
      }
    } catch (error) {
      console.error('❌ UNIVERSAL EVENT DETECTOR: AI website analysis failed:', error);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ AI website analysis failed: ${error.message}`});
      return null;
    }
  }
  
  // Fallback methods
  getFallbackAnalysis() {
    return {
      interactionPoints: { total: 0, byType: {}, interactions: {} },
      eventPatterns: { patterns: [], confidence: 0.0 },
      navigationMethods: { methods: [], confidence: 0.0 },
      formBehaviors: { behaviors: [], confidence: 0.0 },
      stateChanges: { changes: [], confidence: 0.0 },
      aiAnalysis: null
    };
  }
  
  getFallbackFormAnalysis(container) {
    return {
      inputTypes: {},
      relationships: [],
      submission: { hasSubmitButton: false, submitButtonText: '', formAction: '', formMethod: 'GET', formTarget: '' },
      validation: {},
      accessibility: { labelCount: 0, fieldsetCount: 0, legendCount: 0, hasAriaLabels: false },
      purpose: { type: 'generic', subtype: 'unknown', confidence: 0.1 }
    };
  }
  
  // Input element detection
  findInputElements() {
    try {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(input => ({
        element: input,
        type: input.type || input.tagName.toLowerCase(),
        metadata: this.extractElementMetadata(input)
      }));
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findInputElements: ${error.message}`});
      return [];
    }
  }
  
  // Navigation element detection
  findNavigationElements() {
    try {
      const navElements = Array.from(document.querySelectorAll('nav, a, button'));
      return navElements.map(el => ({
        element: el,
        type: 'navigation',
        metadata: this.extractElementMetadata(el)
      }));
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findNavigationElements: ${error.message}`});
      return [];
    }
  }
  
  // Dynamic element detection
  findDynamicElements() {
    try {
      const dynamicElements = Array.from(document.querySelectorAll('[data-dynamic], [data-toggle], [data-target]'));
      return dynamicElements.map(el => ({
        element: el,
        type: 'dynamic',
        metadata: this.extractElementMetadata(el)
      }));
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findDynamicElements: ${error.message}`});
      return [];
    }
  }
}

// Make UniversalEventDetector available globally
window.UniversalEventDetector = UniversalEventDetector;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== UNIVERSAL EVENT DETECTOR SCRIPT LOADED ==='});
}
