# API Reference

Base URL: `http://localhost:8000`

## Endpoints

### Health Check
```
GET /health
```

### Custom Models
```
GET /api/custom-models
POST /api/custom-models
DELETE /api/custom-models/{model_id}
```

### Agents
```
POST /api/parse
POST /api/reason
POST /api/generate
POST /api/validate
```

Full documentation: http://localhost:8000/docs
```

---

## **File Structure in docs/**
```
docs/
├── DEPLOYMENT.md      # Ubuntu production setup
├── CONFIGURATION.md   # Environment & settings
├── DEVELOPMENT.md     # Local development
├── TESTING.md         # How to test
├── API.md            # API reference
├── DOCKER.md         # Docker setup
├── TROUBLESHOOTING.md # Common issues
├── CHANGELOG.md      # Version history
└── CONTRIBUTING.md   # How to contribute