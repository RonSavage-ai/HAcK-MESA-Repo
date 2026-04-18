import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import {
  Search, ExternalLink, Star, Truck, Sparkles, TrendingUp,
  Layers, User, Zap, Clock, Gem, Activity, Watch, Wallet,
  Camera, Upload, X, Wand2, Heart, Grid3x3
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MESA_LOGO = "https://customer-assets.emergentagent.com/job_thread-mart-1/artifacts/d0a8gp33_mesa-logo.png";

const iconMap = {
  layers: Layers, user: User, zap: Zap, clock: Clock,
  gem: Gem, activity: Activity, watch: Watch
};

// ===== Product Card =====
const ProductCard = ({ product, onClick, solPrice }) => {
  const solAmount = product.extracted_price && solPrice
    ? (product.extracted_price / solPrice).toFixed(3)
    : null;

  return (
    <Card
      data-testid={`product-card-${product.id}`}
      className="group cursor-pointer overflow-hidden bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20"
      onClick={() => onClick(product)}
    >
      <div className="aspect-square overflow-hidden bg-zinc-800 relative">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Sparkles className="w-12 h-12" />
          </div>
        )}
        {product.rating && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-white font-medium">{product.rating}</span>
          </div>
        )}
        {solAmount && (
          <div className="absolute bottom-2 left-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <span className="text-[10px] font-bold text-white">◎ {solAmount} SOL</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-zinc-100 line-clamp-2 text-sm leading-tight group-hover:text-white transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-emerald-400">
            {product.price || "N/A"}
          </span>
          {product.source && (
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
              {product.source}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

// ===== Try-On Modal =====
const TryOnModal = ({ product, isOpen, onClose }) => {
  const [userPhoto, setUserPhoto] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setUserPhoto(null);
      setUserPhotoPreview(null);
      setGeneratedImage(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserPhoto(reader.result);
      setUserPhotoPreview(reader.result);
      setGeneratedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!userPhoto || !product) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/try-on`, {
        user_photo_base64: userPhoto,
        product_image_url: product.thumbnail,
        product_title: product.title
      }, { timeout: 120000 });
      setGeneratedImage(`data:image/png;base64,${res.data.generated_image_base64}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Try-on failed. Try a different photo.");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-testid="try-on-modal"
        className="max-w-3xl bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-400" />
              AI Virtual Try-On
            </DialogTitle>
            <p className="text-zinc-400 text-sm mt-1">{product.title}</p>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Upload/User Photo */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-medium">Your Photo</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] bg-zinc-800 rounded-xl border-2 border-dashed border-zinc-700 hover:border-purple-500 transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
              >
                {userPhotoPreview ? (
                  <img src={userPhotoPreview} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Upload your photo</p>
                    <p className="text-zinc-600 text-xs mt-1">Full body works best</p>
                  </div>
                )}
              </div>
              <input
                data-testid="tryon-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Result */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-medium">Try-On Result</label>
              <div className="aspect-[3/4] bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center relative">
                {loading ? (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                    <p className="text-zinc-300 text-sm">Generating your look...</p>
                    <p className="text-zinc-500 text-xs">This takes 20-40 seconds</p>
                  </div>
                ) : generatedImage ? (
                  <img src={generatedImage} alt="Try-on result" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-zinc-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Upload a photo and click Try On</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <Button
            data-testid="tryon-generate-btn"
            onClick={handleTryOn}
            disabled={!userPhoto || loading}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 py-6 text-lg rounded-xl disabled:opacity-50"
          >
            {loading ? "Generating..." : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Try It On
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== Product Detail Modal =====
const ProductModal = ({ product, isOpen, onClose, solPrice, onTryOn }) => {
  const [loadingLink, setLoadingLink] = useState(false);

  if (!product) return null;

  const solAmount = product.extracted_price && solPrice
    ? (product.extracted_price / solPrice).toFixed(4)
    : null;

  const handleGoToWebsite = async () => {
    if (product.immersive_token) {
      setLoadingLink(true);
      try {
        const res = await axios.get(`${API}/product-link`, {
          params: { token: product.immersive_token }
        });
        if (res.data?.link) {
          window.open(res.data.link, "_blank", "noopener,noreferrer");
          setLoadingLink(false);
          return;
        }
      } catch (err) {
        console.error("Failed to get link", err);
      }
      setLoadingLink(false);
    }
    const q = encodeURIComponent(product.title + " " + (product.source || ""));
    window.open(`https://www.google.com/search?tbm=shop&q=${q}`, "_blank", "noopener,noreferrer");
  };

  const handlePayWithSol = () => {
    alert(`Mock Solana checkout: ${solAmount} SOL (~${product.price})\n\nIn production, this would open a Phantom wallet connection.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-testid="product-modal"
        className="max-w-2xl bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden"
      >
        <div className="grid md:grid-cols-2 gap-0">
          <div className="aspect-square bg-zinc-800 relative overflow-hidden">
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Sparkles className="w-16 h-16" />
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white leading-tight">
                {product.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 flex-1">
              <div className="text-3xl font-bold text-emerald-400">
                {product.price || "N/A"}
              </div>

              {solAmount && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400">≈</span>
                  <span className="text-purple-300 font-bold">◎ {solAmount} SOL</span>
                </div>
              )}

              {product.source && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Sold by</span>
                  <Badge className="bg-zinc-800 text-zinc-200">{product.source}</Badge>
                </div>
              )}

              {product.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"}`}
                      />
                    ))}
                  </div>
                  <span className="text-zinc-300 text-sm">
                    {product.rating} {product.reviews && `(${product.reviews.toLocaleString()})`}
                  </span>
                </div>
              )}

              {product.delivery && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm">{product.delivery}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-4">
              <Button
                data-testid="try-on-btn"
                onClick={() => onTryOn(product)}
                variant="outline"
                className="w-full bg-zinc-800 border-purple-500/50 hover:bg-purple-950 text-white py-5 rounded-xl"
              >
                <Wand2 className="w-4 h-4 mr-2 text-purple-400" />
                AI Try-On
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  data-testid="go-to-website-btn"
                  onClick={handleGoToWebsite}
                  disabled={loadingLink}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-5 rounded-xl"
                >
                  {loadingLink ? "Opening..." : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Shop
                    </>
                  )}
                </Button>
                <Button
                  data-testid="pay-sol-btn"
                  onClick={handlePayWithSol}
                  className="bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 py-5 rounded-xl"
                >
                  <Wallet className="w-4 h-4 mr-1" />
                  Pay SOL
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== Loading Grid =====
const LoadingGrid = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {[...Array(10)].map((_, i) => (
      <Card key={i} className="overflow-hidden bg-zinc-900/50 border-zinc-800">
        <Skeleton className="aspect-square bg-zinc-800" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <Skeleton className="h-4 w-2/3 bg-zinc-800" />
          <Skeleton className="h-6 w-1/2 bg-zinc-800" />
        </div>
      </Card>
    ))}
  </div>
);

// ===== Main App =====
function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [inspo, setInspo] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [solPrice, setSolPrice] = useState(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [trendRes, catRes, inspoRes, solRes] = await Promise.all([
          axios.get(`${API}/trending`),
          axios.get(`${API}/categories`),
          axios.get(`${API}/inspo`),
          axios.get(`${API}/sol-price`)
        ]);
        setTrending(trendRes.data.trending || []);
        setCategories(catRes.data.categories || []);
        setInspo(inspoRes.data.inspo || []);
        setSolPrice(solRes.data.usd_per_sol || 150);
      } catch (e) {
        console.error("Initial fetch failed", e);
      }
    };
    fetchInitial();
  }, []);

  const handleSearch = useCallback(async (query, category) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = { q: query, num: 40 };
      if (category && category !== "all") {
        const cat = categories.find(c => c.id === category);
        if (cat) params.category = cat.name;
      }
      const response = await axios.get(`${API}/search`, { params });
      setProducts(response.data.products || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Search failed. Try again.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchQuery, activeCategory);
  };

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (searchQuery) handleSearch(searchQuery, catId);
  };

  const handleTrendingClick = (term) => {
    setSearchQuery(term);
    handleSearch(term, activeCategory);
  };

  const handleInspoClick = (item) => {
    setSearchQuery(item.query);
    handleSearch(item.query, activeCategory);
    window.scrollTo({ top: 600, behavior: "smooth" });
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleTryOn = (product) => {
    setModalOpen(false);
    setTryOnProduct(product);
    setTryOnOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">
              Thread<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">ed</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {solPrice && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs">
                <span className="text-purple-400 font-bold">◎ SOL</span>
                <span className="text-zinc-400">${solPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>powered by</span>
              <img src={MESA_LOGO} alt="MESA" className="h-6 w-auto object-contain" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-600/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-950/40 border border-purple-500/30 rounded-full text-xs text-purple-300 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              <span>AI-powered clothing marketplace</span>
            </div>

            <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
              Find your next<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                favorite fit.
              </span>
            </h2>

            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Search thousands of stores. Try it on with AI. Pay with crypto.
            </p>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto pt-4">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    data-testid="search-input"
                    type="text"
                    placeholder="Search for clothing, shoes, accessories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-6 text-lg bg-zinc-900/80 border-zinc-700 rounded-2xl focus:border-purple-500 text-white placeholder:text-zinc-500"
                  />
                </div>
                <Button
                  data-testid="search-button"
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="px-8 py-6 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-2xl font-semibold text-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Search"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      {categories.length > 0 && (
        <div className="border-y border-zinc-900 bg-zinc-950/60 sticky top-16 z-30 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon] || Layers;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    data-testid={`category-${cat.id}`}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-center">
            {error}
          </div>
        )}

        {loading && <LoadingGrid />}

        {!loading && products.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-200">
              {products.length} results for "{searchQuery}"
            </h2>
            <div
              data-testid="product-grid"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={handleProductClick}
                  solPrice={solPrice}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && hasSearched && products.length === 0 && !error && (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-900 flex items-center justify-center">
              <Search className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300">No results found</h3>
            <p className="text-zinc-500">Try a different search term</p>
          </div>
        )}

        {/* Landing: Trending + Inspo */}
        {!hasSearched && !loading && (
          <div className="space-y-12">
            {/* Trending Tags */}
            {trending.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold">Trending Right Now</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trending.map((term, idx) => (
                    <button
                      key={idx}
                      data-testid={`trending-tag-${idx}`}
                      onClick={() => handleTrendingClick(term)}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-zinc-300 hover:bg-zinc-800 hover:border-purple-500/50 hover:text-white transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inspo Grid */}
            {inspo.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <h2 className="text-xl font-bold">Style Inspo</h2>
                  <span className="text-zinc-500 text-sm">· curated aesthetics</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {inspo.map((item, idx) => (
                    <button
                      key={item.id}
                      data-testid={`inspo-${item.id}`}
                      onClick={() => handleInspoClick(item)}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-800 hover:border-purple-500 transition-all text-left"
                      style={{
                        background: `linear-gradient(135deg, 
                          hsl(${(idx * 47) % 360}, 70%, 25%) 0%, 
                          hsl(${(idx * 47 + 60) % 360}, 60%, 15%) 100%)`
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <h3 className="font-bold text-white text-lg mb-1 group-hover:translate-y-[-2px] transition-transform">
                          {item.title}
                        </h3>
                        <p className="text-white/70 text-xs">{item.vibe}</p>
                      </div>
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feature cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <Wand2 className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">AI Try-On</h3>
                <p className="text-zinc-500 text-sm">Upload your photo and see yourself in any outfit instantly.</p>
              </Card>

              <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-fuchsia-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">Pay with SOL</h3>
                <p className="text-zinc-500 text-sm">Checkout instantly with Solana. Fast, low fees, crypto-native.</p>
              </Card>

              <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Grid3x3 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">Every Store</h3>
                <p className="text-zinc-500 text-sm">Shop thousands of retailers in one place. Real-time prices.</p>
              </Card>
            </div>
          </div>
        )}
      </main>

      <ProductModal
        product={selectedProduct}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        solPrice={solPrice}
        onTryOn={handleTryOn}
      />

      <TryOnModal
        product={tryOnProduct}
        isOpen={tryOnOpen}
        onClose={() => setTryOnOpen(false)}
      />

      <footer className="border-t border-zinc-900 py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <p className="text-zinc-600 text-sm">Threaded · built for MESA hackathon</p>
          <img src={MESA_LOGO} alt="MESA" className="h-8 w-auto object-contain opacity-60" />
        </div>
      </footer>
    </div>
  );
}

export default App;
