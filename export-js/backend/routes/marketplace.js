/**
 * Marketplace routes — search, trending, categories, inspo, product link, SOL price.
 */
import express from "express";
import axios from "axios";

const router = express.Router();

const getSerpApiKey = () => process.env.SERPAPI_KEY || "";

// ===== Product search =====
router.get("/search", async (req, res, next) => {
  try {
    const { q, num = 40, category } = req.query;
    if (!q) return res.status(400).json({ detail: "Query is required" });
    const SERPAPI_KEY = getSerpApiKey();
    if (!SERPAPI_KEY) return res.status(500).json({ detail: "SerpAPI not configured" });

    const parts = [q, "clothing apparel"];
    if (category && category !== "All") parts.push(category);

    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_shopping",
        q: parts.join(" "),
        api_key: SERPAPI_KEY,
        num,
        gl: "us",
        hl: "en",
        tbs: "cat:166",
      },
      timeout: 30000,
    });

    const products = (data.shopping_results || []).map((item, idx) => ({
      id: String(idx),
      title: item.title || "",
      price: item.price || "",
      extracted_price: item.extracted_price ?? null,
      source: item.source || "",
      link: "",
      thumbnail: item.thumbnail || "",
      rating: item.rating ?? null,
      reviews: item.reviews ?? null,
      delivery: item.delivery || "",
      immersive_token: item.immersive_product_page_token || "",
    }));

    res.json({ products, query: q, total_results: products.length });
  } catch (err) {
    next(err);
  }
});

// ===== Direct store link =====
router.get("/product-link", async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ detail: "Token required" });
    const SERPAPI_KEY = getSerpApiKey();
    if (!SERPAPI_KEY) return res.status(500).json({ detail: "SerpAPI not configured" });

    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_immersive_product",
        page_token: token,
        api_key: SERPAPI_KEY,
      },
      timeout: 30000,
    });

    const stores = data?.product_results?.stores || [];
    if (!stores.length) return res.status(404).json({ detail: "No link found" });

    const first = stores[0];
    res.json({
      link: first.link || "",
      store: first.name || "",
      price: first.price || "",
    });
  } catch (err) {
    next(err);
  }
});

// ===== Trending searches =====
router.get("/trending", (_req, res) => {
  res.json({
    trending: [
      "vintage denim jacket",
      "oversized hoodie",
      "cargo pants streetwear",
      "minimalist white sneakers",
      "leather crossbody bag",
      "linen summer dress",
      "graphic tee y2k",
      "wide leg trousers",
    ],
  });
});

// ===== Categories =====
router.get("/categories", (_req, res) => {
  res.json({
    categories: [
      { id: "all", name: "All", icon: "layers" },
      { id: "men", name: "Men", icon: "user" },
      { id: "women", name: "Women", icon: "user" },
      { id: "streetwear", name: "Streetwear", icon: "zap" },
      { id: "vintage", name: "Vintage", icon: "clock" },
      { id: "luxury", name: "Luxury", icon: "gem" },
      { id: "athletic", name: "Athletic", icon: "activity" },
      { id: "accessories", name: "Accessories", icon: "watch" },
    ],
  });
});

// ===== Style inspo =====
router.get("/inspo", (_req, res) => {
  res.json({
    inspo: [
      { id: "1", title: "Y2K Revival", query: "y2k low rise jeans baby tee", vibe: "early 2000s nostalgia" },
      { id: "2", title: "Clean Minimalist", query: "minimalist neutral outfit linen", vibe: "quiet luxury" },
      { id: "3", title: "Gorpcore", query: "arc'teryx technical outdoor jacket", vibe: "outdoor tech" },
      { id: "4", title: "Dark Academia", query: "wool blazer pleated skirt oxford", vibe: "scholarly elegance" },
      { id: "5", title: "Streetwear Heat", query: "supreme stussy graphic tee", vibe: "urban culture" },
      { id: "6", title: "Coastal Grandma", query: "linen button down wide leg trouser", vibe: "effortless summer" },
      { id: "7", title: "Cyberpunk", query: "techwear cargo pants futuristic", vibe: "future tech" },
      { id: "8", title: "Retro Athleisure", query: "adidas samba track jacket", vibe: "sporty vintage" },
    ],
  });
});

// ===== Solana price =====
router.get("/sol-price", async (_req, res) => {
  try {
    const { data } = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: "solana", vs_currencies: "usd" },
      timeout: 10000,
    });
    res.json({ usd_per_sol: data?.solana?.usd ?? 150 });
  } catch {
    res.json({ usd_per_sol: 150 });
  }
});

export default router;
