"""
ODRL Backend Configuration Package
"""
from .settings import (
    # Paths
    BASE_DIR,
    CONFIG_DIR,
    CUSTOM_MODELS_FILE,
    LOGS_DIR,
    
    # API Config
    API_HOST,
    API_PORT,
    API_RELOAD,
    
    # Provider Flags
    ENABLE_OLLAMA,
    ENABLE_FITS,
    ENABLE_GROQ,
    ENABLE_OPENAI,
    ENABLE_ANTHROPIC,
    
    # Provider URLs
    OLLAMA_BASE_URL,
    FITS_SERVER_URL,
    GROQ_BASE_URL,
    OPENAI_BASE_URL,
    ANTHROPIC_BASE_URL,
    
    # API Keys
    GROQ_API_KEY,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    
    # LLM Defaults
    DEFAULT_MODEL,
    DEFAULT_TEMPERATURE,
    DEFAULT_TIMEOUT,
    
    # CORS
    CORS_ORIGINS,
    
    # Features
    ENABLE_CUSTOM_MODELS,
    ENABLE_MODEL_SYNC,
    
    # Functions
    log_configuration,
    validate_configuration,
)

__all__ = [
    # Paths
    'BASE_DIR',
    'CONFIG_DIR',
    'CUSTOM_MODELS_FILE',
    'LOGS_DIR',
    
    # API Config
    'API_HOST',
    'API_PORT',
    'API_RELOAD',
    
    # Provider Flags
    'ENABLE_OLLAMA',
    'ENABLE_FITS',
    'ENABLE_GROQ',
    'ENABLE_OPENAI',
    'ENABLE_ANTHROPIC',
    
    # Provider URLs
    'OLLAMA_BASE_URL',
    'FITS_SERVER_URL',
    'GROQ_BASE_URL',
    'OPENAI_BASE_URL',
    'ANTHROPIC_BASE_URL',
    
    # API Keys
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    
    # LLM Defaults
    'DEFAULT_MODEL',
    'DEFAULT_TEMPERATURE',
    'DEFAULT_TIMEOUT',
    
    # CORS
    'CORS_ORIGINS',
    
    # Features
    'ENABLE_CUSTOM_MODELS',
    'ENABLE_MODEL_SYNC',
    
    # Functions
    'log_configuration',
    'validate_configuration',
]