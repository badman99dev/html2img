import { render } from "takumi-js";
import { writeFile } from "node:fs/promises";

const SRC = "https://picsum.photos/800/800";

const cell = (label, extraStyle = "", overlay = "") => `
<div style="position:relative;overflow:hidden;border-radius:0;background:#111">
  <img src="${SRC}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${extraStyle}">
  ${overlay}
  <div style="position:absolute;left:14px;top:12px;padding:5px 11px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:15px;font-weight:700;font-family:sans-serif">${label}</div>
</div>`;

const html = `
<div style="width:100%;height:100%;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;background:#0b0e14;font-family:sans-serif">

  ${cell("1 · original")}

  ${cell("2 · grayscale + contrast", "filter:grayscale(1) contrast(1.25)")}

  ${cell("3 · sepia / hue-rotate", "filter:sepia(.7) hue-rotate(180deg) saturate(1.6)")}

  ${cell(
    "4 · overlay + text + shape",
    "filter:saturate(1.3)",
    `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 25%,rgba(10,12,20,.9) 100%)"></div>
     <div style="position:absolute;left:20px;bottom:18px;color:#fff">
       <div style="font-size:30px;font-weight:900;letter-spacing:-.02em">HELLO EDIT</div>
       <div style="font-size:15px;opacity:.85;margin-top:2px">overlay · gradient · rounded avatar</div>
     </div>
     <div style="position:absolute;right:16px;bottom:16px;width:56px;height:56px;border-radius:50%;background:conic-gradient(from 45deg,#22d3ee,#a78bfa,#f472b6,#22d3ee);border:3px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.5)"></div>`
  )}

</div>`;

const png = await render(html, { width: 1000, height: 1000, images: {} });
await writeFile("edited.png", png);
console.log("OK bytes:", png.length);