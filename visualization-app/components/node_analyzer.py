import streamlit as st
from typing import Dict
from components.testable_components import TestableComponentAnalyzer
from utils.ai_test_suggester import AITestSuggester

class NodeAnalyzer:
    def __init__(self, node_data: Dict):
        self.node = node_data
        self.component_analyzer = TestableComponentAnalyzer(node_data)
        self.ai_suggester = AITestSuggester()
    
    def display_node_details(self):
        st.markdown("---")
        st.header(f"📄 {self.node.get('title', 'Untitled Page')}")
        
        # Basic info
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Role", self.node.get('role', 'guest'))
        with col2:
            st.metric("Depth", self.node.get('depth', 0))
        with col3:
            st.metric("Simulated", "Yes" if self.node.get('simulated') else "No")
        with col4:
            timestamp = self.node.get('timestamp', 'N/A')
            # Handle both string and integer timestamps
            if isinstance(timestamp, (int, float)):
                timestamp = str(timestamp)
            st.metric("Timestamp", timestamp[:10] if len(str(timestamp)) > 10 else timestamp)
        
        st.write(f"**URL:** {self.node.get('url', 'N/A')}")
        
        # Get all testable components
        testable_components = self.component_analyzer.get_all_testable_components()
        
        # Display testable components sections
        self._display_summary_metrics(testable_components)
        self._display_interactive_elements_section()
        self._display_forms_section(testable_components['forms'])
        self._display_links_section(testable_components['links'])
        self._display_apis_section(testable_components['apis'])
        self._display_authentication_section(testable_components['authentication'])
        self._display_performance_section(testable_components['performance'])
        self._display_accessibility_section(testable_components['accessibility'])
        self._display_security_section(testable_components['security'])
        
        # AI-powered test suggestions
        self._display_ai_test_suggestions(testable_components)
    
    def _display_summary_metrics(self, components: Dict):
        st.subheader("🎯 Testable Components Summary")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Forms", components['forms']['total_count'])
        with col2:
            st.metric("Links", components['links']['total_count'])
        with col3:
            st.metric("APIs", components['apis']['total_count'])
        with col4:
            has_auth = "Yes" if components['authentication']['has_authentication'] else "No"
            st.metric("Authentication", has_auth)
    
    def _display_interactive_elements_section(self):
        """Display interactive elements found on the page"""
        interactive_elements = self.node.get('interactiveElements', {})
        
        if not interactive_elements:
            return
        
        # Count total interactive elements
        total_count = 0
        for element_type, element_data in interactive_elements.items():
            if isinstance(element_data, dict):
                total_count += element_data.get('total', 0)
            elif isinstance(element_data, list):
                total_count += len(element_data)
        
        with st.expander(f"🎮 Interactive Elements ({total_count})", expanded=total_count > 0):
            if total_count > 0:
                for element_type, element_data in interactive_elements.items():
                    if isinstance(element_data, dict):
                        element_count = element_data.get('total', 0)
                        elements = element_data.get('elements', [])
                    elif isinstance(element_data, list):
                        element_count = len(element_data)
                        elements = element_data
                    else:
                        continue
                    
                    if element_count > 0:
                        st.markdown(f"**{element_type.title()}** ({element_count})")
                        
                        # Show first 5 elements
                        for i, elem in enumerate(elements[:5], 1):
                            if isinstance(elem, dict):
                                elem_text = elem.get('text', elem.get('label', elem.get('id', 'Unknown')))
                                elem_selector = elem.get('selector', 'N/A')
                                st.write(f"  {i}. {elem_text} (`{elem_selector}`)")
                            elif isinstance(elem, str):
                                st.write(f"  {i}. {elem}")
                        
                        if element_count > 5:
                            st.write(f"  ... and {element_count - 5} more")
                        
                        st.markdown("---")
            else:
                st.info("No interactive elements detected on this page")
    
    def _display_forms_section(self, forms_data: Dict):
        with st.expander(f"📝 Forms ({forms_data['total_count']})", expanded=forms_data['total_count'] > 0):
            if forms_data['total_count'] > 0:
                for i, form in enumerate(forms_data['items'], 1):
                    st.markdown(f"**Form {i}: {form['form_type'].title()} Form**")
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.write(f"Action: `{form['action']}`")
                    with col2:
                        st.write(f"Method: `{form['method']}`")
                    with col3:
                        st.write(f"Inputs: {form['input_count']}")
                    
                    if form['inputs']:
                        st.write("**Input Fields:**")
                        for inp in form['inputs']:
                            input_type = inp.get('type', 'text')
                            input_name = inp.get('name', inp.get('id', 'unnamed'))
                            input_label = inp.get('label', '')
                            input_placeholder = inp.get('placeholder', '')
                            
                            # Build display string with all available info
                            display_parts = [f"{input_type}"]
                            if input_name and input_name != 'unnamed':
                                display_parts.append(f"name='{input_name}'")
                            if input_label:
                                display_parts.append(f"label='{input_label}'")
                            if input_placeholder:
                                display_parts.append(f"placeholder='{input_placeholder}'")
                            
                            st.write(f"  - {' | '.join(display_parts)}")
                    st.markdown("---")
            else:
                st.info("No forms detected on this page")
    
    def _display_links_section(self, links_data: Dict):
        with st.expander(f"🔗 Links ({links_data['total_count']})", expanded=False):
            if links_data['total_count'] > 0:
                link_types = {}
                for link in links_data['items']:
                    link_type = link['link_type']
                    if link_type not in link_types:
                        link_types[link_type] = []
                    link_types[link_type].append(link)
                
                for link_type, links in link_types.items():
                    st.markdown(f"**{link_type.title()}** ({len(links)})")
                    for link in links[:5]:  # Show first 5
                        st.write(f"  - {link['text']}: `{link['href']}`")
            else:
                st.info("No links detected on this page")
    
    def _display_apis_section(self, apis_data: Dict):
        with st.expander(f"🌐 API Calls ({apis_data['total_count']})", expanded=False):
            if apis_data['total_count'] > 0:
                for i, api in enumerate(apis_data['items'], 1):
                    st.markdown(f"**API Call {i}: {api['api_type']}**")
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.write(f"Method: `{api['method']}`")
                    with col2:
                        st.write(f"Status: {api['status']}")
                    with col3:
                        st.write(f"Response Time: {api['response_time']}ms")
                    st.write(f"URL: `{api['url']}`")
                    st.markdown("---")
            else:
                st.info("No API calls detected on this page")
    
    def _display_authentication_section(self, auth_data: Dict):
        with st.expander("🔐 Authentication", expanded=auth_data['has_authentication']):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Requires Login:** {'Yes' if auth_data['requires_login'] else 'No'}")
            with col2:
                st.write(f"**Current Role:** {auth_data['role']}")
    
    def _display_performance_section(self, perf_data: Dict):
        with st.expander("⚡ Performance Metrics", expanded=perf_data['has_issues']):
            if perf_data['lcp'] > 0:
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("LCP", f"{perf_data['lcp']:.2f}s", 
                             delta="Poor" if perf_data['lcp'] > 2.5 else "Good")
                with col2:
                    st.metric("FID", f"{perf_data['fid']:.0f}ms",
                             delta="Poor" if perf_data['fid'] > 100 else "Good")
                with col3:
                    st.metric("CLS", f"{perf_data['cls']:.3f}",
                             delta="Poor" if perf_data['cls'] > 0.1 else "Good")
            else:
                st.info("No performance metrics available")
    
    def _display_accessibility_section(self, a11y_data: Dict):
        with st.expander("♿ Accessibility", expanded=a11y_data['has_issues']):
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("WCAG Level", a11y_data['wcag_level'])
            with col2:
                st.metric("ARIA Failures", a11y_data['aria_failures'])
            with col3:
                st.metric("Contrast Issues", a11y_data['color_contrast_failures'])
    
    def _display_security_section(self, security_data: Dict):
        with st.expander("🔒 Security", expanded=False):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Uses HTTPS:** {'Yes' if security_data['uses_https'] else 'No'}")
            with col2:
                st.write(f"**PII Detected:** {'Yes' if security_data['has_pii'] else 'No'}")
    
    def _display_ai_test_suggestions(self, testable_components: Dict):
        st.subheader("🤖 AI-Powered Test Case Suggestions")
        
        with st.spinner("Generating test case suggestions with AI..."):
            test_cases = self.ai_suggester.suggest_test_cases(testable_components, self.node)
        
        if test_cases:
            for i, tc in enumerate(test_cases, 1):
                with st.expander(f"Test Case {i}: {tc.get('category', 'N/A')} - Priority: {tc.get('priority', 'N/A')}"):
                    st.write(f"**Test Case:** {tc.get('test_case', 'N/A')}")
                    st.write(f"**Type:** {tc.get('type', 'N/A')}")
                    st.write(f"**Priority:** {tc.get('priority', 'N/A')}")
        else:
            st.warning("No test case suggestions generated")