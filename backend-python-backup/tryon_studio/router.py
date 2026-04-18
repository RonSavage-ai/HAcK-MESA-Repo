"""
Try-On Studio Router
--------------------
Separate backend module for the drag-and-drop virtual try-on feature.
All endpoints live under /api/tryon-studio/* to keep things isolated.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import base64
import uuid
import os
import logging
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tryon-studio", tags=["tryon-studio"])

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
SERPAPI_KEY = os.environ.get('SERPAPI_KEY', '')


# ===== Models =====
class ClothingItem(BaseModel):
    id: str
    title: str
    thumbnail: str
    price: Optional[str] = None
    source: Optional[str] = None


class ClosetResponse(BaseModel):
    items: list[ClothingItem]


class TryOnRequest(BaseModel):
    model_photo_base64: str  # The user's model photo
    clothing_image_url: str  # The clothing item to overlay
    clothing_title: str  # Description of the item


class TryOnResponse(BaseModel):
    result_image_base64: str
    description: Optional[str] = None


# ===== Endpoints =====
@router.get("/health")
async def health():
    return {"status": "ok", "module": "tryon-studio"}


@router.get("/closet", response_model=ClosetResponse)
async def get_closet(q: str = "trending outfit", num: int = 20):
    """Get a closet of clothing items to drag onto the model.
    
    Uses Google Shopping search to populate the drawer with real items.
    """
    if not SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="SerpAPI not configured")
    
    try:
        async with httpx.AsyncClient() as http_client:
            params = {
                "engine": "google_shopping",
                "q": f"{q} clothing",
                "api_key": SERPAPI_KEY,
                "num": num,
                "gl": "us",
                "hl": "en",
                "tbs": "cat:166"
            }
            response = await http_client.get("https://serpapi.com/search", params=params, timeout=30.0)
            data = response.json()
            results = data.get("shopping_results", [])
            
            items = [
                ClothingItem(
                    id=str(idx),
                    title=item.get("title", ""),
                    thumbnail=item.get("thumbnail", ""),
                    price=item.get("price", ""),
                    source=item.get("source", "")
                )
                for idx, item in enumerate(results)
                if item.get("thumbnail")
            ]
            return ClosetResponse(items=items)
    except Exception as e:
        logger.error(f"Closet fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/try-on", response_model=TryOnResponse)
async def try_on(request: TryOnRequest):
    """Generate a virtual try-on composite image.
    
    Takes the user's model photo + a clothing item image and uses
    Gemini Nano Banana to generate a realistic try-on result.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    try:
        # Fetch clothing image
        async with httpx.AsyncClient() as http_client:
            img_resp = await http_client.get(request.clothing_image_url, timeout=30.0)
            if img_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch clothing image")
            clothing_b64 = base64.b64encode(img_resp.content).decode('utf-8')
        
        # Clean model photo base64
        model_b64 = request.model_photo_base64
        if "," in model_b64:
            model_b64 = model_b64.split(",", 1)[1]
        
        session_id = f"studio-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are a virtual try-on AI that realistically places clothing on people in photographs."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        
        prompt = (
            f"I'm providing two images. The first is a person (the model). The second is a clothing item: "
            f"'{request.clothing_title}'. "
            f"Generate a realistic photograph of the person wearing this clothing item. "
            f"Preserve their face, hair, and pose exactly. Make the clothing fit naturally and realistically. "
            f"Keep the lighting and background consistent with the original person photo."
        )
        
        msg = UserMessage(
            text=prompt,
            file_contents=[
                ImageContent(model_b64),
                ImageContent(clothing_b64)
            ]
        )
        
        text, images = await chat.send_message_multimodal_response(msg)
        
        if not images:
            raise HTTPException(status_code=500, detail="No image generated. Try a clearer photo.")
        
        return TryOnResponse(
            result_image_base64=images[0]['data'],
            description=text or "Here's your try-on!"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Try-on error: {e}")
        raise HTTPException(status_code=500, detail=f"Try-on failed: {str(e)}")
