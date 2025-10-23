import streamlit as st
import json
import io
from utils.networkx_utils import NetworkXGraphBuilder
from components.graph_visualizer import InteractiveGraphVisualizer
from components.node_analyzer import NodeAnalyzer
from components.export_manager import ExportManager
from config import AVAILABLE_LAYOUTS, MAX_NODES_DISPLAY

st.set_page_config(
    page_title="AutoTestAI Graph Analyzer",
    page_icon="🕸️",
    layout="wide",
    initial_sidebar_state="expanded"
)

def safe_json_loader(uploaded_file):
    """Ultra-safe JSON loader that handles all edge cases"""
    try:
        uploaded_file.seek(0)
        raw_content = uploaded_file.read()
        
        if isinstance(raw_content, bytes):
            content_str = raw_content.decode('utf-8')
        else:
            content_str = str(raw_content)
        
        data = json.loads(content_str)
        
        return {
            'success': True,
            'data': data,
            'error': None
        }
        
    except Exception as e:
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }

def main():
    st.title("🕸️ AutoTestAI Smart Crawler - Graph Analyzer")
    st.markdown("Upload your `crawler_output.json` file to visualize and analyze crawl results")
    
    # Sidebar
    with st.sidebar:
        st.header("Configuration")
        
        uploaded_file = st.file_uploader(
            "Upload crawler_output.json", 
            type="json",
            help="Select the JSON file exported from the Chrome extension"
        )
        
        if uploaded_file:
            st.write(f"📁 File: {uploaded_file.name}")
            st.write(f"📏 Size: {uploaded_file.size} bytes")
            
            layout_type = st.selectbox(
                "Graph Layout",
                AVAILABLE_LAYOUTS,
                index=0,
                help="Choose how the graph nodes should be arranged"
            )
            
            st.subheader("Filters")
            role_filter = st.multiselect(
                "Filter by Role",
                ["guest", "user", "admin"],
                default=["guest", "user", "admin"]
            )
            
            show_simulated = st.checkbox("Show Simulated Nodes", value=True)
    
    # Main content area
    if uploaded_file is not None:
        st.write("🔄 Processing uploaded file...")
        
        result = safe_json_loader(uploaded_file)
        
        if not result['success']:
            st.error(f"❌ Error loading file: {result['error']}")
            return
        
        data = result['data']
        st.success("✅ File loaded successfully!")
        
        try:
            nodes = data.get('nodes', [])
            edges = data.get('edges', [])
            metadata = data.get('metadata', {})
            stats = data.get('stats', {})
            statistics = data.get('statistics', {})
            
            all_stats = {**stats, **statistics}
            
            st.write(f"📊 Found {len(nodes)} nodes and {len(edges)} edges")
            
            if not nodes:
                st.error("No nodes found in the JSON file")
                return
            
            # Apply filters
            filtered_nodes = []
            for i, n in enumerate(nodes):
                try:
                    if not isinstance(n, dict):
                        continue
                        
                    node_role = n.get('role', 'guest')
                    is_simulated = n.get('simulated', False)
                    
                    if node_role in role_filter and (show_simulated or not is_simulated):
                        filtered_nodes.append(n)
                except Exception:
                    continue
            
            st.write(f"🔍 After filtering: {len(filtered_nodes)} nodes")
            
            if not filtered_nodes:
                st.error("No nodes to display after filtering. Try adjusting your filters.")
                return
            
            # Display statistics
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Nodes", len(filtered_nodes))
            with col2:
                st.metric("Total Edges", len(edges))
            with col3:
                crawl_time = 0
                try:
                    total_time = metadata.get('totalCrawlTime') or metadata.get('crawlTime')
                    if total_time and isinstance(total_time, (int, float)):
                        crawl_time = total_time / 1000
                except:
                    pass
                st.metric("Crawl Duration", f"{crawl_time:.1f}s")
            with col4:
                try:
                    unique_roles = set()
                    for n in filtered_nodes:
                        if isinstance(n, dict):
                            unique_roles.add(n.get('role', 'guest'))
                    st.metric("Roles", len(unique_roles))
                except:
                    st.metric("Roles", 0)
            
            if len(filtered_nodes) > MAX_NODES_DISPLAY:
                st.warning(f"Graph has {len(filtered_nodes)} nodes. Displaying first {MAX_NODES_DISPLAY} for performance.")
                filtered_nodes = filtered_nodes[:MAX_NODES_DISPLAY]
            
            # Build graph
            with st.spinner("Building graph..."):
                try:
                    graph_builder = NetworkXGraphBuilder(filtered_nodes, edges)
                    G = graph_builder.build_graph()
                    positions = graph_builder.get_layout_positions(layout_type)
                except Exception as e:
                    st.error(f"Error building graph: {e}")
                    return
            
            # Create visualization
            with st.spinner("Creating visualization..."):
                try:
                    visualizer = InteractiveGraphVisualizer(G, positions, filtered_nodes)
                    fig = visualizer.create_plotly_figure()
                except Exception as e:
                    st.error(f"Error creating visualization: {e}")
                    return
            
            # Display graph (without selection to avoid errors)
            st.subheader("Interactive Graph Visualization")
            
            try:
                # Display the graph without selection mode to avoid errors
                st.plotly_chart(
                    fig, 
                    use_container_width=True
                )
            except Exception as e:
                st.error(f"Error displaying graph: {e}")
                return
            
            # Node selection using dropdown instead of plotly selection
            st.subheader("Node Analysis")
            
            if filtered_nodes:
                # Create a dropdown for node selection
                node_options = {}
                for i, node in enumerate(filtered_nodes):
                    title = node.get('title', f'Node {i+1}')
                    url = node.get('url', 'No URL')
                    node_id = node.get('id', f'node_{i}')
                    node_options[f"{title} ({url[:30]}...)" if len(url) > 30 else f"{title} ({url})"] = i
                
                selected_node_label = st.selectbox(
                    "Select a node to analyze:",
                    options=list(node_options.keys()),
                    help="Choose a node to see detailed analysis"
                )
                
                if selected_node_label:
                    selected_index = node_options[selected_node_label]
                    selected_node = filtered_nodes[selected_index]
                    
                    st.write("📄 Selected Node Analysis:")
                    analyzer = NodeAnalyzer(selected_node)
                    analyzer.display_node_details()
            else:
                st.info("No nodes available for analysis")
            
            # Export section
            st.sidebar.markdown("---")
            st.sidebar.subheader("Export Options")
            
            try:
                export_manager = ExportManager(G, filtered_nodes, edges)
                
                if st.sidebar.button("Export to GraphML"):
                    try:
                        graphml_str = export_manager.export_to_graphml()
                        st.sidebar.download_button(
                            "Download GraphML",
                            graphml_str,
                            "graph.graphml",
                            "application/xml"
                        )
                    except Exception as e:
                        st.sidebar.error(f"GraphML export failed: {e}")
                
                if st.sidebar.button("Export Nodes to CSV"):
                    try:
                        nodes_df = export_manager.export_to_csv_nodes()
                        csv = nodes_df.to_csv(index=False)
                        st.sidebar.download_button(
                            "Download Nodes CSV",
                            csv,
                            "nodes.csv",
                            "text/csv"
                        )
                    except Exception as e:
                        st.sidebar.error(f"Nodes CSV export failed: {e}")
                
                if st.sidebar.button("Export Edges to CSV"):
                    try:
                        edges_df = export_manager.export_to_csv_edges()
                        csv = edges_df.to_csv(index=False)
                        st.sidebar.download_button(
                            "Download Edges CSV",
                            csv,
                            "edges.csv",
                            "text/csv"
                        )
                    except Exception as e:
                        st.sidebar.error(f"Edges CSV export failed: {e}")
                        
            except Exception as e:
                st.sidebar.error(f"Export manager error: {e}")
        
        except Exception as e:
            st.error(f"Error processing file data: {str(e)}")
            
            with st.expander("Error Details"):
                st.code(str(e))
                import traceback
                st.code(traceback.format_exc())
    
    else:
        st.info("👆 Upload a crawler_output.json file to begin analysis")
        
        with st.expander("Expected JSON Structure"):
            st.json({
                "metadata": {"generatedAt": "...", "version": "1.0.0"},
                "nodes": [{"id": "...", "url": "...", "title": "..."}],
                "edges": [{"from": "...", "to": "...", "action": "..."}],
                "statistics": {"totalNodes": 0, "totalEdges": 0}
            })

if __name__ == "__main__":
    main()
