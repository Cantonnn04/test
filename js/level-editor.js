const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const W = 640, H = 360;

let currentTool = 'mouse';
let objects = [];
let snapEnabled = false;
let selectedObj = null;
let isMoving    = false;
let isRotating  = false;
let dragHandle      = null; // active resize handle name, or null
let dragStart       = null; // { mouseX, mouseY, x, y, w, h } snapshot when drag began
let dragMoved       = false;
let turnaroundDrag  = null; // 'min' | 'max' | null
const mouse = { x: 0, y: 0, onCanvas: false };
const SNAP_THRESHOLD = 12;
const PORTAL_W = 14, PORTAL_H = 28;
let portalState = null; // null | 'first' | 'second'
const HANDLE_SIZE    = 7;
const HANDLE_HIT     = 7; // hit-test radius (px)
const HANDLE_CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
  w:  'ew-resize',                     e:  'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize',  se: 'nwse-resize',
};

// Default sizes when placing each tool
const DEFAULTS = {
  platform: { w: 80, h: 16 },
  moving:   { w: 80, h: 14 },
  wall:     { w: 16, h: 48 },
  spike:    { w: 50, h: 12 },
  ladder:   { w: 28, h: 60 },
  goal:     { w: 18, h: 18 },
  spawn:    { w: 24, h: 28 },
  turret:   { w: 24, h: 24 },
};

// ── Tool selection ──────────────────────────────────────────────────────
function selectTool(tool) {
  if (!tool) return;
  currentTool = tool;
  // Any tool switch clears selection, move, and rotate mode
  if (selectedObj || isMoving || isRotating) {
    selectedObj = null;
    isMoving    = false;
    isRotating  = false;
    document.querySelector('.move-btn').classList.remove('active');
    document.getElementById('rotate-mode-btn').classList.remove('active');
    hideProps();
  }
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  canvas.style.cursor = tool === 'mouse' ? 'default' : 'crosshair';
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => selectTool(btn.dataset.tool));
});

// ── Portal tool ─────────────────────────────────────────────────────────
function selectPortalTool() {
  currentTool = 'portal';
  portalState = 'first';
  if (selectedObj || isMoving) {
    selectedObj = null;
    isMoving = false;
    document.querySelector('.move-btn').classList.remove('active');
    hideProps();
  }
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('portal-btn').classList.add('active');
  canvas.style.cursor = 'crosshair';
  draw();
}

document.getElementById('portal-btn').addEventListener('click', selectPortalTool);

function findPortalSurface(cx, cy) {
  // Platforms and moving platforms → floor portal
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if ((o.type === 'platform' || o.type === 'moving') &&
        cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) {
      return { obj: o, surface: 'floor' };
    }
  }
  // Walls → wall portal on whichever face the cursor is nearest
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.type === 'wall' &&
        cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) {
      return { obj: o, surface: cx < o.x + o.w / 2 ? 'wall-left' : 'wall-right' };
    }
  }
  return null;
}

function portalRectFor(obj, surface, cx, cy) {
  if (surface === 'floor') {
    return {
      x: Math.max(obj.x, Math.min(obj.x + obj.w - PORTAL_W, Math.round(cx - PORTAL_W / 2))),
      y: obj.y - PORTAL_H,
      w: PORTAL_W, h: PORTAL_H,
    };
  }
  const py = Math.max(obj.y, Math.min(obj.y + obj.h - PORTAL_H, Math.round(cy - PORTAL_H / 2)));
  return {
    x: surface === 'wall-left' ? obj.x : obj.x + obj.w - PORTAL_W,
    y: py, w: PORTAL_W, h: PORTAL_H,
  };
}

function placePortal(cx, cy) {
  let rect, surface;
  if (snapEnabled) {
    const hit = findPortalSurface(cx, cy);
    if (!hit) return;
    rect    = portalRectFor(hit.obj, hit.surface, cx, cy);
    surface = hit.surface;
  } else {
    rect    = { x: Math.round(cx - PORTAL_W / 2), y: Math.round(cy - PORTAL_H / 2), w: PORTAL_W, h: PORTAL_H };
    surface = 'free';
  }
  const index = portalState === 'first' ? 0 : 1;
  const color = portalState === 'first' ? '#00ff44' : '#ff6600';
  objects = objects.filter(o => !(o.type === 'portal' && o.index === index));
  objects.push({ type: 'portal', index, color, surface, ...rect });
  if (portalState === 'first') {
    portalState = 'second';
    draw();
  } else {
    portalState = null;
    selectTool('mouse');
  }
}

// Snap toggle
document.getElementById('snap-toggle').addEventListener('click', () => {
  snapEnabled = !snapEnabled;
  const btn  = document.getElementById('snap-toggle');
  const pill = document.getElementById('snap-pill');
  btn.classList.toggle('active', snapEnabled);
  pill.textContent = snapEnabled ? 'ON' : 'OFF';
  draw();
});

// Direction toggle — updates selectedObj.dir and swaps the axis values
document.querySelectorAll('.dir-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!selectedObj || selectedObj.type !== 'moving') return;
    const newDir = btn.dataset.dir;
    if (newDir === selectedObj.dir) return;
    selectedObj.dir = newDir;
    if (newDir === 'v') {
      selectedObj.y0 = Math.max(0, selectedObj.y - 80);
      selectedObj.y1 = Math.min(H, selectedObj.y + selectedObj.h + 80);
      selectedObj.x0 = null;
      selectedObj.x1 = null;
    } else {
      selectedObj.x0 = Math.max(0, selectedObj.x - 80);
      selectedObj.x1 = Math.min(W, selectedObj.x + selectedObj.w + 80);
      selectedObj.y0 = null;
      selectedObj.y1 = null;
    }
    document.querySelectorAll('.dir-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.dir === newDir);
    });
    const horiz = newDir !== 'v';
    document.getElementById('prop-dist-min').value = horiz ? selectedObj.x0 : selectedObj.y0;
    document.getElementById('prop-dist-max').value = horiz ? selectedObj.x1 : selectedObj.y1;
    draw();
  });
});

// ── Canvas mouse tracking ───────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (testMode) return;
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;

  // Active resize drag
  if (dragHandle) {
    applyResize(mouse.x, mouse.y);
    draw();
    return;
  }

  // Active turnaround drag
  if (turnaroundDrag) {
    const m = selectedObj;
    if (m.dir !== 'v') {
      if (turnaroundDrag === 'min') {
        m.x0 = Math.round(Math.min(m.x1 - m.w - 1, mouse.x - m.w / 2));
      } else {
        m.x1 = Math.round(Math.max(m.x0 + m.w + 1, mouse.x + m.w / 2));
      }
      document.getElementById('prop-dist-min').value = m.x0;
      document.getElementById('prop-dist-max').value = m.x1;
    } else {
      if (turnaroundDrag === 'min') {
        m.y0 = Math.round(Math.min(m.y1 - m.h - 1, mouse.y - m.h / 2));
      } else {
        m.y1 = Math.round(Math.max(m.y0 + m.h + 1, mouse.y + m.h / 2));
      }
      document.getElementById('prop-dist-min').value = m.y0;
      document.getElementById('prop-dist-max').value = m.y1;
    }
    draw();
    return;
  }

  // Rotate tracking
  if (isRotating && selectedObj) {
    const rcx = selectedObj.x + selectedObj.w / 2;
    const rcy = selectedObj.y + selectedObj.h / 2;
    selectedObj.angle = Math.atan2(mouse.y - rcy, mouse.x - rcx);
    canvas.style.cursor = 'crosshair';
    draw();
    return;
  }

  if (currentTool !== 'mouse' || isMoving) {
    canvas.style.cursor = isMoving ? 'move' : 'crosshair';
    draw();
  } else {
    // Priority: resize handle → turnaround ghost → object → empty
    const handle = selectedObj ? hitHandle(mouse.x, mouse.y, selectedObj) : null;
    const ta     = handle ? null : hitTurnaround(mouse.x, mouse.y);
    if (handle) {
      canvas.style.cursor = HANDLE_CURSORS[handle];
    } else if (ta) {
      canvas.style.cursor = selectedObj.dir !== 'v' ? 'ew-resize' : 'ns-resize';
    } else {
      canvas.style.cursor = hitTest(mouse.x, mouse.y) ? 'pointer' : 'default';
    }
  }
});
canvas.addEventListener('mouseenter', () => { if (!testMode) mouse.onCanvas = true; });
canvas.addEventListener('mouseleave', () => { if (testMode) return; mouse.onCanvas = false; draw(); });

// ── Resize drag: mousedown / mouseup ───────────────────────────────────
canvas.addEventListener('mousedown', e => {
  if (testMode) return;
  if (!selectedObj || isMoving || currentTool !== 'mouse') return;
  const r  = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  // Resize handles take priority
  const handle = hitHandle(mx, my, selectedObj);
  if (handle) {
    dragHandle = handle;
    dragStart  = { mouseX: mx, mouseY: my,
                   x: selectedObj.x, y: selectedObj.y,
                   w: selectedObj.w, h: selectedObj.h,
                   cx: selectedObj.x + selectedObj.w / 2,
                   cy: selectedObj.y + selectedObj.h / 2 };
    dragMoved  = true;
    e.preventDefault();
    return;
  }

  // Turnaround ghost drag (moving platforms only)
  const ta = hitTurnaround(mx, my);
  if (ta) {
    turnaroundDrag = ta;
    dragMoved      = true;
    e.preventDefault();
  }
});

canvas.addEventListener('mouseup', () => {
  if (testMode) return;
  dragHandle     = null;
  dragStart      = null;
  turnaroundDrag = null;
});

// ── Canvas click: place object OR select/deselect ───────────────────────
canvas.addEventListener('click', e => {
  if (testMode || dragMoved) { dragMoved = false; return; }
  const r   = canvas.getBoundingClientRect();
  const cx  = e.clientX - r.left;
  const cy  = e.clientY - r.top;

  // Confirm rotation
  if (isRotating) {
    isRotating = false;
    document.getElementById('rotate-mode-btn').classList.remove('active');
    canvas.style.cursor = 'pointer';
    draw();
    return;
  }

  // Confirm a move
  if (isMoving) {
    const raw = {
      x: Math.round(cx - selectedObj.w / 2),
      y: Math.round(cy - selectedObj.h / 2),
      w: selectedObj.w,
      h: selectedObj.h,
    };
    const snapped   = snapEnabled ? applySnap(raw) : raw;
    selectedObj.x   = snapped.x;
    selectedObj.y   = snapped.y;
    isMoving        = false;
    document.querySelector('.move-btn').classList.remove('active');
    draw();
    return;
  }

  // Portal placement
  if (currentTool === 'portal') {
    placePortal(cx, cy);
    return;
  }

  // Place new object
  if (currentTool !== 'mouse') {
    placeObject(cx, cy);
    return;
  }

  // Mouse tool: hit-test existing objects (reverse order = topmost first)
  const hit = hitTest(cx, cy);
  if (hit) {
    selectedObj = hit;
    showProps(hit);
  } else {
    selectedObj = null;
    hideProps();
  }
  draw();
});

function previewRect(tool, cx, cy) {
  const d = DEFAULTS[tool];
  const raw = {
    x: Math.round(cx - d.w / 2),
    y: Math.round(cy - d.h / 2),
    w: d.w,
    h: d.h,
  };
  return snapEnabled ? applySnap(raw) : raw;
}

// Returns rect with snapping applied. Attaches _guideX / _guideY for drawing.
function applySnap(r) {
  const { x: ox, y: oy, w, h } = r;
  let bestDx = SNAP_THRESHOLD + 1, bestDy = SNAP_THRESHOLD + 1;
  let snapX = ox, snapY = oy, guideX = null, guideY = null;

  // Collect all reference lines from placed objects + canvas borders
  const xLines = [0, W];
  const yLines = [0, H];
  for (const obj of objects) {
    xLines.push(obj.x, obj.x + obj.w);
    yLines.push(obj.y, obj.y + obj.h);
  }

  for (const line of xLines) {
    const dL = Math.abs(ox - line);
    const dR = Math.abs(ox + w - line);
    if (dL < bestDx) { bestDx = dL; snapX = line;     guideX = line; }
    if (dR < bestDx) { bestDx = dR; snapX = line - w; guideX = line; }
  }
  for (const line of yLines) {
    const dT = Math.abs(oy - line);
    const dB = Math.abs(oy + h - line);
    if (dT < bestDy) { bestDy = dT; snapY = line;     guideY = line; }
    if (dB < bestDy) { bestDy = dB; snapY = line - h; guideY = line; }
  }

  return {
    x: bestDx <= SNAP_THRESHOLD ? snapX : ox,
    y: bestDy <= SNAP_THRESHOLD ? snapY : oy,
    w, h,
    _guideX: bestDx <= SNAP_THRESHOLD ? guideX : null,
    _guideY: bestDy <= SNAP_THRESHOLD ? guideY : null,
  };
}

function placeObject(cx, cy) {
  const r = previewRect(currentTool, cx, cy);
  const obj = { type: currentTool, angle: 0, ...r };

  if (currentTool === 'moving') {
    // Default: horizontal travel, 80px each side of placement point
    obj.dir = 'h';
    obj.x0  = Math.max(0, r.x - 80);
    obj.x1  = Math.min(W, r.x + r.w + 80);
    obj.y0  = null;
    obj.y1  = null;
    obj.speed = 1.5;
  }

  if (currentTool === 'turret') {
    obj.interval = 3;
  }

  // Only one goal / spawn on the canvas at a time
  if (currentTool === 'goal' || currentTool === 'spawn') {
    objects = objects.filter(o => o.type !== currentTool);
  }

  objects.push(obj);
  selectTool('mouse');
  draw();
}

// ── Selection helpers ───────────────────────────────────────────────────
function hitTest(x, y) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (!o.angle) {
      if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
    } else {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      const cos = Math.cos(-o.angle), sin = Math.sin(-o.angle);
      const lx = cos * (x - cx) - sin * (y - cy);
      const ly = sin * (x - cx) + cos * (y - cy);
      if (lx >= -o.w / 2 && lx <= o.w / 2 && ly >= -o.h / 2 && ly <= o.h / 2) return o;
    }
  }
  return null;
}

function showProps(obj) {
  document.getElementById('no-selection-msg').style.display   = 'none';
  document.getElementById('selection-controls').style.display = 'block';
  document.getElementById('prop-w').value = obj.w;
  document.getElementById('prop-h').value = obj.h;

  const isMover  = obj.type === 'moving';
  const isTurret = obj.type === 'turret';
  document.getElementById('moving-extras').style.display      = isMover  ? 'block' : 'none';
  document.getElementById('turret-extras').style.display      = isTurret ? 'block' : 'none';
  document.getElementById('dimensions-section').style.display = isTurret ? 'none'  : 'block';

  if (isMover) {
    const horiz = obj.dir !== 'v';
    document.querySelectorAll('.dir-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.dir === obj.dir);
    });
    document.getElementById('prop-dist-min').value = horiz ? obj.x0 : obj.y0;
    document.getElementById('prop-dist-max').value = horiz ? obj.x1 : obj.y1;
  }

  if (isTurret) {
    document.getElementById('prop-interval').value = obj.interval;
  }
}

function hideProps() {
  document.getElementById('no-selection-msg').style.display   = 'block';
  document.getElementById('selection-controls').style.display = 'none';
  document.getElementById('moving-extras').style.display      = 'none';
  document.getElementById('turret-extras').style.display      = 'none';
  document.getElementById('dimensions-section').style.display = 'block';
  isRotating = false;
  document.getElementById('rotate-mode-btn').classList.remove('active');
}

// ── Property controls ───────────────────────────────────────────────────
document.querySelector('.move-btn').addEventListener('click', () => {
  if (!selectedObj) return;
  isMoving = !isMoving;
  document.querySelector('.move-btn').classList.toggle('active', isMoving);
  canvas.style.cursor = isMoving ? 'move' : 'pointer';
  draw();
});

document.querySelector('.delete-btn').addEventListener('click', () => {
  if (!selectedObj) return;
  objects    = objects.filter(o => o !== selectedObj);
  selectedObj = null;
  isMoving    = false;
  document.querySelector('.move-btn').classList.remove('active');
  hideProps();
  draw();
});

document.getElementById('prop-w').addEventListener('input', e => {
  if (!selectedObj) return;
  selectedObj.w = Math.max(8, parseInt(e.target.value) || 8);
  draw();
});

document.getElementById('prop-h').addEventListener('input', e => {
  if (!selectedObj) return;
  selectedObj.h = Math.max(8, parseInt(e.target.value) || 8);
  draw();
});

document.getElementById('prop-dist-min').addEventListener('input', e => {
  if (!selectedObj || selectedObj.type !== 'moving') return;
  const val = parseInt(e.target.value) || 0;
  if (selectedObj.dir !== 'v') selectedObj.x0 = val;
  else                          selectedObj.y0 = val;
  draw();
});

document.getElementById('prop-dist-max').addEventListener('input', e => {
  if (!selectedObj || selectedObj.type !== 'moving') return;
  const val = parseInt(e.target.value) || 0;
  if (selectedObj.dir !== 'v') selectedObj.x1 = val;
  else                          selectedObj.y1 = val;
  draw();
});

document.getElementById('rotate-mode-btn').addEventListener('click', () => {
  if (!selectedObj) return;
  isRotating = !isRotating;
  if (isRotating) isMoving = false;
  document.querySelector('.move-btn').classList.toggle('active', isMoving);
  document.getElementById('rotate-mode-btn').classList.toggle('active', isRotating);
  canvas.style.cursor = isRotating ? 'crosshair' : 'pointer';
  draw();
});

document.getElementById('prop-interval').addEventListener('input', e => {
  if (!selectedObj || selectedObj.type !== 'turret') return;
  selectedObj.interval = Math.max(0.5, parseFloat(e.target.value) || 3);
});

// ── Resize handles ──────────────────────────────────────────────────────
function getHandles(obj) {
  const { x, y, w, h } = obj;
  const a = obj.angle || 0;
  if (!a) {
    return {
      nw: { x,        y        }, n: { x: x+w/2, y        }, ne: { x: x+w, y        },
      w:  { x,        y: y+h/2 },                             e:  { x: x+w, y: y+h/2 },
      sw: { x,        y: y+h   }, s: { x: x+w/2, y: y+h   }, se: { x: x+w, y: y+h   },
    };
  }
  const cx = x + w/2, cy = y + h/2, cos = Math.cos(a), sin = Math.sin(a);
  const rot = (lx, ly) => ({ x: cx + cos*lx - sin*ly, y: cy + sin*lx + cos*ly });
  const hw = w/2, hh = h/2;
  return {
    nw: rot(-hw, -hh), n: rot(0, -hh), ne: rot(hw, -hh),
    w:  rot(-hw,   0),                  e:  rot(hw,   0),
    sw: rot(-hw,  hh), s: rot(0,  hh), se: rot(hw,  hh),
  };
}

function hitHandle(mx, my, obj) {
  for (const [key, pt] of Object.entries(getHandles(obj))) {
    if (Math.abs(mx - pt.x) <= HANDLE_HIT && Math.abs(my - pt.y) <= HANDLE_HIT) return key;
  }
  return null;
}

function hitTurnaround(mx, my) {
  if (!selectedObj || selectedObj.type !== 'moving') return null;
  const m = selectedObj;
  let minR, maxR;
  if (m.dir !== 'v') {
    if (m.x0 === null || m.x1 === null) return null;
    minR = { x: m.x0,        y: m.y, w: m.w, h: m.h };
    maxR = { x: m.x1 - m.w,  y: m.y, w: m.w, h: m.h };
  } else {
    if (m.y0 === null || m.y1 === null) return null;
    minR = { x: m.x, y: m.y0,        w: m.w, h: m.h };
    maxR = { x: m.x, y: m.y1 - m.h,  w: m.w, h: m.h };
  }
  const hit = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  if (hit(minR)) return 'min';
  if (hit(maxR)) return 'max';
  return null;
}

function applyResize(mx, my) {
  if (!dragHandle || !dragStart || !selectedObj) return;
  const MIN = 8;
  const a = selectedObj.angle || 0;

  if (!a) {
    // Original axis-aligned logic
    const dx = mx - dragStart.mouseX, dy = my - dragStart.mouseY;
    const { x: ox, y: oy, w: ow, h: oh } = dragStart;
    let nx = ox, ny = oy, nw = ow, nh = oh;
    if (dragHandle.includes('n')) { ny = Math.min(oy + oh - MIN, oy + dy); nh = (oy + oh) - ny; }
    if (dragHandle.includes('s')) { nh = Math.max(MIN, oh + dy); }
    if (dragHandle.includes('w')) { nx = Math.min(ox + ow - MIN, ox + dx); nw = (ox + ow) - nx; }
    if (dragHandle.includes('e')) { nw = Math.max(MIN, ow + dx); }
    selectedObj.x = Math.round(nx); selectedObj.y = Math.round(ny);
    selectedObj.w = Math.round(nw); selectedObj.h = Math.round(nh);
  } else {
    // Rotated resize: work in the object's local space
    const { cx: ocx, cy: ocy, w: ow, h: oh } = dragStart;
    const hw = ow / 2, hh = oh / 2;
    // Transform current mouse into local space
    const cosN = Math.cos(-a), sinN = Math.sin(-a);
    const lmx = cosN * (mx - ocx) - sinN * (my - ocy);
    const lmy = sinN * (mx - ocx) + cosN * (my - ocy);
    // Fixed edge in local space (the edge opposite the dragged handle)
    const fixedX  = dragHandle.includes('w') ?  hw : dragHandle.includes('e') ? -hw : 0;
    const fixedY  = dragHandle.includes('n') ?  hh : dragHandle.includes('s') ? -hh : 0;
    const changeX = dragHandle.includes('w') || dragHandle.includes('e');
    const changeY = dragHandle.includes('n') || dragHandle.includes('s');
    let nw = ow, nh = oh, nlcx = 0, nlcy = 0;
    if (changeX) { nw = Math.max(MIN, Math.abs(lmx - fixedX)); nlcx = (fixedX + lmx) / 2; }
    if (changeY) { nh = Math.max(MIN, Math.abs(lmy - fixedY)); nlcy = (fixedY + lmy) / 2; }
    // New center in world space
    const cosA = Math.cos(a), sinA = Math.sin(a);
    const newCX = ocx + cosA * nlcx - sinA * nlcy;
    const newCY = ocy + sinA * nlcx + cosA * nlcy;
    selectedObj.w = Math.round(nw); selectedObj.h = Math.round(nh);
    selectedObj.x = Math.round(newCX - selectedObj.w / 2);
    selectedObj.y = Math.round(newCY - selectedObj.h / 2);
  }

  document.getElementById('prop-w').value = selectedObj.w;
  document.getElementById('prop-h').value = selectedObj.h;
}

// ── Drawing ─────────────────────────────────────────────────────────────
function drawSpike(x, y, w, h, color) {
  ctx.fillStyle = color;
  const count = Math.max(1, Math.floor(w / 10));
  const sw = w / count;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    ctx.moveTo(x + i * sw,         y + h);
    ctx.lineTo(x + i * sw + sw / 2, y);
    ctx.lineTo(x + (i + 1) * sw,   y + h);
  }
  ctx.closePath();
  ctx.fill();
}

function drawObject(obj, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const _a = obj.angle || 0;
  if (_a) {
    const _cx = obj.x + obj.w / 2, _cy = obj.y + obj.h / 2;
    ctx.translate(_cx, _cy); ctx.rotate(_a); ctx.translate(-_cx, -_cy);
  }

  switch (obj.type) {
    case 'platform':
      ctx.fillStyle = '#4444ff';
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      break;

    case 'moving':
      ctx.fillStyle = '#aaddff';
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.fillStyle  = '#ffffff';
      ctx.font       = '8px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(obj.dir === 'v' ? '↕' : '↔', obj.x + obj.w / 2, obj.y + obj.h - 2);
      break;

    case 'wall':
      ctx.fillStyle = '#886622';
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      // Brick pattern clipped to wall bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(obj.x, obj.y, obj.w, obj.h);
      ctx.clip();
      ctx.fillStyle = '#553311';
      for (let row = 0; row * 12 < obj.h; row++) {
        const off = row % 2 === 0 ? 0 : obj.w / 2;
        for (let col = -obj.w; col < obj.w * 2; col += obj.w) {
          ctx.fillRect(obj.x + col + off, obj.y + row * 12, obj.w / 2 - 1, 11);
        }
      }
      ctx.restore();
      break;

    case 'spike':
      drawSpike(obj.x, obj.y, obj.w, obj.h, '#ff2222');
      break;

    case 'ladder': {
      ctx.fillStyle = '#aa8844';
      ctx.fillRect(obj.x,             obj.y, 4,     obj.h);
      ctx.fillRect(obj.x + obj.w - 4, obj.y, 4,     obj.h);
      ctx.fillStyle = '#cc9933';
      for (let ry = obj.y + 4; ry + 3 <= obj.y + obj.h; ry += 12) {
        ctx.fillRect(obj.x + 4, ry, obj.w - 8, 3);
      }
      break;
    }

    case 'goal':
      ctx.font      = 'bold 22px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffff00';
      ctx.textAlign = 'left';
      ctx.fillText('★', obj.x + 2, obj.y + 22);
      break;

    case 'turret': {
      // Always drawn facing right; canvas rotation via obj.angle handles direction
      const tcy = obj.y + obj.h / 2;
      ctx.fillStyle = '#556677'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.fillStyle = '#334455'; ctx.fillRect(obj.x + 2, obj.y + 2, obj.w - 4, obj.h - 4);
      ctx.fillStyle = '#445566'; ctx.fillRect(obj.x + obj.w, tcy - 3, 16, 6);
      ctx.fillStyle = '#ff3333'; ctx.fillRect(obj.x + obj.w - 8, tcy - 3, 6, 6);
      break;
    }

    case 'portal': {
      const pcx = obj.x + obj.w / 2;
      const pcy = obj.y + obj.h / 2;
      ctx.save();
      ctx.shadowColor = obj.color;
      ctx.shadowBlur  = 14;
      ctx.strokeStyle = obj.color;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.ellipse(pcx, pcy, obj.w / 2, obj.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = obj.color + '33';
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'spawn':
      // Body
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(obj.x + 6,  obj.y + 7, 5, 5);
      ctx.fillRect(obj.x + 13, obj.y + 7, 5, 5);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(obj.x + 8,  obj.y + 9, 2, 2);
      ctx.fillRect(obj.x + 15, obj.y + 9, 2, 2);
      // "START" label above
      ctx.font      = '5px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff00ff';
      ctx.textAlign = 'center';
      ctx.fillText('START', obj.x + obj.w / 2, obj.y - 3);
      break;
  }

  ctx.restore();
}

function draw() {
  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 1;
  for (let x = 0; x <= W; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // All placed objects (skip selected while moving so ghost replaces it)
  for (const obj of objects) {
    if (isMoving && obj === selectedObj) continue;
    drawObject(obj);
  }

  // Moving platform turnaround ghosts
  if (selectedObj && selectedObj.type === 'moving') {
    const m = selectedObj;

    if (m.dir !== 'v' && m.x0 !== null) {
      // Left and right turnaround positions
      const minAlpha = turnaroundDrag === 'min' ? 0.65 : 0.28;
      const maxAlpha = turnaroundDrag === 'max' ? 0.65 : 0.28;
      drawObject({ ...m, x: m.x0 },         minAlpha);
      drawObject({ ...m, x: m.x1 - m.w },   maxAlpha);
      // Travel path
      ctx.save();
      ctx.strokeStyle = 'rgba(170,221,255,0.35)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(m.x0,      m.y + m.h / 2);
      ctx.lineTo(m.x1,      m.y + m.h / 2);
      ctx.stroke();
      ctx.restore();
    } else if (m.dir === 'v' && m.y0 !== null) {
      // Top and bottom turnaround positions
      const minAlpha = turnaroundDrag === 'min' ? 0.65 : 0.28;
      const maxAlpha = turnaroundDrag === 'max' ? 0.65 : 0.28;
      drawObject({ ...m, y: m.y0 },         minAlpha);
      drawObject({ ...m, y: m.y1 - m.h },   maxAlpha);
      // Travel path
      ctx.save();
      ctx.strokeStyle = 'rgba(170,221,255,0.35)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(m.x + m.w / 2, m.y0);
      ctx.lineTo(m.x + m.w / 2, m.y1);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Selection outline + resize handles
  if (selectedObj && !isMoving) {
    ctx.save();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 3]);
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur  = 6;
    const _oa = selectedObj.angle || 0;
    if (_oa) {
      const _ocx = selectedObj.x + selectedObj.w / 2, _ocy = selectedObj.y + selectedObj.h / 2;
      ctx.translate(_ocx, _ocy); ctx.rotate(_oa); ctx.translate(-_ocx, -_ocy);
    }
    ctx.strokeRect(selectedObj.x - 3, selectedObj.y - 3,
                   selectedObj.w + 6,  selectedObj.h + 6);
    ctx.restore();

    // Handle squares (hidden during an active drag to reduce clutter)
    if (!dragHandle) {
      const HS = HANDLE_SIZE;
      ctx.save();
      ctx.shadowBlur = 0;
      for (const pt of Object.values(getHandles(selectedObj))) {
        ctx.fillStyle   = '#ffffff';
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([]);
        ctx.fillRect  (pt.x - HS / 2, pt.y - HS / 2, HS, HS);
        ctx.strokeRect(pt.x - HS / 2, pt.y - HS / 2, HS, HS);
      }
      ctx.restore();
    }
  }

  // Ghost preview + snap guides (placement tools OR move mode)
  if (mouse.onCanvas && (currentTool !== 'mouse' || isMoving)) {
    if (currentTool === 'portal') {
      const color = portalState === 'first' ? '#00ff44' : '#ff6600';
      if (snapEnabled) {
        const hit = findPortalSurface(mouse.x, mouse.y);
        if (hit) {
          const rect = portalRectFor(hit.obj, hit.surface, mouse.x, mouse.y);
          drawObject({ type: 'portal', index: -1, color, surface: hit.surface, ...rect }, 0.5);
        }
      } else {
        const rect = { x: Math.round(mouse.x - PORTAL_W / 2), y: Math.round(mouse.y - PORTAL_H / 2), w: PORTAL_W, h: PORTAL_H };
        drawObject({ type: 'portal', index: -1, color, surface: 'free', ...rect }, 0.5);
      }
    } else {
      let r;
      if (isMoving) {
        const raw = {
          x: Math.round(mouse.x - selectedObj.w / 2),
          y: Math.round(mouse.y - selectedObj.h / 2),
          w: selectedObj.w,
          h: selectedObj.h,
        };
        r = snapEnabled ? applySnap(raw) : raw;
      } else {
        r = previewRect(currentTool, mouse.x, mouse.y);
      }

      // Snap guide lines
      if (snapEnabled) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth   = 1;
        ctx.strokeStyle = 'rgba(0,255,65,0.5)';
        if (r._guideX != null) {
          ctx.beginPath(); ctx.moveTo(r._guideX, 0); ctx.lineTo(r._guideX, H); ctx.stroke();
        }
        if (r._guideY != null) {
          ctx.beginPath(); ctx.moveTo(0, r._guideY); ctx.lineTo(W, r._guideY); ctx.stroke();
        }
        ctx.restore();
      }

      const ghostType  = isMoving ? selectedObj.type      : currentTool;
      const ghostDir   = isMoving ? (selectedObj.dir || 'h') : 'h';
      const ghostAngle = isMoving ? (selectedObj.angle || 0)  : 0;
      drawObject({ type: ghostType, ...r, dir: ghostDir, angle: ghostAngle }, 0.45);
    }
  }

  // Portal placement hint label
  if (currentTool === 'portal' && portalState) {
    const hintColor = portalState === 'first' ? '#00ff44' : '#ff6600';
    const hintText  = portalState === 'first' ? 'PLACE GREEN PORTAL  (1 of 2)' : 'PLACE ORANGE PORTAL  (2 of 2)';
    ctx.save();
    ctx.font      = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(W / 2 - 140, H - 22, 280, 18);
    ctx.fillStyle   = hintColor;
    ctx.shadowColor = hintColor;
    ctx.shadowBlur  = 6;
    ctx.fillText(hintText, W / 2, H - 9);
    ctx.restore();
  }
}

// ── Export ──────────────────────────────────────────────────────────────
function generateCode() {
  const platforms = objects.filter(o => o.type === 'platform');
  const moving    = objects.filter(o => o.type === 'moving');
  const walls     = objects.filter(o => o.type === 'wall');
  const spikes    = objects.filter(o => o.type === 'spike');
  const ladders   = objects.filter(o => o.type === 'ladder');
  const portals   = objects.filter(o => o.type === 'portal');
  const turrets   = objects.filter(o => o.type === 'turret');
  const goal      = objects.find(o  => o.type === 'goal');
  const spawn     = objects.find(o  => o.type === 'spawn');

  const lines = [];
  const ang = o => o.angle ? `,angle:${+o.angle.toFixed(5)}` : '';

  if (platforms.length) {
    const arr = platforms.map(p =>
      p.angle ? `{x:${p.x},y:${p.y},w:${p.w},h:${p.h}${ang(p)}}` : `[${p.x},${p.y},${p.w},${p.h}]`
    ).join(',');
    lines.push(`  platforms:[${arr}]`);
  }

  if (moving.length) {
    const arr = moving.map(m =>
      `{x:${m.x},y:${m.y},w:${m.w},h:${m.h},` +
      `x0:${m.x0},x1:${m.x1},y0:${m.y0},y1:${m.y1},speed:${m.speed}${ang(m)}}`
    ).join(',');
    lines.push(`  moving:[${arr}]`);
  }

  if (walls.length) {
    const arr = walls.map(w => `{x:${w.x},y:${w.y},w:${w.w},h:${w.h}${ang(w)}}`).join(',');
    lines.push(`  walls:[${arr}]`);
  }

  if (spikes.length) {
    const arr = spikes.map(s => `{x:${s.x},y:${s.y},w:${s.w},h:${s.h}${ang(s)}}`).join(',');
    lines.push(`  spikes:[${arr}]`);
  }

  if (ladders.length) {
    const arr = ladders.map(l => `{x:${l.x},y:${l.y},w:${l.w},h:${l.h}${ang(l)}}`).join(',');
    lines.push(`  ladders:[${arr}]`);
  }

  if (turrets.length) {
    const arr = turrets.map(t =>
      `{x:${t.x},y:${t.y},w:${t.w},h:${t.h},angle:${+( t.angle||0).toFixed(5)},interval:${t.interval}}`
    ).join(',');
    lines.push(`  turrets:[${arr}]`);
  }

  if (portals.length === 2) {
    const arr = portals.map(p =>
      `{index:${p.index},color:'${p.color}',surface:'${p.surface}',x:${p.x},y:${p.y},w:${p.w},h:${p.h}${ang(p)}}`
    ).join(',');
    lines.push(`  portals:[${arr}]`);
  }

  if (goal) {
    lines.push(`  goal:{x:${goal.x},y:${goal.y},w:${goal.w},h:${goal.h}${ang(goal)}}`);
  } else {
    lines.push(`  goal:{x:0,y:0,w:18,h:18}`);
  }

  const sx = spawn ? spawn.x : 20;
  const sy = spawn ? spawn.y : 300;
  lines.push(`  playerStart:{x:${sx},y:${sy}}`);
  lines.push(`  bg:'#0a0a1a', pc:'#4444ff'`);

  return '{\n' + lines.join(',\n') + '\n}';
}

document.querySelector('.export-btn').addEventListener('click', () => {
  const warnings = [];
  if (!objects.find(o => o.type === 'goal'))  warnings.push('⚠ No goal placed');
  if (!objects.find(o => o.type === 'spawn')) warnings.push('⚠ No spawn point placed');
  if (!objects.find(o => o.type === 'platform') &&
      !objects.find(o => o.type === 'moving'))  warnings.push('⚠ No platforms placed');

  document.getElementById('export-warnings').textContent = warnings.join('   ');
  document.getElementById('export-code').value = generateCode();
  document.getElementById('copy-confirm').textContent = '';
  document.getElementById('export-modal').classList.add('open');
});

document.getElementById('close-modal-btn').addEventListener('click', () => {
  document.getElementById('export-modal').classList.remove('open');
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const ta = document.getElementById('export-code');
  navigator.clipboard.writeText(ta.value).then(() => {
    document.getElementById('copy-confirm').textContent = '✓ Copied to clipboard!';
  }).catch(() => {
    ta.select();
    document.execCommand('copy');
    document.getElementById('copy-confirm').textContent = '✓ Copied to clipboard!';
  });
});

// Close modal when clicking the backdrop
document.getElementById('export-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('export-modal')) {
    document.getElementById('export-modal').classList.remove('open');
  }
});

// ── Test mode ────────────────────────────────────────────────────────────
let testMode       = false;
let testLevel      = null;
let testMovers     = [];
let testPlayer     = null;
let testRidingMover= null;
let testKeys       = {};
let testDeaths     = 0;
let testVictory    = false;
let testRaf        = null;
let testLastTime        = null, testAccumulator = 0;
let blockedPortalIndex  = null;
let testTurrets         = [];

const T_SPEED = 3.5, T_JUMP = -9, T_GRAVITY = 0.45;
const T_TICK_MS = 1000 / 60;

function buildTestLevel() {
  const pl = objects.filter(o => o.type === 'platform');
  const mv = objects.filter(o => o.type === 'moving');
  const wl = objects.filter(o => o.type === 'wall');
  const sp = objects.filter(o => o.type === 'spike');
  const ld = objects.filter(o => o.type === 'ladder');
  const goal  = objects.find(o => o.type === 'goal');
  const spawn = objects.find(o => o.type === 'spawn');
  return {
    platforms: pl.map(p => ({ ...p })),
    moving:    mv.map(m => ({ ...m, speed: m.speed || 1.5 })),
    walls:     wl.map(w => ({ ...w })),
    spikes:    sp.map(s => ({ ...s })),
    ladders:   ld.map(l => ({ ...l })),
    goal:      goal  ? { ...goal } : null,
    playerStart: spawn ? { x:spawn.x, y:spawn.y } : { x:20, y:300 },
    portals:   objects.filter(o => o.type === 'portal').map(o => ({ ...o })),
    turrets:   objects.filter(o => o.type === 'turret').map(o => ({ ...o })),
  };
}

function tAllPlatforms() {
  return [...(testLevel.platforms||[]), ...testMovers];
}

function tUpdateMovers() {
  for (const m of testMovers) {
    const px = m.x, py = m.y;
    if (m.x0 !== null) {
      m.x += m.speed * m.dir;
      if (m.x <= m.x0 || m.x + m.w >= m.x1) m.dir *= -1;
    } else {
      m.y += m.speed * m.dir;
      if (m.y <= m.y0 || m.y + m.h >= m.y1) m.dir *= -1;
    }
    if (testRidingMover === m) {
      testPlayer.x += m.x - px;
      testPlayer.y += m.y - py;
      testPlayer.x = Math.max(0, Math.min(W - testPlayer.w, testPlayer.x));
    }
  }
}

function tPhysicsStep() {
  const p = testPlayer;
  const L = testKeys['ArrowLeft']  || testKeys['a'] || testKeys['A'];
  const R = testKeys['ArrowRight'] || testKeys['d'] || testKeys['D'];
  const U = testKeys['ArrowUp']    || testKeys['w'] || testKeys['W'];
  const D = testKeys['ArrowDown']  || testKeys['s'] || testKeys['S'];
  const J = testKeys[' '];

  const ladders = testLevel.ladders || [];
  const pcx = p.x + p.w / 2;
  const nearLadder = ladders.some(l => l.angle
    ? tCollideOBB(p, l)
    : pcx > l.x && pcx < l.x + l.w && p.y + p.h > l.y + 2 && p.y < l.y + l.h - 2
  );
  const onLadderTop = !nearLadder && ladders.some(l => !l.angle &&
    pcx > l.x && pcx < l.x + l.w &&
    Math.abs(p.y + p.h - l.y) <= 4 && p.onGround
  );
  if (nearLadder && (U || D)) p.onLadder = true;
  if (onLadderTop && D)       p.onLadder = true;
  if (!nearLadder && !onLadderTop) p.onLadder = false;
  if (J)                       p.onLadder = false;

  if (p.onLadder) {
    if (L)      p.vx = -T_SPEED;
    else if (R) p.vx =  T_SPEED;
    else        p.vx *= 0.8;
    if (U)      p.vy = -T_SPEED;
    else if (D) p.vy =  T_SPEED;
    else        p.vy =  0;
    if (J && p.onGround) { p.vy = T_JUMP; p.onGround = false; p.onLadder = false; }
  } else {
    if (L)      p.vx = -T_SPEED;
    else if (R) p.vx =  T_SPEED;
    else        p.vx *= 0.8;
    if ((J || U) && p.onGround) { p.vy = T_JUMP; p.onGround = false; }
    p.vy += T_GRAVITY;
  }

  const allPlats = tAllPlatforms();
  const allWalls = [...(testLevel.walls || []), ...(testLevel.turrets || [])];
  const plats = allPlats.filter(o => !o.angle);
  const walls  = allWalls.filter(o => !o.angle);

  p.x += p.vx;
  for (const s of [...plats, ...walls]) {
    if (p.x < s.x+s.w && p.x+p.w > s.x && p.y+2 < s.y+s.h && p.y+p.h-2 > s.y) {
      p.x = (p.x + p.w/2 < s.x + s.w/2) ? s.x - p.w : s.x + s.w;
      p.vx = 0; break;
    }
  }
  p.x = Math.max(0, Math.min(W - p.w, p.x));

  const tb = p.y, bb = p.y + p.h;
  p.y += p.vy; p.onGround = false; testRidingMover = null;

  for (const pl of plats) {
    if (p.x < pl.x+pl.w && p.x+p.w > pl.x && p.y < pl.y+pl.h && p.y+p.h > pl.y) {
      if (p.vy >= 0 && bb <= pl.y+1) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
        if (testMovers.includes(pl)) testRidingMover = pl;
      } else if (p.vy < 0 && tb >= pl.y+pl.h-1) { p.y = pl.y + pl.h; p.vy = 0; }
      break;
    }
  }
  for (const w of walls) {
    if (p.x < w.x+w.w && p.x+p.w > w.x && p.y < w.y+w.h && p.y+p.h > w.y) {
      if (p.vy >= 0 && bb <= w.y+1)       { p.y = w.y - p.h; p.vy = 0; p.onGround = true; }
      else if (p.vy < 0 && tb >= w.y+w.h-1) { p.y = w.y + w.h; p.vy = 0; }
      break;
    }
  }
  // Ladder top acts as a platform; player must press down to descend
  if (!p.onLadder && !D) {
    const cx = p.x + p.w / 2;
    for (const l of ladders) {
      if (l.angle) continue;
      if (cx > l.x && cx < l.x + l.w && p.vy >= 0 && bb <= l.y + 1 && p.y + p.h > l.y) {
        p.y = l.y - p.h; p.vy = 0; p.onGround = true; break;
      }
    }
  }

  // OBB resolution for rotated platforms and walls
  for (const obj of [...allPlats.filter(o => o.angle), ...allWalls.filter(o => o.angle)]) {
    const col = obbVsAABB(obj, p);
    if (!col) continue;
    p.x += col.nx * col.depth;
    p.y += col.ny * col.depth;
    if (col.ny < -0.5) {
      if (p.vy > 0) p.vy = 0;
      p.onGround = true;
      if (testMovers.includes(obj)) testRidingMover = obj;
    } else if (col.ny > 0.5) {
      if (p.vy < 0) p.vy = 0;
    } else {
      if (col.nx > 0 && p.vx < 0) p.vx = 0;
      if (col.nx < 0 && p.vx > 0) p.vx = 0;
    }
  }
}

function tCollide(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function getOBBCorners(obj) {
  const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
  const a = obj.angle, c = Math.cos(a), s = Math.sin(a), hw = obj.w / 2, hh = obj.h / 2;
  return [
    { x: cx - c*hw + s*hh, y: cy - s*hw - c*hh },
    { x: cx + c*hw + s*hh, y: cy + s*hw - c*hh },
    { x: cx + c*hw - s*hh, y: cy + s*hw + c*hh },
    { x: cx - c*hw - s*hh, y: cy - s*hw + c*hh },
  ];
}

function projectOnAxis(corners, ax, ay) {
  let min = Infinity, max = -Infinity;
  for (const { x, y } of corners) { const d = x*ax + y*ay; if (d < min) min = d; if (d > max) max = d; }
  return [min, max];
}

// SAT OBB vs AABB — returns null (no hit) or { depth, nx, ny } MTV pointing obj→player
function obbVsAABB(obj, p) {
  const a = obj.angle, c = Math.cos(a), s = Math.sin(a);
  const oc = getOBBCorners(obj);
  const pc = [{ x:p.x, y:p.y }, { x:p.x+p.w, y:p.y }, { x:p.x+p.w, y:p.y+p.h }, { x:p.x, y:p.y+p.h }];
  let minD = Infinity, nx = 0, ny = 0;
  for (const [ax, ay] of [[1,0],[0,1],[c,s],[-s,c]]) {
    const [pmin, pmax] = projectOnAxis(pc, ax, ay);
    const [omin, omax] = projectOnAxis(oc, ax, ay);
    if (pmax <= omin || omax <= pmin) return null;
    const d = Math.min(pmax - omin, omax - pmin);
    if (d < minD) { minD = d; nx = ax; ny = ay; }
  }
  if (((p.x+p.w/2)-(obj.x+obj.w/2))*nx + ((p.y+p.h/2)-(obj.y+obj.h/2))*ny < 0) { nx=-nx; ny=-ny; }
  return { depth: minD, nx, ny };
}

function tCollideOBB(player, obj) {
  if (!obj.angle) return tCollide(player, obj);
  return obbVsAABB(obj, player) !== null;
}

function tDie() {
  testDeaths++;
  const ps = testLevel.playerStart;
  testPlayer.x = ps.x; testPlayer.y = ps.y;
  testPlayer.vx = 0;   testPlayer.vy = 0;
  testPlayer.onGround = false;
  testRidingMover = null;
  for (const t of testTurrets) t.projectiles = [];
}

function teleportPlayer(exitPortal) {
  const p = testPlayer;
  if (exitPortal.surface === 'floor') {
    p.x = exitPortal.x + exitPortal.w / 2 - p.w / 2;
    p.y = exitPortal.y + exitPortal.h - p.h;
  } else if (exitPortal.surface === 'wall-left') {
    p.x = exitPortal.x - p.w;
    p.y = exitPortal.y + exitPortal.h / 2 - p.h / 2;
    p.vx = -(Math.abs(p.vx) || 2);
  } else if (exitPortal.surface === 'wall-right') {
    p.x = exitPortal.x + exitPortal.w;
    p.y = exitPortal.y + exitPortal.h / 2 - p.h / 2;
    p.vx = Math.abs(p.vx) || 2;
  } else {
    p.x = exitPortal.x + exitPortal.w / 2 - p.w / 2;
    p.y = exitPortal.y + exitPortal.h / 2 - p.h / 2;
  }
}

function testUpdate() {
  if (testVictory) return;
  tUpdateMovers();
  tPhysicsStep();
  for (const s of (testLevel.spikes||[])) { if (tCollideOBB(testPlayer, s)) { tDie(); return; } }
  if (testPlayer.y > H + 60) { tDie(); return; }

  // Turrets — fire, move bullets, check hits
  for (const t of testTurrets) {
    t.timer--;
    if (t.timer <= 0) {
      t.timer = Math.round(t.interval * 60);
      const tcx = t.x + t.w / 2, tcy = t.y + t.h / 2;
      const ang = t.angle || 0;
      const spd = 4, rad = t.w / 2 + 16;
      t.projectiles.push({ x: tcx + Math.cos(ang)*rad - 4, y: tcy + Math.sin(ang)*rad - 4, w: 8, h: 8, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd });
    }
    for (const p of t.projectiles) { p.x += p.vx; p.y += p.vy; }
    t.projectiles = t.projectiles.filter(p => p.x > -16 && p.x < W + 16 && p.y > -16 && p.y < H + 16);
  }
  for (const t of testTurrets) {
    for (const proj of t.projectiles) {
      if (tCollide(testPlayer, proj)) { tDie(); return; }
    }
  }
  if (testLevel.goal && tCollideOBB(testPlayer, testLevel.goal)) testVictory = true;

  // Portal teleportation
  const portals = testLevel.portals || [];
  if (blockedPortalIndex !== null) {
    const blocked = portals.find(p => p.index === blockedPortalIndex);
    if (!blocked || !tCollide(testPlayer, blocked)) blockedPortalIndex = null;
  }
  for (const portal of portals) {
    if (portal.index === blockedPortalIndex) continue;
    if (tCollide(testPlayer, portal)) {
      const other = portals.find(p => p.index !== portal.index);
      if (other) { teleportPlayer(other); blockedPortalIndex = other.index; }
      break;
    }
  }
}

function testDraw() {
  const L = testLevel;

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 50; i++) ctx.fillRect((i*73)%W, (i*41)%220, 1, 1);

  // Static platforms
  for (const p of (L.platforms||[])) drawObject(p);

  // Moving platforms (use existing drawObject, add dir for indicator)
  for (const m of testMovers)
    drawObject({ ...m, type:'moving', dir: m.x0 !== null ? 'h' : 'v' });

  // Walls, spikes, ladders, goal
  for (const w of (L.walls||[]))   drawObject({ ...w, type:'wall' });
  for (const s of (L.spikes||[]))  drawObject({ ...s, type:'spike' });
  for (const l of (L.ladders||[])) drawObject({ ...l, type:'ladder' });
  if (L.goal) drawObject({ ...L.goal, type:'goal' });

  // Portals
  for (const portal of (L.portals||[])) drawObject(portal);

  // Turrets and bullets
  for (const t of testTurrets) {
    drawObject(t);
    ctx.fillStyle = '#ff2222';
    for (const proj of t.projectiles) ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
  }

  // Player
  const p = testPlayer;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(p.x+6, p.y+7, 5, 5); ctx.fillRect(p.x+13, p.y+7, 5, 5);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(p.x+8, p.y+9, 2, 2); ctx.fillRect(p.x+15, p.y+9, 2, 2);

  // HUD bar
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, 24);
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00bbff'; ctx.textAlign = 'left';
  ctx.fillText('TEST  ·  WASD / Arrows: move  ·  Space: jump  ·  R: restart  ·  ESC: stop', 8, 15);
  ctx.fillStyle = '#ff00ff'; ctx.textAlign = 'right';
  ctx.fillText('DEATHS: ' + testDeaths, W - 8, 15);

  // Victory screen
  if (testVictory) {
    ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 20;
    ctx.fillText('LEVEL CLEAR!', W/2, H/2 - 30);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#00ff41'; ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
    ctx.fillText('R — retry   ·   ESC — back to editor', W/2, H/2 + 20);
    ctx.shadowBlur = 0;
  }
}

function testLoop(ts) {
  if (!testMode) return;
  const now = ts || performance.now();
  if (testLastTime === null) testLastTime = now;
  testAccumulator += Math.min(now - testLastTime, 200);
  testLastTime = now;
  while (testAccumulator >= T_TICK_MS) { testUpdate(); testAccumulator -= T_TICK_MS; }
  testDraw();
  testRaf = requestAnimationFrame(testLoop);
}

function startTest() {
  // Clear any editor state
  selectedObj = null; isMoving = false; dragHandle = null;
  hideProps();
  selectTool('mouse');

  testLevel   = buildTestLevel();
  testMovers  = testLevel.moving.map(m => ({ ...m, dir: 1 }));
  const ps    = testLevel.playerStart;
  testPlayer  = { x:ps.x, y:ps.y, w:24, h:28, vx:0, vy:0, onGround:false, onLadder:false };
  testDeaths     = 0;
  testVictory    = false;
  testRidingMover    = null;
  blockedPortalIndex = null;
  testTurrets = testLevel.turrets.map(t => ({ ...t, timer: Math.round(t.interval * 60), projectiles: [] }));
  testLastTime = null;
  testAccumulator = 0;
  testMode    = true;

  document.getElementById('test-btn').textContent = '■ STOP TEST';
  document.getElementById('test-btn').classList.add('active');
  testLoop();
}

function stopTest() {
  testMode = false;
  if (testRaf) { cancelAnimationFrame(testRaf); testRaf = null; }
  testKeys = {};
  document.getElementById('test-btn').textContent = '▶ TEST LEVEL';
  document.getElementById('test-btn').classList.remove('active');
  draw();
}

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Clear all objects from the canvas?')) return;
  objects     = [];
  selectedObj = null;
  isMoving    = false;
  dragHandle  = null;
  document.querySelector('.move-btn').classList.remove('active');
  hideProps();
  draw();
});

document.getElementById('test-btn').addEventListener('click', () => {
  testMode ? stopTest() : startTest();
});

document.addEventListener('keydown', e => {
  if (!testMode) return;
  testKeys[e.key] = true;
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'r' || e.key === 'R') {
    testMovers = testLevel.moving.map(m => ({ ...m, dir: 1 }));
    const ps = testLevel.playerStart;
    testPlayer.x = ps.x; testPlayer.y = ps.y;
    testPlayer.vx = 0;   testPlayer.vy = 0;
    testPlayer.onGround = false;
    testRidingMover = null; testVictory = false;
  }
  if (e.key === 'Escape') stopTest();
});

document.addEventListener('keyup', e => {
  if (!testMode) return;
  testKeys[e.key] = false;
});

draw();
