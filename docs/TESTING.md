# Testing Guide

## Backend Tests

### Health Check
```bash
curl http://localhost:8000/health
```

### Custom Models
```bash
curl http://localhost:8000/api/custom-models
```

### Parse Endpoint
```bash
curl -X POST http://localhost:8000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"Users can read","model":"groq:llama-3.3-70b-versatile"}'
```

## Frontend Tests

1. Open http://localhost:3000
2. Enter text: "Users can view but not modify"
3. Select model
4. Click Generate
5. Verify all agents complete

## End-to-End Test

Full workflow:
- Parse → Reason → Generate → Validate
- Should complete without errors
- Final output: Valid ODRL Turtle