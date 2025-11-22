# backend/api/storage_api.py
"""
Storage API for saving reasoning analyses and generated policies
FIXED for Windows path compatibility
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ============================================
# ROUTER SETUP
# ============================================
router = APIRouter(prefix="/api/storage", tags=["storage"])

# ============================================
# STORAGE CONFIGURATION
# ============================================
STORAGE_ROOT = Path("results")
REASONER_DIR = STORAGE_ROOT / "reasoner"
GENERATOR_DIR = STORAGE_ROOT / "generator"
VALIDATOR_DIR = STORAGE_ROOT / "validator"

# Create directories
for directory in [REASONER_DIR, GENERATOR_DIR, VALIDATOR_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# ============================================
# REQUEST MODELS
# ============================================
class SaveReasoningRequest(BaseModel):
    name: str
    description: Optional[str] = None
    reasoning_result: dict

class SaveGeneratorRequest(BaseModel):
    name: str
    description: Optional[str] = None
    odrl_turtle: str
    metadata: Optional[dict] = None

# ============================================
# HELPER FUNCTIONS
# ============================================
def create_safe_filename(name: str, timestamp: bool = True) -> str:
    """Create filesystem-safe filename"""
    safe_name = "".join(c for c in name if c.isalnum() or c in ('-', '_', ' '))
    safe_name = safe_name.replace(' ', '_')
    
    if timestamp:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{safe_name}_{ts}.json"
    return f"{safe_name}.json"

# ============================================
# REASONING STORAGE
# ============================================
@router.post("/reasoning/save")
async def save_reasoning_analysis(request: SaveReasoningRequest):
    """Save reasoning analysis to results/reasoner/"""
    try:
        filename = create_safe_filename(request.name)
        filepath = REASONER_DIR / filename
        
        data = {
            "name": request.name,
            "description": request.description,
            "saved_at": datetime.now().isoformat(),
            "reasoning_result": request.reasoning_result
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved reasoning: {filename}")
        
        return {
            "success": True,
            "message": f"Analysis '{request.name}' saved successfully",
            "filename": filename,
            "path": f"results/reasoner/{filename}"
        }
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

# @router.get("/reasoning/list")
# async def list_reasoning_analyses():
#     """List all saved reasoning analyses"""
#     try:
#         analyses = []
#         for filepath in sorted(REASONER_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
#             with open(filepath, 'r', encoding='utf-8') as f:
#                 data = json.load(f)
            
#             result = data.get("reasoning_result", {})
#             analyses.append({
#                 "filename": filepath.name,
#                 "name": data.get("name"),
#                 "description": data.get("description"),
#                 "saved_at": data.get("saved_at"),
#                 "overall_status": result.get("overall_status"),
#                 "num_policies": len(result.get("policies", [])),
#                 "model_used": result.get("model_used")
#             })
        
#         return {"total": len(analyses), "analyses": analyses}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/reasoning/{filename}")
# async def get_reasoning_analysis(filename: str):
#     """Get specific reasoning analysis"""
#     try:
#         filepath = REASONER_DIR / filename
#         if not filepath.exists():
#             raise HTTPException(status_code=404, detail="Not found")
        
#         with open(filepath, 'r', encoding='utf-8') as f:
#             return json.load(f)
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.delete("/reasoning/{filename}")
# async def delete_reasoning_analysis(filename: str):
#     """Delete reasoning analysis"""
#     try:
#         filepath = REASONER_DIR / filename
#         if not filepath.exists():
#             raise HTTPException(status_code=404, detail="Not found")
        
#         filepath.unlink()
#         return {"success": True, "message": "Deleted successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GENERATOR STORAGE - FIXED
# ============================================
@router.post("/generator/save")
async def save_generated_policy(request: SaveGeneratorRequest):
    """Save generated ODRL policy"""
    try:
        filename = create_safe_filename(request.name)
        filepath = GENERATOR_DIR / filename
        
        data = {
            "name": request.name,
            "description": request.description,
            "saved_at": datetime.now().isoformat(),
            "odrl_turtle": request.odrl_turtle,
            "metadata": request.metadata
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved policy: {filename}")
        
        return {
            "success": True,
            "message": f"Policy '{request.name}' saved successfully",
            "filename": filename,
            "path": f"results/generator/{filename}"
        }
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

# @router.get("/generator/list")
# async def list_generated_policies():
#     """List all saved generated policies"""
#     try:
#         policies = []
#         for filepath in sorted(GENERATOR_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
#             with open(filepath, 'r', encoding='utf-8') as f:
#                 data = json.load(f)
            
#             policies.append({
#                 "filename": filepath.name,
#                 "name": data.get("name"),
#                 "description": data.get("description"),
#                 "saved_at": data.get("saved_at"),
#                 "metadata": data.get("metadata", {})
#             })
        
#         return {"total": len(policies), "policies": policies}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # ============================================
# # EXPORT ALL
# # ============================================
# @router.get("/export/all")
# async def export_all_analyses():
#     """Export all analyses for evaluation"""
#     try:
#         all_data = {
#             "export_date": datetime.now().isoformat(),
#             "reasoning_analyses": [],
#             "generated_policies": []
#         }
        
#         # Collect reasoning analyses
#         for filepath in REASONER_DIR.glob("*.json"):
#             with open(filepath, 'r') as f:
#                 all_data["reasoning_analyses"].append(json.load(f))
        
#         # Collect generated policies
#         for filepath in GENERATOR_DIR.glob("*.json"):
#             with open(filepath, 'r') as f:
#                 all_data["generated_policies"].append(json.load(f))
        
#         all_data["totals"] = {
#             "reasoning": len(all_data["reasoning_analyses"]),
#             "generated": len(all_data["generated_policies"])
#         }
        
#         return all_data
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/stats")
# async def get_storage_stats():
#     """Get storage statistics"""
#     try:
#         return {
#             "storage_root": str(STORAGE_ROOT.absolute()),
#             "directories": {
#                 "reasoner": {
#                     "path": str(REASONER_DIR),
#                     "count": len(list(REASONER_DIR.glob("*.json")))
#                 },
#                 "generator": {
#                     "path": str(GENERATOR_DIR),
#                     "count": len(list(GENERATOR_DIR.glob("*.json")))
#                 },
#                 "validator": {
#                     "path": str(VALIDATOR_DIR),
#                     "count": len(list(VALIDATOR_DIR.glob("*.json")))
#                 }
#             }
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
