/**
 * Try-On Studio - Isolated drag-and-drop virtual try-on feature.
 * Lives in its own subdirectory to not interfere with main app.
 */
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, Upload, X, Wand2, RotateCcw, Search,
  Download, Sparkles
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api/tryon-studio`;

// ===== Webcam Capture =====
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 720, height: 960 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      } catch (e) {
        setError("Camera access denied. Please upload a photo instead.");
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl p-4 max-w-md w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white">Take Your Photo</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error ? (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} className="hidden" />
            <Button
              data-testid="studio-capture-btn"
              onClick={takePhoto}
              disabled={!streaming}
              className="w-full mt-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 py-5"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Draggable Clothing Item =====
function DraggableItem({ item, onDragStart, onClick }) {
  return (
    <div
      data-testid={`studio-item-${item.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(item));
        onDragStart(item);
      }}
      onClick={() => onClick(item)}
      className="group relative aspect-square bg-zinc-800 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-purple-500 transition-all"
      title={item.title}
    >
      <img
        src={item.thumbnail}
        alt={item.title}
        className="w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[10px] line-clamp-1 font-medium">
          {item.title}
        </p>
        {item.price && (
          <p className="text-emerald-400 text-[10px] font-bold">{item.price}</p>
        )}
      </div>
    </div>
  );
}

// ===== Main Try-On Studio =====
export default function TryOnStudio({ isOpen, onClose }) {
  const [modelPhoto, setModelPhoto] = useState(null); // dataURL
  const [resultImage, setResultImage] = useState(null);
  const [closet, setCloset] = useState([]);
  const [closetQuery, setClosetQuery] = useState("trending outfit");
  const [closetLoading, setClosetLoading] = useState(false);
  const [tryingOn, setTryingOn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastItem, setLastItem] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setModelPhoto(null);
      setResultImage(null);
      setError(null);
      setTryingOn(false);
    }
  }, [isOpen]);

  // Load closet on open
  useEffect(() => {
    if (isOpen) loadCloset("trending outfit");
  }, [isOpen]);

  const loadCloset = async (query) => {
    setClosetLoading(true);
    try {
      const res = await axios.get(`${API}/closet`, {
        params: { q: query, num: 24 }
      });
      setCloset(res.data.items || []);
    } catch (e) {
      console.error("Closet load failed", e);
    } finally {
      setClosetLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setModelPhoto(reader.result);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const runTryOn = async (item) => {
    const photo = resultImage || modelPhoto;
    if (!photo) {
      setError("Please add your photo first");
      return;
    }
    setTryingOn(true);
    setError(null);
    setLastItem(item);
    try {
      const res = await axios.post(
        `${API}/try-on`,
        {
          model_photo_base64: photo,
          clothing_image_url: item.thumbnail,
          clothing_title: item.title
        },
        { timeout: 120000 }
      );
      setResultImage(`data:image/png;base64,${res.data.result_image_base64}`);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || "Try-on failed. Try again.");
    } finally {
      setTryingOn(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const data = e.dataTransfer.getData("application/json");
    if (data) {
      try {
        const item = JSON.parse(data);
        runTryOn(item);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const reset = () => {
    setModelPhoto(null);
    setResultImage(null);
    setError(null);
    setLastItem(null);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "threaded-tryon.png";
    a.click();
  };

  const displayImage = resultImage || modelPhoto;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          data-testid="studio-modal"
          className="max-w-6xl w-[95vw] h-[90vh] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Try-On Studio</h2>
                <p className="text-[11px] text-zinc-500">Drag clothes onto your photo to try them on</p>
              </div>
            </div>
            <div className="flex gap-2">
              {displayImage && (
                <Button
                  data-testid="studio-reset-btn"
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
              {resultImage && (
                <Button
                  data-testid="studio-download-btn"
                  size="sm"
                  onClick={downloadResult}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Canvas - Model Photo Area */}
            <div className="flex-1 p-5 flex items-center justify-center bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden transition-all ${
                  dragOver
                    ? "ring-4 ring-purple-500 ring-offset-4 ring-offset-zinc-950 scale-[1.02]"
                    : "ring-1 ring-zinc-800"
                } ${!displayImage ? "bg-zinc-900 border-2 border-dashed border-zinc-700" : ""}`}
              >
                {displayImage ? (
                  <>
                    <img
                      src={displayImage}
                      alt="Model"
                      className="w-full h-full object-cover"
                    />
                    {tryingOn && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="w-14 h-14 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                          <p className="text-white font-medium">Styling you...</p>
                          {lastItem && (
                            <p className="text-zinc-400 text-xs max-w-[200px]">
                              {lastItem.title}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {dragOver && !tryingOn && (
                      <div className="absolute inset-0 bg-purple-600/30 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Sparkles className="w-12 h-12 text-white mx-auto animate-pulse" />
                          <p className="text-white font-bold text-xl">Drop to try on!</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-5">
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Camera className="w-10 h-10 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Add your photo</h3>
                      <p className="text-zinc-500 text-sm mt-1">
                        Upload or take a selfie to start
                      </p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        data-testid="studio-camera-btn"
                        onClick={() => setShowCamera(true)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Camera
                      </Button>
                      <Button
                        data-testid="studio-upload-btn"
                        onClick={() => fileRef.current?.click()}
                        variant="outline"
                        className="flex-1 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Closet */}
            <div className="w-80 border-l border-zinc-800 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-zinc-800">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Closet
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="studio-search-input"
                    value={closetQuery}
                    onChange={(e) => setClosetQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadCloset(closetQuery);
                    }}
                    placeholder="Search items..."
                    className="pl-9 h-9 text-sm bg-zinc-900 border-zinc-700"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Drag an item onto your photo →
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {closetLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="aspect-square bg-zinc-800 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : closet.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {closet.map((item) => (
                      <DraggableItem
                        key={item.id}
                        item={item}
                        onDragStart={() => {}}
                        onClick={runTryOn}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm text-center py-8">
                    No items found
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 border-t border-zinc-800 bg-red-950/30 text-red-300 text-xs">
                  {error}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setModelPhoto(dataUrl);
            setResultImage(null);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
