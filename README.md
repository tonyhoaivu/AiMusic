# AI MUSIC STUDIO

Full-stack AI music composition & AI Cover web platform inspired by Suno AI and MusicAI.

## Features
- **8 Pages**: Home, Create AI Music, AI Cover, AI Music Tools, Music Library & History, Song Detail (`?song=<id>`), User Profile, and Server-Protected Admin Dashboard.
- **Real AI Integrations**:
  - Gemini AI (`GEMINI_API_KEY`): Automatic lyrics writing & music style optimization.
  - Real AI Music & AI Cover Providers (`Suno API`, `Replicate MusicGen/Demucs/RVC`, `MiniMax Music-01`, `FAL.ai`, `Custom`).
- **Real Audio Upload & Serving**: Upload MP3/WAV files directly to `/api/upload` and stream via `/api/uploads/:filename`.
- **RBAC Security & Persistence**: Scrypt password hashing, HMAC-SHA256 HttpOnly cookie + Bearer tokens, server-side `requireAdmin` protection, and JSON persistence (`./data/db.json` or `/tmp/aimusic-data/db.json` on serverless).
- **UI/UX**: Vietnamese default + English switcher, Light & Dark theme toggle, responsive mobile/tablet/desktop layout, persistent bottom music player.

## Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
- `GEMINI_API_KEY`: Google Gemini API key for lyrics/style generation.
- `SUNO_API_KEY` / `REPLICATE_API_TOKEN` / `MINIMAX_API_KEY` / `FAL_KEY`: Provider API key(s) for real music/cover generation.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Initial admin login credentials.
- `SESSION_SECRET`: Strong random secret for signing auth tokens.
- `APP_URL`: Public HTTPS URL of your deployment (e.g. `https://yourdomain.com`).

## Local Development & Production Build
```bash
npm install
npm run dev      # Development server on http://localhost:3000
npm run build    # Builds Vite frontend (dist/) and Express backend (server.js)
npm run start    # Runs production server (NODE_ENV=production node server.js)
```

## Deploying to Hosting
### 1. Vercel
- The project includes `vercel.json` and `api/[...path].ts` (catch-all Express serverless API + SPA rewrite excluding `/api/*`, `/images/*`, `/assets/*`).
- Add `GEMINI_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and your music provider API keys in **Vercel Project Settings → Environment Variables**.
- Deploy directly from Git or via `vercel --prod`.

### 2. VPS (Ubuntu/Debian + PM2 + Nginx + HTTPS)
```bash
git clone <repo-url> && cd ai-music-studio
npm install
npm run build
pm2 start server.js --name ai-music-studio
```
Configure Nginx reverse proxy from port `80/443` to `http://127.0.0.1:3000` with Certbot SSL (`certbot --nginx -d yourdomain.com`).

### 3. cPanel (Setup Node.js App)
- Upload project files (excluding `node_modules`).
- In cPanel → **Setup Node.js App**, select Node.js 18+, set startup file to `server.js`, set environment variables, run `npm install` and `npm run build`, then Start App.
