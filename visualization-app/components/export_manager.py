import networkx as nx
import pandas as pd
from typing import Dict, List
import json

class ExportManager:
    def __init__(self, graph: nx.Graph, nodes: List[Dict], edges: List[Dict]):
        self.G = graph
        self.nodes = nodes
        self.edges = edges
    
    def export_to_graphml(self) -> str:
        try:
            return '\n'.join(nx.generate_graphml(self.G))
        except Exception as e:
            return f"Error generating GraphML: {str(e)}"
    
    def export_to_csv_nodes(self) -> pd.DataFrame:
        df_data = []
        for node in self.nodes:
            df_data.append({
                'ID': node.get('id', ''),
                'URL': node.get('url', ''),
                'Title': node.get('title', ''),
                'Role': node.get('role', ''),
                'Depth': node.get('depth', 0),
                'Simulated': node.get('simulated', False),
                'Forms': len(node.get('forms', [])),
                'Links': len(node.get('links', []))
            })
        return pd.DataFrame(df_data)
    
    def export_to_csv_edges(self) -> pd.DataFrame:
        df_data = []
        for edge in self.edges:
            df_data.append({
                'From': edge.get('from', ''),
                'To': edge.get('to', ''),
                'Action': edge.get('action', ''),
                'Role': edge.get('role', '')
            })
        return pd.DataFrame(df_data)
    
    def export_to_dot(self) -> str:
        try:
            return nx.nx_pydot.to_pydot(self.G).to_string()
        except Exception as e:
            return f"Error generating DOT: {str(e)}"