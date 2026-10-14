"""
CircuitX Backend Configuration
Loads configuration and secrets exclusively on the backend from environment variables.
Never exposes API keys or secrets to frontend clients or source control.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory or parent directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Load .env file (prioritizing backend/.env then root .env)
if (BASE_DIR / ".env").is_file():
    load_dotenv(BASE_DIR / ".env")
elif (ROOT_DIR / ".env").is_file():
    load_dotenv(ROOT_DIR / ".env")
else:
    load_dotenv()

# OpenAI / Groq / Compatible LLM Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()

# If GROQ_API_KEY is provided and OPENAI_API_KEY is empty, use GROQ_API_KEY
if not OPENAI_API_KEY and GROQ_API_KEY:
    OPENAI_API_KEY = GROQ_API_KEY

# If user left placeholder, treat as empty
if OPENAI_API_KEY in ["your_api_key_here", "your_openai_api_key_here", "your_groq_api_key_here", ""]:
    OPENAI_API_KEY = ""

OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "").strip() or None
if not OPENAI_BASE_URL and OPENAI_API_KEY.startswith("gsk_"):
    OPENAI_BASE_URL = "https://api.groq.com/openai/v1"

default_model = "qwen/qwen3.8-27b" if (OPENAI_BASE_URL and "groq" in OPENAI_BASE_URL) else "gpt-4o-mini"
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", default_model).strip() or default_model
if OPENAI_BASE_URL and "groq" in OPENAI_BASE_URL and OPENAI_MODEL in ["gpt-4o-mini", "gpt-4o", "your_supported_model_name", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
    OPENAI_MODEL = "qwen/qwen3.8-27b"

# Server Host & Port
BACKEND_HOST = os.environ.get("BACKEND_HOST", "127.0.0.1").strip()
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "8000"))

# Frontend CORS Allowed Origins
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").strip()

# Database Path
DEFAULT_DB = str(BASE_DIR / "circuitx.db")
CIRCUITX_DB_PATH = os.environ.get("CIRCUITX_DB_PATH", DEFAULT_DB).strip() or DEFAULT_DB

# Context and Latency Optimization
MAX_CONTEXT_MESSAGES = int(os.environ.get("MAX_CONTEXT_MESSAGES", "10"))
MAX_MESSAGE_LENGTH = int(os.environ.get("MAX_MESSAGE_LENGTH", "32768"))
REQUEST_TIMEOUT_SECONDS = float(os.environ.get("REQUEST_TIMEOUT_SECONDS", "45.0"))

# Security & Rate Limiting Configuration
MAX_REQUEST_SIZE_BYTES = int(os.environ.get("MAX_REQUEST_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit
RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "120"))  # Max 120 req/min per IP
RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() in ["1", "true", "yes"]

