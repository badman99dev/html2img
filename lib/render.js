import { ImageResponse } from "takumi-js/response";

export const FORMATS = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const LIMITS = {
  width: { min: 16, max: 4000, fallback: 1200 },
  height: { min: 16, max: 4000, fallback: 630 },
  quality: { min: 1, max: 100, fallback: 90 },
};

export function num(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function parseOptions(input = {}) {
  const requested = String(input.format || "png").toLowerCase();
  const format = FORMATS[requested.replace("jpg", "jpeg")] ? requested.replace("jpg", "jpeg") : "png";
  return {
    width: num(input.width, LIMITS.width),
    height: num(input.height, LIMITS.height),
    format,
    quality: num(input.quality, LIMITS.quality),
  };
}

/**
 * Normalizes raw fetched HTML for the renderer: quotes unquoted attribute
 * values and drops empty `lang`, which the engine rejects as an invalid BCP-47 tag.
 */
export function normalizeHtml(html) {
  return html.replace(/<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g, (_match, tag, attrs) => {
    const quoted = attrs.replace(
      /(\s)([a-zA-Z_:][-\w:.]*)\s*=\s*([^\s"'=<>`]+)/g,
      '$1$2="$3"'
    );
    const cleaned = quoted.replace(/\slang\s*=\s*""/gi, "");
    return `<${tag}${cleaned}>`;
  });
}

export function wrapDocument(html, css, background = "#ffffff") {
  if (/<html[\s>]/i.test(html)) return html;

  const reset = [
    `html,body{margin:0;padding:0;background:${background};}`,
    `*{box-sizing:border-box;}`,
    css || "",
  ].join("\n");

  return `<!doctype html><html><head><meta charset="utf-8"><style>${reset}</style></head><body>${html}</body></html>`;
}

export async function renderImage({ html, css = "", images, ...opts }) {
  const options = parseOptions(opts);
  const response = new ImageResponse(wrapDocument(html, css), {
    width: options.width,
    height: options.height,
    format: options.format,
    quality: options.format === "png" ? undefined : options.quality,
    images: images === false ? undefined : {
      throwOnError: false,
      timeout: 15000,
      maxBytes: 16 * 1024 * 1024,
      ...(typeof images === "object" ? images : {}),
    },
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType: FORMATS[options.format], options };
}
