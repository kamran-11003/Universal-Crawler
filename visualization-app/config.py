import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = "AIzaSyC495337JLVNngj2QTQGfEvO9CgSdSoK1c"  # Hardcoded from Week 3
DEFAULT_LAYOUT = "spring"
AVAILABLE_LAYOUTS = ["spring", "hierarchical", "circular", "kamada_kawai", "shell"]
MAX_NODES_DISPLAY = 1000
NODE_COLORS = {
    "guest": "#90EE90",
    "user": "#87CEEB", 
    "admin": "#FFB6C1"
}