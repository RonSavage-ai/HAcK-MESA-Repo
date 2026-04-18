# Threaded - Clothing Marketplace PRD (MESA Hackathon)

## Original Problem Statement
24-hour hackathon project (MESA): Build a clothing marketplace website.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + MongoDB
- **Search**: Google Shopping via SerpAPI
- **AI Try-On**: Gemini Nano Banana (gemini-3.1-flash-image-preview)
- **Crypto Price**: CoinGecko API (free)

## Core Features (Implemented)
1. **Rebranding** - "Threaded" name + MESA logo in header
2. **Marketplace Categories** - All, Men, Women, Streetwear, Vintage, Luxury, Athletic, Accessories
3. **Style Inspo Feed** - 8 curated aesthetic tiles (Y2K Revival, Clean Minimalist, Gorpcore, Dark Academia, etc.)
4. **Solana Integration** (visual) - SOL price badges on products, "Pay SOL" button with mock checkout
5. **AI Virtual Try-On** - Upload photo + select product → Gemini generates try-on image

## Configuration
- `SERPAPI_KEY` - SerpAPI for Google Shopping
- `EMERGENT_LLM_KEY` - Gemini image generation
- `MONGO_URL`, `DB_NAME` - MongoDB

## API Endpoints
- `GET /api/search?q=...&category=...` - Product search
- `GET /api/trending` - Trending search terms
- `GET /api/categories` - Marketplace categories
- `GET /api/inspo` - Style inspo feed
- `GET /api/product-link?token=...` - Direct store link
- `GET /api/sol-price` - Current SOL/USD price
- `POST /api/try-on` - AI virtual try-on

## What's Been Implemented
**Jan 2026 - MVP**
- Google Shopping search with clothing-only filter
- Product grid with cards showing price + SOL conversion
- Product detail modal with AI Try-On + Shop + Pay SOL buttons
- Landing page with categories, trending tags, inspo grid
- MESA branding throughout
- Direct store links (not Google redirects)
- Real-time SOL price from CoinGecko

## Backlog (Post-Hackathon)
**P1:**
- Real Solana wallet integration (Phantom adapter)
- Pinterest API integration for inspo feed
- User accounts + saved looks/wishlist

**P2:**
- Real try-on with multi-angle views
- Social sharing of try-on images
- Price drop alerts
