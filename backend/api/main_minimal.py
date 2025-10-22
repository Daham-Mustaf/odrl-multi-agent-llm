from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

# Create FastAPI app
app = FastAPI(title="ODRL API - Minimal")

# Enable CORS so GUI can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple data storage
custom_models = []

# Model for custom models
class CustomModel(BaseModel):
    name: str
    provider_type: str
    base_url: str
    api_key: Optional[str] = None
    model_id: str

# ENDPOINT 1: Health check
@app.get("/")
def root():
    return {"message": "API is running!", "status": "ok"}

# ENDPOINT 2: Get available providers
@app.get("/api/available-providers")
def get_providers():
    # Hardcoded for now - just shows one provider
    return {
        "providers": [
            {
                "id": "ollama",
                "name": "Local Ollama",
                "type": "local",
                "icon": "💻",
                "status": "online",
                "models": [
                    {"value": "ollama:llama3.1:70b", "label": "llama3.1:70b", "recommended": True},
                    {"value": "ollama:llama3.1:8b", "label": "llama3.1:8b", "recommended": False}
                ]
            }
        ],
        "default_model": "ollama:llama3.1:70b"
    }

# ENDPOINT 3: Get custom models
@app.get("/api/custom-models")
def get_custom_models():
    return {"models": custom_models}

# ENDPOINT 4: Add custom model
@app.post("/api/custom-models/add")
def add_custom_model(model: CustomModel):
    model_dict = model.dict()
    model_dict['id'] = f"custom_{len(custom_models)}"
    custom_models.append(model_dict)
    return {"status": "success", "model_id": model_dict['id']}

# ENDPOINT 5: Delete custom model
@app.delete("/api/custom-models/{model_id}")
def delete_custom_model(model_id: str):
    global custom_models
    custom_models = [m for m in custom_models if m.get('id') != model_id]
    return {"status": "success"}

# Run the server
if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 ODRL Backend API - Minimal Version")
    print("=" * 50)
    print("📍 API URL: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)