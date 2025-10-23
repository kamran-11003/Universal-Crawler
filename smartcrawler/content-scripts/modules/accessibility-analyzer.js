console.log('=== ACCESSIBILITY ANALYZER SCRIPT LOADING ===');

if (typeof window.AccessibilityAnalyzer === 'undefined') {
class AccessibilityAnalyzer {
  constructor() {
    this.issues = {
      aria: [],
      contrast: [],
      keyboard: [],
      labels: [],
      images: [],
      headings: []
    };
    this.enabled = false;
    this.validRoles = [
      'alert', 'alertdialog', 'button', 'checkbox', 'dialog', 'gridcell',
      'link', 'log', 'marquee', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'option', 'progressbar', 'radio', 'scrollbar', 'searchbox', 'slider',
      'spinbutton', 'status', 'switch', 'tab', 'tabpanel', 'textbox',
      'timer', 'tooltip', 'treeitem', 'combobox', 'grid', 'listbox',
      'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid',
      'application', 'article', 'cell', 'columnheader', 'definition',
      'directory', 'document', 'feed', 'figure', 'group', 'heading',
      'img', 'list', 'listitem', 'math', 'none', 'note', 'presentation',
      'region', 'row', 'rowgroup', 'rowheader', 'separator', 'table',
      'term', 'toolbar', 'banner', 'complementary', 'contentinfo',
      'form', 'main', 'navigation', 'search'
    ];
  }

  initialize() {
    if (this.enabled) return;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Accessibility Analyzer: Initializing...'});
    
    this.checkARIAAttributes();
    this.checkColorContrast();
    this.checkKeyboardNavigation();
    this.checkFormLabels();
    this.checkImages();
    this.checkHeadings();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Found ${this.getTotalIssues()} issues`});
  }

  checkARIAAttributes() {
    try {
      // Check for ARIA role validity
      const elementsWithRoles = document.querySelectorAll('[role]');
      elementsWithRoles.forEach((element) => {
        const role = element.getAttribute('role');
        if (!this.isValidARIARole(role)) {
          this.issues.aria.push({
            type: 'invalid_role',
            element: this.getSelector(element),
            role: role,
            severity: 'error'
          });
        }
      });

      // Check for required ARIA properties
      const interactiveElements = document.querySelectorAll('button, a, [role="button"], [role="link"]');
      interactiveElements.forEach((element) => {
        const hasLabel = element.getAttribute('aria-label') || 
                        element.getAttribute('aria-labelledby') ||
                        element.textContent.trim() ||
                        element.getAttribute('title');
        
        if (!hasLabel) {
          this.issues.aria.push({
            type: 'missing_label',
            element: this.getSelector(element),
            severity: 'error'
          });
        }
      });

      // Check for ARIA landmarks
      const landmarks = document.querySelectorAll('[role="banner"], [role="main"], [role="navigation"], [role="complementary"], [role="contentinfo"]');
      const landmarkCounts = {};
      landmarks.forEach((landmark) => {
        const role = landmark.getAttribute('role');
        landmarkCounts[role] = (landmarkCounts[role] || 0) + 1;
      });

      // Check for multiple banners/mains (should be unique)
      if (landmarkCounts.banner > 1) {
        this.issues.aria.push({
          type: 'multiple_banners',
          count: landmarkCounts.banner,
          severity: 'warning'
        });
      }
      if (landmarkCounts.main > 1) {
        this.issues.aria.push({
          type: 'multiple_mains',
          count: landmarkCounts.main,
          severity: 'warning'
        });
      }

      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: ARIA check complete - ${this.issues.aria.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: ARIA check error: ${error.message}`});
    }
  }

  checkColorContrast() {
    try {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, div');
      let checkedCount = 0;
      
      textElements.forEach((element) => {
        if (checkedCount >= 50) return; // Limit checks for performance
        
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = this.getBackgroundColor(element);
        
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const contrast = this.calculateContrast(color, backgroundColor);
          
          if (contrast < 4.5) { // WCAG AA requirement
            this.issues.contrast.push({
              element: this.getSelector(element),
              contrast: contrast.toFixed(2),
              required: 4.5,
              severity: contrast < 3 ? 'error' : 'warning',
              text: element.textContent.substring(0, 50)
            });
          }
          checkedCount++;
        }
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Contrast check complete - ${this.issues.contrast.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Contrast check error: ${error.message}`});
    }
  }

  getBackgroundColor(element) {
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const bgColor = style.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return bgColor;
      }
      current = current.parentElement;
    }
    return 'rgb(255, 255, 255)'; // Default to white
  }

  checkKeyboardNavigation() {
    try {
      const focusableElements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );
      
      focusableElements.forEach((element, index) => {
        const tabIndex = element.getAttribute('tabindex');
        
        // Check for positive tabindex (bad practice)
        if (tabIndex && parseInt(tabIndex) > 0) {
          this.issues.keyboard.push({
            type: 'positive_tabindex',
            element: this.getSelector(element),
            tabindex: tabIndex,
            severity: 'warning'
          });
        }

        // Check if element is visible but not focusable
        if (this.isVisible(element) && !this.isFocusable(element)) {
          this.issues.keyboard.push({
            type: 'not_focusable',
            element: this.getSelector(element),
            severity: 'warning'
          });
        }

        // Check for keyboard trap (simplified check)
        if (element.getAttribute('aria-hidden') === 'true' && this.isVisible(element)) {
          this.issues.keyboard.push({
            type: 'hidden_but_visible',
            element: this.getSelector(element),
            severity: 'warning'
          });
        }
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Keyboard check complete - ${this.issues.keyboard.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Keyboard check error: ${error.message}`});
    }
  }

  checkFormLabels() {
    try {
      const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      inputs.forEach((input) => {
        const label = this.findLabel(input);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');
        
        if (!label && !ariaLabel && !ariaLabelledby && !placeholder) {
          this.issues.labels.push({
            type: 'missing_label',
            element: this.getSelector(input),
            inputType: input.type || input.tagName.toLowerCase(),
            severity: 'error'
          });
        }
        
        // Check for empty labels
        if (label && !label.textContent.trim()) {
          this.issues.labels.push({
            type: 'empty_label',
            element: this.getSelector(input),
            severity: 'warning'
          });
        }
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Form labels check complete - ${this.issues.labels.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Form labels check error: ${error.message}`});
    }
  }

  checkImages() {
    try {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        const ariaLabel = img.getAttribute('aria-label');
        const role = img.getAttribute('role');
        
        // Check for missing alt text
        if (alt === null && !ariaLabel && role !== 'presentation') {
          this.issues.images.push({
            type: 'missing_alt',
            element: this.getSelector(img),
            src: img.src,
            severity: 'error'
          });
        }
        
        // Check for empty alt text (might be decorative)
        if (alt === '') {
          this.issues.images.push({
            type: 'empty_alt',
            element: this.getSelector(img),
            src: img.src,
            severity: 'warning'
          });
        }
        
        // Check for long alt text (might need a caption)
        if (alt && alt.length > 125) {
          this.issues.images.push({
            type: 'long_alt',
            element: this.getSelector(img),
            altLength: alt.length,
            severity: 'warning'
          });
        }
      });
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Images check complete - ${this.issues.images.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Images check error: ${error.message}`});
    }
  }

  checkHeadings() {
    try {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
      const headingLevels = [];
      
      headings.forEach((heading) => {
        const level = heading.tagName.match(/H(\d)/) ? parseInt(heading.tagName.match(/H(\d)/)[1]) : 
                     parseInt(heading.getAttribute('aria-level')) || 1;
        
        headingLevels.push({
          element: this.getSelector(heading),
          level: level,
          text: heading.textContent.trim().substring(0, 50)
        });
        
        // Check for empty headings
        if (!heading.textContent.trim()) {
          this.issues.headings.push({
            type: 'empty_heading',
            element: this.getSelector(heading),
            level: level,
            severity: 'error'
          });
        }
      });
      
      // Check for heading hierarchy
      let expectedLevel = 1;
      for (const heading of headingLevels) {
        if (heading.level > expectedLevel + 1) {
          this.issues.headings.push({
            type: 'heading_skip',
            element: heading.element,
            level: heading.level,
            expectedLevel: expectedLevel + 1,
            severity: 'warning'
          });
        }
        expectedLevel = Math.max(expectedLevel, heading.level);
      }
      
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Headings check complete - ${this.issues.headings.length} issues`});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: `Accessibility Analyzer: Headings check error: ${error.message}`});
    }
  }

  isValidARIARole(role) {
    return this.validRoles.includes(role);
  }

  calculateContrast(color1, color2) {
    try {
      const rgb1 = this.parseColor(color1);
      const rgb2 = this.parseColor(color2);
      
      const l1 = this.getLuminance(rgb1);
      const l2 = this.getLuminance(rgb2);
      
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      
      return (lighter + 0.05) / (darker + 0.05);
    } catch (error) {
      return 1; // Return low contrast if calculation fails
    }
  }

  parseColor(color) {
    // Parse RGB/RGBA color string
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    
    // Parse hex color
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return { r, g, b };
    }
    
    return { r: 0, g: 0, b: 0 };
  }

  getLuminance(rgb) {
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  findLabel(input) {
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label;
    }
    return input.closest('label');
  }

  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0;
  }

  isFocusable(element) {
    return element.tabIndex >= 0 || element.getAttribute('contenteditable') === 'true';
  }

  getSelector(element) {
    if (element.id) return `#${element.id}`;
    
    // Get className safely (might be SVG element)
    let classNameStr = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        classNameStr = element.className;
      } else if (element.className.baseVal !== undefined) {
        classNameStr = element.className.baseVal; // SVG
      } else if (element.getAttribute) {
        classNameStr = element.getAttribute('class') || '';
      }
    }
    
    if (classNameStr) {
      const classes = classNameStr.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  getTotalIssues() {
    return Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0);
  }

  getIssues() {
    return this.issues;
  }

  getWCAGLevel() {
    const totalIssues = this.getTotalIssues();
    const errorCount = Object.values(this.issues).reduce((sum, arr) => 
      sum + arr.filter(issue => issue.severity === 'error').length, 0);
    
    if (totalIssues === 0) return 'AAA';
    if (errorCount === 0 && totalIssues < 5) return 'AA';
    if (errorCount < 3 && totalIssues < 15) return 'A';
    return 'FAILED';
  }

  getSummary() {
    const totalIssues = this.getTotalIssues();
    const errorCount = Object.values(this.issues).reduce((sum, arr) => 
      sum + arr.filter(issue => issue.severity === 'error').length, 0);
    const warningCount = totalIssues - errorCount;
    
    return {
      totalIssues,
      errors: errorCount,
      warnings: warningCount,
      wcagLevel: this.getWCAGLevel(),
      categories: {
        aria: this.issues.aria.length,
        contrast: this.issues.contrast.length,
        keyboard: this.issues.keyboard.length,
        labels: this.issues.labels.length,
        images: this.issues.images.length,
        headings: this.issues.headings.length
      }
    };
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.initialize();
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Accessibility Analyzer: Enabled'});
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    chrome.runtime.sendMessage({type: 'DEBUG_LOG', message: 'Accessibility Analyzer: Disabled'});
  }

  cleanup() {
    this.disable();
    this.issues = {
      aria: [],
      contrast: [],
      keyboard: [],
      labels: [],
      images: [],
      headings: []
    };
  }
}

window.AccessibilityAnalyzer = AccessibilityAnalyzer;
}

console.log('=== ACCESSIBILITY ANALYZER SCRIPT LOADED ===');
