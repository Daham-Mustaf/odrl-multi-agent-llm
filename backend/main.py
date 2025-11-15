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

# Add this import
from utils.request_utils import run_with_disconnect_check
from utils.rdf_converter import jsonld_to_turtle   
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
    
except ImportError as e:
    AGENTS_AVAILABLE = False
    print(f"[ERROR] Failed to import agents: {e}")
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
        # Ensure config directory exists
        CONFIG_DIR.mkdir(exist_ok=True)
        
        logger.info(f"Attempting to save {len(models)} models to {CUSTOM_MODELS_FILE}")
        
        # Write to file
        with open(CUSTOM_MODELS_FILE, 'w') as f:
            json.dump(models, f, indent=2)
        
        logger.info(f"Successfully saved {len(models)} models")
        
        # Verify the file was written
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
# FASTAPI APP
# ============================================

app = FastAPI(
    title="ODRL Policy Generator API",
    version="2.1.0",
    description="Multi-agent LLM system for ODRL policy generation with custom model support"
)

# CORS (now using config)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    # Required for first generation
    parsed_data: dict
    original_text: str
    
    # Optional for first generation
    reasoning: Optional[dict] = None
    
    # Required for regeneration
    validation_errors: Optional[dict] = None
    previous_odrl: Optional[str] = None
    attempt_number: int = 1
    
    # Model config
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_config: Optional[dict] = None

class ValidateRequest(BaseModel):
    odrl_turtle: str  # accepts Turtle string
    original_text: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_config: Optional[dict] = None

class CustomModelRequest(BaseModel):
    name: str
    provider_type: str
    base_url: Optional[str] = None
    model_id: str
    api_key: Optional[str] = None
    context_length: Optional[int] = 4096
    temperature: Optional[float] = 0.3 

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

@app.get("/api/available-providers")
async def get_available_providers():
    """Get available LLM providers"""
    if not FACTORY_AVAILABLE:
        return {"providers": [], "error": "LLM Factory not available"}
    
    try:
        providers = LLMFactory.get_available_providers()
        default_model = DEFAULT_MODEL
        
        # Return basic provider info
        provider_list = []
        if "groq" in providers:
            provider_list.append({
                "id": "groq",
                "name": "Groq Cloud",
                "models": [
                    {"value": "groq:llama-3.3-70b-versatile", "label": "Llama 3.1 70B"}
                ]
            })
        
        if "ollama" in providers:
            provider_list.append({
                "id": "ollama",
                "name": "Ollama/FITS",
                "models": [
                    {"value": "ollama:llama3.3:70b", "label": "Llama 3.3 70B"}
                ]
            })
        
        # Add custom models to the provider list
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
    """
    Extract text from uploaded files (.txt , .docx, .md)
    
    Returns:
        - text: Extracted text content
        - filename: Original filename
        - size: File size in bytes
        - characters: Character count
        - file_type: File extension
    """
    
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
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )

# ============================================
# CUSTOM MODELS ENDPOINTS
# ============================================

@app.get("/api/custom-models")
async def get_custom_models():
    """Get all custom models from server storage"""
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
    """Add or update a custom model"""
    try:
        logger.info(f"📥 Received custom model request: {model.name}")
        
        # Load existing models
        models = load_custom_models_from_file()
        
        # Create unique value key
        # value = f"{model.provider_type}:{model.model_id}"
        value = f"custom:{model.model_id}"
        
        logger.info(f"Model value key: {value}")
        
        # Create new model entry
        new_model = {
            "value": value,
            "label": model.name,
            "provider_type": model.provider_type,
            "base_url": model.base_url,
            "model_id": model.model_id,
            "api_key": model.api_key,
            "context_length": model.context_length or 4096,
            "temperature_default": model.temperature or 0.3,  # Store as temperature_default for consistency
            "created_at": time.time(),
            "updated_at": time.time()
        }
        
        # Check if model already exists
        existing_idx = next(
            (i for i, m in enumerate(models) if m['value'] == new_model['value']), 
            None
        )
        
        if existing_idx is not None:
            # Update existing model
            models[existing_idx] = {
                **models[existing_idx], 
                **new_model, 
                "updated_at": time.time()
            }
            action = "updated"
            logger.info(f"Updating existing model at index {existing_idx}")
        else:
            # Add new model
            models.append(new_model)
            action = "added"
            logger.info(f"Adding new model (total will be {len(models)})")
        
        # Save to file
        if save_custom_models_to_file(models):
            logger.info(f"Custom model {action}: {model.name}")
            logger.info(f"Saved to: {CUSTOM_MODELS_FILE}")
            
            return {
                "success": True,
                "action": action,
                "model": new_model,
                "total_models": len(models)
            }
        else:
            logger.error(f"Failed to save models to file")
            raise HTTPException(status_code=500, detail="Failed to save model")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f" Error adding custom model: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/api/custom-models/{model_value}")
async def delete_custom_model(model_value: str):
    """Delete a custom model - accepts both 'custom:' and 'provider:' formats"""
    try:
        model_value = unquote(model_value)
        
        # Normalize to custom: format
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
            logger.info(f" Deleted: {model_value}")
            return {"success": True, "remaining_models": len(models)}
        else:
            raise HTTPException(status_code=500, detail="Failed to save")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/custom-models/export")
async def export_custom_models():
    """Export all custom models as JSON"""
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
    """Import custom models from JSON"""
    try:
        imported_models = data.get("models", [])
        if not imported_models:
            raise HTTPException(status_code=400, detail="No models provided")
        
        # Load existing models
        existing_models = load_custom_models_from_file()
        
        # Merge (update existing or add new)
        added = 0
        updated = 0
        
        for imported in imported_models:
            existing_idx = next((i for i, m in enumerate(existing_models) if m['value'] == imported['value']), None)
            
            if existing_idx is not None:
                existing_models[existing_idx] = {**imported, "updated_at": time.time()}
                updated += 1
            else:
                existing_models.append({**imported, "created_at": time.time(), "updated_at": time.time()})
                added += 1
        
        # Save to file
        if save_custom_models_to_file(existing_models):
            logger.info(f"Imported models: {added} added, {updated} updated")
            return {
                "success": True,
                "added": added,
                "updated": updated,
                "total": len(existing_models)
            }
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
        return JSONResponse(
            status_code=499,  # Client Closed Request
            content={"detail": "Request cancelled by client"}
        )
    
    logger.info(f"Parse request: model={data.model}")
    start = time.time()
    
    try:
        # Create parser
        if data.custom_model:
            logger.info(f"Using custom model: {data.custom_model.get('provider_type')} - {data.custom_model.get('model_id')}")
            parser = TextParser(
                model=data.model,
                temperature=data.temperature,
                custom_config=data.custom_model
            )
        else:
            parser = TextParser(model=data.model, temperature=data.temperature)
        
        result = await run_with_disconnect_check(
            parser.parse,
            request,
            data.text
        )
        
        if result is None:
            logger.warning("Parsing cancelled by client")
            return JSONResponse(
                status_code=499,
                content={"detail": "Request cancelled by client"}
            )
        
        elapsed_ms = int((time.time() - start) * 1000)
        result['processing_time_ms'] = elapsed_ms
        result['model_used'] = data.model or DEFAULT_MODEL
        
        logger.info(f"Parse complete: {elapsed_ms}ms")
        return result
        
    except Exception as e:
        logger.error(f"Parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reason")
async def reason(request: Request, data: ReasonRequest): 
    """Agent 2: Reason with disconnect detection - Pure analysis, no data modification"""
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
            reasoner.reason,
            request,
            data.parsed_data,      
            data.original_text     
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
        
        # Create generator with model config
        generator = Generator(
            model=request.model,
            temperature=request.temperature,
            custom_config=request.custom_config
        )
        
        # Generate ODRL Turtle
        result = generator.generate(
            parsed_data=request.parsed_data,
            original_text=request.original_text,
            reasoning=request.reasoning,
            validation_errors=request.validation_errors,
            previous_odrl=request.previous_odrl,
            attempt_number=request.attempt_number
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Generate complete: {processing_time}ms")
        
        return {
            "odrl_turtle": result['odrl_turtle'],
            "format": "turtle",
            "processing_time_ms": processing_time,
            "model_used": request.model or "default",
            "attempt_number": result.get('attempt_number', 1),
            # Return context for next regeneration
            "context": {
                "parsed_data": request.parsed_data,
                "original_text": request.original_text,
                "reasoning": request.reasoning
            }
        }
        
    except Exception as e:
        logger.error(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate")
async def validate_odrl(request: ValidateRequest):
    """Validate ODRL Turtle with SHACL"""
    start_time = time.time()
    
    try:
        log_request("Validate", request.model)
        
        if not AGENTS_AVAILABLE:
            raise HTTPException(status_code=503, detail="Agents not available")
        
        # Create validator
        validator = Validator(
            model=request.model,
            temperature=request.temperature,
            custom_config=request.custom_config
        )
        
        # Validate Turtle directly
        result = validator.validate(
            odrl_turtle=request.odrl_turtle,  # Now accepts Turtle string
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
    

# Add this debug endpoint temporarily

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


# ============================================
# STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 80)
    logger.info("ODRL Policy Generator API Starting v2.1.0")
    logger.info("=" * 80)
    logger.info(f"API: http://localhost:8000")
    logger.info(f"Docs: http://localhost:8000/docs")
    logger.info(f"Config: {CONFIG_DIR}")
    logger.info(f"Models Storage: {CUSTOM_MODELS_FILE.name}")
    logger.info(f"Agents: {AGENTS_AVAILABLE}")
    logger.info(f"Factory: {FACTORY_AVAILABLE}")
    
    # Load custom models
    custom_models = load_custom_models_from_file()
    logger.info(f"Custom Models: {len(custom_models)} loaded")
    
    # Log configuration
    log_configuration()
    
    logger.info("=" * 80)
    logger.info("API Ready!")
    logger.info("=" * 80)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)