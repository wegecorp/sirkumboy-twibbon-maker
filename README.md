# Sirkumboy Twibbon Maker

A lightweight, zero-dependency static web app for placing your photo behind the
**Sirkumboy "Sunat Laser Dioda"** campaign frame and exporting a ready-to-share PNG.

**Live:** https://wegecorp.github.io/sirkumboy-twibbon-maker/

## Features

- **Two-layer compositing** — your photo (layer 1) sits behind a fixed frame PNG (layer 2).
- **Position editor** — drag to move, zoom (slider · scroll wheel · pinch), rotate (slider · two-finger).
- **Auto window-fit** — the app scans the frame's transparent area and cover-fits your photo into it on upload.
- **Swappable frame** — ships with the Sirkumboy frame, but you can load any PNG with a transparent window.
- **Native-resolution export** — downloads at the frame's exact size (1350 × 1080) as PNG.
- **No build, no dependencies** — plain HTML, CSS, and Canvas API.

## Usage

1. Open the [live site](https://wegecorp.github.io/sirkumboy-twibbon-maker/).
2. Click **Upload photo**.
3. Drag / zoom / rotate until your photo sits right in the frame window.
4. Click **Download PNG**.

Optional: **Change frame** to swap in a different overlay PNG.

## Run locally

The frame is loaded over HTTP, so serve the folder rather than opening the file
directly (`file://` taints the canvas and blocks PNG export):

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then visit `http://localhost:8000`.

## Project structure

```
index.html   markup + controls
style.css    dark UI theme
app.js       canvas compositing, editor, export
LASER TWIBBON (1350 x 1080 px).png   the campaign frame
```

## How it works

- On load, the frame PNG is drawn to an offscreen canvas and its **transparent
  region** is found by alpha-channel bounding box (`detectWindow`).
- The uploaded photo is **cover-fit** into that region, then transformed via
  pointer/slider input (`translate → rotate → scale`).
- Each frame is rendered photo-first, frame-on-top; **Download** calls
  `canvas.toDataURL('image/png')` at native resolution.

## License

MIT
