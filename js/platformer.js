const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W=640, H=360;

// ── Obstacle helpers ──────────────────────────────────────────────────────────
// movingPlatform: {x,y,w,h, x0,x1, y0,y1, speed}  (null range = no movement)
// wall:           {x,y,w,h}  (static solid wall block)
// spike:          {x,y,w,h}  (kills player on touch)
// bouncer:        moving spike {x,y,w,h, x0,x1,y0,y1,speed}

const LEVELS = [
  // 1 — tutorial, plain static platforms
  {
    platforms:[[0,330,200,20],[200,280,120,20],[350,230,120,20],[490,180,150,20],[250,150,80,20],[100,180,100,20],[0,230,80,20]],
    goal:{x:560,y:152,w:18,h:18}, playerStart:{x:20,y:300},
    bg:'#0a0a1a', pc:'#4444ff'
  },
  // 2 — slightly tighter jumps
  {
    platforms:[[0,330,100,20],[120,280,80,20],[230,240,60,20],[320,200,80,20],[430,240,60,20],[520,280,120,20],[420,160,80,20],[280,130,80,20],[150,160,80,20],[0,180,80,20]],
    goal:{x:300,y:102,w:18,h:18}, playerStart:{x:20,y:300},
    bg:'#0a1a0a', pc:'#44aa44'
  },
  // 3 — first moving platform
  {
    platforms:[[0,330,80,20],[100,300,60,15],[190,265,60,15],[280,230,60,15],[460,230,60,15],[530,200,110,15],[460,160,60,15],[360,130,60,15],[150,130,80,15],[40,160,80,15]],
    moving:[{x:280,y:185,w:70,h:14,x0:280,x1:400,y0:null,y1:null,speed:1.2}],
    goal:{x:276,y:102,w:18,h:18}, playerStart:{x:20,y:300},
    bg:'#1a0a0a', pc:'#ff4444'
  },
  // 4 — wall hurdles: staircase, each wall top is geometrically clearable from its adjacent platform
  {
    platforms:[[0,330,160,20],[180,290,120,15],[320,255,120,15],[460,220,100,15],[560,170,80,15]],
    walls:[{x:160,y:285,w:16,h:45},{x:300,y:250,w:16,h:80},{x:440,y:215,w:16,h:115}],
    goal:{x:576,y:142,w:18,h:18}, playerStart:{x:20,y:300},
    bg:'#0d0d1f', pc:'#5588ff'
  },
  // 5 — first spikes
  {
    platforms:[[0,330,100,20],[150,290,80,20],[280,250,80,20],[420,210,80,20],[550,170,90,20],[400,120,80,20],[240,100,80,20]],
    spikes:[{x:100,y:320,w:50,h:12},{x:360,y:200,w:40,h:12}],
    goal:{x:256,y:72,w:18,h:18}, playerStart:{x:20,y:300},
    bg:'#1a0d00', pc:'#ffaa00'
  },
  {
  platforms:[[27,305,80,16],[470,305,80,16],[276,76,263,16],[75,117,163,16]],
  moving:[{x:296,y:305,w:49,h:16,x0:115,x1:459,y0:null,y1:null,speed:1.5},{x:560,y:168,w:80,h:14,x0:null,x1:null,y0:77,y1:320,speed:1.5}],
  walls:[{x:163,y:85,w:16,h:30}],
  spikes:[{x:345,y:64,w:50,h:12},{x:144,y:105,w:50,h:12}],
  goal:{x:89,y:92,w:18,h:18},
  playerStart:{x:51,y:277},
  bg:'#0a0a1a', pc:'#4444ff'
},
{
  platforms:[[21,322,80,16],[466,322,80,16],[466,134,80,16],[352,105,80,16],[248,73,80,16],[45,150,80,16]],
  moving:[{x:218,y:322,w:80,h:14,x0:104,x1:461,y0:null,y1:null,speed:1.5},{x:546,y:174,w:80,h:14,x0:null,x1:null,y0:134,y1:336,speed:1.5}],
  walls:[{x:175,y:53,w:16,h:100},{x:352,y:274,w:16,h:48}],
  spikes:[{x:248,y:310,w:25,h:12},{x:352,y:262,w:16,h:12},{x:175,y:41,w:16,h:12},{x:466,y:122,w:50,h:12}],
  goal:{x:67,y:121,w:18,h:18},
  playerStart:{x:45,y:294},
  bg:'#0a0a1a', pc:'#4444ff'
},
{
  platforms:[[0,344,80,16],[400,236,80,16]],
  moving:[{x:80,y:275,w:80,h:14,x0:null,x1:null,y0:2,y1:360,speed:1.5},{x:160,y:204,w:80,h:14,x0:null,x1:null,y0:-1,y1:360,speed:1.5},{x:240,y:314,w:80,h:14,x0:null,x1:null,y0:-1,y1:360,speed:1.5},{x:320,y:111,w:80,h:14,x0:null,x1:null,y0:2,y1:360,speed:1.5}],
  spikes:[{x:400,y:224,w:50,h:12}],
  goal:{x:455,y:209,w:18,h:18},
  playerStart:{x:0,y:314},
  bg:'#0a0a1a', pc:'#4444ff'
},
  {
  platforms:[[560,42,80,16],[29,344,80,16]],
  moving:[{x:400,y:131,w:25,h:14,x0:null,x1:null,y0:2,y1:359,speed:1.5},{x:510,y:91,w:25,h:14,x0:null,x1:null,y0:0,y1:359,speed:1.5},{x:416,y:42,w:25,h:14,x0:null,x1:null,y0:1,y1:360,speed:1.5},{x:355,y:91,w:25,h:14,x0:null,x1:null,y0:2,y1:358,speed:1.5},{x:369,y:158,w:25,h:14,x0:null,x1:null,y0:2,y1:358,speed:1.5},{x:455,y:277,w:25,h:14,x0:null,x1:null,y0:1,y1:356,speed:1.5},{x:379,y:312,w:25,h:14,x0:null,x1:null,y0:-2,y1:360,speed:1.5},{x:348,y:242,w:25,h:14,x0:null,x1:null,y0:1,y1:359,speed:1.5},{x:486,y:337,w:25,h:14,x0:null,x1:null,y0:0,y1:360,speed:1.5},{x:400,y:337,w:25,h:14,x0:null,x1:null,y0:-5,y1:360,speed:1.5},{x:320,y:14,w:25,h:14,x0:null,x1:null,y0:0,y1:359,speed:1.5},{x:455,y:14,w:25,h:14,x0:null,x1:null,y0:0,y1:361,speed:1.5},{x:314,y:56,w:25,h:14,x0:null,x1:null,y0:0,y1:360,speed:1.5},{x:480,y:228,w:25,h:14,x0:null,x1:null,y0:0,y1:361,speed:1.5},{x:425,y:172,w:25,h:14,x0:null,x1:null,y0:2,y1:360,speed:1.5},{x:149,y:228,w:54,h:14,x0:114,x1:313,y0:null,y1:null,speed:1.5}],
  walls:[{x:624,y:-6,w:16,h:48},{x:388,y:0,w:16,h:48},{x:470,y:172,w:16,h:48},{x:339,y:277,w:16,h:48},{x:320,y:70,w:16,h:48}],
  spikes:[{x:88,y:332,w:23,h:12},{x:338,y:265,w:16,h:12}],
  goal:{x:43,y:312,w:18,h:18},
  playerStart:{x:584,y:14},
  bg:'#0a0a1a', pc:'#4444ff'
},
{
  platforms:[[88,294,233,16],[165,113,80,16],[224,175,99,16]],
  walls:[{x:168,y:129,w:16,h:162}],
  spikes:[{x:275,y:161,w:50,h:12},{x:184,y:282,w:50,h:12}],
  ladders:[{x:137,y:114,w:28,h:177},{x:246,y:113,w:28,h:60}],
  goal:{x:290,y:264,w:18,h:18},
  playerStart:{x:88,y:266},
  bg:'#0a0a1a', pc:'#4444ff'
},
{
  platforms:[[-4,273,648,16]],
  walls:[{x:320,y:-2,w:16,h:275},{x:113,y:215,w:30,h:58}],
  ladders:[{x:68,y:213,w:28,h:60}],
  portals:[{index:0,color:'#00ff44',surface:'floor',x:278,y:245,w:14,h:28},{index:1,color:'#ff6600',surface:'floor',x:429,y:245,w:14,h:28}],
  goal:{x:559,y:245,w:18,h:18},
  playerStart:{x:18,y:245},
  bg:'#0a0a1a', pc:'#4444ff'
},
{
  platforms:[[9,291,503,16],{x:56,y:218,w:216,h:54,angle:2.64864}],
  turrets:[{x:324,y:265,w:24,h:24,angle:-1.59688,interval:2}],
  goal:{x:423,y:262,w:18,h:18},
  playerStart:{x:14,y:239},
  bg:'#0a0a1a', pc:'#4444ff'
},
];


const SPEED=3.5, JUMP=-9, GRAVITY=0.45;
const TICK_MS = 1000 / 60;
let level=0, player, player2=null, keys={}, raf, victory=false, deaths=0, usedNav=false, twoPlayer=false, coopMode=false;
let mState=[], bState=[], tState=[], ridingMover=null, ridingMover2=null;
let blockedPortal1=null, blockedPortal2=null;
let lastTime=null, accumulator=0;

function initMoving(lvl){
  const L=LEVELS[lvl];
  mState=(L.moving||[]).map(m=>({...m,dir:1}));
  bState=(L.bouncers||[]).map(b=>({...b,dir:1}));
  tState=(L.turrets||[]).map(t=>({...t,timer:Math.round(t.interval*60),projectiles:[]}));
}

function makePlayer(x,y){ return {x,y,w:24,h:28,vx:0,vy:0,onGround:false,onLadder:false,facing:1}; }

function updateNavUI(){
  document.getElementById('nav-label').textContent='LEVEL '+(level+1)+' / '+LEVELS.length;
  document.getElementById('total-lvls').textContent=LEVELS.length;
  document.getElementById('btn-prev').disabled=(level===0);
  document.getElementById('btn-next').disabled=(level===LEVELS.length-1);
}

function initLevel(lvl){
  const L=LEVELS[lvl];
  player=makePlayer(L.playerStart.x, L.playerStart.y);
  ridingMover=null;
  player2=twoPlayer ? makePlayer(L.playerStart.x+30, L.playerStart.y) : null;
  ridingMover2=null;
  blockedPortal1=null; blockedPortal2=null;
  document.getElementById('lvl').textContent=lvl+1;
  document.getElementById('msg').textContent='';
  initMoving(lvl);
  updateNavUI();
}

function navLevel(dir){
  const next=level+dir;
  if(next<0||next>=LEVELS.length) return;
  if(!usedNav){
    usedNav=true;
    document.getElementById('deaths-hud').style.display='none';
  }
  victory=false;
  level=next;
  initLevel(level);
  if(!raf) loop();
}

function collide(a,b){
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}

function _obbCorners(obj){
  const cx=obj.x+obj.w/2,cy=obj.y+obj.h/2,a=obj.angle,c=Math.cos(a),s=Math.sin(a),hw=obj.w/2,hh=obj.h/2;
  return [{x:cx-c*hw+s*hh,y:cy-s*hw-c*hh},{x:cx+c*hw+s*hh,y:cy+s*hw-c*hh},
          {x:cx+c*hw-s*hh,y:cy+s*hw+c*hh},{x:cx-c*hw-s*hh,y:cy-s*hw+c*hh}];
}
function _proj(corners,ax,ay){
  let mn=Infinity,mx=-Infinity;
  for(const{x,y}of corners){const d=x*ax+y*ay;if(d<mn)mn=d;if(d>mx)mx=d;}
  return[mn,mx];
}
function obbVsAABBP(obj,p){
  const a=obj.angle,c=Math.cos(a),s=Math.sin(a),oc=_obbCorners(obj);
  const pc=[{x:p.x,y:p.y},{x:p.x+p.w,y:p.y},{x:p.x+p.w,y:p.y+p.h},{x:p.x,y:p.y+p.h}];
  let minD=Infinity,nx=0,ny=0;
  for(const[ax,ay]of[[1,0],[0,1],[c,s],[-s,c]]){
    const[pn,px]=_proj(pc,ax,ay),[on,ox]=_proj(oc,ax,ay);
    if(px<=on||ox<=pn)return null;
    const d=Math.min(px-on,ox-pn);if(d<minD){minD=d;nx=ax;ny=ay;}
  }
  if(((p.x+p.w/2)-(obj.x+obj.w/2))*nx+((p.y+p.h/2)-(obj.y+obj.h/2))*ny<0){nx=-nx;ny=-ny;}
  return{depth:minD,nx,ny};
}
function collideOBB(a,b){
  if(!b.angle)return collide(a,b);
  return obbVsAABBP(b,a)!==null;
}

function updateMovers(){
  for(const m of mState){
    const px=m.x, py=m.y;
    if(m.x0!==null){
      m.x+=m.speed*m.dir;
      if(m.x<=m.x0||m.x+m.w>=m.x1) m.dir*=-1;
    } else {
      m.y+=m.speed*m.dir;
      if(m.y<=m.y0||m.y+m.h>=m.y1) m.dir*=-1;
    }
    const dx=m.x-px, dy=m.y-py;
    if(ridingMover===m){
      player.x+=dx; player.y+=dy;
      player.x=Math.max(0,Math.min(W-player.w,player.x));
    }
    if(player2 && ridingMover2===m){
      player2.x+=dx; player2.y+=dy;
      player2.x=Math.max(0,Math.min(W-player2.w,player2.x));
    }
  }
  for(const b of bState){
    if(b.x0!==null){
      b.x+=b.speed*b.dir;
      if(b.x<=b.x0||b.x+b.w>=b.x1) b.dir*=-1;
    } else {
      b.y+=b.speed*b.dir;
      if(b.y<=b.y0||b.y+b.h>=b.y1) b.dir*=-1;
    }
  }
}

function allPlatforms(){
  const L=LEVELS[level];
  const statics=(L.platforms||[]).map(p=>Array.isArray(p)?{x:p[0],y:p[1],w:p[2],h:p[3]}:p);
  return [...statics,...mState];
}

function allWalls(){
  return [...(LEVELS[level].walls||[]), ...(LEVELS[level].turrets||[]), ...(LEVELS[level].springs||[])];
}

function die(p){
  deaths++;
  document.getElementById('deaths').textContent=deaths;
  const L=LEVELS[level];
  if(p===player){
    player.x=L.playerStart.x; player.y=L.playerStart.y; player.vx=0; player.vy=0; ridingMover=null;
  } else {
    player2.x=L.playerStart.x+30; player2.y=L.playerStart.y; player2.vx=0; player2.vy=0; ridingMover2=null;
  }
  for(const t of tState) t.projectiles=[];
}

// Shared physics step — moves one player through the world
function physicsStep(p, goLeft, goRight, doJump, goUp, goDown, ridRef){
  const ladders = LEVELS[level].ladders || [];
  const pcx = p.x + p.w / 2;
  const nearLadder = ladders.some(l => l.angle
    ? collideOBB(p, l)
    : pcx > l.x && pcx < l.x + l.w && p.y + p.h > l.y + 2 && p.y < l.y + l.h - 2
  );
  const onLadderTop = !nearLadder && ladders.some(l => !l.angle &&
    pcx > l.x && pcx < l.x + l.w &&
    Math.abs(p.y + p.h - l.y) <= 4 && p.onGround
  );
  if (nearLadder && (goUp || goDown)) p.onLadder = true;
  if (onLadderTop && goDown)          p.onLadder = true;
  if (!nearLadder && !onLadderTop)    p.onLadder = false;
  if (doJump)                         p.onLadder = false;

  if(p.onLadder){
    if(goLeft) p.vx=-SPEED; else if(goRight) p.vx=SPEED; else p.vx*=0.8;
    if(goUp)        p.vy = -SPEED;
    else if(goDown) p.vy =  SPEED;
    else            p.vy =  0;
    if(doJump && p.onGround){ p.vy=JUMP; p.onGround=false; p.onLadder=false; }
  } else {
    if(goLeft) p.vx=-SPEED;
    else if(goRight) p.vx=SPEED;
    else p.vx*=0.8;
    if((doJump||goUp) && p.onGround){ p.vy=JUMP; p.onGround=false; }
    p.vy+=GRAVITY;
  }

  if(Math.abs(p.vx)>0.3) p.facing=p.vx>0?1:-1;

  const _ap=allPlatforms(), _aw=allWalls();
  const _apA=_ap.filter(o=>!o.angle), _awA=_aw.filter(o=>!o.angle);

  p.x+=p.vx;
  for(const s of [..._apA,..._awA]){
    if(p.x<s.x+s.w && p.x+p.w>s.x && p.y+2<s.y+s.h && p.y+p.h-2>s.y){
      if(p.x+p.w/2<s.x+s.w/2) p.x=s.x-p.w; else p.x=s.x+s.w;
      p.vx=0; break;
    }
  }
  p.x=Math.max(0,Math.min(W-p.w,p.x));

  const tb=p.y, bb=p.y+p.h;
  p.y+=p.vy; p.onGround=false; ridRef.v=null;
  for(const pl of _apA){
    if(p.x<pl.x+pl.w && p.x+p.w>pl.x && p.y<pl.y+pl.h && p.y+p.h>pl.y){
      if(p.vy>=0 && bb<=pl.y+1){ p.y=pl.y-p.h; p.vy=0; p.onGround=true; if(mState.includes(pl)) ridRef.v=pl; }
      else if(p.vy<0 && tb>=pl.y+pl.h-1){ p.y=pl.y+pl.h; p.vy=0; }
      break;
    }
  }
  for(const w of _awA){
    if(p.x<w.x+w.w && p.x+p.w>w.x && p.y<w.y+w.h && p.y+p.h>w.y){
      if(p.vy>=0 && bb<=w.y+1){ p.y=w.y-p.h; p.vy=0; p.onGround=true; }
      else if(p.vy<0 && tb>=w.y+w.h-1){ p.y=w.y+w.h; p.vy=0; }
      break;
    }
  }
  // Ladder top acts as a platform; player must press down to descend
  if(!p.onLadder && !goDown){
    const cx=p.x+p.w/2;
    for(const l of ladders){
      if(l.angle) continue;
      if(cx>l.x && cx<l.x+l.w && p.vy>=0 && bb<=l.y+1 && p.y+p.h>l.y){
        p.y=l.y-p.h; p.vy=0; p.onGround=true; break;
      }
    }
  }
  // OBB resolution for rotated objects (springs handled separately)
  for(const obj of [..._ap.filter(o=>o.angle),..._aw.filter(o=>o.angle&&o.type!=='bounce')]){
    const col=obbVsAABBP(obj,p);
    if(!col) continue;
    p.x+=col.nx*col.depth; p.y+=col.ny*col.depth;
    if(col.ny<-0.5){ if(p.vy>0)p.vy=0; p.onGround=true; if(mState.includes(obj))ridRef.v=obj; }
    else if(col.ny>0.5){ if(p.vy<0)p.vy=0; }
    else{ if(col.nx>0&&p.vx<0)p.vx=0; if(col.nx<0&&p.vx>0)p.vx=0; }
  }

  // Spring bounce
  for(const sp of (LEVELS[level].springs||[])){
    let hit=false;
    if(!sp.angle){
      if(p.x<sp.x+sp.w&&p.x+p.w>sp.x&&Math.abs(p.y+p.h-sp.y)<=2&&p.vy>-5){ p.y=sp.y-p.h; hit=true; }
    } else {
      const col=obbVsAABBP(sp,p);
      if(col&&col.ny<-0.5&&p.vy>-5){ p.x+=col.nx*col.depth; p.y+=col.ny*col.depth; hit=true; }
    }
    if(hit){ p.vy=JUMP*1.8; p.vx=(p.facing||1)*4; p.onGround=false; break; }
  }
}

// Push the two players out of each other after both have moved
function resolvePlayerCollision(){
  if(!player2||!collide(player,player2)) return;
  const ox=Math.min(player.x+player.w,player2.x+player2.w)-Math.max(player.x,player2.x);
  const oy=Math.min(player.y+player.h,player2.y+player2.h)-Math.max(player.y,player2.y);
  if(ox<=oy){
    // side push
    const half=ox/2;
    if(player.x+player.w/2<player2.x+player2.w/2){ player.x-=half; player2.x+=half; }
    else{ player.x+=half; player2.x-=half; }
    player.vx=0; player2.vx=0;
  } else {
    // vertical: upper player stands on lower
    if(player.y<player2.y){ player.y=player2.y-player.h; player.vy=0; player.onGround=true; }
    else{ player2.y=player.y-player2.h; player2.vy=0; player2.onGround=true; }
  }
  player.x=Math.max(0,Math.min(W-player.w,player.x));
  player2.x=Math.max(0,Math.min(W-player2.w,player2.x));
}

function toggleMode(){
  // Cycle: 1P → 2P → CO-OP → 1P
  if(!twoPlayer && !coopMode){ twoPlayer=true;  coopMode=false; }
  else if(twoPlayer)          { twoPlayer=false; coopMode=true;  }
  else                        { twoPlayer=false; coopMode=false; }

  const btn=document.getElementById('btn-mode');
  const info=document.getElementById('info-controls');
  if(twoPlayer){
    btn.textContent='2P ✓'; btn.style.color='#00ffff'; btn.style.borderColor='#00ffff';
    info.textContent='P1: WASD+Space  ·  P2: Arrow keys  ·  Both reach ★ to advance  ·  R restart';
  } else if(coopMode){
    btn.textContent='CO-OP ✓'; btn.style.color='#ffff00'; btn.style.borderColor='#ffff00';
    info.textContent='P1: W to jump  ·  P2: ◀ ▶ to move  ·  R to restart';
  } else {
    btn.textContent='2P MODE'; btn.style.color=''; btn.style.borderColor='';
    info.textContent='Arrow keys / WASD · Space/W/Up to jump · R to restart';
  }
  initLevel(level);
}

function teleportChar(p, exit) {
  if (exit.surface === 'floor') {
    p.x = exit.x + exit.w / 2 - p.w / 2;
    p.y = exit.y + exit.h - p.h;
  } else if (exit.surface === 'wall-left') {
    p.x = exit.x - p.w;
    p.y = exit.y + exit.h / 2 - p.h / 2;
    p.vx = -(Math.abs(p.vx) || 2);
  } else if (exit.surface === 'wall-right') {
    p.x = exit.x + exit.w;
    p.y = exit.y + exit.h / 2 - p.h / 2;
    p.vx = Math.abs(p.vx) || 2;
  } else {
    p.x = exit.x + exit.w / 2 - p.w / 2;
    p.y = exit.y + exit.h / 2 - p.h / 2;
  }
}

function applyPortals(p, blockedRef) {
  const portals = LEVELS[level].portals || [];
  if (blockedRef.v !== null) {
    const bl = portals.find(q => q.index === blockedRef.v);
    if (!bl || !collide(p, bl)) blockedRef.v = null;
  }
  for (const portal of portals) {
    if (portal.index === blockedRef.v) continue;
    if (collide(p, portal)) {
      const other = portals.find(q => q.index !== portal.index);
      if (other) { teleportChar(p, other); blockedRef.v = other.index; }
      break;
    }
  }
}

function update(){
  if(victory) return;
  const L=LEVELS[level];

  updateMovers();

  // Key bindings vary by mode:
  //  1P:    WASD + Space + arrows all work for the one player
  //  2P:    P1 = WASD+Space,  P2 = arrows (handled below)
  //  CO-OP: P1 = W (jump only),  P2 = arrows (move only) — one shared character
  const p1L    = coopMode ? keys['ArrowLeft']  : (keys['a']||keys['A']||(!twoPlayer&&keys['ArrowLeft']));
  const p1R    = coopMode ? keys['ArrowRight'] : (keys['d']||keys['D']||(!twoPlayer&&keys['ArrowRight']));
  const p1Up   = coopMode ? (keys['w']||keys['W']) : (keys['w']||keys['W']||(!twoPlayer&&(keys['ArrowUp']||keys['Up'])));
  const p1Down = coopMode ? false : (keys['s']||keys['S']||(!twoPlayer&&keys['ArrowDown']));
  const p1J    = coopMode ? false : keys[' '];
  const r1={v:ridingMover};
  physicsStep(player,p1L,p1R,p1J,p1Up,p1Down,r1);
  ridingMover=r1.v;

  // Turret tick — advance timers, spawn and move bullets
  for(const t of tState){
    t.timer--;
    if(t.timer<=0){
      t.timer=Math.round(t.interval*60);
      const tcx=t.x+t.w/2, tcy=t.y+t.h/2, ang=t.angle||0, spd=4, rad=t.w/2+16;
      t.projectiles.push({x:tcx+Math.cos(ang)*rad-4, y:tcy+Math.sin(ang)*rad-4, w:8,h:8, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd});
    }
    for(const p of t.projectiles){ p.x+=p.vx; p.y+=p.vy; }
    t.projectiles=t.projectiles.filter(p=>p.x>-16&&p.x<W+16&&p.y>-16&&p.y<H+16);
  }

  let p1dead=false;
  for(const s of (L.spikes||[])){ if(collideOBB(player,s)){ die(player); p1dead=true; break; } }
  if(!p1dead) for(const b of bState){ if(collide(player,b)){ die(player); p1dead=true; break; } }
  if(!p1dead && player.y>H+50){ die(player); p1dead=true; }
  if(!p1dead) for(const t of tState){ for(const proj of t.projectiles){ if(collide(player,proj)){ die(player); p1dead=true; break; } } if(p1dead) break; }
  if(!p1dead){ const bp1={v:blockedPortal1}; applyPortals(player,bp1); blockedPortal1=bp1.v; }

  if(twoPlayer && player2){
    const r2={v:ridingMover2};
    physicsStep(player2, keys['ArrowLeft'], keys['ArrowRight'], false, keys['ArrowUp']||keys['Up'], keys['ArrowDown'], r2);
    ridingMover2=r2.v;

    let p2dead=false;
    for(const s of (L.spikes||[])){ if(collideOBB(player2,s)){ die(player2); p2dead=true; break; } }
    if(!p2dead) for(const b of bState){ if(collide(player2,b)){ die(player2); p2dead=true; break; } }
    if(!p2dead && player2.y>H+50){ die(player2); p2dead=true; }
    if(!p2dead) for(const t of tState){ for(const proj of t.projectiles){ if(collide(player2,proj)){ die(player2); p2dead=true; break; } } if(p2dead) break; }
    if(!p2dead){ const bp2={v:blockedPortal2}; applyPortals(player2,bp2); blockedPortal2=bp2.v; }

    if(!p1dead && !p2dead) resolvePlayerCollision();
  }

  // Goal: 1P = player reaches it; 2P = both reach it simultaneously
  const p1g=collideOBB(player,L.goal);
  const p2g=twoPlayer && player2 && collideOBB(player2,L.goal);
  if(twoPlayer ? (p1g&&p2g) : p1g){
    if(level<LEVELS.length-1){
      level++;
      initLevel(level);
      document.getElementById('msg').textContent='Level '+level+' complete! ▶';
      setTimeout(()=>document.getElementById('msg').textContent='',1500);
    } else {
      victory=true;
      cancelAnimationFrame(raf);
      draw();
    }
  }
}

function drawChar(p, col, label){
  ctx.fillStyle=col;
  ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.fillStyle='#fff';
  ctx.fillRect(p.x+6,p.y+7,5,5); ctx.fillRect(p.x+13,p.y+7,5,5);
  ctx.fillStyle='#0a0a0a';
  ctx.fillRect(p.x+8,p.y+9,2,2); ctx.fillRect(p.x+15,p.y+9,2,2);
  if(label){
    ctx.font='6px "Press Start 2P",monospace'; ctx.fillStyle=col;
    ctx.textAlign='center'; ctx.fillText(label,p.x+p.w/2,p.y-3);
  }
}

function drawSpike(x,y,w,h,color){
  ctx.fillStyle=color;
  const count=Math.floor(w/10);
  const sw=w/count;
  ctx.beginPath();
  for(let i=0;i<count;i++){
    ctx.moveTo(x+i*sw, y+h);
    ctx.lineTo(x+i*sw+sw/2, y);
    ctx.lineTo(x+(i+1)*sw, y+h);
  }
  ctx.closePath();
  ctx.fill();
}

function draw(){
  const L=LEVELS[level];
  ctx.fillStyle=L.bg; ctx.fillRect(0,0,W,H);

  // stars
  ctx.fillStyle='rgba(255,255,255,0.25)';
  for(let i=0;i<50;i++){
    ctx.fillRect(((i*73+level*117)%W),((i*41+level*53)%220),1,1);
  }

  // static platforms
  for(const _p of (L.platforms||[])){
    const po=Array.isArray(_p)?{x:_p[0],y:_p[1],w:_p[2],h:_p[3]}:_p;
    if(po.angle){ctx.save();const cx=po.x+po.w/2,cy=po.y+po.h/2;ctx.translate(cx,cy);ctx.rotate(po.angle);ctx.translate(-cx,-cy);}
    ctx.fillStyle=L.pc; ctx.fillRect(po.x,po.y,po.w,po.h);
    if(po.angle)ctx.restore();
  }

  // moving platforms — brighter
  ctx.fillStyle='#aaddff';
  for(const m of mState){
    ctx.fillRect(m.x,m.y,m.w,m.h);
    // arrow indicator
    ctx.fillStyle='#ffffff';
    ctx.font='8px monospace';
    ctx.textAlign='center';
    ctx.fillText(m.x0!==null?'↔':'↕', m.x+m.w/2, m.y+m.h-2);
    ctx.fillStyle='#aaddff';
  }

  // walls
  for(const w of (L.walls||[])){
    if(w.angle){ctx.save();const cx=w.x+w.w/2,cy=w.y+w.h/2;ctx.translate(cx,cy);ctx.rotate(w.angle);ctx.translate(-cx,-cy);}
    ctx.fillStyle='#886622'; ctx.fillRect(w.x,w.y,w.w,w.h);
    ctx.fillStyle='#553311';
    for(let row=0;row*12<w.h;row++){
      const off=row%2===0?0:w.w/2;
      for(let col=-w.w;col<w.w*2;col+=w.w){
        ctx.fillRect(w.x+col+off, w.y+row*12, Math.min(w.w,w.w/2)-1, 11);
      }
    }
    if(w.angle)ctx.restore();
  }

  // ladders
  for(const l of (L.ladders||[])){
    if(l.angle){ctx.save();const cx=l.x+l.w/2,cy=l.y+l.h/2;ctx.translate(cx,cy);ctx.rotate(l.angle);ctx.translate(-cx,-cy);}
    ctx.fillStyle='#aa8844';
    ctx.fillRect(l.x,l.y,4,l.h); ctx.fillRect(l.x+l.w-4,l.y,4,l.h);
    ctx.fillStyle='#cc9933';
    for(let ry=l.y+4; ry+3<=l.y+l.h; ry+=12){ ctx.fillRect(l.x+4,ry,l.w-8,3); }
    if(l.angle)ctx.restore();
  }

  // static spikes
  for(const s of (L.spikes||[])){
    if(s.angle){ctx.save();const cx=s.x+s.w/2,cy=s.y+s.h/2;ctx.translate(cx,cy);ctx.rotate(s.angle);ctx.translate(-cx,-cy);}
    drawSpike(s.x,s.y,s.w,s.h,'#ff2222');
    if(s.angle)ctx.restore();
  }
  // bouncer spikes
  for(const b of bState){
    drawSpike(b.x,b.y,b.w,b.h,'#ff8800');
  }

  // springs
  for(const s of (L.springs||[])){
    if(s.angle){ctx.save();const cx=s.x+s.w/2,cy=s.y+s.h/2;ctx.translate(cx,cy);ctx.rotate(s.angle);ctx.translate(-cx,-cy);}
    const coilH=s.h-4,coilCount=4;
    ctx.fillStyle='#778866'; ctx.fillRect(s.x,s.y+coilH,s.w,4);
    ctx.strokeStyle='#aaccaa'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(s.x+s.w/2,s.y+coilH);
    for(let i=0;i<coilCount;i++){
      ctx.lineTo(i%2===0?s.x+s.w-3:s.x+3, s.y+coilH-(i+0.5)*(coilH/coilCount));
      ctx.lineTo(s.x+s.w/2, s.y+coilH-(i+1)*(coilH/coilCount));
    }
    ctx.stroke();
    ctx.fillStyle='#aaccaa'; ctx.fillRect(s.x+2,s.y,s.w-4,3);
    if(s.angle)ctx.restore();
  }

  // portals
  for(const portal of (L.portals||[])){
    const pcx=portal.x+portal.w/2, pcy=portal.y+portal.h/2;
    ctx.save();
    ctx.shadowColor=portal.color; ctx.shadowBlur=14;
    ctx.strokeStyle=portal.color; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.ellipse(pcx,pcy,portal.w/2,portal.h/2,0,0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle=portal.color+'33'; ctx.fill();
    ctx.restore();
  }

  // turrets and bullets
  for(const t of tState){
    const tcx=t.x+t.w/2, tcy=t.y+t.h/2, ta=t.angle||0;
    ctx.save();
    if(ta){ ctx.translate(tcx,tcy); ctx.rotate(ta); ctx.translate(-tcx,-tcy); }
    ctx.fillStyle='#556677'; ctx.fillRect(t.x,t.y,t.w,t.h);
    ctx.fillStyle='#334455'; ctx.fillRect(t.x+2,t.y+2,t.w-4,t.h-4);
    ctx.fillStyle='#445566'; ctx.fillRect(t.x+t.w, tcy-3, 16, 6);
    ctx.fillStyle='#ff3333'; ctx.fillRect(t.x+t.w-8, tcy-3, 6, 6);
    ctx.restore();
    ctx.fillStyle='#ff2222';
    for(const proj of t.projectiles) ctx.fillRect(proj.x,proj.y,proj.w,proj.h);
  }

  // goal
  const g=L.goal;
  ctx.font='bold 22px "Press Start 2P", monospace';
  ctx.fillStyle='#ffff00';
  ctx.textAlign='left';
  ctx.fillText('★', g.x+2, g.y+22);
  if(twoPlayer){
    ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
    if(collide(player,g)){   ctx.fillStyle='#ff00ff'; ctx.fillText('P1✓',g.x+14,g.y-2); }
    if(player2&&collide(player2,g)){ ctx.fillStyle='#00ffff'; ctx.fillText('P2✓',g.x+14,g.y-11); }
  }

  // players
  drawChar(player,'#ff00ff',twoPlayer?'P1':coopMode?'CO-OP':null);
  if(twoPlayer && player2) drawChar(player2,'#00ffff','P2');

  // victory
  if(victory){
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.font='28px "Press Start 2P", monospace';
    ctx.fillStyle='#ffff00';
    ctx.shadowColor='#ffff00'; ctx.shadowBlur=24;
    ctx.fillText('YOU WIN!', W/2, H/2-60);
    ctx.font='9px "Press Start 2P", monospace';
    ctx.fillStyle='#ff00ff';
    ctx.shadowColor='#ff00ff'; ctx.shadowBlur=12;
    ctx.fillText(twoPlayer?'ALL '+LEVELS.length+' LEVELS — 2P COMPLETE':coopMode?'ALL '+LEVELS.length+' LEVELS — CO-OP COMPLETE':'ALL '+LEVELS.length+' LEVELS COMPLETE', W/2, H/2-20);
    if(!usedNav){
      ctx.font='10px "Press Start 2P", monospace';
      ctx.fillStyle='#00ff41';
      ctx.shadowColor='#00ff41'; ctx.shadowBlur=8;
      ctx.fillText('DEATHS: '+deaths, W/2, H/2+20);
    }
    ctx.font='22px "Press Start 2P", monospace';
    ctx.fillStyle='#ffff00';
    ctx.fillText('★  ★  ★', W/2, H/2+60);
    ctx.font='9px "Press Start 2P", monospace';
    ctx.fillStyle='#00ff41';
    ctx.fillText('PRESS  R  TO  PLAY  AGAIN', W/2, H/2+100);
    ctx.shadowBlur=0;
  }
}

function loop(ts) {
  const now = ts || performance.now();
  if (lastTime === null) lastTime = now;
  accumulator += Math.min(now - lastTime, 200); // cap prevents spiral of death after tab switch
  lastTime = now;
  while (accumulator >= TICK_MS) { update(); accumulator -= TICK_MS; }
  draw();
  raf = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e=>{
  if((e.key==='r'||e.key==='R')){
    if(victory){
      victory=false; level=0; deaths=0; usedNav=false;
      document.getElementById('deaths').textContent=0;
      document.getElementById('deaths-hud').style.display='';
      initLevel(0); if(!raf) loop();
    } else {
      initLevel(level);
    }
    return;
  }
  keys[e.key]=true;
  if(e.key===' '||e.key==='ArrowUp'||e.key==='ArrowDown') e.preventDefault();
});
document.addEventListener('keyup', e=>keys[e.key]=false);

ctx.font='bold 22px "Press Start 2P", monospace';
initLevel(0);
loop();
