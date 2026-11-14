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
| `url` | string | Fetch a remote page and render it (best-effort) |
| `css` | string | Extra global CSS applied before rendering |
| `width` | number | Image width in px, `16–4000` (default `1200`) |
| `height` | number | Image height in px, `16–4000` (default `630`) |
| `format` | string | `png` \| `jpeg` \| `webp` (default `png`) |
| `quality` | number | `1–100`, for `jpeg`/`webp` (default `90`) |

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
- Takumi never reads system fonts. The built-in **Geist** covers Latin; other scripts need an explicit font (see `fonts` option in [Takumi docs](https://takumi.kane.tw/docs/fonts)).
- `url` mode fetches the page HTML only — external stylesheets/images are loaded best-effort by the engine.
- 3D transforms (`rotateY`, `perspective`, …) are not supported yet.

## License

MIT © [Badal](https://github.com/badman99dev)
