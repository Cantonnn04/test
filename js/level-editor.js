const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const W = 640, H = 360;

let currentTool = 'mouse';
let objects = [];
let snapEnabled = false;
let selectedObj = null;
let isMoving    = false;
let dragHandle      = null; // active resize handle name, or null
let dragStart       = null; // { mouseX, mouseY, x, y, w, h } snapshot when drag began
let dragMoved       = false;
let turnaroundDrag  = null; // 'min' | 'max' | null
const mouse = { x: 0, y: 0, onCanvas: false };
const SNAP_THRESHOLD = 12;
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
  goal:     { w: 18, h: 18 },
  spawn:    { w: 24, h: 28 },
};

// ── Tool selection ──────────────────────────────────────────────────────
function selectTool(tool) {
  currentTool = tool;
  // Any tool switch clears selection and move mode
  if (selectedObj || isMoving) {
    selectedObj = null;
    isMoving    = false;
    document.querySelector('.move-btn').classList.remove('active');
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
    applyResize(mouse.x - dragStart.mouseX, mouse.y - dragStart.mouseY);
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
                   w: selectedObj.w, h: selectedObj.h };
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
  const obj = { type: currentTool, ...r };

  if (currentTool === 'moving') {
    // Default: horizontal travel, 80px each side of placement point
    obj.dir = 'h';
    obj.x0  = Math.max(0, r.x - 80);
    obj.x1  = Math.min(W, r.x + r.w + 80);
    obj.y0  = null;
    obj.y1  = null;
    obj.speed = 1.5;
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
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
  }
  return null;
}

function showProps(obj) {
  document.getElementById('no-selection-msg').style.display   = 'none';
  document.getElementById('selection-controls').style.display = 'block';
  document.getElementById('prop-w').value = obj.w;
  document.getElementById('prop-h').value = obj.h;

  const isMover = obj.type === 'moving';
  document.getElementById('moving-extras').style.display = isMover ? 'block' : 'none';

  if (isMover) {
    const horiz = obj.dir !== 'v';
    document.querySelectorAll('.dir-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.dir === obj.dir);
    });
    document.getElementById('prop-dist-min').value = horiz ? obj.x0 : obj.y0;
    document.getElementById('prop-dist-max').value = horiz ? obj.x1 : obj.y1;
  }
}

function hideProps() {
  document.getElementById('no-selection-msg').style.display   = 'block';
  document.getElementById('selection-controls').style.display = 'none';
  document.getElementById('moving-extras').style.display      = 'none';
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

// ── Resize handles ──────────────────────────────────────────────────────
function getHandles(obj) {
  const { x, y, w, h } = obj;
  return {
    nw: { x,         y         },
    n:  { x: x+w/2,  y         },
    ne: { x: x+w,    y         },
    w:  { x,         y: y+h/2  },
    e:  { x: x+w,    y: y+h/2  },
    sw: { x,         y: y+h    },
    s:  { x: x+w/2,  y: y+h    },
    se: { x: x+w,    y: y+h    },
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

function applyResize(dx, dy) {
  if (!dragHandle || !dragStart || !selectedObj) return;
  const { x: ox, y: oy, w: ow, h: oh } = dragStart;
  const MIN = 8;
  let nx = ox, ny = oy, nw = ow, nh = oh;

  if (dragHandle.includes('n')) {
    ny = oy + dy;
    ny = Math.min(oy + oh - MIN, ny);
    nh = (oy + oh) - ny;
  }
  if (dragHandle.includes('s')) {
    nh = Math.max(MIN, oh + dy);
  }
  if (dragHandle.includes('w')) {
    nx = Math.min(ox + ow - MIN, ox + dx);
    nw = (ox + ow) - nx;
  }
  if (dragHandle.includes('e')) {
    nw = Math.max(MIN, ow + dx);
  }

  selectedObj.x = Math.round(nx);
  selectedObj.y = Math.round(ny);
  selectedObj.w = Math.round(nw);
  selectedObj.h = Math.round(nh);
  document.getElementById('prop-w').value = selectedObj.w;
  document.getElementById('prop-h').value = selectedObj.h;
}

// ── Drawing ─────────────────────────────────────────────────────────────
function drawSpike(x, y, w, h, color) {
  ctx.fillStyle   = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 6;
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
  ctx.shadowBlur = 0;
}

function drawObject(obj, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  switch (obj.type) {
    case 'platform':
      ctx.fillStyle   = '#4444ff';
      ctx.shadowColor = '#4444ff';
      ctx.shadowBlur  = 6;
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.shadowBlur = 0;
      break;

    case 'moving':
      ctx.fillStyle   = '#aaddff';
      ctx.shadowColor = '#aaddff';
      ctx.shadowBlur  = 8;
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle  = '#ffffff';
      ctx.font       = '8px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(obj.dir === 'v' ? '↕' : '↔', obj.x + obj.w / 2, obj.y + obj.h - 2);
      break;

    case 'wall':
      ctx.fillStyle   = '#886622';
      ctx.shadowColor = '#cc9933';
      ctx.shadowBlur  = 6;
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.shadowBlur = 0;
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

    case 'goal':
      ctx.font        = 'bold 22px "Press Start 2P", monospace';
      ctx.fillStyle   = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur  = 18;
      ctx.textAlign   = 'left';
      ctx.fillText('★', obj.x + 2, obj.y + 22);
      ctx.shadowBlur = 0;
      break;

    case 'spawn':
      // Body
      ctx.fillStyle   = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur  = 10;
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.shadowBlur = 0;
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

    const ghostType = isMoving ? selectedObj.type : currentTool;
    const ghostDir  = isMoving ? (selectedObj.dir || 'h') : 'h';
    drawObject({ type: ghostType, ...r, dir: ghostDir }, 0.45);
  }
}

// ── Export ──────────────────────────────────────────────────────────────
function generateCode() {
  const platforms = objects.filter(o => o.type === 'platform');
  const moving    = objects.filter(o => o.type === 'moving');
  const walls     = objects.filter(o => o.type === 'wall');
  const spikes    = objects.filter(o => o.type === 'spike');
  const goal      = objects.find(o  => o.type === 'goal');
  const spawn     = objects.find(o  => o.type === 'spawn');

  const lines = [];

  if (platforms.length) {
    const arr = platforms.map(p => `[${p.x},${p.y},${p.w},${p.h}]`).join(',');
    lines.push(`  platforms:[${arr}]`);
  }

  if (moving.length) {
    const arr = moving.map(m =>
      `{x:${m.x},y:${m.y},w:${m.w},h:${m.h},` +
      `x0:${m.x0},x1:${m.x1},y0:${m.y0},y1:${m.y1},speed:${m.speed}}`
    ).join(',');
    lines.push(`  moving:[${arr}]`);
  }

  if (walls.length) {
    const arr = walls.map(w => `{x:${w.x},y:${w.y},w:${w.w},h:${w.h}}`).join(',');
    lines.push(`  walls:[${arr}]`);
  }

  if (spikes.length) {
    const arr = spikes.map(s => `{x:${s.x},y:${s.y},w:${s.w},h:${s.h}}`).join(',');
    lines.push(`  spikes:[${arr}]`);
  }

  if (goal) {
    lines.push(`  goal:{x:${goal.x},y:${goal.y},w:${goal.w},h:${goal.h}}`);
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
let testLastTime   = null, testAccumulator = 0;

const T_SPEED = 3.5, T_JUMP = -9, T_GRAVITY = 0.45;
const T_TICK_MS = 1000 / 60;

function buildTestLevel() {
  const pl = objects.filter(o => o.type === 'platform');
  const mv = objects.filter(o => o.type === 'moving');
  const wl = objects.filter(o => o.type === 'wall');
  const sp = objects.filter(o => o.type === 'spike');
  const goal  = objects.find(o => o.type === 'goal');
  const spawn = objects.find(o => o.type === 'spawn');
  return {
    platforms: pl.map(p => [p.x, p.y, p.w, p.h]),
    moving:    mv.map(m => ({ x:m.x, y:m.y, w:m.w, h:m.h,
                              x0:m.x0, x1:m.x1, y0:m.y0, y1:m.y1,
                              speed: m.speed || 1.5 })),
    walls:     wl.map(w => ({ x:w.x, y:w.y, w:w.w, h:w.h })),
    spikes:    sp.map(s => ({ x:s.x, y:s.y, w:s.w, h:s.h })),
    goal:      goal  ? { x:goal.x,  y:goal.y,  w:goal.w,  h:goal.h  } : null,
    playerStart: spawn ? { x:spawn.x, y:spawn.y } : { x:20, y:300 },
  };
}

function tAllPlatforms() {
  const statics = (testLevel.platforms||[]).map(([x,y,w,h]) => ({x,y,w,h}));
  return [...statics, ...testMovers];
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
  const J = testKeys['ArrowUp'] || testKeys['w'] || testKeys['W'] || testKeys[' '];

  if (L)      p.vx = -T_SPEED;
  else if (R) p.vx =  T_SPEED;
  else        p.vx *= 0.8;
  if (J && p.onGround) { p.vy = T_JUMP; p.onGround = false; }
  p.vy += T_GRAVITY;

  const plats = tAllPlatforms();
  const walls = testLevel.walls || [];

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
}

function tCollide(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function tDie() {
  testDeaths++;
  const ps = testLevel.playerStart;
  testPlayer.x = ps.x; testPlayer.y = ps.y;
  testPlayer.vx = 0;   testPlayer.vy = 0;
  testPlayer.onGround = false;
  testRidingMover = null;
}

function testUpdate() {
  if (testVictory) return;
  tUpdateMovers();
  tPhysicsStep();
  for (const s of (testLevel.spikes||[])) { if (tCollide(testPlayer, s)) { tDie(); return; } }
  if (testPlayer.y > H + 60) { tDie(); return; }
  if (testLevel.goal && tCollide(testPlayer, testLevel.goal)) testVictory = true;
}

function testDraw() {
  const L = testLevel;

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 50; i++) ctx.fillRect((i*73)%W, (i*41)%220, 1, 1);

  // Static platforms
  for (const [px,py,pw,ph] of (L.platforms||[])) {
    ctx.fillStyle = '#4444ff'; ctx.shadowColor = '#4444ff'; ctx.shadowBlur = 6;
    ctx.fillRect(px, py, pw, ph); ctx.shadowBlur = 0;
  }

  // Moving platforms (use existing drawObject, add dir for indicator)
  for (const m of testMovers)
    drawObject({ ...m, type:'moving', dir: m.x0 !== null ? 'h' : 'v' });

  // Walls, spikes, goal
  for (const w of (L.walls||[]))  drawObject({ ...w, type:'wall' });
  for (const s of (L.spikes||[])) drawObject({ ...s, type:'spike' });
  if (L.goal) drawObject({ ...L.goal, type:'goal' });

  // Player
  const p = testPlayer;
  ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10;
  ctx.fillRect(p.x, p.y, p.w, p.h); ctx.shadowBlur = 0;
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
  testPlayer  = { x:ps.x, y:ps.y, w:24, h:28, vx:0, vy:0, onGround:false };
  testDeaths  = 0;
  testVictory = false;
  testRidingMover = null;
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
