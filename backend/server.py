from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SERPAPI_KEY = os.environ.get('SERPAPI_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===== Models =====
class ProductResult(BaseModel):
    id: str
    title: str
    price: Optional[str] = None
    extracted_price: Optional[float] = None
    source: Optional[str] = None
    link: Optional[str] = None
    thumbnail: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    delivery: Optional[str] = None
    immersive_token: Optional[str] = None

class SearchResponse(BaseModel):
    products: List[ProductResult]
    query: str
    total_results: int

class TryOnRequest(BaseModel):
    user_photo_base64: str  # User's photo
    product_image_url: str  # Product image URL
    product_title: str  # Product description

class TryOnResponse(BaseModel):
    generated_image_base64: str
    description: str


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "Threaded API - Clothing Marketplace"}


@api_router.get("/search", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1),
    num: int = Query(40, ge=1, le=100),
    category: Optional[str] = Query(None)
):
    """Search for clothing products using Google Shopping via SerpAPI"""
    if not SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="SerpAPI key not configured")
    
    try:
        async with httpx.AsyncClient() as http_client:
            # Build query with category
            query_parts = [q, "clothing apparel"]
            if category and category != "All":
                query_parts.append(category)
            clothing_query = " ".join(query_parts)
            
            params = {
                "engine": "google_shopping",
                "q": clothing_query,
                "api_key": SERPAPI_KEY,
                "num": num,
                "gl": "us",
                "hl": "en",
                "tbs": "cat:166"
            }
            
            response = await http_client.get("https://serpapi.com/search", params=params, timeout=30.0)
            data = response.json()
            shopping_results = data.get("shopping_results", [])
            
            products = []
            for idx, item in enumerate(shopping_results):
                products.append(ProductResult(
                    id=str(idx),
                    title=item.get("title", ""),
                    price=item.get("price", ""),
                    extracted_price=item.get("extracted_price"),
                    source=item.get("source", ""),
                    link="",
                    thumbnail=item.get("thumbnail", ""),
                    rating=item.get("rating"),
                    reviews=item.get("reviews"),
                    delivery=item.get("delivery", ""),
                    immersive_token=item.get("immersive_product_page_token", "")
                ))
            
            return SearchResponse(products=products, query=q, total_results=len(products))
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Search timed out")
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/trending")
async def get_trending():
    return {"trending": [
        "vintage denim jacket", "oversized hoodie", "cargo pants streetwear",
        "minimalist white sneakers", "leather crossbody bag", "linen summer dress",
        "graphic tee y2k", "wide leg trousers"
    ]}


@api_router.get("/categories")
async def get_categories():
    """Marketplace categories"""
    return {"categories": [
        {"id": "all", "name": "All", "icon": "layers"},
        {"id": "men", "name": "Men", "icon": "user"},
        {"id": "women", "name": "Women", "icon": "user"},
        {"id": "streetwear", "name": "Streetwear", "icon": "zap"},
        {"id": "vintage", "name": "Vintage", "icon": "clock"},
        {"id": "luxury", "name": "Luxury", "icon": "gem"},
        {"id": "athletic", "name": "Athletic", "icon": "activity"},
        {"id": "accessories", "name": "Accessories", "icon": "watch"}
    ]}


@api_router.get("/inspo")
async def get_inspo():
    """Curated inspo/style feed"""
    return {"inspo": [
        {"id": "1", "title": "Y2K Revival", "query": "y2k low rise jeans baby tee", "vibe": "early 2000s nostalgia"},
        {"id": "2", "title": "Clean Minimalist", "query": "minimalist neutral outfit linen", "vibe": "quiet luxury"},
        {"id": "3", "title": "Gorpcore", "query": "arc'teryx technical outdoor jacket", "vibe": "outdoor tech"},
        {"id": "4", "title": "Dark Academia", "query": "wool blazer pleated skirt oxford", "vibe": "scholarly elegance"},
        {"id": "5", "title": "Streetwear Heat", "query": "supreme stussy graphic tee", "vibe": "urban culture"},
        {"id": "6", "title": "Coastal Grandma", "query": "linen button down wide leg trouser", "vibe": "effortless summer"},
        {"id": "7", "title": "Cyberpunk", "query": "techwear cargo pants futuristic", "vibe": "future tech"},
        {"id": "8", "title": "Retro Athleisure", "query": "adidas samba track jacket", "vibe": "sporty vintage"},
    ]}


@api_router.get("/product-link")
async def get_product_link(token: str = Query(...)):
    """Get direct store link for a product"""
    if not SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="SerpAPI key not configured")
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://serpapi.com/search",
                params={"engine": "google_immersive_product", "page_token": token, "api_key": SERPAPI_KEY},
                timeout=30.0
            )
            data = response.json()
            if "product_results" in data and "stores" in data["product_results"]:
                stores = data["product_results"]["stores"]
                if stores:
                    first = stores[0]
                    return {
                        "link": first.get("link", ""),
                        "store": first.get("name", ""),
                        "price": first.get("price", "")
                    }
            raise HTTPException(status_code=404, detail="No link found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/sol-price")
async def get_sol_price():
    """Get current Solana price in USD"""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "solana", "vs_currencies": "usd"},
                timeout=10.0
            )
            data = response.json()
            sol_price = data.get("solana", {}).get("usd", 150)
            return {"usd_per_sol": sol_price}
    except Exception as e:
        logger.error(f"SOL price error: {str(e)}")
        # Fallback price
        return {"usd_per_sol": 150}


@api_router.post("/try-on", response_model=TryOnResponse)
async def virtual_try_on(request: TryOnRequest):
    """Generate a virtual try-on image using Gemini Nano Banana"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    try:
        # Fetch product image and convert to base64
        async with httpx.AsyncClient() as http_client:
            img_response = await http_client.get(request.product_image_url, timeout=30.0)
            if img_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch product image")
            product_image_b64 = base64.b64encode(img_response.content).decode('utf-8')
        
        # Clean user photo base64 (remove data:image/...;base64, prefix if present)
        user_photo_b64 = request.user_photo_base64
        if "," in user_photo_b64:
            user_photo_b64 = user_photo_b64.split(",", 1)[1]
        
        session_id = f"tryon-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are a virtual try-on AI that realistically places clothing items on people."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        
        prompt = (
            f"I'm providing two images. The first is a person's photo. The second is a clothing item: '{request.product_title}'. "
            f"Generate a realistic image showing the person from the first image wearing the clothing item from the second image. "
            f"Preserve the person's face, body, and pose. Make it look like a natural fashion photograph. "
            f"The clothing should fit naturally and realistically."
        )
        
        msg = UserMessage(
            text=prompt,
            file_contents=[
                ImageContent(user_photo_b64),
                ImageContent(product_image_b64)
            ]
        )
        
        text, images = await chat.send_message_multimodal_response(msg)
        
        if not images:
            raise HTTPException(status_code=500, detail="No image generated. Try a clearer photo.")
        
        generated_b64 = images[0]['data']
        
        return TryOnResponse(
            generated_image_base64=generated_b64,
            description=text or "Here's your virtual try-on!"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Try-on error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Try-on failed: {str(e)}")


# Include router
app.include_router(api_router)

# Include separate Try-On Studio module
from tryon_studio.router import router as tryon_studio_router
app.include_router(tryon_studio_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
