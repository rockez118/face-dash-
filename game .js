/****
* Assets
****/
LK.init.image('obstacle', {width:172.8, height:292.96, id:'6831d458dead9009e9ba8d6d', orientation:2})
LK.init.image('player', {width:1000, height:1000, id:'6831d5ecdead9009e9ba8d9a', flipY:1})
LK.init.image('point', {width:150, height:150, id:'6831d0079d2dbd2dae05cd77'})
LK.init.sound('MUSIC', {volume:0.1, start:0, end:1, id:'6831d9379d2dbd2dae05cd91'})
LK.init.music('coin', {volume:1, start:0.035, end:0.078, id:'6831d06fdead9009e9ba8d17'})
LK.init.sound('u-play')

/**** 
* Plugins
****/
var tween = LK.import("@upit/tween.v1");
var facekit = LK.import("@upit/facekit.v1");

/**** 
* Classes
****/
// Obstacle class (falling block)
var Obstacle = Container.expand(function () {
	var self = Container.call(this);
	var obsAsset = self.attachAsset('obstacle', {
		anchorX: 0.5,
		anchorY: 0.5
	});
	self.asset = obsAsset;
	// Speed will be set on creation
	self.speed = 10;
	self.update = function () {
		self.y += self.speed;
	};
	return self;
});
// Player class (finger-controlled, position set by finger/touch)
var Player = Container.expand(function () {
	var self = Container.call(this);
	var playerAsset = self.attachAsset('player', {
		anchorX: 0.5,
		anchorY: 0.5
	});
	// For collision detection, keep a reference to the asset
	self.asset = playerAsset;
	// No update needed; position is set externally by finger/touch
	return self;
});
// Point class (collectible)
var Point = Container.expand(function () {
	var self = Container.call(this);
	var pointAsset = self.attachAsset('point', {
		anchorX: 0.5,
		anchorY: 0.5
	});
	self.asset = pointAsset;
	// Speed will be set on creation
	self.speed = 10;
	self.update = function () {
		self.y += self.speed;
	};
	return self;
});

/**** 
* Initialize Game
****/
var game = new LK.Game({
	backgroundColor: 0x181c24
});

/**** 
* Game Code
****/
// Game area dimensions
// Character: Player avatar (face-controlled)
// Obstacle: Falling block
// Point: Collectible
// Sound effects (optional, but not used as per instructions)
// LK.init.sound('collect', {volume: 0.5});
// LK.init.sound('hit', {volume: 0.5});
var GAME_WIDTH = 2048;
var GAME_HEIGHT = 2732;
// Game Modes
var MODES = [{
	name: "Classic",
	description: "Normal speed, regular spawn rates."
}, {
	name: "Fast",
	description: "Faster obstacles and coins."
}, {
	name: "Insane",
	description: "Very fast, high spawn rates."
}];
var currentMode = 0; // 0: Classic, 1: Fast, 2: Insane
// Mode parameters
function setModeParams(modeIdx) {
	if (modeIdx === 0) {
		obstacleInterval = 60;
		pointInterval = 120;
		minObstacleSpeed = 7; // decreased from 14
		maxObstacleSpeed = 14; // decreased from 28
		minPointSpeed = 12;
		maxPointSpeed = 22;
	} else if (modeIdx === 1) {
		obstacleInterval = 40;
		pointInterval = 80;
		minObstacleSpeed = 11; // decreased from 22
		maxObstacleSpeed = 18; // decreased from 36
		minPointSpeed = 18;
		maxPointSpeed = 28;
	} else if (modeIdx === 2) {
		obstacleInterval = 25;
		pointInterval = 50;
		minObstacleSpeed = 15; // decreased from 30
		maxObstacleSpeed = 24; // decreased from 48
		minPointSpeed = 24;
		maxPointSpeed = 36;
	}
}
setModeParams(currentMode);
// Mode switch UI (simple text at top right)
var modeTxt = new Text2("Mode: " + MODES[currentMode].name, {
	size: 70,
	fill: 0xFFD700
});
modeTxt.anchor.set(1, 0);
modeTxt.x = 2048 - 40;
modeTxt.y = 20;
LK.gui.top.addChild(modeTxt);
// Tap top right to switch mode before game starts
var modeSwitchEnabled = true;
modeTxt.interactive = true;
modeTxt.down = function (x, y, obj) {
	if (!modeSwitchEnabled) {
		return;
	}
	currentMode = (currentMode + 1) % MODES.length;
	setModeParams(currentMode);
	modeTxt.setText("Mode: " + MODES[currentMode].name);
};
// Player instance
var player = new Player();
game.addChild(player);
// Initial player position (centered, will be updated by facekit)
player.x = GAME_WIDTH / 2;
player.y = GAME_HEIGHT - 400;
// Arrays for obstacles and points
var obstacles = [];
var points = [];
// Score display
var scoreTxt = new Text2('0', {
	size: 140,
	fill: 0xFFFFFF
});
scoreTxt.anchor.set(0.5, 0);
LK.gui.top.addChild(scoreTxt);
// Difficulty parameters (set by mode)
var obstacleInterval, pointInterval, minObstacleSpeed, maxObstacleSpeed, minPointSpeed, maxPointSpeed;
var difficultyTimer = 0; // For increasing difficulty
// For collision detection
function isIntersecting(a, b) {
	// Use built-in .intersects
	return a.intersects(b);
}
// Update score display
function updateScoreDisplay() {
	scoreTxt.setText(LK.getScore());
}
// Helper to clamp player position within game area
function clampPlayerPosition(px, py) {
	var halfW = player.asset.width / 2;
	var halfH = player.asset.height / 2;
	px = Math.max(halfW, Math.min(GAME_WIDTH - halfW, px));
	py = Math.max(halfH, Math.min(GAME_HEIGHT - halfH, py));
	return {
		x: px,
		y: py
	};
}
// No touch/mouse controls; player is facekit controlled
game.down = function (x, y, obj) {};
game.move = function (x, y, obj) {};
game.up = function (x, y, obj) {};
// Track last mouth state for event detection
var lastMouthOpen = false;
// Main game update loop
game.update = function () {
	// On first movement, lock mode
	if (modeSwitchEnabled && (facekit.mouthCenter.x > 0 || facekit.mouthCenter.y > 0)) {
		modeSwitchEnabled = false;
		modeTxt.alpha = 0.5;
	}
	// Update player position to mouth center (clamped)
	var mouthX = facekit.mouthCenter.x;
	var mouthY = facekit.mouthCenter.y;
	if (mouthX > 0 && mouthY > 0) {
		var pos = clampPlayerPosition(mouthX, mouthY);
		player.x = pos.x;
		player.y = pos.y;
	}
	// Increase difficulty over time (optional, can be mode-dependent)
	difficultyTimer++;
	if (difficultyTimer % 900 === 0 && currentMode === 0) {
		// Only in Classic mode, ramp up
		if (obstacleInterval > 30) {
			obstacleInterval -= 5;
		}
		if (minObstacleSpeed < 30) {
			minObstacleSpeed += 1;
		}
		if (maxObstacleSpeed < 40) {
			maxObstacleSpeed += 1;
		}
		if (minPointSpeed < 28) {
			minPointSpeed += 1;
		}
		if (maxPointSpeed < 36) {
			maxPointSpeed += 1;
		}
	}
	// --- SPAWN LOGIC: Coin and enemy (obstacle) come in a line, prompt player to position mouth there ---
	// Only spawn a new "challenge" (multiple coins + enemy in a line) at the interval of the slowest (pointInterval)
	if (LK.ticks % pointInterval === 0) {
		// Pick a random X position (avoid leftmost 100px for menu)
		var minX = 100 + Math.max(80, 0.5 * new Obstacle().asset.width, 0.5 * new Point().asset.width);
		var maxX = GAME_WIDTH - Math.max(80, 0.5 * new Obstacle().asset.width, 0.5 * new Point().asset.width);
		var lineX = minX + Math.random() * (maxX - minX);
		// Number of coins per challenge (increase as needed)
		var numCoins = 3;
		// Vertical gap between coins
		var coinGap = 180;
		// Large vertical gap between last coin and enemy
		var coinEnemyGap = 400;
		var firstCoinY = -100; // Start coins above the screen
		// Spawn multiple coins in a vertical line
		for (var c = 0; c < numCoins; c++) {
			var pt = new Point();
			pt.x = lineX;
			pt.y = firstCoinY - c * coinGap;
			pt.speed = minPointSpeed + Math.random() * (maxPointSpeed - minPointSpeed);
			pt.fixedX = lineX; // Store fixed X for this challenge
			points.push(pt);
			game.addChild(pt);
		}
		// Spawn only one enemy (obstacle) at the same X, below the last coin with a larger gap
		var obs = new Obstacle();
		obs.x = lineX;
		obs.y = firstCoinY - (numCoins - 1) * coinGap - coinEnemyGap;
		obs.speed = minObstacleSpeed + Math.random() * (maxObstacleSpeed - minObstacleSpeed);
		obs.fixedX = lineX; // Store fixed X for this challenge
		obstacles.push(obs);
		game.addChild(obs);
		// Show a prompt to the player to position mouth at lineX (centered at top, fades out)
		if (!game.mouthPromptTxt) {
			game.mouthPromptTxt = new Text2("Move your mouth here!", {
				size: 90,
				fill: 0x00FFCC
			});
			game.mouthPromptTxt.anchor.set(0.5, 0.5);
			LK.gui.top.addChild(game.mouthPromptTxt);
		}
		game.mouthPromptTxt.x = lineX / GAME_WIDTH * LK.gui.top.width;
		game.mouthPromptTxt.y = 220;
		game.mouthPromptTxt.alpha = 1;
		// Fade out the prompt after 1.2s
		tween(game.mouthPromptTxt, {
			alpha: 0
		}, {
			duration: 1200
		});
	}
	// Ensure all obstacles and points keep their X position fixed as they fall
	for (var i = 0; i < obstacles.length; i++) {
		if (typeof obstacles[i].fixedX === "number") {
			obstacles[i].x = obstacles[i].fixedX;
		}
	}
	for (var j = 0; j < points.length; j++) {
		if (typeof points[j].fixedX === "number") {
			points[j].x = points[j].fixedX;
		}
	}
	// --- ENEMY (obstacle) logic: must have mouth CLOSED to survive collision ---
	for (var i = obstacles.length - 1; i >= 0; i--) {
		var obs = obstacles[i];
		obs.update();
		// Check collision with player
		if (isIntersecting(obs, player)) {
			if (facekit.mouthOpen) {
				// Player had mouth open: fail!
				LK.effects.flashScreen(0xff0000, 800);
				LK.showGameOver();
				return;
			} else {
				// Player survives, just let obstacle pass through
			}
		}
		// Remove if off screen
		if (obs.y - obs.asset.height / 2 > GAME_HEIGHT + 100) {
			obs.destroy();
			obstacles.splice(i, 1);
		}
	}
	// --- COIN logic: must have mouth OPEN to collect ---
	for (var j = points.length - 1; j >= 0; j--) {
		var pt = points[j];
		pt.update();
		// Check collision with player
		if (isIntersecting(pt, player)) {
			if (facekit.mouthOpen) {
				// Only collect if mouth is open
				LK.setScore(LK.getScore() + 1);
				updateScoreDisplay();
				LK.effects.flashObject(player, 0xf7e63a, 400);
				pt.destroy();
				points.splice(j, 1);
				continue;
			}
			// If mouth is closed, do not collect, let coin pass through
		}
		// Remove if off screen
		if (pt.y - pt.asset.height / 2 > GAME_HEIGHT + 100) {
			pt.destroy();
			points.splice(j, 1);
		}
	}
	// Track last mouth state for future event triggers (if needed)
	lastMouthOpen = facekit.mouthOpen;
};
// Initialize score
LK.setScore(0);
updateScoreDisplay();
// No touch/mouse controls needed; all movement is face-controlled
// No background or music as per instructions
// No additional UI elements; score is shown at top center
// All game logic is handled in game.update