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
| `fonts` | array \| false | Google Fonts to load, e.g. `[{"name":"Noto Sans Devanagari"},{"name":"Inter","weight":"400..700"}]`. **Omit** to use the built-in Noto stack. `false` disables it (Geist only) |
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

By default the renderer loads a **Noto fallback stack**, so **Latin and non-Latin** text
render out of the box — you don't need to set `font-family`:

```
'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans SC', 'Noto Sans Symbols 2'
```

This covers Latin, Devanagari/Hindi, Chinese (CJK) and common symbols (`→`, `✓`, `₹`, …).
Emoji are automatically substituted with **twemoji images** (needs outbound network;
complex ZWJ emoji may vary).

> ⭐ **Recommended: set the font explicitly in your code.** The automatic default gives
> you *a* consistent look, but not *your* look — selected metrics and spacing can shift
> between environments and renderer versions. For a brand-accurate, reproducible image,
> load the exact font you want via `fonts` / `fontUrl` **and** set the matching
> `font-family`. This avoids the "random look" of auto-chosen fonts, so the image comes
> out exactly how you intend. Any `font-family` you write in the HTML overrides this
> default — the Noto stack is only a fallback, exactly like a browser.

- `fonts: false` disables the default stack (Geist only — non-Latin becomes tofu ❌).
- Emoji work automatically; **plain symbols** (`→`, `✓`, `⇒`, …) are not emoji, so they
  need a font that contains them (the default stack does).

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

#### Fonts in your HTML override the default (browser-like)

The `font-family` you set in your HTML/CSS **always wins** over the built-in default —
the renderer follows the normal CSS cascade, **exactly like a browser**. The default
Noto stack is only used for text that has **no (available) `font-family`**. You only
need to **load** the font you reference via `fonts` / `fontUrl`; if it isn't loaded, the
renderer falls back to the default stack (browser behaviour):

```bash
curl -X POST "$BASE/api" -H "content-type: application/json" \
  -d '{
    "html": "<div style=\"font-family:'"'"'Inter'"'"';font-size:40px;padding:40px;background:#fff\">Brand title <span style=\"font-family:'"'"'Tiro Devanagari Hindi'"'"'\">॥ श्री राम जय राम ॥</span></div>",
    "fonts": [{"name":"Inter"},{"name":"Tiro Devanagari Hindi"}],
    "width": 900, "height": 300
  }' -o out.png
```

- Outer `<div>` → **Inter** (overrides the default)
- Inner `<span>` → **Tiro Devanagari Hindi** (nested override)
- Text with no `font-family` → the default Noto stack
- A family referenced but **not loaded** → falls back to the default stack (just like a browser)

Passing `fonts` **replaces** the automatic stack, so add every family you use. Handy
decorative Devanagari (bhakti-style) options from Google Fonts:

| Font | Vibe |
|------|------|
| **Tiro Devanagari Hindi** | scriptural / book serif (recommended) |
| **Kalam** | handwritten, devotional feel |
| **Rozha One** | bold display, poster |
| **Yatra One** | festive decorative |

> Multi-word family names must be **quoted** in `font-family` (e.g. `'Tiro Devanagari Hindi'`).
> To keep Latin on Geist while adding a bhakti font, just apply `font-family` to the Hindi
> element only — the rest stays default.

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
- Takumi never reads system fonts. Omit `fonts` to use the built-in **Noto** fallback stack (Latin + Devanagari + CJK + symbols); for an exact look, always pass your font explicitly via `fonts` / `fontUrl`. See [Text, symbols & fonts](#text-symbols--fonts).
- Emoji are substituted with twemoji images automatically (needs outbound network); plain symbols like `→` are not emoji and render as tofu unless a font provides them.
- Image layering has quirks — see [Images & overlays](#images--overlays) before writing photo + overlay HTML.
- `url` mode accepts a direct `.html` file link or a live website URL, but renders the fetched HTML text only — external stylesheets and relative assets are not resolved. See [Rendering from a URL](#rendering-from-a-url).
- 3D transforms (`rotateY`, `perspective`, …) are not supported yet.

## License

MIT © [Badal](https://github.com/badman99dev)
