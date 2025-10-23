/**
 * Human Behavior Simulator
 * Simulates natural human interactions to evade bot detection
 * Includes: mouse movements, scrolling, focus events, typing patterns
 */

class HumanBehaviorSimulator {
  constructor() {
    this.isSimulating = false;
    this.mouseX = 0;
    this.mouseY = 0;
  }
  
  /**
   * Main method to simulate comprehensive human behavior
   */
  async simulateHumanBehavior() {
    if (this.isSimulating) return; // Already simulating
    
    this.isSimulating = true;
    console.log('🤖→👤 Simulating human behavior...');
    
    try {
      // Execute behaviors in parallel for more natural feel
      await Promise.all([
        this.simulateMouseMovement(),
        this.randomScroll(),
        this.simulateFocus()
      ]);
      
      // Add a random pause
      await this.randomPause();
      
      console.log('✅ Human behavior simulation complete');
    } finally {
      this.isSimulating = false;
    }
  }
  
  /**
   * Simulate natural mouse movements (Bezier curves for smooth paths)
   */
  async simulateMouseMovement() {
    const duration = 2000; // 2 seconds of movement
    const steps = 20;
    const stepDuration = duration / steps;
    
    // Start from current position or random
    let startX = this.mouseX || Math.random() * window.innerWidth;
    let startY = this.mouseY || Math.random() * window.innerHeight;
    
    // Target position (random)
    const targetX = Math.random() * window.innerWidth;
    const targetY = Math.random() * window.innerHeight;
    
    // Control points for Bezier curve (creates natural arc)
    const controlX1 = startX + (Math.random() - 0.5) * 200;
    const controlY1 = startY + (Math.random() - 0.5) * 200;
    const controlX2 = targetX + (Math.random() - 0.5) * 200;
    const controlY2 = targetY + (Math.random() - 0.5) * 200;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Cubic Bezier curve calculation
      const x = Math.pow(1 - t, 3) * startX +
                3 * Math.pow(1 - t, 2) * t * controlX1 +
                3 * (1 - t) * Math.pow(t, 2) * controlX2 +
                Math.pow(t, 3) * targetX;
                
      const y = Math.pow(1 - t, 3) * startY +
                3 * Math.pow(1 - t, 2) * t * controlY1 +
                3 * (1 - t) * Math.pow(t, 2) * controlY2 +
                Math.pow(t, 3) * targetY;
      
      // Add small random jitter for naturalness
      const jitterX = (Math.random() - 0.5) * 5;
      const jitterY = (Math.random() - 0.5) * 5;
      
      this.mouseX = Math.max(0, Math.min(x + jitterX, window.innerWidth));
      this.mouseY = Math.max(0, Math.min(y + jitterY, window.innerHeight));
      
      // Dispatch mouse move event
      const event = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: this.mouseX,
        clientY: this.mouseY
      });
      
      document.dispatchEvent(event);
      
      // Check if mouse is over an element, dispatch mouseenter/mouseover
      const elementUnderMouse = document.elementFromPoint(this.mouseX, this.mouseY);
      if (elementUnderMouse) {
        elementUnderMouse.dispatchEvent(new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          clientX: this.mouseX,
          clientY: this.mouseY
        }));
      }
      
      await this.wait(stepDuration);
    }
  }
  
  /**
   * Simulate natural scrolling behavior
   */
  async randomScroll() {
    const scrollPatterns = [
      'read-top',       // Quick scroll to top
      'read-middle',    // Scroll to middle and pause
      'read-bottom',    // Scroll to bottom gradually
      'scan',           // Quick scan (multiple small scrolls)
      'read-section'    // Read specific section
    ];
    
    const pattern = scrollPatterns[Math.floor(Math.random() * scrollPatterns.length)];
    
    console.log(`📜 Simulating scroll pattern: ${pattern}`);
    
    switch (pattern) {
      case 'read-top':
        await this.scrollToPosition(0, 800);
        break;
        
      case 'read-middle':
        const middlePos = document.body.scrollHeight * 0.5;
        await this.scrollToPosition(middlePos, 1500);
        await this.wait(500); // Pause to "read"
        break;
        
      case 'read-bottom':
        await this.scrollToPosition(document.body.scrollHeight, 2500);
        break;
        
      case 'scan':
        // Multiple small scrolls
        for (let i = 0; i < 5; i++) {
          const scrollAmount = window.scrollY + 200 + Math.random() * 300;
          await this.scrollToPosition(scrollAmount, 300);
          await this.wait(200 + Math.random() * 300);
        }
        break;
        
      case 'read-section':
        // Scroll to random section
        const sectionPos = Math.random() * document.body.scrollHeight * 0.7;
        await this.scrollToPosition(sectionPos, 1200);
        await this.wait(800); // Pause to "read"
        // Scroll down a bit more
        await this.scrollToPosition(sectionPos + 300, 500);
        break;
    }
  }
  
  /**
   * Smooth scroll to position
   */
  async scrollToPosition(targetY, duration) {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const scroll = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out)
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
        
        const currentY = startY + (distance * easeProgress);
        window.scrollTo(0, currentY);
        
        if (progress < 1) {
          requestAnimationFrame(scroll);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(scroll);
    });
  }
  
  /**
   * Simulate focus on random elements
   */
  async simulateFocus() {
    const focusableElements = document.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    // Focus on 1-3 random elements
    const focusCount = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < focusCount; i++) {
      const randomElement = focusableElements[Math.floor(Math.random() * focusableElements.length)];
      
      // Focus
      randomElement.focus();
      await this.wait(300 + Math.random() * 700);
      
      // Blur
      randomElement.blur();
      await this.wait(100);
    }
  }
  
  /**
   * Random pause (human reading/thinking time)
   */
  async randomPause() {
    const pauseDuration = 1000 + Math.random() * 3000; // 1-4 seconds
    console.log(`⏸️ Pausing for ${Math.round(pauseDuration)}ms (simulating reading/thinking)`);
    await this.wait(pauseDuration);
  }
  
  /**
   * Simulate realistic typing into an input field
   * @param {HTMLInputElement} input - Input element
   * @param {string} text - Text to type
   */
  async simulateTyping(input, text) {
    input.focus();
    await this.wait(100 + Math.random() * 200); // Initial pause
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simulate keydown
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        bubbles: true,
        cancelable: true
      }));
      
      // Add character
      input.value += char;
      
      // Simulate input event (important for React/Vue)
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Simulate keyup
      input.dispatchEvent(new KeyboardEvent('keyup', {
        key: char,
        bubbles: true,
        cancelable: true
      }));
      
      // Variable typing speed (humans don't type at constant speed)
      const baseDelay = 80; // Base typing speed
      const variation = Math.random() * 120; // Add randomness
      
      // Occasional longer pauses (thinking/correcting)
      const longPause = Math.random() < 0.1 ? 300 + Math.random() * 500 : 0;
      
      await this.wait(baseDelay + variation + longPause);
    }
    
    // Final pause after typing
    await this.wait(200 + Math.random() * 300);
  }
  
  /**
   * Simulate clicking with natural pre-click behavior
   * @param {HTMLElement} element - Element to click
   */
  async simulateClick(element) {
    // Move mouse over element first
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.3;
    const targetY = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.3;
    
    // Move mouse to element
    this.mouseX = targetX;
    this.mouseY = targetY;
    
    element.dispatchEvent(new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY
    }));
    
    await this.wait(100 + Math.random() * 200); // Hover delay
    
    // Mousedown
    element.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY
    }));
    
    await this.wait(50 + Math.random() * 100); // Click duration
    
    // Mouseup
    element.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY
    }));
    
    // Click
    element.click();
    
    await this.wait(50);
  }
  
  /**
   * Add random delays between actions
   */
  async addRandomDelay() {
    const delays = [500, 1000, 1500, 2000, 2500, 3000];
    const randomDelay = delays[Math.floor(Math.random() * delays.length)];
    console.log(`⏳ Adding random delay: ${randomDelay}ms`);
    await this.wait(randomDelay);
  }
  
  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Make available globally
window.HumanBehaviorSimulator = HumanBehaviorSimulator;

console.log('🤖→👤 Human Behavior Simulator loaded');
