// Game constants
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640 * 0.7; // 70% of total height
const STATUS_HEIGHT = 640 * 0.3; // 30% of total height

const BALL_RADIUS = 15 / 2;
const STICK_FIGURE_WIDTH = 20 / 3; // Approximately 6.66
const STICK_FIGURE_HEIGHT = 40 / 3; // Approximately 13.33
const STICK_FIGURE_SPEED = 0.5;
const LIFE_MAX = 100;
const BARRIER_DURATION = 5 * 1000; // 5 seconds

let gameSpeedMultiplier = 1; // New variable for game speed multiplier



// Game state variables
let age = 0;
let life = LIFE_MAX;
let eventLog = [];
let balls = [];
let stickFigure = {
    x: GAME_WIDTH - STICK_FIGURE_WIDTH - 10, // Start at right, with some padding
    y: GAME_HEIGHT / 2 - STICK_FIGURE_HEIGHT / 2,
    width: STICK_FIGURE_WIDTH,
    height: STICK_FIGURE_HEIGHT,
    hitEffectActive: false
};
let barrierActive = false;
let barrierTimer = null;
let ballCollisionCounter = 0; // New variable for counting ball-ball collisions
let gameStarted = false;
let animationFrameId;

// Background images based on age
const BACKGROUND_IMAGES = [
    { range: [0, 2], file: '01.png' },
    { range: [3, 5], file: '02.png' },
    { range: [6, 12], file: '03.png' },
    { range: [13, 19], file: '04.png' },
    { range: [20, 49], file: '05.png' },
    { range: [50, 69], file: '06.png' },
    { range: [70, 200], file: '07.png' }
];

const loadedBackgroundImages = {};
let currentBackgroundImage = null;

function loadBackgroundImages() {
    BACKGROUND_IMAGES.forEach(bg => {
        const img = new Image();
        img.src = bg.file;
        img.onload = () => {
            loadedBackgroundImages[bg.file] = img;
            // Set initial background if it matches the current age
            if (age >= bg.range[0] && age <= bg.range[1]) {
                currentBackgroundImage = img;
            }
        };
        img.onerror = () => {
            console.error(`Failed to load background image: ${bg.file}`);
        };
    });
}

// Call to load images when script starts
loadBackgroundImages();

// Ball types and their properties
const BALL_TYPES = {
    RED: { color: 'red', damage: -2, type: 'accident' },
    YELLOW: { color: 'yellow', damage: -1, type: 'illness' },
    BLUE: { color: 'blue', damage: -0.5, type: 'stress' },
    PINK: { color: 'pink', damage: 0, type: 'lucky' },
    SUPER_UNHAPPINESS: { color: 'black', damage: -100, type: '死神' } // New super unhappiness ball type
};

// DOM elements
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const ageDisplay = document.getElementById('age');
const lifeGaugeFill = document.getElementById('life-gauge-fill');
const lifeValueDisplay = document.getElementById('life-value');
const eventLogDisplay = document.getElementById('event-log');
const gameArea = document.getElementById('game-area');
const reincarnateButton = document.getElementById('reincarnate-button'); // New DOM element
const toggleSpeedButton = document.getElementById('toggle-speed-button'); // New DOM element

// Set canvas dimensions
gameCanvas.width = GAME_WIDTH;
gameCanvas.height = GAME_HEIGHT;

// --- Game Initialization and Reset ---
function initGame(autoStart = false) {
    age = 0;
    life = LIFE_MAX;
    eventLog = [];
    balls = [];
    stickFigure.x = GAME_WIDTH - STICK_FIGURE_WIDTH - 10;
    barrierActive = false;
    gameStarted = false;
    updateStatusDisplay();
    addEventToLog('赤色のボールをスワイプして人生を始めよう！');
    
    // Only create the initial red ball for swiping
    balls.push(createBall('RED', GAME_WIDTH / 2, GAME_HEIGHT / 2, 0, 0, BALL_RADIUS * 2));
    
    reincarnateButton.style.display = 'none'; // Hide button on init
    toggleSpeedButton.style.display = 'block'; // Ensure speed toggle button is visible
    draw();
    updateBackground(); // Set initial background

    if (autoStart) {
        addEventToLog('人生が始まりました！');
    }
}

// --- Drawing Functions ---
function drawStickFigure() {
    ctx.fillStyle = 'black';
    ctx.fillRect(stickFigure.x, stickFigure.y, stickFigure.width, stickFigure.height);

    // Head
    ctx.beginPath();
    ctx.arc(stickFigure.x + stickFigure.width / 2, stickFigure.y - (10 / 3), (10 / 3), 0, Math.PI * 2);
    ctx.fill();

    // Hit effect
    if (stickFigure.hitEffectActive) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(stickFigure.x - 2, stickFigure.y - 2, stickFigure.width + 4, stickFigure.height + 4);
    }

    // Barrier
    if (barrierActive) {
        ctx.strokeStyle = 'orange'; // Simple orange outline
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(stickFigure.x + stickFigure.width / 2, stickFigure.y + stickFigure.height / 2, STICK_FIGURE_HEIGHT * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw ball name
    ctx.fillStyle = 'black'; // Text color
    ctx.font = '12px Arial'; // Text font and size (increased by 1.5 times)
    ctx.textAlign = 'center'; // Center the text horizontally
    ctx.textBaseline = 'middle'; // Center the text vertically
    ctx.fillText(getBallTypeName(ball.type), ball.x, ball.y - BALL_RADIUS - 5); // Position text above the ball with some padding

    // Highlight red ball when being dragged (for debugging/user feedback)
    if (ball.type === 'RED' && isMouseDown) {
        ctx.strokeStyle = 'purple';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear the canvas completely

    // Draw background image with transparency
    if (currentBackgroundImage) {
        ctx.save(); // Save current context state
        ctx.globalAlpha = 0.3; // Set transparency (30% opaque)
        ctx.drawImage(currentBackgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.restore(); // Restore context state (reset globalAlpha)
    }

    drawStickFigure(); // Draw stick figure first, so it doesn't have a trail
    balls.forEach(drawBall);
}

function getBallTypeName(type) {
    switch (type) {
        case 'RED': return '怪我・事故';
        case 'YELLOW': return '病気';
        case 'BLUE': return 'ストレス';
        case 'PINK': return 'ラッキー';
        case 'SUPER_UNHAPPINESS': return '死神'; // Changed to 死神
        default: return type;
    }
}

function updateBackground() {
    for (const bg of BACKGROUND_IMAGES) {
        if (age >= bg.range[0] && age <= bg.range[1]) {
            currentBackgroundImage = loadedBackgroundImages[bg.file];
            break;
        }
    }
}

// --- Game Logic ---
function updateStatusDisplay() {
    ageDisplay.textContent = `年齢: ${age}`;
    lifeGaugeFill.style.width = `${(life / LIFE_MAX) * 100}%`;
    lifeGaugeFill.style.backgroundColor = life > 50 ? '#4CAF50' : (life > 20 ? '#FFC107' : '#F44336');
    lifeValueDisplay.textContent = Math.max(0, life);
}

function addEventToLog(event) {
    const p = document.createElement('p');
    p.textContent = `- ${event}`;
    eventLogDisplay.prepend(p); // Add to top
    if (eventLogDisplay.children.length > 10) { // Keep log manageable
        eventLogDisplay.removeChild(eventLogDisplay.lastChild);
    }
}

function handleShinigamiDeath() {
    const deathMessages = [
        '突然の事故死',
        '不治の病で病死'
    ];

    if (age >= 15) {
        deathMessages.push('自ら命を絶つ');
    }

    const randomMessage = deathMessages[Math.floor(Math.random() * deathMessages.length)];
    addEventToLog(`死神の囁きにより、${randomMessage}。`);
    // Game over logic will be triggered by life <= 0 check in updateGame
}

function createBall(type, x, y, vx, vy, radius = BALL_RADIUS) {
    return {
        ...BALL_TYPES[type],
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        radius: radius,
        type: type // Store the type string for collision logic
    };
}

function generateRandomBalls() {
    balls.push(createBall('YELLOW', Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
    balls.push(createBall('BLUE', Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
    balls.push(createBall('PINK', Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, BALL_RADIUS * 3));
}

function updateGame() {
    if (!gameStarted) return;

    // Update ball positions and handle wall collisions
    balls.forEach((ball, index) => {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x + ball.radius > GAME_WIDTH) {
            if (ball.type === 'SUPER_UNHAPPINESS') {
                balls.splice(index, 1); // Remove the ball
                return; // Skip further processing for this ball
            }
            ball.x = GAME_WIDTH - ball.radius; // Position correction
            ball.vx *= -1;
            ball.vx += (Math.random() - 0.5) * 1 * gameSpeedMultiplier; // Increased perturbation
        } else if (ball.x - ball.radius < 0) {
            if (ball.type === 'SUPER_UNHAPPINESS') {
                balls.splice(index, 1); // Remove the ball
                return; // Skip further processing for this ball
            }
            ball.x = ball.radius; // Position correction
            ball.vx *= -1;
            ball.vx += (Math.random() - 0.5) * 1 * gameSpeedMultiplier; // Increased perturbation
        }
        if (ball.y + ball.radius > GAME_HEIGHT) {
            if (ball.type === 'SUPER_UNHAPPINESS') {
                balls.splice(index, 1); // Remove the ball
                return; // Skip further processing for this ball
            }
            ball.y = GAME_HEIGHT - ball.radius; // Position correction
            ball.vy *= -1;
            ball.vy += (Math.random() - 0.5) * 1 * gameSpeedMultiplier; // Increased perturbation
        } else if (ball.y - ball.radius < 0) {
            if (ball.type === 'SUPER_UNHAPPINESS') {
                balls.splice(index, 1); // Remove the ball
                return; // Skip further processing for this ball
            }
            ball.y = ball.radius; // Position correction
            ball.vy *= -1;
            ball.vy += (Math.random() - 0.5) * 1 * gameSpeedMultiplier; // Increased perturbation
        }
    });

    // Stick figure movement
    stickFigure.x -= STICK_FIGURE_SPEED * gameSpeedMultiplier;

    // Check for age increment
    if (stickFigure.x + stickFigure.width < 0) {
        age++;
        stickFigure.x = GAME_WIDTH - STICK_FIGURE_WIDTH - 10; // Reset position
        addEventToLog(`${age}歳になりました！`);
        updateStatusDisplay();
        updateBackground(); // Update background when age changes
    }

    // Ball-Stick Figure collisions
    balls = balls.filter(ball => {
        const dx = ball.x - (stickFigure.x + stickFigure.width / 2);
        const dy = ball.y - (stickFigure.y + stickFigure.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate the effective radius for collision with the stick figure/barrier
        let effectiveStickFigureRadius = STICK_FIGURE_HEIGHT / 2; // Use half of stick figure height for better collision coverage
        if (barrierActive) {
            effectiveStickFigureRadius = STICK_FIGURE_HEIGHT * 1.5; // Fixed barrier radius
        }

        if (distance < ball.radius + effectiveStickFigureRadius) {
            // Collision detected
            const overlap = (ball.radius + effectiveStickFigureRadius) - distance;

            // Calculate normal vector from stick figure to ball
            const normalX = dx / distance;
            const normalY = dy / distance;

            // Displace ball to prevent overlap
            ball.x += normalX * overlap;
            ball.y += normalY * overlap;

            // Reflect ball off stick figure/barrier (handled within if/else blocks below)

            if (barrierActive) {
                if (ball.type !== 'PINK') { // Only log if it's not a PINK ball
                    addEventToLog(`幸運バリアが${getBallTypeName(ball.type)}をはじき返した！`);
                }
                // Reflect ball
                ball.vx *= -1;
                ball.vy *= -1;
                return true; // Keep ball
            } else {
                // Reflect ball off stick figure
                ball.vx *= -1;
                ball.vy *= -1;

                if (ball.type === 'PINK') {
                    // Only activate barrier and log if it's not already active
                    if (!barrierActive) {
                        addEventToLog('ラッキーボールに当たった！幸運バリア発生！');
                        barrierActive = true;
                    }
                    clearTimeout(barrierTimer);
                    // Determine barrier duration based on age
                    const currentBarrierDuration = (age >= 45) ? 3 * 1000 : BARRIER_DURATION;
                    barrierTimer = setTimeout(() => {
                        barrierActive = false;
                        addEventToLog('幸運バリアが消滅しました。');
                    }, currentBarrierDuration);

                } else { // This is for non-pink balls when barrier is NOT active
                    if (ball.type === 'SUPER_UNHAPPINESS') {
                        life = 0; // Immediate death
                        handleShinigamiDeath();
                    } else {
                        life += ball.damage;
                        let eventText = '';
                        if (ball.type === 'RED') eventText = '怪我をした！';
                        if (ball.type === 'YELLOW') eventText = '病気にかかった！';
                        if (ball.type === 'BLUE') eventText = 'ストレスを感じた！';

                        addEventToLog(`${eventText} 寿命が${ball.damage}減少。`);

                        // Activate hit effect
                        stickFigure.hitEffectActive = true;
                        setTimeout(() => {
                            stickFigure.hitEffectActive = false;
                        }, 200); // Effect lasts for 200ms
                    }
                }
                updateStatusDisplay();
                return true; // Keep all balls
            }
        }
        return true; // Keep ball if no collision or if kept by collision logic
    });

    // Ball-Ball collisions
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const ballA = balls[i];
            const ballB = balls[j];

            const dx = ballA.x - ballB.x;
            const dy = ballA.y - ballB.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ballA.radius + ballB.radius) {
                // Collision detected

                // Increment ball-ball collision counter
                ballCollisionCounter++;

                // Generate Super Unhappiness Ball if counter reaches 20
                if (ballCollisionCounter >= 20) {
                    ballCollisionCounter = 0; // Reset counter

                    // Determine stick figure center
                    const stickFigureCenterX = stickFigure.x + stickFigure.width / 2;
                    const stickFigureCenterY = stickFigure.y + stickFigure.height / 2;

                    // Define potential spawn points (corners of the game area)
                    const spawnPoints = [
                        { x: BALL_RADIUS / 2, y: BALL_RADIUS / 2 }, // Top-left
                        { x: GAME_WIDTH - BALL_RADIUS / 2, y: BALL_RADIUS / 2 }, // Top-right
                        { x: BALL_RADIUS / 2, y: GAME_HEIGHT - BALL_RADIUS / 2 }, // Bottom-left
                        { x: GAME_WIDTH - BALL_RADIUS / 2, y: GAME_HEIGHT - BALL_RADIUS / 2 } // Bottom-right
                    ];

                    let furthestPoint = spawnPoints[0];
                    let maxDistance = 0;

                    // Find the furthest point from the stick figure
                    spawnPoints.forEach(point => {
                        const dist = Math.sqrt(Math.pow(point.x - stickFigureCenterX, 2) + Math.pow(point.y - stickFigureCenterY, 2));
                        if (dist > maxDistance) {
                            maxDistance = dist;
                            furthestPoint = point;
                        }
                    });

                    const newBallX = furthestPoint.x;
                    const newBallY = furthestPoint.y;

                    const targetX = stickFigureCenterX;
                    const targetY = stickFigureCenterY;
                    const angle = Math.atan2(targetY - newBallY, targetX - newBallX);
                    const speed = 7 * gameSpeedMultiplier; // Speed of the super unhappiness ball

                    balls.push(createBall(
                        'SUPER_UNHAPPINESS',
                        newBallX, newBallY,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        BALL_RADIUS / 2 // Half the size of normal balls
                    ));
                    addEventToLog('死神が出現した！'); // Changed message
                }

                // If either ball is a SUPER_UNHAPPINESS ball, skip reflection and overlap correction
                // This logic is being removed as per user's clarification.
                // if (ballA.type === 'SUPER_UNHAPPINESS' || ballB.type === 'SUPER_UNHAPPINESS') {
                //     continue; // Skip reflection and overlap correction
                // }

                // Calculate overlap
                const overlap = (ballA.radius + ballB.radius) - distance;

                // Displace balls to prevent sticking
                const normalX = dx / distance;
                const normalY = dy / distance;

                ballA.x += normalX * overlap / 2;
                ballA.y += normalY * overlap / 2;
                ballB.x -= normalX * overlap / 2;
                ballB.y -= normalY * overlap / 2;

                // Calculate relative velocity
                const relativeVx = ballA.vx - ballB.vx;
                const relativeVy = ballA.vy - ballB.vy;

                // Calculate velocity along the normal
                const velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;

                // Do not resolve if velocities are separating
                if (velocityAlongNormal > 0) continue;

                // Calculate impulse scalar
                const impulse = -2 * velocityAlongNormal / (2); // Assuming equal mass

                // Apply impulse
                ballA.vx += impulse * normalX;
                ballA.vy += impulse * normalY;
                ballB.vx -= impulse * normalX;
                ballB.vy -= impulse * normalY;
            }
        }
    }



    // Game over check
    if (life <= 0) {
        cancelAnimationFrame(animationFrameId);
        addEventToLog(`享年${age}歳で人生を終えました。`);
        alert(`ゲームオーバー！享年${age}歳`);
        gameStarted = false;
        reincarnateButton.style.display = 'block'; // Show reincarnate button
    }

    draw();
    if (gameStarted) { // Only request animation frame if game is started
        animationFrameId = requestAnimationFrame(updateGame);
    }
}

reincarnateButton.addEventListener('click', () => {
    initGame(true); // Auto-start the game after reincarnation
});

toggleSpeedButton.addEventListener('click', () => {
    const previousGameSpeedMultiplier = gameSpeedMultiplier; // Store current multiplier
    if (gameSpeedMultiplier === 1) {
        gameSpeedMultiplier = 2;
        toggleSpeedButton.textContent = 'SP×2';
    } else if (gameSpeedMultiplier === 2) {
        gameSpeedMultiplier = 4;
        toggleSpeedButton.textContent = 'SP×4';
    } else {
        gameSpeedMultiplier = 1;
        toggleSpeedButton.textContent = 'SP×1';
    }
    addEventToLog(`ゲームスピードが${gameSpeedMultiplier}倍になりました！`);

    // Update velocities of existing balls
    const ratio = gameSpeedMultiplier / previousGameSpeedMultiplier;
    balls.forEach(ball => {
        ball.vx *= ratio;
        ball.vy *= ratio;
    });
});

// --- Event Listeners ---
let startSwipeX = 0;
let startSwipeY = 0;
let isMouseDown = false; // New variable for mouse state

gameCanvas.addEventListener('touchstart', (e) => {
    if (!gameStarted) {
        const touchX = e.touches[0].clientX - gameCanvas.getBoundingClientRect().left;
        const touchY = e.touches[0].clientY - gameCanvas.getBoundingClientRect().top;

        // Check if touch is on the red ball
        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall) {
            const dx = touchX - redBall.x;
            const dy = touchY - redBall.y;
            if (Math.sqrt(dx * dx + dy * dy) < redBall.radius) {
                startSwipeX = touchX;
                startSwipeY = touchY;
                e.preventDefault(); // Prevent scrolling
            }
        }
    }
});

gameCanvas.addEventListener('touchmove', (e) => {
    if (!gameStarted && startSwipeX !== 0) {
        e.preventDefault(); // Prevent scrolling
        const touchX = e.touches[0].clientX - gameCanvas.getBoundingClientRect().left;
        const touchY = e.touches[0].clientY - gameCanvas.getBoundingClientRect().top;

        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall) {
            redBall.x = touchX;
            redBall.y = touchY;
            draw();
        }
    }
});

gameCanvas.addEventListener('touchend', (e) => {
    if (!gameStarted && startSwipeX !== 0) {
        const endSwipeX = e.changedTouches[0].clientX - gameCanvas.getBoundingClientRect().left;
        const endSwipeY = e.changedTouches[0].clientY - gameCanvas.getBoundingClientRect().top;

        const dx = endSwipeX - startSwipeX;
        const dy = endSwipeY - startSwipeY;

        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) { // Detect a swipe
            redBall.vx = dx * 0.1 * gameSpeedMultiplier;
            redBall.vy = dy * 0.1 * gameSpeedMultiplier;
            gameStarted = true;
            addEventToLog('人生が始まりました！');
            animationFrameId = requestAnimationFrame(updateGame);

            // Now generate the other random balls
            generateRandomBalls();
        }
        startSwipeX = 0;
        startSwipeY = 0;
    }
});

gameCanvas.addEventListener('mousedown', (e) => {
    if (!gameStarted) {
        const mouseX = e.clientX - gameCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - gameCanvas.getBoundingClientRect().top;

        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall) {
            const dx = mouseX - redBall.x;
            const dy = mouseY - redBall.y;
            if (Math.sqrt(dx * dx + dy * dy) < redBall.radius) {
                startSwipeX = mouseX;
                startSwipeY = mouseY;
                isMouseDown = true;
                e.preventDefault();
                console.log('Red ball mousedown detected.'); // Added console log
            }
        }
    }
});

gameCanvas.addEventListener('mousemove', (e) => {
    if (!gameStarted && isMouseDown) {
        e.preventDefault();
        const mouseX = e.clientX - gameCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - gameCanvas.getBoundingClientRect().top;

        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall) {
            redBall.x = mouseX;
            redBall.y = mouseY;
            draw();
        }
    }
});

gameCanvas.addEventListener('mouseup', (e) => {
    if (!gameStarted && isMouseDown) {
        const endSwipeX = e.clientX - gameCanvas.getBoundingClientRect().left;
        const endSwipeY = e.clientY - gameCanvas.getBoundingClientRect().top;

        const dx = endSwipeX - startSwipeX;
        const dy = endSwipeY - startSwipeY;

        const redBall = balls.find(ball => ball.type === 'RED');
        if (redBall && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            redBall.vx = dx * 0.1 * gameSpeedMultiplier;
            redBall.vy = dy * 0.1 * gameSpeedMultiplier;
            gameStarted = true;
            addEventToLog('人生が始まりました！');
            animationFrameId = requestAnimationFrame(updateGame);
            generateRandomBalls();
        }
        startSwipeX = 0;
        startSwipeY = 0;
        isMouseDown = false;
        console.log('Red ball mouseup detected.'); // Added console log
    }
});

// Initialize the game when the script loads
initGame();