import json
from typing import Dict, List, Any
import io

class CrawlerDataParser:
    def __init__(self, json_file):
        self.json_file = json_file
        self.data = None
        
    def load_data(self) -> Dict[str, Any]:
        # Handle both file paths and uploaded file objects
        if hasattr(self.json_file, 'read'):
            # Streamlit uploaded file object
            content = self.json_file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
            self.data = json.loads(content)
        else:
            # File path
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
        return self.data
    
    def get_nodes(self) -> List[Dict]:
        if not self.data:
            self.load_data()
        return self.data.get('nodes', [])
    
    def get_edges(self) -> List[Dict]:
        if not self.data:
            self.load_data()
        return self.data.get('edges', [])
    
    def get_metadata(self) -> Dict:
        if not self.data:
            self.load_data()
        return self.data.get('metadata', {})
    
    def get_statistics(self) -> Dict:
        if not self.data:
            self.load_data()
        # Handle both 'stats' and 'statistics' keys
        stats = self.data.get('stats', {})
        statistics = self.data.get('statistics', {})
        return {**stats, **statistics}  # Merge both