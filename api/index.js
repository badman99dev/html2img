import { renderImage, parseOptions, normalizeHtml, LIMITS, FORMATS } from "../lib/render.js";

export const config = { maxDuration: 30 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const USAGE = {
  endpoint: "GET or POST /api",
  params: {
    html: "HTML markup to render (required unless url is given)",
    url: "Fetch a remote page and render it (best-effort, external CSS/fonts may not load)",
    css: "Extra global CSS applied before rendering",
    width: `Image width in px, ${LIMITS.width.min}-${LIMITS.width.max} (default ${LIMITS.width.fallback})`,
    height: `Image height in px, ${LIMITS.height.min}-${LIMITS.height.max} (default ${LIMITS.height.fallback})`,
    format: `Output format: ${Object.keys(FORMATS).join(" | ")} (default png)`,
    quality: `Quality for jpeg/webp, ${LIMITS.quality.min}-${LIMITS.quality.max} (default ${LIMITS.quality.fallback})`,
  },
  examples: {
    get: "/api?html=%3Ch1%3EHello%3C%2Fh1%3E&width=1200&height=630",
    post: 'curl -X POST /api -H "content-type: application/json" -d \'{"html":"<h1>Hi</h1>"}\' -o out.png',
  },
};

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data, null, 2));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return Buffer.isBuffer(req.body) ? {} : {};

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (!["GET", "POST"].includes(req.method)) {
    return json(res, 405, { error: `Method ${req.method} not allowed`, usage: USAGE });
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  let params;
  if (req.method === "POST") {
    try {
      params = await readBody(req);
    } catch (error) {
      return json(res, 400, { error: "Invalid request body", detail: String(error.message || error) });
    }
  } else {
    params = Object.fromEntries(url.searchParams.entries());
  }

  let html = typeof params.html === "string" ? params.html : "";

  if (!html && params.url) {
    try {
      const upstream = await fetch(params.url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; html2img/1.0)" },
        redirect: "follow",
      });
      if (!upstream.ok) throw new Error(`upstream responded ${upstream.status}`);
      html = normalizeHtml(await upstream.text());
    } catch (error) {
      return json(res, 502, { error: "Failed to fetch url", detail: String(error.message || error) });
    }
  }

  if (!html) {
    return json(res, 400, { error: "Missing 'html' (or 'url') parameter", usage: USAGE });
  }

  try {
    const { buffer, contentType, options } = await renderImage({
      html,
      css: typeof params.css === "string" ? params.css : "",
      width: params.width,
      height: params.height,
      format: params.format,
      quality: params.quality,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Image-Width", options.width);
    res.setHeader("X-Image-Height", options.height);
    res.setHeader("X-Image-Format", options.format);
    res.end(buffer);
  } catch (error) {
    return json(res, 500, { error: "Render failed", detail: String(error.message || error) });
  }
}
