// CONSTANTS ------------------------------------------------------------------
const FPS = 1000 / 60;

// Game variables -------------------------------------------------------------
const scene = document.getElementById("scene");
const brush = getBrush();
const npcSeed = 3;

let interval;
let gameStartTime = Date.now();
let gameEnded = false;
let npcFrozenUntil = 0;

const BORDER = {
  LEFT: 0,
  TOP: 0,
  RIGHT: 640,
  BOTTOM: 480,
};

const gameState = {
  playerScore: 0,
  npcScore: 0,
  timeRemaining: 90
};

const ball = {
  color: "#f97f04",
  radius: 10,
  x: 320,
  xVelocity: 3,
  y: 240,
  yVelocity: Math.random() > 0.5 ? 2 : -2,
  baseSpeed: 3
};

const playerPaddle = {
  color: "Red",
  width: 20,
  height: 75,
  x: 10,
  y: 200,
};

const npcPaddle = {
  color: "Yellow",
  width: 20,
  height: 75,
  x: BORDER.RIGHT - 30,
  y: 200,
};

const mouse = { x: 0, y: 0 };

// Game engine ----------------------------------------------------------------

function init() {
  // Do any initialization that is needed before the game starts.
  scene.addEventListener("mousemove", onMouseMove); // React when the mouse moves.
  document.addEventListener("keydown", onKeyDown); // React to key presses.
  interval = setInterval(update, FPS); // Start the core game loop.
  updateUI();
}

function update() {
  if (gameEnded) return;

  // Update timer
  updateTimer();
  
  // Update to game logic.
  moveBall(ball);
  
  playerPaddle.y = mouse.y - playerPaddle.height / 2; // Center paddle on mouse

  // Only move NPC paddle if not frozen
  if (Date.now() > npcFrozenUntil) {
    moveNpcPaddle(npcPaddle, ball);
  }

  checkPaddleCollision(ball, playerPaddle);
  checkPaddleCollision(ball, npcPaddle);

  checkForScoring(ball);
  keepBallOnPitch(ball);

  draw();
  updateUI();
}

function draw() {
  clearScreen();
  // Draw the current game state.

  drawPitch();

  drawBall(ball);
  drawPaddle(playerPaddle);
  drawPaddle(npcPaddle);

// Draw Timer
brush.save();
brush.fillStyle = "white";
brush.font = "20px monospace";
brush.textAlign = "right";
brush.textBaseline = "top";
brush.fillText(
  `Time: ${Math.ceil(gameState.timeRemaining)} s`,
   scene.width - 20, 20
  );
brush.restore();

// Draw Score
const SCORE_FONT = Math.floor(scene.height * 0.12); 
const PADDING_TOP = Math.floor(scene.height * 0.05);

brush.save();
brush.fillStyle = "white";
brush.textBaseline = "top";
brush.shadowColor = "black";
brush.shadowBlur = 6; 
brush.font = `${SCORE_FONT}px Arial`;

// Player score
brush.font = `${SCORE_FONT}px Arial`;
brush.textAlign = "center";
brush.fillText(
  String(gameState.playerScore),
  scene.width * 0.25,       
  PADDING_TOP
);

// NPC score
brush.fillText(
  String(gameState.npcScore),
  scene.width * 0.75,         
  PADDING_TOP
);

  if (gameEnded) {
    drawGameOver();
  }
}



// Game functions -------------------------------------------------------------

function updateTimer() {
  const elapsed = (Date.now() - gameStartTime) / 1000;
  gameState.timeRemaining = Math.max(0, 90 - elapsed);
  
  if (gameState.timeRemaining <= 0 && !gameEnded) {
    endGame();
  }
}

function endGame() {
  gameEnded = true;
  clearInterval(interval);
}

function drawGameOver() {
  brush.fillStyle = "rgba(0, 0, 0, 0.7)";
  brush.fillRect(0, 0, scene.width, scene.height);
  
  brush.fillStyle = "white";
  brush.font = "48px Arial";
  brush.textAlign = "center";
  brush.fillText("GAME OVER", scene.width / 2, scene.height / 2);
  
  brush.font = "24px Arial";
  let winner;
  if (gameState.playerScore > gameState.npcScore) {
    winner = "Player Win!";
  } else if (gameState.npcScore > gameState.playerScore) {
    winner = "NPC Win!";
  } else {
    winner = "It's a Tie!";
  }
  brush.fillText(winner, scene.width / 2, scene.height / 2 + 50);
}

function checkForScoring(ball) {
  if (ball.x + ball.radius < BORDER.LEFT) {
    // NPC scores
    gameState.npcScore++;
    resetBall();
  } else if (ball.x - ball.radius > BORDER.RIGHT) {
    // Player scores
    gameState.playerScore++;
    resetBall();
  }
}

function resetBall() {
  ball.x = BORDER.RIGHT / 2;
  ball.y = BORDER.BOTTOM / 2;
  
  // Random direction with reasonable speed
  const angle = (Math.random() - 0.5) * Math.PI / 2; // -45 to +45 degrees
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  ball.xVelocity = Math.cos(angle) * ball.baseSpeed * direction;
  ball.yVelocity = Math.sin(angle) * ball.baseSpeed;
}

function keepBallOnPitch(ball) {
  // Only bounce off top and bottom walls, not left and right (for scoring)
  if (ball.y - ball.radius <= BORDER.TOP || ball.y + ball.radius >= BORDER.BOTTOM) {
    ball.yVelocity = ball.yVelocity * -1;
  }
}

function moveBall(ball) {
  ball.x = ball.x + ball.xVelocity;
  ball.y = ball.y + ball.yVelocity;
}

function drawBall(ball) {
  fillCircle(ball);
}

function checkPaddleCollision(ball, paddle) {
  // Check if ball is within paddle's Y range
  if (ball.y >= paddle.y && ball.y <= paddle.y + paddle.height) {
    let collision = false;
    
    if (paddle.x < BORDER.RIGHT / 2) {
      // Left paddle (player)
      if (ball.x - ball.radius <= paddle.x + paddle.width && ball.xVelocity < 0) {
        collision = true;
      }
    } else {
      // Right paddle (NPC)
      if (ball.x + ball.radius >= paddle.x && ball.xVelocity > 0) {
        collision = true;
      }
    }
    
    if (collision) {
      // Calculate deflection based on where ball hits paddle
      const paddleCenter = paddle.y + paddle.height / 2;
      const hitPos = (ball.y - paddleCenter) / (paddle.height / 2); // -1 to 1
      
      // Reverse X velocity
      ball.xVelocity *= -1;
      
      // Apply deflection to Y velocity
      const maxDeflection = 5;
      ball.yVelocity += hitPos * maxDeflection;
      
      // Increase speed slightly
      increaseBallSpeed(ball);
    }
  }
}

function increaseBallSpeed(ball) {
  const maxSpeed = 12;
  const accel = 1.05; // 5% increase

  ball.xVelocity *= accel;
  ball.yVelocity *= accel;

  // Cap the speed
  if (Math.abs(ball.xVelocity) > maxSpeed) {
    ball.xVelocity = ball.xVelocity > 0 ? maxSpeed : -maxSpeed;
  }
  if (Math.abs(ball.yVelocity) > maxSpeed) {
    ball.yVelocity = ball.yVelocity > 0 ? maxSpeed : -maxSpeed;
  }
}

function drawPaddle(paddle) {
  brush.fillStyle = paddle.color;
  brush.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawPitch() {
  brush.fillStyle = "black";
  brush.fillRect(0, 0, scene.width, scene.height);

  brush.fillStyle = "white";
  brush.fillRect(scene.width * 0.5 - 2, 0, 4, scene.height);
}

function moveNpcPaddle(paddle, ball) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const targetY = ball.y;
  const buffer = 15;

  if (targetY < paddleCenter - buffer) {
    paddle.y -= npcSeed;
  } else if (targetY > paddleCenter + buffer) {
    paddle.y += npcSeed;
  }

  // Keep paddle on screen
  if (paddle.y < BORDER.TOP) paddle.y = BORDER.TOP;
  if (paddle.y + paddle.height > BORDER.BOTTOM) {
    paddle.y = BORDER.BOTTOM - paddle.height;
  }
}

function updateUI() {
  document.getElementById("playerScore").textContent = gameState.playerScore;
  document.getElementById("npcScore").textContent = gameState.npcScore;
  document.getElementById("timer").textContent = Math.ceil(gameState.timeRemaining);
}

init(); // Start the game

// System events --------------------------------------------------------------

function onMouseMove(event) {
  mouse.x = event.offsetX;
  mouse.y = event.offsetY;
}

function onKeyDown(event) {
  if (gameEnded) 
    return;
  
  switch(event.key.toLowerCase()) {
    case 'l':
      // Freeze NPC paddle for 2 seconds
      npcFrozenUntil = Date.now() + 2000;
      break;
      
    case 'c':
      // Auto-aim: move player paddle to intercept ball
      playerPaddle.y = ball.y - playerPaddle.height / 2;
      // Update mouse position to match
      mouse.y = ball.y;
      break;
      
    case '+':
    case '=':
      // Increase ball size
      ball.radius = Math.min(ball.radius + 5, 50); // Max radius 50
      break;
      
    case '-':
    case '_':
      // Decrease ball size
      ball.radius = Math.max(ball.radius - 5, 5); // Min radius 5
      break;
  }
}

// Utility functions ----------------------------------------------------------

function isInBounds(value, min, max) {
  return value >= min && value <= max;
}

function fillCircle(circle) {
  brush.beginPath();
  brush.fillStyle = circle.color;
  brush.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  brush.fill();
}

function getBrush() {
  return scene.getContext("2d");
}

function clearScreen() {
  if (brush) {
    brush.clearRect(0, 0, scene.width, scene.height);
  }
}