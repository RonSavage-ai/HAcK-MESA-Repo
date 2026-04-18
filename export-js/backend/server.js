import "dotenv/config";
import express from "express";
import cors from "cors";
import marketplaceRoutes from "./routes/marketplace.js";
import tryonStudioRoutes from "./routes/tryonStudio.js";

const app = express();
const PORT = process.env.PORT || 8001;

// Increase body limit for base64 image uploads (try-on feature)
app.use(express.json({ limit: "25mb" }));

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "*").split(","),
    credentials: true,
  })
);

// Health / root
app.get("/api/", (req, res) => {
  res.json({ message: "Threaded API - Clothing Marketplace" });
});

// Feature routers
app.use("/api", marketplaceRoutes);
app.use("/api/tryon-studio", tryonStudioRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ detail: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`Threaded backend running on http://localhost:${PORT}`);
});
