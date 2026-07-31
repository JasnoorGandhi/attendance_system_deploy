# Deployment Guide

## Backend → Render (Docker)

1. Push this repo to GitHub (backend/Dockerfile and docker-compose.yml already included).
2. On [render.com](https://render.com) → **New +** → **Web Service** → connect the repo.
3. Settings:
   - Root directory: `backend`
   - Environment: **Docker**
   - Instance type: at least `Starter` (512MB is tight for dlib; `Standard` recommended)
4. Add a **Render PostgreSQL** instance (New + → PostgreSQL) → copy its **Internal Database URL**.
5. Set environment variables on the web service:
   ```
   DATABASE_URL = <the Postgres internal URL from step 4>
   SECRET_KEY   = <generate with: python -c "import secrets; print(secrets.token_hex(32))">
   ```
6. Add a **persistent disk** mounted at `/app/storage` (Render → Disks) so `embeddings.pkl` and the dlib `.dat` model files survive redeploys. Upload them once via Render's shell or by committing small files / using a setup script for the large `.dat` files.
7. Deploy. Render gives you a URL like `https://attendx-backend.onrender.com`.

**Note:** Render's free tier sleeps after inactivity — first request after idle will be slow (cold start + dlib model load). Fine for a portfolio demo, mention this if asked.

### Alternative: Railway
Same steps — Railway auto-detects the Dockerfile, provision a Postgres plugin from its dashboard, set the same two env vars, and add a volume for `/app/storage`.

---

## Frontend → Vercel

1. On [vercel.com](https://vercel.com) → **New Project** → import the repo → set root directory to `frontend`.
2. Framework preset: **Vite**.
3. Environment variable:
   ```
   VITE_API_BASE = https://attendx-backend.onrender.com
   ```
4. Update `src/api/index.js` to read this instead of a hardcoded localhost URL:
   ```js
   const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
   ```
5. Deploy. Vercel gives you a URL like `https://attendx.vercel.app`.

---

## CORS — update backend for the deployed frontend origin

In `backend/main.py`, update `allow_origins` to include the real Vercel URL (don't leave it as `"*"` in production if you're sending auth headers):

```python
allow_origins = [
    "http://localhost:3000",
    "https://attendx.vercel.app",
],
allow_credentials = True,
```

---

## One-command local run (Docker Compose)

```bash
docker compose up --build
```

This starts Postgres + the FastAPI backend together. Frontend still runs separately with `npm run dev` (or add a frontend service to `docker-compose.yml` once you're ready to containerize it too).
