const ROWS=12, COLS=12, MINES=20;
let board=[], revealed=[], flagged=[], gameOver=false, firstClick=true, timerInt, seconds=0;

function initGame() {
  clearInterval(timerInt); seconds=0;
  document.getElementById('timer').textContent='0';
  document.getElementById('msg').textContent='';
  document.getElementById('mineCount').textContent=MINES;
  gameOver=false; firstClick=true;
  board=[]; revealed=[]; flagged=[];
  for(let r=0;r<ROWS;r++){board.push([]); revealed.push([]); flagged.push([]);
    for(let c=0;c<COLS;c++){board[r].push(0); revealed[r].push(false); flagged[r].push(false);}}
  render();
}

function placeMines(sr, sc) {
  let placed=0;
  while(placed<MINES){
    const r=Math.floor(Math.random()*ROWS), c=Math.floor(Math.random()*COLS);
    if(board[r][c]===-1) continue;
    if(Math.abs(r-sr)<=1 && Math.abs(c-sc)<=1) continue;
    board[r][c]=-1; placed++;
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if(board[r][c]===-1) continue;
    let cnt=0;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===-1) cnt++;
    }
    board[r][c]=cnt;
  }
}

function reveal(r,c){
  if(r<0||r>=ROWS||c<0||c>=COLS||revealed[r][c]||flagged[r][c]) return;
  revealed[r][c]=true;
  if(board[r][c]===0) for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
}

function checkWin(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
    if(board[r][c]!==-1 && !revealed[r][c]) return false;
  return true;
}

function render(){
  const grid=document.getElementById('grid');
  grid.innerHTML='';
  let flagCount=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(flagged[r][c]) flagCount++;
    const cell=document.createElement('div');
    cell.className='cell';
    const row=r, col=c;
    if(revealed[r][c]){
      cell.classList.add('revealed');
      if(board[r][c]===-1){ cell.classList.add('mine-hit'); cell.textContent='💣'; }
      else if(board[r][c]>0){ cell.textContent=board[r][c]; cell.classList.add('n'+board[r][c]); }
    } else if(flagged[r][c]){
      cell.classList.add('flagged'); cell.textContent='🚩';
    }
    if(!gameOver){
      cell.addEventListener('click',()=>{
        // chord click: clicking a revealed number when adjacent flags == number reveals safe neighbors
        if(revealed[row][col] && board[row][col] > 0){
          let flagsAround=0;
          for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
            const nr=row+dr, nc=col+dc;
            if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&flagged[nr][nc]) flagsAround++;
          }
          if(flagsAround===board[row][col]){
            let hitMine=false;
            for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
              const nr=row+dr, nc=col+dc;
              if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!flagged[nr][nc]&&!revealed[nr][nc]){
                if(board[nr][nc]===-1) hitMine=true;
                reveal(nr,nc);
              }
            }
            if(hitMine){
              for(let rr=0;rr<ROWS;rr++) for(let cc=0;cc<COLS;cc++) if(board[rr][cc]===-1) revealed[rr][cc]=true;
              gameOver=true;
              document.getElementById('msg').textContent='💥 BOOM! Press NEW GAME to retry';
              clearInterval(timerInt); render(); return;
            }
            if(checkWin()){ gameOver=true; clearInterval(timerInt); document.getElementById('msg').textContent='🏆 YOU WIN!'; }
            render();
          }
          return;
        }
        if(flagged[row][col]) return;
        if(firstClick){ firstClick=false; placeMines(row,col); startTimer(); }
        if(board[row][col]===-1){
          // reveal all mines
          for(let rr=0;rr<ROWS;rr++) for(let cc=0;cc<COLS;cc++) if(board[rr][cc]===-1) revealed[rr][cc]=true;
          gameOver=true;
          document.getElementById('msg').textContent='💥 BOOM! Press NEW GAME to retry';
          clearInterval(timerInt); render(); return;
        }
        reveal(row,col);
        if(checkWin()){ gameOver=true; clearInterval(timerInt); document.getElementById('msg').textContent='🏆 YOU WIN!'; }
        render();
      });
      cell.addEventListener('contextmenu',e=>{
        e.preventDefault();
        if(revealed[row][col]) return;
        flagged[row][col]=!flagged[row][col];
        render();
      });
    }
    grid.appendChild(cell);
  }
  document.getElementById('mineCount').textContent=Math.max(0,MINES-flagCount);
}

function startTimer(){
  timerInt=setInterval(()=>{ seconds++; document.getElementById('timer').textContent=seconds; },1000);
}

initGame();
