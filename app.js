'use strict';

// Twibbon Maker — Sirkumboy. Layer 1 = user photo (movable),
// layer 2 = fixed frame PNG. Canvas matches frame native size.

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const els = {
  stage: document.getElementById('stage'),
  hint: document.getElementById('stageHint'),
  frameInput: document.getElementById('frameInput'),
  photoInput: document.getElementById('photoInput'),
  editorBlock: document.getElementById('editorBlock'),
  zoom: document.getElementById('zoom'),
  zoomVal: document.getElementById('zoomVal'),
  rotate: document.getElementById('rotate'),
  rotateVal: document.getElementById('rotateVal'),
  resetBtn: document.getElementById('resetBtn'),
  centerBtn: document.getElementById('centerBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
};

const FRAME_SRC = 'LASER TWIBBON (1350 x 1080 px).png';

const state = {
  frame: null,            // Image (layer 2)
  photo: null,            // Image (layer 1)
  W: 0, H: 0,             // canvas size = frame native size
  win: null,              // transparent window rect {x,y,w,h} the photo fills
  x: 0, y: 0,             // photo center (canvas px)
  zoom: 1,                // multiplier over coverScale
  rotation: 0,            // radians
  coverScale: 1,          // scale that covers the window
};

// Detect the transparent window by alpha bbox; full canvas if opaque/tainted.
function detectWindow(img, W, H) {
  try {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ox = off.getContext('2d', { willReadFrequently: true });
    ox.drawImage(img, 0, 0, W, H);
    const data = ox.getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    const ALPHA = 16, step = 2;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] < ALPHA) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return { x: 0, y: 0, w: W, h: H };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  } catch (e) {
    return { x: 0, y: 0, w: W, h: H };
  }
}

function loadFrame(img) {
  const apply = () => {
    state.frame = img;
    state.W = img.naturalWidth;
    state.H = img.naturalHeight;
    canvas.width = state.W;
    canvas.height = state.H;
    els.stage.style.aspectRatio = `${state.W} / ${state.H}`;
    state.win = detectWindow(img, state.W, state.H);
    if (state.photo) fitPhoto(true);
    els.hint.classList.add('hidden');
    updateDownloadState();
    render();
  };
  if (img.complete && img.naturalWidth) apply();
  else img.onload = apply;
}

function loadPhoto(img) {
  state.photo = img;
  fitPhoto(true);
  els.editorBlock.hidden = false;
  els.hint.classList.add('hidden');
  updateDownloadState();
  render();
}

// Cover-fit the photo into the transparent window, reset transform.
function fitPhoto(resetTransform) {
  if (!state.photo) return;
  const win = state.win || { x: 0, y: 0, w: state.W, h: state.H };
  state.coverScale = Math.max(
    win.w / state.photo.naturalWidth,
    win.h / state.photo.naturalHeight
  );
  if (resetTransform) {
    state.x = win.x + win.w / 2;
    state.y = win.y + win.h / 2;
    state.zoom = 1;
    state.rotation = 0;
    els.zoom.value = '1';
    els.rotate.value = '0';
    syncLabels();
  }
}

function syncLabels() {
  els.zoomVal.textContent = Math.round(state.zoom * 100) + '%';
  els.rotateVal.textContent = Math.round(state.rotation * 180 / Math.PI) + '°';
}

function render() {
  ctx.clearRect(0, 0, state.W, state.H);
  if (state.photo) {
    const s = state.coverScale * state.zoom;
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.rotation);
    ctx.scale(s, s);
    ctx.drawImage(state.photo,
      -state.photo.naturalWidth / 2, -state.photo.naturalHeight / 2);
    ctx.restore();
  }
  if (state.frame) ctx.drawImage(state.frame, 0, 0, state.W, state.H);
}

// --- Pointer: drag + two-finger pinch (zoom & rotate) ---
const pointers = new Map();
let dragStart = null;
let pinchStart = null;

function toCanvasCoords(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (state.W / r.width),
    y: (clientY - r.top) * (state.H / r.height),
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (!state.photo) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.classList.add('dragging');
  if (pointers.size === 1) {
    const p = toCanvasCoords(e.clientX, e.clientY);
    dragStart = { px: p.x, py: p.y, ox: state.x, oy: state.y };
  } else if (pointers.size === 2) {
    beginPinch();
    dragStart = null;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1 && dragStart) {
    const p = toCanvasCoords(e.clientX, e.clientY);
    state.x = dragStart.ox + (p.x - dragStart.px);
    state.y = dragStart.oy + (p.y - dragStart.py);
    render();
  } else if (pointers.size === 2 && pinchStart) {
    updatePinch();
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 1) {
    const [only] = [...pointers.values()];
    const p = toCanvasCoords(only.x, only.y);
    dragStart = { px: p.x, py: p.y, ox: state.x, oy: state.y };
  }
  if (pointers.size === 0) {
    dragStart = null;
    canvas.classList.remove('dragging');
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function pinchInfo() {
  const pts = [...pointers.values()];
  const dx = pts[0].x - pts[1].x;
  const dy = pts[0].y - pts[1].y;
  return { dist: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
}

function beginPinch() {
  const info = pinchInfo();
  pinchStart = {
    dist: info.dist, angle: info.angle,
    zoom: state.zoom, rotation: state.rotation,
  };
}

function updatePinch() {
  const info = pinchInfo();
  if (!pinchStart || pinchStart.dist === 0) return;
  state.zoom = clamp(pinchStart.zoom * (info.dist / pinchStart.dist), 0.2, 4);
  state.rotation = pinchStart.rotation + (info.angle - pinchStart.angle);
  els.zoom.value = String(state.zoom);
  els.rotate.value = String(Math.round(state.rotation * 180 / Math.PI));
  syncLabels();
  render();
}

canvas.addEventListener('wheel', (e) => {
  if (!state.photo) return;
  e.preventDefault();
  state.zoom = clamp(state.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06), 0.2, 4);
  els.zoom.value = String(state.zoom);
  syncLabels();
  render();
}, { passive: false });

// --- Slider controls ---
els.zoom.addEventListener('input', () => {
  state.zoom = parseFloat(els.zoom.value);
  syncLabels();
  render();
});

els.rotate.addEventListener('input', () => {
  state.rotation = parseFloat(els.rotate.value) * Math.PI / 180;
  syncLabels();
  render();
});

els.resetBtn.addEventListener('click', () => { fitPhoto(true); render(); });

els.centerBtn.addEventListener('click', () => {
  const win = state.win || { x: 0, y: 0, w: state.W, h: state.H };
  state.x = win.x + win.w / 2;
  state.y = win.y + win.h / 2;
  render();
});

// --- File inputs ---
function readFileToImage(file, cb) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => cb(img);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

els.frameInput.addEventListener('change', (e) =>
  readFileToImage(e.target.files[0], loadFrame));
els.photoInput.addEventListener('change', (e) =>
  readFileToImage(e.target.files[0], loadPhoto));

// --- Download (native frame resolution) ---
function updateDownloadState() {
  els.downloadBtn.disabled = !(state.frame && state.photo);
}

els.downloadBtn.addEventListener('click', () => {
  render();
  let url;
  try {
    url = canvas.toDataURL('image/png');
  } catch (err) {
    alert('Export blocked (canvas tainted). Serve the site over http, not file://.');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = 'twibbon-sirkumboy.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// Auto-load bundled frame.
const bundled = new Image();
bundled.onload = () => loadFrame(bundled);
bundled.src = FRAME_SRC;

render();
