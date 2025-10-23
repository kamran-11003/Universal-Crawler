# AutoTestAI Visualization App

Interactive graph visualization and analysis tool for AutoTestAI crawler output.

## Quick Start

```bash
pip install -r requirements.txt
streamlit run app.py
```

Then upload your `crawler_output.json` file from the Chrome extension.

## Features

- **Interactive Graph Visualization**: NetworkX-based graph with multiple layout options
- **Node Analysis**: Select nodes via dropdown to see detailed testable component analysis
- **AI-Powered Test Suggestions**: Gemini API integration for intelligent test case generation
- **Export Options**: GraphML, CSV, and DOT formats
- **Filtering**: Filter by user role and simulation status
- **Component Analysis**: Forms, links, APIs, performance, accessibility, and security analysis

## Project Structure

```
visualization-app/
├── app.py                     # Main Streamlit application
├── components/
│   ├── graph_visualizer.py    # Interactive Plotly graph rendering
│   ├── node_analyzer.py       # Node detail analysis and AI suggestions
│   ├── testable_components.py # Testable element analysis
│   └── export_manager.py      # Data export functionality
├── utils/
│   ├── data_parser.py         # JSON file parsing
│   ├── networkx_utils.py      # Graph building and layouts
│   ├── component_classifier.py # Component categorization
│   └── ai_test_suggester.py   # Gemini API integration
├── config.py                  # Configuration and API keys
├── requirements.txt           # Python dependencies
└── README.md                  # This documentation
```

## Configuration

The app uses the hardcoded Gemini API key from Week 3. To change it, modify `config.py`.

## Usage

1. **Upload JSON**: Select your `crawler_output.json` from the Chrome extension
2. **View Graph**: Interactive visualization with multiple layout options
3. **Analyze Nodes**: Use the dropdown to select and analyze specific pages
4. **Generate Tests**: AI-powered test case suggestions for each node
5. **Export Data**: Download results in various formats