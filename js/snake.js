const COLS = 20, ROWS = 20, CELL = 20;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let mode = '1P';
// 1P state
let snake, dir, lastDir, food, score, gameLoop, running = false, started = false;
// 2P extra state
let snake2, dir2, lastDir2, score2;

// ── Mode toggle ──────────────────────────────────────────────
function toggleMode() {
  mode = mode === '1P' ? '2P' : '1P';
  const btn = document.getElementById('modeBtn');
  btn.textContent = mode + ' MODE';
  btn.classList.toggle('active', mode === '2P');
  document.getElementById('infoText').textContent = mode === '1P'
    ? 'Arrow keys or WASD to move'
    : 'WASD: P1 (green)  ·  Arrows: P2 (blue)  ·  Walls wrap';
  document.getElementById('legend1p').style.display = mode === '1P' ? 'flex' : 'none';
  document.getElementById('legend2p').style.display = mode === '2P' ? 'flex' : 'none';
  clearInterval(gameLoop);
  init();
}

// ── Init ─────────────────────────────────────────────────────
function init() {
  clearInterval(gameLoop);
  running = false; started = false;

  if (mode === '2P') {
    snake  = [{x:4,y:10},{x:3,y:10},{x:2,y:10}];
    dir    = {x:1, y:0};  lastDir  = {x:1, y:0};
    snake2 = [{x:15,y:10},{x:16,y:10},{x:17,y:10}];
    dir2   = {x:-1,y:0};  lastDir2 = {x:-1,y:0};
    score = 0; score2 = 0;
    document.getElementById('score').innerHTML =
      '<span style="color:#00ff41">P1: 0</span>  &nbsp;  <span style="color:#00aaff">P2: 0</span>';
    document.getElementById('msg').textContent = 'WASD or Arrow keys to start';
  } else {
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir   = {x:1, y:0};  lastDir = {x:1, y:0};
    snake2 = null;
    score = 0;
    document.getElementById('score').textContent = 'SCORE: 0';
    document.getElementById('msg').textContent = 'Press any key to start';
  }

  placeFood();
  draw();
}

// ── Food placement ───────────────────────────────────────────
function placeFood() {
  const occupied = [...snake, ...(snake2 || [])];
  let pos;
  do {
    pos = {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)};
  } while (occupied.some(s => s.x===pos.x && s.y===pos.y));
  food = pos;
}

// ── Helpers ──────────────────────────────────────────────────
function wrap(v, max) { return ((v % max) + max) % max; }

// ── 1P step ──────────────────────────────────────────────────
function step1P() {
  lastDir = {...dir};
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
  if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)) {
    clearInterval(gameLoop); running = false;
    document.getElementById('msg').textContent = 'GAME OVER! Press R to restart';
    return;
  }
  snake.unshift(head);
  if (head.x===food.x && head.y===food.y) {
    score++;
    document.getElementById('score').textContent = 'SCORE: ' + score;
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

// ── 2P step ──────────────────────────────────────────────────
function step2P() {
  lastDir  = {...dir};
  lastDir2 = {...dir2};

  const h1 = {x: wrap(snake[0].x  + dir.x,  COLS), y: wrap(snake[0].y  + dir.y,  ROWS)};
  const h2 = {x: wrap(snake2[0].x + dir2.x, COLS), y: wrap(snake2[0].y + dir2.y, ROWS)};

  const ate1 = h1.x===food.x && h1.y===food.y;
  const ate2 = h2.x===food.x && h2.y===food.y;

  // Effective body after this move (tail freed unless eating)
  const body1 = ate1 ? snake       : snake.slice(0, -1);
  const body2 = ate2 ? snake2      : snake2.slice(0, -1);

  // Death checks
  const dead1 = body1.some(s=>s.x===h1.x&&s.y===h1.y) ||
                body2.some(s=>s.x===h1.x&&s.y===h1.y);
  const dead2 = body2.some(s=>s.x===h2.x&&s.y===h2.y) ||
                body1.some(s=>s.x===h2.x&&s.y===h2.y);
  const headOn = h1.x===h2.x && h1.y===h2.y;

  if (dead1 || dead2 || headOn) {
    clearInterval(gameLoop); running = false;
    // Show heads for final frame
    snake.unshift(h1); snake2.unshift(h2);
    draw();
    let msg;
    if (headOn || (dead1 && dead2)) msg = 'DRAW! Both collided!  R to restart';
    else if (dead1) msg = '🔵 P2 WINS!  R to restart';
    else            msg = '🟢 P1 WINS!  R to restart';
    document.getElementById('msg').textContent = msg;
    return;
  }

  // Move
  snake.unshift(h1);
  snake2.unshift(h2);

  if (ate1 || ate2) {
    if (!ate1) snake.pop();
    if (!ate2) snake2.pop();
    if (ate1) score++;
    if (ate2) score2++;
    placeFood();
  } else {
    snake.pop();
    snake2.pop();
  }

  document.getElementById('score').innerHTML =
    '<span style="color:#00ff41">P1: ' + score + '</span>  &nbsp;  <span style="color:#00aaff">P2: ' + score2 + '</span>';
  draw();
}

// ── Draw ─────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 400, 400);

  // Grid
  ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5;
  for (let i=0;i<=COLS;i++) { ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,400); ctx.stroke(); }
  for (let i=0;i<=ROWS;i++) { ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(400,i*CELL); ctx.stroke(); }

  // Food
  ctx.fillStyle='#ff4444'; ctx.shadowColor='#ff4444'; ctx.shadowBlur=8;
  ctx.fillRect(food.x*CELL+2, food.y*CELL+2, CELL-4, CELL-4);
  ctx.shadowBlur=0;

  // Snake 1 (green)
  snake.forEach((seg, i) => {
    ctx.fillStyle = i===0 ? '#00ff41' : '#009922';
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = i===0 ? 10 : 0;
    ctx.fillRect(seg.x*CELL+1, seg.y*CELL+1, CELL-2, CELL-2);
  });
  ctx.shadowBlur = 0;

  // Snake 2 (blue) — 2P only
  if (mode==='2P' && snake2) {
    snake2.forEach((seg, i) => {
      ctx.fillStyle = i===0 ? '#00aaff' : '#0066bb';
      ctx.shadowColor = '#00aaff'; ctx.shadowBlur = i===0 ? 10 : 0;
      ctx.fillRect(seg.x*CELL+1, seg.y*CELL+1, CELL-2, CELL-2);
    });
    ctx.shadowBlur = 0;
  }
}

// ── Start ────────────────────────────────────────────────────
function startGame() {
  if (running) return;
  running = true; started = true;
  document.getElementById('msg').textContent = '';
  gameLoop = setInterval(() => mode==='2P' ? step2P() : step1P(), 130);
}

// ── Input ────────────────────────────────────────────────────
const p1Map = {
  w:{x:0,y:-1},W:{x:0,y:-1}, s:{x:0,y:1},S:{x:0,y:1},
  a:{x:-1,y:0},A:{x:-1,y:0}, d:{x:1,y:0},D:{x:1,y:0}
};
const p2Map = {
  ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
  ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}
};
const anyMap = {...p1Map, ...p2Map};

document.addEventListener('keydown', e => {
  if (e.key==='r'||e.key==='R') { clearInterval(gameLoop); init(); return; }

  if (mode==='2P') {
    // Prevent page scroll from arrow keys
    if (p2Map[e.key]) e.preventDefault();

    const d1 = p1Map[e.key];
    if (d1 && !(d1.x===-lastDir.x && d1.y===-lastDir.y)) {
      dir = d1;
      if (!started) startGame();
    }
    const d2 = p2Map[e.key];
    if (d2 && !(d2.x===-lastDir2.x && d2.y===-lastDir2.y)) {
      dir2 = d2;
      if (!started) startGame();
    }
  } else {
    if (p2Map[e.key]) e.preventDefault();
    const d = anyMap[e.key];
    if (!d) return;
    if (d.x===-lastDir.x && d.y===-lastDir.y) return;
    dir = d;
    if (!started) startGame();
  }
});

init();
