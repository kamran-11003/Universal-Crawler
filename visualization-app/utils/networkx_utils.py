import networkx as nx
from typing import Dict, List, Tuple
import plotly.graph_objects as go

class NetworkXGraphBuilder:
    def __init__(self, nodes: List[Dict], edges: List[Dict]):
        self.nodes = nodes
        self.edges = edges
        self.G = nx.DiGraph()
        
    def build_graph(self):
        # Add nodes with attributes
        for node in self.nodes:
            self.G.add_node(
                node['id'],
                **{k: v for k, v in node.items() if k != 'id'}
            )
        
        # Add edges
        for edge in self.edges:
            # Handle both 'from' field and missing 'from' field (infer from node relationships)
            edge_from = edge.get('from', None)
            edge_to = edge.get('to', None)
            
            if not edge_from:
                # Skip edges without source - they're malformed
                continue
                
            if not edge_to:
                continue
            
            self.G.add_edge(
                edge_from,
                edge_to,
                action=edge.get('action', ''),
                role=edge.get('role', 'guest')
            )
        
        return self.G
    
    def get_layout_positions(self, layout_type: str) -> Dict:
        if layout_type == "spring":
            return nx.spring_layout(self.G, k=0.5, iterations=50)
        elif layout_type == "hierarchical":
            try:
                return nx.nx_agraph.graphviz_layout(self.G, prog='dot')
            except ImportError:
                # Fallback to spring if pygraphviz is not available
                return nx.spring_layout(self.G, k=0.5, iterations=50)
        elif layout_type == "circular":
            return nx.circular_layout(self.G)
        elif layout_type == "kamada_kawai":
            return nx.kamada_kawai_layout(self.G)
        elif layout_type == "shell":
            return nx.shell_layout(self.G)
        else:
            return nx.spring_layout(self.G, k=0.5, iterations=50)