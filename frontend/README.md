# ODRL Frontend

React-based UI for ODRL Policy Generator.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your backend URL:

**Local development:**
```bash
REACT_APP_API_URL=http://localhost:8000
```

**Production:**
```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
```

### 3. Run Development Server
```bash
npm start
```

Access at: http://localhost:3000

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:8000` |
| `DISABLE_ESLINT_PLUGIN` | Disable ESLint warnings | `true` |

