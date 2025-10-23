chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== UNIVERSAL FORM HANDLER SCRIPT LOADING ==='});

if (typeof window.UniversalFormHandler === 'undefined') {
class UniversalFormHandler {
  constructor() {
    this.detectionStrategies = [];
    this.submissionStrategies = [];
    this.validationStrategies = [];
    this.geminiApiKey = 'AIzaSyC495337JLVzngj2QTQGfEvO9CgSdSoK1c';
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'UniversalFormHandler initialized'});
  }
  
  // 🎯 Universal Form Detection
  detectForms() {
    try {
      console.log('🔍 UNIVERSAL FORM HANDLER: Starting universal form detection...');
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '🔍 Starting universal form detection...'});
      
      const startTime = performance.now();
      
      const strategies = [
        () => this.detectSemanticForms(),
        () => this.detectContainerForms(),
        () => this.detectInputClusters(),
        () => this.detectEventDrivenForms(),
        () => this.detectAIForms()
      ];
      
      const strategyNames = ['Semantic', 'Container', 'Input Cluster', 'Event Driven', 'AI Powered'];
      const allForms = [];
      
      strategies.forEach((strategy, index) => {
        try {
          const forms = strategy();
          console.log(`✅ UNIVERSAL FORM HANDLER: ${strategyNames[index]} strategy found ${forms.length} forms`);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ ${strategyNames[index]} strategy found ${forms.length} forms`});
          allForms.push(...forms);
        } catch (error) {
          console.error(`❌ UNIVERSAL FORM HANDLER: ${strategyNames[index]} strategy failed:`, error);
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ ${strategyNames[index]} strategy failed: ${error.message}`});
        }
      });
      
      const uniqueForms = this.deduplicateForms(allForms);
      const duration = performance.now() - startTime;
      
      console.log(`🎯 UNIVERSAL FORM HANDLER: Detection complete in ${duration.toFixed(2)}ms`);
      console.log(`📊 UNIVERSAL FORM HANDLER: Found ${uniqueForms.length} unique forms from ${allForms.length} total`);
      
      uniqueForms.forEach((form, index) => {
        console.log(`📋 UNIVERSAL FORM HANDLER: Form ${index + 1}: ${form.type} (confidence: ${form.confidence})`);
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🎯 Detection complete in ${duration.toFixed(2)}ms - Found ${uniqueForms.length} unique forms`});
      
      return uniqueForms;
    } catch (error) {
      console.error('❌ UNIVERSAL FORM HANDLER: Error in detectForms:', error);
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `❌ Error in detectForms: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Semantic Form Detection
  detectSemanticForms() {
    try {
      const forms = [];
      const semanticForms = document.querySelectorAll('form');
      
      semanticForms.forEach(form => {
        forms.push({
          element: form,
          type: 'semantic',
          confidence: 1.0,
          analysis: this.analyzeFormStructure(form)
        });
      });
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in detectSemanticForms: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Container Form Detection
  detectContainerForms() {
    try {
      const forms = [];
      const containers = this.findFormLikeContainers();
      
      containers.forEach(container => {
        forms.push({
          element: container,
          type: 'container',
          confidence: 0.8,
          analysis: this.analyzeFormStructure(container)
        });
      });
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in detectContainerForms: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Input Cluster Detection
  detectInputClusters() {
    try {
      const forms = [];
      const clusters = this.findInputClusters();
      
      clusters.forEach(cluster => {
        forms.push({
          element: cluster.container,
          type: 'cluster',
          confidence: 0.7,
          analysis: this.analyzeFormStructure(cluster.container)
        });
      });
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in detectInputClusters: ${error.message}`});
      return [];
    }
  }
  
  // 🔍 Event-Driven Form Detection
  detectEventDrivenForms() {
    try {
      const forms = [];
      const interactiveElements = document.querySelectorAll('[onclick], [onmousedown], [onmouseup]');
      
      interactiveElements.forEach(element => {
        const container = element.closest('div, section, form, article');
        if (container) {
          const inputs = container.querySelectorAll('input, select, textarea');
          if (inputs.length >= 2) {
            forms.push({
              element: container,
              type: 'event-driven',
              confidence: 0.6,
              analysis: this.analyzeFormStructure(container)
            });
          }
        }
      });
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in detectEventDrivenForms: ${error.message}`});
      return [];
    }
  }
  
  // 🤖 AI-Powered Form Detection
  detectAIForms() {
    try {
      const forms = [];
      const potentialContainers = document.querySelectorAll('div, section, article, main');
      
      potentialContainers.forEach(container => {
        const inputs = container.querySelectorAll('input, select, textarea');
        if (inputs.length >= 2) {
          const analysis = this.analyzeFormStructure(container);
          if (analysis.isForm) {
            forms.push({
              element: container,
              type: 'ai-detected',
              confidence: analysis.confidence,
              analysis: analysis
            });
          }
        }
      });
      
      return forms;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in detectAIForms: ${error.message}`});
      return [];
    }
  }
  
  // 🧠 Enhanced Form Structure Analysis
  analyzeFormStructure(container) {
    try {
      const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
      const analysis = {
        inputTypes: this.categorizeInputs(inputs),
        relationships: this.findInputRelationships(inputs),
        purpose: this.inferFormPurpose(container, inputs),
        submission: this.analyzeSubmissionMethod(container),
        validation: this.extractValidationPatterns(inputs),
        accessibility: this.analyzeAccessibility(container),
        fieldsets: this.extractFieldsets(container),
        legends: this.extractLegends(container),
        labels: this.extractLabels(container),
        isForm: this.isFormLike(container, inputs),
        confidence: this.calculateFormConfidence(container, inputs)
      };
      
      return analysis;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in analyzeFormStructure: ${error.message}`});
      return this.getFallbackFormAnalysis(container);
    }
  }
  
  // 🎯 Enhanced Input Analysis with Labels and Values
  categorizeInputs(inputs) {
    try {
      const categories = {};
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `📝 Categorizing ${inputs.length} inputs...`});
      
      inputs.forEach((input, index) => {
        const type = input.type || input.tagName.toLowerCase();
        if (!categories[type]) categories[type] = [];
        
        const label = this.extractInputLabel(input);
        
        const inputData = {
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required,
          value: input.value,
          checked: input.checked,
          options: this.extractSelectOptions(input),
          label: label,
          fieldset: this.extractInputFieldset(input),
          validation: this.extractInputValidation(input)
        };
        
        // Log label extraction result
        if (index < 5) { // Only log first 5 to avoid spam
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  Input ${index + 1} [${type}]: name="${input.name}", id="${input.id}", label="${label}"`});
        }
        
        // For radio buttons and checkboxes, add group information
        if (type === 'radio' || type === 'checkbox') {
          inputData.groupName = input.name;
          inputData.groupLabel = this.extractGroupLabel(input);
        }
        
        categories[type].push(inputData);
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Categorized inputs into ${Object.keys(categories).length} types`});
      
      return categories;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in categorizeInputs: ${error.message}`});
      return {};
    }
  }
  
  // 🎯 Extract Group Label for Radio/Checkbox Groups
  extractGroupLabel(input) {
    try {
      // Check if the group is within a fieldset
      const fieldset = input.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) return legend.textContent.trim();
      }
      
      // Check for common parent with label-like class
      const parent = input.closest('[class*="group"], [class*="radio"], [class*="checkbox"]');
      if (parent) {
        const groupLabel = parent.querySelector('.label, .form-label, [class*="label"]:not(label)');
        if (groupLabel) return groupLabel.textContent.trim();
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }
  
  // 🏷️ Extract Input Labels (Enhanced)
  extractInputLabel(input) {
    try {
      // Method 1: aria-label attribute
      if (input.getAttribute('aria-label')) {
        return input.getAttribute('aria-label').trim();
      }
      
      // Method 2: aria-labelledby
      const labelledBy = input.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelElement = document.getElementById(labelledBy);
        if (labelElement) return labelElement.textContent.trim();
      }
      
      // Method 3: Associated label by 'for' attribute
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label.textContent.trim();
      }
      
      // Method 4: Parent label
      const parentLabel = input.closest('label');
      if (parentLabel) {
        // Remove input's own value from label text
        const labelText = parentLabel.textContent.trim();
        const inputText = input.value || input.placeholder || '';
        return labelText.replace(inputText, '').trim();
      }
      
      // Method 5: data-label or data-test-id attributes
      const dataLabel = input.getAttribute('data-label') || input.getAttribute('data-test-id');
      if (dataLabel) return dataLabel.trim();
      
      // Method 6: title attribute
      if (input.title) return input.title.trim();
      
      // Method 7: Previous sibling label-like elements
      let prevElement = input.previousElementSibling;
      while (prevElement) {
        if (prevElement.tagName === 'LABEL' || 
            prevElement.classList.contains('label') ||
            prevElement.classList.contains('form-label')) {
          return prevElement.textContent.trim();
        }
        prevElement = prevElement.previousElementSibling;
      }
      
      // Method 8: Previous sibling text node
      const prevSibling = input.previousSibling;
      if (prevSibling && prevSibling.nodeType === Node.TEXT_NODE) {
        const text = prevSibling.textContent.trim();
        if (text && text.length > 0 && text.length < 50) {
          return text;
        }
      }
      
      // Method 9: Parent element's label-like child
      const parent = input.parentElement;
      if (parent) {
        const labelChild = parent.querySelector('.label, .form-label, [class*="label"]');
        if (labelChild && labelChild !== input) {
          return labelChild.textContent.trim();
        }
      }
      
      // Method 10: Placeholder as fallback (prefix with "Placeholder:")
      if (input.placeholder) {
        return `Placeholder: ${input.placeholder}`;
      }
      
      // Method 11: Name as last resort (prefix with "Field:")
      if (input.name) {
        return `Field: ${input.name}`;
      }
      
      return '';
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractInputLabel: ${error.message}`});
      return '';
    }
  }
  
  // 📦 Extract Select Options
  extractSelectOptions(input) {
    try {
      if (input.tagName === 'SELECT') {
        return Array.from(input.options).map(option => ({
          value: option.value,
          text: option.textContent,
          selected: option.selected
        }));
      }
      return [];
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractSelectOptions: ${error.message}`});
      return [];
    }
  }
  
  // 🗂️ Extract Input Fieldset
  extractInputFieldset(input) {
    try {
      const fieldset = input.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        return {
          id: fieldset.id,
          class: fieldset.className,
          legend: legend ? legend.textContent.trim() : ''
        };
      }
      return null;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractInputFieldset: ${error.message}`});
      return null;
    }
  }
  
  // ✅ Extract Input Validation (ENHANCED with client-side rules)
  extractInputValidation(input) {
    try {
      const validation = {
        // HTML5 standard validation
        required: input.required,
        type: input.type,
        pattern: input.pattern || null,
        minLength: input.minLength > 0 ? input.minLength : null,
        maxLength: input.maxLength < 524288 ? input.maxLength : null, // Ignore browser default
        min: input.min || null,
        max: input.max || null,
        step: input.step || null,
        
        // File input specific
        accept: input.accept || null,
        multiple: input.multiple || false,
        
        // State
        readOnly: input.readOnly || false,
        disabled: input.disabled || false,
        
        // Custom validation attributes
        customValidation: {},
        errorMessages: [],
        
        // HTML5 validation message
        validationMessage: input.validationMessage || null,
        
        // Validity state
        validity: input.validity ? {
          valid: input.validity.valid,
          valueMissing: input.validity.valueMissing,
          typeMismatch: input.validity.typeMismatch,
          patternMismatch: input.validity.patternMismatch,
          tooLong: input.validity.tooLong,
          tooShort: input.validity.tooShort,
          rangeUnderflow: input.validity.rangeUnderflow,
          rangeOverflow: input.validity.rangeOverflow,
          stepMismatch: input.validity.stepMismatch
        } : null
      };
      
      // Extract custom validation from data attributes
      for (const attr of input.attributes) {
        const attrName = attr.name.toLowerCase();
        
        // data-validate-*, data-validation-*, data-rule-*
        if (attrName.startsWith('data-validate') || 
            attrName.startsWith('data-validation') || 
            attrName.startsWith('data-rule')) {
          validation.customValidation[attr.name] = attr.value;
        }
        
        // Error messages: data-error, data-error-*, data-message-*
        if (attrName.startsWith('data-error') || 
            attrName.startsWith('data-message')) {
          validation.errorMessages.push({
            attribute: attr.name,
            message: attr.value
          });
        }
        
        // Min/max values in data attributes
        if (attrName === 'data-min') validation.min = attr.value;
        if (attrName === 'data-max') validation.max = attr.value;
        if (attrName === 'data-minlength') validation.minLength = parseInt(attr.value);
        if (attrName === 'data-maxlength') validation.maxLength = parseInt(attr.value);
      }
      
      // Check for associated error message elements
      const errorElements = [
        input.nextElementSibling?.querySelector('.error, .invalid-feedback, .error-message'),
        document.querySelector(`#${input.id}-error`),
        document.querySelector(`[data-error-for="${input.id}"]`),
        document.querySelector(`[aria-describedby="${input.getAttribute('aria-describedby')}"]`)
      ].filter(el => el);
      
      errorElements.forEach(el => {
        if (el && el.textContent.trim()) {
          validation.errorMessages.push({
            type: 'error-element',
            message: el.textContent.trim(),
            id: el.id || null
          });
        }
      });
      
      // Check for validation libraries (jQuery Validation, Parsley, etc.)
      if (input.hasAttribute('data-parsley-required')) {
        validation.customValidation['parsley-required'] = input.getAttribute('data-parsley-required');
      }
      if (input.hasAttribute('data-parsley-pattern')) {
        validation.customValidation['parsley-pattern'] = input.getAttribute('data-parsley-pattern');
      }
      if (input.hasAttribute('data-parsley-minlength')) {
        validation.customValidation['parsley-minlength'] = input.getAttribute('data-parsley-minlength');
      }
      
      return validation;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractInputValidation: ${error.message}`});
      return {
        required: false,
        type: input.type || 'text',
        pattern: null,
        minLength: null,
        maxLength: null,
        min: null,
        max: null,
        step: null,
        customValidation: {},
        errorMessages: []
      };
    }
  }
  
  // 🔍 Enhanced Form Purpose Inference
  inferFormPurpose(container, inputs) {
    try {
      const signals = {
        hasPassword: inputs.some(i => i.type === 'password'),
        hasEmail: inputs.some(i => i.type === 'email'),
        hasUsername: inputs.some(i => i.name?.includes('user') || i.name?.includes('login')),
        hasConfirmPassword: inputs.filter(i => i.type === 'password').length > 1,
        hasMessage: inputs.some(i => i.tagName === 'textarea'),
        hasSearch: inputs.some(i => i.type === 'search' || i.name?.includes('search')),
        hasQuantity: inputs.some(i => i.type === 'number' || i.name?.includes('qty')),
        hasPrice: inputs.some(i => i.name?.includes('price') || i.name?.includes('amount')),
        hasAddress: inputs.some(i => i.name?.includes('address') || i.name?.includes('street')),
        hasRadio: inputs.some(i => i.type === 'radio'),
        hasCheckbox: inputs.some(i => i.type === 'checkbox'),
        hasTime: inputs.some(i => i.type === 'time' || i.type === 'datetime-local'),
        hasSelect: inputs.some(i => i.tagName === 'select'),
        inputCount: inputs.length
      };
      
      // Enhanced decision tree
      if (signals.hasPassword && signals.hasEmail && signals.inputCount <= 4) {
        return { type: 'authentication', subtype: 'login', confidence: 0.9 };
      } else if (signals.hasPassword && signals.hasConfirmPassword && signals.inputCount > 4) {
        return { type: 'authentication', subtype: 'registration', confidence: 0.9 };
      } else if (signals.hasRadio && signals.hasCheckbox && signals.hasTime) {
        return { type: 'ecommerce', subtype: 'order', confidence: 0.8 };
      } else if (signals.hasRadio && signals.hasCheckbox && signals.inputCount > 8) {
        return { type: 'complex', subtype: 'multi-section', confidence: 0.8 };
      } else if (signals.hasMessage && signals.hasEmail) {
        return { type: 'communication', subtype: 'contact', confidence: 0.8 };
      } else if (signals.hasSearch) {
        return { type: 'navigation', subtype: 'search', confidence: 0.9 };
      } else if (signals.inputCount <= 3 && !signals.hasPassword) {
        return { type: 'simple', subtype: 'basic', confidence: 0.7 };
      } else {
        return { type: 'generic', subtype: 'unknown', confidence: 0.3 };
      }
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in inferFormPurpose: ${error.message}`});
      return { type: 'generic', subtype: 'unknown', confidence: 0.1 };
    }
  }
  
  // 🔧 Helper Methods
  findFormLikeContainers() {
    try {
      const containers = [];
      const selectors = [
        'div[id*="form"]', 'div[class*="form"]',
        'section[id*="form"]', 'section[class*="form"]',
        'div[id*="login"]', 'div[class*="login"]',
        'div[id*="auth"]', 'div[class*="auth"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const inputCount = el.querySelectorAll('input, select, textarea').length;
          if (inputCount >= 2) {
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
  
  findInputClusters() {
    try {
      const clusters = [];
      const allInputs = document.querySelectorAll('input, select, textarea');
      const processedInputs = new Set();
      
      allInputs.forEach(input => {
        if (processedInputs.has(input)) return;
        
        const container = input.closest('div, section, form, article, main');
        if (container) {
          const relatedInputs = Array.from(container.querySelectorAll('input, select, textarea'));
          if (relatedInputs.length >= 2) {
            clusters.push({
              container: container,
              inputs: relatedInputs
            });
            
            relatedInputs.forEach(inp => processedInputs.add(inp));
          }
        }
      });
      
      return clusters;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findInputClusters: ${error.message}`});
      return [];
    }
  }
  
  isFormLike(container, inputs) {
    try {
      // Check if this container behaves like a form
      const hasInputs = inputs.length >= 2;
      const hasSubmitButton = container.querySelector('button, input[type="submit"], input[type="button"]');
      const hasFormTag = container.tagName === 'FORM';
      const hasFormAttributes = container.hasAttribute('action') || container.hasAttribute('method');
      
      return hasInputs && (hasSubmitButton || hasFormTag || hasFormAttributes);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in isFormLike: ${error.message}`});
      return false;
    }
  }
  
  calculateFormConfidence(container, inputs) {
    try {
      let confidence = 0.3; // Base confidence
      
      // Increase confidence based on indicators
      if (container.tagName === 'FORM') confidence += 0.4;
      if (inputs.length >= 2) confidence += 0.2;
      if (container.querySelector('button, input[type="submit"]')) confidence += 0.2;
      if (container.hasAttribute('action') || container.hasAttribute('method')) confidence += 0.1;
      if (inputs.some(i => i.type === 'password')) confidence += 0.1;
      
      return Math.min(confidence, 1.0);
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in calculateFormConfidence: ${error.message}`});
      return 0.1;
    }
  }
  
  extractFieldsets(container) {
    try {
      const fieldsets = Array.from(container.querySelectorAll('fieldset'));
      return fieldsets.map(fieldset => {
        const legend = fieldset.querySelector('legend');
        return {
          id: fieldset.id,
          class: fieldset.className,
          legend: legend ? legend.textContent.trim() : '',
          inputCount: fieldset.querySelectorAll('input, select, textarea').length
        };
      });
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractFieldsets: ${error.message}`});
      return [];
    }
  }
  
  extractLegends(container) {
    try {
      const legends = Array.from(container.querySelectorAll('legend'));
      return legends.map(legend => ({
        text: legend.textContent.trim(),
        fieldset: legend.closest('fieldset')?.id || ''
      }));
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractLegends: ${error.message}`});
      return [];
    }
  }
  
  extractLabels(container) {
    try {
      const labels = Array.from(container.querySelectorAll('label'));
      return labels.map(label => ({
        text: label.textContent.trim(),
        for: label.getAttribute('for'),
        associatedInput: label.getAttribute('for') ? document.querySelector(`#${label.getAttribute('for')}`) : null
      }));
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in extractLabels: ${error.message}`});
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
            count: radios.length,
            values: radios.map(r => r.value)
          });
        }
      });
      
      return relationships;
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in findInputRelationships: ${error.message}`});
      return [];
    }
  }
  
  deduplicateForms(forms) {
    try {
      const seen = new Set();
      const unique = [];
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `🔍 Deduplicating ${forms.length} forms...`});
      
      forms.forEach((form, index) => {
        try {
          // Create a unique key based on INPUT ELEMENTS only (not container)
          const inputs = Array.from(form.element.querySelectorAll('input, select, textarea'));
          
          // Create signature based on actual input properties
          const inputSignature = inputs.map(input => {
            const type = input.type || input.tagName.toLowerCase();
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            // Use the most specific identifier available
            const identifier = name || id || placeholder;
            return `${type}:${identifier}`;
          }).sort().join('|'); // Sort to ensure consistent ordering
          
          // Key is ONLY based on inputs, not the container
          const key = `${inputSignature}:${inputs.length}`;
          
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(form);
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  ✅ Form ${index + 1}: UNIQUE (${inputs.length} inputs, type: ${form.type})`});
          } else {
            chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  ⏭️ Form ${index + 1}: DUPLICATE (skipped, same as earlier form)`});
          }
        } catch (err) {
          chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `  ⚠️ Form ${index + 1}: Error processing - ${err.message}`});
          // Keep form if we can't analyze it
          unique.push(form);
        }
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `✅ Deduplicated from ${forms.length} to ${unique.length} unique forms`});
      
      // Sort by confidence and prefer semantic forms
      return unique.sort((a, b) => {
        // Prefer semantic forms (type='semantic')
        if (a.type === 'semantic' && b.type !== 'semantic') return -1;
        if (b.type === 'semantic' && a.type !== 'semantic') return 1;
        // Then sort by confidence
        return b.confidence - a.confidence;
      });
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Error in deduplicateForms: ${error.message}`});
      return forms; // Return original forms if deduplication fails
    }
  }
  
  // Fallback method
  getFallbackFormAnalysis(container) {
    return {
      inputTypes: {},
      relationships: [],
      purpose: { type: 'generic', subtype: 'unknown', confidence: 0.1 },
      submission: { hasSubmitButton: false, submitButtonText: '', formAction: '', formMethod: 'GET', formTarget: '' },
      validation: {},
      accessibility: { labelCount: 0, fieldsetCount: 0, legendCount: 0, hasAriaLabels: false },
      fieldsets: [],
      legends: [],
      labels: [],
      isForm: false,
      confidence: 0.1
    };
  }
}

// Make UniversalFormHandler available globally
window.UniversalFormHandler = UniversalFormHandler;
chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: '=== UNIVERSAL FORM HANDLER SCRIPT LOADED ==='});
}
