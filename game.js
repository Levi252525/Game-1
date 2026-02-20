const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const statusElement = document.getElementById("statusText");
const startPauseButton = document.getElementById("startPauseButton");
const restartButton = document.getElementById("restartButton");

const worldWidth = 2200;
const worldHeight = canvas.height;
const gravity = 0.5;
const moveAcceleration = 0.62;
const maxRunSpeed = 4.3;
const groundFriction = 0.78;
const airFriction = 0.92;
const jumpVelocity = -10.4;
const maxFallSpeed = 13.5;
const highScoreStorageKey = "tiny-platformer-best";
const assetSources = {
  background: [
    "./assets/background.png",
    "./assets/background.webp",
    "./assets/background.jpg",
    "./assets/background.jpeg",
    "./assets/background.gif",
    "./assets/background.svg",
    "./assets/Isopoly_01.gif",
  ],
  player: [
    "./assets/player.png",
    "./assets/player.webp",
    "./assets/player.jpg",
    "./assets/player.jpeg",
    "./assets/player.svg",
  ],
  platform: [
    "./assets/platform.png",
    "./assets/platform.webp",
    "./assets/platform.jpg",
    "./assets/platform.jpeg",
    "./assets/platform.svg",
  ],
  coin: [
    "./assets/coin.png",
    "./assets/coin.webp",
    "./assets/coin.jpg",
    "./assets/coin.jpeg",
    "./assets/coin.svg",
  ],
  flag: [
    "./assets/flag.png",
    "./assets/flag.webp",
    "./assets/flag.jpg",
    "./assets/flag.jpeg",
    "./assets/flag.svg",
  ],
};

const assets = {
  background: null,
  player: null,
  platform: null,
  coin: null,
  flag: null,
};

const leftInputs = new Set(["arrowleft", "a"]);
const rightInputs = new Set(["arrowright", "d"]);
const jumpInputs = new Set(["arrowup", "w", " "]);

const basePlatforms = [
  { x: 0, y: 320, width: 280, height: 40 },
  { x: 340, y: 296, width: 170, height: 64 },
  { x: 560, y: 266, width: 160, height: 94 },
  { x: 790, y: 312, width: 170, height: 48 },
  { x: 1020, y: 284, width: 180, height: 76 },
  { x: 1260, y: 250, width: 170, height: 110 },
  { x: 1470, y: 302, width: 170, height: 58 },
  { x: 1700, y: 270, width: 170, height: 90 },
  { x: 1940, y: 320, width: 260, height: 40 },
];

const baseCoins = [
  { x: 120, y: 284 },
  { x: 240, y: 284 },
  { x: 390, y: 260 },
  { x: 470, y: 260 },
  { x: 610, y: 230 },
  { x: 680, y: 230 },
  { x: 845, y: 276 },
  { x: 1110, y: 248 },
  { x: 1320, y: 214 },
  { x: 1530, y: 266 },
  { x: 1770, y: 234 },
  { x: 2030, y: 284 },
];

const goal = { x: 2140, y: 248, width: 22, height: 72 };

let platforms = [];
let coins = [];
let player = createPlayer();
let keys = { left: false, right: false };
let jumpQueued = false;
let score = 0;
let highScore = readHighScore();
let cameraX = 0;
let isRunning = false;
let isGameOver = false;
let hasWon = false;
let animationFrameId = null;
let lastTimestamp = 0;

function createPlayer() {
  return {
    x: 48,
    y: 276,
    width: 32,
    height: 18,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
  };
}

function readHighScore() {
  const storedValue = Number(localStorage.getItem(highScoreStorageKey));
  return Number.isFinite(storedValue) ? storedValue : 0;
}

function saveHighScore() {
  localStorage.setItem(highScoreStorageKey, String(highScore));
}

function clonePlatforms() {
  return basePlatforms.map((platform) => ({ ...platform }));
}

function cloneCoins() {
  return baseCoins.map((coin) => ({
    ...coin,
    radius: 8,
    collected: false,
  }));
}

function loadImageAsset(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

async function loadFirstAvailable(paths) {
  for (const path of paths) {
    const image = await loadImageAsset(path);
    if (image) {
      return image;
    }
  }

  return null;
}

function preloadAssets() {
  const entries = Object.entries(assetSources);
  Promise.all(
    entries.map(async ([key, sourcePaths]) => [key, await loadFirstAvailable(sourcePaths)])
  ).then((loadedAssets) => {
    for (const [key, image] of loadedAssets) {
      assets[key] = image;
    }
    render();
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getPlayerRect() {
  return {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };
}

function remainingCoins() {
  return coins.length - score;
}

function allCoinsCollected() {
  return remainingCoins() === 0;
}

function updateScoreboard() {
  scoreElement.textContent = String(score);
  highScoreElement.textContent = String(highScore);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function stopGameLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function resetGameState() {
  platforms = clonePlatforms();
  coins = cloneCoins();
  player = createPlayer();
  keys = { left: false, right: false };
  jumpQueued = false;
  score = 0;
  cameraX = 0;
  isGameOver = false;
  hasWon = false;
  updateScoreboard();
  setStatus("Collect all coins and reach the flag.");
  render();
}

function startGame() {
  if (isRunning) {
    return;
  }

  if (isGameOver || hasWon) {
    resetGameState();
  }

  isRunning = true;
  startPauseButton.textContent = "Pause";
  setStatus("Running...");
  lastTimestamp = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (!isRunning) {
    return;
  }

  isRunning = false;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus("Paused. Press Start or Enter.");
}

function restartGame() {
  stopGameLoop();
  isRunning = false;
  startPauseButton.textContent = "Start";
  resetGameState();
}

function endGame(message) {
  isRunning = false;
  isGameOver = true;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus(message);
}

function winGame() {
  isRunning = false;
  hasWon = true;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus("You win! Press Restart or R to play again.");
}

function handleHorizontalMovement(delta) {
  if (keys.left && !keys.right) {
    player.vx -= moveAcceleration * delta;
    player.facing = -1;
  } else if (keys.right && !keys.left) {
    player.vx += moveAcceleration * delta;
    player.facing = 1;
  } else {
    const friction = player.onGround ? groundFriction : airFriction;
    player.vx *= Math.pow(friction, delta);
    if (Math.abs(player.vx) < 0.03) {
      player.vx = 0;
    }
  }

  player.vx = clamp(player.vx, -maxRunSpeed, maxRunSpeed);
}

function applyJump() {
  if (jumpQueued && player.onGround) {
    player.vy = jumpVelocity;
    player.onGround = false;
  }
  jumpQueued = false;
}

function resolveHorizontalCollisions() {
  const playerRect = getPlayerRect();
  for (const platform of platforms) {
    if (!rectanglesOverlap(playerRect, platform)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = platform.x - player.width;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.width;
    }

    player.vx = 0;
    playerRect.x = player.x;
  }
}

function resolveVerticalCollisions(previousY) {
  const playerRect = getPlayerRect();
  player.onGround = false;

  for (const platform of platforms) {
    if (!rectanglesOverlap(playerRect, platform)) {
      continue;
    }

    const previousBottom = previousY + player.height;
    const previousTop = previousY;

    if (previousBottom <= platform.y && player.vy >= 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
    } else if (previousTop >= platform.y + platform.height && player.vy < 0) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    } else {
      const overlapFromTop = player.y + player.height - platform.y;
      const overlapFromBottom = platform.y + platform.height - player.y;

      if (overlapFromTop < overlapFromBottom) {
        player.y = platform.y - player.height;
        player.onGround = true;
      } else {
        player.y = platform.y + platform.height;
      }
      player.vy = 0;
    }

    playerRect.y = player.y;
  }
}

function collectCoins() {
  const playerRect = getPlayerRect();

  for (const coin of coins) {
    if (coin.collected) {
      continue;
    }

    const coinRect = {
      x: coin.x - coin.radius,
      y: coin.y - coin.radius,
      width: coin.radius * 2,
      height: coin.radius * 2,
    };

    if (!rectanglesOverlap(playerRect, coinRect)) {
      continue;
    }

    coin.collected = true;
    score += 1;
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }
    updateScoreboard();
  }
}

function checkGoal() {
  if (!rectanglesOverlap(getPlayerRect(), goal)) {
    return;
  }

  if (allCoinsCollected()) {
    winGame();
    return;
  }

  const remaining = remainingCoins();
  setStatus(`Collect ${remaining} more coin${remaining === 1 ? "" : "s"} to finish.`);
}

function updateCamera() {
  const targetCameraX = player.x - canvas.width * 0.35;
  cameraX = clamp(targetCameraX, 0, worldWidth - canvas.width);
}

function update(delta) {
  handleHorizontalMovement(delta);
  applyJump();

  player.x += player.vx * delta;
  resolveHorizontalCollisions();

  player.vy = clamp(player.vy + gravity * delta, -100, maxFallSpeed);
  const previousY = player.y;
  player.y += player.vy * delta;
  resolveVerticalCollisions(previousY);

  player.x = clamp(player.x, 0, worldWidth - player.width);

  if (player.y > worldHeight + 140) {
    endGame("You fell off. Press Restart or R.");
    return;
  }

  collectCoins();
  checkGoal();
  updateCamera();
}

function drawBackgroundImage(image) {
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawBackground() {
  if (assets.background) {
    drawBackgroundImage(assets.background);
    return;
  }

  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#1f2f4d");
  skyGradient.addColorStop(1, "#0e172a");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const nearOffset = (cameraX * 0.22) % 240;
  ctx.fillStyle = "#18243b";
  for (let i = -1; i < 6; i += 1) {
    const baseX = i * 240 - nearOffset;
    ctx.beginPath();
    ctx.moveTo(baseX, canvas.height);
    ctx.lineTo(baseX + 120, 160);
    ctx.lineTo(baseX + 240, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  const farOffset = (cameraX * 0.11) % 300;
  ctx.fillStyle = "#223152";
  for (let i = -1; i < 5; i += 1) {
    const baseX = i * 300 - farOffset;
    ctx.beginPath();
    ctx.moveTo(baseX, canvas.height);
    ctx.lineTo(baseX + 150, 210);
    ctx.lineTo(baseX + 300, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlayerCar() {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const wheelRadius = 4;
  const wheelY = player.height - 1;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.width / 2, -player.height / 2);

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(8, wheelY, wheelRadius, 0, Math.PI * 2);
  ctx.arc(player.width - 8, wheelY, wheelRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef4444";
  ctx.fillRect(2, 7, player.width - 4, 7);

  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(9, 7);
  ctx.lineTo(13, 2);
  ctx.lineTo(player.width - 9, 2);
  ctx.lineTo(player.width - 4, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(14, 4, player.width - 19, 4);

  ctx.fillStyle = "#fde68a";
  ctx.fillRect(player.width - 2, 9, 2, 3);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 9, 2, 3);

  ctx.restore();
}

function drawPlayerSprite(image) {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.width / 2, -player.height / 2);
  ctx.drawImage(image, 0, 0, player.width, player.height);
  ctx.restore();
}

function drawPlayer() {
  if (assets.player) {
    drawPlayerSprite(assets.player);
    return;
  }

  drawPlayerCar();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    if (assets.platform) {
      ctx.drawImage(assets.platform, platform.x, platform.y, platform.width, platform.height);
      continue;
    }

    const isGround = platform.y >= 320;
    ctx.fillStyle = isGround ? "#334155" : "#3f4f6f";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#8da5cb";
    ctx.fillRect(platform.x, platform.y, platform.width, 4);
  }

  if (assets.flag) {
    ctx.drawImage(assets.flag, goal.x - 2, goal.y, 40, goal.height);
  } else {
    ctx.fillStyle = "#dbe4ff";
    ctx.fillRect(goal.x + 8, goal.y, 4, goal.height);
    ctx.fillStyle = allCoinsCollected() ? "#22c55e" : "#f97316";
    ctx.fillRect(goal.x + 12, goal.y + 8, 26, 14);
  }

  for (const coin of coins) {
    if (coin.collected) {
      continue;
    }

    if (assets.coin) {
      const diameter = coin.radius * 2;
      ctx.drawImage(assets.coin, coin.x - coin.radius, coin.y - coin.radius, diameter, diameter);
      continue;
    }

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawPlayer();

  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = "#eff6ff";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`Coins: ${score}/${coins.length}`, 12, 22);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawWorld();
  drawHud();
}

function gameLoop(timestamp) {
  if (!isRunning) {
    return;
  }

  const deltaMs = timestamp - lastTimestamp;
  const delta = clamp(deltaMs / (1000 / 60), 0.5, 2.2);
  lastTimestamp = timestamp;

  update(delta);
  render();

  if (isRunning) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (event.key.startsWith("Arrow") || key === " " || event.code === "Space") {
    event.preventDefault();
  }

  if (event.key === "Enter") {
    if (isRunning) {
      pauseGame();
    } else {
      startGame();
    }
    return;
  }

  if (key === "r") {
    restartGame();
    return;
  }

  if (leftInputs.has(key)) {
    keys.left = true;
  }

  if (rightInputs.has(key)) {
    keys.right = true;
  }

  if (jumpInputs.has(key) || event.code === "Space") {
    jumpQueued = true;
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (leftInputs.has(key)) {
    keys.left = false;
  }

  if (rightInputs.has(key)) {
    keys.right = false;
  }
});

window.addEventListener("blur", () => {
  if (isRunning) {
    pauseGame();
  }
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

updateScoreboard();
restartGame();
preloadAssets();
