const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const statusElement = document.getElementById("statusText");
const startPauseButton = document.getElementById("startPauseButton");
const restartButton = document.getElementById("restartButton");

const tileSize = 20;
const boardSize = canvas.width / tileSize;
const initialTickMs = 130;
const fastestTickMs = 70;
const tickStepMs = 6;
const highScoreStorageKey = "snake-sprint-high-score";

let snake = [];
let direction = { x: 1, y: 0 };
let queuedDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let highScore = Number(localStorage.getItem(highScoreStorageKey)) || 0;
let tickMs = initialTickMs;
let gameIntervalId = null;
let isRunning = false;
let isGameOver = false;

function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * boardSize),
    y: Math.floor(Math.random() * boardSize),
  };
}

function spawnFood() {
  let nextFood = randomCell();

  while (snake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y)) {
    nextFood = randomCell();
  }

  food = nextFood;
}

function updateScoreboard() {
  scoreElement.textContent = String(score);
  highScoreElement.textContent = String(highScore);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function drawGrid() {
  ctx.strokeStyle = "#0f1730";
  ctx.lineWidth = 1;

  for (let i = 0; i <= boardSize; i += 1) {
    const offset = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }
}

function drawFood() {
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(
    food.x * tileSize + tileSize / 2,
    food.y * tileSize + tileSize / 2,
    tileSize * 0.33,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawSnake() {
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#7fffd4" : "#67e8f9";
    ctx.fillRect(
      segment.x * tileSize + 1,
      segment.y * tileSize + 1,
      tileSize - 2,
      tileSize - 2
    );
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#060910";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function stopGameLoop() {
  if (gameIntervalId !== null) {
    clearInterval(gameIntervalId);
    gameIntervalId = null;
  }
}

function startGameLoop() {
  stopGameLoop();
  gameIntervalId = setInterval(tick, tickMs);
}

function updateSpeedIfNeeded() {
  if (score > 0 && score % 5 === 0 && tickMs > fastestTickMs) {
    tickMs = Math.max(fastestTickMs, tickMs - tickStepMs);
    if (isRunning) {
      startGameLoop();
    }
  }
}

function endGame() {
  isRunning = false;
  isGameOver = true;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus("Game over. Press Restart or hit R.");
}

function resetGameState() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  score = 0;
  tickMs = initialTickMs;
  isGameOver = false;
  spawnFood();
  updateScoreboard();
  render();
}

function startGame() {
  if (isRunning) {
    return;
  }

  if (isGameOver) {
    resetGameState();
  }

  isRunning = true;
  startPauseButton.textContent = "Pause";
  setStatus("Running...");
  startGameLoop();
}

function pauseGame() {
  if (!isRunning) {
    return;
  }

  isRunning = false;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus("Paused. Press Start or Space.");
}

function restartGame() {
  stopGameLoop();
  resetGameState();
  isRunning = false;
  startPauseButton.textContent = "Start";
  setStatus("Game reset. Press Start or Space.");
}

function tick() {
  direction = queuedDirection;
  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  const outOfBounds =
    nextHead.x < 0 ||
    nextHead.x >= boardSize ||
    nextHead.y < 0 ||
    nextHead.y >= boardSize;
  const hitBody = snake.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );

  if (outOfBounds || hitBody) {
    endGame();
    return;
  }

  snake.unshift(nextHead);
  const ateFood = nextHead.x === food.x && nextHead.y === food.y;

  if (ateFood) {
    score += 1;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(highScoreStorageKey, String(highScore));
    }
    spawnFood();
    updateSpeedIfNeeded();
    updateScoreboard();
  } else {
    snake.pop();
  }

  render();
}

function queueDirectionFromKey(key) {
  const normalized = key.toLowerCase();
  const keyMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  if (!(normalized in keyMap)) {
    return;
  }

  const nextDirection = keyMap[normalized];
  if (!isOpposite(nextDirection, direction)) {
    queuedDirection = nextDirection;
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (isRunning) {
      pauseGame();
    } else {
      startGame();
    }
    return;
  }

  if (event.key.toLowerCase() === "r") {
    restartGame();
    return;
  }

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }

  queueDirectionFromKey(event.key);
});

startPauseButton.addEventListener("click", () => {
  if (isRunning) {
    pauseGame();
  } else {
    startGame();
  }
});

restartButton.addEventListener("click", () => {
  restartGame();
});

highScoreElement.textContent = String(highScore);
restartGame();
