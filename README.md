# html2img

Turn **HTML + CSS into an image** — PNG, JPEG, or WebP — over a simple HTTP API.
No headless browser, no Chromium. Powered by [Takumi](https://takumi.kane.tw).

- 🚀 Fast native render engine (Rust, Chromium-ported text/layout)
- 🎨 Real CSS: grid, flex, gradients, shadows, filters, blend modes, `clip-path`, pseudo-elements
- 🧩 Zero-config Vercel deployment (serverless function)
- 🖼️ Perfect for OG / social preview images, dynamic banners, certificates, cards

## API

### `GET` or `POST /api`

| Param | Type | Description |
|-------|------|-------------|
| `html` | string | HTML markup to render (**required** unless `url` is given) |
| `url` | string | Fetch a remote page and render it (best-effort) |
| `css` | string | Extra global CSS applied before rendering |
| `width` | number | Image width in px, `16–4000` (default `1200`) |
| `height` | number | Image height in px, `16–4000` (default `630`) |
| `format` | string | `png` \| `jpeg` \| `webp` (default `png`) |
| `quality` | number | `1–100`, for `jpeg`/`webp` (default `90`) |

### Examples

```bash
# POST JSON
curl -X POST "$BASE/api" \
  -H "content-type: application/json" \
  -d '{"html":"<h1 style=\"font-family:sans-serif\">Hello</h1>","width":1200,"height":630}' \
  -o out.png
```

```bash
# GET with query params
curl "$BASE/api?html=%3Ch1%3EHello%3C%2Fh1%3E&width=1200&height=630" -o out.png
```

```html
<!-- embed directly -->
<img src="https://your-app.vercel.app/api?html=...&width=1200&height=630" />
```

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

- Takumi never reads system fonts. The built-in **Geist** covers Latin; other scripts need an explicit font (see `fonts` option in [Takumi docs](https://takumi.kane.tw/docs/fonts)).
- `url` mode fetches the page HTML only — external stylesheets/images are loaded best-effort by the engine.
- 3D transforms (`rotateY`, `perspective`, …) are not supported yet.

## License

MIT © [Badal](https://github.com/badman99dev)
