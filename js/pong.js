const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W=640, H=400;
const WIN_SCORE=7;

const PADDLE_W=12, PADDLE_H=70, BALL_SIZE=12;
let p1={x:16,y:H/2-PADDLE_H/2,h:PADDLE_H,score:0};
let p2={x:W-16-PADDLE_W,y:H/2-PADDLE_H/2,h:PADDLE_H,score:0};
let ball={x:W/2,y:H/2,vx:0,vy:0};
let keys={}, running=false, raf, aiMode=false;

function resetBall(dir){
  ball.x=W/2; ball.y=H/2;
  const angle=(Math.random()-0.5)*Math.PI/3;
  const speed=4;
  ball.vx=Math.cos(angle)*speed*(dir||1);
  ball.vy=Math.sin(angle)*speed;
}

function start(){
  running=true;
  document.getElementById('msg').textContent='';
  resetBall(1);
}

function toggleAI(){
  aiMode=!aiMode;
  const btn=document.getElementById('aiBtn');
  btn.textContent='VS AI: '+(aiMode?'ON':'OFF');
  btn.classList.toggle('active',aiMode);
  document.getElementById('infoText').textContent=aiMode
    ? 'W/S — Player 1 · AI controls right · Space to start'
    : 'W/S — P1 · ↑/↓ — P2 · Space to start';
}

function update(){
  if(!running) return;
  const SPEED=5;
  if(keys['w']||keys['W']) p1.y=Math.max(0,p1.y-SPEED);
  if(keys['s']||keys['S']) p1.y=Math.min(H-p1.h,p1.y+SPEED);
  if(aiMode){
    // AI tracks ball center with a speed cap so it's beatable
    const aiCenter=p2.y+PADDLE_H/2;
    const ballCenter=ball.y+BALL_SIZE/2;
    const AI_SPEED=3.8;
    if(aiCenter<ballCenter-4) p2.y=Math.min(H-p2.h,p2.y+AI_SPEED);
    else if(aiCenter>ballCenter+4) p2.y=Math.max(0,p2.y-AI_SPEED);
  } else {
    if(keys['ArrowUp']) p2.y=Math.max(0,p2.y-SPEED);
    if(keys['ArrowDown']) p2.y=Math.min(H-p2.h,p2.y+SPEED);
  }

  ball.x+=ball.vx; ball.y+=ball.vy;

  // top/bottom
  if(ball.y<=0){ ball.y=0; ball.vy*=-1; }
  if(ball.y+BALL_SIZE>=H){ ball.y=H-BALL_SIZE; ball.vy*=-1; }

  // paddle 1
  if(ball.x<=p1.x+PADDLE_W && ball.x+BALL_SIZE>=p1.x &&
     ball.y+BALL_SIZE>=p1.y && ball.y<=p1.y+p1.h && ball.vx<0){
    ball.x=p1.x+PADDLE_W;
    ball.vx=Math.abs(ball.vx)*1.04;
    const rel=((ball.y+BALL_SIZE/2)-(p1.y+p1.h/2))/(p1.h/2);
    ball.vy=rel*5;
  }
  // paddle 2
  if(ball.x+BALL_SIZE>=p2.x && ball.x<=p2.x+PADDLE_W &&
     ball.y+BALL_SIZE>=p2.y && ball.y<=p2.y+p2.h && ball.vx>0){
    ball.x=p2.x-BALL_SIZE;
    ball.vx=-Math.abs(ball.vx)*1.04;
    const rel=((ball.y+BALL_SIZE/2)-(p2.y+p2.h/2))/(p2.h/2);
    ball.vy=rel*5;
  }

  // cap speed
  const spd=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);
  if(spd>12){ ball.vx=ball.vx/spd*12; ball.vy=ball.vy/spd*12; }

  // scoring
  if(ball.x<0){ p2.score++; checkWin(2); running=false; resetBall(-1); setTimeout(()=>{if(!checkWinDone)running=true;},800); }
  if(ball.x>W){ p1.score++; checkWin(1); running=false; resetBall(1); setTimeout(()=>{if(!checkWinDone)running=true;},800); }
}

let checkWinDone=false;
function checkWin(who){
  if(p1.score>=WIN_SCORE||p2.score>=WIN_SCORE){
    checkWinDone=true;
    cancelAnimationFrame(raf);
    const label = (who===2 && aiMode) ? 'AI' : `PLAYER ${who}`;
    document.getElementById('msg').textContent=`${label} WINS! Refresh to play again`;
    return true;
  }
  return false;
}

function draw(){
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  // center line
  ctx.setLineDash([12,12]); ctx.strokeStyle='#222'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
  ctx.setLineDash([]);
  // scores
  ctx.fillStyle='#00ff41'; ctx.font='bold 32px "Press Start 2P", monospace';
  ctx.textAlign='center';
  ctx.fillText(p1.score, W/4, 50);
  ctx.fillText(p2.score, 3*W/4, 50);
  // paddles
  ctx.fillStyle='#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=12;
  ctx.fillRect(p1.x,p1.y,PADDLE_W,p1.h);
  ctx.fillRect(p2.x,p2.y,PADDLE_W,p2.h);
  ctx.shadowBlur=0;
  // ball
  ctx.fillStyle='#ff00ff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=14;
  ctx.fillRect(ball.x,ball.y,BALL_SIZE,BALL_SIZE);
  ctx.shadowBlur=0;
}

function loop(){
  update(); draw();
  raf=requestAnimationFrame(loop);
}

document.addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(e.key===' '){ e.preventDefault(); if(!running&&!checkWinDone) start(); }
});
document.addEventListener('keyup',e=>keys[e.key]=false);

loop();
