"""
Configuration Settings for ODRL Backend
Handles all paths in a cross-platform way and centralizes all configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================
# DIRECTORY PATHS (Cross-platform)
# ============================================

# Base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent.parent

# Configuration directory
CONFIG_DIR = BASE_DIR / "config"
CONFIG_DIR.mkdir(exist_ok=True)

# Custom models file path
CUSTOM_MODELS_FILE = CONFIG_DIR / "custom_models.json"

# Logs directory (optional but recommended)
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# ============================================
# API CONFIGURATION
# ============================================

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

# ============================================
# PROVIDER ENABLE/DISABLE FLAGS
# ============================================

ENABLE_OLLAMA = os.getenv("ENABLE_OLLAMA", "false").lower() == "true"
ENABLE_FITS = os.getenv("ENABLE_FITS", "true").lower() == "true"
ENABLE_GROQ = os.getenv("ENABLE_GROQ", "true").lower() == "true"
ENABLE_OPENAI = os.getenv("ENABLE_OPENAI", "false").lower() == "true"
ENABLE_ANTHROPIC = os.getenv("ENABLE_ANTHROPIC", "false").lower() == "true"

# ============================================
# OLLAMA CONFIGURATION (Local)
# ============================================

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")  # Ollama doesn't need real key

# ============================================
# FITS SERVER CONFIGURATION
# ============================================

FITS_SERVER_URL = os.getenv("FITS_SERVER_URL", "http://dgx.fit.fraunhofer.de")
FITS_API_KEY = os.getenv("FITS_API_KEY", "fits")  # May not need real key if Ollama-compatible

# ============================================
# GROQ CONFIGURATION (Cloud - Free)
# ============================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

# ============================================
# OPENAI CONFIGURATION (Cloud - Paid)
# ============================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# ============================================
# ANTHROPIC CONFIGURATION (Cloud - Paid)
# ============================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1")

# ============================================
# LLM DEFAULT SETTINGS
# ============================================

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "ollama:llama3.3:70b")
DEFAULT_TEMPERATURE = float(os.getenv("DEFAULT_TEMPERATURE", "0.3"))
DEFAULT_TIMEOUT = int(os.getenv("DEFAULT_TIMEOUT", "120"))

# ============================================
# CORS CONFIGURATION
# ============================================
# Parse from environment variable or use secure defaults

cors_env = os.getenv("CORS_ORIGINS", "")

if cors_env == "*":
    # Allow all origins (only for development)
    CORS_ORIGINS = ["*"]
    print("⚠️  WARNING: CORS set to allow ALL origins (*)")
elif cors_env:
    # Parse comma-separated origins from .env
    CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",")]
else:
    # Production-ready defaults
    CORS_ORIGINS = [
        # Local development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        
        # Ubuntu server (your production IP)
        "http://10.223.196.212:3000",  # Frontend
        "http://10.223.196.212:8000",  # Backend
        
        # Add more IPs as needed
        # "http://another-server-ip:3000",
    ]

# Log CORS configuration

print(f"🌐 CORS Origins: {len(CORS_ORIGINS)} allowed")

# ============================================
# FEATURE FLAGS
# ============================================

ENABLE_CUSTOM_MODELS = os.getenv("ENABLE_CUSTOM_MODELS", "true").lower() == "true"
ENABLE_MODEL_SYNC = os.getenv("ENABLE_MODEL_SYNC", "true").lower() == "true"

# ============================================
# STARTUP LOGGING
# ============================================

def log_configuration():
    """Log configuration on startup"""
    print("=" * 80)
    print("📂 CONFIGURATION LOADED")
    print("=" * 80)
    print(f"📁 Config Directory: {CONFIG_DIR}")
    print(f"📄 Custom Models File: {CUSTOM_MODELS_FILE}")
    print(f"📊 Logs Directory: {LOGS_DIR}")
    print()
    print("🔌 ENABLED PROVIDERS:")
    if ENABLE_OLLAMA:
        print(f"   Ollama (Local): {OLLAMA_BASE_URL}")
    if ENABLE_FITS:
        print(f"   FITS Server: {FITS_SERVER_URL}")
    if ENABLE_GROQ:
        print(f"   Groq Cloud: {GROQ_BASE_URL}")
    if ENABLE_OPENAI:
        print(f"   OpenAI: {OPENAI_BASE_URL}")
    if ENABLE_ANTHROPIC:
        print(f"   Anthropic: {ANTHROPIC_BASE_URL}")
    print()
    print(f"🎯 Default Model: {DEFAULT_MODEL}")
    print(f"🌡️  Default Temperature: {DEFAULT_TEMPERATURE}")
    print("=" * 80)

# ============================================
# VALIDATION
# ============================================

def validate_configuration():
    """Validate configuration at startup"""
    errors = []
    
    # Check if at least one provider is enabled
    if not any([ENABLE_OLLAMA, ENABLE_FITS, ENABLE_GROQ, ENABLE_OPENAI, ENABLE_ANTHROPIC]):
        errors.append("  No providers enabled! Enable at least one in .env")
    
    # Check API keys for enabled cloud providers
    if ENABLE_GROQ and not GROQ_API_KEY:
        errors.append("  GROQ_API_KEY missing but ENABLE_GROQ=true")
    
    if ENABLE_OPENAI and not OPENAI_API_KEY:
        errors.append("  OPENAI_API_KEY missing but ENABLE_OPENAI=true")
    
    if ENABLE_ANTHROPIC and not ANTHROPIC_API_KEY:
        errors.append("  ANTHROPIC_API_KEY missing but ENABLE_ANTHROPIC=true")
    
    return errors

# Run validation on import
_validation_errors = validate_configuration()
if _validation_errors:
    print("\n  CONFIGURATION WARNINGS:")
    for error in _validation_errors:
        print(f"  {error}")
    print()