##  Overview

This document describes how to run the **ODRL Demo** system (backend + frontend) using Docker and Docker Compose.

The setup provides:
- FastAPI backend (`odrl-backend`)
- React frontend (`odrl-frontend`)
- Shared Docker network for internal API calls

---

## Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2.20
- Port `8000` (backend) and `3000` (frontend) available
---

## Running the project

### 1- Build and start containers

```bash
docker-compose up --build
````

### 2- Access the services

* Frontend → [http://localhost:3000](http://localhost:3000)
* Backend → [http://localhost:8000](http://localhost:8000)
* API Docs → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Environment variables

### Frontend (`frontend/.env`)

```bash
REACT_APP_API_URL=http://localhost:8000
```

When running inside Docker:

```yaml
environment:
  - REACT_APP_API_URL=http://backend:8000
```

---

## 🧱 Container overview

| Service       | Port | Description                    |
| ------------- | ---- | ------------------------------ |
| odrl-backend  | 8000 | FastAPI app (policy generator) |
| odrl-frontend | 3000 | React UI                       |

---

## Stopping and cleaning up

```bash
docker-compose down
```

If you want to rebuild from scratch:

```bash
docker-compose down -v --rmi all --remove-orphans
docker-compose up --build
```

---

## Production mode

For production deployment, use:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

(where `docker-compose.prod.yml` will include Nginx or FastAPI static file serving)

---

## Logs

```bash
docker-compose logs -f
```

---

## Troubleshooting

| Issue                 | Fix                                               |                 |
| --------------------- | ------------------------------------------------- | --------------- |
| Backend not reachable | Check `.env` value and backend container health   |                 |
| Port already in use   | Stop conflicting process (`netstat -ano           | findstr :8000`) |
| React build error     | Run `npm run build` locally to verify code health |                 |

