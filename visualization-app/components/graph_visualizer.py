import plotly.graph_objects as go
import networkx as nx
from config import NODE_COLORS

class InteractiveGraphVisualizer:
    def __init__(self, graph: nx.Graph, positions: dict, node_data: list):
        self.G = graph
        self.pos = positions
        self.node_data = {n['id']: n for n in node_data}
        
    def create_plotly_figure(self):
        edge_trace = self._create_edge_trace()
        node_trace = self._create_node_trace()
        
        fig = go.Figure(
            data=[edge_trace, node_trace],
            layout=go.Layout(
                showlegend=True,
                hovermode='closest',
                margin=dict(b=0, l=0, r=0, t=40),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                height=600,
                clickmode='event+select'
            )
        )
        
        return fig
    
    def _create_edge_trace(self):
        edge_x, edge_y = [], []
        
        for edge in self.G.edges():
            x0, y0 = self.pos[edge[0]]
            x1, y1 = self.pos[edge[1]]
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])
        
        return go.Scatter(
            x=edge_x, y=edge_y,
            line=dict(width=0.5, color='#888'),
            hoverinfo='none',
            mode='lines',
            name='Edges'
        )
    
    def _create_node_trace(self):
        node_x, node_y, node_text, node_color = [], [], [], []
        
        for node in self.G.nodes():
            x, y = self.pos[node]
            node_x.append(x)
            node_y.append(y)
            
            node_info = self.node_data.get(node, {})
            title = node_info.get('title', 'Unknown')
            role = node_info.get('role', 'guest')
            url = node_info.get('url', '')
            
            node_text.append(f"{node}<br>{title}<br>{url}")
            node_color.append(NODE_COLORS.get(role, '#D3D3D3'))
        
        return go.Scatter(
            x=node_x, y=node_y,
            mode='markers',
            hoverinfo='text',
            text=node_text,
            marker=dict(
                size=15,
                color=node_color,
                line=dict(width=2, color='white')
            ),
            name='Pages'
        )