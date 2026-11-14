# html2img

Turn **HTML + CSS into an image** — PNG, JPEG, or WebP — over a simple HTTP API.
No headless browser, no Chromium. Powered by [Takumi](https://takumi.kane.tw).

- 🚀 Fast native render engine (Rust, Chromium-ported text/layout)
- 🎨 Real CSS: grid, flex, gradients, shadows, filters, blend modes, `clip-path`, pseudo-elements
- 🧩 Zero-config Vercel deployment (serverless function)
- 🖼️ Perfect for OG / social preview images, dynamic banners, certificates, cards

## API

### `POST /api` — one-shot conversion

Send your markup, get the image bytes back. The API deliberately does **not** serve
embeddable image URLs: you convert once, store the result on your side (disk, S3,
your own CDN), and serve it from there. That way a hotlinked request can never
trigger a re-render on the server. `GET` returns the docs JSON, never an image.

| Param | Type | Description |
|-------|------|-------------|
| `html` | string | HTML markup to render (**required** unless `url` is given) |
| `url` | string | Download an `.html` file link **or** a live website URL and render it (see [Rendering from a URL](#rendering-from-a-url)) |
| `css` | string | Extra global CSS applied before rendering |
| `width` | number | Image width in px, `16–4000` (default `1200`) |
| `height` | number | Image height in px, `16–4000` (default `630`) |
| `format` | string | `png` \| `jpeg` \| `webp` (default `png`) |
| `quality` | number | `1–100`, for `jpeg`/`webp` (default `90`) |
| `fonts` | array | Google Fonts to load, e.g. `[{"name":"Noto Sans Devanagari"},{"name":"Inter","weight":"400..700"}]` |
| `fontUrl` | string | URL of a custom font file (`.woff2` / `.ttf` / `.otf`) to load |

### Example

```bash
curl -X POST "$BASE/api" \
  -H "content-type: application/json" \
  -d '{"html":"<h1 style=\"font-family:sans-serif\">Hello</h1>","width":1200,"height":630}' \
  -o out.png
```

```js
const res = await fetch(`${base}/api`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ html, width: 1200, height: 630 }),
});
await writeFile("out.png", Buffer.from(await res.arrayBuffer()));
```

## Rendering from a URL

Instead of inline `html`, you can pass a `url` and the API downloads it and renders it.
It handles **both** cases the same way — a direct `.html` file download link and a live
website URL:

```bash
# a raw .html file link
curl -X POST "$BASE/api" -H "content-type: application/json" \
  -d '{"url":"https://raw.githubusercontent.com/user/repo/main/page.html","width":1200,"height":630}' \
  -o out.png

# a live website
curl -X POST "$BASE/api" -H "content-type: application/json" \
  -d '{"url":"https://example.com","width":1200,"height":630}' \
  -o out.png
```

The API fetches the URL's body as text and renders it. `url` is only used when `html`
is not supplied (if both are present, `html` wins).

### What renders well (and what does not)

The renderer gets the **HTML text only** — it does not resolve a base URL or bundle the
page's assets. So fidelity depends on how the page loads its styling:

| Page uses | Fetched + rendered | Visual result |
|-----------|--------------------|---------------|
| Inline styles / `<style>` blocks | ✅ | ✅ accurate |
| Absolute asset URLs (`https://.../img.png`) | ✅ | ✅ images load |
| Relative paths (`href="style.css"`, `src="logo.png"`) | ✅ | ❌ missing (no base URL) |
| External `<link rel="stylesheet">` | ✅ | ❌ CSS not applied |

In short: any URL is **fetched and rendered**, but a page that leans on external
stylesheets or relative assets will only show its inline-styled content.

## Writing HTML for the renderer

The engine is powerful (real CSS), but a few patterns behave differently from a
browser. Follow these recipes so your HTML renders correctly the first time.

### Images & overlays

Photos must come from a real `<img>` with an **absolute URL**, and the image should
stay in normal flow. Overlays go in absolutely positioned layers.

```html
<div style="position:relative;width:100%;height:100%;overflow:hidden">
  <!-- 1. photo: NOT absolute, fills the canvas -->
  <img src="https://example.com/photo.jpg"
       style="width:100%;height:100%;object-fit:cover;filter:saturate(1.3)">

  <!-- 2. scrim: a leaf layer with all four sides set -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;
              background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.92))"></div>

  <!-- 3. text: anchor from TOP with a px offset -->
  <div style="position:absolute;left:40px;top:600px;color:#fff;font-size:60px;font-weight:900">Title</div>
</div>
```

| ❌ Avoid | ✅ Instead |
|----------|-----------|
| `<img style="position:absolute;inset:0;width:100%;height:100%">` (blank) | keep `<img>` in normal flow with `width:100%;height:100%;object-fit:cover` |
| Absolute `<img>` sized in `%` | if you must position an `<img>`, give it explicit **px** size |
| `background-image:url(photo)` | use an `<img>` element (CSS backgrounds are not fetched) |
| `position:absolute; bottom:20px` (only bottom) | always set **`top`** (px); for bottom placement use `top:(H − box − gap)px` |
| `display:flex; justify-content:flex-end` on an absolute overlay | use plain absolute children with `top`/`left` |

### Text, symbols & fonts

The only built-in font is **Geist**, which covers **Latin (weights 300–800)**. Any
glyph outside that renders as a **tofu box (❌)** — e.g. `→`, `✓`, `₹`, CJK, Devanagari.

- **Emoji** are automatically substituted with **twemoji images**, so they render fine
  (needs outbound network). Complex ZWJ emoji may vary.
- **Plain symbols** (`→`, `✓`, `⇒`, …) are *not* emoji, so they need a font that
  contains them.

Fix options for missing glyphs:

1. Use ASCII look-alikes: `->`, `·`, `|`, `-` (always safe).
2. Draw the glyph as an `<svg>` or `<img>` (font-independent).
3. Load a font that has the glyph via the `fonts` param:

```bash
curl -X POST "$BASE/api" -H "content-type: application/json" \
  -d '{"html":"<div style=\"font-family:Noto Sans Devanagari;font-size:60px\">नमस्ते दुनिया</div>",
       "fonts":[{"name":"Noto Sans Devanagari"}],"width":900,"height":300}' \
  -o out.png
```

`fontUrl` loads a custom font file directly:

```json
{ "html": "...", "fontUrl": "https://example.com/Inter.woff2" }
```

> Use the same family name in `font-family` as the font you load (Google Fonts
> `name`, or the font file's internal name for `fontUrl`).

## Local development

```bash
npm install
npm run dev      # http://localhost:3000  (playground + API)
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: **Other** · leave build settings empty.
4. Deploy. Your endpoint is live at `https://<project>.vercel.app/api`.

Or with the CLI:

```bash
npm i -g vercel
vercel --prod
```

## Notes

- **Conversion only, on purpose.** There is no embeddable `GET` image URL. Each `POST` renders once; store the bytes and serve them from your own storage/CDN so your server is never hit by a hotlinked `<img>`.
- Takumi never reads system fonts. The built-in **Geist** covers Latin only; other scripts and symbols need an explicit font via the `fonts` / `fontUrl` params. See [Text, symbols & fonts](#text-symbols--fonts).
- Emoji are substituted with twemoji images automatically (needs outbound network); plain symbols like `→` are not emoji and render as tofu unless a font provides them.
- Image layering has quirks — see [Images & overlays](#images--overlays) before writing photo + overlay HTML.
- `url` mode accepts a direct `.html` file link or a live website URL, but renders the fetched HTML text only — external stylesheets and relative assets are not resolved. See [Rendering from a URL](#rendering-from-a-url).
- 3D transforms (`rotateY`, `perspective`, …) are not supported yet.

## License

MIT © [Badal](https://github.com/badman99dev)
