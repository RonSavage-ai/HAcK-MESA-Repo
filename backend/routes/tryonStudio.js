/**
 * Try-On Studio routes — isolated module for drag-and-drop virtual try-on.
 * Uses Google Gemini Nano Banana (gemini-2.5-flash-image-preview / 3.x) for image generation.
 */
import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const getSerpApiKey = () => process.env.SERPAPI_KEY || "";
const getGoogleAiKey = () => process.env.GOOGLE_AI_API_KEY || "";

// ===== Health =====
router.get("/health", (_req, res) => {
  res.json({ status: "ok", module: "tryon-studio" });
});

// ===== Closet (clothing items to drag) =====
router.get("/closet", async (req, res, next) => {
  try {
    const { q = "trending outfit", num = 24 } = req.query;
    const SERPAPI_KEY = getSerpApiKey();
    if (!SERPAPI_KEY) return res.status(500).json({ detail: "SerpAPI not configured" });

    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_shopping",
        q: `${q} clothing`,
        api_key: SERPAPI_KEY,
        num,
        gl: "us",
        hl: "en",
        tbs: "cat:166",
      },
      timeout: 30000,
    });

    const items = (data.shopping_results || [])
      .filter((i) => i.thumbnail)
      .map((item, idx) => ({
        id: String(idx),
        title: item.title || "",
        thumbnail: item.thumbnail,
        price: item.price || "",
        source: item.source || "",
      }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// ===== Virtual try-on =====
router.post("/try-on", async (req, res) => {
  try {
    const { model_photo_base64, clothing_image_url, clothing_title } = req.body || {};
    if (!model_photo_base64 || !clothing_image_url) {
      return res.status(400).json({ detail: "model_photo_base64 and clothing_image_url required" });
    }
    const GOOGLE_AI_API_KEY = getGoogleAiKey();
    if (!GOOGLE_AI_API_KEY) return res.status(500).json({ detail: "GOOGLE_AI_API_KEY not configured" });

    // Fetch clothing image → base64
    const imgResp = await axios.get(clothing_image_url, { responseType: "arraybuffer", timeout: 30000 });
    const clothingB64 = Buffer.from(imgResp.data, "binary").toString("base64");
    const clothingMime = imgResp.headers["content-type"] || "image/jpeg";

    // Clean user photo base64 (strip data URI prefix if present)
    let modelB64 = model_photo_base64;
    let modelMime = "image/png";
    if (modelB64.includes(",")) {
      const [header, payload] = modelB64.split(",", 2);
      modelB64 = payload;
      const m = header.match(/data:([^;]+);/);
      if (m) modelMime = m[1];
    }

    const prompt =
      `I'm providing two images. The first is a person (the model). ` +
      `The second is a clothing item: "${clothing_title || "clothing"}". ` +
      `Generate a realistic photograph of the person wearing this clothing item. ` +
      `Preserve their face, hair, and pose exactly. Make the clothing fit naturally. ` +
      `Keep the lighting and background consistent with the original person photo.`;

    const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: modelMime, data: modelB64 } },
            { inlineData: { mimeType: clothingMime, data: clothingB64 } },
          ],
        },
      ],
    });

    // Extract generated image
    let generated = null;
    let textOut = "";
    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData?.data) {
        generated = p.inlineData.data;
      } else if (p.text) {
        textOut += p.text;
      }
    }

    if (!generated) {
      return res.status(500).json({ detail: "No image generated. Try a clearer photo." });
    }

    res.json({ result_image_base64: generated, description: textOut || "Here's your try-on!" });
  } catch (err) {
    console.error("Try-on error:", err?.message || err);
    res.status(500).json({ detail: `Try-on failed: ${err?.message || "unknown error"}` });
  }
});

export default router;
