# AquaLog Project

## Stack
- React + Vite (frontend)
- Supabase (database - postgres)
- Vercel (hosting + serverless functions)
- Recharts (charts)
- Anthropic API via /api/summary.js proxy

## Key Files
- src/AquariumLog.jsx — main app (single file, ~2200 lines)
- api/summary.js — Vercel serverless proxy for Anthropic API
- index.html — PWA config with fish icon
- public/icon.svg — app icon

## Dev Commands
- npm run dev — local dev server at localhost:5173
- git add . && git commit -m "..." && git push origin main — deploy to Vercel

## Important Notes
- 6 tanks: 4 freshwater, 2 saltwater
- Supabase tables: tanks, parameters, diary, livestock, tasks
- All tanks loaded from Supabase, fallback to FALLBACK_TANKS constant
- Alkalinity: freshwater stored as ppm, displayed as dKH (×0.056)
- Notifications only work in PWA mode (home screen), not Safari browser