# """
# ODRL Policy Generator API - Production Ready
# """

# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import Dict, Any, Optional, List
# import sys
# import os
# import time
# import logging
# from dotenv import load_dotenv

# # Load environment
# load_dotenv()

# # Setup logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
# logger = logging.getLogger(__name__)

# # Add to path
# sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# # Import agents
# try:
#     from agents.text_parser.parser import TextParser
#     from agents.reasoner.reasoner import Reasoner
#     from agents.generator.generator import Generator
#     from agents.validator.validator import SHACLValidator
#     AGENTS_AVAILABLE = True
# except ImportError as e:
#     logger.error(f"Failed to import agents: {e}")
#     AGENTS_AVAILABLE = False

# # Import LLM Factory
# try:
#     from utils.llm_factory import LLMFactory
#     FACTORY_AVAILABLE = True
# except ImportError as e:
#     logger.error(f"Failed to import LLM Factory: {e}")
#     FACTORY_AVAILABLE = False

# # ============================================
# # FASTAPI APP
# # ============================================

# app = FastAPI(
#     title="ODRL Policy Generator API",
#     version="2.0.0",
#     description="Multi-agent LLM system for ODRL policy generation"
# )

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ============================================
# # REQUEST MODELS
# # ============================================

# class ParseRequest(BaseModel):
#     text: str
#     model: Optional[str] = None
#     temperature: Optional[float] = None

# class ReasonRequest(BaseModel):
#     parsed_data: Dict[str, Any]
#     model: Optional[str] = None
#     temperature: Optional[float] = None

# class GenerateRequest(BaseModel):
#     reasoning_result: Dict[str, Any]
#     model: Optional[str] = None
#     temperature: Optional[float] = None

# class ValidateRequest(BaseModel):
#     odrl_policy: Dict[str, Any]
#     model: Optional[str] = None
#     temperature: Optional[float] = None

# # ============================================
# # BASIC ENDPOINTS
# # ============================================

# @app.get("/")
# async def root():
#     return {
#         "name": "ODRL Policy Generator API",
#         "version": "2.0.0",
#         "status": "operational",
#         "message": "API is running!",
#         "docs": "/docs"
#     }

# @app.get("/health")
# async def health_check():
#     return {
#         "status": "healthy",
#         "agents_available": AGENTS_AVAILABLE,
#         "factory_available": FACTORY_AVAILABLE
#     }

# @app.get("/api/available-providers")
# async def get_available_providers():
#     """Get available LLM providers"""
#     if not FACTORY_AVAILABLE:
#         return {"providers": [], "error": "LLM Factory not available"}
    
#     try:
#         providers = LLMFactory.get_available_providers()
#         default_model = os.getenv("DEFAULT_MODEL", "groq:llama-3.3-70b-versatile")
        
#         # Return basic provider info
#         provider_list = []
#         if "groq" in providers:
#             provider_list.append({
#                 "id": "groq",
#                 "name": "Groq Cloud",
#                 "models": [
#                     {"value": "groq:llama-3.3-70b-versatile", "label": "Llama 3.1 70B"}
#                 ]
#             })
        
#         if "ollama" in providers:
#             provider_list.append({
#                 "id": "ollama",
#                 "name": "Ollama/FITS",
#                 "models": [
#                     {"value": "ollama:llama3.3:70b", "label": "Llama 3.3 70B"}
#                 ]
#             })
        
#         return {
#             "providers": provider_list,
#             "default_model": default_model
#         }
#     except Exception as e:
#         logger.error(f"Error getting providers: {e}")
#         return {"providers": [], "error": str(e)}

# @app.post("/api/parse")
# async def parse_text(request: ParseRequest):
#     """Agent 1: Parse text"""
#     if not AGENTS_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Agents not available")
    
#     logger.info(f"Parse request: model={request.model}")
#     start = time.time()
    
#     try:
#         parser = TextParser(model=request.model, temperature=request.temperature)
#         result = parser.parse(request.text)
        
#         elapsed_ms = int((time.time() - start) * 1000)
#         result['processing_time_ms'] = elapsed_ms
#         result['model_used'] = request.model or os.getenv("DEFAULT_MODEL")
        
#         return result
#     except Exception as e:
#         logger.error(f"Parse error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/reason")
# async def reason(request: ReasonRequest):
#     """Agent 2: Reason"""
#     if not AGENTS_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Agents not available")
    
#     logger.info(f"Reason request: model={request.model}")
#     start = time.time()
    
#     try:
#         reasoner = Reasoner(model=request.model, temperature=request.temperature)
#         result = reasoner.reason(request.parsed_data)
        
#         elapsed_ms = int((time.time() - start) * 1000)
#         result['processing_time_ms'] = elapsed_ms
#         result['model_used'] = request.model or os.getenv("DEFAULT_MODEL")
        
#         return result
#     except Exception as e:
#         logger.error(f"Reason error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/generate")
# async def generate_odrl(request: GenerateRequest):
#     """Agent 3: Generate ODRL"""
#     if not AGENTS_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Agents not available")
    
#     logger.info(f"Generate request: model={request.model}")
#     start = time.time()
    
#     try:
#         generator = Generator(model=request.model, temperature=request.temperature)
#         odrl_policy = generator.generate(request.reasoning_result)
        
#         elapsed_ms = int((time.time() - start) * 1000)
        
#         return {
#             'odrl_policy': odrl_policy,
#             'processing_time_ms': elapsed_ms,
#             'model_used': request.model or os.getenv("DEFAULT_MODEL")
#         }
#     except Exception as e:
#         logger.error(f"Generate error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/validate")
# async def validate_odrl(request: ValidateRequest):
#     """Agent 4: Validate ODRL"""
#     if not AGENTS_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Agents not available")
    
#     logger.info(f"Validate request: model={request.model}")
#     start = time.time()
    
#     try:
#         validator = SHACLValidator(model=request.model, temperature=request.temperature)
#         result = validator.validate(request.odrl_policy)
        
#         elapsed_ms = int((time.time() - start) * 1000)
#         result['processing_time_ms'] = elapsed_ms
#         result['model_used'] = request.model or os.getenv("DEFAULT_MODEL")
        
#         return result
#     except Exception as e:
#         logger.error(f"Validate error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# # ============================================
# # STARTUP
# # ============================================

# @app.on_event("startup")
# async def startup_event():
#     logger.info("=" * 60)
#     logger.info("🚀 ODRL Policy Generator API Starting")
#     logger.info("=" * 60)
#     logger.info(f"📍 API: http://localhost:8000")
#     logger.info(f"📚 Docs: http://localhost:8000/docs")
#     logger.info(f"✅ Agents: {AGENTS_AVAILABLE}")
#     logger.info(f"✅ Factory: {FACTORY_AVAILABLE}")
#     logger.info("=" * 60)

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)