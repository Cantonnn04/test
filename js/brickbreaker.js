const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 600, H = 520;
canvas.width = W; canvas.height = H;

const BRICK_COLS = 10;
const BRICK_W = 52, BRICK_H = 18, BRICK_PAD = 4;
const BRICK_OFF_X = 22;
const BRICK_COLORS = ['#ff4466','#ff8844','#ffff44','#44ff88','#44aaff','#cc44ff','#ff44cc','#44ffff'];

const msg = document.getElementById('msg');
let mode = 1;
let raf = null;
const keys = {};

// ── 1P state ──────────────────────────────────────────────────────────────
let s1 = {};

function init1P() {
  s1 = {
    score: 0, lives: 3, launched: false,
    paddle: { x: W/2 - 40, w: 80, y: H - 32, h: 12 },
    ball: { x: W/2, y: H - 56, vx: 3, vy: -4.5, r: 8 },
    bricks: makeBricks1P(),
    over: false
  };
  document.getElementById('score1p').textContent = 0;
  document.getElementById('lives1p').textContent = 3;
  resetBall1P();
}

function makeBricks1P() {
  const rows = 8, arr = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < BRICK_COLS; c++)
      arr.push({ x: BRICK_OFF_X + c*(BRICK_W+BRICK_PAD), y: 50 + r*(BRICK_H+BRICK_PAD), alive: true, color: BRICK_COLORS[r % BRICK_COLORS.length] });
  return arr;
}

function resetBall1P() {
  s1.launched = false;
  const p = s1.paddle, b = s1.ball;
  b.x = p.x + p.w/2; b.y = p.y - b.r - 2;
  b.vx = 3; b.vy = -4.5;
  msg.textContent = 'Click or press SPACE to launch';
}

function loop1P() {
  if (s1.over) return;
  update1P(); draw1P();
  raf = requestAnimationFrame(loop1P);
}

function update1P() {
  const { paddle: p, ball: b } = s1;
  if (!s1.launched) { b.x = p.x + p.w/2; return; }
  b.x += b.vx; b.y += b.vy;
  if (b.x - b.r <= 0) { b.x = b.r; b.vx *= -1; }
  if (b.x + b.r >= W) { b.x = W - b.r; b.vx *= -1; }
  if (b.y - b.r <= 0) { b.y = b.r; b.vy *= -1; }
  if (b.y + b.r >= H) {
    s1.lives--;
    document.getElementById('lives1p').textContent = s1.lives;
    if (s1.lives <= 0) { endGame1P('GAME OVER!'); return; }
    resetBall1P(); return;
  }
  if (b.vy > 0 && b.y + b.r >= p.y && b.y - b.r < p.y + p.h && b.x >= p.x && b.x <= p.x + p.w) {
    b.y = p.y - b.r;
    b.vy = -Math.abs(b.vy);
    b.vx = ((b.x - (p.x + p.w/2)) / (p.w/2)) * 5;
    clampBall(b);
  }
  for (const brick of s1.bricks) {
    if (!brick.alive) continue;
    if (hitBrick(b, brick)) {
      brick.alive = false; s1.score += 10;
      document.getElementById('score1p').textContent = s1.score;
      b.vy *= -1; break;
    }
  }
  if (s1.bricks.every(b => !b.alive)) endGame1P('🏆 YOU WIN!');
}

function endGame1P(text) {
  s1.over = true;
  cancelAnimationFrame(raf);
  msg.textContent = text + ' Restarting in 3s...';
  setTimeout(() => { init1P(); loop1P(); }, 3000);
}

function draw1P() {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
  drawBricks(s1.bricks);
  drawPaddle(s1.paddle, '#00ff41');
  drawBall(s1.ball, '#ff00ff');
}

// ── 2P state ──────────────────────────────────────────────────────────────
let s2 = {};

function init2P() {
  s2 = {
    score: 0, over: false,
    p1: { x: W/2-40, w: 80, y: 20, h: 12, lives: 3, launched: false, dead: false },
    p2: { x: W/2-40, w: 80, y: H-32, h: 12, lives: 3, launched: false, dead: false },
    ball1: null, ball2: null,
    bricks: makeBricks2P()
  };
  const p1 = s2.p1, p2 = s2.p2;
  s2.ball1 = makeBall2P(p1.x+p1.w/2, p1.y+p1.h+10, 3, 4.5, 1);
  s2.ball2 = makeBall2P(p2.x+p2.w/2, p2.y-10, -3, -4.5, 2);
  document.getElementById('score2p').textContent = 0;
  document.getElementById('lives1').textContent = 3;
  document.getElementById('lives2').textContent = 3;
  msg.textContent = 'P1: press W to launch · P2: press ↑ to launch';
}

function makeBall2P(x, y, vx, vy, owner) {
  return { x, y, vx, vy, r: 8, active: true, owner };
}

function makeBricks2P() {
  const rows = 8, arr = [];
  const totalH = rows*(BRICK_H+BRICK_PAD) - BRICK_PAD;
  const startY = Math.floor(H/2 - totalH/2);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < BRICK_COLS; c++)
      arr.push({ x: BRICK_OFF_X + c*(BRICK_W+BRICK_PAD), y: startY + r*(BRICK_H+BRICK_PAD), alive: true, color: BRICK_COLORS[r % BRICK_COLORS.length] });
  return arr;
}

function resetBall2P(ball, owner) {
  const pad = owner === 1 ? s2.p1 : s2.p2;
  if (owner === 1) {
    ball.x = pad.x + pad.w/2; ball.y = pad.y + pad.h + 10;
    ball.vx = 3; ball.vy = 4.5;
  } else {
    ball.x = pad.x + pad.w/2; ball.y = pad.y - 10;
    ball.vx = -3; ball.vy = -4.5;
  }
  ball.active = true;
  if (owner === 1) s2.p1.launched = false;
  else s2.p2.launched = false;
  msg.textContent = owner === 1 ? 'P1: press W to launch' : 'P2: press ↑ to launch';
}

function loop2P() {
  if (s2.over) return;
  update2P(); draw2P();
  raf = requestAnimationFrame(loop2P);
}

function update2P() {
  const { p1, p2, ball1, ball2 } = s2;

  if (!p1.dead) {
    if (keys['a'] || keys['A']) p1.x = Math.max(0, p1.x - 8);
    if (keys['d'] || keys['D']) p1.x = Math.min(W - p1.w, p1.x + 8);
  }
  if (!p2.dead) {
    if (keys['ArrowLeft'])  p2.x = Math.max(0, p2.x - 8);
    if (keys['ArrowRight']) p2.x = Math.min(W - p2.w, p2.x + 8);
  }

  if (ball1.active && !p1.launched) { ball1.x = p1.x + p1.w/2; ball1.y = p1.y + p1.h + ball1.r + 2; }
  if (ball2.active && !p2.launched) { ball2.x = p2.x + p2.w/2; ball2.y = p2.y - ball2.r - 2; }

  if (ball1.active && p1.launched) moveBall2P(ball1);
  if (ball2.active && p2.launched) moveBall2P(ball2);

  if (s2.bricks.every(b => !b.alive)) { endGame2P('🏆 ALL BRICKS CLEARED!'); return; }
  if (p1.dead && p2.dead) endGame2P('GAME OVER!');
}

function moveBall2P(b) {
  const { p1, p2 } = s2;
  b.x += b.vx; b.y += b.vy;

  if (b.x - b.r <= 0) { b.x = b.r; b.vx *= -1; }
  if (b.x + b.r >= W) { b.x = W - b.r; b.vx *= -1; }

  // top edge — only costs p1 a life if this is p1's ball
  if (b.y - b.r <= 0) {
    if (b.owner === 1 && !p1.dead) {
      p1.lives--;
      document.getElementById('lives1').textContent = p1.lives;
      if (p1.lives <= 0) { p1.dead = true; b.active = false; }
      else resetBall2P(b, 1);
    } else {
      b.y = b.r; b.vy = Math.abs(b.vy);
    }
    return;
  }

  // bottom edge — only costs p2 a life if this is p2's ball
  if (b.y + b.r >= H) {
    if (b.owner === 2 && !p2.dead) {
      p2.lives--;
      document.getElementById('lives2').textContent = p2.lives;
      if (p2.lives <= 0) { p2.dead = true; b.active = false; }
      else resetBall2P(b, 2);
    } else {
      b.y = H - b.r; b.vy = -Math.abs(b.vy);
    }
    return;
  }

  // p1 paddle (top) — deflect downward
  if (!p1.dead && b.vy < 0 &&
      b.y - b.r <= p1.y + p1.h && b.y + b.r >= p1.y &&
      b.x >= p1.x && b.x <= p1.x + p1.w) {
    b.y = p1.y + p1.h + b.r + 1;
    b.vy = Math.abs(b.vy);
    b.vx = ((b.x - (p1.x + p1.w/2)) / (p1.w/2)) * 5;
    clampBall(b);
  }

  // p2 paddle (bottom) — deflect upward
  if (!p2.dead && b.vy > 0 &&
      b.y + b.r >= p2.y && b.y - b.r <= p2.y + p2.h &&
      b.x >= p2.x && b.x <= p2.x + p2.w) {
    b.y = p2.y - b.r - 1;
    b.vy = -Math.abs(b.vy);
    b.vx = ((b.x - (p2.x + p2.w/2)) / (p2.w/2)) * 5;
    clampBall(b);
  }

  // bricks
  for (const brick of s2.bricks) {
    if (!brick.alive) continue;
    if (hitBrick(b, brick)) {
      brick.alive = false; s2.score += 10;
      document.getElementById('score2p').textContent = s2.score;
      b.vy *= -1; break;
    }
  }
}

function endGame2P(text) {
  s2.over = true;
  cancelAnimationFrame(raf);
  msg.textContent = text + ' Restarting in 3s...';
  setTimeout(() => { init2P(); loop2P(); }, 3000);
}

function draw2P() {
  const { p1, p2, ball1, ball2 } = s2;
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);

  // subtle centre divider
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
  ctx.setLineDash([6,6]); ctx.beginPath();
  ctx.moveTo(0, H/2); ctx.lineTo(W, H/2);
  ctx.stroke(); ctx.setLineDash([]);

  drawBricks(s2.bricks);

  drawPaddle(p1, p1.dead ? '#333344' : '#44aaff');
  drawPaddle(p2, p2.dead ? '#333322' : '#00ff41');

  if (ball1.active) drawBall(ball1, '#44aaff');
  if (ball2.active) drawBall(ball2, '#ff4466');

  // eliminated banners
  if (p1.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 55);
    ctx.fillStyle = '#ff4444'; ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center'; ctx.fillText('P1 ELIMINATED', W/2, 34); ctx.textAlign = 'left';
  }
  if (p2.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H-55, W, 55);
    ctx.fillStyle = '#ff4444'; ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center'; ctx.fillText('P2 ELIMINATED', W/2, H-22); ctx.textAlign = 'left';
  }

  // launch prompts near unlaunched balls
  ctx.font = '7px "Press Start 2P"';
  if (ball1.active && !p1.launched && !p1.dead) {
    ctx.fillStyle = '#44aaff'; ctx.textAlign = 'center';
    ctx.fillText('W', ball1.x, ball1.y + 22);
  }
  if (ball2.active && !p2.launched && !p2.dead) {
    ctx.fillStyle = '#ff4466'; ctx.textAlign = 'center';
    ctx.fillText('↑', ball2.x, ball2.y - 14);
  }
  ctx.textAlign = 'left';
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function hitBrick(b, brick) {
  return b.x+b.r > brick.x && b.x-b.r < brick.x+BRICK_W &&
         b.y+b.r > brick.y && b.y-b.r < brick.y+BRICK_H;
}

function clampBall(b) {
  b.vx = Math.max(-6, Math.min(6, b.vx));
  if (Math.abs(b.vy) < 2) b.vy = b.vy < 0 ? -2 : 2;
}

function drawBricks(bricks) {
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 6;
    ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
    ctx.shadowBlur = 0;
  });
}

function drawPaddle(pad, color) {
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = color === '#333344' || color === '#333322' ? 0 : 10;
  ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
  ctx.shadowBlur = 0;
}

function drawBall(b, color) {
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.fill(); ctx.shadowBlur = 0;
}

// ── Mode switch ────────────────────────────────────────────────────────────
function setMode(m) {
  mode = m;
  cancelAnimationFrame(raf);
  document.getElementById('btn1p').classList.toggle('active', m === 1);
  document.getElementById('btn2p').classList.toggle('active', m === 2);
  document.getElementById('hud1p').style.display  = m === 1 ? 'flex' : 'none';
  document.getElementById('hud2p').style.display  = m === 2 ? 'flex' : 'none';
  document.getElementById('info1p').style.display = m === 1 ? '' : 'none';
  document.getElementById('info2p').style.display = m === 2 ? '' : 'none';
  if (m === 1) { init1P(); loop1P(); }
  else         { init2P(); loop2P(); }
}

// ── Input ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  const blockList = [' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (blockList.includes(e.key)) e.preventDefault();

  if (mode === 1) {
    if (e.key === ' ') { s1.launched = true; msg.textContent = ''; }
  } else {
    if ((e.key === 'w' || e.key === 'W') && s2.ball1 && s2.ball1.active && !s2.p1.launched && !s2.p1.dead) {
      s2.p1.launched = true; msg.textContent = '';
    }
    if (e.key === 'ArrowUp' && s2.ball2 && s2.ball2.active && !s2.p2.launched && !s2.p2.dead) {
      s2.p2.launched = true; msg.textContent = '';
    }
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// mouse (1P)
canvas.addEventListener('mousemove', e => {
  if (mode !== 1) return;
  const r = canvas.getBoundingClientRect();
  s1.paddle.x = Math.max(0, Math.min(W - s1.paddle.w, e.clientX - r.left - s1.paddle.w/2));
});
canvas.addEventListener('click', () => { if (mode === 1) { s1.launched = true; msg.textContent = ''; } });

// 1P smooth keyboard movement
setInterval(() => {
  if (mode !== 1 || !s1.paddle) return;
  if (keys['ArrowLeft']  || keys['a']) s1.paddle.x = Math.max(0, s1.paddle.x - 8);
  if (keys['ArrowRight'] || keys['d']) s1.paddle.x = Math.min(W - s1.paddle.w, s1.paddle.x + 8);
}, 16);

// ── Start ──────────────────────────────────────────────────────────────────
init1P();
loop1P();
