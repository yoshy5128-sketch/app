console.log("maze.js script started."); // Add this at the very top

const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');

// Removed global screenWidth and screenHeight constants

// --- Map Settings ---
const mapWidth = 21; // Increased map width
const mapHeight = 17; // Increased map height
let map; // Declare map here, but initialize in initializeGame()
const tileSize = 1;

// --- Player Settings ---
const player = {
    x: 1.5, // Initial x position (in grid units) - will be set by entrance
    y: 1.5, // Initial y position (in grid units) - will be set by entrance
    angle: Math.PI / 4, // Initial viewing angle
    speed: 0.025, // Reduced speed
    rotationSpeed: 0.04,
    fov: Math.PI / 3 // Field of View
};

// Global game state variables
let entrance = {};
let exit = {};
let switches = [];
let aiCharacters = [];
let gameRunning = true; // Moved here to be global
let animationFrameId; // Declare animationFrameId globally
let gameState = 'playing';
let initialAi1X, initialAi1Y, initialAi2X, initialAi2Y;
// Removed wallTexture as we are abandoning textures

let isMapVisible = true; // Control minimap visibility

let currentStage = 0; // Start at stage 0

const colorPalettes = [
    // Palette 0: Hellish Red/Purple
    {
        floor: '#111111',
        ceiling: '#4A0404',
        wallBaseRGB: [90, 0, 0], // Dark red
        fogRGB: [48, 0, 48] // Dark reddish-purple
    },
    // Palette 1: Eerie Green/Brown
    {
        floor: '#222211',
        ceiling: '#112211',
        wallBaseRGB: [60, 60, 30], // Muddy green-brown
        fogRGB: [30, 40, 30] // Dark green-gray
    },
    // Palette 2: Cold Blue/Gray
    {
        floor: '#101020',
        ceiling: '#202040',
        wallBaseRGB: [50, 50, 70], // Desaturated blue-gray
        fogRGB: [30, 30, 50] // Dark blue-gray
    }
];

// --- Input Handling ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function handleInput() {
    console.log("handleInput called. gameState:", gameState, "keys['KeyR']:", keys['KeyR']); // Debugging

    let moveX = 0;
    let moveY = 0;

    // Rotation
    if (keys['KeyA'] || keys['ArrowLeft']) {
        player.angle -= player.rotationSpeed;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        player.angle += player.rotationSpeed;
    }

    // Normalize player.angle to keep it within -PI to PI
    if (player.angle < -Math.PI) {
        player.angle += 2 * Math.PI;
    }
    if (player.angle > Math.PI) {
        player.angle -= 2 * Math.PI;
    }

    // Calculate potential movement
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveX += Math.cos(player.angle) * player.speed;
        moveY += Math.sin(player.angle) * player.speed;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveX -= Math.cos(player.angle) * player.speed;
        moveY -= Math.sin(player.angle) * player.speed;
    }
    
    let newX = player.x + moveX;
    let newY = player.y + moveY;

    // Wall Sliding Collision Detection
    // Try moving in X direction first
    if (map[Math.floor(player.y)][Math.floor(newX)] === 0 || map[Math.floor(player.y)][Math.floor(newX)] === 3) { // Allow movement through open exit
        player.x = newX;
    }

    // Then try moving in Y direction
    if (map[Math.floor(newY)][Math.floor(player.x)] === 0 || map[Math.floor(newY)][Math.floor(player.x)] === 3) { // Allow movement through open exit
        player.y = newY;
    }

    // Player-Switch Interaction
    // console.log("Type of switches:", typeof switches); // Debugging - removed to reduce log spam
    switches.forEach(s => {
        const distToSwitch = Math.sqrt(Math.pow(player.x - s.renderX, 2) + Math.pow(player.y - s.renderY, 2));
        console.log(`handleInput: Player dist to switch (${s.x.toFixed(2)}, ${s.y.toFixed(2)}): ${distToSwitch.toFixed(2)}, isOn: ${s.isOn}`);
        if (distToSwitch < 0.5 && !s.isOn) { // If player is close enough to the rendered switch position
            s.isOn = true; // Turn switch ON
            console.log(`Switch at (${s.x}, ${s.y}) turned ON.`); // Log switch activation
            const allSwitchesOn = switches.every(switchObj => switchObj.isOn);
            if (allSwitchesOn) {
                map[Math.floor(exit.y)][Math.floor(exit.x)] = 3; // Open exit - now value 3 for black wall
                console.log("All switches are ON! Exit is now open.");
            }
        }
    });

    // Player-Exit Interaction
    if (Math.floor(player.x) === exit.x && Math.floor(player.y) === exit.y && map[Math.floor(exit.y)][Math.floor(exit.x)] === 3) { // If player is in the exit cell and exit is black
        gameComplete();
        return; // Exit handleInput as game is over
    }
}

// Helper function to check if a cell is valid and not a wall
function isValid(x, y) {
    return x >= 0 && x < mapWidth && y >= 0 && y < mapHeight && map[y][x] !== 1 && map[y][x] !== 2; // AI should not go into exit before it's open
}

function findPath(startX, startY, endX, endY) {
    const queue = [];
    const visited = new Set();
    const parent = new Map(); // Stores parent of each cell to reconstruct path

    queue.push({ x: Math.floor(startX), y: Math.floor(startY) });
    visited.add(`${Math.floor(startX)},${Math.floor(startY)}`);
    parent.set(`${Math.floor(startX)},${Math.floor(startY)}`, null);

    const directions = [
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
    ];

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.x === Math.floor(endX) && current.y === Math.floor(endY)) {
            // Path found, reconstruct it
            const path = [];
            let node = current;
            while (node) {
                path.unshift({ x: node.x + 0.5, y: node.y + 0.5 }); // Center of cell
                node = parent.get(`${node.x},${node.y}`);
            }
            return path;
        }

        for (const dir of directions) {
            const nextX = current.x + dir.dx;
            const nextY = current.y + dir.dy;
            const nextKey = `${nextX},${nextY}`;

            if (isValid(nextX, nextY) && !visited.has(nextKey)) {
                visited.add(nextKey);
                parent.set(nextKey, current);
                queue.push({ x: nextX, y: nextY });
            }
        }
    }

    return null; // No path found
}



function generateMaze(width, height) {
    console.log("generateMaze called with width:", width, "height:", height);
    // Initialize grid with all walls
    const newMap = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(1); // All walls initially
        }
        newMap.push(row);
    }
    console.log("newMap dimensions:", newMap.length, "x", newMap[0].length);

    // Recursive Backtracker algorithm
    function carvePassages(cx, cy, currentMap, currentWidth, currentHeight) {
        console.log("carvePassages called with cx:", cx, "cy:", cy);
        const directions = [
            { dx: 0, dy: 2 }, { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: -2, dy: 0 }
        ];
        // Shuffle directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (const dir of directions) {
            const nx = cx + dir.dx;
            const ny = cy + dir.dy;

            const wallX = cx + dir.dx / 2;
            const wallY = cy + dir.dy / 2;
            console.log("  dir:", dir, "nx:", nx, "ny:", ny, "wallX:", wallX, "wallY:", wallY);
            console.log("  currentMap[wallY] before access:", currentMap[wallY]);

            if (nx > 0 && nx < currentWidth - 1 && ny > 0 && ny < currentHeight - 1 &&
                wallX > 0 && wallX < currentWidth - 1 && wallY > 0 && wallY < currentHeight - 1) { // Check boundaries for nx, ny AND wallX, wallY
                if (currentMap[ny][nx] === 1) { // If it's a wall, carve a path
                    currentMap[ny][nx] = 0; // Carve path
                    console.assert(wallY >= 0 && wallY < currentHeight, `wallY (${wallY}) out of bounds [0, ${currentHeight-1}]`);
                    console.assert(wallX >= 0 && wallX < currentWidth, `wallX (${wallX}) out of bounds [0, ${currentWidth-1}]`);
                    console.log("Type of currentMap[wallY]:", typeof currentMap[wallY], "currentMap[wallY]:", currentMap[wallY]);
                    currentMap[wallY][wallX] = 0; // Carve passage between cells
                    carvePassages(nx, ny, currentMap, currentWidth, currentHeight);
                } else if (Math.random() < 0.2) { // DECREASED chance to create a loop to 20%
                    console.assert(wallY >= 0 && wallY < currentHeight, `wallY (${wallY}) out of bounds [0, ${currentHeight-1}]`);
                    console.assert(wallX >= 0 && wallX < currentWidth, `wallX (${wallX}) out of bounds [0, ${currentWidth-1}]`);
                    console.log("Type of currentMap[wallY]:", typeof currentMap[wallY], "currentMap[wallY]:", currentMap[wallY]);
                    currentMap[wallY][wallX] = 0; // Carve passage between cells
                }
            }
        }
    }

    // Start carving from a random odd cell
    // Ensure startX and startY are within the inner maze boundaries (1 to width-2 / height-2)
    const startX = Math.floor(Math.random() * ((width - 1) / 2)) * 2 + 1;
    const startY = Math.floor(Math.random() * ((height - 1) / 2)) * 2 + 1;
    console.log("Initial carve: startY:", startY, "startX:", startX, "height:", height, "width:", width);
    console.log("newMap[startY] before initial carve:", newMap[startY]);
    newMap[startY][startX] = 0;
    carvePassages(startX, startY, newMap, width, height);

    // Ensure outer walls are always 1
    for (let y = 0; y < height; y++) {
        newMap[y][0] = 1;
        newMap[y][width - 1] = 1;
    }
    for (let x = 0; x < width; x++) {
        newMap[0][x] = 1;
        newMap[height - 1][x] = 1;
    }

    return newMap;
}

// Helper function to find dead-ends in the maze
function findDeadEnds(maze) {
    const deadEnds = [];
    for (let y = 1; y < maze.length - 1; y++) {
        for (let x = 1; x < maze[0].length - 1; x++) {
            if (maze[y][x] === 0) { // If it's a path
                let pathNeighbors = 0;
                if (maze[y - 1][x] === 0) pathNeighbors++;
                if (maze[y + 1][x] === 0) pathNeighbors++;
                if (maze[y][x - 1] === 0) pathNeighbors++;
                if (maze[y][x + 1] === 0) pathNeighbors++;

                if (pathNeighbors <= 1) { // A dead-end or a corner with only one path
                    deadEnds.push({ x, y });
                }
            }
        }
    }
    return deadEnds;
}

// Helper function to check if a path cell is accessible (not a dead-end corner)
function isAccessiblePath(x, y) {
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight || map[y][x] !== 0) {
        return false; // Not a valid path cell
    }
    let openNeighbors = 0;
    // Check 4 cardinal directions
    if (x > 0 && map[y][x - 1] === 0) openNeighbors++;
    if (x < mapWidth - 1 && map[y][x + 1] === 0) openNeighbors++;
    if (y > 0 && map[y - 1][x] === 0) openNeighbors++;
    if (y < mapHeight - 1 && map[y + 1][x] === 0) openNeighbors++;

    // A cell is accessible if it has at least 2 open neighbors.
    // This prevents placing switches in dead-end corners where player can't turn.
    return openNeighbors >= 2;
}

function gameOver() {
    gameState = 'gameOver';
    gameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    render(); // Explicitly call render to draw the game over screen
}

function gameComplete() {
    gameState = 'gameComplete';
    gameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    render(); // Explicitly call render to draw the game clear screen

    // After a delay, start a new game
    setTimeout(() => {
        currentStage++; // Increment stage for next game
        gameState = 'playing'; // Reset game state for new game
        initializeGame();
    }, 3000); // 3 second delay
}

function updateAI() {
    aiCharacters.forEach((ai, index) => { // Added index to differentiate AIs
        // If no current path or target, find a new one
        if (!ai.path || ai.path.length === 0) {
            let targetPlayerX = Math.floor(player.x);
            let targetPlayerY = Math.floor(player.y);

            if (index === 0) { // AI 1 (Leader) - path directly to player
                ai.targetX = targetPlayerX + 0.5; // Center of cell
                ai.targetY = targetPlayerY + 0.5; // Center of cell
                ai.path = findPath(ai.x, ai.y, ai.targetX, ai.targetY);
                if (!ai.path) { // If no path found, clear target and try again next frame
                    ai.targetX = null;
                    ai.targetY = null;
                }
            } else { // AI 2 (Patroller/Flanker)
                if (ai.wanderMode && ai.path.length > 0) {
                    // Continue wandering
                } else {
                    ai.wanderMode = false; // Exit wander mode if path is complete

                    // Chance to wander even if path to player exists
                    if (Math.random() < 0.3) { // 30% chance to wander
                        ai.wanderMode = true;
                        ai.wanderPathLength = Math.floor(Math.random() * 5) + 3; // Wander for 3-7 steps
                    }

                    if (ai.wanderMode) {
                        // Generate a random path for wandering
                        let currentWanderX = Math.floor(ai.x);
                        let currentWanderY = Math.floor(ai.y);
                        let tempPath = [{ x: currentWanderX + 0.5, y: currentWanderY + 0.5 }];

                        for (let i = 0; i < ai.wanderPathLength; i++) {
                            const possibleMoves = [];
                            const directions = [
                                { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
                            ];
                            for (const dir of directions) {
                                const nextX = currentWanderX + dir.dx;
                                const nextY = currentWanderY + dir.dy;
                                if (isValid(nextX, nextY)) {
                                    possibleMoves.push({ x: nextX, y: nextY });
                                }
                            }
                            if (possibleMoves.length > 0) {
                                const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                                currentWanderX = randomMove.x;
                                currentWanderY = randomMove.y;
                                tempPath.push({ x: currentWanderX + 0.5, y: currentWanderY + 0.5 });
                            } else {
                                break; // Stuck, end wandering early
                            }
                        }
                        ai.path = tempPath;
                        ai.targetX = tempPath[tempPath.length - 1].x;
                        ai.targetY = tempPath[tempPath.length - 1].y;
                    } else {
                        // Try to find a path to the player
                        let pathToPlayer = findPath(ai.x, ai.y, targetPlayerX, targetPlayerY);
                        if (pathToPlayer && pathToPlayer.length > 0) {
                            ai.path = pathToPlayer;
                            ai.targetX = pathToPlayer[pathToPlayer.length - 1].x;
                            ai.targetY = pathToPlayer[pathToPlayer.length - 1].y;
                        } else {
                            // If no path to player, force wander mode
                            ai.wanderMode = true;
                            ai.wanderPathLength = Math.floor(Math.random() * 5) + 3;
                            // This will re-enter the outer if block next frame to generate a wander path
                            ai.path = []; // Clear path to trigger new path generation
                            ai.targetX = null;
                            ai.targetY = null;
                        }
                    }
                }
            }
        }

        // Follow the current path
        const nextPathPoint = ai.path[0];
        const dx = nextPathPoint.x - ai.x;
        const dy = nextPathPoint.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) { // Reached current path point, move to next
            ai.path.shift();
            if (ai.path.length === 0) { // Reached final target
                ai.targetX = null;
                ai.targetY = null;
            }
        } else {
            let newX = ai.x + (dx / dist) * ai.speed;
            let newY = ai.y + (dy / dist) * ai.speed;

            // AI Collision Detection: Check if the new position would put AI into a wall
            const currentCellX = Math.floor(ai.x);
            const currentCellY = Math.floor(ai.y);
            const newCellX = Math.floor(newX);
            const newCellY = Math.floor(newY);

            let collided = false;
            if (map[newCellY][newCellX] === 1 || map[newCellY][newCellX] === 2) { // If new cell is a wall or closed exit
                collided = true;
            } else if (newCellX !== currentCellX && (map[currentCellY][newCellX] === 1 || map[currentCellY][newCellX] === 2)) {
                // Moving horizontally into a wall
                collided = true;
            } else if (newCellY !== currentCellY && (map[newCellY][currentCellX] === 1 || map[newCellY][currentCellX] === 2)) {
                // Moving vertically into a wall
                collided = true;
            }

            if (collided) {
                console.log(`AI Collision: AI ${aiCharacters.indexOf(ai)} hit a wall at (${newCellX}, ${newCellY}). Clearing path.`);
                ai.path = []; // Clear path
                ai.targetX = null;
                ai.targetY = null;
            } else {
                ai.x = newX;
                ai.y = newY;
                // Update AI's angle to face its direction of movement
                ai.angle = Math.atan2(dy, dx);
            }
        }
        
        // Player-AI Collision Detection
        const distToPlayer = Math.sqrt(Math.pow(player.x - ai.x, 2) + Math.pow(player.y - ai.y, 2));
        if (distToPlayer < 0.5) { // If player is close enough to AI
            gameOver();
            return; // Stop further processing if game is over
        }
    });
}

function drawMiniMap() {
    if (!isMapVisible) {
        return; // Don't draw if map is not visible
    }
    let miniMapSize = 12.5; // Default size
    if (canvas.width < 600) { // Adjust for smaller screens (e.g., mobile)
        miniMapSize = 8; // Smaller size for mobile
    }
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            ctx.fillStyle = '#555'; // Default to wall color
            if (map[y][x] === 0) ctx.fillStyle = '#aaa'; // Path
            if (x === exit.x && y === exit.y && map[y][x] !== 3) { // If it's the exit location and not open yet
                ctx.fillStyle = '#555'; // Render as a normal wall on minimap too
             } else if (map[y][x] === 3) { // Open exit is black
                ctx.fillStyle = '#000';
            }
            
            ctx.fillRect(x * miniMapSize, y * miniMapSize, miniMapSize, miniMapSize);
        }
    }
    // Draw player on minimap as an arrow
    ctx.fillStyle = 'red';
    const playerMiniMapX = player.x * miniMapSize;
    const playerMiniMapY = player.y * miniMapSize;
    const arrowLength = miniMapSize * 0.6; // Length of the arrow from center
    const arrowWidth = miniMapSize * 0.4;  // Width of the arrow base

    ctx.beginPath();
    // Tip of the arrow
    ctx.moveTo(
        playerMiniMapX + Math.cos(player.angle) * arrowLength,
        playerMiniMapY + Math.sin(player.angle) * arrowLength
    );
    // Base point 1 (left)
    ctx.lineTo(
        playerMiniMapX + Math.cos(player.angle - Math.PI * 0.75) * arrowWidth,
        playerMiniMapY + Math.sin(player.angle - Math.PI * 0.75) * arrowWidth
    );
    // Base point 2 (right)
    ctx.lineTo(
        playerMiniMapX + Math.cos(player.angle + Math.PI * 0.75) * arrowWidth,
        playerMiniMapY + Math.sin(player.angle + Math.PI * 0.75) * arrowWidth
    );
    ctx.closePath();
    ctx.fill();


    // Draw AI characters on minimap (same size as player dot, not arrow)
    aiCharacters.forEach(ai => {
        ctx.fillStyle = 'blue'; // AI color
        ctx.fillRect(ai.x * miniMapSize - 2, ai.y * miniMapSize - 2, 4, 4); // Same size as player dot was
    });

    // Draw switches on minimap
    switches.forEach(s => {
        ctx.fillStyle = s.isOn ? 'red' : 'yellow'; // Red if on, yellow if off
        ctx.fillRect(s.x * miniMapSize - 1, s.y * miniMapSize - 1, 2, 2); // Smaller dot for switch
    });
}


function render() {
    console.log("render() called. gameState:", gameState); // Debugging for black screen issue
    // Show/hide restart button based on game state
    if (restartBtn) {
        if (gameState === 'gameOver') {
            restartBtn.style.display = 'block';
        } else {
            restartBtn.style.display = 'none';
        }
        // console.log("Setting restartBtn display to:", restartBtn.style.display); // Debugging
    }

    // Show/hide showMapBtn based on isMapVisible
    if (showMapBtn) {
        if (gameState === 'playing' && !isMapVisible) {
            showMapBtn.style.display = 'block';
        } else {
            showMapBtn.style.display = 'none';
        }
    }

    // Show/hide bgmToggleBtn based on game state
    if (bgmToggleBtn) {
        if (gameState === 'playing') {
            bgmToggleBtn.style.display = 'block';
            // Update button text based on current BGM state
            bgmToggleBtn.textContent = bgmAudio && !bgmAudio.paused ? 'BGM OFF' : 'BGM ON';
        } else {
            bgmToggleBtn.style.display = 'none';
        }
    }

    // console.log("render() called. Current gameState:", gameState);
    // console.log("render running."); // Debugging
    if (gameState === 'playing') {
    const currentPalette = colorPalettes[currentStage % colorPalettes.length];
    const fogEndDistance = 12; // Keep fog distance constant for now

    // Floor and Ceiling
    ctx.fillStyle = currentPalette.floor;
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
    ctx.fillStyle = currentPalette.ceiling;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    const zBuffer = new Array(canvas.width).fill(Infinity); // Use canvas.width

    // Ray Casting
    for (let i = 0; i < canvas.width; i++) { // Use canvas.width
        const rayAngle = (player.angle - player.fov / 2) + (i / canvas.width) * player.fov; // Use canvas.width
        
        let distanceToWall = 0;
        let hitWall = false;
        let hitBoundary = false;

        const eyeX = Math.cos(rayAngle);
        const eyeY = Math.sin(rayAngle);

        while (!hitWall && distanceToWall < 20) {
            distanceToWall += 0.1;
            
            const testX = Math.floor(player.x + eyeX * distanceToWall);
            const testY = Math.floor(player.y + eyeY * distanceToWall);

            if (testX < 0 || testX >= mapWidth || testY < 0 || testY >= mapHeight) {
                hitWall = true;
                distanceToWall = Infinity; // Treat as very far away for Z-buffer
            } else {
                if (map[testY][testX] !== 0) {
                    hitWall = true;
                    // distanceToWall is the actual hit distance here
                }
            }
        }
        // If loop finishes and hitWall is false, it means no wall was hit within 20 units.
        // In this case, distanceToWall would be 20. We should treat this as Infinity for zBuffer.
        if (!hitWall) {
            distanceToWall = Infinity;
        }

        // Correct for fish-eye lens effect
        const ca = player.angle - rayAngle;
        distanceToWall *= Math.cos(ca);

        const wallHeight = canvas.height / distanceToWall; // Use canvas.height
        const wallTop = canvas.height / 2 - wallHeight / 2; // Use canvas.height
        
        let wallColor;
        // Corrected: Use player.x/y + eyeX/Y * distanceToWall for final hit point
        const hitPointX = player.x + eyeX * distanceToWall;
        const hitPointY = player.y + eyeY * distanceToWall;
        const wallType = map[Math.floor(hitPointY)][Math.floor(hitPointX)];

        if (wallType === 2) { // Originally the exit, now treated as a normal wall initially
             const wallFaceX = Math.abs(Math.floor(hitPointX + 0.5) - hitPointX);
            const wallFaceY = Math.abs(Math.floor(hitPointY + 0.5) - hitPointY);
            let shade = 0.7; // Default shade
            if (wallFaceX < 0.01 || wallFaceY < 0.01) { // Hit a horizontal or vertical face more directly
                shade = 0.9;
            }
            shade *= (1 - distanceToWall / 20); // Darker further away
            const r = Math.floor(currentPalette.wallBaseRGB[0] * shade);
            const g = Math.floor(currentPalette.wallBaseRGB[1] * shade);
            const b = Math.floor(currentPalette.wallBaseRGB[2] * shade);
            
            // Apply fog
            let fogAmount = Math.min(1, distanceToWall / fogEndDistance);
            let finalR = Math.floor(r * (1 - fogAmount) + currentPalette.fogRGB[0] * fogAmount);
            let finalG = Math.floor(g * (1 - fogAmount) + currentPalette.fogRGB[1] * fogAmount);
            let finalB = Math.floor(b * (1 - fogAmount) + currentPalette.fogRGB[2] * fogAmount);

            ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
            ctx.fillRect(i, wallTop, 1, wallHeight);

        } else if (wallType === 3) { // Open exit
            // Render as a doorway/gap
            const doorwayHeight = wallHeight * 0.7; // Make it 70% of full wall height
            const doorwayTop = canvas.height / 2 - doorwayHeight / 2; // Center the doorway vertically
            const doorwayBottom = canvas.height / 2 + doorwayHeight / 2;

            ctx.fillStyle = '#000000'; // Black for the gap
            // Draw the top part of the doorway (if any)
            // ctx.fillRect(i, wallTop, 1, doorwayTop - wallTop); // This would draw a top beam
            // Draw the bottom part of the doorway (if any)
            // ctx.fillRect(i, doorwayBottom, 1, wallTop + wallHeight - doorwayBottom); // This would draw a bottom beam

            // For a simple "gap" effect, just draw a black rectangle that is shorter
            ctx.fillRect(i, doorwayTop, 1, doorwayHeight);
            // console.log("Rendering Open Exit doorway at distance:", distanceToWall); // Debugging open exit rendering - removed to reduce log spam
        }
        else { // Regular wall
            // Determine if the wall hit is horizontal or vertical for shading
            // This is a simplified way to get a basic shading effect
            const wallFaceX = Math.abs(Math.floor(hitPointX + 0.5) - hitPointX);
            const wallFaceY = Math.abs(Math.floor(hitPointY + 0.5) - hitPointY);

            let shade = 0.7; // Default shade
            if (wallFaceX < 0.01 || wallFaceY < 0.01) { // Hit a horizontal or vertical face more directly
                shade = 0.9;
            }

            // Apply shading based on distance
            shade *= (1 - distanceToWall / 20); // Darker further away

            const r = Math.floor(currentPalette.wallBaseRGB[0] * shade);
            const g = Math.floor(currentPalette.wallBaseRGB[1] * shade);
            const b = Math.floor(currentPalette.wallBaseRGB[2] * shade);

            // Apply fog
            let fogAmount = Math.min(1, distanceToWall / fogEndDistance);
            let finalR = Math.floor(r * (1 - fogAmount) + currentPalette.fogRGB[0] * fogAmount);
            let finalG = Math.floor(g * (1 - fogAmount) + currentPalette.fogRGB[1] * fogAmount);
            let finalB = Math.floor(b * (1 - fogAmount) + currentPalette.fogRGB[2] * fogAmount);
            
            if (hitBoundary) {
                // Re-apply darkening for boundaries after fog blending
                finalR = Math.floor(finalR * 0.7);
                finalG = Math.floor(finalG * 0.7);
                finalB = Math.floor(finalB * 0.7);
            }

            ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
            ctx.fillRect(i, wallTop, 1, wallHeight);
        }
        zBuffer[i] = distanceToWall; // Store distance in Z-buffer
    }
    
    // Render AI Characters
    // Sort AI characters by distance from player (farthest first) for correct rendering order
    const sortedAI = [...aiCharacters].sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2));
        const distB = Math.sqrt(Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2));
        return distB - distA;
    });

    sortedAI.forEach(ai => {
        const dx = ai.x - player.x;
        const dy = ai.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy); // Changed to 'let'
        let angle = Math.atan2(dy, dx) - player.angle;

        // Normalize angle
        if (angle < -Math.PI) angle += 2 * Math.PI;
        if (angle > Math.PI) angle -= 2 * Math.PI;

        // Only render if in front of player and within FOV
        let inFOV = angle > -player.fov / 2 && angle < player.fov / 2;
        console.log(`AI ${aiCharacters.indexOf(ai)} FOV check: angle=${angle.toFixed(2)}, inFOV=${inFOV}`);

        if (inFOV) {
            // We still need to ensure dist is not zero to avoid division by zero.
            if (dist < 0.001) { // If extremely close, set a minimal distance to avoid division by zero
                dist = 0.001;
            }
            // Correct AI distance for fish-eye effect, similar to walls
            const ca = angle; // This 'angle' is already relative to player's view
            dist *= Math.cos(ca); // Apply correction

            const screenX = canvas.width / 2 + angle * (canvas.width / player.fov); // Use canvas.width
            const spriteHeight = canvas.height / dist; // Use canvas.height
            const spriteWidth = spriteHeight * (ai.frontTexture.width / ai.frontTexture.height); // Use frontTexture for aspect ratio
            const spriteY = canvas.height / 2 - spriteHeight / 2 + spriteHeight * 0.3; // Use canvas.height, Adjusted vertical position

            // Determine which texture to draw (front or back)
            const aiForwardX = Math.cos(ai.angle);
            const aiForwardY = Math.sin(ai.angle);
            const aiToPlayerX = player.x - ai.x;
            const aiToPlayerY = player.y - ai.y;

            // Normalize AI to Player vector
            const aiToPlayerDist = Math.sqrt(aiToPlayerX * aiToPlayerX + aiToPlayerY * aiToPlayerY);
            const aiToPlayerNormalizedX = aiToPlayerX / aiToPlayerDist;
            const aiToPlayerNormalizedY = aiToPlayerY / aiToPlayerDist;

            const dotProduct = aiForwardX * aiToPlayerNormalizedX + aiForwardY * aiToPlayerNormalizedY;

            let textureToDraw = ai.frontTexture;
            // If dot product is significantly negative, player is clearly behind the AI's movement direction
            if (dotProduct < -0.7) { // Adjust threshold for "clearly moving away"
                textureToDraw = ai.backTexture;
            }

            // Reduce distance for Z-buffer comparison to ensure drawing in front of walls
            const adjustedDist = dist; // Adjusted epsilon removed, use actual corrected distance
            const drawStartX = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const drawEndX = Math.min(canvas.width, Math.ceil(screenX + spriteWidth / 2));

            console.log(`AI ${aiCharacters.indexOf(ai)} rendering range: x=${drawStartX} to ${drawEndX}. Player pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}), AI pos: (${ai.x.toFixed(2)}, ${ai.y.toFixed(2)})`);

            for (let x = drawStartX; x < drawEndX; x++) {
                console.log(`AI ${aiCharacters.indexOf(ai)} Z-Buffer check at x=${x}: adjustedDist=${adjustedDist.toFixed(2)}, zBuffer[${x}]=${zBuffer[x].toFixed(2)}, condition=${adjustedDist < zBuffer[x]}`);

                if (adjustedDist < zBuffer[x]) {
                    const textureX = Math.floor(((x - (screenX - spriteWidth / 2)) / spriteWidth) * textureToDraw.width);
                    ctx.drawImage(textureToDraw, textureX, 0, 1, textureToDraw.height, x, spriteY, 1, spriteHeight);
                } else {
                    console.warn(`AI NOT RENDERING (AI ${aiCharacters.indexOf(ai)}): x=${x}, dist=${dist.toFixed(2)}, adjustedDist=${adjustedDist.toFixed(2)}, zBuffer[${x}]=${zBuffer[x].toFixed(2)}. AI pos: (${ai.x.toFixed(2)}, ${ai.y.toFixed(2)}), Player pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);
                }
            }
        }
    });
    
    // Render Switches
    switches.forEach(s => {
        // Switches are now placed in path cells, so no need for faceDir offset
        let switchRenderX = s.x;
        let switchRenderY = s.y;

        // Store renderX and renderY for player interaction
        s.renderX = switchRenderX;
        s.renderY = switchRenderY;

        const dx = switchRenderX - player.x;
        const dy = switchRenderY - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - player.angle;

        // Normalize angle
        if (angle < -Math.PI) angle += 2 * Math.PI;
        if (angle > Math.PI) angle -= 2 * Math.PI;

        // Only render if in front of player and within FOV
        let inFOV = angle > -player.fov / 2 && angle < player.fov / 2;
        console.log(`Switch FOV check: dist=${dist.toFixed(2)}, angle=${angle.toFixed(2)}, isOn=${s.isOn}, inFOV=${inFOV}`);

        if (inFOV) {
            // We still need to ensure dist is not zero to avoid division by zero.
            if (dist < 0.001) { // If extremely close, set a minimal distance to avoid division by zero
                dist = 0.001;
            }
            // Reduce distance for Z-buffer comparison to ensure drawing in front of walls
            const adjustedDist = dist; // Adjusted epsilon for switches
            // Define drawStartX and drawEndX within the Switch rendering loop
            const screenX = canvas.width / 2 + angle * (canvas.width / player.fov);
            const spriteHeight = canvas.height / dist;
            const spriteWidth = spriteHeight * 0.1; // Switches are thin and rod-like
            const spriteY = canvas.height / 2 - spriteHeight / 2;

            const drawStartX = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const drawEndX = Math.min(canvas.width, Math.ceil(screenX + spriteWidth / 2));

            console.log(`Switch rendering range: x=${drawStartX} to ${drawEndX}. Switch pos: (${s.x.toFixed(2)}, ${s.y.toFixed(2)}), Player pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);

            for (let x = drawStartX; x < drawEndX; x++) {
                console.log(`Switch Z-Buffer check at x=${x}: adjustedDist=${adjustedDist.toFixed(2)}, zBuffer[${x}]=${zBuffer[x].toFixed(2)}, condition=${adjustedDist < zBuffer[x]}`);

                if (adjustedDist < zBuffer[x]) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, spriteY, 1, spriteHeight);
                    const innerRectHeight = spriteHeight * 0.3;
                    const innerRectY = spriteY + (spriteHeight - innerRectHeight) / 2;
                    ctx.fillStyle = s.isOn ? 'red' : 'black';
                    ctx.fillRect(x, innerRectY, 1, innerRectHeight);
                } else {
                    console.warn(`Switch NOT RENDERING: x=${x}, dist=${dist.toFixed(2)}, adjustedDist=${adjustedDist.toFixed(2)}, zBuffer[${x}]=${zBuffer[x].toFixed(2)} Switch pos: (${s.x.toFixed(2)}, ${s.y.toFixed(2)}), Player pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);
                }
            }
        }
    });
    
        drawMiniMap();
    } // Closing brace for if (gameState === 'playing')
    else if (gameState === 'gameOver') {
        ctx.fillStyle = "rgba(255, 0, 0, 0.7)"; // Red overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("ゲームオーバー", canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "30px Arial";
        ctx.fillText("門番に捕まりました", canvas.width / 2, canvas.height / 2 + 10);
    } else if (gameState === 'gameComplete') {
        ctx.fillStyle = "rgba(0, 255, 0, 0.7)"; // Green overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("ゲームクリア！", canvas.width / 2, canvas.height / 2);
        ctx.font = "30px Arial";
        ctx.fillText("迷路を脱出しました！", canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText("NEXT AREA", canvas.width / 2, canvas.height / 2 + 120);
    }
} // This closing brace closes the render function.

// Function to initialize or reset the game state
function initializeGame() {
    // console.log("Initializing game..."); // Debugging line
    
    // Set canvas dimensions dynamically
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Explicitly re-initialize global game objects
    entrance = {};
    exit = {};
    switches = [];
    aiCharacters = [];

    // 1. Generate Maze and ensure enough dead ends
    let deadEnds;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    do {
        map = generateMaze(mapWidth, mapHeight);
        deadEnds = findDeadEnds(map);
        attempts++;
        console.log(`Maze generation attempt ${attempts}: deadEnds.length = ${deadEnds.length}`);
        if (attempts >= maxAttempts) {
            console.error("Failed to generate maze with enough dead ends after multiple attempts. Using current maze.");
            break; // Use the last generated maze, even if it doesn't meet criteria
        }
    } while (deadEnds.length < 4);
    console.log("Final maze generation attempts:", attempts, "Final deadEnds count:", deadEnds.length);
    // console.log("Generated Map:", map); // Debugging line
    // console.log("Map[1]:", map[1]); // Debugging line for specific error

    // console.log("Dead Ends:", deadEnds); // Debugging line

    // Ensure there are enough dead ends for entrance, exit, and AIs (after loop)
    if (deadEnds.length < 4) {
        console.warn("Warning: Maze generated with fewer than 4 dead ends. Game might not place all elements correctly.");
        // This case should ideally be handled by the loop, but as a safeguard.
    }

    // Randomly select entrance, exit, and AI start positions from dead ends
    const shuffledDeadEnds = deadEnds.sort(() => Math.random() - 0.5);

    entrance = shuffledDeadEnds.pop();
    player.x = entrance.x + 0.5;
    player.y = entrance.y + 0.5;
    // console.log("Entrance position:", entrance);

    // Determine player's initial angle based on the open path from the dead-end entrance
    const directions = [
        { dx: 0, dy: 1, angle: Math.PI / 2 },   // South
        { dx: 0, dy: -1, angle: 3 * Math.PI / 2 }, // North
        { dx: 1, dy: 0, angle: 0 },         // East
        { dx: -1, dy: 0, angle: Math.PI }      // West
    ];

    for (const dir of directions) {
        const nextX = entrance.x + dir.dx;
        const nextY = entrance.y + dir.dy;
        if (nextX >= 0 && nextX < mapWidth && nextY >= 0 && nextY < mapHeight && map[nextY][nextX] === 0) {
            player.angle = dir.angle;
            // console.log("Player initial angle set to:", dir.angle, " (facing", dir, ")");
            break;
        }
    }

    exit = shuffledDeadEnds.pop();
    // map[exit.y][exit.x] = 2; // Removed: exit should be a normal wall initially
    // console.log("Exit position (as normal wall initially):", exit);

    // Place 3 switches on random path cells
    const numSwitches = 3;
    for (let i = 0; i < numSwitches; i++) {
        let placed = false;
        while (!placed) {
            const randX = Math.floor(Math.random() * mapWidth);
            const randY = Math.floor(Math.random() * mapHeight);

            // Check if it's a path cell, not the entrance, exit, or an AI start position
            // Also ensure it's an accessible path cell (not a dead-end corner)
            if (map[randY][randX] === 0 &&
                !(randX === entrance.x && randY === entrance.y) &&
                !(randX === exit.x && randY === exit.y) &&
                !(randX === Math.floor(initialAi1X) && randY === Math.floor(initialAi1Y)) &&
                !(randX === Math.floor(initialAi2X) && randY === Math.floor(initialAi2Y)) &&
                isAccessiblePath(randX, randY)) {
                
                switches.push({
                    x: randX + 0.5, y: randY + 0.5, // Center of the path cell
                    isOn: false,
                    renderX: 0, renderY: 0 // Will be calculated in render()
                });
                // console.log("Switch added:", switches[switches.length - 1]);
                placed = true;
            }
        }
    }

    // Initialize AI characters
    const aiStart1 = shuffledDeadEnds.pop();
    initialAi1X = aiStart1.x + 0.5;
    initialAi1Y = aiStart1.y + 0.5;

    aiCharacters.push({
        x: initialAi1X, y: initialAi1Y, angle: Math.random() * Math.PI * 2, speed: 0.015, // Reduced speed
        frontTexture: new Image(), backTexture: new Image(), path: [], targetX: null, targetY: null
    });
    // console.log("AI 1 added:", aiCharacters[0]);

    const aiStart2 = shuffledDeadEnds.pop();
    initialAi2X = aiStart2.x + 0.5;
    initialAi2Y = aiStart2.y + 0.5;

    aiCharacters.push({
        x: initialAi2X, y: initialAi2Y, angle: Math.random() * Math.PI * 2, speed: 0.015, // Reduced speed
        frontTexture: new Image(), backTexture: new Image(), path: [], targetX: null, targetY: null,
        wanderMode: false, wanderPathLength: 0, wanderTarget: null
    });
    // console.log("AI 2 added:", aiCharacters[1]);


    // Select current palette
    const currentPalette = colorPalettes[currentStage % colorPalettes.length];

    let imagesToLoad = 0;
    const imagePaths = ['ai01.png', 'ai02.png']; // Only AI images now

    // Load unique images once
    const loadedImages = {}; // Store loaded images to reuse
    imagePaths.forEach(path => {
        if (!loadedImages[path]) {
            imagesToLoad++;
            const img = new Image();
            img.onload = () => {
                imagesToLoad--;
                if (imagesToLoad === 0) {
                    gameRunning = true;
                    gameLoop();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${path}`);
                imagesToLoad--; // Still decrement to avoid blocking game start
                if (imagesToLoad === 0) {
                    gameRunning = true;
                    gameLoop();
                }
            };
            img.src = path;
            loadedImages[path] = img;
        }
    });

    // Assign loaded images to AI characters
    aiCharacters[0].frontTexture = loadedImages['ai01.png'];
    aiCharacters[0].backTexture = loadedImages['ai02.png']; // Assuming ai02.png is still the back texture
    aiCharacters[1].frontTexture = loadedImages['ai01.png'];
    aiCharacters[1].backTexture = loadedImages['ai02.png']; // Assuming ai02.png is still the back texture

    // If no images to load (e.g., paths array is empty), start game immediately
    if (imagesToLoad === 0) {
        gameRunning = true;
        gameLoop();
    }

    // Initialize BGM
    if (!bgmAudio) { // Only create audio object once
        bgmAudio = new Audio('bgm.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.5; // Set a default volume
    }

}

function gameLoop() {
    handleInput(); // Process input even if game is not running (for restart)
    if (!gameRunning) return;
    updateAI(); // Call updateAI here
    render();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function restartCurrentGame() {
    // Reset player position to entrance
    player.x = entrance.x + 0.5;
    player.y = entrance.y + 0.5;

    // Reset player angle (re-use the logic from initializeGame)
    const directions = [
        { dx: 0, dy: 1, angle: Math.PI / 2 },   // South
        { dx: 0, dy: -1, angle: 3 * Math.PI / 2 }, // North
        { dx: 1, dy: 0, angle: 0 },         // East
        { dx: -1, dy: 0, angle: Math.PI }      // West
    ];
    for (const dir of directions) {
        const nextX = entrance.x + dir.dx;
        const nextY = entrance.y + dir.dy;
        if (nextX >= 0 && nextX < mapWidth && nextY >= 0 && nextY < mapHeight && map[nextY][nextX] === 0) {
            player.angle = dir.angle;
            break;
        }
    }

    // Reset switches
    switches.forEach(s => s.isOn = false);
    // Ensure exit is closed again
    map[Math.floor(exit.y)][Math.floor(exit.x)] = 2; // Set back to wall type 2

    // Reset AI characters to their initial positions
    aiCharacters[0].x = initialAi1X;
    aiCharacters[0].y = initialAi1Y;
    aiCharacters[1].x = initialAi2X;
    aiCharacters[1].y = initialAi2Y;

    // Reset AI paths and targets
    aiCharacters.forEach(ai => {
        ai.path = [];
        ai.targetX = null;
        ai.targetY = null;
        ai.wanderMode = false;
        ai.wanderPathLength = 0;
        ai.wanderTarget = null;
        ai.angle = Math.random() * Math.PI * 2; // Random initial angle
    });

    gameState = 'playing';
    gameRunning = true;
    gameLoop(); // Restart the game loop
}

// Function to toggle BGM playback
function toggleBGM() {
    if (bgmAudio.paused) {
        bgmAudio.play().catch(e => console.error("BGM playback failed:", e));
        bgmToggleBtn.textContent = 'BGM OFF';
    } else {
        bgmAudio.pause();
        bgmToggleBtn.textContent = 'BGM ON';
    }
}


// --- Mobile Controls Handling ---
// These are declared globally, but their event listeners are set up in setupMobileControls()
const leftBtn = document.getElementById('left-btn');
const backwardBtn = document.getElementById('backward-btn');
const forwardBtn = document.getElementById('forward-btn');
const rightBtn = document.getElementById('right-btn');
let restartBtn; // Declare globally, assign in DOMContentLoaded
let showMapBtn; // Declare globally, assign in DOMContentLoaded
let bgmAudio; // Declare globally for BGM
let bgmToggleBtn; // Declare globally for BGM toggle button

function setupMobileControls() {
    const buttonMap = {
        'left-btn': 'KeyA', // or 'ArrowLeft'
        'backward-btn': 'KeyS', // or 'ArrowDown'
        'forward-btn': 'KeyW', // or 'ArrowUp'
        'right-btn': 'KeyD' // or 'ArrowRight'
    };

    for (const btnId in buttonMap) {
        const btn = document.getElementById(btnId);
        const keyCode = buttonMap[btnId];

        if (btn) { // Check if button exists before adding event listeners
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling/zooming
                keys[keyCode] = true;
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys[keyCode] = false;
            });
            // Also add mouse events for desktop testing
            btn.addEventListener('mousedown', () => { keys[keyCode] = true; });
            btn.addEventListener('mouseup', () => { keys[keyCode] = false; });
            btn.addEventListener('mouseleave', () => { keys[keyCode] = false; }); // Release key if mouse leaves button
        }
    }

    // Add event listener for the restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameState === 'gameOver') {
                restartCurrentGame();
            }
        });
    }
}

// Call to set up controls
document.addEventListener('DOMContentLoaded', (event) => {
    // Initial game setup
    // console.log("Calling initializeGame()..."); // New debugging line
    initializeGame();
    
    restartBtn = document.getElementById('restart-btn'); // Assign globally declared restartBtn
    showMapBtn = document.getElementById('show-map-btn'); // Assign globally declared showMapBtn
    bgmToggleBtn = document.getElementById('bgm-toggle-btn'); // Assign globally declared bgmToggleBtn
    console.log("restartBtn element (inside DOMContentLoaded):", restartBtn); // Debugging

    setupMobileControls(); // Call setupMobileControls here

    // Add event listener for canvas to toggle minimap visibility
    canvas.addEventListener('click', () => {
        if (gameState === 'playing') { // Only toggle if game is playing
            isMapVisible = !isMapVisible;
        }
    });

    // Add event listener for showMapBtn
    if (showMapBtn) {
        showMapBtn.addEventListener('click', () => {
            isMapVisible = true; // Show map when button is clicked
        });
    }

    // Add event listener for bgmToggleBtn
    if (bgmToggleBtn) {
        bgmToggleBtn.addEventListener('click', toggleBGM);
    }

    // Add dedicated listener for 'R' key restart
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR' && gameState === 'gameOver') {
            console.log("R key pressed, restarting game."); // Debugging
            restartCurrentGame();
        }
    });
});
