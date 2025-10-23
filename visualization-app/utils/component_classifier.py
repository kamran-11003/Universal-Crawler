from typing import Dict, List

class ComponentClassifier:
    def __init__(self, node_data: Dict):
        self.node = node_data
    
    def classify_forms(self) -> Dict:
        forms = self.node.get('forms', [])
        
        classified = {
            'login_forms': [],
            'registration_forms': [],
            'contact_forms': [],
            'search_forms': [],
            'order_forms': [],
            'payment_forms': [],
            'other_forms': []
        }
        
        for form in forms:
            form_type = form.get('formType', 'other')
            key = f"{form_type}_forms"
            if key in classified:
                classified[key].append(form)
            else:
                classified['other_forms'].append(form)
        
        return classified
    
    def classify_links(self) -> Dict:
        links = self.node.get('links', [])
        
        return {
            'navigation_links': [l for l in links if self._is_navigation(l)],
            'action_buttons': [l for l in links if self._is_action_button(l)],
            'external_links': [l for l in links if self._is_external(l)],
            'download_links': [l for l in links if self._is_download(l)]
        }
    
    def classify_apis(self) -> Dict:
        network = self.node.get('network', {})
        requests = network.get('requests', [])
        
        return {
            'rest_apis': [r for r in requests if self._is_rest_api(r)],
            'graphql_apis': [r for r in requests if self._is_graphql(r)],
            'websockets': network.get('websockets', []),
            'static_resources': [r for r in requests if self._is_static_resource(r)]
        }
    
    def _is_navigation(self, link: Dict) -> bool:
        return link.get('href', '').startswith('/')
    
    def _is_action_button(self, link: Dict) -> bool:
        text = link.get('text', '').lower()
        return any(word in text for word in ['submit', 'login', 'signup', 'buy', 'add'])
    
    def _is_external(self, link: Dict) -> bool:
        href = link.get('href', '')
        return href.startswith('http') and not href.startswith(self.node.get('url', ''))
    
    def _is_download(self, link: Dict) -> bool:
        href = link.get('href', '')
        return any(ext in href for ext in ['.pdf', '.zip', '.csv', '.xlsx', '.doc'])
    
    def _is_rest_api(self, request: Dict) -> bool:
        url = request.get('url', '')
        return '/api/' in url or url.endswith('.json')
    
    def _is_graphql(self, request: Dict) -> bool:
        return '/graphql' in request.get('url', '')
    
    def _is_static_resource(self, request: Dict) -> bool:
        url = request.get('url', '')
        return any(ext in url for ext in ['.css', '.js', '.png', '.jpg', '.svg', '.woff'])