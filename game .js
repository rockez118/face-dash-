/******************
 * Asset Initialization
 ******************/
LK.init.image('obstacle', { width: 172.8, height: 292.96, id: '6831d458dead9009e9ba8d6d', orientation: 2 });
LK.init.image('player', { width: 1000, height: 1000, id: '6831d5ecdead9009e9ba8d9a', flipY: 1 });
LK.init.image('point', { width: 150, height: 150, id: '6831d0079d2dbd2dae05cd77' });

LK.init.sound('MUSIC', { volume: 0.1, start: 0, end: 1, id: '6831d9379d2dbd2dae05cd91' });
LK.init.music('coin', { volume: 1, start: 0.035, end: 0.078, id: '6831d06fdead9009e9ba8d17' });
LK.init.sound('u-play');

/******************
 * Plugin Imports
 ******************/
const tween = LK.import("@upit/tween.v1");
const facekit = LK.import("@upit/facekit.v1");

/******************
 * Game Configuration
 ******************/
const GAME_WIDTH = 2048;
const GAME_HEIGHT = 2732;

const MODES = [
  { name: "Classic", description: "Normal speed, regular spawn rates." },
  { name: "Fast", description: "Faster obstacles and coins." },
  { name: "Insane", description: "Very fast, high spawn rates." }
];

let currentMode = 0;
let modeSwitchEnabled = true;

let obstacleInterval, pointInterval;
let minObstacleSpeed, maxObstacleSpeed;
let minPointSpeed, maxPointSpeed;

function setModeParams(mode) {
  switch (mode) {
    case 0: // Classic
      obstacleInterval = 60;
      pointInterval = 120;
      minObstacleSpeed = 7;
      maxObstacleSpeed = 14;
      minPointSpeed = 12;
      maxPointSpeed = 22;
      break;
    case 1: // Fast
      obstacleInterval = 40;
      pointInterval = 80;
      minObstacleSpeed = 11;
      maxObstacleSpeed = 18;
      minPointSpeed = 18;
      maxPointSpeed = 28;
      break;
    case 2: // Insane
      obstacleInterval = 25;
      pointInterval = 50;
      minObstacleSpeed = 15;
      maxObstacleSpeed = 24;
      minPointSpeed = 24;
      maxPointSpeed = 36;
      break;
  }
}
setModeParams(currentMode);

/******************
 * Class Definitions
 ******************/
class Obstacle extends Container {
  constructor() {
    super();
    this.asset = this.attachAsset('obstacle', { anchorX: 0.5, anchorY: 0.5 });
    this.speed = 10;
  }

  update() {
    this.y += this.speed;
  }
}

class Player extends Container {
  constructor() {
    super();
    this.asset = this.attachAsset('player', { anchorX: 0.5, anchorY: 0.5 });
  }
}

class Point extends Container {
  constructor() {
    super();
    this.asset = this.attachAsset('point', { anchorX: 0.5, anchorY: 0.5 });
    this.speed = 10;
  }

  update() {
    this.y += this.speed;
  }
}

/******************
 * Game Initialization
 ******************/
const game = new LK.Game({ backgroundColor: 0x181c24 });

const player = new Player();
player.x = GAME_WIDTH / 2;
player.y = GAME_HEIGHT - 400;
game.addChild(player);

let obstacles = [];
let points = [];

const scoreTxt = new Text2('0', { size: 140, fill: 0xFFFFFF });
scoreTxt.anchor.set(0.5, 0);
LK.gui.top.addChild(scoreTxt);

LK.setScore(0);
updateScoreDisplay();

const modeTxt = new Text2(`Mode: ${MODES[currentMode].name}`, { size: 70, fill: 0xFFD700 });
modeTxt.anchor.set(1, 0);
modeTxt.x = GAME_WIDTH - 40;
modeTxt.y = 20;
modeTxt.interactive = true;
LK.gui.top.addChild(modeTxt);

modeTxt.down = () => {
  if (!modeSwitchEnabled) return;
  currentMode = (currentMode + 1) % MODES.length;
  setModeParams(currentMode);
  modeTxt.setText(`Mode: ${MODES[currentMode].name}`);
};

/******************
 * Game Logic
 ******************/
game.update = function () {
  handleFaceInput();
  spawnChallenges();
  updateObstacles();
  updatePoints();
  checkCollisions();
  increaseDifficulty();
};

function updateScoreDisplay() {
  scoreTxt.setText(LK.getScore());
}

function isIntersecting(a, b) {
  return a.intersects(b);
}

function clampPlayerPosition(x, y) {
  const hw = player.asset.width / 2;
  const hh = player.asset.height / 2;
  return {
    x: Math.max(hw, Math.min(GAME_WIDTH - hw, x)),
    y: Math.max(hh, Math.min(GAME_HEIGHT - hh, y))
  };
}

function handleFaceInput() {
  const mouthX = facekit.mouthCenter.x;
  const mouthY = facekit.mouthCenter.y;

  if (modeSwitchEnabled && (mouthX > 0 || mouthY > 0)) {
    modeSwitchEnabled = false;
    modeTxt.alpha = 0.5;
  }

  if (mouthX > 0 && mouthY > 0) {
    const pos = clampPlayerPosition(mouthX, mouthY);
    player.x = pos.x;
    player.y = pos.y;
  }
}

let difficultyTimer = 0;

function increaseDifficulty() {
  if (++difficultyTimer % 900 === 0 && currentMode === 0) {
    if (obstacleInterval > 30) obstacleInterval -= 5;
    if (minObstacleSpeed < 30) minObstacleSpeed += 1;
    if (maxObstacleSpeed < 40) maxObstacleSpeed += 1;
    if (minPointSpeed < 28) minPointSpeed += 1;
    if (maxPointSpeed < 36) maxPointSpeed += 1;
  }
}

function spawnChallenges() {
  if (LK.ticks % pointInterval !== 0) return;

  const minX = 100 + 80;
  const maxX = GAME_WIDTH - 80;
  const lineX = minX + Math.random() * (maxX - minX);

  const numCoins = 3;
  const coinGap = 180;
  const coinEnemyGap = 400;
  const firstCoinY = -100;

  for (let i = 0; i < numCoins; i++) {
    const pt = new Point();
    pt.x = pt.fixedX = lineX;
    pt.y = firstCoinY - i * coinGap;
    pt.speed = minPointSpeed + Math.random() * (maxPointSpeed - minPointSpeed);
    points.push(pt);
    game.addChild(pt);
  }

  const obs = new Obstacle();
  obs.x = obs.fixedX = lineX;
  obs.y = firstCoinY - (numCoins - 1) * coinGap - coinEnemyGap;
  obs.speed = minObstacleSpeed + Math.random() * (maxObstacleSpeed - minObstacleSpeed);
  obstacles.push(obs);
  game.addChild(obs);

  showMouthPrompt(lineX);
}

function showMouthPrompt(xPos) {
  if (!game.mouthPromptTxt) {
    game.mouthPromptTxt = new Text2("Move your mouth here!", { size: 90, fill: 0x00FFCC });
    game.mouthPromptTxt.anchor.set(0.5, 0.5);
    LK.gui.top.addChild(game.mouthPromptTxt);
  }

  game.mouthPromptTxt.x = xPos / GAME_WIDTH * LK.gui.top.width;
  game.mouthPromptTxt.y = 220;
  game.mouthPromptTxt.alpha = 1;

  tween(game.mouthPromptTxt, { alpha: 0 }, { duration: 1200 });
}

function updateObstacles() {
  obstacles.forEach(o => o.x = o.fixedX);
}

function updatePoints() {
  points.forEach(p => p.x = p.fixedX);
}

function checkCollisions() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.update();

    if (isIntersecting(obs, player)) {
      if (facekit.mouthOpen) {
        LK.effects.flashScreen(0xff0000, 800);
        LK.showGameOver();
        return;
      }
    }

    if (obs.y - obs.asset.height / 2 > GAME_HEIGHT + 100) {
      obs.destroy();
      obstacles.splice(i, 1);
    }
  }

  for (let i = points.length - 1; i >= 0; i--) {
    const pt = points[i];
    pt.update();

    if (isIntersecting(pt, player) && facekit.mouthOpen) {
      LK.setScore(LK.getScore() + 1);
      updateScoreDisplay();
      LK.effects.flashObject(player, 0xf7e63a, 400);
      pt.destroy();
      points.splice(i, 1);
    } else if (pt.y - pt.asset.height / 2 > GAME_HEIGHT + 100) {
      pt.destroy();
      points.splice(i, 1);
    }
  }
}
