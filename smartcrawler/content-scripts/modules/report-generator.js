console.log('=== REPORT GENERATOR SCRIPT LOADING ===');

if (typeof window.ReportGenerator === 'undefined') {
class ReportGenerator {
  constructor(config = {}) {
    this.enabled = false;
    this.config = {
      includeCharts: true,
      includeScreenshots: false,
      exportFormats: ['html', 'pdf'],
      chartLibrary: 'chartjs', // or 'd3'
      theme: 'light', // or 'dark'
      ...config
    };
    
    this.reportData = null;
    this.charts = {};
    
    console.log('Report Generator initialized');
  }

  /**
   * Generate comprehensive HTML report
   */
  generateReport(crawlData) {
    if (!this.enabled) return null;
    
    this.reportData = crawlData;
    
    const reportHtml = this.createReportHTML();
    const reportBlob = new Blob([reportHtml], { type: 'text/html' });
    const reportUrl = URL.createObjectURL(reportBlob);
    
    console.log('Report generated:', reportUrl);
    
    return {
      generated: true,
      timestamp: Date.now(),
      downloadUrl: reportUrl,
      size: reportBlob.size,
      format: 'html'
    };
  }

  /**
   * Create the main HTML report structure
   */
  createReportHTML() {
    const reportSections = [
      this.generateExecutiveSummary(),
      this.generateCrawlOverview(),
      this.generatePerformanceSection(),
      this.generateAccessibilitySection(),
      this.generateSecuritySection(),
      this.generateUserJourneySection(),
      this.generateHeatmapSection(),
      this.generateFunnelSection(),
      this.generateNetworkSection(),
      this.generateRecommendations()
    ].filter(section => section !== null);
    
    return this.getReportTemplate(reportSections);
  }

  /**
   * Generate executive summary section
   */
  generateExecutiveSummary() {
    if (!this.reportData) return null;
    
    const stats = this.reportData.statistics || {};
    const nodes = this.reportData.nodes || [];
    const edges = this.reportData.edges || [];
    
    const keyMetrics = {
      totalPages: nodes.length,
      totalTransitions: edges.length,
      crawlDuration: this.reportData.metadata?.crawlDuration || 0,
      coverage: this.calculateCoverage(),
      issues: this.countIssues()
    };
    
    return {
      id: 'executive-summary',
      title: 'Executive Summary',
      content: `
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>${keyMetrics.totalPages}</h3>
            <p>Pages Crawled</p>
          </div>
          <div class="metric-card">
            <h3>${keyMetrics.totalTransitions}</h3>
            <p>User Transitions</p>
          </div>
          <div class="metric-card">
            <h3>${Math.round(keyMetrics.crawlDuration / 1000)}s</h3>
            <p>Crawl Duration</p>
          </div>
          <div class="metric-card">
            <h3>${keyMetrics.coverage}%</h3>
            <p>Coverage</p>
          </div>
        </div>
        <div class="summary-text">
          <p>This crawl discovered <strong>${keyMetrics.totalPages} unique pages</strong> with 
          <strong>${keyMetrics.totalTransitions} user transitions</strong>. The analysis identified 
          <strong>${keyMetrics.issues.total} total issues</strong> across accessibility, 
          performance, and security categories.</p>
        </div>
      `
    };
  }

  /**
   * Generate crawl overview section
   */
  generateCrawlOverview() {
    if (!this.reportData) return null;
    
    const nodes = this.reportData.nodes || [];
    const edges = this.reportData.edges || [];
    
    // Group nodes by features
    const featureStats = nodes.reduce((stats, node) => {
      const features = node.features || {};
      Object.entries(features).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value;
      });
      return stats;
    }, {});
    
    return {
      id: 'crawl-overview',
      title: 'Crawl Overview',
      content: `
        <div class="overview-stats">
          <h3>Page Statistics</h3>
          <ul>
            <li><strong>Total Pages:</strong> ${nodes.length}</li>
            <li><strong>Total Links:</strong> ${featureStats.linkCount || 0}</li>
            <li><strong>Total Forms:</strong> ${featureStats.formCount || 0}</li>
            <li><strong>Total API Calls:</strong> ${featureStats.apiCount || 0}</li>
            <li><strong>Pages with Authentication:</strong> ${featureStats.hasAuth || 0}</li>
          </ul>
        </div>
        <div class="transition-stats">
          <h3>User Transitions</h3>
          <ul>
            <li><strong>Total Transitions:</strong> ${edges.length}</li>
            <li><strong>Click Actions:</strong> ${edges.filter(e => e.action?.includes('click')).length}</li>
            <li><strong>Form Submissions:</strong> ${edges.filter(e => e.action?.includes('submit')).length}</li>
            <li><strong>Navigation Actions:</strong> ${edges.filter(e => e.action?.includes('navigate')).length}</li>
          </ul>
        </div>
      `
    };
  }

  /**
   * Generate performance metrics section
   */
  generatePerformanceSection() {
    if (!this.reportData?.modules?.performance) return null;
    
    const perf = this.reportData.modules.performance;
    const webVitals = perf.webVitals || {};
    
    return {
      id: 'performance',
      title: 'Performance Analysis',
      content: `
        <div class="performance-metrics">
          <h3>Web Vitals</h3>
          <div class="vitals-grid">
            <div class="vital-card ${this.getVitalClass(webVitals.lcp)}">
              <h4>LCP</h4>
              <p>${webVitals.lcp || 'N/A'}ms</p>
              <small>Largest Contentful Paint</small>
            </div>
            <div class="vital-card ${this.getVitalClass(webVitals.fid)}">
              <h4>FID</h4>
              <p>${webVitals.fid || 'N/A'}ms</p>
              <small>First Input Delay</small>
            </div>
            <div class="vital-card ${this.getVitalClass(webVitals.cls)}">
              <h4>CLS</h4>
              <p>${webVitals.cls || 'N/A'}</p>
              <small>Cumulative Layout Shift</small>
            </div>
            <div class="vital-card ${this.getVitalClass(webVitals.fcp)}">
              <h4>FCP</h4>
              <p>${webVitals.fcp || 'N/A'}ms</p>
              <small>First Contentful Paint</small>
            </div>
          </div>
        </div>
        <div class="performance-details">
          <h3>Additional Metrics</h3>
          <ul>
            <li><strong>TTFB:</strong> ${webVitals.ttfb || 'N/A'}ms</li>
            <li><strong>Memory Usage:</strong> ${perf.memoryUsage || 'N/A'}MB</li>
            <li><strong>Load Time:</strong> ${perf.loadTime || 'N/A'}ms</li>
          </ul>
        </div>
      `
    };
  }

  /**
   * Generate accessibility analysis section
   */
  generateAccessibilitySection() {
    if (!this.reportData?.modules?.accessibility) return null;
    
    const a11y = this.reportData.modules.accessibility;
    const violations = a11y.violations || [];
    const summary = a11y.summary || {};
    
    return {
      id: 'accessibility',
      title: 'Accessibility Analysis',
      content: `
        <div class="accessibility-summary">
          <h3>WCAG Compliance</h3>
          <div class="compliance-stats">
            <div class="stat-card ${violations.length === 0 ? 'good' : 'warning'}">
              <h4>${violations.length}</h4>
              <p>Violations Found</p>
            </div>
            <div class="stat-card">
              <h4>${summary.totalElements || 0}</h4>
              <p>Elements Analyzed</p>
            </div>
            <div class="stat-card">
              <h4>${summary.ariaElements || 0}</h4>
              <p>ARIA Elements</p>
            </div>
          </div>
        </div>
        <div class="violations-list">
          <h3>Accessibility Violations</h3>
          ${violations.length > 0 ? this.formatViolations(violations) : '<p>No accessibility violations found!</p>'}
        </div>
      `
    };
  }

  /**
   * Generate security findings section
   */
  generateSecuritySection() {
    if (!this.reportData?.modules?.security) return null;
    
    const security = this.reportData.modules.security;
    const issues = security.issues || [];
    
    return {
      id: 'security',
      title: 'Security Analysis',
      content: `
        <div class="security-summary">
          <h3>Security Findings</h3>
          <div class="security-stats">
            <div class="stat-card ${issues.length === 0 ? 'good' : 'warning'}">
              <h4>${issues.length}</h4>
              <p>Issues Found</p>
            </div>
            <div class="stat-card">
              <h4>${security.piiMasked || 0}</h4>
              <p>PII Items Masked</p>
            </div>
            <div class="stat-card">
              <h4>${security.xssDetected || 0}</h4>
              <p>XSS Attempts Blocked</p>
            </div>
          </div>
        </div>
        <div class="security-details">
          <h3>Security Details</h3>
          ${issues.length > 0 ? this.formatSecurityIssues(issues) : '<p>No security issues detected!</p>'}
        </div>
      `
    };
  }

  /**
   * Generate user journey visualization section
   */
  generateUserJourneySection() {
    if (!this.reportData?.analytics?.journeys) return null;
    
    const journeys = this.reportData.analytics.journeys;
    
    return {
      id: 'user-journeys',
      title: 'User Journey Analysis',
      content: `
        <div class="journey-summary">
          <h3>Journey Statistics</h3>
          <div class="journey-stats">
            <div class="stat-card">
              <h4>${journeys.total || 0}</h4>
              <p>Total Journeys</p>
            </div>
            <div class="stat-card">
              <h4>${journeys.summary?.avgDuration || 0}ms</h4>
              <p>Avg Duration</p>
            </div>
            <div class="stat-card">
              <h4>${journeys.summary?.avgSteps || 0}</h4>
              <p>Avg Steps</p>
            </div>
            <div class="stat-card">
              <h4>${journeys.summary?.completionRate || 0}%</h4>
              <p>Completion Rate</p>
            </div>
          </div>
        </div>
        <div class="journey-details">
          <h3>Most Common Actions</h3>
          <ul>
            ${(journeys.summary?.mostCommonActions || []).map(action => 
              `<li><strong>${action.action}:</strong> ${action.count} times</li>`
            ).join('')}
          </ul>
        </div>
      `
    };
  }

  /**
   * Generate heatmap visualization section
   */
  generateHeatmapSection() {
    if (!this.reportData?.analytics?.heatmap) return null;
    
    const heatmap = this.reportData.analytics.heatmap;
    const summary = heatmap.summary || {};
    
    return {
      id: 'heatmap',
      title: 'Interaction Heatmap',
      content: `
        <div class="heatmap-summary">
          <h3>Interaction Statistics</h3>
          <div class="heatmap-stats">
            <div class="stat-card">
              <h4>${summary.totalClicks || 0}</h4>
              <p>Total Clicks</p>
            </div>
            <div class="stat-card">
              <h4>${summary.totalHovers || 0}</h4>
              <p>Total Hovers</p>
            </div>
            <div class="stat-card">
              <h4>${summary.maxScrollDepth || 0}%</h4>
              <p>Max Scroll Depth</p>
            </div>
            <div class="stat-card">
              <h4>${summary.avgScrollDepth || 0}%</h4>
              <p>Avg Scroll Depth</p>
            </div>
          </div>
        </div>
        <div class="heatmap-details">
          <h3>Most Clicked Elements</h3>
          <ul>
            ${(summary.mostClicked || []).map(item => 
              `<li><strong>${item.element}:</strong> ${item.count} clicks</li>`
            ).join('')}
          </ul>
        </div>
      `
    };
  }

  /**
   * Generate funnel analysis section
   */
  generateFunnelSection() {
    if (!this.reportData?.analytics?.funnel) return null;
    
    const funnel = this.reportData.analytics.funnel;
    
    return {
      id: 'funnel',
      title: 'Conversion Funnel Analysis',
      content: `
        <div class="funnel-summary">
          <h3>Funnel Overview</h3>
          ${Object.entries(funnel).map(([funnelId, funnelData]) => `
            <div class="funnel-card">
              <h4>${funnelData.name}</h4>
              <div class="funnel-stats">
                <div class="stat-item">
                  <strong>Overall Conversion:</strong> ${funnelData.overallConversion}%
                </div>
                <div class="stat-item">
                  <strong>Total Sessions:</strong> ${funnelData.totalSessions}
                </div>
                <div class="stat-item">
                  <strong>Completed Sessions:</strong> ${funnelData.completedSessions}
                </div>
              </div>
              <div class="funnel-steps">
                <h5>Step-by-Step Analysis</h5>
                ${funnelData.steps.map(step => `
                  <div class="funnel-step">
                    <div class="step-name">${step.name}</div>
                    <div class="step-stats">
                      <span>Entered: ${step.entered}</span>
                      <span>Completed: ${step.completed}</span>
                      <span>Conversion: ${step.conversionRate}%</span>
                      <span>Avg Time: ${step.avgTimeSpent}ms</span>
                    </div>
                    ${step.dropOffReasons.length > 0 ? `
                      <div class="dropoff-reasons">
                        <strong>Drop-off Reasons:</strong> ${step.dropOffReasons.join(', ')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `
    };
  }

  /**
   * Generate network activity section
   */
  generateNetworkSection() {
    if (!this.reportData?.modules?.network) return null;
    
    const network = this.reportData.modules.network;
    const requests = network.requests || [];
    
    return {
      id: 'network',
      title: 'Network Activity',
      content: `
        <div class="network-summary">
          <h3>Network Statistics</h3>
          <div class="network-stats">
            <div class="stat-card">
              <h4>${requests.length}</h4>
              <p>Total Requests</p>
            </div>
            <div class="stat-card">
              <h4>${network.totalSize || 0}KB</h4>
              <p>Total Size</p>
            </div>
            <div class="stat-card">
              <h4>${network.avgResponseTime || 0}ms</h4>
              <p>Avg Response Time</p>
            </div>
            <div class="stat-card">
              <h4>${network.errorCount || 0}</h4>
              <p>Errors</p>
            </div>
          </div>
        </div>
        <div class="request-types">
          <h3>Request Types</h3>
          <ul>
            <li><strong>API Calls:</strong> ${requests.filter(r => r.type === 'api').length}</li>
            <li><strong>Static Resources:</strong> ${requests.filter(r => r.type === 'static').length}</li>
            <li><strong>Third-party:</strong> ${requests.filter(r => r.type === 'third-party').length}</li>
          </ul>
        </div>
      `
    };
  }

  /**
   * Generate recommendations section
   */
  generateRecommendations() {
    const recommendations = this.generateRecommendationsList();
    
    return {
      id: 'recommendations',
      title: 'Recommendations',
      content: `
        <div class="recommendations-list">
          <h3>Priority Actions</h3>
          <div class="recommendation-items">
            ${recommendations.map((rec, index) => `
              <div class="recommendation-item ${rec.priority}">
                <div class="rec-number">${index + 1}</div>
                <div class="rec-content">
                  <h4>${rec.title}</h4>
                  <p>${rec.description}</p>
                  <div class="rec-impact">Impact: ${rec.impact}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    };
  }

  /**
   * Generate list of recommendations based on crawl data
   */
  generateRecommendationsList() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.reportData?.modules?.performance?.webVitals) {
      const vitals = this.reportData.modules.performance.webVitals;
      if (vitals.lcp > 2500) {
        recommendations.push({
          title: 'Optimize Largest Contentful Paint',
          description: 'LCP is above recommended 2.5s threshold. Consider optimizing images and reducing render-blocking resources.',
          priority: 'high',
          impact: 'High - Improves user experience and SEO ranking'
        });
      }
      if (vitals.fid > 100) {
        recommendations.push({
          title: 'Reduce First Input Delay',
          description: 'FID is above recommended 100ms threshold. Minimize JavaScript execution time.',
          priority: 'high',
          impact: 'High - Improves interactivity and user engagement'
        });
      }
    }
    
    // Accessibility recommendations
    if (this.reportData?.modules?.accessibility?.violations?.length > 0) {
      recommendations.push({
        title: 'Fix Accessibility Violations',
        description: `${this.reportData.modules.accessibility.violations.length} WCAG violations found. Address color contrast, keyboard navigation, and ARIA labels.`,
        priority: 'medium',
        impact: 'High - Ensures compliance and improves usability'
      });
    }
    
    // Security recommendations
    if (this.reportData?.modules?.security?.issues?.length > 0) {
      recommendations.push({
        title: 'Address Security Issues',
        description: `${this.reportData.modules.security.issues.length} security issues detected. Review and fix XSS vulnerabilities and input validation.`,
        priority: 'high',
        impact: 'Critical - Protects user data and prevents attacks'
      });
    }
    
    // Funnel recommendations
    if (this.reportData?.analytics?.funnel) {
      const funnels = Object.values(this.reportData.analytics.funnel);
      funnels.forEach(funnel => {
        if (funnel.overallConversion < 50) {
          recommendations.push({
            title: `Improve ${funnel.name} Conversion`,
            description: `Overall conversion rate is ${funnel.overallConversion}%. Analyze drop-off points and optimize user experience.`,
            priority: 'medium',
            impact: 'High - Increases business conversion and revenue'
          });
        }
      });
    }
    
    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Get the complete HTML template
   */
  getReportTemplate(sections) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Crawler Report - ${new Date().toLocaleDateString()}</title>
    <style>
        ${this.getReportCSS()}
    </style>
    ${this.config.includeCharts ? this.getChartJS() : ''}
</head>
<body>
    <header class="report-header">
        <h1>Smart Crawler Analysis Report</h1>
        <div class="report-meta">
            <span>Generated: ${new Date().toLocaleString()}</span>
            <span>Crawler Version: Week 8 Advanced Analytics</span>
        </div>
    </header>
    
    <nav class="report-nav">
        <ul>
            ${sections.map(section => `<li><a href="#${section.id}">${section.title}</a></li>`).join('')}
        </ul>
    </nav>
    
    <main class="report-content">
        ${sections.map(section => `
            <section id="${section.id}" class="report-section">
                <h2>${section.title}</h2>
                ${section.content}
            </section>
        `).join('')}
    </main>
    
    <footer class="report-footer">
        <p>Report generated by AutoTestAI Smart Crawler - Advanced Analytics Module</p>
    </footer>
    
    ${this.config.includeCharts ? this.getChartScripts() : ''}
</body>
</html>
    `;
  }

  /**
   * Get CSS styles for the report
   */
  getReportCSS() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .report-header { background: #2c3e50; color: white; padding: 2rem; text-align: center; }
        .report-header h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        .report-meta { opacity: 0.8; }
        .report-nav { background: #34495e; padding: 1rem; }
        .report-nav ul { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; }
        .report-nav li { margin: 0 1rem; }
        .report-nav a { color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; }
        .report-nav a:hover { background: #2c3e50; }
        .report-content { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .report-section { margin-bottom: 3rem; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; }
        .report-section h2 { color: #2c3e50; margin-bottom: 1.5rem; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
        .metrics-grid, .vitals-grid, .compliance-stats, .security-stats, .journey-stats, .heatmap-stats, .network-stats { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; 
        }
        .metric-card, .vital-card, .stat-card { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; text-align: center; border-left: 4px solid #3498db; }
        .vital-card.good { border-left-color: #27ae60; }
        .vital-card.warning { border-left-color: #f39c12; }
        .vital-card.bad { border-left-color: #e74c3c; }
        .metric-card h3, .vital-card h4, .stat-card h4 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
        .metric-card p, .vital-card small, .stat-card p { color: #7f8c8d; }
        .summary-text { background: #ecf0f1; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
        .violations-list, .security-details { margin: 1rem 0; }
        .violation-item, .security-issue { background: #fff5f5; border: 1px solid #fed7d7; padding: 1rem; margin: 0.5rem 0; border-radius: 4px; }
        .recommendation-item { display: flex; margin: 1rem 0; padding: 1rem; border-radius: 8px; }
        .recommendation-item.high { background: #fee; border-left: 4px solid #e74c3c; }
        .recommendation-item.medium { background: #fff8e1; border-left: 4px solid #f39c12; }
        .recommendation-item.low { background: #f0fff4; border-left: 4px solid #27ae60; }
        .rec-number { background: #3498db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; font-weight: bold; }
        .rec-content h4 { margin-bottom: 0.5rem; }
        .rec-impact { font-style: italic; color: #7f8c8d; margin-top: 0.5rem; }
        .funnel-card { background: #f8f9fa; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; }
        .funnel-step { background: white; padding: 1rem; margin: 0.5rem 0; border-radius: 4px; border-left: 4px solid #3498db; }
        .step-stats { display: flex; gap: 1rem; margin: 0.5rem 0; }
        .step-stats span { background: #ecf0f1; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem; }
        .dropoff-reasons { background: #fff5f5; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; }
        .report-footer { background: #2c3e50; color: white; text-align: center; padding: 1rem; margin-top: 2rem; }
        @media print { .report-nav { display: none; } .report-section { break-inside: avoid; } }
    `;
  }

  /**
   * Get Chart.js library
   */
  getChartJS() {
    return '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
  }

  /**
   * Get chart initialization scripts
   */
  getChartScripts() {
    return `
        <script>
            // Initialize charts if Chart.js is available
            if (typeof Chart !== 'undefined') {
                // Add chart initialization code here
                console.log('Charts initialized');
            }
        </script>
    `;
  }

  /**
   * Helper methods for formatting
   */
  getVitalClass(value) {
    if (!value) return '';
    if (value <= 100) return 'good';
    if (value <= 300) return 'warning';
    return 'bad';
  }

  formatViolations(violations) {
    return violations.map(violation => `
      <div class="violation-item">
        <h4>${violation.rule}</h4>
        <p>${violation.description}</p>
        <small>Element: ${violation.element}</small>
      </div>
    `).join('');
  }

  formatSecurityIssues(issues) {
    return issues.map(issue => `
      <div class="security-issue">
        <h4>${issue.type}</h4>
        <p>${issue.description}</p>
        <small>Severity: ${issue.severity}</small>
      </div>
    `).join('');
  }

  calculateCoverage() {
    // Simple coverage calculation based on nodes and potential nodes
    const nodes = this.reportData?.nodes || [];
    return Math.min(100, Math.round((nodes.length / 10) * 100));
  }

  countIssues() {
    const issues = {
      accessibility: this.reportData?.modules?.accessibility?.violations?.length || 0,
      security: this.reportData?.modules?.security?.issues?.length || 0,
      performance: this.reportData?.modules?.performance?.issues?.length || 0,
      total: 0
    };
    issues.total = issues.accessibility + issues.security + issues.performance;
    return issues;
  }

  /**
   * Export report to PDF (placeholder)
   */
  async exportToPDF() {
    // This would integrate with jsPDF or similar library
    console.log('PDF export not yet implemented');
    return null;
  }

  /**
   * Enable the report generator
   */
  enable() {
    this.enabled = true;
    console.log('Report Generator enabled');
  }

  /**
   * Disable the report generator
   */
  disable() {
    this.enabled = false;
    console.log('Report Generator disabled');
  }
}

// Make available globally
window.ReportGenerator = ReportGenerator;
}

console.log('=== REPORT GENERATOR SCRIPT LOADED ===');
