"""
LLM Factory - Provider-Agnostic LLM Creation
======================================================

This factory creates the appropriate LLM instance based on:
1. Model string format (provider:model_name)
2. Environment configuration (.env file)
3. Fallback to default model
4. Automatic retry and fallback strategies

Agents remain completely LLM-agnostic - they just call:
    llm = LLMFactory.create_llm(model="groq:llama-3.3-70b-versatile")
    llm = LLMFactory.create_llm(model="azure:gpt-4o")

Updated: 2025 — Azure OpenAI as first-class provider (FHGenie)
"""

import os
import time
import logging
from typing import Optional, Any

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Import LangChain base
from langchain_core.language_models import BaseChatModel
from langchain_ollama import ChatOllama

# Optional imports (only loaded if provider is enabled)
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.debug("langchain-groq not installed")

try:
    from langchain_openai import ChatOpenAI, AzureChatOpenAI
    OPENAI_AVAILABLE = True
    AZURE_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AZURE_AVAILABLE = False
    logger.debug("langchain-openai not installed")

try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.debug("langchain-anthropic not installed")


class LLMFactory:
    """
    Factory for creating LLM instances based on provider and model

    Features:
    - Provider abstraction (switch models without changing agent code)
    - Automatic retry logic with exponential backoff
    - Fallback to alternative providers
    - Cost tracking and logging
    - Model validation
    - Custom model support including azure-openai provider type

    Usage in agents:
        from utils.llm_factory import LLMFactory

        # Simple usage (uses defaults from .env — Azure FHGenie by default)
        llm = LLMFactory.create_llm()

        # Specify model explicitly
        llm = LLMFactory.create_llm(model="azure:gpt-4o")
        llm = LLMFactory.create_llm(model="groq:llama-3.3-70b-versatile")

        # With custom parameters
        llm = LLMFactory.create_llm(
            model="ollama:llama3.1:70b",
            temperature=0.7,
            max_retries=3
        )
    """

    # Cost estimation (USD per 1M tokens) - approximate values
    COST_ESTIMATES = {
        "gpt-4": {"input": 30.0, "output": 60.0},
        "gpt-4o": {"input": 2.5, "output": 10.0},
        "gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
        "claude-3-opus": {"input": 15.0, "output": 75.0},
        "claude-3-sonnet": {"input": 3.0, "output": 15.0},
        "groq": {"input": 0.0, "output": 0.0},  # Free tier
        "ollama": {"input": 0.0, "output": 0.0},  # Local/FITS
        "azure": {"input": 2.5, "output": 10.0},  # Azure ≈ OpenAI pricing
    }

    @staticmethod
    def get_best_available_model(prefer_free: bool = True) -> str:
        """
        Automatically select the best available model based on what's enabled

        Args:
            prefer_free: If True, prioritize free providers (Groq, Ollama)
                        If False, prioritize quality (Azure, OpenAI, Anthropic)

        Returns:
            Model string in format "provider:model_name"
        """
        available = LLMFactory.get_available_providers()

        if not available:
            raise ValueError(
                "No LLM providers enabled in .env\n"
                "Enable at least one: ENABLE_OLLAMA, ENABLE_GROQ, ENABLE_OPENAI, ENABLE_AZURE, or ENABLE_ANTHROPIC"
            )

        # Priority order based on preference
        if prefer_free:
            priority = ["groq", "ollama", "azure", "openai", "anthropic"]
        else:
            priority = ["azure", "anthropic", "openai", "groq", "ollama"]

        # Find first available provider in priority order
        for provider in priority:
            if provider in available:
                model_name = LLMFactory._get_default_model(provider)
                selected = f"{provider}:{model_name}"
                logger.info(f"Auto-selected best available: {selected}")
                return selected

        # Fallback to first available
        provider = available[0]
        model_name = LLMFactory._get_default_model(provider)
        return f"{provider}:{model_name}"

    @staticmethod
    def parse_model_string(model: Optional[str] = None) -> tuple[str, str]:
        """
        Parse model string into provider and model name

        Args:
            model: Format "provider:model_name" or just "model_name"
                  Special values:
                  - None: Uses DEFAULT_MODEL from .env
                  - "auto": Auto-selects best available (free priority)
                  - "auto:quality": Auto-selects best available (quality priority)

        Returns:
            (provider, model_name) tuple

        Examples:
            "ollama:llama3.1:70b" -> ("ollama", "llama3.1:70b")
            "groq:llama-3.3-70b-versatile" -> ("groq", "llama-3.3-70b-versatile")
            "azure:gpt-4o" -> ("azure", "gpt-4o")
            "gpt-4" -> ("azure", "gpt-4") if Azure enabled, else ("openai", "gpt-4")
            "auto" -> Auto-select best free provider
            "auto:quality" -> Auto-select best quality provider
            None -> Uses DEFAULT_MODEL from .env
        """
        # Handle auto-selection
        if model == "auto":
            model = LLMFactory.get_best_available_model(prefer_free=True)
        elif model == "auto:quality":
            model = LLMFactory.get_best_available_model(prefer_free=False)

        if not model:
            # Check for DEFAULT_MODEL in .env
            default = os.getenv("DEFAULT_MODEL", "azure:gpt-4o")
            model = default
            logger.info(f"Using DEFAULT_MODEL: {model}")

        # Parse provider:model format
        if ":" in model:
            parts = model.split(":", 1)
            provider = parts[0].lower()
            model_name = parts[1]
        else:
            # Auto-detect provider from model name
            if "gpt" in model.lower():
                # Prefer Azure over plain OpenAI when Azure is available
                if os.getenv("ENABLE_AZURE", "true").lower() == "true":
                    provider = "azure"
                elif os.getenv("ENABLE_OPENAI", "false").lower() == "true":
                    provider = "openai"
                else:
                    provider = "azure"  # Still default to Azure; validation will catch it
                model_name = model
            elif "claude" in model.lower():
                provider = "anthropic"
                model_name = model
            else:
                provider = "ollama"
                model_name = model

        return provider, model_name

    @staticmethod
    def get_cost_info(provider: str, model_name: str) -> dict:
        """Get cost information for a model"""
        # Try exact match first
        if model_name in LLMFactory.COST_ESTIMATES:
            return LLMFactory.COST_ESTIMATES[model_name]

        # Try provider default
        if provider in LLMFactory.COST_ESTIMATES:
            return LLMFactory.COST_ESTIMATES[provider]

        # Unknown cost
        return {"input": None, "output": None}

    @staticmethod
    def _create_custom_llm(
        custom_config: dict,
        model: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> BaseChatModel:
        """
        Unified handler for ALL custom model provider types.

        Supported provider_type values:
          - "ollama"             → ChatOllama
          - "openai-compatible"  → ChatOpenAI (generic OpenAI-compatible endpoints)
          - "google-genai"       → ChatGoogleGenerativeAI

        This is called for both 'custom:' prefixed models AND legacy custom_config dicts.
        """
        provider_type = custom_config.get("provider_type", "")
        if isinstance(provider_type, str):
            normalized = provider_type.strip().lower().replace("_", "-")
            if normalized in {"openai", "openai-compatible", "azure", "azure-openai"}:
                provider_type = "openai-compatible"
            else:
                provider_type = normalized
        base_url = custom_config.get("base_url", "")
        api_key = custom_config.get("api_key", "")
        model_id = custom_config.get("model_id") or model.replace("custom:", "")
        context_length = custom_config.get("context_length", 8192)

        logger.info(f"Creating custom LLM: provider_type={provider_type}, model_id={model_id}, base_url={base_url}")

        # ─── Ollama ───────────────────────────────────────────
        if provider_type == "ollama":
            from langchain_ollama import ChatOllama
            return ChatOllama(
                model=model_id,
                base_url=base_url,
                temperature=temperature,
                num_ctx=context_length,
                **kwargs
            )

        # ─── OpenAI-compatible (vLLM, LiteLLM, DGX, etc.) ────
        elif provider_type == "openai-compatible":
            if not OPENAI_AVAILABLE:
                raise ImportError("langchain-openai required. Install: pip install langchain-openai")

            safe_max_tokens = max_tokens if max_tokens else min(4096, context_length // 2)
            return ChatOpenAI(
                model_name=model_id,
                openai_api_base=base_url,
                openai_api_key=api_key or "not-needed",
                temperature=temperature,
                max_tokens=safe_max_tokens,
                **kwargs
            )

        # ─── Google GenAI ─────────────────────────────────────
        elif provider_type == "google-genai":
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=model_id,
                google_api_key=api_key,
                temperature=temperature,
                max_output_tokens=min(max_tokens or 8192, context_length // 2),
                convert_system_message_to_human=True,
                **kwargs
            )

        else:
            raise ValueError(
                f"Unknown custom provider_type: '{provider_type}'. "
                f"Supported: ollama, openai-compatible, google-genai"
            )

    @staticmethod
    def create_llm(
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        enable_fallback: bool = True,
        verbose: bool = False,
        custom_config: Optional[dict] = None,
        **kwargs
    ) -> BaseChatModel:
        """
        Create LLM client with optional custom configuration or 'custom:' prefix.

        Supports:
        - Standard providers (azure, groq, openai, ollama, anthropic)
        - Custom model configs from frontend (all provider types)
        - 'custom:' prefix model strings for user-defined endpoints

        Example:
            # Default (Azure FHGenie)
            llm = LLMFactory.create_llm()

            # Explicit
            llm = LLMFactory.create_llm(model="azure:gpt-4o")
            llm = LLMFactory.create_llm(model="groq:llama-3.3-70b-versatile")

            # Custom model from frontend settings
            llm = LLMFactory.create_llm(
                model="custom:gpt-4o",
                custom_config={...}
            )
        """
        if verbose:
            logger.setLevel(logging.DEBUG)

        # Default model and temperature
        if not model:
            model = os.getenv("DEFAULT_MODEL", "azure:gpt-4o")
        if not temperature:
            temperature = float(os.getenv("DEFAULT_TEMPERATURE", "0.3"))

        # ─── CUSTOM PREFIX: model starts with "custom:" ───────
        if model and model.startswith("custom:"):
            logger.info(f"Detected custom model prefix: {model}")
            if not custom_config:
                raise ValueError(
                    f"Model '{model}' uses 'custom:' prefix but no custom_config provided. "
                    "Pass a 'custom_model' dict with provider details."
                )
            return LLMFactory._create_custom_llm(
                custom_config=custom_config,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

        # ─── LEGACY: custom_config without prefix ────────────
        elif custom_config:
            logger.info(f"Creating LLM via legacy custom_config ({custom_config.get('provider_type')})")
            return LLMFactory._create_custom_llm(
                custom_config=custom_config,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

        # ─── STANDARD PROVIDERS (.env based) ─────────────────
        provider, model_name = LLMFactory.parse_model_string(model)

        cost_info = LLMFactory.get_cost_info(provider, model_name)
        cost_str = "FREE" if cost_info["input"] == 0.0 else f"~${cost_info['input']}/{cost_info['output']} per 1M tokens"
        logger.info(f"Creating {provider} LLM: {model_name} (T={temperature}, Cost: {cost_str})")

        last_error = None
        for attempt in range(max_retries):
            try:
                if provider == "azure":
                    return LLMFactory._create_azure(model_name, temperature, max_tokens, **kwargs)
                elif provider == "ollama":
                    return LLMFactory._create_ollama(model_name, temperature, max_tokens, **kwargs)
                elif provider == "groq":
                    return LLMFactory._create_groq(model_name, temperature, max_tokens, **kwargs)
                elif provider == "openai":
                    return LLMFactory._create_openai(model_name, temperature, max_tokens, **kwargs)
                elif provider == "anthropic":
                    return LLMFactory._create_anthropic(model_name, temperature, max_tokens, **kwargs)
                else:
                    raise ValueError(f"Unknown provider: {provider}")

            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    delay = retry_delay * (2 ** attempt)
                    logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}")
                    logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    logger.error(f"All {max_retries} attempts failed for {provider}:{model_name}")

        # Fallback logic
        if enable_fallback:
            logger.info("Attempting fallback to alternative providers...")
            for fallback_provider in LLMFactory._get_fallback_order(provider):
                try:
                    fallback_model = LLMFactory._get_default_model(fallback_provider)
                    return LLMFactory.create_llm(
                        model=f"{fallback_provider}:{fallback_model}",
                        temperature=temperature,
                        max_tokens=max_tokens,
                        max_retries=1,
                        enable_fallback=False,
                        **kwargs
                    )
                except Exception as e:
                    logger.warning(f"Fallback to {fallback_provider} failed: {e}")
                    continue

        raise ValueError(
            f"Failed to create LLM after {max_retries} attempts.\n"
            f"Last error: {last_error}\n"
            f"Check your .env configuration and network connection."
        )

    @staticmethod
    def _get_fallback_order(failed_provider: str) -> list[str]:
        """Get ordered list of fallback providers (Azure-first, then free)"""
        available = LLMFactory.get_available_providers()

        # Remove the failed provider
        if failed_provider in available:
            available.remove(failed_provider)

        # Azure first, then free/local options, then paid
        priority_order = ["azure", "groq", "ollama", "openai", "anthropic"]
        return [p for p in priority_order if p in available]

    @staticmethod
    def _get_default_model(provider: str) -> str:
        """Get default model for a provider"""
        defaults = {
            "azure": os.getenv("AZURE_LLM_MODEL", "gpt-4o"),
            "ollama": "llama3.1:70b",
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-3.5-turbo",
            "anthropic": "claude-3-sonnet-20240229",
        }
        return defaults.get(provider, "llama3.1:70b")

    # ──────────────────────────────────────────────────────
    # Provider creation methods
    # ──────────────────────────────────────────────────────

    @staticmethod
    def _create_azure(
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> "AzureChatOpenAI":
        """
        Create Azure OpenAI LLM (Fraunhofer FHGenie / enterprise Azure)

        Reads from .env:
            AZURE_OPENAI_API_KEY   - API key
            AZURE_ENDPOINT         - e.g. https://fhgenie-api-fit-ems30127.openai.azure.com
            AZURE_LLM_DEPLOYMENT   - deployment name, e.g. gpt-4o-2024-08-06
            AZURE_API_VERSION      - e.g. 2024-10-01-preview
            AZURE_LLM_MODEL        - model name for display, e.g. gpt-4o
        """
        if os.getenv("ENABLE_AZURE", "true").lower() != "true":
            raise ValueError(
                "Azure provider not enabled in .env\n"
                "Set ENABLE_AZURE=true in .env"
            )

        if not AZURE_AVAILABLE:
            raise ImportError(
                "AzureChatOpenAI not available.\n"
                "Install with: pip install langchain-openai"
            )

        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY not found in .env")

        endpoint = os.getenv("AZURE_ENDPOINT")
        if not endpoint:
            raise ValueError("AZURE_ENDPOINT not found in .env")

        deployment = os.getenv("AZURE_LLM_DEPLOYMENT")
        if not deployment:
            raise ValueError("AZURE_LLM_DEPLOYMENT not found in .env")

        api_version = os.getenv("AZURE_API_VERSION", "2024-10-01-preview")

        logger.info(f"Using Azure OpenAI: {endpoint} / deployment={deployment}")

        config = {
            "azure_endpoint": endpoint,
            "openai_api_key": api_key,
            "azure_deployment": deployment,
            "openai_api_version": api_version,
            "temperature": temperature,
        }
        if max_tokens:
            config["max_tokens"] = max_tokens
        config.update(kwargs)
        return AzureChatOpenAI(**config)

    @staticmethod
    def _create_ollama(
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> ChatOllama:
        """Create Ollama LLM (local or FITS server)"""
        # Check if FITS is enabled (priority)
        if os.getenv("ENABLE_FITS", "false").lower() == "true":
            fits_url = os.getenv("FITS_SERVER_URL")
            if not fits_url:
                raise ValueError("ENABLE_FITS=true but FITS_SERVER_URL not configured")
            base_url = fits_url
            logger.debug(f"Using FITS server: {base_url}")

        # Check if local Ollama is enabled
        elif os.getenv("ENABLE_OLLAMA", "false").lower() == "true":
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            logger.debug(f"Using local Ollama: {base_url}")
        else:
            raise ValueError(
                "Ollama provider requested but neither ENABLE_OLLAMA nor ENABLE_FITS is enabled\n"
                "Set ENABLE_OLLAMA=true or ENABLE_FITS=true in .env"
            )

        config = {
            "base_url": base_url,
            "model": model,
            "temperature": temperature,
        }
        if max_tokens:
            config["num_predict"] = max_tokens
        config.update(kwargs)
        return ChatOllama(**config)

    @staticmethod
    def _create_groq(
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> "ChatGroq":
        """Create Groq LLM (cloud, FREE tier)"""
        if os.getenv("ENABLE_GROQ", "false").lower() != "true":
            raise ValueError("Groq provider not enabled in .env")

        if not GROQ_AVAILABLE:
            raise ImportError("Install with: pip install langchain-groq")

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env")

        logger.debug("Using Groq Cloud API (FREE tier)")

        config = {
            "groq_api_key": api_key,
            "model_name": model,
            "temperature": temperature,
        }
        if max_tokens:
            config["max_tokens"] = max_tokens
        config.update(kwargs)
        return ChatGroq(**config)

    @staticmethod
    def _create_openai(
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> "ChatOpenAI":
        """Create OpenAI LLM (cloud, paid)"""
        if os.getenv("ENABLE_OPENAI", "false").lower() != "true":
            raise ValueError("OpenAI provider not enabled in .env")

        if not OPENAI_AVAILABLE:
            raise ImportError("Install with: pip install langchain-openai")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in .env")

        logger.debug("Using OpenAI API")

        config = {
            "openai_api_key": api_key,
            "model_name": model,
            "temperature": temperature,
        }
        if max_tokens:
            config["max_tokens"] = max_tokens

        # Support custom base URL
        base_url = os.getenv("OPENAI_BASE_URL")
        if base_url:
            config["openai_api_base"] = base_url
            logger.debug(f"Custom endpoint: {base_url}")

        config.update(kwargs)
        return ChatOpenAI(**config)

    @staticmethod
    def _create_anthropic(
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> "ChatAnthropic":
        """Create Anthropic Claude LLM (cloud, paid)"""
        if os.getenv("ENABLE_ANTHROPIC", "false").lower() != "true":
            raise ValueError("Anthropic provider not enabled in .env")

        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Install with: pip install langchain-anthropic")

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in .env")

        logger.debug("Using Anthropic Claude API")

        config = {
            "anthropic_api_key": api_key,
            "model_name": model,
            "temperature": temperature,
        }
        if max_tokens:
            config["max_tokens_to_sample"] = max_tokens
        config.update(kwargs)
        return ChatAnthropic(**config)

    # ──────────────────────────────────────────────────────
    # Diagnostics & Health
    # ──────────────────────────────────────────────────────

    @staticmethod
    def get_available_providers() -> list[str]:
        """Get list of currently enabled providers from .env"""
        providers = []

        # Azure first (primary provider)
        if os.getenv("ENABLE_AZURE", "true").lower() == "true":
            providers.append("azure")

        if os.getenv("ENABLE_OLLAMA", "false").lower() == "true":
            providers.append("ollama")

        if os.getenv("ENABLE_FITS", "false").lower() == "true":
            if "ollama" not in providers:
                providers.append("ollama")  # FITS uses Ollama backend

        if os.getenv("ENABLE_GROQ", "false").lower() == "true":
            providers.append("groq")

        if os.getenv("ENABLE_OPENAI", "false").lower() == "true":
            providers.append("openai")

        if os.getenv("ENABLE_ANTHROPIC", "false").lower() == "true":
            providers.append("anthropic")

        return providers

    @staticmethod
    def diagnose_provider(provider: str) -> dict:
        """Detailed diagnostics for a specific provider"""
        diagnostics = {
            "provider": provider,
            "enabled": False,
            "configuration": {},
            "issues": []
        }

        # Check if provider is enabled
        enable_key = f"ENABLE_{provider.upper()}"
        is_enabled = os.getenv(enable_key, "false").lower() == "true"
        diagnostics["enabled"] = is_enabled

        if not is_enabled:
            diagnostics["issues"].append(f"{enable_key} not set to true in .env")
            return diagnostics

        # Provider-specific checks
        if provider == "azure":
            api_key = os.getenv("AZURE_OPENAI_API_KEY")
            endpoint = os.getenv("AZURE_ENDPOINT")
            deployment = os.getenv("AZURE_LLM_DEPLOYMENT")
            diagnostics["configuration"]["api_key"] = "present" if api_key else "missing"
            diagnostics["configuration"]["endpoint"] = endpoint if endpoint else "missing"
            diagnostics["configuration"]["deployment"] = deployment if deployment else "missing"
            diagnostics["configuration"]["api_version"] = os.getenv("AZURE_API_VERSION", "not set")
            if not api_key:
                diagnostics["issues"].append("AZURE_OPENAI_API_KEY not found in .env")
            if not endpoint:
                diagnostics["issues"].append("AZURE_ENDPOINT not found in .env")
            if not deployment:
                diagnostics["issues"].append("AZURE_LLM_DEPLOYMENT not found in .env")
            if not AZURE_AVAILABLE:
                diagnostics["issues"].append("langchain-openai not installed (provides AzureChatOpenAI)")

        elif provider == "ollama":
            if os.getenv("ENABLE_FITS", "false").lower() == "true":
                fits_url = os.getenv("FITS_SERVER_URL")
                diagnostics["configuration"]["mode"] = "FITS"
                diagnostics["configuration"]["url"] = fits_url
                if not fits_url:
                    diagnostics["issues"].append("FITS_SERVER_URL not configured")
            else:
                base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
                diagnostics["configuration"]["mode"] = "Local"
                diagnostics["configuration"]["url"] = base_url

        elif provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            diagnostics["configuration"]["api_key"] = "present" if api_key else "missing"
            if not api_key:
                diagnostics["issues"].append("GROQ_API_KEY not found in .env")
            if not GROQ_AVAILABLE:
                diagnostics["issues"].append("langchain-groq not installed")

        elif provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("OPENAI_BASE_URL")
            diagnostics["configuration"]["api_key"] = "present" if api_key else "missing"
            diagnostics["configuration"]["base_url"] = base_url if base_url else "default"
            if not api_key:
                diagnostics["issues"].append("OPENAI_API_KEY not found in .env")
            if not OPENAI_AVAILABLE:
                diagnostics["issues"].append("langchain-openai not installed")

        elif provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            diagnostics["configuration"]["api_key"] = "present" if api_key else "missing"
            if not api_key:
                diagnostics["issues"].append("ANTHROPIC_API_KEY not found in .env")
            if not ANTHROPIC_AVAILABLE:
                diagnostics["issues"].append("langchain-anthropic not installed")

        # Try to create LLM
        try:
            model = LLMFactory._get_default_model(provider)
            llm = LLMFactory.create_llm(
                model=f"{provider}:{model}",
                max_retries=1,
                enable_fallback=False
            )
            diagnostics["can_create"] = True
        except Exception as e:
            diagnostics["can_create"] = False
            diagnostics["issues"].append(f"Creation failed: {str(e)[:200]}")

        return diagnostics

    @staticmethod
    def benchmark_providers(prompt: str = "What is 2+2?", num_calls: int = 3) -> dict:
        """Benchmark all available providers"""
        import time

        results = {}
        providers = LLMFactory.get_available_providers()

        print(f"\nBenchmarking {len(providers)} providers with {num_calls} calls each...")
        print("=" * 50)

        for provider in providers:
            print(f"\nTesting {provider}...")
            try:
                model = LLMFactory._get_default_model(provider)
                llm = LLMFactory.create_llm(
                    model=f"{provider}:{model}",
                    max_retries=1,
                    enable_fallback=False
                )

                times = []
                for i in range(num_calls):
                    start = time.time()
                    response = llm.invoke(prompt)
                    elapsed = time.time() - start
                    times.append(elapsed)
                    print(f"  Call {i+1}: {elapsed:.2f}s")

                results[provider] = {
                    "model": model,
                    "avg_time": sum(times) / len(times),
                    "min_time": min(times),
                    "max_time": max(times),
                    "total_time": sum(times),
                    "status": "success"
                }

            except Exception as e:
                print(f"  Failed: {str(e)[:100]}")
                results[provider] = {
                    "status": "failed",
                    "error": str(e)[:200]
                }

        return results

    @staticmethod
    def health_check(test_invoke: bool = False) -> dict:
        """Check health of all enabled providers"""
        status = {}
        providers = LLMFactory.get_available_providers()

        for provider in providers:
            try:
                model = LLMFactory._get_default_model(provider)
                llm = LLMFactory.create_llm(
                    model=f"{provider}:{model}",
                    max_retries=1,
                    enable_fallback=False
                )

                # Optionally test with actual invocation
                if test_invoke:
                    llm.invoke("Hi")

                status[provider] = "healthy"

            except Exception as e:
                error_msg = str(e)
                # Simplify error message
                if "404" in error_msg:
                    status[provider] = "unhealthy: 404 endpoint not found"
                elif "API key" in error_msg or "api_key" in error_msg:
                    status[provider] = "unhealthy: API key missing/invalid"
                elif "not enabled" in error_msg:
                    status[provider] = "disabled in .env"
                else:
                    status[provider] = f"unhealthy: {error_msg[:100]}"

        return status


# Convenience function for backward compatibility
def create_llm(model: Optional[str] = None, temperature: float = 0.3, **kwargs) -> BaseChatModel:
    """
    Convenience function - same as LLMFactory.create_llm()

    Usage:
        from utils.llm_factory import create_llm
        llm = create_llm("azure:gpt-4o")
        llm = create_llm("groq:llama-3.3-70b-versatile")
    """
    return LLMFactory.create_llm(model, temperature, **kwargs)


# Test function
if __name__ == "__main__":
    print("Testing LLM Factory\n")
    print("=" * 50)

    # Show available providers
    providers = LLMFactory.get_available_providers()
    print(f"\nAvailable providers: {providers}")

    # Health check
    print("\nRunning health check (creation only, no actual calls)...")
    health = LLMFactory.health_check(test_invoke=False)
    for provider, status in health.items():
        print(f"  {provider}: {status}")

    # Detailed diagnostics for all providers
    print("\nDetailed diagnostics:")
    print("=" * 50)

    for provider in providers:
        diag = LLMFactory.diagnose_provider(provider)
        print(f"\n{provider.upper()}:")
        print(f"  Enabled: {diag['enabled']}")
        print(f"  Can Create: {diag.get('can_create', 'N/A')}")
        if diag['configuration']:
            print(f"  Config: {diag['configuration']}")
        if diag['issues']:
            print(f"  Issues:")
            for issue in diag['issues']:
                print(f"    - {issue}")

    # Test creating LLM with default model (Azure)
    print("\n" + "=" * 50)
    print("\nTest 1: Default model (Azure FHGenie)")
    try:
        llm = LLMFactory.create_llm(verbose=True)
        print(f"Success: {type(llm).__name__}")
    except Exception as e:
        print(f"Failed: {e}")

    # Test specific models
    print("\n" + "=" * 50)
    test_models = [
        "azure:gpt-4o",
        "groq:llama-3.3-70b-versatile",
        "ollama:llama3.1:70b",
        "openai:gpt-4",
    ]

    for model in test_models:
        print(f"\nTest: {model}")
        try:
            llm = LLMFactory.create_llm(model, temperature=0.3, max_retries=1)
            print(f"Success: {type(llm).__name__}")
        except Exception as e:
            print(f"Skipped: {e}")

    print("\n" + "=" * 50)
    print("Factory test complete!")

    # Optional: Run benchmark if user wants
    print("\n" + "=" * 50)
    print("To run performance benchmark, call:")
    print("  results = LLMFactory.benchmark_providers()")
    print("\nTo diagnose specific provider:")
    print("  diag = LLMFactory.diagnose_provider('azure')")