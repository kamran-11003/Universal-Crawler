from typing import Dict, List
from utils.component_classifier import ComponentClassifier

class TestableComponentAnalyzer:
    def __init__(self, node_data: Dict):
        self.node = node_data
        self.classifier = ComponentClassifier(node_data)
    
    def get_all_testable_components(self) -> Dict:
        return {
            'forms': self.analyze_forms(),
            'links': self.analyze_links(),
            'apis': self.analyze_apis(),
            'authentication': self.analyze_authentication(),
            'performance': self.analyze_performance(),
            'accessibility': self.analyze_accessibility(),
            'security': self.analyze_security()
        }
    
    def analyze_forms(self) -> Dict:
        classified_forms = self.classifier.classify_forms()
        
        testable_items = []
        for form_type, forms in classified_forms.items():
            for form in forms:
                testable_items.append({
                    'component_type': 'Form',
                    'form_type': form_type.replace('_forms', ''),
                    'action': form.get('action', ''),
                    'method': form.get('method', 'GET'),
                    'input_count': form.get('inputCount', 0),
                    'has_validation': form.get('validation', {}) != {},
                    'inputs': form.get('inputs', [])
                })
        
        return {
            'total_count': len(testable_items),
            'items': testable_items
        }
    
    def analyze_links(self) -> Dict:
        classified_links = self.classifier.classify_links()
        
        testable_items = []
        for link_type, links in classified_links.items():
            for link in links:
                testable_items.append({
                    'component_type': 'Link',
                    'link_type': link_type.replace('_links', ''),
                    'href': link.get('href', ''),
                    'text': link.get('text', ''),
                    'selector': link.get('selector', '')
                })
        
        return {
            'total_count': len(testable_items),
            'items': testable_items
        }
    
    def analyze_apis(self) -> Dict:
        classified_apis = self.classifier.classify_apis()
        
        testable_items = []
        for api_type, apis in classified_apis.items():
            for api in apis:
                testable_items.append({
                    'component_type': 'API',
                    'api_type': api_type,
                    'url': api.get('url', ''),
                    'method': api.get('method', 'GET'),
                    'status': api.get('status', 0),
                    'response_time': api.get('responseTime', 0)
                })
        
        return {
            'total_count': len(testable_items),
            'items': testable_items
        }
    
    def analyze_authentication(self) -> Dict:
        features = self.node.get('features', {})
        has_auth = features.get('hasAuth', False)
        
        return {
            'has_authentication': has_auth,
            'role': self.node.get('role', 'guest'),
            'requires_login': has_auth
        }
    
    def analyze_performance(self) -> Dict:
        perf = self.node.get('performance', {})
        web_vitals = perf.get('webVitals', {})
        
        return {
            'lcp': web_vitals.get('LCP', 0),
            'fid': web_vitals.get('FID', 0),
            'cls': web_vitals.get('CLS', 0),
            'fcp': web_vitals.get('FCP', 0),
            'ttfb': web_vitals.get('TTFB', 0),
            'has_issues': self._check_performance_issues(web_vitals)
        }
    
    def analyze_accessibility(self) -> Dict:
        a11y = self.node.get('accessibility', {})
        
        return {
            'wcag_level': a11y.get('wcagLevel', 'N/A'),
            'aria_failures': a11y.get('ariaFailures', 0),
            'color_contrast_failures': a11y.get('colorContrast', {}).get('failures', 0),
            'keyboard_navigation': a11y.get('keyboardNavigation', {}),
            'has_issues': a11y.get('ariaFailures', 0) > 0
        }
    
    def analyze_security(self) -> Dict:
        # Check for security-related data from modules
        return {
            'has_pii': False,  # Would be set by security modules
            'has_xss_risks': False,
            'uses_https': self.node.get('url', '').startswith('https://')
        }
    
    def _check_performance_issues(self, web_vitals: Dict) -> bool:
        lcp = web_vitals.get('LCP', 0)
        fid = web_vitals.get('FID', 0)
        cls = web_vitals.get('CLS', 0)
        
        return lcp > 2.5 or fid > 100 or cls > 0.1