from typing import Optional
import logging

# Create module-level logger
logger = logging.getLogger("odrl_api")
logger.setLevel(logging.INFO)

# Add console handler if not already added
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)


def log_request(endpoint: str, model: Optional[str] = None):
    """
    Log API request
    Args:
        endpoint: API endpoint name (e.g., "Generate", "Validate")
        model: Model identifier (optional)
    """
    logger.info(f"{endpoint} request: model={model or 'default'}")
