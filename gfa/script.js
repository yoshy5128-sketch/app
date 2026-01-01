const PLAYER_INITIAL_POSITION = new THREE.Vector3(0, 2.0, -20);
let gameSettings = {
    playerHP: 3,
    aiHP: 3,
    projectileSpeedMultiplier: 1.5,
    mgCount: 1,
    rrCount: 1,
    srCount: 1,
    sgCount: 1,
    medikitCount: 0,
    fieldState: 'reset',
    mapType: 'default',
    aiCount: 2,
    autoAim: false,
    nightModeEnabled: false,
    nightModeLightIntensity: 0.8,
    customMapName: 'Default Custom Map',
    gameMode: 'battle',
    buttonPositions: {
        fire: { right: '20px', bottom: '120px' },
        crouch: { right: '20px', bottom: '55px' },
        joystick: { left: '10%', bottom: '10%' }
    }
};
let originalSettings = {};
let isPaused = false;

(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const editorLink = document.getElementById('map-editor-link');
        if (editorLink && 'ontouchstart' in window) {
            editorLink.href = 'map_editor_sp.html';
        }
        loadSettings();
        updateCustomMapSelector();
        const playerHpSelect = document.getElementById('player-hp');
        const aiHpSelect = document.getElementById('ai-hp');
        const mgCountSelect = document.getElementById('mg-count');
        const rrCountSelect = document.getElementById('rr-count');
        const srCountSelect = document.getElementById('sr-count');
        const sgCountSelect = document.getElementById('sg-count');
        const aiCountRadios = document.querySelectorAll('input[name="ai-count"]');
        const fieldStateRadios = document.querySelectorAll('input[name="field-state"]');
        const mapTypeRadios = document.querySelectorAll('input[name="map-type"]');
        const autoAimRadios = document.querySelectorAll('input[name="auto-aim"]');
        const nightModeRadios = document.querySelectorAll('input[name="night-mode"]');
        const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
        if (playerHpSelect) playerHpSelect.addEventListener('change', () => { gameSettings.playerHP = playerHpSelect.value; saveSettings(); });
        if (aiHpSelect) aiHpSelect.addEventListener('change', () => { gameSettings.aiHP = aiHpSelect.value; saveSettings(); });
        const projectileSpeedSlider = document.getElementById('projectile-speed');
        const projectileSpeedValueSpan = document.getElementById('projectile-speed-value');
        if (projectileSpeedSlider) {
            projectileSpeedSlider.addEventListener('input', () => {
                gameSettings.projectileSpeedMultiplier = parseFloat(projectileSpeedSlider.value);
                if (projectileSpeedValueSpan) {
                    projectileSpeedValueSpan.textContent = gameSettings.projectileSpeedMultiplier + 'x';
                }
                saveSettings();
            });
        }
        if (mgCountSelect) mgCountSelect.addEventListener('change', () => { gameSettings.mgCount = parseInt(mgCountSelect.value, 10); saveSettings(); });
        if (rrCountSelect) rrCountSelect.addEventListener('change', () => { gameSettings.rrCount = parseInt(rrCountSelect.value, 10); saveSettings(); });
        if (srCountSelect) srCountSelect.addEventListener('change', () => { gameSettings.srCount = parseInt(srCountSelect.value, 10); saveSettings(); });
        if (sgCountSelect) sgCountSelect.addEventListener('change', () => { gameSettings.sgCount = parseInt(sgCountSelect.value, 10); saveSettings(); });
        const medikitCountSelect = document.getElementById('medikit-count');
        if (medikitCountSelect) medikitCountSelect.addEventListener('change', () => {
            gameSettings.medikitCount = parseInt(medikitCountSelect.value, 10);
            saveSettings();
        });
        aiCountRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.aiCount = parseInt(radio.value, 10);
                    saveSettings();
                }
            });
        });
        fieldStateRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.fieldState = radio.value;
                    saveSettings();
                }
            });
        });
        mapTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.mapType = radio.value;
                    saveSettings();
                }
            });
        });
        autoAimRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.autoAim = radio.value === 'true';
                    saveSettings();
                }
            });
        });
        nightModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.nightModeEnabled = radio.value === 'true';
                    saveSettings();
                }
            });
        });
        gameModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.gameMode = radio.value;
                    saveSettings();
                }
            });
        });
        const nightModeIntensitySlider = document.getElementById('night-mode-intensity');
        const nightModeIntensityValueSpan = document.getElementById('night-mode-intensity-value');
        if (nightModeIntensitySlider) {
            nightModeIntensitySlider.addEventListener('input', () => {
                gameSettings.nightModeLightIntensity = parseFloat(nightModeIntensitySlider.value);
                if (nightModeIntensityValueSpan) {
                    nightModeIntensityValueSpan.textContent = gameSettings.nightModeLightIntensity;
                }
                saveSettings();
            });
        }
        const customMapSelector = document.getElementById('custom-map-selector');
        if (customMapSelector) {
            customMapSelector.addEventListener('change', () => {
                gameSettings.customMapName = customMapSelector.value;
                saveSettings();
            });
        }
        const loadSelectedCustomMapBtn = document.getElementById('load-selected-custom-map-btn');
        if (loadSelectedCustomMapBtn) {
            loadSelectedCustomMapBtn.addEventListener('click', () => {
                gameSettings.mapType = 'custom';
                saveSettings();
                startGame();
                restartGame();
            });
        }
    });
})();

function updateCustomMapSelector() {
    const customMapSelector = document.getElementById('custom-map-selector');
    if (!customMapSelector) return;
    customMapSelector.innerHTML = '';
    const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
    const mapNames = Object.keys(allCustomMaps);
    if (mapNames.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No custom maps available';
        option.disabled = true;
        customMapSelector.appendChild(option);
        if (document.getElementById('load-selected-custom-map-btn')) {
            document.getElementById('load-selected-custom-map-btn').disabled = true;
        }
    } else {
        mapNames.forEach(mapName => {
            const option = document.createElement('option');
            option.value = mapName;
            option.textContent = mapName;
            customMapSelector.appendChild(option);
        });
        customMapSelector.value = gameSettings.customMapName || mapNames[0];
        if (document.getElementById('load-selected-custom-map-btn')) {
            document.getElementById('load-selected-custom-map-btn').disabled = false;
        }
    }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111122);
document.body.appendChild(renderer.domElement);
const ambientLight = new THREE.AmbientLight(0xffffff, 0);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);
const clock = new THREE.Clock();
const player = new THREE.Object3D();
player.add(camera);
scene.add(player);
player.position.copy(PLAYER_INITIAL_POSITION);
player.rotation.y = Math.PI;
camera.position.set(0, 0, 0);
let isGameRunning = false;
let playerTargetHeight = 2.0;
let isCrouchingToggle = false;
const GRAVITY = 9.8;
let playerHP = 3;
let screenShakeDuration = 0;
const SHAKE_DURATION_MAX = 0.4;
const SHAKE_INTENSITY = 0.2;
let isAIDeathPlaying = false;
const cinematicCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const aiDeathFocusObject = new THREE.Object3D();
scene.add(aiDeathFocusObject);
const BODY_HEIGHT = 2;
const HEAD_RADIUS = 0.5;
const WEAPON_PISTOL = 'pistol';
const WEAPON_MG = 'machinegun';
const WEAPON_RR = 'rocketlauncher';
const WEAPON_SR = 'sniperrifle';
const WEAPON_SG = 'shotgun';
let currentWeapon = WEAPON_PISTOL;
let ammoMG = 0;
let ammoRR = 0;
let ammoSR = 0;
let ammoSG = 0;
const MAX_AMMO_MG = 50;
const MAX_AMMO_RR = 3;
const MAX_AMMO_SR = 5;
const MAX_AMMO_SG = 10;
const FIRE_RATE_PISTOL = 0.3;
const FIRE_RATE_MG = 0.1;
const FIRE_RATE_RR = 1.5;
const FIRE_RATE_SR = 2.0;
const FIRE_RATE_SG = 0.8;
const SHOTGUN_PELLET_COUNT = 7;
const SHOTGUN_SPREAD_ANGLE = Math.PI / 16;
const SHOTGUN_RANGE = 15;
const SHOTGUN_PELLET_DAMAGE = 2;
const WEAPON_SG_SOUND = 'sgun.mp3';
const AI_WEAPON_SG_SOUND = 'aisgun.mp3';
let lastFireTime = -FIRE_RATE_PISTOL;
let isMouseButtonDown = false;
let isScoping = false;
let isElevating = false;
let elevatingTargetY = 0;
let elevatingTargetObstacle = null;
let currentGroundObstacle = null;
let isIgnoringTowerCollision = false;
let ignoreTowerTimer = 0;
let lastClimbedTower = null;
const AUTO_AIM_RANGE = 50;
const AUTO_AIM_ANGLE = Math.PI / 8;
const AUTO_AIM_STRENGTH = 0.3;
let font;
const fontLoader = new THREE.FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
    createWeaponPickups();
}, undefined, function (error) {
    console.error('Error loading font:', error);
    font = null;
    createWeaponPickups();
});

function saveSettings() {
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        const parsedSavedSettings = JSON.parse(savedSettings);
        if (parsedSavedSettings.gameMode === undefined) {
            parsedSavedSettings.gameMode = 'battle';
        }
        if (parsedSavedSettings.nightModeLightIntensity === undefined) {
            parsedSavedSettings.nightModeLightIntensity = 0.8;
        }
        if (parsedSavedSettings.medikitCount === undefined) {
            parsedSavedSettings.medikitCount = 0;
        }
        // Add default for buttonPositions if it doesn't exist
        if (parsedSavedSettings.buttonPositions === undefined) {
            parsedSavedSettings.buttonPositions = {
                fire: { right: '20px', bottom: '120px' },
                crouch: { right: '20px', bottom: '55px' },
                joystick: { left: '10%', bottom: '10%' }
            };
        } else if (parsedSavedSettings.buttonPositions.joystick === undefined) {
            parsedSavedSettings.buttonPositions.joystick = { left: '10%', bottom: '10%' };
        }

        Object.assign(gameSettings, parsedSavedSettings);

        document.getElementById('player-hp').value = gameSettings.playerHP;
        document.getElementById('ai-hp').value = gameSettings.aiHP;
        const projectileSpeedSlider = document.getElementById('projectile-speed');
        const projectileSpeedValueSpan = document.getElementById('projectile-speed-value');
        if (projectileSpeedSlider) {
            projectileSpeedSlider.value = gameSettings.projectileSpeedMultiplier;
        }
        if (projectileSpeedValueSpan) {
            projectileSpeedValueSpan.textContent = gameSettings.projectileSpeedMultiplier + 'x';
        }
        document.getElementById('mg-count').value = gameSettings.mgCount;
        document.getElementById('rr-count').value = gameSettings.rrCount;
        document.getElementById('sr-count').value = gameSettings.srCount;
        if (document.getElementById('sg-count')) document.getElementById('sg-count').value = gameSettings.sgCount;
        if (document.getElementById('medikit-count')) document.getElementById('medikit-count').value = gameSettings.medikitCount;
        document.querySelectorAll('input[name="ai-count"]').forEach(radio => {
            radio.checked = (radio.value === String(gameSettings.aiCount));
        });
        document.querySelectorAll('input[name="field-state"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.fieldState);
        });
        document.querySelectorAll('input[name="map-type"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.mapType);
        });
        document.querySelectorAll('input[name="auto-aim"]').forEach(radio => {
            radio.checked = (radio.value === String(gameSettings.autoAim));
        });
        document.querySelectorAll('input[name="night-mode"]').forEach(radio => {
            radio.checked = (radio.value === String(gameSettings.nightModeEnabled));
        });
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.gameMode);
        });
        const nightModeIntensitySlider = document.getElementById('night-mode-intensity');
        const nightModeIntensityValueSpan = document.getElementById('night-mode-intensity-value');
        if (nightModeIntensitySlider) {
            nightModeIntensitySlider.value = gameSettings.nightModeLightIntensity;
        }
        if (nightModeIntensityValueSpan) {
            nightModeIntensityValueSpan.textContent = gameSettings.nightModeLightIntensity;
        }

        // Apply button positions
        if (gameSettings.buttonPositions) {
            const fireButton = document.getElementById('fire-button');
            const crouchButton = document.getElementById('crouch-button');
            const joystickZone = document.getElementById('joystick-move');
            const previewFireButton = document.getElementById('preview-fire-button');
            const previewCrouchButton = document.getElementById('preview-crouch-button');
            const previewJoystickZone = document.getElementById('preview-joystick-zone');

            if (fireButton && gameSettings.buttonPositions.fire) {
                fireButton.style.right = gameSettings.buttonPositions.fire.right;
                fireButton.style.bottom = gameSettings.buttonPositions.fire.bottom;
                fireButton.style.left = '';
                fireButton.style.top = '';
            }
            if (crouchButton && gameSettings.buttonPositions.crouch) {
                crouchButton.style.right = gameSettings.buttonPositions.crouch.right;
                crouchButton.style.bottom = gameSettings.buttonPositions.crouch.bottom;
                crouchButton.style.left = '';
                crouchButton.style.top = '';
            }
            if (joystickZone && gameSettings.buttonPositions.joystick) {
                joystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                joystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                joystickZone.style.right = '';
                joystickZone.style.top = '';
            }

            if (previewFireButton && gameSettings.buttonPositions.fire) {
                previewFireButton.style.right = gameSettings.buttonPositions.fire.right;
                previewFireButton.style.bottom = gameSettings.buttonPositions.fire.bottom;
                previewFireButton.style.left = '';
                previewFireButton.style.top = '';
            }
            if (previewCrouchButton && gameSettings.buttonPositions.crouch) {
                previewCrouchButton.style.right = gameSettings.buttonPositions.crouch.right;
                previewCrouchButton.style.bottom = gameSettings.buttonPositions.crouch.bottom;
                previewCrouchButton.style.left = '';
                previewCrouchButton.style.top = '';
            }
            if (previewJoystickZone && gameSettings.buttonPositions.joystick) {
                previewJoystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                previewJoystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                previewJoystickZone.style.right = '';
                previewJoystickZone.style.top = '';
            }
        }
    }
}

const playerGunSound = document.getElementById('playerGunSound');
const mgGunSound = document.getElementById('mgGunSound');
const rrGunSound = document.getElementById('rrGunSound');
const srGunSound = document.getElementById('srGunSound');
const aimgGunSound = document.getElementById('aimgGunSound');
const aiGunSound = document.getElementById('aiGunSound');
const explosionSound = document.getElementById('explosionSound');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const aiSrGunSound = document.getElementById('aiSrGunSound');
const playerSgSound = document.getElementById('playerSgSound');
const aiSgSound = document.getElementById('aiSgSound');
const winScreen = document.getElementById('win-screen');
const playerHPDisplay = document.getElementById('player-hp-display');
const aiHPDisplay = document.getElementById('ai-hp-display');
const redFlashOverlay = document.getElementById('red-flash-overlay');
const scopeOverlay = document.getElementById('scope-overlay');
const cancelScopeButton = document.getElementById('cancel-scope-button');
const killCountDisplay = document.getElementById('kill-count-display');
let playerKills = 0;

function createMuzzleFlash(position, intensity, distance, duration = 150, lightColor = 0xffffff) {
    const flashLight = new THREE.PointLight(lightColor, intensity, distance);
    flashLight.position.copy(position);
    flashLight.position.y += 1.0;
    scene.add(flashLight);
    new TWEEN.Tween(flashLight)
        .to({ intensity: 0 }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(flashLight);
        })
        .start();
}

function createGroundFlash(position, color, radius = 1.0, duration = 150) {
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
        map: null,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending
    });
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    material.map = new THREE.CanvasTexture(canvas);
    material.needsUpdate = true;
    const groundFlash = new THREE.Mesh(geometry, material);
    groundFlash.position.copy(position);
    groundFlash.position.y = -FLOOR_HEIGHT + 0.01;
    groundFlash.rotation.x = -Math.PI / 2;
    scene.add(groundFlash);
    new TWEEN.Tween(material)
        .to({ opacity: 0 }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(groundFlash);
            groundFlash.geometry.dispose();
            groundFlash.material.dispose();
            material.map.dispose();
        })
        .start();
}

const ARENA_RADIUS = 60;
const ARENA_EDGE_THICKNESS = 1;
const FLOOR_HEIGHT = ARENA_EDGE_THICKNESS / 2;
const ARENA_PLAY_AREA_RADIUS = ARENA_RADIUS - ARENA_EDGE_THICKNESS - 0.5;
const floorGeometry = new THREE.CircleGeometry(ARENA_RADIUS, 64);
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -FLOOR_HEIGHT;
scene.add(floor);
const edgeGeometry = new THREE.TorusGeometry(ARENA_RADIUS, ARENA_EDGE_THICKNESS, 8, 64);
const edgeMaterial = new THREE.MeshLambertMaterial({ color: 0x880000 });
const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
edge.rotation.x = Math.PI / 2;
edge.position.y = 0;
scene.add(edge);
const streetLights = [];

function createStreetLight(position) {
    const lightGroup = new THREE.Group();
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = (poleGeometry.parameters.height / 2) - FLOOR_HEIGHT;
    lightGroup.add(pole);
    const shadeGeometry = new THREE.CylinderGeometry(0, 1, 1, 8);
    const shadeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = pole.position.y + (poleGeometry.parameters.height / 2) + (shadeGeometry.parameters.height / 2);
    lightGroup.add(shade);
    const pointLight = new THREE.PointLight(0xffddaa, 0, 50, 2);
    pointLight.position.y = shade.position.y + (shadeGeometry.parameters.height / 2) - 0.5;
    lightGroup.add(pointLight);
    lightGroup.position.copy(position);
    scene.add(lightGroup);
    streetLights.push(lightGroup);
}

function createStreetLights() {
    if (streetLights.length > 0) {
        return;
    }
    const numLights = 8;
    const radius = ARENA_RADIUS - (ARENA_EDGE_THICKNESS / 2) + 0.5;
    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        createStreetLight(new THREE.Vector3(x, 0, z));
    }
}

const obstacles = [];
const HIDING_SPOTS = [];
const weaponPickups = [];
const ladderSwitches = [];
const respawningPickups = [];
const RESPAWN_DELAY = 60;
const AI_INITIAL_POSITION = new THREE.Vector3(0, 0, 20);
const NUM_RANDOM_OBSTACLES = 20;
const defaultObstaclesConfig = [
    { x: 5, z: 5, height: 1.8 }, { x: -5, z: -5 }, { x: 0, z: 10, height: 1.8 }, { x: 10, z: 0 }, { x: -10, z: 5 }, { x: 5, z: -10 },
    { x: 15, z: 15, height: 1.8 }, { x: -15, z: 15 }, { x: 15, z: -15, height: 1.8 }, { x: -15, z: -15 }, { x: 0, z: -18, height: 1.8 }, { x: -18, z: 0 },
    { x: 25, z: 0, width: 0.5, depth: 10 }, { x: -25, z: 0, width: 0.5, depth: 10 }, { x: 0, z: 25, width: 10, depth: 0.5 }, { x: 0, z: -25, width: 10, depth: 0.5 },
    { x: 20, z: 20, height: 1.8 }, { x: -20, z: 20 }, { x: 20, z: -20, height: 1.8 }, { x: -20, z: -20 },
    { x: 35, z: 10, width: 0.5, depth: 8 }, { x: -35, z: 10, width: 0.5, depth: 8 }, { x: 10, z: 35, width: 8, depth: 0.5 }, { x: -10, z: 35, width: 8, depth: 0.5 },
    { x: 30, z: -30, height: 1.8 }, { x: -30, z: -30 },
    { x: 40, z: 0, width: 0.5, depth: 15 }, { x: -40, z: 0, width: 0.5, depth: 15 }, { x: 0, z: 40, width: 15, depth: 0.5, height: 1.8 }, { x: 0, z: -40, width: 15, depth: 0.5 },
    { x: 0, z: -30, width: 2, height: 1.8, depth: 2 },
    { x: 10, z: -35, width: 2, height: 1.8, depth: 2 },
    { x: -10, z: -35, width: 2, height: 1.8, depth: 2 },
    { x: 20, z: -25, width: 3, height: 1.8, depth: 3 },
    { x: -20, z: -25, width: 3, height: 1.8, depth: 3 },
    { x: 30, z: -15, width: 2, height: 1.8, depth: 2 }
];

function getRandomSafePosition(itemWidth = 1, itemHeight = 1, itemDepth = 2) {
    const MAX_ATTEMPTS = 500;
    const MIN_DISTANCE_FROM_PLAYER = 15;
    const MIN_DISTANCE_BETWEEN_PICKUPS = 5;
    const PLACEMENT_PADDING = 2.5; // Padding from obstacles

    const WEAPON_PLACEMENT_RADIUS = ARENA_PLAY_AREA_RADIUS - Math.max(itemWidth, itemDepth) / 2;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * WEAPON_PLACEMENT_RADIUS;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const newPosition = new THREE.Vector3(x, (itemHeight / 2) - FLOOR_HEIGHT, z);

        if (newPosition.distanceTo(PLAYER_INITIAL_POSITION) < MIN_DISTANCE_FROM_PLAYER) {
            continue;
        }

        const itemBox = new THREE.Box3().setFromCenterAndSize(newPosition, new THREE.Vector3(itemWidth + PLACEMENT_PADDING, itemHeight, itemDepth + PLACEMENT_PADDING));
        
        let collisionDetected = false;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (itemBox.intersectsBox(obstacleBox)) {
                collisionDetected = true;
                break;
            }
        }
        if (collisionDetected) continue;

        for (const pickup of weaponPickups) {
            if (newPosition.distanceTo(pickup.position) < MIN_DISTANCE_BETWEEN_PICKUPS) {
                collisionDetected = true;
                break;
            }
        }
        if (collisionDetected) continue;
        
        return newPosition;
    }
    
    console.warn("getRandomSafePosition: Failed to find a safe position after all attempts, returning (0,0,0).");
    return new THREE.Vector3(0, 0, 0); // Fallback
}

function findSafePositionNear(centerPoint, searchRadius = 10, minDistance = 5, itemWidth = 1, itemHeight = 1, itemDepth = 2) {
    const MAX_ATTEMPTS = 100;
    const WEAPON_PLACEMENT_RADIUS = ARENA_PLAY_AREA_RADIUS - 2.0;
    const PLACEMENT_PADDING = 2.5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * searchRadius;
        const x = centerPoint.x + Math.cos(angle) * radius;
        const z = centerPoint.z + Math.sin(angle) * radius;
        const newPosition = new THREE.Vector3(x, (itemHeight / 2) - FLOOR_HEIGHT, z);

        if (newPosition.length() > WEAPON_PLACEMENT_RADIUS) {
            continue; // アリーナの外なら再試行
        }

        const itemBox = new THREE.Box3().setFromCenterAndSize(newPosition, new THREE.Vector3(itemWidth + PLACEMENT_PADDING, itemHeight, itemDepth + PLACEMENT_PADDING));
        
        let collisionDetected = false;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (itemBox.intersectsBox(obstacleBox)) {
                collisionDetected = true;
                break;
            }
        }
        if (collisionDetected) continue;

        for (const pickup of weaponPickups) {
            if (newPosition.distanceTo(pickup.position) < minDistance) {
                collisionDetected = true;
                break;
            }
        }
        if (collisionDetected) continue;

        return newPosition;
    }
    // フォールバック: 安全な位置が見つからない場合、とりあえずアリーナの中心を返す
    console.warn("findSafePositionNear: Failed to find a safe position, returning arena center.");
    return new THREE.Vector3(0, 0, 0);
}

function createWeaponPickup(text, position, weaponType) {
    console.log(`createWeaponPickup called for ${weaponType} at initial position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    const boxWidth = 1;
    const boxHeight = 0.8;
    const boxDepth = 2;
    
    if (!font) {
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const material = new THREE.MeshLambertMaterial({ color: 0x006400 });
        const box = new THREE.Mesh(geometry, material);
        box.position.copy(position);
        console.log(`createWeaponPickup (no font): Actual mesh position after adjustments: (${box.position.x.toFixed(2)}, ${box.position.y.toFixed(2)}, ${box.position.z.toFixed(2)})`);
        box.userData = { type: 'weaponPickup', weaponType: weaponType };
        scene.add(box);
        weaponPickups.push(box);
        return box;
    }
    const pickupGroup = new THREE.Group();
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x006400 });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    // boxMesh.position.y = boxHeight / 2; // This was causing the item to float
    pickupGroup.add(boxMesh);
    const textOptions = { font: font, size: 0.35, height: 0.2, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelOffset: 0, bevelSegments: 5 };
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const textGeometryLeft = new THREE.TextGeometry(text, textOptions);
    textGeometryLeft.computeBoundingBox();
    textGeometryLeft.translate(-0.5 * (textGeometryLeft.boundingBox.max.x - textGeometryLeft.boundingBox.min.x), -0.5 * (textGeometryLeft.boundingBox.max.y - textGeometryLeft.boundingBox.min.y), -0.5 * (textGeometryLeft.boundingBox.max.z - textGeometryLeft.boundingBox.min.z));
    const textMeshLeft = new THREE.Mesh(textGeometryLeft, textMaterial);
    // textMeshLeft.position.y = boxHeight / 2;
    textMeshLeft.position.x = -boxWidth / 2 + (textOptions.height / 2);
    textMeshLeft.rotation.y = -Math.PI / 2;
    pickupGroup.add(textMeshLeft);
    const textGeometryRight = new THREE.TextGeometry(text, textOptions);
    textGeometryRight.computeBoundingBox();
    textGeometryRight.translate(-0.5 * (textGeometryRight.boundingBox.max.x - textGeometryRight.boundingBox.min.x), -0.5 * (textGeometryRight.boundingBox.max.y - textGeometryRight.boundingBox.min.y), -0.5 * (textGeometryRight.boundingBox.max.z - textGeometryRight.boundingBox.min.z));
    const textMeshRight = new THREE.Mesh(textGeometryRight, textMaterial);
    // textMeshRight.position.y = boxHeight / 2;
    textMeshRight.position.x = boxWidth / 2 - (textOptions.height / 2);
    textMeshRight.rotation.y = Math.PI / 2;
    pickupGroup.add(textMeshRight);
    pickupGroup.position.copy(position);

    console.log(`createWeaponPickup (with font): Actual group position after adjustments: (${pickupGroup.position.x.toFixed(2)}, ${pickupGroup.position.y.toFixed(2)}, ${pickupGroup.position.z.toFixed(2)})`);
    pickupGroup.userData = { type: 'weaponPickup', weaponType: weaponType };
    scene.add(pickupGroup);
    weaponPickups.push(pickupGroup);
    return pickupGroup;
}

function createWeaponPickups(aiList = []) {
    const weaponTypes = [];
    for (let i = 0; i < gameSettings.mgCount; i++) weaponTypes.push({ name: 'MG', type: WEAPON_MG });
    for (let i = 0; i < gameSettings.rrCount; i++) weaponTypes.push({ name: 'RL', type: WEAPON_RR });
    for (let i = 0; i < gameSettings.srCount; i++) weaponTypes.push({ name: 'SR', type: WEAPON_SR });
    for (let i = 0; i < gameSettings.sgCount; i++) weaponTypes.push({ name: 'SG', type: WEAPON_SG });

    shuffle(weaponTypes);

    const availableAis = [...aiList];

    // Define weapon box size here, as it's constant for all weapon pickups
    const weaponBoxWidth = 1;
    const weaponBoxHeight = 0.8;
    const weaponBoxDepth = 2;

    for (let i = 0; i < weaponTypes.length; i++) {
        const weapon = weaponTypes[i];
        let position;

        if (availableAis.length > 0) {
            const aiIndex = Math.floor(Math.random() * availableAis.length);
            const targetAi = availableAis[aiIndex];
            
            position = findSafePositionNear(targetAi.position, 10, 5, weaponBoxWidth, weaponBoxHeight, weaponBoxDepth);

            availableAis.splice(aiIndex, 1);
        } else {
            position = getRandomSafePosition(weaponBoxWidth, weaponBoxHeight, weaponBoxDepth);
        }
        createWeaponPickup(weapon.name, position, weapon.type);
    }
}

const MEDIKIT_WIDTH = 0.5;
const MEDIKIT_HEIGHT = 0.8;
const MEDIKIT_DEPTH = 1;

function createMedikitPickup(position) {
    console.log(`createMedikitPickup called at initial position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    const medikitGroup = new THREE.Group();
    const boxGeometry = new THREE.BoxGeometry(MEDIKIT_WIDTH, MEDIKIT_HEIGHT, MEDIKIT_DEPTH);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    // boxMesh.position.y = MEDIKIT_HEIGHT / 2; // This was causing the item to float
    medikitGroup.add(boxMesh);
    const crossThickness = 0.25;
    const crossLength = MEDIKIT_HEIGHT * 0.8;
    const crossGroup = new THREE.Group();
    const verticalBarGeometry = new THREE.BoxGeometry(crossThickness, crossLength, crossThickness);
    const crossMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const verticalBar = new THREE.Mesh(verticalBarGeometry, crossMaterial);
    // verticalBar.position.y = 0;
    crossGroup.add(verticalBar);
    const horizontalBarGeometry = new THREE.BoxGeometry(crossLength, crossThickness, crossThickness);
    const horizontalBar = new THREE.Mesh(horizontalBarGeometry, crossMaterial);
    // horizontalBar.position.y = 0;
    crossGroup.add(horizontalBar);
    const crossGroup1 = crossGroup.clone();
    crossGroup1.position.set(MEDIKIT_WIDTH / 2 - crossThickness / 2, 0, 0); // Y-offset removed
    crossGroup1.rotation.y = Math.PI / 2;
    medikitGroup.add(crossGroup1);
    const crossGroup2 = crossGroup.clone();
    crossGroup2.position.set(-MEDIKIT_WIDTH / 2 + crossThickness / 2, 0, 0); // Y-offset removed
    crossGroup2.rotation.y = -Math.PI / 2;
    medikitGroup.add(crossGroup2);
    medikitGroup.position.copy(position);

    console.log(`createMedikitPickup: Actual group position after adjustments: (${medikitGroup.position.x.toFixed(2)}, ${medikitGroup.position.y.toFixed(2)}, ${medikitGroup.position.z.toFixed(2)})`);
    medikitGroup.userData = { type: 'medikitPickup' };
    scene.add(medikitGroup);
    weaponPickups.push(medikitGroup);
    return medikitGroup;
}

const DEFAULT_OBSTACLE_HEIGHT = BODY_HEIGHT + (2 * HEAD_RADIUS);

function createAndAttachLadder(obstacle, ladderFace = -1) {
    const LADDER_WIDTH = 1.5;
    const RUNG_SPACING = 0.5;
    const RUNG_THICKNESS = 0.1;
    const ladderGroup = new THREE.Group();
    ladderGroup.name = 'ladder';
    const obstacleSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(obstacle).getSize(obstacleSize);
    const numRungs = Math.floor(obstacleSize.y / RUNG_SPACING);
    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const rungMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const sideGeometry = new THREE.BoxGeometry(RUNG_THICKNESS * 2, obstacleSize.y, RUNG_THICKNESS * 2);
    const leftSide = new THREE.Mesh(sideGeometry, sideMaterial);
    const rightSide = new THREE.Mesh(sideGeometry, sideMaterial);
    leftSide.position.set(-LADDER_WIDTH / 2, 0, 0);
    rightSide.position.set(LADDER_WIDTH / 2, 0, 0);
    ladderGroup.add(leftSide);
    ladderGroup.add(rightSide);
    for (let i = 0; i < numRungs; i++) {
        const rungGeometry = new THREE.BoxGeometry(LADDER_WIDTH, RUNG_THICKNESS, RUNG_THICKNESS);
        const rung = new THREE.Mesh(rungGeometry, rungMaterial);
        rung.position.y = -obstacleSize.y / 2 + RUNG_SPACING * (i + 0.5);
        ladderGroup.add(rung);
    }
    const face = ladderFace === -1 ? Math.floor(Math.random() * 4) : ladderFace;
    const offset = 0.1;
    switch (face) {
        case 0: ladderGroup.position.set(0, 0, obstacleSize.z / 2 + offset); break;
        case 1: ladderGroup.position.set(0, 0, -obstacleSize.z / 2 - offset); break;
        case 2: ladderGroup.position.set(obstacleSize.x / 2 + offset, 0, 0); ladderGroup.rotation.y = Math.PI / 2; break;
        case 3: ladderGroup.position.set(-obstacleSize.x / 2 - offset, 0, 0); ladderGroup.rotation.y = -Math.PI / 2; break;
    }
    obstacle.add(ladderGroup);
    const sensorAreaDepth = 3;
    const sensorAreaWidth = 3;
    const sensorAreaHeight = 3;
    const sensorGeometry = new THREE.BoxGeometry(sensorAreaWidth, sensorAreaHeight, sensorAreaDepth);
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.3 });
    const sensorArea = new THREE.Mesh(sensorGeometry, sensorMaterial);
    sensorArea.name = 'ladderSensorArea';
    const offsetFromLadderWall = sensorAreaDepth / 2 - 0.5;
    sensorArea.rotation.y = ladderGroup.rotation.y;
    const ladderWorldPosition = new THREE.Vector3();
    ladderGroup.getWorldPosition(ladderWorldPosition);
    const obstacleWorldPosition = obstacle.position.clone();
    const directionFromObstacleCenterToLadder = ladderWorldPosition.clone().sub(obstacleWorldPosition);
    directionFromObstacleCenterToLadder.y = 0;
    directionFromObstacleCenterToLadder.normalize();
    sensorArea.position.copy(ladderWorldPosition.add(directionFromObstacleCenterToLadder.multiplyScalar(offsetFromLadderWall)));
    sensorArea.position.y = (sensorAreaHeight / 2) - FLOOR_HEIGHT;
    sensorArea.userData.obstacle = obstacle;
    sensorArea.userData.ladderPos = ladderWorldPosition;
    sensorArea.visible = false;
    scene.add(sensorArea);
    ladderSwitches.push(sensorArea);
    return face;
}

function addRooftopFeatures(obstacle, ladderFace) {
    if (!obstacle.userData.rooftopParts) {
        obstacle.userData.rooftopParts = [];
    }
    const buildingWidth = obstacle.geometry.parameters.width;
    const buildingHeight = obstacle.geometry.parameters.height;
    const buildingDepth = obstacle.geometry.parameters.depth;
    const rooftopY = obstacle.position.y + (buildingHeight / 2);
    const rooftopFloorGeometry = new THREE.BoxGeometry(buildingWidth, 0.1, buildingDepth);
    const rooftopFloorMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.0 });
    const rooftopFloor = new THREE.Mesh(rooftopFloorGeometry, rooftopFloorMaterial);
    rooftopFloor.position.set(obstacle.position.x, rooftopY, obstacle.position.z);
    rooftopFloor.userData.parentBuilding = obstacle;
    rooftopFloor.userData.isRooftop = true;
    scene.add(rooftopFloor);
    obstacles.push(rooftopFloor);
    obstacle.userData.rooftopParts.push(rooftopFloor);
    const wallHeight = 1.0;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x880000 });
    const wallDefs = [
        { face: 0, w: buildingWidth, h: wallHeight, d: wallThickness, ox: 0, oz: buildingDepth / 2 - wallThickness / 2 },
        { face: 1, w: buildingWidth, h: wallHeight, d: wallThickness, ox: 0, oz: -(buildingDepth / 2 - wallThickness / 2) },
        { face: 2, w: wallThickness, h: wallHeight, d: buildingDepth - wallThickness * 2, ox: buildingWidth / 2 - wallThickness / 2, oz: 0 },
        { face: 3, w: wallThickness, h: wallHeight, d: buildingDepth - wallThickness * 2, ox: -(buildingWidth / 2 - wallThickness / 2), oz: 0 }
    ];
    const LADDER_WIDTH = 1.5;
    const LADDER_GAP = LADDER_WIDTH + 1.0;
    for (const def of wallDefs) {
        if (def.face === ladderFace) {
            const wallLength = def.w > def.d ? def.w : def.d;
            const newWallLength = (wallLength - LADDER_GAP) / 2;
            if (newWallLength <= 0) continue;
            const wall1 = new THREE.Mesh(def.w > def.d ? new THREE.BoxGeometry(newWallLength, def.h, def.d) : new THREE.BoxGeometry(def.w, def.h, newWallLength), wallMaterial);
            const wall2 = wall1.clone();
            const offset = (wallLength / 2) - (newWallLength / 2);
            if (def.w > def.d) {
                wall1.position.set(obstacle.position.x + def.ox - offset, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
                wall2.position.set(obstacle.position.x + def.ox + offset, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
            } else {
                wall1.position.set(obstacle.position.x + def.ox, rooftopY + (def.h / 2), obstacle.position.z + def.oz - offset);
                wall2.position.set(obstacle.position.x + def.ox, rooftopY + (def.h / 2), obstacle.position.z + def.oz + offset);
            }
            wall1.userData.isWall = true;
            wall1.userData.parentBuildingRef = obstacle;
            scene.add(wall1);
            obstacles.push(wall1);
            obstacle.userData.rooftopParts.push(wall1);
            wall2.userData.isWall = true;
            wall2.userData.parentBuildingRef = obstacle;
            scene.add(wall2);
            obstacles.push(wall2);
            obstacle.userData.rooftopParts.push(wall2);
        } else {
            const wallGeometry = new THREE.BoxGeometry(def.w, def.h, def.d);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(obstacle.position.x + def.ox, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
            wall.userData.isWall = true;
            wall.userData.parentBuildingRef = obstacle;
            scene.add(wall);
            obstacles.push(wall);
            obstacle.userData.rooftopParts.push(wall);
        }
    }
}

function createObstacle(x, z, width = 2, height = DEFAULT_OBSTACLE_HEIGHT, depth = 2, color = 0xff0000, hp = 1) {
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: color });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(x, (height / 2) - FLOOR_HEIGHT, z);
    box.userData.hp = hp;
    scene.add(box);
    obstacles.push(box);
    let ladderFace = -1;
    if (height > 6) {
        ladderFace = createAndAttachLadder(box);
    }
    if (height >= 8) {
        createWindows(box, width, height, depth);
        addRooftopFeatures(box, ladderFace);
    }
    const HIDING_DISTANCE = 1.5;
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
}

function createSniperTower(x, z) {
    const TOWER_WIDTH = 6;
    const TOWER_DEPTH = 6;
    const TOWER_HEIGHT = DEFAULT_OBSTACLE_HEIGHT * 3;
    const towerYPos = (TOWER_HEIGHT / 2) - FLOOR_HEIGHT;
    const towerGeometry = new THREE.BoxGeometry(TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x4A4A4A });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(x, towerYPos, z);
    tower.userData.isTower = true;
    const DEFAULT_OBSTACLE_VOLUME = 2 * DEFAULT_OBSTACLE_HEIGHT * 2;
    const TOWER_VOLUME = TOWER_WIDTH * TOWER_HEIGHT * TOWER_DEPTH;
    tower.userData.hp = Math.round(TOWER_VOLUME / DEFAULT_OBSTACLE_VOLUME / 2);
    scene.add(tower);
    obstacles.push(tower);
    let ladderFace;
    if (Math.abs(x) > Math.abs(z)) {
        ladderFace = x > 0 ? 2 : 3;
    } else {
        ladderFace = z > 0 ? 0 : 1;
    }
    ladderFace = createAndAttachLadder(tower, ladderFace);
    createWindows(tower, TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH);
    addRooftopFeatures(tower, ladderFace);
}

function generateObstaclePositions(count) {
    const generatedConfigs = [];
    const MIN_OBSTACLE_SIZE = 2;
    const MAX_OBSTACLE_SIZE = 15;
    const playerExclusionBox = new THREE.Box3().setFromCenterAndSize(PLAYER_INITIAL_POSITION, new THREE.Vector3(5, BODY_HEIGHT + (2 * HEAD_RADIUS), 5));
    const aiExclusionBoxes = AI_INITIAL_POSITIONS.map(pos => {
        return new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(5, BODY_HEIGHT + (2 * HEAD_RADIUS), 5));
    });
    for (let i = 0; i < count; i++) {
        let positionFound = false;
        let attempts = 0;
        while (!positionFound && attempts < 100) {
            const width = Math.floor(Math.random() * (MAX_OBSTACLE_SIZE - MIN_OBSTACLE_SIZE + 1)) + MIN_OBSTACLE_SIZE;
            const depth = Math.floor(Math.random() * (MAX_OBSTACLE_SIZE - MIN_OBSTACLE_SIZE + 1)) + MIN_OBSTACLE_SIZE;
            const effectiveRadius = ARENA_RADIUS - ARENA_EDGE_THICKNESS - Math.max(width, depth) / 2;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * effectiveRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const newObstacleBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0, z), new THREE.Vector3(width, BODY_HEIGHT + (2 * HEAD_RADIUS), depth));
            let intersectsWithSpawn = newObstacleBox.intersectsBox(playerExclusionBox);
            if (!intersectsWithSpawn) {
                for (const box of aiExclusionBoxes) {
                    if (newObstacleBox.intersectsBox(box)) {
                        intersectsWithSpawn = true;
                        break;
                    }
                }
            }
            if (intersectsWithSpawn) {
                attempts++;
                continue;
            }
            let overlapsWithExisting = false;
            for (const existingConfig of generatedConfigs) {
                const existingObstacleBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(existingConfig.x, 0, existingConfig.z), new THREE.Vector3(existingConfig.width, BODY_HEIGHT + (2 * HEAD_RADIUS), existingConfig.depth));
                if (newObstacleBox.intersectsBox(existingObstacleBox)) {
                    overlapsWithExisting = true;
                    break;
                }
            }
            if (!overlapsWithExisting) {
                generatedConfigs.push({ x, z, width, depth });
                positionFound = true;
            }
            attempts++;
        }
    }
    return generatedConfigs;
}

function resetObstacles() {
    for (const obstacle of obstacles) {
        if (obstacle.parent) {
            obstacle.parent.remove(obstacle);
        }
    }
    obstacles.length = 0;
    HIDING_SPOTS.length = 0;
    for (const ladderSwitch of ladderSwitches) {
        scene.remove(ladderSwitch);
    }
    ladderSwitches.length = 0;
    let obstaclesToCreate = [];
    if (gameSettings.mapType === 'random') {
        obstaclesToCreate = generateObstaclePositions(NUM_RANDOM_OBSTACLES);
    } else if (gameSettings.mapType === 'custom') {
        const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
        const selectedMapData = allCustomMaps[gameSettings.customMapName];
        if (selectedMapData) {
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    obstaclesToCreate = selectedMapData.obstacles;
                } else {
                    obstaclesToCreate = defaultObstaclesConfig;
                }
            } catch (e) {
                obstaclesToCreate = defaultObstaclesConfig;
            }
        } else {
            obstaclesToCreate = defaultObstaclesConfig;
        }
    } else {
        obstaclesToCreate = defaultObstaclesConfig;
        createSniperTower(35, -35);
        createSniperTower(-35, 35);
    }
    for (const config of obstaclesToCreate) {
        createObstacle(config.x, config.z, config.width, config.height || undefined, config.depth, config.color || undefined, config.hp || undefined);
    }
}

const AI_INITIAL_POSITIONS = [
    new THREE.Vector3(0, 0, 20),
    new THREE.Vector3(25, 0, 10),
    new THREE.Vector3(-25, 0, 10),
    new THREE.Vector3(0, 0, -20),
    new THREE.Vector3(20, 0, -20),
    new THREE.Vector3(-20, 0, -20),
];
resetObstacles();
let playerModel;
let isPlayerDeathPlaying = false;
playerModel = createCharacterModel(0x0000ff); // Player's color
player.add(playerModel);
playerModel.visible = false;
const AI_SPEED = 15.0;
const HIDE_DURATION = 3.0;
const ATTACK_DURATION = 1.0;
const FLANK_COOLDOWN = 10.0;
const MIN_DISTANCE_BETWEEN_AIS_AT_SPOT = 10.0;
const EVASION_RANGE = 3.5;
const ARRIVAL_THRESHOLD = 1.0;
const AVOIDANCE_RAY_DISTANCE = 3.0;
const FIRING_RATE = 0.2;
const EXPLOSION_RADIUS = 25;
const EXPLOSION_FORCE = 50;

function cleanupAI(aiObject) {
    if (aiObject) {
        // Remove children (body, head, etc.) and dispose their geometries/materials
        while (aiObject.children.length > 0) {
            const child = aiObject.children[0];
            aiObject.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            if (child.texture) child.texture.dispose(); // Also dispose textures if any
        }
        // Remove the main AI group from the scene
        if (aiObject.parent) {
            aiObject.parent.remove(aiObject);
        }
    }
}

const ais = [];

function createCharacterModel(color) {
    const material = new THREE.MeshLambertMaterial({ color: color });
    const gunMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Proportions to keep the same total height, with model's feet at y=0
    const torsoHeight = BODY_HEIGHT * 0.5;
    const legSegmentHeight = BODY_HEIGHT * 0.25;
    const torsoY = (legSegmentHeight * 2) + (torsoHeight / 2);
    const headY = (legSegmentHeight * 2) + torsoHeight + HEAD_RADIUS;

    // Body and Head
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, torsoHeight, 1.0), material);
    body.position.y = torsoY;
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 16, 16), material);
    head.position.y = headY;

    // Arms and Gun
    const aimGroup = new THREE.Group();
    const gunLength = 2.0;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, gunLength), gunMaterial);
    gun.position.z = gunLength / 2;
    aimGroup.position.y = (legSegmentHeight * 2) + torsoHeight * 0.7;
    aimGroup.add(gun);
    const armGeomShort = new THREE.BoxGeometry(0.25, 0.25, 0.8);
    const armGeomLong = new THREE.BoxGeometry(0.25, 0.25, 1.2);
    const leftArm = new THREE.Mesh(armGeomShort, material);
    leftArm.position.set(-0.3, 0, 0.2);
    leftArm.rotation.y = Math.PI / 6;
    const rightArm = new THREE.Mesh(armGeomLong, material);
    rightArm.position.set(0.3, 0, 0.6);
    rightArm.rotation.y = -Math.PI / 6;
    aimGroup.add(leftArm, rightArm);

    // Legs (Thigh + Shin)
    const legWidth = 0.3;
    const thighGeom = new THREE.BoxGeometry(legWidth, legSegmentHeight, legWidth);
    const shinGeom = new THREE.BoxGeometry(legWidth, legSegmentHeight, legWidth);
    const leftHip = new THREE.Object3D();
    leftHip.position.set(-0.4, legSegmentHeight * 2, 0);
    const rightHip = new THREE.Object3D();
    rightHip.position.set(0.4, legSegmentHeight * 2, 0);
    const leftThigh = new THREE.Mesh(thighGeom, material);
    leftThigh.position.y = -legSegmentHeight / 2;
    leftHip.add(leftThigh);
    const rightThigh = new THREE.Mesh(thighGeom, material);
    rightThigh.position.y = -legSegmentHeight / 2;
    rightHip.add(rightThigh);
    const leftKnee = new THREE.Object3D();
    leftKnee.position.y = -legSegmentHeight;
    leftHip.add(leftKnee);
    const rightKnee = new THREE.Object3D();
    rightKnee.position.y = -legSegmentHeight;
    rightHip.add(rightKnee);
    const leftShin = new THREE.Mesh(shinGeom, material);
    leftShin.position.y = -legSegmentHeight / 2;
    leftKnee.add(leftShin);
    const rightShin = new THREE.Mesh(shinGeom, material);
    rightShin.position.y = -legSegmentHeight / 2;
    rightKnee.add(rightShin);

    const characterModel = new THREE.Group();
    characterModel.add(body, head, aimGroup, leftHip, rightHip);
    characterModel.userData.parts = {
        aimGroup: aimGroup,
        leftHip: leftHip,
        rightHip: rightHip,
        leftKnee: leftKnee,
        rightKnee: rightKnee
    };
    return characterModel;
}

function createAI(color) {
    const aiObject = createCharacterModel(color);

    // AI-specific properties
    aiObject.position.y = -FLOOR_HEIGHT;
    aiObject.lastHiddenTime = 0;
    aiObject.lastAttackTime = 0;
    aiObject.currentAttackTime = 0;
    aiObject.state = 'HIDING';
    aiObject.currentObstacle = null;
    aiObject.avoiding = false;
    aiObject.currentWeapon = WEAPON_PISTOL;
    aiObject.ammoMG = 0;
    aiObject.ammoRR = 0;
    aiObject.ammoSR = 0;
    aiObject.targetWeaponPickup = null;
    aiObject.hp = 3;
    aiObject.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
    aiObject.targetPosition = new THREE.Vector3();
    aiObject.isCrouching = false;
    aiObject.aggression = Math.random();
    aiObject.flankAggression = Math.random();
    aiObject.lastFlankTime = 0;

    return aiObject;
}

const raycaster = new THREE.Raycaster();

function isVisibleToPlayer(ai) {
    const playerPos = new THREE.Vector3();
    player.getWorldPosition(playerPos);
    const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3().subVectors(aiHeadPos, playerPos).normalize();
    raycaster.set(playerPos, direction);
    const intersects = raycaster.intersectObjects(obstacles, true);
    const distanceToAI = playerPos.distanceTo(aiHeadPos);
    if (intersects.length > 0) {
        if (intersects[0].distance < distanceToAI - 0.1) {
            ai.currentObstacle = intersects[0].object;
            return false;
        }
    }
    ai.currentObstacle = null;
    return true;
}

function checkLineOfSight(startPosition, endPosition, objectsToAvoid) {
    const direction = new THREE.Vector3().subVectors(endPosition, startPosition).normalize();
    const distance = startPosition.distanceTo(endPosition);
    raycaster.set(startPosition, direction);
    raycaster.far = distance;
    const intersects = raycaster.intersectObjects(objectsToAvoid, true);
    return intersects.length === 0;
}

function isBehindObstacle(ai) {
    const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
    const playerPos = player.position.clone();
    const directionToPlayer = new THREE.Vector3().subVectors(playerPos, aiHeadPos).normalize();
    const directionFromPlayer = directionToPlayer.negate();
    const rayOrigin = aiHeadPos.clone().add(directionFromPlayer.clone().multiplyScalar(1.0));
    raycaster.set(rayOrigin, directionFromPlayer);
    const intersects = raycaster.intersectObjects(obstacles, true);
    if (intersects.length > 0) {
        const hitObstacle = intersects[0].object;
        const obstacleBox = new THREE.Box3().setFromObject(hitObstacle);
        const obstacleHeight = obstacleBox.max.y - obstacleBox.min.y;
        const aiStandingHeight = BODY_HEIGHT + HEAD_RADIUS * 2;
        if (obstacleHeight >= aiStandingHeight * 0.8) {
            return !isVisibleToPlayer(ai);
        }
    }
    return false;
}

function findEvasionSpot(ai) {
    const playerPos = player.position.clone();
    let bestObstacle = null;
    if (ai.currentObstacle) {
        bestObstacle = ai.currentObstacle.parent;
    } else if (obstacles.length > 0) {
        bestObstacle = obstacles[0];
        for (let i = 1; i < obstacles.length; i++) {
            const current = obstacles[i];
            if (current.position.distanceTo(ai.position) < bestObstacle.position.distanceTo(ai.position)) {
                bestObstacle = current;
            }
        }
    } else {
        return false;
    }
    if (bestObstacle) {
        const obsPos = bestObstacle.position.clone();
        const directionToPlayer = new THREE.Vector3().subVectors(playerPos, obsPos).normalize();
        const target = obsPos.sub(directionToPlayer.multiplyScalar(EVASION_RANGE));
        target.y = 0;
        ai.state = 'EVADING';
        ai.targetPosition.copy(target);
        ai.avoiding = false;
        return true;
    }
    return false;
}

function findNewHidingSpot(ai) {
    const currentAIPos = ai.position.clone();
    let bestSpot = null;
    let maxDistanceToPlayer = -Infinity;
    if (HIDING_SPOTS.length === 0) return false;
    const aiStandingHeight = BODY_HEIGHT + HEAD_RADIUS * 2;
    const aiCrouchingHeight = aiStandingHeight * 0.7;
    const viableCrouchSpots = [];
    const regularSpots = [];
    for (const spotInfo of HIDING_SPOTS) {
        const spotPosition = spotInfo.position;
        const obstacle = spotInfo.obstacle;
        if (!obstacle || !obstacle.parent) continue;
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        const obstacleHeight = obstacleBox.max.y - obstacleBox.min.y;
        if (obstacleHeight < aiStandingHeight && obstacleHeight >= aiCrouchingHeight * 0.8) {
            viableCrouchSpots.push(spotInfo);
        } else {
            regularSpots.push(spotInfo);
        }
    }
    let spotsToConsider = viableCrouchSpots;
    if (spotsToConsider.length === 0) {
        spotsToConsider = regularSpots;
    }
    if (spotsToConsider.length === 0) return false;
    for (const spotInfo of spotsToConsider) {
        const spotPosition = spotInfo.position;
        if (spotPosition.distanceTo(currentAIPos) < ARRIVAL_THRESHOLD) continue;
        let isSpotOccupiedOrTargetedByOtherAI = false;
        for (const otherAI of ais) {
            if (otherAI === ai) continue;
            if (otherAI.position.distanceTo(spotPosition) < MIN_DISTANCE_BETWEEN_AIS_AT_SPOT) {
                isSpotOccupiedOrTargetedByOtherAI = true;
                break;
            }
            if ((otherAI.state === 'MOVING' || otherAI.state === 'FLANKING') && otherAI.targetPosition.distanceTo(spotPosition) < MIN_DISTANCE_BETWEEN_AIS_AT_SPOT / 2) {
                isSpotOccupiedOrTargetedByOtherAI = true;
                break;
            }
        }
        if (isSpotOccupiedOrTargetedByOtherAI) continue;
        const distanceToPlayer = spotPosition.distanceTo(player.position);
        if (distanceToPlayer > maxDistanceToPlayer) {
            maxDistanceToPlayer = distanceToPlayer;
            bestSpot = spotInfo;
        }
    }
    if (bestSpot) {
        ai.state = 'MOVING';
        ai.targetPosition.copy(bestSpot.position);
        ai.avoiding = false;
        return true;
    }
    return false;
}

function findObstacleAvoidanceSpot(ai, currentMoveDirection, originalTargetPosition) {
    const currentAIPos = ai.position.clone();
    const perpendicularDirectionLeft = new THREE.Vector3(-currentMoveDirection.z, 0, currentMoveDirection.x).normalize();
    const perpendicularDirectionRight = new THREE.Vector3(currentMoveDirection.z, 0, -currentMoveDirection.x).normalize();
    const evasionDirection = Math.random() > 0.5 ? perpendicularDirectionLeft : perpendicularDirectionRight;
    const evasionTarget = currentAIPos.clone().add(evasionDirection.multiplyScalar(AVOIDANCE_RAY_DISTANCE * 2));
    evasionTarget.lerp(originalTargetPosition, 0.3);
    evasionTarget.y = 0;
    ai.avoiding = true;
    ai.targetPosition.copy(evasionTarget);
}

function findAndTargetWeapon(ai) {
    const needsUpgrade = (ai.currentWeapon === WEAPON_PISTOL || (ai.currentWeapon === WEAPON_MG && ai.ammoMG < 10) || (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 1) || (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 1));
    if (!needsUpgrade || weaponPickups.length === 0 || ai.targetWeaponPickup) {
        return false;
    }
    let bestPickup = null;
    let minDistance = Infinity;
    for (const pickup of weaponPickups) {
        const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
        if (checkLineOfSight(aiHeadPos, pickup.position, obstacles)) {
            const distance = ai.position.distanceTo(pickup.position);
            if (distance < minDistance) {
                minDistance = distance;
                bestPickup = pickup;
            }
        }
    }
    if (bestPickup) {
        ai.targetWeaponPickup = bestPickup;
        ai.targetPosition.copy(bestPickup.position);
        ai.state = 'MOVING';
        return true;
    }
    return false;
}

const projectiles = [];
const debris = [];
const projectileSpeed = 50;

function createProjectile(startPos, direction, color, size = 0.1, isRocket = false, source = 'unknown', speed = projectileSpeed, isSniper = false, weaponType = null) {
    const finalSpeed = speed * (gameSettings.projectileSpeedMultiplier || 1.0);
    let bulletGeometry;
    const bulletLength = size * 5;
    const bulletRadius = size / 2;
    bulletGeometry = new THREE.CylinderGeometry(bulletRadius, bulletRadius, bulletLength, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(startPos).add(direction.clone().multiplyScalar(0.5));
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(axis, direction.normalize());
    bullet.applyQuaternion(quaternion);
    scene.add(bullet);
    const velocity = direction.clone().normalize().multiplyScalar(finalSpeed);
    const projectileLife = (weaponType === WEAPON_SG) ? SHOTGUN_RANGE / finalSpeed : Infinity;
    projectiles.push({ mesh: bullet, velocity: velocity, isRocket: isRocket, source: source, isSniper: isSniper, weaponType: weaponType, life: projectileLife });
}

function createExplosionEffect(position) {
    const coreLight = new THREE.PointLight(0xffffff, 300, 15);
    coreLight.position.copy(position);
    scene.add(coreLight);
    new TWEEN.Tween(coreLight).to({ intensity: 0 }, 500).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => scene.remove(coreLight)).start();
    const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 1.0 });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(position);
    scene.add(explosionMesh);
    const scaleTarget = 40;
    const duration = 0.8;
    new TWEEN.Tween(explosionMesh.scale).to({ x: scaleTarget, y: scaleTarget, z: scaleTarget }, duration * 1000).easing(TWEEN.Easing.Exponential.Out).start();
    new TWEEN.Tween(explosionMaterial).to({ opacity: 0 }, duration * 1000).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
        scene.remove(explosionMesh);
        explosionMesh.geometry.dispose();
        explosionMesh.material.dispose();
    }).start();
    for (let i = 0; i < 5; i++) {
        createSmokeEffect(position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 10)));
    }
}

function destroyObstacle(obstacle, explosionPosition) {
    const obstacleIndex = obstacles.indexOf(obstacle);
    if (obstacleIndex > -1) {
        obstacles.splice(obstacleIndex, 1);
    } else {
        return;
    }
    if (obstacle.userData.rooftopParts && Array.isArray(obstacle.userData.rooftopParts)) {
        for (const part of obstacle.userData.rooftopParts) {
            const partIndex = obstacles.indexOf(part);
            if (partIndex > -1) {
                obstacles.splice(partIndex, 1);
            }
            scene.remove(part);
            if (part.geometry) part.geometry.dispose();
            if (part.material) part.material.dispose();
        }
    }
    const ladderGroup = obstacle.children.find(child => child.name === 'ladder');
    if (ladderGroup) {
        obstacle.remove(ladderGroup);
    }
    for (let i = ladderSwitches.length - 1; i >= 0; i--) {
        const sensorArea = ladderSwitches[i];
        if (sensorArea.userData.obstacle === obstacle) {
            scene.remove(sensorArea);
            ladderSwitches.splice(i, 1);
            if (sensorArea.geometry) sensorArea.geometry.dispose();
            if (sensorArea.material) sensorArea.material.dispose();
        }
    }
    scene.remove(obstacle);
    const NUM_FRAGMENTS_PER_AXIS = 3;
    const fragmentSize = new THREE.Vector3(obstacle.geometry.parameters.width / NUM_FRAGMENTS_PER_AXIS, obstacle.geometry.parameters.height / NUM_FRAGMENTS_PER_AXIS, obstacle.geometry.parameters.depth / NUM_FRAGMENTS_PER_AXIS);
    const fragmentGeometry = new THREE.BoxGeometry(fragmentSize.x, fragmentSize.y, fragmentSize.z);
    const fragmentMaterial = obstacle.material;
    for (let i = 0; i < NUM_FRAGMENTS_PER_AXIS; i++) {
        for (let j = 0; j < NUM_FRAGMENTS_PER_AXIS; j++) {
            for (let k = 0; k < NUM_FRAGMENTS_PER_AXIS; k++) {
                const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
                const relativePos = new THREE.Vector3((i - (NUM_FRAGMENTS_PER_AXIS - 1) / 2) * fragmentSize.x, (j - (NUM_FRAGMENTS_PER_AXIS - 1) / 2) * fragmentSize.y, (k - (NUM_FRAGMENTS_PER_AXIS - 1) / 2) * fragmentSize.z);
                fragment.position.copy(obstacle.position).add(relativePos);
                scene.add(fragment);
                const forceDirection = new THREE.Vector3().subVectors(fragment.position, explosionPosition).normalize();
                const forceMagnitude = 10 + Math.random() * 15;
                const velocity = forceDirection.multiplyScalar(forceMagnitude);
                velocity.y += Math.random() * 10;
                const angularVelocity = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
                debris.push({ mesh: fragment, velocity: velocity, angularVelocity: angularVelocity, life: 3 + Math.random() * 2 });
            }
        }
    }
    obstacle.geometry.dispose();
}

function createSmokeEffect(position) {
    const SMOKE_PARTICLE_COUNT = 5;
    for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
        const smokeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        const offset = new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        smoke.position.copy(position).add(offset);
        scene.add(smoke);
        const scaleTarget = 4 + Math.random() * 2;
        const duration = 0.5 + Math.random() * 0.3;
        new TWEEN.Tween(smoke.scale).to({ x: scaleTarget, y: scaleTarget, z: scaleTarget }, duration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
        new TWEEN.Tween(smokeMaterial).to({ opacity: 0 }, duration * 1000).easing(TWEEN.Easing.Linear.None).onComplete(() => {
            scene.remove(smoke);
            smoke.geometry.dispose();
            smoke.material.dispose();
        }).start();
    }
}

function createRedSmokeEffect(position) {
    const SMOKE_PARTICLE_COUNT = 7;
    for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
        const smokeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
        smoke.position.copy(position).add(offset);
        scene.add(smoke);
        const scaleTarget = 5 + Math.random() * 5;
        const duration = 0.4 + Math.random() * 0.25;
        new TWEEN.Tween(smoke.scale).to({ x: scaleTarget, y: scaleTarget, z: scaleTarget }, duration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
        new TWEEN.Tween(smokeMaterial).to({ opacity: 0 }, duration * 1000).easing(TWEEN.Easing.Linear.None).onComplete(() => {
            scene.remove(smoke);
            smoke.geometry.dispose();
            smoke.material.dispose();
        }).start();
    }
}

function createRocketTrail(position) {
    const trailGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const particle = new THREE.Mesh(trailGeometry, trailMaterial);
    particle.position.copy(position);
    scene.add(particle);
    const duration = 0.8 + Math.random() * 0.5;
    new TWEEN.Tween(particle.scale).to({ x: 0.01, y: 0.01, z: 0.01 }, duration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    new TWEEN.Tween(trailMaterial).to({ opacity: 0 }, duration * 1000).easing(TWEEN.Easing.Linear.None).onComplete(() => {
        scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
    }).start();
}

function handleFirePress() {
    if (!isGameRunning || playerHP <= 0) return;
    if (currentWeapon === WEAPON_SR) {
        if (ammoSR > 0 && !isScoping) {
            const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
            if (timeSinceLastFire > FIRE_RATE_SR) {
                isScoping = true;
                scopeOverlay.style.display = 'block';
                cancelScopeButton.style.display = 'flex';
                document.getElementById('crosshair').style.display = 'none';
                if (gameSettings.nightModeEnabled) {
                    document.getElementById('night-vision-overlay').style.display = 'block';
                }
                new TWEEN.Tween(camera).to({ fov: 30 }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
            }
        }
    } else {
        isMouseButtonDown = true;
        if (currentWeapon !== WEAPON_MG) {
            shoot();
        }
    }
}

function cancelScope() {
    if (!isScoping) return;
    isScoping = false;
    scopeOverlay.style.display = 'none';
    cancelScopeButton.style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('night-vision-overlay').style.display = 'none';
    new TWEEN.Tween(camera).to({ fov: 75 }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
}

function handleFireRelease() {
    if (!isGameRunning) return;
    if (isScoping) {
        document.getElementById('night-vision-overlay').style.display = 'none';
        const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
        if (ammoSR > 0 && timeSinceLastFire > FIRE_RATE_SR) {
            if (srGunSound) srGunSound.cloneNode(true).play();
            const startPosition = new THREE.Vector3();
            player.getWorldPosition(startPosition);
            let direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            const playerMuzzlePosition = startPosition.clone().add(direction.clone().multiplyScalar(1.0));
            createMuzzleFlash(playerMuzzlePosition, 120, 2.7, 120, 0xffff00);
            createProjectile(startPosition, direction, 0xffff00, 0.1, false, 'player', projectileSpeed * 2, true);
            lastFireTime = clock.getElapsedTime();
            if (--ammoSR === 0) {
                setTimeout(() => {
                    currentWeapon = WEAPON_PISTOL;
                    cancelScope();
                }, 100);
            }
        }
        setTimeout(() => {
            if(isScoping) {
                cancelScope();
            }
        }, 100);
    }
    isMouseButtonDown = false;
}

function shoot() {
    if (!isGameRunning || playerHP <= 0) return;
    let canFire = false;
    let projectileColor = 0xffff00;
    let projectileSize = 0.1;
    let fireRate = FIRE_RATE_PISTOL;
    switch (currentWeapon) {
        case WEAPON_PISTOL: canFire = true; fireRate = FIRE_RATE_PISTOL; break;
        case WEAPON_MG: if (ammoMG > 0) { canFire = true; projectileColor = 0xffff00; fireRate = FIRE_RATE_MG; } break;
        case WEAPON_RR: if (ammoRR > 0) { canFire = true; projectileColor = 0xff8c00; projectileSize = 0.5; fireRate = FIRE_RATE_RR; } break;
        case WEAPON_SG: if (ammoSG > 0) { canFire = true; projectileColor = 0xffa500; projectileSize = 0.05; fireRate = FIRE_RATE_SG; } break;
    }
    const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
    if (canFire && timeSinceLastFire > fireRate) {
        let soundToPlay = playerGunSound;
        if (currentWeapon === WEAPON_MG) soundToPlay = mgGunSound;
        else if (currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (currentWeapon === WEAPON_SG) soundToPlay = playerSgSound;
        if (soundToPlay) soundToPlay.cloneNode(true).play();
        const startPosition = new THREE.Vector3();
        player.getWorldPosition(startPosition);
        let baseDirection = new THREE.Vector3();
        camera.getWorldDirection(baseDirection);
        const playerMuzzlePosition = startPosition.clone().add(baseDirection.clone().multiplyScalar(1.0));
        createMuzzleFlash(playerMuzzlePosition, 100, 2.2, 100, 0xffff00);
        if (gameSettings.autoAim) {
            let bestTarget = null;
            let minAngle = AUTO_AIM_ANGLE;
            for (const currentAi of ais) {
                const aiPosition = currentAi.children[1].getWorldPosition(new THREE.Vector3());
                if (startPosition.distanceTo(aiPosition) < AUTO_AIM_RANGE) {
                    const directionToAI = new THREE.Vector3().subVectors(aiPosition, startPosition).normalize();
                    const angle = baseDirection.angleTo(directionToAI);
                    if (angle < minAngle) {
                        minAngle = angle;
                        bestTarget = directionToAI;
                    }
                }
            }
            if (bestTarget) {
                baseDirection.lerp(bestTarget, AUTO_AIM_STRENGTH).normalize();
            }
        }
        if (currentWeapon === WEAPON_SG) {
            const upVector = new THREE.Vector3(0, 1, 0);
            const rightVector = new THREE.Vector3().crossVectors(baseDirection, upVector).normalize();
            const spreadStep = SHOTGUN_SPREAD_ANGLE / SHOTGUN_PELLET_COUNT;
            for (let i = 0; i < SHOTGUN_PELLET_COUNT; i++) {
                const angleOffset = (i - (SHOTGUN_PELLET_COUNT - 1) / 2) * spreadStep;
                const spreadDirection = baseDirection.clone();
                const randomAngleX = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;
                const randomAngleY = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;
                spreadDirection.applyAxisAngle(upVector, angleOffset + randomAngleX);
                spreadDirection.applyAxisAngle(rightVector, randomAngleY);
                createProjectile(startPosition, spreadDirection, projectileColor, projectileSize, false, 'player', projectileSpeed, false, WEAPON_SG);
            }
        } else {
            createProjectile(startPosition, baseDirection, projectileColor, projectileSize, currentWeapon === WEAPON_RR, 'player');
        }
        lastFireTime = clock.getElapsedTime();
        if (currentWeapon === WEAPON_MG) {
            if (--ammoMG === 0) currentWeapon = WEAPON_PISTOL;
        } else if (currentWeapon === WEAPON_RR) {
            if (--ammoRR === 0) currentWeapon = WEAPON_PISTOL;
        } else if (currentWeapon === WEAPON_SG) {
            if (--ammoSG === 0) currentWeapon = WEAPON_PISTOL;
        }
    }
}

function aiShoot(ai, timeElapsed) {
    if (!isGameRunning || playerHP <= 0) return;
    const startPosition = ai.position.clone().add(new THREE.Vector3(0, ai.isCrouching ? BODY_HEIGHT * 0.75 * 0.5 : BODY_HEIGHT * 0.75, 0));
    const playerHeadPos = player.position.clone();
    const playerBodyPos = player.position.clone();
    playerBodyPos.y = player.position.y - (playerTargetHeight / 2);
    let targetPosition = null;
    if (checkLineOfSight(startPosition, playerHeadPos, obstacles)) {
        targetPosition = playerHeadPos;
    } else if (checkLineOfSight(startPosition, playerBodyPos, obstacles)) {
        targetPosition = playerBodyPos;
    }
    if (targetPosition === null) {
        return;
    }
    const direction = new THREE.Vector3().subVectors(targetPosition, startPosition);
    const distanceToPlayer = direction.length();
    direction.normalize();
    let canAIShoot = false;
    let aiProjectileColor = 0xffff00;
    let aiProjectileSize = 0.1;
    let aiFireRate = FIRING_RATE;
    let aiProjectileSpeed = projectileSpeed;
    switch (ai.currentWeapon) {
        case WEAPON_PISTOL: canAIShoot = true; aiFireRate = FIRING_RATE * (4.0 - ai.aggression * 3.0); break;
        case WEAPON_MG: if (ai.ammoMG > 0) { canAIShoot = true; aiFireRate = FIRING_RATE * (0.5 + (1.0 - ai.aggression) * 0.5); } break;
        case WEAPON_RR: if (ai.ammoRR > 0) { canAIShoot = true; aiFireRate = FIRING_RATE * (5.0 - ai.aggression * 3.0); aiProjectileSize = 0.5; aiProjectileColor = 0xff8c00; } break;
        case WEAPON_SR: if (ai.ammoSR > 0) { canAIShoot = true; aiFireRate = FIRE_RATE_SR * (1.0 + (1.0 - ai.aggression) * 0.5); aiProjectileColor = 0xffff00; aiProjectileSpeed = projectileSpeed * 2; } break;
        case WEAPON_SG: if (ai.ammoSG > 0) { canAIShoot = true; aiFireRate = FIRE_RATE_SG; aiProjectileColor = 0xffa500; aiProjectileSize = 0.05; if (distanceToPlayer < SHOTGUN_RANGE * 1.5) { aiFireRate /= (1 + ai.aggression); } } break;
    }
    if (timeElapsed - ai.lastAttackTime < aiFireRate) return;
    if (canAIShoot) {
        let soundToPlay;
        if (ai.currentWeapon === WEAPON_MG) soundToPlay = aimgGunSound;
        else if (ai.currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (ai.currentWeapon === WEAPON_SR) soundToPlay = aiSrGunSound;
        else if (ai.currentWeapon === WEAPON_SG) soundToPlay = aiSgSound;
        else soundToPlay = aiGunSound;
        if (soundToPlay) soundToPlay.cloneNode(true).play();
        const aiMuzzlePosition = startPosition.clone().add(direction.clone().multiplyScalar(1.0));
        createMuzzleFlash(aiMuzzlePosition, 150, 3.0, 90, 0xffffff);
        createGroundFlash(aiMuzzlePosition, 0xffffff, 1.5, 150);
        const sparkGeometry = new THREE.SphereGeometry(0.6, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(aiMuzzlePosition);
        scene.add(spark);
        new TWEEN.Tween(spark.scale).to({ x: 1.0, y: 1.0, z: 1.0 }, 50).easing(TWEEN.Easing.Quadratic.Out).start();
        new TWEEN.Tween(spark.material).to({ opacity: 0 }, 150).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
            scene.remove(spark);
            spark.geometry.dispose();
            spark.material.dispose();
        }).start();
        if (ai.currentWeapon === WEAPON_SG) {
            const upVector = new THREE.Vector3(0, 1, 0);
            const rightVector = new THREE.Vector3().crossVectors(direction, upVector).normalize();
            const spreadStep = SHOTGUN_SPREAD_ANGLE / SHOTGUN_PELLET_COUNT;
            for (let i = 0; i < SHOTGUN_PELLET_COUNT; i++) {
                const angleOffset = (i - (SHOTGUN_PELLET_COUNT - 1) / 2) * spreadStep;
                const spreadDirection = direction.clone();
                const randomAngleX = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;
                const randomAngleY = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;
                spreadDirection.applyAxisAngle(upVector, angleOffset + randomAngleX);
                spreadDirection.applyAxisAngle(rightVector, randomAngleY);
                createProjectile(startPosition, spreadDirection, aiProjectileColor, aiProjectileSize, false, 'ai', aiProjectileSpeed, false, WEAPON_SG);
            }
        } else {
            createProjectile(startPosition, direction, aiProjectileColor, aiProjectileSize, ai.currentWeapon === WEAPON_RR, 'ai', aiProjectileSpeed, ai.currentWeapon === WEAPON_SR);
        }
        ai.lastAttackTime = timeElapsed;
        if (ai.currentWeapon === WEAPON_MG) {
            if (--ai.ammoMG === 0) ai.currentWeapon = WEAPON_PISTOL;
        } else if (ai.currentWeapon === WEAPON_RR) {
            if (--ai.ammoRR === 0) ai.currentWeapon = WEAPON_PISTOL;
        } else if (ai.currentWeapon === WEAPON_SR) {
            if (--ai.ammoSR === 0) ai.currentWeapon = WEAPON_PISTOL;
        } else if (ai.currentWeapon === WEAPON_SG) {
            if (--ai.ammoSG === 0) ai.currentWeapon = WEAPON_PISTOL;
        }
    }
}

function aiCheckPickup(ai) {
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        if (!pickup.parent) continue;
        if (pickup.userData.type === 'medikitPickup') continue;
        if (ai.position.distanceTo(pickup.position) < ARRIVAL_THRESHOLD + 0.5) {
            switch (pickup.userData.weaponType) {
                case WEAPON_MG: ai.currentWeapon = WEAPON_MG; ai.ammoMG = MAX_AMMO_MG; break;
                case WEAPON_RR: ai.currentWeapon = WEAPON_RR; ai.ammoRR = MAX_AMMO_RR; break;
                case WEAPON_SR: ai.currentWeapon = WEAPON_SR; ai.ammoSR = MAX_AMMO_SR; break;
                case WEAPON_SG: ai.currentWeapon = WEAPON_SG; ai.ammoSG = MAX_AMMO_SG; break;
            }
            scene.remove(pickup);
            weaponPickups.splice(i, 1);
            respawningPickups.push({ type: 'weapon', weaponType: pickup.userData.weaponType, respawnTime: clock.getElapsedTime() + RESPAWN_DELAY });
            if (ai.targetWeaponPickup === pickup) {
                ai.targetWeaponPickup = null;
                ai.state = 'HIDING';
                ai.lastHiddenTime = clock.getElapsedTime();
            }
            break;
        }
    }
}

const moveSpeed = 10.0;
const lookSpeed = 0.006;
let keyboardMoveVector = new THREE.Vector2(0, 0);
let joystickMoveVector = new THREE.Vector2(0, 0);
if (document.getElementById('joystick-move')) {
    const moveManager = nipplejs.create({ zone: document.getElementById('joystick-move'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'blue' });
    moveManager.on('move', function (evt, data) {
        if (!isGameRunning) return;
        const angleRad = data.angle.radian;
        const distance = Math.min(data.distance / 40, 1.0);
        joystickMoveVector.set(Math.cos(angleRad) * distance, Math.sin(angleRad) * distance);
    }).on('end', function () {
        joystickMoveVector.set(0, 0);
    });
}
const keySet = new Set();
document.addEventListener('keydown', (event) => {
    if (!isGameRunning) return;
    keySet.add(event.code);
    if (event.code === 'KeyC') {
        isCrouchingToggle = !isCrouchingToggle;
    }
});
document.addEventListener('keyup', (event) => { if (!isGameRunning) return; keySet.delete(event.code); });
const canvas = renderer.domElement;
canvas.addEventListener('click', () => { if (!isGameRunning) return; if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); } });
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
    }
}, false);

function onMouseMove(event) {
    if (!isGameRunning) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    player.rotateY(-movementX * lookSpeed);
    let cameraRotationX = camera.rotation.x - movementY * lookSpeed;
    camera.rotation.x = THREE.MathUtils.clamp(cameraRotationX, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
}

document.addEventListener('mousedown', (event) => {
    if (!isGameRunning) return;
    if (event.button === 0) { // Left click
        handleFirePress();
    } else if (event.button === 2) { // Right click
        if (isScoping) {
            cancelScope();
        }
    }
});
document.addEventListener('mouseup', (event) => { if (!isGameRunning) return; if (event.button === 0) { handleFireRelease(); } });
document.addEventListener('contextmenu', (event) => event.preventDefault());

if (cancelScopeButton) {
    cancelScopeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        cancelScope();
    });
    cancelScopeButton.addEventListener('touchstart', (event) => {
        event.stopPropagation();
        cancelScope();
    });
}

let isLooking = false;
let lookTouchId = -1;
let lastTouchX = 0;
let lastTouchY = 0;
document.addEventListener('touchstart', (event) => {
    if (!isGameRunning || lookTouchId !== -1) return;
    const halfWidth = window.innerWidth / 2;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];

        if (touch.target.id === 'pause-button') {
            return;
        }
        
        if (touch.clientX > halfWidth) {
            if (touch.target.id === 'fire-button') {
                handleFirePress();
            }
            isLooking = true;
            lookTouchId = touch.identifier;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            event.preventDefault();
            break;
        }
    }
}, { passive: false });
document.addEventListener('touchmove', (event) => {
    if (!isGameRunning || !isLooking || lookTouchId === -1) return;
    let currentTouchX = 0;
    let currentTouchY = 0;
    let foundLookTouch = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === lookTouchId) {
            currentTouchX = touch.clientX;
            currentTouchY = touch.clientY;
            foundLookTouch = true;
            event.preventDefault();
            break;
        }
    }
    if (foundLookTouch) {
        const dx = currentTouchX - lastTouchX;
        const dy = currentTouchY - lastTouchY;
        player.rotation.y -= dx * lookSpeed;
        let cameraRotationX = camera.rotation.x - dy * lookSpeed;
        camera.rotation.x = THREE.MathUtils.clamp(cameraRotationX, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
        lastTouchX = currentTouchX;
        lastTouchY = currentTouchY;
    }
}, { passive: false });
document.addEventListener('touchend', (event) => {
    if (!isGameRunning || lookTouchId === -1) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === lookTouchId) {
            handleFireRelease();
            isLooking = false;
            lookTouchId = -1;
            break;
        }
    }
}, false);
const crouchButton = document.getElementById('crouch-button');
if (crouchButton) {
    crouchButton.addEventListener('touchstart', (event) => {
        if (!isGameRunning) return;
        isCrouchingToggle = !isCrouchingToggle;
        event.preventDefault();
    }, { passive: false });
}

function initializeAudio() {
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
        const originalVolume = audio.volume;
        audio.volume = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = originalVolume;
            }).catch(error => {
                audio.volume = originalVolume;
            });
        }
    });
}

function startGame() {
    const startSc = document.getElementById('start-screen');
    if (startSc) startSc.style.display = 'none';
    if (renderer && renderer.domElement) {
        renderer.domElement.style.display = 'block';
    }
    createStreetLights();
    if (gameSettings.nightModeEnabled) {
        ambientLight.intensity = 0.05;
        directionalLight.intensity = 0.05;
        renderer.setClearColor(0x111122);
        streetLights.forEach(light => {
            const pointLight = light.children.find(child => child.isPointLight);
            if (pointLight) pointLight.intensity = gameSettings.nightModeLightIntensity;
        });
    } else {
        ambientLight.intensity = 0.5;
        directionalLight.intensity = 0.5;
        renderer.setClearColor(0x87CEEB);
        streetLights.forEach(light => {
            const pointLight = light.children.find(child => child.isPointLight);
            if (pointLight) pointLight.intensity = 0;
        });
    }
    const gameUI = ['crosshair', 'player-hp-display', 'ai-hp-display', 'player-weapon-display'];
    if (gameSettings.gameMode === 'arcade') {
        gameUI.push('kill-count-display');
    }
    gameUI.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    if ('ontouchstart' in window) {
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const pause = document.getElementById('pause-button');
        if (joy) joy.style.display = 'block';
        if (fire) fire.style.display = 'flex';
        if (crouch) crouch.style.display = 'flex';
        if (pause) pause.style.display = 'block';
    } else {
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        if (joy) joy.style.display = 'none';
        if (fire) fire.style.display = 'none';
        if (crouch) crouch.style.display = 'none';
    }
    const element = document.documentElement;
    try {
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => console.warn('Fullscreen API error:', err));
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen().catch(err => console.warn('Fullscreen API error (webkit):', err));
        }
    } catch (e) {
        console.warn('Error trying to enter fullscreen:', e);
    }
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.warn('Orientation lock failed:', e));
        }
    } catch (e) {
        console.warn('Error trying to lock orientation:', e);
    }
    if (gameSettings.fieldState === 'reset') {
        if (typeof resetObstacles === 'function') resetObstacles();
    }
}

function resetWeaponPickups(aiList = []) {
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
        if (weaponPickups[i].parent) {
            scene.remove(weaponPickups[i]);
        }
    }
    weaponPickups.length = 0;
    respawningPickups.length = 0;
    createWeaponPickups(aiList);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function restartGame() {
    if (gameSettings.fieldState === 'reset') {
        resetObstacles();
    }
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    if (gameSettings.gameMode === 'arcade') {
        if (killCountDisplay) killCountDisplay.style.display = 'block';
        if (aiHPDisplay) aiHPDisplay.style.display = 'block';
        if (document.getElementById('ai2-hp-display')) document.getElementById('ai2-hp-display').style.display = 'block';
        if (document.getElementById('ai3-hp-display')) document.getElementById('ai3-hp-display').style.display = 'block';
    } else {
        if (killCountDisplay) killCountDisplay.style.display = 'none';
    }
    let customSpawnPoints = null;
    let availableSpawnPoints = [];
    if (gameSettings.mapType === 'default' || gameSettings.mapType === 'random') {
        const R = ARENA_PLAY_AREA_RADIUS - 5;
        let currentAICount = gameSettings.aiCount;
        if (gameSettings.gameMode === 'arcade') {
            currentAICount = 3;
        }
        if (currentAICount === 1) {
            availableSpawnPoints.push(new THREE.Vector3(40, 2.0, -40));
            availableSpawnPoints.push(new THREE.Vector3(-40, 2.0, 40));
        } else if (currentAICount === 2) {
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                availableSpawnPoints.push(new THREE.Vector3(Math.sin(angle) * R, 2.0, Math.cos(angle) * R));
            }
        } else if (currentAICount === 3) {
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                availableSpawnPoints.push(new THREE.Vector3(Math.sin(angle) * R, 2.0, Math.cos(angle) * R));
            }
        }
        shuffle(availableSpawnPoints);
    } else if (gameSettings.mapType === 'custom') {
        const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
        const selectedMapData = allCustomMaps[gameSettings.customMapName];
        if (selectedMapData) {
            console.log("Custom map selected. selectedMapData:", selectedMapData); // 追加
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    customSpawnPoints = selectedMapData.spawnPoints.map(p => new THREE.Vector3(p.x, 2.0, p.z));
                    shuffle(customSpawnPoints);
                    availableSpawnPoints = customSpawnPoints;
                }
            } catch (e) {
                console.error("Could not parse spawn points from custom map data.", e);
            }
        }
    }
    playerHP = gameSettings.playerHP === 'Infinity' ? Infinity : parseInt(gameSettings.playerHP, 10);
    playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    playerKills = 0;
    if (killCountDisplay) killCountDisplay.textContent = `KILLS: ${playerKills}`;
    let playerSpawnPos;
    if (availableSpawnPoints.length > 0) {
        playerSpawnPos = availableSpawnPoints.pop();
    } else {
        const playerSpawn = customSpawnPoints ? customSpawnPoints.find(p => p.name === 'Player') : null;
        playerSpawnPos = playerSpawn ? new THREE.Vector3(playerSpawn.x, 2.0, playerSpawn.z) : PLAYER_INITIAL_POSITION;
    }
    player.position.copy(playerSpawnPos);

    // プレイヤーがアリーナの中心を向くように角度を計算
    // カメラはプレイヤーオブジェクトの逆向き（-Z方向）を向いているため、
    // プレイヤー自体は中心と逆の方向を向く必要がある
    const lookAtPoint = new THREE.Vector3(0, player.position.y, 0);
    const direction = new THREE.Vector3().subVectors(lookAtPoint, player.position);
    player.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

    window.justRestarted = true;
    console.log("--- GEMINI DEBUG ---");
    console.log("Timestamp:", new Date().toISOString());
    const playerDir = new THREE.Vector3();
    player.getWorldDirection(playerDir);
    console.log("Player Position:", JSON.stringify(player.position));
    console.log("Player Direction Vector:", JSON.stringify(playerDir));
    console.log("--------------------");
    camera.rotation.x = 0;
    currentWeapon = WEAPON_PISTOL;
    ammoMG = 0;
    ammoRR = 0;
    ammoSR = 0;
    ammoSG = 0;
    let finalAICount = gameSettings.aiCount;
    for (const ai of ais) {
        cleanupAI(ai); // Use cleanupAI to properly remove AI and its resources
    }
    ais.length = 0;
    const aiColors = [0x00ff00, 0x00ffff, 0x0FFa500];
    for (let i = 0; i < finalAICount; i++) {
        const ai = createAI(aiColors[i] || 0xff00ff);
        let aiSpawnPos;
        if (availableSpawnPoints.length > 0) {
            aiSpawnPos = availableSpawnPoints.pop();
        } else {
            const aiSpawn = customSpawnPoints ? customSpawnPoints.find(p => p.name === `AI ${i + 1}`) : null;
            const defaultPos = AI_INITIAL_POSITIONS[i] || new THREE.Vector3(Math.random() * 20 - 10, 0, 20);
            aiSpawnPos = aiSpawn ? new THREE.Vector3(aiSpawn.x, 0, aiSpawn.z) : defaultPos;
        }
        ai.position.copy(new THREE.Vector3(aiSpawnPos.x, -FLOOR_HEIGHT, aiSpawnPos.z));
        ai.lookAt(new THREE.Vector3(0, ai.position.y, 0));
        if (finalAICount === 3) {
            if (i === 0) { ai.aggression = 0.7; ai.flankAggression = 0.1; }
            else if (i === 1) { ai.aggression = 0.4; ai.flankAggression = 0.8; ai.flankPreference = 'left'; }
            else { ai.aggression = 0.5; ai.flankAggression = 0.8; ai.flankPreference = 'right'; }
        } else {
            ai.aggression = Math.random();
            ai.flankAggression = Math.random();
        }
        scene.add(ai);
        ais.push(ai);
    }
    const aiHP = gameSettings.aiHP === 'Infinity' ? Infinity : parseInt(gameSettings.aiHP, 10);
    const aiHPText = gameSettings.aiHP === 'Infinity' ? '∞' : aiHP;
    const ai1HPDisplay = document.getElementById('ai-hp-display');
    const ai2HPDisplay = document.getElementById('ai2-hp-display');
    const ai3HPDisplay = document.getElementById('ai3-hp-display');
    ais.forEach((ai, index) => {
        ai.hp = aiHP;
        ai.state = 'HIDING';
        ai.currentWeapon = WEAPON_PISTOL;
        ai.ammoMG = 0; ai.ammoRR = 0; ai.ammoSR = 0;
        ai.targetWeaponPickup = null;
        ai.lastHiddenTime = 0; ai.lastAttackTime = 0; ai.currentAttackTime = 0; ai.avoiding = false;
        if (index === 0) { if (ai1HPDisplay) ai1HPDisplay.textContent = `AI 1 HP: ${aiHPText}`; }
        else if (index === 1) { if (ai2HPDisplay) ai2HPDisplay.textContent = `AI 2 HP: ${aiHPText}`; }
        else if (index === 2) { if (ai3HPDisplay) ai3HPDisplay.textContent = `AI 3 HP: ${aiHPText}`; }
    });

    resetWeaponPickups(ais);

    if (ai2HPDisplay) ai2HPDisplay.style.display = (finalAICount > 1) ? 'block' : 'none';
    if (ai3HPDisplay) ai3HPDisplay.style.display = (finalAICount > 2) ? 'block' : 'none';
    const gameUI = ['crosshair', 'player-hp-display', 'player-weapon-display'];
    if (gameSettings.gameMode === 'arcade') {
        gameUI.push('kill-count-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display');
    } else {
        if (finalAICount > 0) gameUI.push('ai-hp-display');
        if (finalAICount > 1) gameUI.push('ai2-hp-display');
        if (finalAICount > 2) gameUI.push('ai3-hp-display');
    }
    gameUI.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    if ('ontouchstart' in window) {
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const pause = document.getElementById('pause-button');
        if (joy) joy.style.display = 'block';
        if (fire) fire.style.display = 'flex';
        if (crouch) crouch.style.display = 'flex';
        if (pause) pause.style.display = 'block';
    }
    for (let i = projectiles.length - 1; i >= 0; i--) scene.remove(projectiles[i].mesh);
    projectiles.length = 0;
    for (let i = debris.length - 1; i >= 0; i--) {
        const mesh = debris[i].mesh;
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
    }
    debris.length = 0;
    if (gameSettings.fieldState === 'reset') {
        resetObstacles();
    }
    // resetWeaponPickups(); // Moved to after AI creation
    if (gameSettings.gameMode === 'arcade' && gameSettings.medikitCount > 0) {
        for (let i = 0; i < gameSettings.medikitCount; i++) {
            createMedikitPickup(getRandomSafePosition(MEDIKIT_WIDTH, MEDIKIT_HEIGHT, MEDIKIT_DEPTH));
        }
    }
    clock.start();
    lastFireTime = -1;
    keySet.clear();
    joystickMoveVector.set(0, 0);
    isMouseButtonDown = false;
    isGameRunning = true;
    scene.remove(playerBody);
    scene.remove(playerHead);
    player.add(playerModel);
    playerModel.visible = false;
}

function startAIDeathSequence(impactVelocity, ai) {
    aiFallDownCinematicSequence(impactVelocity, ai);
}

function playerFallDownCinematicSequence(projectile) {
    createRedSmokeEffect(player.position);
    const playerDeathLocation = player.position.clone();
    const targetCameraPosition = findClearCameraPosition(playerDeathLocation, obstacles, projectile);
    cinematicCamera.position.copy(targetCameraPosition);
    cinematicCamera.lookAt(playerDeathLocation.clone().add(new THREE.Vector3(0, 1, 0)));
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight;
    cinematicCamera.updateProjectionMatrix();
    new TWEEN.Tween(cinematicCamera).to({ fov: 30 }, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();
    playerModel.visible = true;
    player.remove(playerModel);
    scene.add(playerModel);
    playerModel.position.copy(player.position);
    const fallDuration = 1.0;
    const fallRotationAxisAngle = Math.PI / 2;
    const finalRotation = playerModel.rotation.clone();
    finalRotation.x += (Math.random() > 0.5 ? 1 : -1) * fallRotationAxisAngle;
    new TWEEN.Tween(playerModel.rotation).to({ x: finalRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    
    // 新しい目標Y座標を計算
    let deathGroundY = -FLOOR_HEIGHT; // デフォルトは地面
    const playerFeetYAtDeath = player.position.y - playerTargetHeight;

    for (const obs of obstacles) {
        // 壁と屋上は区別しない。プレイヤーの足元の判定を優先
        if (obs.userData.isWall) continue; // 壁は地面としてカウントしない

        const obstacleBox = new THREE.Box3().setFromObject(obs);
        const topOfObstacle = obs.position.y + obs.geometry.parameters.height / 2;
        
        // プレイヤーの水平位置と障害物の水平位置が重なっているかを確認
        const playerHorizontalBox = new THREE.Box2(
            new THREE.Vector2(player.position.x - 0.2, player.position.z - 0.2), 
            new THREE.Vector2(player.position.x + 0.2, player.position.z + 0.2)
        );
        const obstacleHorizontalBox = new THREE.Box2(
            new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z), 
            new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z)
        );

        if (playerHorizontalBox.intersectsBox(obstacleHorizontalBox)) {
            // プレイヤーの足元が障害物の上または少し上にある場合
            // topOfObstacle - 0.1: 少しの誤差を許容
            // topOfObstacle + 2.0: プレイヤーがジャンプ中などの高い位置から死亡した場合も考慮
            if (playerFeetYAtDeath >= topOfObstacle - 0.1 && playerFeetYAtDeath <= topOfObstacle + 2.0) {
                // 最も高い着地点を優先
                if (topOfObstacle > deathGroundY) {
                    deathGroundY = topOfObstacle;
                }
            }
        }
    }
    const finalPlayerYPosition = deathGroundY + (BODY_HEIGHT / 2); // 死亡時のオブジェクトの中心Y座標
    new TWEEN.Tween(playerModel.position).to({ y: finalPlayerYPosition }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.In).start();
    playerModel.userData.deathType = 'fallDown';
    setTimeout(() => {
        isPlayerDeathPlaying = false;
        showGameOver();
        playerModel.userData = {};
        scene.remove(playerModel);
    }, fallDuration * 1000 + 1500);
}

function respawnAI(ai) {
    const aiHP = gameSettings.aiHP === 'Infinity' ? Infinity : parseInt(gameSettings.aiHP, 10);
    ai.hp = aiHP;
    let farthestPosition = null;
    let maxDistance = -Infinity;
    const NUM_RESPAWN_CANDIDATES = 50;
    const MIN_DISTANCE_BETWEEN_AIS = 10;
    for (let i = 0; i < NUM_RESPAWN_CANDIDATES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (ARENA_RADIUS - ARENA_EDGE_THICKNESS - 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const candidatePos = new THREE.Vector3(x, -FLOOR_HEIGHT, z);
        let tooCloseToOtherAI = false;
        for (const otherAI of ais) {
            if (otherAI !== ai && candidatePos.distanceTo(otherAI.position) < MIN_DISTANCE_BETWEEN_AIS) {
                tooCloseToOtherAI = true;
                break;
            }
        }
        if (tooCloseToOtherAI) continue;
        const originalPos = ai.position.clone();
        ai.position.copy(candidatePos);
        if (checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
            continue;
        }
        ai.position.copy(originalPos);
        const distanceToPlayer = candidatePos.distanceTo(player.position);
        if (distanceToPlayer > maxDistance) {
            maxDistance = distanceToPlayer;
            farthestPosition = candidatePos;
        }
    }
    if (!farthestPosition) {
        farthestPosition = new THREE.Vector3(0, -FLOOR_HEIGHT, 0);
    }
    ai.position.copy(farthestPosition);
    ai.rotation.set(0, Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z), 0);
    ai.state = 'HIDING';
    ai.currentWeapon = WEAPON_PISTOL;
    ai.ammoMG = 0; ai.ammoRR = 0; ai.ammoSR = 0; ai.ammoSG = 0;
    ai.targetWeaponPickup = null;
    ai.lastHiddenTime = clock.getElapsedTime();
    ai.lastAttackTime = 0; ai.currentAttackTime = 0; ai.avoiding = false; ai.isCrouching = false;
    scene.add(ai);
}

function startPlayerDeathSequence(projectile) {
    if (isPlayerDeathPlaying || playerHP > 0) return;
    isPlayerDeathPlaying = true;
    isGameRunning = false;
    document.exitPointerLock();
    const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'player-weapon-display', 'pause-button'];
    uiToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    playerModel.visible = true;
    playerFallDownCinematicSequence(projectile);
}

function findFlankingSpot(ai, timeElapsed) {
    const playerPos = player.position.clone();
    const playerDir = new THREE.Vector3();
    player.getWorldDirection(playerDir);
    const FLANK_DISTANCE = 20;
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
        let targetOffset;
        const rightDir = new THREE.Vector3(-playerDir.z, 0, playerDir.x);
        const leftDir = new THREE.Vector3(playerDir.z, 0, -playerDir.x);
        if (ai.flankPreference === 'left') { targetOffset = leftDir; }
        else if (ai.flankPreference === 'right') { targetOffset = rightDir; }
        else {
            if (ai.flankAggression > 0.6 || Math.random() > 0.5) { targetOffset = playerDir.clone().negate(); }
            else { targetOffset = Math.random() > 0.5 ? rightDir : leftDir; }
        }
        targetOffset.multiplyScalar(FLANK_DISTANCE + Math.random() * 10);
        const targetPos = playerPos.clone().add(targetOffset);
        targetPos.y = 0;
        const distFromCenter = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z);
        if (distFromCenter > ARENA_PLAY_AREA_RADIUS) {
            targetPos.multiplyScalar(ARENA_PLAY_AREA_RADIUS / distFromCenter);
        }
        const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
        if (checkLineOfSight(aiHeadPos, targetPos, obstacles)) {
            ai.targetPosition.copy(targetPos);
            ai.state = 'FLANKING';
            ai.lastFlankTime = timeElapsed;
            return true;
        }
    }
    return false;
}

function createWindows(obstacleMesh, buildingWidth, buildingHeight, buildingDepth) {
    const WINDOW_SIZE = 1.2;
    const WINDOW_THICKNESS = 0.1;
    const WINDOW_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const windowGeometry = new THREE.BoxGeometry(WINDOW_SIZE, WINDOW_SIZE, WINDOW_THICKNESS);
    const HORIZONTAL_SPACING = 2.0;
    const VERTICAL_SPACING = 2.5;
    for (let side = 0; side < 2; side++) {
        const zOffset = (buildingDepth / 2) * (side === 0 ? 1 : -1);
        const rotationY = side === 0 ? 0 : Math.PI;
        const numHorizontalWindows = 2;
        const startX = -((numHorizontalWindows - 1) * HORIZONTAL_SPACING) / 2;
        const numVerticalWindows = Math.floor((buildingHeight - WINDOW_SIZE) / VERTICAL_SPACING) + 1;
        const startY = -((numVerticalWindows - 1) * VERTICAL_SPACING) / 2;
        for (let i = 0; i < numHorizontalWindows; i++) {
            for (let j = 0; j < numVerticalWindows; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, WINDOW_MATERIAL);
                windowMesh.position.set(startX + i * HORIZONTAL_SPACING, startY + j * VERTICAL_SPACING, zOffset);
                windowMesh.rotation.y = rotationY;
                obstacleMesh.add(windowMesh);
            }
        }
    }
    for (let side = 0; side < 2; side++) {
        const xOffset = (buildingWidth / 2) * (side === 0 ? 1 : -1);
        const rotationY = side === 0 ? Math.PI / 2 : -Math.PI / 2;
        const numHorizontalWindows = 2;
        const startZ = -((numHorizontalWindows - 1) * HORIZONTAL_SPACING) / 2;
        const numVerticalWindows = Math.floor((buildingHeight - WINDOW_SIZE) / VERTICAL_SPACING) + 1;
        const startY = -((numVerticalWindows - 1) * VERTICAL_SPACING) / 2;
        for (let i = 0; i < numHorizontalWindows; i++) {
            for (let j = 0; j < numVerticalWindows; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, WINDOW_MATERIAL);
                windowMesh.position.set(xOffset, startY + j * VERTICAL_SPACING, startZ + i * HORIZONTAL_SPACING);
                windowMesh.rotation.y = rotationY;
                obstacleMesh.add(windowMesh);
            }
        }
    }
}

function aiFallDownCinematicSequence(impactVelocity, ai) {
    if (isAIDeathPlaying) return;
    isAIDeathPlaying = true;
    ai.targetWeaponPickup = null; // Clear target weapon pickup when AI dies
    cinematicTargetAI = ai;
    const joy = document.getElementById('joystick-move');
    const fire = document.getElementById('fire-button');
    const cross = document.getElementById('crosshair');
    if (joy) joy.style.display = 'none';
    if (fire) fire.style.display = 'none';
    if (cross) cross.style.display = 'none';
    createRedSmokeEffect(ai.position);
    const aiDeathLocation = ai.position.clone();
    const targetCameraPosition = findClearCameraPosition(aiDeathLocation, obstacles);
    cinematicCamera.position.copy(targetCameraPosition);
    cinematicCamera.lookAt(aiDeathLocation.clone().add(new THREE.Vector3(0, 1, 0)));
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight;
    cinematicCamera.updateProjectionMatrix();
    new TWEEN.Tween(cinematicCamera).to({ fov: 30 }, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();
    const fallDuration = 1.0;
    const fallRotationAxisAngle = Math.PI / 2;
    const finalAIRotation = ai.rotation.clone();
    finalAIRotation.x += (Math.random() > 0.5 ? 1 : -1) * fallRotationAxisAngle;
    const finalAIYPosition = -FLOOR_HEIGHT + (BODY_HEIGHT / 2);
    new TWEEN.Tween(ai.rotation).to({ x: finalAIRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    new TWEEN.Tween(ai.position).to({ y: finalAIYPosition }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.In).start();
    setTimeout(() => {
        isAIDeathPlaying = false;
        cinematicTargetAI = null;
            if (gameSettings.gameMode === 'arcade') {
                playerKills++;
                if (killCountDisplay) killCountDisplay.textContent = `KILLS: ${playerKills}`;
                respawnAI(ai);
            } else {
                // cleanupAI(ai);
                ai.visible = false;
            }        if (ais.length > 0 || gameSettings.gameMode === 'arcade') {
            if (joy) joy.style.display = 'block';
            if (fire) fire.style.display = 'block';
            if (cross) cross.style.display = 'block';
        }
    }, fallDuration * 1000 + 500);
}

function showGameOver() {
    isGameRunning = false;
    gameOverScreen.style.display = 'flex';
    document.exitPointerLock();
}

function showWinScreen() {
    isGameRunning = false;
    winScreen.style.display = 'flex';
    document.exitPointerLock();
    const pauseBtn = document.getElementById('pause-button');
    if(pauseBtn) pauseBtn.style.display = 'none';
}

function checkCollision(object, obstacles, ignoreObstacle = null) {
    const objectBox = new THREE.Box3();
    const pos = object.position;
    let currentObjectBox;
    if (object === player) {
        objectBox.min.set(pos.x - 0.2, pos.y - playerTargetHeight, pos.z - 0.2);
        objectBox.max.set(pos.x + 0.2, pos.y, pos.z + 0.2);

        currentObjectBox = objectBox;
    } else if (ais.includes(object)) {
        currentObjectBox = new THREE.Box3().setFromObject(object);
    } else {
        return false;
    }
    for (const obstacle of obstacles) {
        if (obstacle === ignoreObstacle) {
            continue;
        }
        if (obstacle.userData.isRooftop) { // Rooftop floors are not solid barriers
            continue;
        }
        // The current 'ignoreObstacle' logic is designed to ignore only the specific object passed.
        // It should NOT ignore objects that are merely children or parts of the ignored object,
        // unless those parts are explicitly handled (like isRooftop floors).
        // Removing the broad parent/building reference ignore condition.
        // if (ignoreObstacle && (obstacle.userData.parentTower === ignoreObstacle || obstacle.userData.parentBuildingRef === ignoreObstacle)) {
        //    continue;
        // }
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (currentObjectBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }
    return false;
}

function checkPartCollision(part) {
    const partBBox = new THREE.Box3().setFromObject(part);
    for (const obstacle of obstacles) {
        const obstacleBBox = new THREE.Box3().setFromObject(obstacle);
        if (partBBox.intersectsBox(obstacleBBox)) {
            return true;
        }
    }
    return false;
}

function findClearCameraPosition(targetPosition, obstaclesArray, projectile) {
    const lookAtTargetForRaycast = targetPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
    let cameraCandidates = [];
    if (projectile) {
        const fromBehind = projectile.velocity.clone().normalize().multiplyScalar(-10);
        fromBehind.y = 5;
        cameraCandidates.push(fromBehind);
    }
    const baseCandidates = [
        new THREE.Vector3(0, 5, 10), new THREE.Vector3(10, 5, 0), new THREE.Vector3(-10, 5, 0),
        new THREE.Vector3(8, 6, 8), new THREE.Vector3(-8, 6, 8), new THREE.Vector3(8, 6, -8),
        new THREE.Vector3(-8, 6, -8), new THREE.Vector3(0, 5, -10), new THREE.Vector3(0, 12, 0.1),
    ];
    cameraCandidates.push(...baseCandidates);
    for (const offset of cameraCandidates) {
        const candidateCameraPosition = targetPosition.clone().add(offset);
        const directionToTarget = new THREE.Vector3().subVectors(lookAtTargetForRaycast, candidateCameraPosition).normalize();
        raycaster.set(candidateCameraPosition, directionToTarget);
        const intersects = raycaster.intersectObjects(obstaclesArray, true);
        const distanceToTarget = candidateCameraPosition.distanceTo(lookAtTargetForRaycast);
        if (intersects.length === 0 || intersects[0].distance > distanceToTarget - 0.1) {
            return candidateCameraPosition;
        }
    }
    let bestCandidate = null;
    let maxDistance = -1;
    for (const offset of cameraCandidates) {
        const candidateCameraPosition = targetPosition.clone().add(offset);
        const directionToTarget = new THREE.Vector3().subVectors(lookAtTargetForRaycast, candidateCameraPosition).normalize();
        raycaster.set(candidateCameraPosition, directionToTarget);
        const intersects = raycaster.intersectObjects(obstaclesArray, true);
        if (intersects.length > 0) {
            if (intersects[0].distance > maxDistance) {
                maxDistance = intersects[0].distance;
                bestCandidate = candidateCameraPosition;
            }
        }
    }
    return bestCandidate || targetPosition.clone().add(new THREE.Vector3(0, 15, 0));
}

function showSettingsAndPause() {
    if (!isGameRunning && !isPaused) return;

    isGameRunning = false;
    if (!isPaused) {
        originalSettings = JSON.parse(JSON.stringify(gameSettings));
    }
    isPaused = true;

    document.exitPointerLock();

    const elementsToHide = ['joystick-move', 'fire-button', 'crouch-button', 'crosshair', 'scope-overlay', 'kill-count-display', 'player-hp-display', 'player-weapon-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'pause-button'];
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    startScreen.style.display = 'flex';
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('resume-game-btn').style.display = 'inline-block';
}

function resumeGame() {
    const settingsChanged = JSON.stringify(originalSettings) !== JSON.stringify(gameSettings);

    startScreen.style.display = 'none';
    document.getElementById('resume-game-btn').style.display = 'none';
    document.getElementById('start-game-btn').style.display = 'inline-block';

    if (settingsChanged) {
        restartGame();
    } else {
        isPaused = false;
        
        const uiToShow = ['crosshair', 'player-hp-display', 'player-weapon-display'];
        uiToShow.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'block';
        });

        const aiDisplays = ['ai-hp-display', 'ai2-hp-display', 'ai3-hp-display'];
        ais.forEach((ai, index) => {
            const display = document.getElementById(aiDisplays[index]);
            if (display) {
                if (ai.hp > 0) {
                    display.style.display = 'block';
                } else {
                    // Keep it hidden or show as dead based on existing logic
                     display.style.display = 'block'; 
                }
            }
        });
        
        if (gameSettings.gameMode === 'arcade' && document.getElementById('kill-count-display')) {
            document.getElementById('kill-count-display').style.display = 'block';
        }

        if ('ontouchstart' in window) {
            document.getElementById('joystick-move').style.display = 'block';
            document.getElementById('fire-button').style.display = 'flex';
            document.getElementById('crouch-button').style.display = 'flex';
            document.getElementById('pause-button').style.display = 'block';
        } else {
            canvas.requestPointerLock();
        }

        isGameRunning = true;
    }
}

function animate() {
    if (window.justRestarted) {
        window.justRestarted = false;
        console.log("--- ANIMATE START DEBUG ---");
        const playerDir = new THREE.Vector3();
        player.getWorldDirection(playerDir);
        console.log("Player Direction at Animate Start:", JSON.stringify(playerDir));
        console.log("---------------------------");
    }
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (isIgnoringTowerCollision) {
        ignoreTowerTimer -= delta;
        if (ignoreTowerTimer <= 0) {
            isIgnoringTowerCollision = false;
            lastClimbedTower = null;
        }
    }
    const timeElapsed = clock.getElapsedTime();
    playerTargetHeight = isCrouchingToggle ? 1.1 : 2.0;
    const currentMoveSpeed = isCrouchingToggle ? moveSpeed / 2 : moveSpeed;
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.velocity.y -= GRAVITY * delta;
        d.mesh.position.add(d.velocity.clone().multiplyScalar(delta));
        d.mesh.rotation.x += d.angularVelocity.x * delta;
        d.mesh.rotation.y += d.angularVelocity.y * delta;
        d.mesh.rotation.z += d.angularVelocity.z * delta;
        d.life -= delta;
        if (d.mesh.position.y < -FLOOR_HEIGHT) {
            d.mesh.position.y = -FLOOR_HEIGHT;
            d.velocity.y *= -0.4;
            d.velocity.x *= 0.8;
            d.velocity.z *= 0.8;
            d.angularVelocity.multiplyScalar(0.8);
        }
        if (d.life <= 0) {
            if (d.mesh.parent) {
                d.mesh.parent.remove(d.mesh);
            }
            debris.splice(i, 1);
        }
    }
    if (isAIDeathPlaying) {
        if (aiDeathFocusObject.children.length > 0) {
            const focusPos = new THREE.Vector3();
            let partsInFocus = 0;
            const tempVector = new THREE.Vector3();
            for (const part of aiDeathFocusObject.children) {
                if (part.userData.velocity) {
                    part.userData.velocity.y -= GRAVITY * delta;
                    part.position.add(part.userData.velocity.clone().multiplyScalar(delta));
                    part.rotation.x += part.userData.angularVelocity.x * delta;
                    part.rotation.y += part.userData.angularVelocity.y * delta;
                    part.rotation.z += part.userData.angularVelocity.z * delta;
                    if (part.position.y < -FLOOR_HEIGHT) {
                        part.position.y = -FLOOR_HEIGHT;
                        part.userData.velocity.y *= -0.4;
                        part.userData.velocity.x *= 0.8;
                        part.userData.velocity.z *= 0.8;
                        part.userData.angularVelocity.multiplyScalar(0.8);
                    }
                    focusPos.add(part.getWorldPosition(tempVector));
                    partsInFocus++;
                }
            }
            if (partsInFocus > 0) {
                focusPos.divideScalar(partsInFocus);
            }
            cinematicCamera.lookAt(focusPos);
        }
        else if (cinematicTargetAI) {
            const lookAtTarget = cinematicTargetAI.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            cinematicCamera.lookAt(lookAtTarget);
        }
        cinematicCamera.updateProjectionMatrix();
        TWEEN.update();
        renderer.render(scene, cinematicCamera);
        return;
    }
    if (isPlayerDeathPlaying) {
        const focusPos = new THREE.Vector3();
        let partsInFocus = 0;
        const tempVector = new THREE.Vector3();
        if (playerModel.userData.deathType === 'fallDown') {
            cinematicCamera.lookAt(playerModel.position.clone().add(new THREE.Vector3(0, 1, 0)));
            focusPos.add(playerModel.getWorldPosition(tempVector));
            partsInFocus++;
        } else {
            const parts = [playerBody, playerHead];
            for (const part of parts) {
                if (part && part.userData.velocity) {
                    part.userData.velocity.y -= GRAVITY * delta;
                    const velocity = part.userData.velocity;
                    const oldPos = part.position.clone();
                    part.position.y += velocity.y * delta;
                    if (checkPartCollision(part)) { part.position.y = oldPos.y; velocity.y *= -0.5; }
                    part.position.x += velocity.x * delta;
                    if (checkPartCollision(part)) { part.position.x = oldPos.x; velocity.x *= -0.5; }
                    part.position.z += velocity.z * delta;
                    if (checkPartCollision(part)) { part.position.z = oldPos.z; velocity.z *= -0.5; }
                    part.rotation.x += part.userData.angularVelocity.x * delta;
                    part.rotation.y += part.userData.angularVelocity.y * delta;
                    part.rotation.z += part.userData.angularVelocity.z * delta;
                    if (part.position.y < -FLOOR_HEIGHT) {
                        part.position.y = -FLOOR_HEIGHT;
                        part.userData.velocity.y *= -0.4;
                        part.userData.velocity.x *= 0.8;
                        part.userData.velocity.z *= 0.8;
                        part.userData.angularVelocity.multiplyScalar(0.8);
                    }
                    focusPos.add(part.getWorldPosition(tempVector));
                    partsInFocus++;
                }
            }
        }
        if (partsInFocus > 0) {
            focusPos.divideScalar(partsInFocus);
        }
        cinematicCamera.lookAt(focusPos);
        cinematicCamera.updateProjectionMatrix();
        TWEEN.update();
        renderer.render(scene, cinematicCamera);
        return;
    }
    if (!isGameRunning) {
        renderer.render(scene, camera);
        return;
    }
    const weaponDisplay = document.getElementById('player-weapon-display');
    if (weaponDisplay) {
        let weaponName = currentWeapon;
        let ammoCount = '∞';
        switch (currentWeapon) {
            case WEAPON_MG: weaponName = 'Machinegun'; ammoCount = ammoMG; break;
            case WEAPON_RR: weaponName = 'Rocket'; ammoCount = ammoRR; break;
            case WEAPON_SR: weaponName = 'Sniper'; ammoCount = ammoSR; break;
            case WEAPON_SG: weaponName = 'Shotgun'; ammoCount = ammoSG; break;
            case WEAPON_PISTOL: weaponName = 'Pistol'; break;
        }
        weaponDisplay.innerHTML = `Weapon: ${weaponName}<br>Ammo: ${ammoCount}`;
    }
    if (isMouseButtonDown && (currentWeapon === WEAPON_MG || currentWeapon === WEAPON_SG)) {
        shoot();
    }
    if (isScoping) {
        document.getElementById('crosshair').style.display = 'none';
    } else {
        if (scopeOverlay.style.display === 'none') {
            document.getElementById('crosshair').style.display = 'block';
        }
    }
    keyboardMoveVector.set(0, 0);
    if (keySet.has('KeyW')) keyboardMoveVector.y += 1;
    if (keySet.has('KeyS')) keyboardMoveVector.y -= 1;
    if (keySet.has('KeyA')) keyboardMoveVector.x -= 1;
    if (keySet.has('KeyD')) keyboardMoveVector.x += 1;
    let finalMoveVector = joystickMoveVector.length() > 0 ? joystickMoveVector.clone() : keyboardMoveVector.clone();
    if (isElevating) {
        const elevateSpeed = 5.0;
        player.position.y += elevateSpeed * delta;
        if (player.position.y >= elevatingTargetY) {
            player.position.y = elevatingTargetY;
            isElevating = false;
            isIgnoringTowerCollision = true;
            ignoreTowerTimer = 0.5; // Ignore tower collision for 0.5s
            lastClimbedTower = elevatingTargetObstacle;
            isCrouchingToggle = false; // 強制的に立ち状態に
        }    } else {
        let inSensorArea = false;
        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(player.position.clone().add(new THREE.Vector3(0, playerTargetHeight / 2, 0)), new THREE.Vector3(1, playerTargetHeight, 1));
        for (const sensorArea of ladderSwitches) {
            const sensorBoundingBox = new THREE.Box3().setFromObject(sensorArea);
            if (playerBoundingBox.intersectsBox(sensorBoundingBox)) {
                inSensorArea = true; const obs = sensorArea.userData.obstacle;
                isElevating = true;
                elevatingTargetObstacle = obs;
                elevatingTargetY = (obs.position.y + obs.geometry.parameters.height / 2) + 2.0;
                const ladderPos = sensorArea.userData.ladderPos;
                if (ladderPos) {
                    player.position.x = ladderPos.x;
                    player.position.z = ladderPos.z;
                }
                break;
            }
        }
        if (!inSensorArea) {
            if (finalMoveVector.length() > 0) finalMoveVector.normalize();
            const forwardMove = finalMoveVector.y * currentMoveSpeed * delta;
            const rightMove = finalMoveVector.x * currentMoveSpeed * delta;
            const oldPlayerPosition = player.position.clone();
            const forwardVector = new THREE.Vector3();
            player.getWorldDirection(forwardVector);
            forwardVector.y = 0;
            forwardVector.normalize();
            const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardVector);
            const moveX = rightVector.x * rightMove + forwardVector.x * -forwardMove;
            const moveZ = rightVector.z * rightMove + forwardVector.z * -forwardMove;
            
            const ignoreObstacle = isIgnoringTowerCollision ? lastClimbedTower : currentGroundObstacle;

            // Move on X axis and check for collision to allow sliding
            player.position.x += moveX;
            if (checkCollision(player, obstacles, ignoreObstacle)) {
                player.position.x = oldPlayerPosition.x;
            }

            // Move on Z axis and check for collision to allow sliding
            player.position.z += moveZ;
            if (checkCollision(player, obstacles, ignoreObstacle)) {
                player.position.z = oldPlayerPosition.z;
            }
            const playerDistFromCenter = Math.sqrt(player.position.x * player.position.x + player.position.z * player.position.z);
            if (playerDistFromCenter > ARENA_PLAY_AREA_RADIUS) {
                const ratio = ARENA_PLAY_AREA_RADIUS / playerDistFromCenter;
                player.position.x *= ratio;
                player.position.z *= ratio;
            }
            let onGround = false;
            currentGroundObstacle = null;
            let groundY = 0;
            const playerFeetY = player.position.y - playerTargetHeight;
                    for (const obs of obstacles) {
                        const obstacleBox = new THREE.Box3().setFromObject(obs);                const topOfObstacle = obs.position.y + obs.geometry.parameters.height / 2;
                const playerHorizontalBox = new THREE.Box2(new THREE.Vector2(player.position.x - 0.5, player.position.z - 0.5), new THREE.Vector2(player.position.x + 0.5, player.position.z + 0.5));
                const obstacleHorizontalBox = new THREE.Box2(new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z), new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z));
                if (playerHorizontalBox.intersectsBox(obstacleHorizontalBox)) {
                    if ((obs.userData.isRooftop || !obs.userData.isWall) && playerFeetY >= topOfObstacle - 2.0 && playerFeetY <= topOfObstacle + 1.0) {
                        onGround = true;
                        currentGroundObstacle = obs;
                        groundY = topOfObstacle;
                        break;
                    }
                }
            }
            if (!onGround && playerFeetY < 0.1) {
                onGround = true;
                groundY = 0;
            }
            if (onGround) {
                if (currentGroundObstacle && currentGroundObstacle.userData.isRooftop) {
                                    const rooftopY = currentGroundObstacle.position.y + currentGroundObstacle.geometry.parameters.height / 2;
                                    player.position.y = THREE.MathUtils.lerp(player.position.y, rooftopY + playerTargetHeight, 0.2);                } else {
                    const targetY = groundY + playerTargetHeight;
                    player.position.y = THREE.MathUtils.lerp(player.position.y, targetY, 0.2);
                }
            } else {
                player.position.y -= GRAVITY * delta;
            }        }
    }
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        if (!pickup.parent) continue;
        const pickupBoundingBox = new THREE.Box3().setFromObject(pickup);
        const playerPos = player.position;
        const playerCollisionBox = new THREE.Box3();
        playerCollisionBox.min.set(playerPos.x - 0.5, playerPos.y - 2.0, playerPos.z - 0.5);
        playerCollisionBox.max.set(playerPos.x + 0.5, playerPos.y + 0.5, playerPos.z + 0.5);
        if (playerCollisionBox.intersectsBox(pickupBoundingBox)) {
            if (pickup.userData.type === 'weaponPickup') {
                let weaponName = '';
                switch (pickup.userData.weaponType) {
                    case WEAPON_MG: 
                        if (currentWeapon === WEAPON_MG) { ammoMG = Math.min(ammoMG + MAX_AMMO_MG, MAX_AMMO_MG * 2); } 
                        else { currentWeapon = WEAPON_MG; ammoMG = MAX_AMMO_MG; } 
                        weaponName = 'MACHINEGUN'; break;
                    case WEAPON_RR: 
                        if (currentWeapon === WEAPON_RR) { ammoRR = Math.min(ammoRR + MAX_AMMO_RR, MAX_AMMO_RR * 2); } 
                        else { currentWeapon = WEAPON_RR; ammoRR = MAX_AMMO_RR; } 
                        weaponName = 'ROCKET LAUNCHER'; break;
                    case WEAPON_SR: 
                        if (currentWeapon === WEAPON_SR) { ammoSR = Math.min(ammoSR + MAX_AMMO_SR, MAX_AMMO_SR * 2); } 
                        else { currentWeapon = WEAPON_SR; ammoSR = MAX_AMMO_SR; } 
                        weaponName = 'SNIPER RIFLE'; break;
                    case WEAPON_SG: 
                        if (currentWeapon === WEAPON_SG) { ammoSG = Math.min(ammoSG + MAX_AMMO_SG, MAX_AMMO_SG * 2); } 
                        else { currentWeapon = WEAPON_SG; ammoSG = MAX_AMMO_SG; } 
                        weaponName = 'SHOTGUN'; break;
                }
                const setSound = document.getElementById('setSound');
                if (setSound) setSound.cloneNode(true).play();
                const weaponGetDisplay = document.getElementById('weapon-get-display');
                if (weaponGetDisplay) {
                    weaponGetDisplay.textContent = `${weaponName} GET!`;
                    weaponGetDisplay.style.display = 'block';
                    setTimeout(() => { weaponGetDisplay.style.display = 'none'; }, 1000);
                }
                scene.remove(pickup);
                weaponPickups.splice(i, 1);
                respawningPickups.push({ type: 'weapon', weaponType: pickup.userData.weaponType, respawnTime: timeElapsed + RESPAWN_DELAY });
                continue;
            } else if (pickup.userData.type === 'medikitPickup') {
                if (playerHP !== Infinity) {
                    playerHP++;
                    playerHPDisplay.textContent = `HP: ${playerHP}`;
                }
                const setSound = document.getElementById('setSound');
                if (setSound) setSound.cloneNode(true).play();
                const weaponGetDisplay = document.getElementById('weapon-get-display');
                if (weaponGetDisplay) {
                    weaponGetDisplay.textContent = `HP +1!`;
                    weaponGetDisplay.style.display = 'block';
                    setTimeout(() => { weaponGetDisplay.style.display = 'none'; }, 1000);
                }
                scene.remove(pickup);
                weaponPickups.splice(i, 1);
                respawningPickups.push({ type: 'medikit', respawnTime: timeElapsed + RESPAWN_DELAY });
                continue;
            }
        }
    }
    for (let i = respawningPickups.length - 1; i >= 0; i--) {
        const respawnItem = respawningPickups[i];
        if (timeElapsed >= respawnItem.respawnTime) {
            if (respawnItem.type === 'weapon') {
                const weaponText = respawnItem.weaponType === WEAPON_MG ? 'MG' : respawnItem.weaponType === WEAPON_RR ? 'RL' : respawnItem.weaponType === WEAPON_SR ? 'SR' : 'SG';
                const weaponBoxWidth = 1;
                const weaponBoxHeight = 0.8;
                const weaponBoxDepth = 2;
                createWeaponPickup(weaponText, getRandomSafePosition(weaponBoxWidth, weaponBoxHeight, weaponBoxDepth), respawnItem.weaponType);
            } else if (respawnItem.type === 'medikit') {
                createMedikitPickup(getRandomSafePosition(MEDIKIT_WIDTH, MEDIKIT_HEIGHT, MEDIKIT_DEPTH));
            }
            respawningPickups.splice(i, 1);
        }
    }
    const AI_SEPARATION_FORCE = 2.0;
    ais.forEach((ai, index) => {
        if (ai.hp <= 0 && gameSettings.gameMode !== 'arcade') {
            ai.visible = false; // Just in case
            return;
        }
        const currentAISpeed = ai.isCrouching ? AI_SPEED / 2 : AI_SPEED;
        const separation_vec = new THREE.Vector3(0, 0, 0);
        ais.forEach((otherAI, otherIndex) => {
            if (index === otherIndex) return;
            const distance = ai.position.distanceTo(otherAI.position);
            if (distance < MIN_DISTANCE_BETWEEN_AIS_AT_SPOT) {
                const repulsion = new THREE.Vector3().subVectors(ai.position, otherAI.position);
                const strength = (MIN_DISTANCE_BETWEEN_AIS_AT_SPOT - distance) / MIN_DISTANCE_BETWEEN_AIS_AT_SPOT;
                separation_vec.add(repulsion.normalize().multiplyScalar(strength));
            }
        });
        separation_vec.multiplyScalar(delta * AI_SEPARATION_FORCE);
        aiCheckPickup(ai);
        const isAISeen = isVisibleToPlayer(ai);
        const distanceToTarget = ai.position.distanceTo(ai.targetPosition);
        const isArrived = distanceToTarget < ARRIVAL_THRESHOLD;
        const isMoving = !isArrived;
        if (ai.state === 'HIDING') { ai.isCrouching = true; }
        else { ai.isCrouching = false; }
        ai.scale.y = ai.isCrouching ? 0.7 : 1.0;
        ai.position.y = -FLOOR_HEIGHT - (ai.isCrouching ? (BODY_HEIGHT + HEAD_RADIUS * 2) * 0.15 : 0);
        if (ai.state === 'ATTACKING' || isMoving) {
            ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z), 5 * delta);
        }
        switch (ai.state) {
            case 'HIDING':
                ai.avoiding = false;
                if (ai.currentWeapon === WEAPON_SR && ai.ammoSR > 0) {
                    ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z), 2 * delta);
                    aiShoot(ai, timeElapsed);
                    if (isAISeen && (timeElapsed - ai.lastHiddenTime) > 1.0) {
                        if (!findNewHidingSpot(ai)) { // 隠れ場所が見つからない場合でも停滞させない
                            ai.state = 'ATTACKING'; // 強制的に攻撃状態に遷移
                            ai.currentAttackTime = timeElapsed;
                            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                        } else {
                            ai.lastHiddenTime = timeElapsed;
                        }
                    }
                } else {
                    if (!findAndTargetWeapon(ai)) { // 武器を探してターゲットにする
                        if (isAISeen) { // プレイヤーが見える場合
                            ai.state = 'ATTACKING';
                            ai.currentAttackTime = timeElapsed;
                            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                        } else { // プレイヤーが見えない場合
                            const effectiveHideDuration = HIDE_DURATION * (1.0 + (1.0 - ai.aggression) * 1.5);
                            if ((timeElapsed - ai.lastHiddenTime) >= effectiveHideDuration) {
                                if (!findNewHidingSpot(ai)) { // 新しい隠れ場所を探すのに失敗した場合
                                    ai.state = 'ATTACKING'; // 強制的に攻撃状態に遷移
                                    ai.currentAttackTime = timeElapsed;
                                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                                } else {
                                    ai.lastHiddenTime = timeElapsed;
                                }
                            }
                        }
                    }
                }
                break;
            case 'MOVING':
                ai.avoiding = false;
                if (isAISeen) {
                    ai.targetWeaponPickup = null;
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                } else if (isArrived && !isAISeen && isBehindObstacle(ai)) {
                    ai.state = 'HIDING';
                    ai.lastHiddenTime = timeElapsed;
                    ai.targetWeaponPickup = null;
                }
                break;
            case 'FLANKING':
                ai.avoiding = false;
                if (isArrived) {
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                } else if (!isAISeen && isBehindObstacle(ai)) {
                    ai.state = 'HIDING';
                    ai.lastHiddenTime = timeElapsed;
                }
                break;
            case 'EVADING':
            case 'AVOIDING':
                if (isArrived) {
                    ai.state = 'HIDING';
                    ai.lastHiddenTime = timeElapsed;
                }
                break;
            case 'ATTACKING':
                ai.avoiding = false;
                const oldAIPosition_attack = ai.position.clone();
                const directionToPlayer = new THREE.Vector3().subVectors(player.position, ai.position).normalize();
                const strafeVector = new THREE.Vector3(directionToPlayer.z, 0, -directionToPlayer.x);
                const strafeSpeed = currentAISpeed * 0.5;
                const moveVectorDelta_attack = strafeVector.multiplyScalar(ai.strafeDirection * strafeSpeed * delta);
                moveVectorDelta_attack.add(separation_vec);
                ai.position.add(moveVectorDelta_attack);
                if (checkCollision(ai, obstacles)) {
                    ai.position.copy(oldAIPosition_attack);
                    ai.strafeDirection *= -1;
                }
                aiShoot(ai, timeElapsed);
                if ((timeElapsed - ai.currentAttackTime) >= ATTACK_DURATION) {
                    if (isAISeen && Math.random() < ai.flankAggression && (timeElapsed - ai.lastFlankTime) > FLANK_COOLDOWN) {
                        if (findFlankingSpot(ai, timeElapsed)) {
                            break;
                        }
                    }
                    if (!findAndTargetWeapon(ai)) {
                        findEvasionSpot(ai);
                    }
                }
                break;
        }
        if (isMoving && ai.state !== 'HIDING' && ai.state !== 'ATTACKING') {
            const oldAIPosition = ai.position.clone();
            let moveDirection = new THREE.Vector3().subVectors(ai.targetPosition, ai.position).normalize();
            const moveVectorDelta = moveDirection.clone().multiplyScalar(currentAISpeed * delta);
            moveVectorDelta.add(separation_vec);
            moveDirection = moveVectorDelta.normalize();
            raycaster.set(oldAIPosition.clone().add(new THREE.Vector3(0, 1.0, 0)), moveDirection);
            const intersects = raycaster.intersectObjects(obstacles, true);
            if (intersects.length > 0 && intersects[0].distance < AVOIDANCE_RAY_DISTANCE && !ai.avoiding && ai.state !== 'EVADING') {
                findObstacleAvoidanceSpot(ai, moveDirection, ai.targetPosition);
            } else {
                const finalMove = moveDirection.multiplyScalar(currentAISpeed * delta);
                ai.position.add(finalMove);
                if (checkCollision(ai, obstacles)) {
                    ai.position.copy(oldAIPosition);
                    findObstacleAvoidanceSpot(ai, moveDirection, ai.targetPosition);
                }
            }
        }
        const aiDistFromCenter = Math.sqrt(ai.position.x * ai.position.x + ai.position.z * ai.position.z);
        if (aiDistFromCenter > ARENA_PLAY_AREA_RADIUS) {
            const ratio = ARENA_PLAY_AREA_RADIUS / aiDistFromCenter;
            ai.position.x *= ratio;
            ai.position.z *= ratio;
        }

        // Animate AI limbs
        if (ai.userData.parts) {
            const parts = ai.userData.parts;

            // Aiming: Make the aimGroup look at the player's head position.
            const playerHeadPos = new THREE.Vector3();
            player.getWorldPosition(playerHeadPos);
            playerHeadPos.y += playerTargetHeight; // Aim directly at the player's head height
            parts.aimGroup.lookAt(playerHeadPos);

            // Leg Animation
            const isMoving = (ai.state === 'MOVING' || ai.state === 'FLANKING' || ai.state === 'EVADING') &&
                             (ai.targetPosition && ai.position.distanceTo(ai.targetPosition) > ARRIVAL_THRESHOLD);

            if (ai.isCrouching) {
                // Crouch pose
                const crouchAngle = Math.PI / 2.5;
                parts.leftHip.rotation.x = crouchAngle;
                parts.rightHip.rotation.x = crouchAngle;
                parts.leftKnee.rotation.x = -crouchAngle;
                parts.rightKnee.rotation.x = -crouchAngle;
            } else if (isMoving) {
                // Walking animation
                const walkSpeed = 10;
                const hipAmplitude = Math.PI / 4;
                const kneeAmplitude = Math.PI / 3;

                const swing = Math.sin(timeElapsed * walkSpeed) * hipAmplitude;
                
                parts.leftHip.rotation.x = swing;
                parts.rightHip.rotation.x = -swing;
                
                // Bend the knee based on the hip's swing
                parts.leftKnee.rotation.x = Math.max(0, (Math.cos(timeElapsed * walkSpeed) + 1) / 2 * kneeAmplitude);
                parts.rightKnee.rotation.x = Math.max(0, (Math.cos(timeElapsed * walkSpeed + Math.PI) + 1) / 2 * kneeAmplitude);

            } else {
                // Idle pose (straight legs)
                parts.leftHip.rotation.x = 0;
                parts.rightHip.rotation.x = 0;
                parts.leftKnee.rotation.x = 0;
                parts.rightKnee.rotation.x = 0;
            }
        }
    });
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (p.life !== Infinity) {
            p.life -= delta;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
                continue;
            }
        }
        if (p.isSniper) {
            const moveVector = p.velocity.clone().multiplyScalar(delta);
            const moveDistance = moveVector.length();
            if (moveDistance > 0) {
                raycaster.set(p.mesh.position, moveVector.normalize());
                raycaster.far = moveDistance;
                const intersects = raycaster.intersectObjects(obstacles, true);
                if (intersects.length > 0) {
                    createSmokeEffect(intersects[0].point);
                    scene.remove(p.mesh);
                    projectiles.splice(i, 1);
                    continue;
                }
            }
        }
        p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
        if (p.isRocket) {
            createRocketTrail(p.mesh.position.clone());
        }
        let hitSomething = false;
        let hitObject = null;
        let hitType = '';
        const bulletSphere = new THREE.Sphere(p.mesh.position, p.isRocket ? 0.5 : 0.1);
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obstacle = obstacles[j];
            if (new THREE.Box3().setFromObject(obstacle).intersectsSphere(bulletSphere)) {
                hitSomething = true;
                hitObject = obstacle;
                hitType = 'obstacle';
                break;
            }
        }
        if (!hitSomething && new THREE.Box3().setFromObject(floor).intersectsSphere(bulletSphere)) {
            hitSomething = true;
            hitObject = floor;
            hitType = 'floor';
        }
        if (!hitSomething && p.source === 'player') {
            for (let j = ais.length - 1; j >= 0; j--) {
                const ai = ais[j];
                if (new THREE.Box3().setFromObject(ai).intersectsSphere(bulletSphere)) {
                    if (ai.hp <= 0) continue; // すでに死んでいるAIにはヒットしない

                    hitSomething = true;
                    hitObject = ai;
                    hitType = 'ai';
                    let damageAmount = 1;
                    if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE;
                    else if (p.isSniper || p.isRocket) damageAmount = ai.hp;
                    if (ai.hp !== Infinity) {
                        ai.hp -= damageAmount;
                        createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                    }
                    if (ai.hp <= 0) {
                        aiFallDownCinematicSequence(p.velocity, ai);
                    } else {
                        findEvasionSpot(ai);
                    }
                    // if (ai.hp <= 0 && gameSettings.gameMode !== 'arcade') {
                    //     ais.splice(j, 1);
                    // }
                    if (p.weaponType === WEAPON_SG) {
                        scene.remove(p.mesh);
                        projectiles.splice(i, 1);
                    }
                }
            }
            if (hitSomething) break;
        }
        if (!hitSomething && p.source === 'ai') {
            const playerPos = player.position;
            const playerBoundingBox = new THREE.Box3();
            const playerBottomY = playerPos.y - playerTargetHeight;
            const playerTopY = playerPos.y;
            playerBoundingBox.min.set(playerPos.x - 0.5, playerBottomY, playerPos.z - 0.5);
            playerBoundingBox.max.set(playerPos.x + 0.5, playerTopY, playerPos.z + 0.5);
            if (playerBoundingBox.intersectsSphere(bulletSphere)) {
                hitSomething = true;
                hitObject = player;
                hitType = 'player';
                let damageAmount = 1;
                if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE;
                else if (p.isSniper || p.isRocket) damageAmount = playerHP;
                if (playerHP !== Infinity) {
                    playerHP -= damageAmount;
                    screenShakeDuration = SHAKE_DURATION_MAX;
                    redFlashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                    setTimeout(() => { redFlashOverlay.style.backgroundColor = 'transparent'; }, 100);
                }
                if (playerHP <= 0 && !isPlayerDeathPlaying) {
                    startPlayerDeathSequence(p);
                }
                if (p.weaponType === WEAPON_SG) {
                    projectiles.splice(i, 1);
                    scene.remove(p.mesh);
                }
                break;
            }
        }
        if (hitSomething) {
            if (p.isRocket) {
                if (explosionSound) explosionSound.cloneNode(true).play();
                const explosionPos = p.mesh.position.clone();
                createExplosionEffect(explosionPos);
                const ROCKET_MAX_DAMAGE = 15;
                const EXPLOSION_RADIUS_ACTUAL = 5;
                if (p.source === 'player') {
                    for (let j = ais.length - 1; j >= 0; j--) {
                        const ai = ais[j];
                        if (ai.hp <= 0) continue;
                        const distance = ai.position.distanceTo(explosionPos);
                        if (distance < EXPLOSION_RADIUS_ACTUAL) {
                            const aiCenter = ai.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                            if (checkLineOfSight(explosionPos, aiCenter, obstacles)) {
                                const damage = 1;
                                if (ai.hp !== Infinity) {
                                    ai.hp -= damage;
                                    createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                                }
                                if (ai.hp <= 0) {
                                    aiFallDownCinematicSequence(new THREE.Vector3().subVectors(ai.position, explosionPos), ai);
                                    ais.splice(j, 1);
                                }
                            }
                        }
                    }
                }
                if (p.source === 'ai' && playerHP > 0) {
                    const distanceToPlayer = player.position.distanceTo(explosionPos);
                    if (distanceToPlayer < EXPLOSION_RADIUS_ACTUAL) {
                        const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
                        if (checkLineOfSight(explosionPos, playerCenter, obstacles)) {
                            const damage = 1;
                            if (playerHP !== Infinity) {
                                playerHP -= damage;
                                screenShakeDuration = SHAKE_DURATION_MAX;
                                redFlashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                                setTimeout(() => { redFlashOverlay.style.backgroundColor = 'transparent'; }, 100);
                            }
                            if (playerHP <= 0 && !isPlayerDeathPlaying) {
                                startPlayerDeathSequence(p);
                            }
                        }
                    }
                }
                if (hitType === 'obstacle') {
                    if (hitObject.userData.hp === undefined) {
                        hitObject.userData.hp = 1;
                    }
                    hitObject.userData.hp -= 1;
                    if (hitObject.userData.hp <= 0) {
                        destroyObstacle(hitObject, p.mesh.position);
                    }
                }
            } else {
                createSmokeEffect(p.mesh.position);
            }
            if (p.weaponType !== WEAPON_SG) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
            continue;
        }
        if (p.mesh.position.length() > 200 && p.weaponType !== WEAPON_SG) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }
    const aiHPDisplays = [document.getElementById('ai-hp-display'), document.getElementById('ai2-hp-display'), document.getElementById('ai3-hp-display')];
    for (let i = 0; i < aiHPDisplays.length; i++) {
        const display = aiHPDisplays[i];
        if (!display) continue;
        const ai = ais[i]; // ais配列から削除されていないことを前提

        if (ai && ai.hp > 0) {
            display.style.display = 'block';
            display.textContent = `AI ${i + 1} HP: ${ai.hp === Infinity ? '∞' : ai.hp}`;
            display.classList.remove('dead-ai-hp'); // 生きている場合はクラスを削除
        } else if (ai && ai.hp <= 0) { // AIが存在し、HPが0以下の場合
            display.style.display = 'block';
            display.textContent = `AI ${i + 1} HP: 0`;
            display.classList.add('dead-ai-hp'); // 死んでいる場合はクラスを追加
        } else { // AIが存在しない場合 (AIの総数よりiが大きい場合)
            display.style.display = 'none';
        }
    }
    const allAIsDefeated = ais.every(ai => ai.hp <= 0);
    if (allAIsDefeated && ais.length > 0 && isGameRunning && !isAIDeathPlaying && gameSettings.gameMode === 'battle') {
        showWinScreen();
    }
    playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    if (gameSettings.gameMode === 'arcade') {
        if (killCountDisplay) killCountDisplay.style.display = 'block';
        if (killCountDisplay) killCountDisplay.textContent = `KILLS: ${playerKills}`;
    } else {
        if (killCountDisplay) killCountDisplay.style.display = 'none';
    }
    if (screenShakeDuration > 0) {
        screenShakeDuration -= delta;
        const shakeFactor = screenShakeDuration / SHAKE_DURATION_MAX;
        camera.position.x = (Math.random() - 0.5) * SHAKE_INTENSITY * shakeFactor;
        camera.position.y = (Math.random() - 0.5) * SHAKE_INTENSITY * shakeFactor;
    } else camera.position.set(0, 0, 0);
    TWEEN.update();
    renderer.render(scene, camera);
}
const startBtn = document.getElementById('start-game-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        gameSettings.playerHP = document.getElementById('player-hp').value;
        gameSettings.aiHP = document.getElementById('ai-hp').value;
        gameSettings.mgCount = parseInt(document.getElementById('mg-count').value, 10);
        gameSettings.rrCount = parseInt(document.getElementById('rr-count').value, 10);
        gameSettings.srCount = parseInt(document.getElementById('sr-count').value, 10);
        gameSettings.sgCount = parseInt(document.getElementById('sg-count').value, 10);
        gameSettings.fieldState = document.querySelector('input[name="field-state"]:checked').value;
        gameSettings.mapType = document.querySelector('input[name="map-type"]:checked').value;
        gameSettings.aiCount = parseInt(document.querySelector('input[name="ai-count"]:checked').value, 10);
        initializeAudio();
        startGame();
        restartGame();
    });
}
const rButtons = document.querySelectorAll('.restart-button');
rButtons.forEach(button => button.addEventListener('click', () => {
    initializeAudio();
    restartGame();
    if (!('ontouchstart' in window)) canvas.requestPointerLock();
}));
const settingsLinks = document.querySelectorAll('.settings-link');
settingsLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const screenToHideId = link.dataset.screenToHide;
        document.getElementById(screenToHideId).style.display = 'none';
        startScreen.style.display = 'flex';
    });
});
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// --- Button Settings Logic ---
const buttonSettingsScreen = document.getElementById('button-settings-screen');
const startScreenElement = document.getElementById('start-screen');
const openButtonSettingsBtn = document.getElementById('button-setting-btn');
const saveButtonPositionsBtn = document.getElementById('save-button-positions');
const backToSettingsBtn = document.getElementById('back-to-settings');
const feedbackDiv = document.getElementById('button-setting-feedback');

openButtonSettingsBtn.addEventListener('click', () => {
    startScreenElement.style.display = 'none';
    buttonSettingsScreen.style.display = 'block';
    feedbackDiv.style.display = 'none'; // Hide feedback on open
});

backToSettingsBtn.addEventListener('click', () => {
    buttonSettingsScreen.style.display = 'none';
    startScreenElement.style.display = 'block';
});

saveButtonPositionsBtn.addEventListener('click', () => {
    const previewFireButton = document.getElementById('preview-fire-button');
    const previewCrouchButton = document.getElementById('preview-crouch-button');
    const previewJoystickZone = document.getElementById('preview-joystick-zone');

    // Convert pixel values to percentage for responsiveness
    const fireRight = (parseInt(previewFireButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const fireBottom = (parseInt(previewFireButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const crouchRight = (parseInt(previewCrouchButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const crouchBottom = (parseInt(previewCrouchButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const joystickLeft = (parseInt(previewJoystickZone.style.left, 10) / window.innerWidth) * 100 + '%';
    const joystickBottom = (parseInt(previewJoystickZone.style.bottom, 10) / window.innerHeight) * 100 + '%';

    gameSettings.buttonPositions.fire = { right: fireRight, bottom: fireBottom };
    gameSettings.buttonPositions.crouch = { right: crouchRight, bottom: crouchBottom };
    gameSettings.buttonPositions.joystick = { left: joystickLeft, bottom: joystickBottom };

    saveSettings();
    
    // Apply to actual buttons immediately
    const fireButton = document.getElementById('fire-button');
    const crouchButton = document.getElementById('crouch-button');
    const joystickZone = document.getElementById('joystick-move');

    fireButton.style.right = fireRight;
    fireButton.style.bottom = fireBottom;
    crouchButton.style.right = crouchRight;
    crouchButton.style.bottom = crouchBottom;
    joystickZone.style.left = joystickLeft;
    joystickZone.style.bottom = joystickBottom;
    
    fireButton.style.left = '';
    fireButton.style.top = '';
    crouchButton.style.left = '';
    crouchButton.style.top = '';
    joystickZone.style.right = '';
    joystickZone.style.top = '';


    // Show feedback
    feedbackDiv.textContent = 'Positions Saved!';
    feedbackDiv.style.display = 'block';
    setTimeout(() => {
        feedbackDiv.style.display = 'none';
    }, 2000);
});

function makeDraggable(element, isJoystick = false) {
    let isDragging = false;
    let offsetX, offsetY;

    const startDrag = (e) => {
        isDragging = true;
        const event = e.type === 'touchstart' ? e.touches[0] : e;
        
        const rect = element.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        if (e.type === 'touchmove') e.preventDefault();
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        const event = e.type === 'touchmove' ? e.touches[0] : e;
        e.preventDefault(); 

        let newX = event.clientX - offsetX;
        let newY = event.clientY - offsetY;

        if (isJoystick) {
            const newLeft = newX;
            const newBottom = window.innerHeight - newY - element.offsetHeight;
            element.style.left = `${newLeft}px`;
            element.style.bottom = `${newBottom}px`;
            element.style.right = '';
            element.style.top = '';
        } else {
            const newRight = window.innerWidth - newX - element.offsetWidth;
            const newBottom = window.innerHeight - newY - element.offsetHeight;
            element.style.left = ''; 
            element.style.top = '';
            element.style.right = `${newRight}px`;
            element.style.bottom = `${newBottom}px`;
        }
    };

    const endDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    };

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag, { passive: false });
}

makeDraggable(document.getElementById('preview-fire-button'));
makeDraggable(document.getElementById('preview-crouch-button'));
makeDraggable(document.getElementById('preview-joystick-zone'), true);

document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP') {
        showSettingsAndPause();
    }
});

const pauseBtn = document.getElementById('pause-button');
if (pauseBtn) {
    pauseBtn.addEventListener('click', showSettingsAndPause);
}

const resumeGameBtn = document.getElementById('resume-game-btn');
if (resumeGameBtn) {
    resumeGameBtn.addEventListener('click', resumeGame);
}

animate();
