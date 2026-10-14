# CircuitX Deployment Plan & Production Operations

This document outlines the local operation and production deployment architecture for the CircuitX engineering assistant.

---

## 1. Local Development Architecture

```
               Browser Client
          http://localhost:5173
                   │
           HTTP / SSE / REST
                   ▼
       FastAPI Backend Server
       http://127.0.0.1:8000
       ├── SQLite (circuitx.db)
       ├── NumPy / SciPy Calculation Engine
       ├── MNA DC Circuit Solver & Netlist Parser
       ├── Local Simulators (iverilog, ngspice, octave)
       └── Official OpenAI SDK v1.x (AsyncOpenAI)
```

### Local Verification Checklist
- [x] Backend starts: `uvicorn main:app --reload --host 127.0.0.1 --port 8000`
- [x] Frontend starts: `npm run dev` (Vite on `http://localhost:5173`)
- [x] Health check passes: `curl http://127.0.0.1:8000/api/health`
- [x] Deterministic solvers run without API key
- [x] Full test suite passes: `pytest tests/` (60/60) and `npm test` (23/23)

---

## 2. Production Hosting Architecture

```
+─────────────────────────────────────────────────────────────+
|                         CDN / Edge                          |
|             (Vercel / Netlify / Cloudflare Pages)           |
|  - Static Assets (HTML5, Vite JS Bundles, KaTeX Fonts, CSS) |
|  - Custom Domain with Automated Let's Encrypt SSL/TLS       |
|  - Reverse Proxy / Rewrites for /api -> Backend API Host    |
+─────────────────────────────────────────────────────────────+
                               │
                       HTTPS (TLS 1.3)
                               ▼
+─────────────────────────────────────────────────────────────+
|                      Containerized Host                     |
|           (Render / Railway / Fly.io / AWS ECS / VPS)       |
|  - Linux Docker Container (Debian 12 Bookworm)              |
|  - Python 3.12 + Uvicorn ASGI Server                        |
|  - Pre-installed Icarus Verilog (`iverilog`) & `ngspice`    |
|  - Persistent Volume mounted at `/data` for SQLite & uploads|
|  - Secrets injected via Host Environment Variables          |
+─────────────────────────────────────────────────────────────+
                               │
                       HTTPS (TLS 1.3)
                               ▼
+─────────────────────────────────────────────────────────────+
|                    OpenAI API Cloud                         |
|  - Model completions (gpt-4o, gpt-4o-mini, o3-mini)         |
+─────────────────────────────────────────────────────────────+
```

---

## 3. Environment Variable Configuration

All secrets and credentials must be set directly in the hosting provider's dashboard or container environment. **Never commit `.env` or secrets to Git.**

| Variable Name | Production Recommendation | Description |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | `sk-proj-...` (Required for AI) | Secret key from OpenAI platform |
| `OPENAI_MODEL` | `gpt-4o-mini` or `gpt-4o` | Production AI model name |
| `BACKEND_HOST` | `0.0.0.0` | Bind address for container |
| `BACKEND_PORT` | `8000` or `$PORT` | Container listen port |
| `FRONTEND_ORIGIN` | `https://your-circuitx-app.vercel.app` | Production frontend domain for CORS |
| `CIRCUITX_DB_PATH` | `/data/circuitx.db` | Persistent volume path for SQLite database |
| `MAX_REQUEST_SIZE_BYTES` | `10485760` (10 MB) | Request payload cutoff limit |
| `RATE_LIMIT_PER_MINUTE` | `60` | Max requests per minute per IP |
| `REQUEST_TIMEOUT_SECONDS` | `45.0` | Upstream timeout for OpenAI and calculations |

---

## 4. Production Dockerfile

For self-hosted Linux VPS, Render, or Railway deployments:

```dockerfile
# Multi-stage container for CircuitX Backend with Hardware Simulators
FROM python:3.12-slim-bookworm

# Install system dependencies & hardware simulation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    iverilog \
    ngspice \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Create persistent storage directories
RUN mkdir -p /data /app/backend/uploads

ENV CIRCUITX_DB_PATH=/data/circuitx.db
ENV BACKEND_HOST=0.0.0.0
ENV BACKEND_PORT=8000

WORKDIR /app/backend

EXPOSE 8000

# Run with Uvicorn production settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]
```

---

## 5. Security & Operations Best Practices

1. **HTTPS Enforcement**: Always place the API behind a reverse proxy (Caddy, Nginx, or Cloudflare) enforcing HTTP Strict Transport Security (`HSTS`).
2. **CORS Lockdown**: Set `FRONTEND_ORIGIN` strictly to the production frontend domain (e.g. `https://circuitx.engineering.com`), not `*`.
3. **Rate Limiting**: CircuitX enforces an in-memory 60-second sliding window rate limiter (default: 60-120 req/min/IP). For clustered multi-worker deployments, put Cloudflare WAF or an Nginx rate limit zone in front.
4. **Secret Redaction**: CircuitX automatically redacts `sk-...` API keys and Bearer tokens in logs and client error responses.
5. **Database Backups**: If using SQLite on a persistent volume, configure an hourly snapshot or WAL replication using `litestream`. Alternatively, point `database.py` to PostgreSQL for multi-region scale.
6. **Cost Monitoring**: Monitor OpenAI usage in the OpenAI Platform Dashboard with hard billing spend limits.
