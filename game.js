const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const levelElement = document.getElementById("level");
const livesElement = document.getElementById("lives");
const healthElement = document.getElementById("health");
const statusElement = document.getElementById("statusText");
const startPauseButton = document.getElementById("startPauseButton");
const restartButton = document.getElementById("restartButton");

const worldHeight = canvas.height;
const gravity = 0.5;
const moveAcceleration = 0.62;
const maxRunSpeed = 4.3;
const groundFriction = 0.78;
const airFriction = 0.92;
const jumpVelocity = -10.4;
const maxFallSpeed = 13.5;

const totalLevels = 10;
const maxLives = 4;
const maxHealth = 3;
const maxJumpCount = 2;
const checkpointPoleHeight = 56;
const highScoreStorageKey = "tiny-platformer-best";

const playerWidth = 32;
const playerHeight = 18;
const enemyWidth = 26;
const enemyHeight = 18;

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

const levelTemplates = createLevelTemplates(totalLevels);

let worldWidth = levelTemplates[0].worldWidth;
let platforms = [];
let coins = [];
let enemies = [];
let checkpoints = [];
let goal = { ...levelTemplates[0].goal };
let respawnPoint = { ...levelTemplates[0].spawn };

let player = createPlayer(levelTemplates[0].spawn);
let keys = { left: false, right: false };
let jumpQueued = false;
let score = 0;
let highScore = readHighScore();
let lives = maxLives;
let health = maxHealth;
let currentLevelIndex = 0;
let cameraX = 0;
let invulnerabilityTimer = 0;

let isRunning = false;
let isGameOver = false;
let hasWon = false;
let animationFrameId = null;
let lastTimestamp = 0;

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

function readHighScore() {
  const storedValue = Number(localStorage.getItem(highScoreStorageKey));
  return Number.isFinite(storedValue) ? storedValue : 0;
}

function saveHighScore() {
  localStorage.setItem(highScoreStorageKey, String(highScore));
}

function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    width: playerWidth,
    height: playerHeight,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    jumpCount: 0,
  };
}

function makeCheckpoint(x, platformTop) {
  const roundedX = Math.round(x);
  const roundedTop = Math.round(platformTop);
  return {
    x: roundedX,
    y: roundedTop - checkpointPoleHeight,
    width: 18,
    height: checkpointPoleHeight,
    respawnX: roundedX - 6,
    respawnY: roundedTop - playerHeight,
    activated: false,
  };
}

function buildLevel(levelNumber) {
  const difficulty = levelNumber - 1;
  const difficultyLabel = levelNumber <= 3 ? "Easy" : levelNumber <= 7 ? "Medium" : "Hard";
  const levelPlatforms = [];
  const levelCoins = [];
  const levelEnemies = [];
  const levelCheckpoints = [];

  const startTop = 320;
  levelPlatforms.push({ x: 0, y: startTop, width: 300, height: worldHeight - startTop });

  const rampOneTop = clamp(306 - difficulty * 2, 272, 306);
  levelPlatforms.push({
    x: 330,
    y: rampOneTop,
    width: 150,
    height: worldHeight - rampOneTop,
  });

  const rampTwoTop = clamp(282 - difficulty * 3, 228, 282);
  levelPlatforms.push({
    x: 530,
    y: rampTwoTop,
    width: 130,
    height: worldHeight - rampTwoTop,
  });

  const wallX = 730 + difficulty * 70;
  const wallTop = clamp(196 - difficulty * 4, 146, 196);
  levelPlatforms.push({ x: wallX, y: wallTop, width: 34, height: worldHeight - wallTop });
  levelPlatforms.push({ x: wallX + 48, y: wallTop, width: 34, height: worldHeight - wallTop });

  const climbCount = 3 + Math.floor(difficulty / 2);
  const climbSpacing = 150 - Math.min(30, difficulty * 2);
  const climbBaseTop = clamp(wallTop + 42, 170, 236);
  const climbPlatforms = [];

  for (let i = 0; i < climbCount; i += 1) {
    const top = clamp(climbBaseTop - i * (24 + Math.floor(difficulty / 3) * 2), 92, 236);
    const x = wallX + 130 + i * climbSpacing;
    const width = Math.max(92, 112 + (i % 2 === 0 ? 12 : 0) - Math.min(14, difficulty));
    const platform = { x, y: top, width, height: worldHeight - top };
    levelPlatforms.push(platform);
    climbPlatforms.push(platform);
  }

  const descentX = wallX + 130 + climbCount * climbSpacing + 20;
  const descentTop = clamp(184 + difficulty * 3, 176, 286);
  const descentPlatform = {
    x: descentX,
    y: descentTop,
    width: 150,
    height: worldHeight - descentTop,
  };
  levelPlatforms.push(descentPlatform);

  const tailSegments = 2 + Math.floor(difficulty / 4);
  const tailPlatforms = [];
  const tailStartX = descentX + 220;
  for (let i = 0; i < tailSegments; i += 1) {
    const top = clamp(236 + (i % 2) * 30 + difficulty * 3, 220, 312);
    const platform = {
      x: tailStartX + i * 190,
      y: top,
      width: 150,
      height: worldHeight - top,
    };
    levelPlatforms.push(platform);
    tailPlatforms.push(platform);
  }

  const finalGroundX = tailStartX + tailSegments * 190 + 120;
  const finalGround = {
    x: finalGroundX,
    y: startTop,
    width: 260,
    height: worldHeight - startTop,
  };
  levelPlatforms.push(finalGround);

  const worldWidthForLevel = finalGroundX + 320;
  const goalForLevel = {
    x: finalGroundX + 190,
    y: finalGround.y - 72,
    width: 22,
    height: 72,
  };

  const addCoin = (x, y) => {
    levelCoins.push({ x: Math.round(x), y: Math.round(y) });
  };

  addCoin(120, startTop - 36);
  addCoin(250, startTop - 36);

  const routePlatforms = [
    levelPlatforms[1],
    levelPlatforms[2],
    levelPlatforms[3],
    levelPlatforms[4],
    ...climbPlatforms,
    descentPlatform,
    ...tailPlatforms,
    finalGround,
  ];
  routePlatforms.forEach((platform, index) => {
    if (!platform) {
      return;
    }
    if (levelNumber <= 2 && index > 8 && index % 2 === 1) {
      return;
    }
    addCoin(platform.x + platform.width / 2, platform.y - 20);
  });

  if (difficulty >= 3) {
    addCoin(goalForLevel.x - 40, goalForLevel.y - 24);
  }
  if (difficulty >= 6) {
    addCoin(goalForLevel.x - 80, goalForLevel.y - 24);
  }

  levelCheckpoints.push(makeCheckpoint(wallX - 56, startTop));
  const midClimb = climbPlatforms[Math.floor((climbPlatforms.length - 1) / 2)];
  if (midClimb) {
    levelCheckpoints.push(makeCheckpoint(midClimb.x + midClimb.width / 2 - 9, midClimb.y));
  }

  if (difficulty >= 4) {
    const tailMid = tailPlatforms[Math.floor((tailPlatforms.length - 1) / 2)] || descentPlatform;
    levelCheckpoints.push(makeCheckpoint(tailMid.x + 24, tailMid.y));
  }

  if (difficulty >= 8) {
    levelCheckpoints.push(makeCheckpoint(finalGround.x - 30, finalGround.y));
  }

  const enemyPlatforms = [
    levelPlatforms[1],
    levelPlatforms[2],
    ...climbPlatforms,
    descentPlatform,
    ...tailPlatforms,
    finalGround,
  ].filter((platform) => platform.width >= 100);

  const enemyCount = 1 + Math.floor(difficulty / 2) + (difficulty >= 8 ? 1 : 0);
  for (let i = 0; i < enemyCount; i += 1) {
    const platform = enemyPlatforms[(i * 2 + difficulty) % enemyPlatforms.length];
    if (!platform) {
      continue;
    }

    const minX = platform.x + 8;
    const maxX = platform.x + platform.width - enemyWidth - 8;
    if (maxX - minX < 24) {
      continue;
    }

    const speed = 1.1 + difficulty * 0.14 + (i % 2) * 0.18;
    levelEnemies.push({
      x: clamp(platform.x + platform.width / 2 - enemyWidth / 2, minX, maxX),
      y: platform.y - enemyHeight,
      width: enemyWidth,
      height: enemyHeight,
      minX,
      maxX,
      vx: i % 2 === 0 ? speed : -speed,
    });
  }

  return {
    name: `Level ${levelNumber}`,
    difficultyLabel,
    worldWidth: worldWidthForLevel,
    spawn: { x: 48, y: startTop - playerHeight },
    goal: goalForLevel,
    platforms: levelPlatforms,
    coins: levelCoins,
    checkpoints: levelCheckpoints,
    enemies: levelEnemies,
  };
}

function createLevelTemplates(count) {
  const templates = [];
  for (let i = 1; i <= count; i += 1) {
    templates.push(buildLevel(i));
  }
  return templates;
}

function cloneLevelTemplate(template) {
  return {
    name: template.name,
    difficultyLabel: template.difficultyLabel,
    worldWidth: template.worldWidth,
    spawn: { ...template.spawn },
    goal: { ...template.goal },
    platforms: template.platforms.map((platform) => ({ ...platform })),
    coins: template.coins.map((coin) => ({ ...coin, radius: 8, collected: false })),
    checkpoints: template.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      activated: false,
    })),
    enemies: template.enemies.map((enemy) => ({ ...enemy })),
  };
}

function collectedCoinsInLevel() {
  return coins.reduce((count, coin) => count + (coin.collected ? 1 : 0), 0);
}

function remainingCoins() {
  return coins.length - collectedCoinsInLevel();
}

function allCoinsCollected() {
  return remainingCoins() === 0;
}

function getPlayerRect() {
  return {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };
}

function getGoalRect() {
  return {
    x: goal.x,
    y: goal.y,
    width: 38,
    height: goal.height,
  };
}

function updateScoreboard() {
  scoreElement.textContent = String(score);
  highScoreElement.textContent = String(highScore);
  levelElement.textContent = `${currentLevelIndex + 1}/${totalLevels}`;
  livesElement.textContent = String(lives);
  healthElement.textContent = `${health}/${maxHealth}`;
}

function setStatus(message) {
  if (statusElement.textContent !== message) {
    statusElement.textContent = message;
  }
}

function stopGameLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function resetInputState() {
  keys = { left: false, right: false };
  jumpQueued = false;
}

function loadLevel(index) {
  const template = levelTemplates[index];
  const level = cloneLevelTemplate(template);

  currentLevelIndex = index;
  worldWidth = level.worldWidth;
  platforms = level.platforms;
  coins = level.coins;
  enemies = level.enemies;
  checkpoints = level.checkpoints;
  goal = level.goal;
  player = createPlayer(level.spawn);
  respawnPoint = { ...level.spawn };
  invulnerabilityTimer = 60;
  resetInputState();
  cameraX = clamp(player.x - canvas.width * 0.35, 0, Math.max(0, worldWidth - canvas.width));
}

function beginRun() {
  score = 0;
  lives = maxLives;
  health = maxHealth;
  isGameOver = false;
  hasWon = false;
  loadLevel(0);
  updateScoreboard();
  setStatus(`Level 1/${totalLevels} (${levelTemplates[0].difficultyLabel})`);
  render();
}

function startGame() {
  if (isRunning) {
    return;
  }

  if (isGameOver || hasWon) {
    beginRun();
  }

  isRunning = true;
  startPauseButton.textContent = "Pause";
  setStatus(`Running ${levelTemplates[currentLevelIndex].name}...`);
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
  beginRun();
  setStatus("Game reset. Press Start or Enter.");
}

function endGame(message) {
  isRunning = false;
  isGameOver = true;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus(message);
}

function finishAllLevels() {
  isRunning = false;
  hasWon = true;
  stopGameLoop();
  startPauseButton.textContent = "Start";
  setStatus(`You cleared all ${totalLevels} levels! Final score: ${score}. Press R to restart.`);
}

function respawnPlayer() {
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.jumpCount = 0;
  invulnerabilityTimer = Math.max(invulnerabilityTimer, 110);
  updateCamera();
}

function loseLifeFromFall() {
  lives -= 1;
  if (lives <= 0) {
    health = 0;
    updateScoreboard();
    endGame("You fell and ran out of lives. Press R to restart.");
    return;
  }

  health = maxHealth;
  updateScoreboard();
  respawnPlayer();
  setStatus(`You fell. Respawned at checkpoint (${lives} lives left).`);
}

function damagePlayerFromEnemy(enemy) {
  if (invulnerabilityTimer > 0) {
    return;
  }

  health -= 1;
  invulnerabilityTimer = 90;
  player.vy = -6;
  player.vx = player.x < enemy.x ? -3.4 : 3.4;

  if (health <= 0) {
    lives -= 1;
    if (lives <= 0) {
      health = 0;
      updateScoreboard();
      endGame("Out of lives. Press R to restart.");
      return;
    }

    health = maxHealth;
    updateScoreboard();
    respawnPlayer();
    setStatus(`You lost a life. ${lives} lives remaining.`);
    return;
  }

  updateScoreboard();
  setStatus(`Hit by enemy! Health ${health}/${maxHealth}.`);
}

function advanceLevel() {
  if (currentLevelIndex >= totalLevels - 1) {
    finishAllLevels();
    return;
  }

  currentLevelIndex += 1;
  health = maxHealth;
  loadLevel(currentLevelIndex);
  updateScoreboard();
  setStatus(
    `Level ${currentLevelIndex + 1}/${totalLevels} (${levelTemplates[currentLevelIndex].difficultyLabel})`
  );
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
  if (!jumpQueued) {
    return;
  }

  if (player.onGround) {
    player.vy = jumpVelocity;
    player.onGround = false;
    player.jumpCount = 1;
  } else if (player.jumpCount < maxJumpCount) {
    player.vy = jumpVelocity * 0.92;
    player.jumpCount += 1;
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
      player.jumpCount = 0;
    } else if (previousTop >= platform.y + platform.height && player.vy < 0) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    } else {
      const overlapFromTop = player.y + player.height - platform.y;
      const overlapFromBottom = platform.y + platform.height - player.y;

      if (overlapFromTop < overlapFromBottom) {
        player.y = platform.y - player.height;
        player.onGround = true;
        player.jumpCount = 0;
      } else {
        player.y = platform.y + platform.height;
      }
      player.vy = 0;
    }

    playerRect.y = player.y;
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    enemy.x += enemy.vx * delta;

    if (enemy.x < enemy.minX) {
      enemy.x = enemy.minX;
      enemy.vx = Math.abs(enemy.vx);
    } else if (enemy.x > enemy.maxX) {
      enemy.x = enemy.maxX;
      enemy.vx = -Math.abs(enemy.vx);
    }
  }
}

function handleEnemyContacts() {
  if (invulnerabilityTimer > 0) {
    return;
  }

  const playerRect = getPlayerRect();
  for (const enemy of enemies) {
    if (!rectanglesOverlap(playerRect, enemy)) {
      continue;
    }

    damagePlayerFromEnemy(enemy);
    break;
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

function updateCheckpoints() {
  const playerRect = getPlayerRect();

  for (const checkpoint of checkpoints) {
    if (checkpoint.activated) {
      continue;
    }

    const triggerRect = {
      x: checkpoint.x - 6,
      y: checkpoint.y,
      width: checkpoint.width + 12,
      height: checkpoint.height,
    };
    if (!rectanglesOverlap(playerRect, triggerRect)) {
      continue;
    }

    checkpoint.activated = true;
    respawnPoint = {
      x: checkpoint.respawnX,
      y: checkpoint.respawnY,
    };
    setStatus("Checkpoint reached.");
    break;
  }
}

function checkGoal() {
  if (!rectanglesOverlap(getPlayerRect(), getGoalRect())) {
    return false;
  }

  if (allCoinsCollected()) {
    advanceLevel();
    return true;
  }

  const remaining = remainingCoins();
  setStatus(`Collect ${remaining} more coin${remaining === 1 ? "" : "s"} to finish.`);
  return false;
}

function updateCamera() {
  const targetCameraX = player.x - canvas.width * 0.35;
  cameraX = clamp(targetCameraX, 0, Math.max(0, worldWidth - canvas.width));
}

function update(delta) {
  if (invulnerabilityTimer > 0) {
    invulnerabilityTimer = Math.max(0, invulnerabilityTimer - delta);
  }

  handleHorizontalMovement(delta);
  applyJump();

  player.x += player.vx * delta;
  resolveHorizontalCollisions();

  player.vy = clamp(player.vy + gravity * delta, -100, maxFallSpeed);
  const previousY = player.y;
  player.y += player.vy * delta;
  resolveVerticalCollisions(previousY);

  player.x = clamp(player.x, 0, worldWidth - player.width);

  updateEnemies(delta);
  handleEnemyContacts();

  if (player.y > worldHeight + 140) {
    loseLifeFromFall();
    return;
  }

  collectCoins();
  updateCheckpoints();

  if (checkGoal()) {
    return;
  }

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
  if (invulnerabilityTimer > 0 && Math.floor(invulnerabilityTimer / 6) % 2 === 0) {
    return;
  }

  if (assets.player) {
    drawPlayerSprite(assets.player);
    return;
  }

  drawPlayerCar();
}

function drawCheckpoint(checkpoint) {
  ctx.fillStyle = "#dbe4ff";
  ctx.fillRect(checkpoint.x, checkpoint.y, 4, checkpoint.height);
  ctx.fillStyle = checkpoint.activated ? "#22c55e" : "#f59e0b";
  ctx.fillRect(checkpoint.x + 4, checkpoint.y + 8, 16, 11);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(checkpoint.x - 6, checkpoint.y + checkpoint.height, 28, 4);
}

function drawEnemy(enemy) {
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 4, enemy.width - 4, 4);
  ctx.fillStyle = "#f8fafc";
  const eyeX = enemy.vx >= 0 ? enemy.x + enemy.width - 8 : enemy.x + 4;
  ctx.fillRect(eyeX, enemy.y + 5, 3, 3);
}

function drawGoal() {
  if (assets.flag) {
    ctx.drawImage(assets.flag, goal.x - 2, goal.y, 40, goal.height);
    return;
  }

  ctx.fillStyle = "#dbe4ff";
  ctx.fillRect(goal.x + 8, goal.y, 4, goal.height);
  ctx.fillStyle = allCoinsCollected() ? "#22c55e" : "#f97316";
  ctx.fillRect(goal.x + 12, goal.y + 8, 26, 14);
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

  for (const checkpoint of checkpoints) {
    drawCheckpoint(checkpoint);
  }

  drawGoal();

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

  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

  drawPlayer();

  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = "#eff6ff";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`Level Coins: ${collectedCoinsInLevel()}/${coins.length}`, 12, 22);
  ctx.font = "12px system-ui, sans-serif";
  const doubleJumpReady = player.onGround || player.jumpCount < maxJumpCount;
  ctx.fillText(`Double jump: ${doubleJumpReady ? "Ready" : "Used"}`, 12, 40);
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

  if ((jumpInputs.has(key) || event.code === "Space") && !event.repeat) {
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

beginRun();
setStatus("Press Start or hit Enter to play Level 1.");
preloadAssets();
