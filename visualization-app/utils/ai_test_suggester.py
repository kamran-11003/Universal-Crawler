import google.generativeai as genai
from typing import Dict, List
from config import GEMINI_API_KEY

class AITestSuggester:
    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def suggest_test_cases(self, testable_components: Dict, node_data: Dict) -> List[Dict]:
        prompt = self._build_prompt(testable_components, node_data)
        
        try:
            response = self.model.generate_content(prompt)
            test_cases = self._parse_response(response.text)
            return test_cases
        except Exception as e:
            return [{
                'category': 'Error',
                'test_case': f'Failed to generate AI suggestions: {str(e)}',
                'priority': 'N/A',
                'type': 'Error'
            }]
    
    def _build_prompt(self, components: Dict, node_data: Dict) -> str:
        url = node_data.get('url', 'Unknown')
        title = node_data.get('title', 'Unknown')
        
        prompt = f"""You are a QA test case generator. Analyze the following testable components found on a web page and suggest specific black-box test cases.

Page URL: {url}
Page Title: {title}

Testable Components Found:
- Forms: {components['forms']['total_count']}
- Links: {components['links']['total_count']}
- APIs: {components['apis']['total_count']}
- Authentication: {components['authentication']['has_authentication']}
- Performance Issues: {components['performance']['has_issues']}
- Accessibility Issues: {components['accessibility']['has_issues']}

Detailed Component Information:
{self._format_components(components)}

Generate 5-10 specific, actionable black-box test cases for this page. For each test case, provide:
1. Test Case Category (Functional/Security/Performance/Accessibility)
2. Test Case Description
3. Priority (High/Medium/Low)
4. Test Type (Smoke/Sanity/Integration/Regression/UAT)

Format your response as a numbered list with clear sections."""
        
        return prompt
    
    def _format_components(self, components: Dict) -> str:
        formatted = []
        
        if components['forms']['total_count'] > 0:
            formatted.append("Forms:")
            for item in components['forms']['items'][:3]:  # Limit to first 3
                formatted.append(f"  - {item['form_type']} form with {item['input_count']} inputs")
        
        if components['links']['total_count'] > 0:
            formatted.append("\nLinks:")
            for item in components['links']['items'][:3]:
                formatted.append(f"  - {item['link_type']}: {item['text']}")
        
        if components['apis']['total_count'] > 0:
            formatted.append("\nAPIs:")
            for item in components['apis']['items'][:3]:
                formatted.append(f"  - {item['method']} {item['url']}")
        
        return '\n'.join(formatted)
    
    def _parse_response(self, response_text: str) -> List[Dict]:
        test_cases = []
        lines = response_text.strip().split('\n')
        
        current_test = {}
        for line in lines:
            line = line.strip()
            
            if line and line[0].isdigit() and '.' in line:
                if current_test:
                    test_cases.append(current_test)
                current_test = {'test_case': line}
            elif 'Category:' in line or 'category:' in line.lower():
                current_test['category'] = line.split(':', 1)[1].strip()
            elif 'Priority:' in line or 'priority:' in line.lower():
                current_test['priority'] = line.split(':', 1)[1].strip()
            elif 'Type:' in line or 'type:' in line.lower():
                current_test['type'] = line.split(':', 1)[1].strip()
        
        if current_test:
            test_cases.append(current_test)
        
        return test_cases if test_cases else self._get_default_test_cases()
    
    def _get_default_test_cases(self) -> List[Dict]:
        return [
            {
                'category': 'Functional',
                'test_case': 'Verify all links navigate to correct pages',
                'priority': 'High',
                'type': 'Smoke'
            },
            {
                'category': 'Functional',
                'test_case': 'Validate form submission with valid inputs',
                'priority': 'High',
                'type': 'Functional'
            }
        ]