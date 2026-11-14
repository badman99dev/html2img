import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import handler from "./api/index.js";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = new URL("./public/", import.meta.url).pathname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return handler(req, res);
  }

  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(PUBLIC_DIR, normalize(path).replace(/^(\.\.[/\\])+/, ""));

  try {
    const file = await readFile(filePath);
    res.setHeader("Content-Type", TYPES[extname(filePath)] || "application/octet-stream");
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`html2img dev server → http://localhost:${PORT}`);
});
