const games = ['snake.html', 'minesweeper.html', 'brickbreaker.html', 'platformer.html', 'pong.html'];
function goRandom() {
  const pick = games[Math.floor(Math.random() * games.length)];
  window.location.href = pick;
}
