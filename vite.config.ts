import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs/promises";
import { componentTagger } from "lovable-tagger";

const DATASET_ROOT =
  process.env.VITE_LOCAL_DATASET_PATH || path.resolve(__dirname, "./datasets");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    middlewareMode: false,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "visualization-static-datasets",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/visualization/")) return next();

          const urlPath = decodeURIComponent(req.url.split("?")[0] || "");

          // Let the SPA handle non-file paths without an extension.
          if (!path.extname(urlPath.replace(/\/$/, ""))) {
            return next();
          }

          const segments = urlPath
            .replace(/^\/visualization\//, "")
            .split("/")
            .filter(Boolean);

          const droppedLocal =
            segments[0] === "local" ? segments.slice(1) : segments.slice();

          const candidates = [droppedLocal, segments];
          const rootResolved = path.resolve(DATASET_ROOT);

          const getContentType = (filePath: string) => {
            const ext = path.extname(filePath).toLowerCase();
            if (ext === ".json") return "application/json";
            if (ext === ".parquet") return "application/octet-stream";
            if (ext === ".mp4") return "video/mp4";
            if (ext === ".log" || ext === ".txt")
              return "text/plain; charset=utf-8";
            return undefined;
          };

          for (const candidate of candidates) {
            if (!candidate.length) continue;
            const resolved = path.resolve(DATASET_ROOT, ...candidate);
            if (!resolved.startsWith(rootResolved)) continue;
            try {
              const stats = await fs.stat(resolved);
              if (stats.isDirectory()) continue;
              const data = await fs.readFile(resolved);
              const contentType = getContentType(resolved);
              if (contentType) res.setHeader("Content-Type", contentType);
              res.statusCode = 200;
              res.end(data);
              return;
            } catch (err: any) {
              if (err?.code === "ENOENT") {
                console.warn("[visualization middleware] ENOENT", resolved);
                continue;
              }
              console.error("[visualization middleware] error", err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Failed to serve dataset file" }));
              return;
            }
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
