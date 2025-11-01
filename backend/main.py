"""
ODRL Policy Generator API - Production Ready with Custom Models Storage
UPDATED: Now uses config directory for settings and custom_models.json
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import sys
import os
import time
import json
import logging
from fastapi import UploadFile, File

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

# Import agents
try:
    from agents.text_parser.parser import TextParser
    from agents.reasoner.reasoner import Reasoner
    from agents.generator.generator import Generator
    from agents.validator.validator import SHACLValidator
    AGENTS_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import agents: {e}")
    AGENTS_AVAILABLE = False

# Import LLM Factory
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
# CUSTOM MODELS STORAGE (NOW IN config/)
# ============================================

def load_custom_models_from_file():
    """Load custom models from JSON file in config directory"""
    if CUSTOM_MODELS_FILE.exists():
        try:
            with open(CUSTOM_MODELS_FILE, 'r') as f:
                data = json.load(f)
                logger.info(f"📦 Loaded {len(data)} custom models from config/")
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
        
        with open(CUSTOM_MODELS_FILE, 'w') as f:
            json.dump(models, f, indent=2)
        logger.info(f"💾 Saved {len(models)} custom models to {CUSTOM_MODELS_FILE.name}")
        return True
    except Exception as e:
        logger.error(f"Error saving custom models: {e}")
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
    parsed_data: Dict[str, Any]  #
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None

class GenerateRequest(BaseModel):
    reasoning_result: Dict[str, Any]  
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None

class ValidateRequest(BaseModel):
    odrl_policy: Dict[str, Any]  # 
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None

class CustomModelRequest(BaseModel):
    name: str
    provider_type: str  # "ollama", "openai-compatible", "google-genai", "custom"
    base_url: Optional[str] = None
    model_id: str
    api_key: Optional[str] = None
    context_length: Optional[int] = 4096
    temperature_default: Optional[float] = 0.3

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
                    {"value": "groq:llama-3.1-70b-versatile", "label": "Llama 3.1 70B"}
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
    Extract text from uploaded files (.txt, .pdf, .docx, .md)
    
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
    
    logger.info(f"📁 File upload: {file.filename} (Content-Type: {file.content_type})")
    
    try:
        result = await parse_uploaded_file(file)
        
        logger.info(f"✅ Parsed successfully: {result['characters']} characters")
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}", exc_info=True)
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
        # Load existing models
        models = load_custom_models_from_file()
        
        # Create value based on provider type
        if model.provider_type == "google-genai":
            value = f"{model.provider_type}:{model.model_id}"
        else:
            value = f"{model.provider_type}:{model.model_id}"
        
        # Create new model entry
        new_model = {
            "value": value,
            "label": model.name,
            "provider_type": model.provider_type,
            "base_url": model.base_url,
            "model_id": model.model_id,
            "api_key": model.api_key,
            "context_length": model.context_length or 4096,
            "temperature_default": model.temperature_default or 0.3,
            "created_at": time.time(),
            "updated_at": time.time()
        }
        
        # Check if model already exists (update instead of duplicate)
        existing_idx = next((i for i, m in enumerate(models) if m['value'] == new_model['value']), None)
        
        if existing_idx is not None:
            # Update existing model
            models[existing_idx] = {**models[existing_idx], **new_model, "updated_at": time.time()}
            action = "updated"
        else:
            # Add new model
            models.append(new_model)
            action = "added"
        
        # Save to file
        if save_custom_models_to_file(models):
            logger.info(f"✅ Custom model {action}: {model.name}")
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
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/custom-models/{model_value}")
async def delete_custom_model(model_value: str):
    """Delete a custom model"""
    try:
        # Load existing models
        models = load_custom_models_from_file()
        
        # Find and remove the model
        original_count = len(models)
        models = [m for m in models if m['value'] != model_value]
        
        if len(models) == original_count:
            raise HTTPException(status_code=404, detail=f"Model {model_value} not found")
        
        # Save updated list
        if save_custom_models_to_file(models):
            logger.info(f"🗑️  Deleted custom model: {model_value}")
            return {
                "success": True,
                "message": "Model deleted successfully",
                "remaining_models": len(models)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save changes")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting custom model: {e}")
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
            logger.info(f"📥 Imported models: {added} added, {updated} updated")
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
# AGENT ENDPOINTS - ✅ VERIFIED CORRECT
# ============================================

@app.post("/api/parse")
async def parse_text(request: ParseRequest):
    """Agent 1: Parse text - Extract entities from natural language"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")
    
    logger.info(f"📝 Parse request: model={request.model}")
    start = time.time()
    
    try:
        # Handle custom model
        if request.custom_model:
            logger.info(f"🔧 Using custom model: {request.custom_model.get('provider_type')} - {request.custom_model.get('model_id')}")
            parser = TextParser(
                model=request.model,
                temperature=request.temperature,
                custom_config=request.custom_model
            )
        else:
            parser = TextParser(model=request.model, temperature=request.temperature)
        
        result = parser.parse(request.text)
        
        elapsed_ms = int((time.time() - start) * 1000)
        result['processing_time_ms'] = elapsed_ms
        result['model_used'] = request.model or DEFAULT_MODEL
        
        logger.info(f"Parse complete: {elapsed_ms}ms")
        return result
        
    except Exception as e:
        logger.error(f"❌ Parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reason")
async def reason(request: ReasonRequest):
    """Agent 2: Reason - Analyze parsed data and determine ODRL structure"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")
    
    logger.info(f"🧠 Reason request: model={request.model}")
    start = time.time()
    
    try:
        # Handle custom model
        if request.custom_model:
            logger.info(f"🔧 Using custom model: {request.custom_model.get('provider_type')} - {request.custom_model.get('model_id')}")
            reasoner = Reasoner(
                model=request.model,
                temperature=request.temperature,
                custom_config=request.custom_model
            )
        else:
            reasoner = Reasoner(model=request.model, temperature=request.temperature)
        
        # ✅ Pass the entire parsed_data object
        result = reasoner.reason(request.parsed_data)
        
        elapsed_ms = int((time.time() - start) * 1000)
        result['processing_time_ms'] = elapsed_ms
        result['model_used'] = request.model or DEFAULT_MODEL
        
        logger.info(f"✅ Reason complete: {elapsed_ms}ms")
        return result
        
    except Exception as e:
        logger.error(f"❌ Reason error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate_odrl(request: GenerateRequest):
    """Agent 3: Generate - Create ODRL JSON-LD policy"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")
    
    logger.info(f"⚙️  Generate request: model={request.model}")
    start = time.time()
    
    try:
        # Handle custom model
        if request.custom_model:
            logger.info(f"🔧 Using custom model: {request.custom_model.get('provider_type')} - {request.custom_model.get('model_id')}")
            generator = Generator(
                model=request.model,
                temperature=request.temperature,
                custom_config=request.custom_model
            )
        else:
            generator = Generator(model=request.model, temperature=request.temperature)
        
        # ✅ Pass the entire reasoning_result object
        odrl_policy = generator.generate(request.reasoning_result)
        
        elapsed_ms = int((time.time() - start) * 1000)
        
        logger.info(f"✅ Generate complete: {elapsed_ms}ms")
        return {
            'odrl_policy': odrl_policy,  # ✅ Returns as odrl_policy
            'processing_time_ms': elapsed_ms,
            'model_used': request.model or DEFAULT_MODEL
        }
        
    except Exception as e:
        logger.error(f"❌ Generate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/validate")
async def validate_odrl(request: ValidateRequest):
    """Agent 4: Validate - Check ODRL policy compliance"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Agents not available")
    
    logger.info(f"🛡️  Validate request: model={request.model}")
    start = time.time()
    
    try:
        # Handle custom model
        if request.custom_model:
            logger.info(f"🔧 Using custom model: {request.custom_model.get('provider_type')} - {request.custom_model.get('model_id')}")
            validator = SHACLValidator(
                model=request.model,
                temperature=request.temperature,
                custom_config=request.custom_model
            )
        else:
            validator = SHACLValidator(model=request.model, temperature=request.temperature)
        
        result = validator.validate(request.odrl_policy)
        
        elapsed_ms = int((time.time() - start) * 1000)
        result['processing_time_ms'] = elapsed_ms
        result['model_used'] = request.model or DEFAULT_MODEL
        
        logger.info(f"✅ Validate complete: {elapsed_ms}ms - Valid: {result.get('is_valid', False)}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Validate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 80)
    logger.info("🚀 ODRL Policy Generator API Starting v2.1.0")
    logger.info("=" * 80)
    logger.info(f"📍 API: http://localhost:8000")
    logger.info(f"📚 Docs: http://localhost:8000/docs")
    logger.info(f"📁 Config: {CONFIG_DIR}")
    logger.info(f"💾 Models Storage: {CUSTOM_MODELS_FILE.name}")
    logger.info(f"🤖 Agents: {AGENTS_AVAILABLE}")
    logger.info(f"🏭 Factory: {FACTORY_AVAILABLE}")
    
    # Load custom models
    custom_models = load_custom_models_from_file()
    logger.info(f"📦 Custom Models: {len(custom_models)} loaded")
    
    # Log configuration
    log_configuration()
    
    logger.info("=" * 80)
    logger.info("✅ API Ready!")
    logger.info("=" * 80)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)