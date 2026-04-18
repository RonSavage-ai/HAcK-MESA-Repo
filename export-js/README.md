# Threaded — Clothing Marketplace (Node.js + React)

Full-stack JavaScript version of the Threaded hackathon project.  
**Backend**: Node.js + Express · **Frontend**: React (CRA + Tailwind + shadcn/ui) · **AI try-on**: Google Gemini Nano Banana.

---

## Project structure

```
threaded/
├── backend/          ← Node.js + Express API
│   ├── server.js
│   ├── routes/
│   │   ├── marketplace.js      (search, trending, categories, inspo, sol-price)
│   │   └── tryonStudio.js      (isolated drag-and-drop try-on module)
│   ├── package.json
│   └── .env.example
└── frontend/         ← React app (already JS)
    ├── src/
    │   ├── App.js
    │   ├── tryon_studio/TryOnStudio.jsx
    │   └── components/ui/ …
    ├── package.json
    └── .env.example
```

---

## 1. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env and fill in SERPAPI_KEY + GOOGLE_AI_API_KEY
yarn install        # or: npm install
yarn start          # runs on http://localhost:8001
```

### Keys you need

| Key | Where to get it | Why |
|---|---|---|
| `SERPAPI_KEY` | https://serpapi.com/ (free tier) | Google Shopping search |
| `GOOGLE_AI_API_KEY` | https://aistudio.google.com/apikey (free) | AI try-on via Gemini Nano Banana |

### Endpoints

Marketplace (`/api/*`):
- `GET /api/search?q=<query>&num=40&category=<optional>`
- `GET /api/product-link?token=<immersive_token>`
- `GET /api/trending`
- `GET /api/categories`
- `GET /api/inspo`
- `GET /api/sol-price`

Try-On Studio (`/api/tryon-studio/*` — **isolated module**):
- `GET  /api/tryon-studio/health`
- `GET  /api/tryon-studio/closet?q=<query>&num=24`
- `POST /api/tryon-studio/try-on` — body: `{ model_photo_base64, clothing_image_url, clothing_title }`

---

## 2. Frontend setup

```bash
cd frontend
cp .env.example .env
# edit .env if your backend isn't on localhost:8001
yarn install        # or: npm install
yarn start          # runs on http://localhost:3000
```

---

## 3. What's included

- 🛍 **Marketplace**: Google Shopping powered search, categories (Men/Women/Streetwear/Vintage/Luxury/Athletic/Accessories), trending tags, curated Style Inspo feed
- 🪄 **AI Try-On Studio**: Drag any clothing onto your selfie, Gemini generates a realistic try-on image (isolated in its own folder so it doesn't touch the main marketplace code)
- 💳 **Solana**: Real-time SOL price from CoinGecko, SOL badges on products, mock "Pay SOL" button
- 🎨 **Design**: Dark theme, gradient accents, shadcn/ui components, Sora font, MESA branding

---

## 4. Notes

- Backend uses `"type": "module"` for ES modules (import/export syntax)
- No database required — everything is stateless. Add MongoDB/Postgres later if you need persistence.
- Frontend reads `REACT_APP_BACKEND_URL` at build time. Change it before `yarn build` for production.
- The AI try-on takes 20–40s per generation. That's normal.
