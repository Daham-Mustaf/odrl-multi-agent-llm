"""
ODRL Policy Generator API - Production Ready with Custom Models Storage
UPDATED: Now uses config directory for settings and custom_models.json
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import sys
import os
import time
import json
import logging
from fastapi import UploadFile, File
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from urllib.parse import unquote
from fastapi.responses import StreamingResponse
from asyncio import Queue
import asyncio
from contextlib import asynccontextmanager

from utils.request_utils import run_with_disconnect_check
from utils.logger_utils import log_request, logger

# Load environment first
from dotenv import load_dotenv
load_dotenv()

# ============================================
# IMPORT CONFIG
# ============================================
from config.settings import (
    CUSTOM_MODELS_FILE,
    CONFIG_DIR,
    CORS_ORIGINS,
    DEFAULT_MODEL,
    log_configuration,
)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Add to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

try:
    print("[DEBUG] Importing Parser...")
    from agents.text_parser.parser import TextParser
    print("[DEBUG] Parser imported")

    print("[DEBUG] Importing Reasoner...")
    from agents.reasoner.reasoner import Reasoner
    print("[DEBUG] Reasoner imported")

    print("[DEBUG] Importing Generator...")
    from agents.generator.generator import Generator
    print("[DEBUG] Generator imported")

    print("[DEBUG] Importing Validator...")
    from agents.validator.validator import Validator
    print("[DEBUG]  Validator imported")

    AGENTS_AVAILABLE = True
    print("[INFO] All agents loaded successfully")

    print("[DEBUG] Importing storage router...")
    from api.storage_api import router as storage_router
    print("[DEBUG] Storage router imported")
    STORAGE_ROUTER_AVAILABLE = True

except ImportError as e:
    AGENTS_AVAILABLE = False
    print(f"[ERROR] Failed to import agents: {e}")
    import traceback
    STORAGE_ROUTER_AVAILABLE = False
    print(f"[ERROR] Failed to import storage router: {e}")
    import traceback
    traceback.print_exc()

try:
    from utils.llm_factory import LLMFactory
    FACTORY_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import LLM Factory: {e}")
    FACTORY_AVAILABLE = False

# Import file parser utility
try:
    from utils.file_parser import parse_uploaded_file
    FILE_PARSER_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import file parser: {e}")
    FILE_PARSER_AVAILABLE = False


# ============================================
# CUSTOM MODELS STORAGE (IN config/)
# ============================================
def load_custom_models_from_file():
    """Load custom models from JSON file in config directory"""
    if CUSTOM_MODELS_FILE.exists():
        try:
            with open(CUSTOM_MODELS_FILE, 'r') as f:
                data = json.load(f)
                logger.info(f"Loaded {len(data)} custom models from config/")
                return data
        except Exception as e:
            logger.error(f"Error loading custom models: {e}")
            return []
    logger.info("No custom models file found, starting fresh")
    return []


def save_custom_models_to_file(models: List[Dict]):
    """Save custom models to JSON file in config directory"""
    try:
        CONFIG_DIR.mkdir(exist_ok=True)
        logger.info(f"Attempting to save {len(models)} models to {CUSTOM_MODELS_FILE}")

        with open(CUSTOM_MODELS_FILE, 'w') as f:
            json.dump(models, f, indent=2)

        logger.info(f"Successfully saved {len(models)} models")

        if CUSTOM_MODELS_FILE.exists():
            file_size = CUSTOM_MODELS_FILE.stat().st_size
            logger.info(f"File size: {file_size} bytes")
            return True
        else:
            logger.error(f"File was not created: {CUSTOM_MODELS_FILE}")
            return False

    except Exception as e:
        logger.error(f"Error saving custom models: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


# ============================================
# LIFESPAN EVENTS
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    import socket

    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "localhost"

    logger.info("=" * 80)
    logger.info("ODRL Policy Generator API Starting v2.1.0")
    logger.info("=" * 80)
    logger.info(f"Local:    http://localhost:8000")
    logger.info(f"Network:  http://{local_ip}:8000")
    logger.info(f"API Docs: http://{local_ip}:8000/docs")
    logger.info(f"Config:   {CONFIG_DIR}")
    logger.info(f"Storage:  {CUSTOM_MODELS_FILE.name}")
    logger.info(f"Agents:   {'OK' if AGENTS_AVAILABLE else 'MISSING'}")
    logger.info(f"Factory:  {'OK' if FACTORY_AVAILABLE else 'MISSING'}")

    custom_models = load_custom_models_from_file()
    logger.info(f"Custom Models: {len(custom_models)} loaded")
    log_configuration()

    logger.info("=" * 80)
    logger.info("API Ready!")
    logger.info("=" * 80)

    yield

    logger.info("Shutting down ODRL API...")


# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(
    title="ODRL Policy Generator API",
    version="2.1.0",
    description="Multi-agent LLM system for ODRL policy generation with custom model support",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ============================================
# REQUEST MODELS
# ============================================
class ParseRequest(BaseModel):
    text: str
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None


class ReasonRequest(BaseModel):
    parsed_data: Dict[str, Any]
    original_text: str
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None


class GenerateRequest(BaseModel):
    parsed_data: dict
    original_text: str
    reasoning: Optional[dict] = None
    validation_errors: Optional[dict] = None
    previous_odrl: Optional[str] = None
    attempt_number: int = 1
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[dict] = None


class ValidateRequest(BaseModel):
    odrl_turtle: str
    original_text: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[dict] = None


class CustomModelRequest(BaseModel):
    name: str
    provider_type: str
    base_url: Optional[str] = None
    model_id: str
    api_key: Optional[str] = None
    context_length: Optional[int] = 4096
    temperature: Optional[float] = 0.3


# Global status tracker
status_queues = {}


@app.get("/api/agent-status/{session_id}")
async def agent_status_stream(session_id: str):
    """Stream agent status updates with keepalive"""
    queue = Queue()
    status_queues[session_id] = queue

    async def event_generator():
        try:
            yield f"data: {json.dumps({'status': 'connected', 'session_id': session_id})}\n\n"
            while True:
                try:
                    status = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(status)}\n\n"
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
                    continue
        except asyncio.CancelledError:
            logger.info(f"[SSE] Client disconnected: {session_id}")
            if session_id in status_queues:
                del status_queues[session_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


async def update_agent_status(session_id: str, agent: str, status: str, progress: int = 0):
    """Send status update to frontend"""
    if session_id in status_queues:
        await status_queues[session_id].put({
            "agent": agent,
            "status": status,
            "progress": progress,
            "timestamp": time.time()
        })


# ============================================
# BASIC ENDPOINTS
# ============================================
@app.get("/")
async def root():
    return {
        "name": "ODRL Policy Generator API",
        "version": "2.1.0",
        "status": "operational",
        "message": "API is running with config directory support!",
        "docs": "/docs",
        "config_location": str(CONFIG_DIR),
        "features": [
            "Multi-agent ODRL generation",
            "Custom LLM model support",
            "Ollama integration",
            "OpenAI-compatible endpoints",
            "Azure OpenAI custom model support",
            "Google GenAI support",
            "Persistent model storage in config/",
            "Cross-platform path handling"
        ]
    }


@app.get("/health")
async def health_check():
    custom_models = load_custom_models_from_file()
    return {
        "status": "healthy",
        "agents_available": AGENTS_AVAILABLE,
        "factory_available": FACTORY_AVAILABLE,
        "custom_models_count": len(custom_models),
        "storage_location": str(CUSTOM_MODELS_FILE),
        "config_directory": str(CONFIG_DIR),
        "timestamp": time.time()
    }


# ============================================================
# AVAILABLE PROVIDERS — Dynamic from .env + custom_models.json
# ============================================================
@app.get("/api/available-providers")
async def get_available_providers():
    """
    Get available LLM providers — fully dynamic.

    Sources:
      1. .env ENABLE_* flags -> built-in providers with known model catalogs
      2. config/custom_models.json -> user-added models from Settings UI
    """
    if not FACTORY_AVAILABLE:
        return {"providers": [], "error": "LLM Factory not available"}

    try:
        enabled = LLMFactory.get_available_providers()
        default_model = DEFAULT_MODEL

        PROVIDER_CATALOG = {
            "groq": {
                "name": "Groq Cloud (Free)",
                "models": [
                    {"value": "groq:llama-3.3-70b-versatile", "label": "Llama 3.3 70B"},
                    {"value": "groq:llama-3.1-8b-instant",    "label": "Llama 3.1 8B (Fast)"},
                    {"value": "groq:mixtral-8x7b-32768",      "label": "Mixtral 8x7B"},
                ]
            },
            "ollama": {
                "name": "Ollama / FITS",
                "models": [
                    {"value": "ollama:llama3.3:70b", "label": "Llama 3.3 70B"},
                    {"value": "ollama:llama3.1:70b", "label": "Llama 3.1 70B"},
                ]
            },
            "azure": {
                "name": "Azure OpenAI (FHGenie)",
                "models": [
                    {
                        "value": f"azure:{os.getenv('AZURE_LLM_MODEL', 'gpt-4o')}",
                        "label": f"{os.getenv('AZURE_LLM_MODEL', 'gpt-4o').upper()} (Azure)"
                    },
                ]
            },
            "openai": {
                "name": "OpenAI",
                "models": [
                    {"value": "openai:gpt-4",        "label": "GPT-4"},
                    {"value": "openai:gpt-4-turbo",   "label": "GPT-4 Turbo"},
                    {"value": "openai:gpt-3.5-turbo", "label": "GPT-3.5 Turbo"},
                ]
            },
            "anthropic": {
                "name": "Anthropic Claude",
                "models": [
                    {"value": "anthropic:claude-3-sonnet-20240229", "label": "Claude 3 Sonnet"},
                    {"value": "anthropic:claude-3-opus-20240229",   "label": "Claude 3 Opus"},
                ]
            },
        }

        provider_list = []
        for pid in enabled:
            if pid in PROVIDER_CATALOG:
                cat = PROVIDER_CATALOG[pid]
                provider_list.append({
                    "id": pid,
                    "name": cat["name"],
                    "models": cat["models"]
                })

        custom_models = load_custom_models_from_file()
        if custom_models:
            provider_list.append({
                "id": "custom",
                "name": "Custom Models",
                "models": custom_models
            })

        return {
            "providers": provider_list,
            "default_model": default_model
        }

    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        return {"providers": [], "error": str(e)}


# ============================================
# FILE UPLOAD ENDPOINT
# ============================================
@app.post("/api/parse-file")
async def parse_file(file: UploadFile = File(...)):
    if not FILE_PARSER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="File parser not available. Install: pip install pypdf python-docx"
        )

    logger.info(f"File upload: {file.filename} (Content-Type: {file.content_type})")

    try:
        result = await parse_uploaded_file(file)
        logger.info(f"Parsed successfully: {result['characters']} characters")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ============================================
# CUSTOM MODELS ENDPOINTS
# ============================================
@app.get("/api/custom-models")
async def get_custom_models():
    try:
        models = load_custom_models_from_file()
        logger.info(f"Returning {len(models)} custom models")
        return {
            "models": models,
            "count": len(models),
            "source": "config/custom_models.json",
            "storage_path": str(CUSTOM_MODELS_FILE)
        }
    except Exception as e:
        logger.error(f"Error getting custom models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/custom-models")
async def add_custom_model(model: CustomModelRequest):
    try:
        logger.info(f"Received custom model request: {model.name}")
        models = load_custom_models_from_file()

        value = f"custom:{model.model_id}"
        logger.info(f"Model value key: {value}")

        new_model = {
            "value": value,
            "label": model.name,
            "provider_type": model.provider_type,
            "base_url": model.base_url,
            "model_id": model.model_id,
            "api_key": model.api_key,
            "context_length": model.context_length or 4096,
            "temperature_default": model.temperature or 0.3,
            "created_at": time.time(),
            "updated_at": time.time()
        }

        existing_idx = next(
            (i for i, m in enumerate(models) if m['value'] == new_model['value']),
            None
        )

        if existing_idx is not None:
            models[existing_idx] = {**models[existing_idx], **new_model, "updated_at": time.time()}
            action = "updated"
            logger.info(f"Updating existing model at index {existing_idx}")
        else:
            models.append(new_model)
            action = "added"
            logger.info(f"Adding new model (total will be {len(models)})")

        if save_custom_models_to_file(models):
            logger.info(f"Custom model {action}: {model.name}")
            return {
                "success": True,
                "action": action,
                "model": new_model,
                "total_models": len(models)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save model")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding custom model: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/custom-models/{model_value}")
async def delete_custom_model(model_value: str):
    try:
        model_value = unquote(model_value)

        if ":" in model_value:
            parts = model_value.split(":")
            model_id = ":".join(parts[1:])
            model_value = f"custom:{model_id}"

        models = load_custom_models_from_file()
        original_count = len(models)
        models = [m for m in models if m['value'] != model_value]

        if len(models) == original_count:
            raise HTTPException(status_code=404, detail="Model not found")

        if save_custom_models_to_file(models):
            logger.info(f"Deleted: {model_value}")
            return {"success": True, "remaining_models": len(models)}
        else:
            raise HTTPException(status_code=500, detail="Failed to save")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/custom-models/export")
async def export_custom_models():
    try:
        models = load_custom_models_from_file()
        return {
            "models": models,
            "count": len(models),
            "exported_at": time.time(),
            "version": "1.0"
        }
    except Exception as e:
        logger.error(f"Error exporting custom models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/custom-models/import")
async def import_custom_models(data: Dict[str, Any]):
    try:
        imported_models = data.get("models", [])
        if not imported_models:
            raise HTTPException(status_code=400, detail="No models provided")

        existing_models = load_custom_models_from_file()
        added = 0
        updated = 0

        for imported in imported_models:
            existing_idx = next(
                (i for i, m in enumerate(existing_models) if m['value'] == imported['value']),
                None
            )
            if existing_idx is not None:
                existing_models[existing_idx] = {**imported, "updated_at": time.time()}
                updated += 1
            else:
                existing_models.append({**imported, "created_at": time.time(), "updated_at": time.time()})
                added += 1

        if save_custom_models_to_file(existing_models):
            logger.info(f"Imported models: {added} added, {updated} updated")
            return {"success": True, "added": added, "updated": updated, "total": len(existing_models)}
        else:
            raise HTTPException(status_code=500, detail="Failed to save imported models")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing custom models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# AGENT ENDPOINTS
# ============================================
@app.post("/api/parse")
async def parse_text(request: Request, data: ParseRequest):
    """Agent 1: Parse text with disconnect detection"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")

    if await request.is_disconnected():
        logger.warning("Client disconnected before parsing started")
        return JSONResponse(status_code=499, content={"detail": "Request cancelled by client"})

    logger.info(f"Parse request: model={data.model}")
    start = time.time()
    session_id = request.headers.get("X-Session-ID", "default")
    await update_agent_status(session_id, "parser", "active", 10)

    try:
        if data.custom_model:
            logger.info(
                f"Using custom model: "
                f"{data.custom_model.get('provider_type')} - "
                f"{data.custom_model.get('model_id')}"
            )
            parser = TextParser(
                model=data.model,
                temperature=data.temperature,
                custom_config=data.custom_model
            )
        else:
            parser = TextParser(model=data.model, temperature=data.temperature)

        result = await run_with_disconnect_check(parser.parse, request, data.text)

        if result is None:
            logger.warning("Parsing cancelled by client")
            await update_agent_status(session_id, "parser", "cancelled", 0)
            return JSONResponse(status_code=499, content={"detail": "Request cancelled by client"})

        elapsed_ms = int((time.time() - start) * 1000)
        result["processing_time_ms"] = elapsed_ms
        result["model_used"] = data.model or DEFAULT_MODEL

        logger.info(f"Parse complete: {elapsed_ms}ms")
        await update_agent_status(session_id, "parser", "done", 100)
        return result

    except Exception as e:
        logger.error(f"Parse error: {e}")
        await update_agent_status(session_id, "parser", "error", 0)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reason")
async def reason(request: Request, data: ReasonRequest):
    """Agent 2: Reason with disconnect detection"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")

    if await request.is_disconnected():
        logger.warning("Client disconnected before reasoning")
        return JSONResponse(status_code=499, content={"detail": "Request cancelled"})

    logger.info(f"Reason request: model={data.model}")
    start = time.time()

    try:
        if data.custom_model:
            reasoner = Reasoner(
                model=data.model,
                temperature=data.temperature,
                custom_config=data.custom_model
            )
        else:
            reasoner = Reasoner(model=data.model, temperature=data.temperature)

        result = await run_with_disconnect_check(
            reasoner.reason, request, data.parsed_data, data.original_text
        )

        if result is None:
            return JSONResponse(status_code=499, content={"detail": "Request cancelled"})

        elapsed_ms = int((time.time() - start) * 1000)
        result['processing_time_ms'] = elapsed_ms
        result['model_used'] = data.model or DEFAULT_MODEL

        logger.info(f"Reason complete: {elapsed_ms}ms")
        return result

    except Exception as e:
        logger.error(f"Reason error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate_odrl(request: GenerateRequest):
    """Generate ODRL policy in Turtle format"""
    start_time = time.time()
    try:
        logger.info(f"Generate request: model={request.model}")
        logger.info(f"   Attempt #{request.attempt_number}")
        if request.validation_errors:
            logger.info(f"   Fixing {len(request.validation_errors.get('issues', []))} SHACL issues")
        
        if not AGENTS_AVAILABLE:
            raise HTTPException(status_code=503, detail="Agents not available")
        
        generator = Generator(
            model=request.model,
            temperature=request.temperature,
            custom_config=request.custom_model
        )
        
        result = generator.generate(
            parsed_data=request.parsed_data,
            original_text=request.original_text,
            reasoning=request.reasoning,
            validation_errors=request.validation_errors,
            previous_odrl=request.previous_odrl,
            attempt_number=request.attempt_number
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        #  LOG WHAT WE GOT FROM GENERATOR
        logger.info(f"Generate complete: {processing_time}ms")
        logger.info(f"   Has odrl_turtle: {bool(result.get('odrl_turtle'))}")
        logger.info(f"   Has odrl_policy: {bool(result.get('odrl_policy'))}")
        logger.info(f"   Generator result keys: {list(result.keys())}")
        
        #  FIXED: Return BOTH formats
        response = {
            "odrl_turtle": result.get('odrl_turtle'),
            "odrl_policy": result.get('odrl_policy'),  #  ADD THIS!
            "format": "turtle",
            "processing_time_ms": processing_time,
            "model_used": request.model or "default",
            "attempt_number": result.get('attempt_number', 1),
            "context": {
                "parsed_data": request.parsed_data,
                "original_text": request.original_text,
                "reasoning": request.reasoning
            }
        }
        
        #  VALIDATE BEFORE RETURNING
        if not response.get('odrl_turtle'):
            logger.error("❌ Generator did not produce odrl_turtle!")
            raise HTTPException(
                status_code=500, 
                detail="Generator failed to produce ODRL Turtle format"
            )
        
        logger.info(" Returning generator response with both formats")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Generate error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/validate")
async def validate_odrl(request: ValidateRequest):
    """Validate ODRL Turtle with SHACL"""
    start_time = time.time()

    try:
        log_request("Validate", request.model)

        if not AGENTS_AVAILABLE:
            raise HTTPException(status_code=503, detail="Agents not available")

        validator = Validator(
            model=request.model,
            temperature=request.temperature,
            custom_config=request.custom_model
        )

        result = validator.validate(
            odrl_turtle=request.odrl_turtle,
            original_text=request.original_text
        )

        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Validate complete: {processing_time}ms")

        return {
            **result,
            "processing_time_ms": processing_time,
            "model_used": request.model or "default"
        }

    except Exception as e:
        logger.error(f"Validate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include storage router
if STORAGE_ROUTER_AVAILABLE:
    app.include_router(storage_router)


@app.get("/api/debug/config")
async def debug_config():
    """Debug endpoint to check config directory"""
    try:
        return {
            "config_dir": str(CONFIG_DIR),
            "config_dir_exists": CONFIG_DIR.exists(),
            "custom_models_file": str(CUSTOM_MODELS_FILE),
            "custom_models_file_exists": CUSTOM_MODELS_FILE.exists(),
            "custom_models_file_size": CUSTOM_MODELS_FILE.stat().st_size if CUSTOM_MODELS_FILE.exists() else 0,
            "models_in_file": len(load_custom_models_from_file()),
            "config_dir_contents": [str(f) for f in CONFIG_DIR.iterdir()] if CONFIG_DIR.exists() else []
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/debug/test-azure")
async def debug_test_azure():
    """
    Debug: test Azure OpenAI connectivity via both built-in and custom paths.
    Hit http://localhost:8000/api/debug/test-azure in your browser.
    """
    results = {}

    # 1. Test built-in azure provider (reads from .env)
    if FACTORY_AVAILABLE:
        try:
            llm = LLMFactory.create_llm(
                model="azure:gpt-4o",
                max_retries=1,
                enable_fallback=False
            )
            response = llm.invoke("Say 'hello' and nothing else.")
            results["builtin_azure"] = {
                "status": "OK",
                "response": str(response.content)[:100],
                "endpoint": os.getenv("AZURE_ENDPOINT"),
                "deployment": os.getenv("AZURE_LLM_DEPLOYMENT"),
            }
        except Exception as e:
            results["builtin_azure"] = {"status": "FAILED", "error": str(e)[:300]}

        # 2. Test custom azure-openai path (reads from custom_models.json)
        custom_models = load_custom_models_from_file()
        azure_custom = next(
            (m for m in custom_models if m.get("provider_type") == "azure-openai"),
            None
        )
        if azure_custom:
            try:
                llm = LLMFactory.create_llm(
                    model=azure_custom["value"],
                    custom_config=azure_custom,
                    max_retries=1,
                    enable_fallback=False
                )
                response = llm.invoke("Say 'hello' and nothing else.")
                results["custom_azure"] = {
                    "status": "OK",
                    "response": str(response.content)[:100],
                    "config_used": {
                        "endpoint": azure_custom.get("base_url"),
                        "deployment": azure_custom.get("azure_deployment"),
                        "model_id": azure_custom.get("model_id"),
                    }
                }
            except Exception as e:
                results["custom_azure"] = {
                    "status": "FAILED",
                    "error": str(e)[:300],
                    "config_used": {
                        "endpoint": azure_custom.get("base_url"),
                        "deployment": azure_custom.get("azure_deployment"),
                        "model_id": azure_custom.get("model_id"),
                    }
                }
        else:
            results["custom_azure"] = {"status": "SKIPPED", "reason": "No azure-openai model in custom_models.json"}
    else:
        results["error"] = "LLMFactory not available"

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)