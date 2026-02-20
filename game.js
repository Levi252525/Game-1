const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = canvas.height;

const GRAVITY = 0.56;
const MOVE_ACCEL = 0.72;
const MAX_RUN_SPEED = 6.2;
const GROUND_FRICTION = 0.8;
const AIR_FRICTION = 0.93;
const JUMP_VELOCITY = -13.2;
const MAX_FALL_SPEED = 18;

const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 44;

const leftInputs = new Set(["arrowleft", "a"]);
const rightInputs = new Set(["arrowright", "d"]);
const jumpInputs = new Set(["arrowup", "w", " "]);

const inputState = {
  left: false,
  right: false,
};

const platformTextureCandidates = [
  "./assets/platform.png",
  "./assets/platform.webp",
  "./assets/platform.jpg",
  "./assets/platform.jpeg",
  "./assets/platform.svg",
  "./assets/grass-platform.png",
  "./assets/grass-platform.jpg",
  "./assets/grass-platform.jpeg",
  "./assets/grass-platform.webp",
  "./assets/grass.png",
  "./assets/grass.jpg",
  "./assets/grass.jpeg",
  "./assets/grass.webp",
  "./grass-platform.png",
  "./grass-platform.jpg",
  "./grass-platform.jpeg",
  "./grass-platform.webp",
  "./grass.png",
  "./grass.jpg",
  "./grass.jpeg",
  "./grass.webp",
];

const playerTextureCandidates = [
  "./assets/player.png",
  "./assets/player.webp",
  "./assets/player.jpg",
  "./assets/player.jpeg",
  "./assets/player.svg",
];

const assets = {
  player: null,
  platform: null,
};

const assetPaths = {
  player: "fallback shape",
  platform: "fallback style",
};

const platforms = [
  { x: 0, y: 470, width: 620, height: 70 },
  { x: 650, y: 500, width: 420, height: 40 },
  { x: 1100, y: 470, width: 530, height: 70 },
  { x: 1660, y: 500, width: 430, height: 40 },
  { x: 2120, y: 470, width: 680, height: 70 },
  { x: 210, y: 390, width: 180, height: 26 },
  { x: 470, y: 340, width: 150, height: 24 },
  { x: 760, y: 355, width: 190, height: 24 },
  { x: 1000, y: 300, width: 130, height: 22 },
  { x: 1220, y: 340, width: 210, height: 24 },
  { x: 1490, y: 280, width: 170, height: 22 },
  { x: 1750, y: 330, width: 150, height: 24 },
  { x: 1940, y: 260, width: 160, height: 22 },
  { x: 2200, y: 320, width: 170, height: 24 },
  { x: 2450, y: 250, width: 140, height: 22 },
];

const spawnPoint = {
  x: 80,
  y: platforms[0].y - PLAYER_HEIGHT,
};

const player = {
  x: spawnPoint.x,
  y: spawnPoint.y,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
};

let cameraX = 0;
let jumpQueued = false;
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

function getPlayerRect() {
  return {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };
}

function loadImageAsset(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ image, path });
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

async function loadFirstAvailable(paths) {
  for (const path of paths) {
    const loaded = await loadImageAsset(path);
    if (loaded) {
      return loaded;
    }
  }
  return null;
}

async function preloadAssets() {
  const [platformLoaded, playerLoaded] = await Promise.all([
    loadFirstAvailable(platformTextureCandidates),
    loadFirstAvailable(playerTextureCandidates),
  ]);

  if (platformLoaded) {
    assets.platform = platformLoaded.image;
    assetPaths.platform = platformLoaded.path;
  }

  if (playerLoaded) {
    assets.player = playerLoaded.image;
    assetPaths.player = playerLoaded.path;
  }
}

function queueJump() {
  if (player.onGround) {
    jumpQueued = true;
  }
}

function applyHorizontalInput(delta) {
  if (inputState.left && !inputState.right) {
    player.vx -= MOVE_ACCEL * delta;
    player.facing = -1;
  } else if (inputState.right && !inputState.left) {
    player.vx += MOVE_ACCEL * delta;
    player.facing = 1;
  } else {
    const friction = player.onGround ? GROUND_FRICTION : AIR_FRICTION;
    player.vx *= Math.pow(friction, delta);
    if (Math.abs(player.vx) < 0.03) {
      player.vx = 0;
    }
  }

  player.vx = clamp(player.vx, -MAX_RUN_SPEED, MAX_RUN_SPEED);
}

function applyJump() {
  if (!jumpQueued) {
    return;
  }

  player.vy = JUMP_VELOCITY;
  player.onGround = false;
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

      if (overlapFromTop <= overlapFromBottom) {
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

function respawnPlayer() {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
}

function updateCamera() {
  const targetX = player.x - canvas.width * 0.45;
  cameraX = clamp(targetX, 0, Math.max(0, WORLD_WIDTH - canvas.width));
}

function update(delta) {
  applyHorizontalInput(delta);
  applyJump();

  player.x += player.vx * delta;
  resolveHorizontalCollisions();
  player.x = clamp(player.x, 0, WORLD_WIDTH - player.width);

  const previousY = player.y;
  player.vy = clamp(player.vy + GRAVITY * delta, -100, MAX_FALL_SPEED);
  player.y += player.vy * delta;
  resolveVerticalCollisions(previousY);

  if (player.y > WORLD_HEIGHT + 260) {
    respawnPlayer();
  }

  updateCamera();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#6fb6ff");
  gradient.addColorStop(1, "#d8f0ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const farOffset = (cameraX * 0.16) % 360;
  ctx.fillStyle = "rgba(62, 113, 87, 0.26)";
  for (let i = -1; i < 5; i += 1) {
    const baseX = i * 360 - farOffset;
    ctx.beginPath();
    ctx.moveTo(baseX, canvas.height);
    ctx.lineTo(baseX + 180, 280);
    ctx.lineTo(baseX + 360, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  const nearOffset = (cameraX * 0.32) % 280;
  ctx.fillStyle = "rgba(47, 94, 73, 0.32)";
  for (let i = -1; i < 6; i += 1) {
    const baseX = i * 280 - nearOffset;
    ctx.beginPath();
    ctx.moveTo(baseX, canvas.height);
    ctx.lineTo(baseX + 140, 330);
    ctx.lineTo(baseX + 280, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlatform(platform) {
  if (assets.platform) {
    ctx.drawImage(assets.platform, platform.x, platform.y, platform.width, platform.height);
    return;
  }

  const isGround = platform.y >= 470;
  ctx.fillStyle = isGround ? "#4a7f45" : "#5f8a56";
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  ctx.fillStyle = "#99cc7a";
  ctx.fillRect(platform.x, platform.y, platform.width, 5);
}

function drawPlayerShape() {
  const radius = 8;
  const x = player.x;
  const y = player.y;
  const w = player.width;
  const h = player.height;

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();

  ctx.fillStyle = "#111827";
  const eyeX = player.facing > 0 ? x + w - 14 : x + 8;
  ctx.fillRect(eyeX, y + 12, 5, 5);
}

function drawPlayerSprite() {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.width / 2, -player.height / 2);
  ctx.drawImage(assets.player, 0, 0, player.width, player.height);
  ctx.restore();
}

function drawPlayer() {
  if (assets.player) {
    drawPlayerSprite();
    return;
  }

  drawPlayerShape();
}

function drawHud() {
  ctx.fillStyle = "rgba(9, 20, 32, 0.68)";
  ctx.fillRect(12, 12, 410, 66);
  ctx.strokeStyle = "rgba(181, 210, 255, 0.45)";
  ctx.strokeRect(12, 12, 410, 66);

  ctx.fillStyle = "#f8fbff";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText("Jump Playground", 24, 36);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("Move: A/D or Left/Right    Jump: Space, W, or Up", 24, 56);

  ctx.textAlign = "right";
  ctx.fillText(`Platform texture: ${assetPaths.platform}`, canvas.width - 20, 30);
  ctx.textAlign = "left";
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    drawPlatform(platform);
  }

  drawPlayer();
  ctx.restore();
  drawHud();
}

function gameLoop(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const deltaMs = timestamp - lastTimestamp;
  const delta = clamp(deltaMs / (1000 / 60), 0.5, 2.3);
  lastTimestamp = timestamp;

  update(delta);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (event.key.startsWith("Arrow") || key === " " || event.code === "Space") {
    event.preventDefault();
  }

  if (leftInputs.has(key)) {
    inputState.left = true;
  }

  if (rightInputs.has(key)) {
    inputState.right = true;
  }

  if ((jumpInputs.has(key) || event.code === "Space") && !event.repeat) {
    queueJump();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (leftInputs.has(key)) {
    inputState.left = false;
  }

  if (rightInputs.has(key)) {
    inputState.right = false;
  }
});

window.addEventListener("blur", () => {
  inputState.left = false;
  inputState.right = false;
  jumpQueued = false;
});

preloadAssets();
render();
requestAnimationFrame(gameLoop);
