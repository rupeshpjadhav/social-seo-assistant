import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  HttpError,
  formatErrorMessage,
  handleYouTube,
  handleInstagram,
  handleIdeas,
  handleThumbnail,
  handleReelCover,
  handleEditThumbnail,
} from "./lib/geminiHandlers.js";

const app = express();
const PORT = 3000;

// Enable JSON parsing with a large size limit to support base64 image editing uploads
app.use(express.json({ limit: "50mb" }));

function registerPostRoute(routePath: string, handler: (body: any) => Promise<any>) {
  app.post(routePath, async (req, res) => {
    try {
      const result = await handler(req.body);
      res.json(result);
    } catch (error: any) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      const errorMsg = formatErrorMessage(error);
      console.error(`Error in ${routePath}:`, errorMsg);
      res.status(status).json({ error: errorMsg });
    }
  });
}

// API endpoints
registerPostRoute("/api/youtube", handleYouTube);
registerPostRoute("/api/instagram", handleInstagram);
registerPostRoute("/api/ideas", handleIdeas);
registerPostRoute("/api/thumbnail", handleThumbnail);
registerPostRoute("/api/reel-cover", handleReelCover);
registerPostRoute("/api/edit-thumbnail", handleEditThumbnail);

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
