const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const statusEl = document.getElementById('status');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: '#3de2ff',
  O: '#ffd93d',
  T: '#ad7bff',
  S: '#44ff88',
  Z: '#ff5c7a',
  J: '#4f8cff',
  L: '#ffa752'
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

let board;
let current;
let score;
let lines;
let level;
let dropCounter;
let dropInterval;
let lastTime;
let gameOver;
let paused;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomTetromino() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return {
    type,
    matrix: SHAPES[type].map((row) => [...row]),
    color: COLORS[type],
    x: Math.floor(COLS / 2) - 1,
    y: -1
  };
}

function rotate(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      rotated[x][size - 1 - y] = matrix[y][x];
    }
  }

  return rotated;
}

function collides(piece, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) continue;

      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;

      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && board[boardY][boardX]) return true;
    }
  }

  return false;
}

function mergePiece() {
  for (let y = 0; y < current.matrix.length; y += 1) {
    for (let x = 0; x < current.matrix[y].length; x += 1) {
      if (!current.matrix[y][x]) continue;

      const boardY = current.y + y;
      if (boardY < 0) {
        gameOver = true;
        statusEl.textContent = '게임 오버! R 키로 재시작하세요.';
        return;
      }
      board[boardY][current.x + x] = current.color;
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 60);
    statusEl.textContent = `${cleared}줄 제거!`;
  }
}

function spawn() {
  current = randomTetromino();
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  if (collides(current)) {
    gameOver = true;
    statusEl.textContent = '게임 오버! R 키로 재시작하세요.';
  }
}

function softDrop() {
  if (!collides(current, 0, 1)) {
    current.y += 1;
    return;
  }

  mergePiece();
  if (gameOver) return;

  clearLines();
  spawn();
}

function hardDrop() {
  while (!collides(current, 0, 1)) {
    current.y += 1;
    score += 2;
  }
  softDrop();
}

function move(dir) {
  if (!collides(current, dir, 0)) {
    current.x += dir;
  }
}

function rotateCurrent() {
  const rotated = rotate(current.matrix);
  const prev = current.matrix;
  current.matrix = rotated;

  if (collides(current)) {
    current.x += 1;
    if (collides(current)) {
      current.x -= 2;
      if (collides(current)) {
        current.x += 1;
        current.matrix = prev;
      }
    }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = '#0a0f17';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function draw() {
  ctx.fillStyle = '#0f1620';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y][x]) drawCell(x, y, board[y][x]);
    }
  }

  for (let y = 0; y < current.matrix.length; y += 1) {
    for (let x = 0; x < current.matrix[y].length; x += 1) {
      if (!current.matrix[y][x]) continue;
      const drawY = current.y + y;
      if (drawY >= 0) drawCell(current.x + x, drawY, current.color);
    }
  }

  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function update(timestamp = 0) {
  if (gameOver) {
    draw();
    return;
  }

  if (paused) {
    draw();
    requestAnimationFrame(update);
    return;
  }

  const delta = timestamp - lastTime;
  lastTime = timestamp;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    softDrop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  dropInterval = 800;
  lastTime = 0;
  gameOver = false;
  paused = false;
  statusEl.textContent = '게임 시작!';
  spawn();
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') {
    resetGame();
    return;
  }

  if (gameOver) return;

  if (event.code === 'KeyP') {
    paused = !paused;
    statusEl.textContent = paused ? '일시정지됨 (P 키로 계속)' : '게임 재개!';
    return;
  }

  if (paused) return;

  if (event.code === 'ArrowLeft') move(-1);
  else if (event.code === 'ArrowRight') move(1);
  else if (event.code === 'ArrowDown') {
    softDrop();
    score += 1;
    dropCounter = 0;
  } else if (event.code === 'ArrowUp') rotateCurrent();
  else if (event.code === 'Space') {
    event.preventDefault();
    hardDrop();
    dropCounter = 0;
  }
});

resetGame();
requestAnimationFrame(update);
