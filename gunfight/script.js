const PLAYER_INITIAL_POSITION = new THREE.Vector3(0, 2.0, -20);
let gameSettings = {
    playerHP: 3,
    aiHP: 3,
    projectileSpeedMultiplier: 1.0,
    mgCount: 1,
    rrCount: 1,
    srCount: 1,
    sgCount: 1, // ショットガンを追加
    fieldState: 'reset',
    mapType: 'default', // 'default', 'random', 'custom'
    aiCount: 2, // <-- ここ
    autoAim: false, // オートエイムの設定を追加 (デフォルトはOFF)
    nightModeEnabled: false, // Night Modeの設定を追加 (デフォルトはOFF)
    customMapName: 'Default Custom Map' // 選択されたカスタムマップの名前を保持
};

// デバイスに応じてマップエディタのリンク先を変更
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const editorLink = document.getElementById('map-editor-link');
        if (editorLink && 'ontouchstart' in window) {
            editorLink.href = 'map_editor_sp.html';
        }

        // 保存された設定をロードしてUIに反映
        console.log('DOMContentLoaded: Initial gameSettings before loadSettings:', JSON.stringify(gameSettings));
        loadSettings();
        console.log('DOMContentLoaded: gameSettings after loadSettings:', JSON.stringify(gameSettings));
        updateCustomMapSelector(); // カスタムマップ選択を初期化
        console.log('DOMContentLoaded: updateCustomMapSelector called.');

        // 設定UI要素の変更を監視し、変更時にgameSettingsを更新して保存
        const playerHpSelect = document.getElementById('player-hp');
        const aiHpSelect = document.getElementById('ai-hp');
        const projectileSpeedSelect = document.getElementById('projectile-speed');
        const mgCountSelect = document.getElementById('mg-count');
        const rrCountSelect = document.getElementById('rr-count');
        const srCountSelect = document.getElementById('sr-count');
        const sgCountSelect = document.getElementById('sg-count'); // ショットガンを追加

        const aiCountRadios = document.querySelectorAll('input[name="ai-count"]');
        const fieldStateRadios = document.querySelectorAll('input[name="field-state"]');
        const mapTypeRadios = document.querySelectorAll('input[name="map-type"]');
        const autoAimRadios = document.querySelectorAll('input[name="auto-aim"]'); // 追加

        if (playerHpSelect) playerHpSelect.addEventListener('change', () => { gameSettings.playerHP = playerHpSelect.value; saveSettings(); });
        if (aiHpSelect) aiHpSelect.addEventListener('change', () => { gameSettings.aiHP = aiHpSelect.value; saveSettings(); });
        if (projectileSpeedSelect) projectileSpeedSelect.addEventListener('change', () => { gameSettings.projectileSpeedMultiplier = parseFloat(projectileSpeedSelect.value); saveSettings(); });
        if (mgCountSelect) mgCountSelect.addEventListener('change', () => { gameSettings.mgCount = parseInt(mgCountSelect.value, 10); saveSettings(); });
        if (rrCountSelect) rrCountSelect.addEventListener('change', () => { gameSettings.rrCount = parseInt(rrCountSelect.value, 10); saveSettings(); });
        if (srCountSelect) srCountSelect.addEventListener('change', () => { gameSettings.srCount = parseInt(srCountSelect.value, 10); saveSettings(); });
        if (sgCountSelect) sgCountSelect.addEventListener('change', () => { gameSettings.sgCount = parseInt(sgCountSelect.value, 10); saveSettings(); }); // ショットガンを追加

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
                    gameSettings.autoAim = radio.value === 'true'; // 文字列を真偽値に変換
                    saveSettings();
                }
            });
        });
        const nightModeRadios = document.querySelectorAll('input[name="night-mode"]');
        nightModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.nightModeEnabled = radio.value === 'true'; // 文字列を真偽値に変換
                    saveSettings();
                }
            });
        });

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
                console.log('Load Selected Map Button clicked.');
                console.log('Before setting mapType to custom:', JSON.stringify(gameSettings));
                gameSettings.mapType = 'custom';
                console.log('After setting mapType to custom:', JSON.stringify(gameSettings));
                saveSettings();
                console.log('After saveSettings in button click:', JSON.stringify(gameSettings));
                startGame();
                restartGame();
            });
        }

    });
})();

// カスタムマップ選択ドロップダウンを更新する関数
function updateCustomMapSelector() {
    const customMapSelector = document.getElementById('custom-map-selector');
    if (!customMapSelector) return;

    // ドロップダウンをクリア
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
        // gameSettings.customMapName が存在すればそれを選択、なければ最初のマップを選択
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0); // 初期強度0
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0); // 初期強度0
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
const WEAPON_SG = 'shotgun'; // ショットガンを追加
let currentWeapon = WEAPON_PISTOL;
let ammoMG = 0;
let ammoRR = 0;
let ammoSR = 0;
let ammoSG = 0; // ショットガン弾薬を追加
const MAX_AMMO_MG = 50;
const MAX_AMMO_RR = 3;
const MAX_AMMO_SR = 5;
const MAX_AMMO_SG = 10; // ショットガン最大弾薬を追加
const FIRE_RATE_PISTOL = 0.3;
const FIRE_RATE_MG = 0.1;
const FIRE_RATE_RR = 1.5;
const FIRE_RATE_SR = 2.0;
const FIRE_RATE_SG = 0.8; // ショットガン発射レートを追加
// ショットガン固有の設定
const SHOTGUN_PELLET_COUNT = 7;      // 散弾の数
const SHOTGUN_SPREAD_ANGLE = Math.PI / 16; // 拡散角度 (約11.25度)
const SHOTGUN_RANGE = 15;            // 有効射程距離 (短距離)
const SHOTGUN_PELLET_DAMAGE = 2;   // 散弾1発のダメージ (HPを2減らす)

const WEAPON_SG_SOUND = 'sgun.mp3';  // ショットガンの音源ファイル名
const AI_WEAPON_SG_SOUND = 'aisgun.mp3'; // AI用ショットガンの音源ファイル名

let lastFireTime = -FIRE_RATE_PISTOL;
let isMouseButtonDown = false;
let isScoping = false;
let isElevating = false;
let elevatingTargetY = 0;
let elevatingTargetObstacle = null;
let currentGroundObstacle = null;
let isLanding = false;
let landingTimer = 0;

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






// 設定をlocalStorageに保存する関数
function saveSettings() {
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
}

// 設定をlocalStorageから読み込み、UIに反映する関数
function loadSettings() {
    console.log('loadSettings called.');
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        console.log('Found saved settings:', savedSettings);
        const parsedSavedSettings = JSON.parse(savedSettings);
        console.log('Parsed saved settings:', parsedSavedSettings);
        Object.assign(gameSettings, parsedSavedSettings);
        console.log('gameSettings after Object.assign:', JSON.stringify(gameSettings));
        
        // UI要素に設定値を反映
        document.getElementById('player-hp').value = gameSettings.playerHP;
        document.getElementById('ai-hp').value = gameSettings.aiHP;
        if (document.getElementById('projectile-speed')) document.getElementById('projectile-speed').value = gameSettings.projectileSpeedMultiplier || 1.0;
        document.getElementById('mg-count').value = gameSettings.mgCount;
        document.getElementById('rr-count').value = gameSettings.rrCount;
        document.getElementById('sr-count').value = gameSettings.srCount;
        if (document.getElementById('sg-count')) document.getElementById('sg-count').value = gameSettings.sgCount; // ショットガンを追加

        // radioボタンの反映
        document.querySelectorAll('input[name="ai-count"]').forEach(radio => {
            radio.checked = (radio.value === String(gameSettings.aiCount)); // 厳密な比較に変更
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
const aiSrGunSound = document.getElementById('aiSrGunSound'); // この行を追加
const playerSgSound = document.getElementById('playerSgSound');
const aiSgSound = document.getElementById('aiSgSound');
const winScreen = document.getElementById('win-screen');
const playerHPDisplay = document.getElementById('player-hp-display');
const aiHPDisplay = document.getElementById('ai-hp-display');
const redFlashOverlay = document.getElementById('red-flash-overlay');
const scopeOverlay = document.getElementById('scope-overlay');

// オーディオプール関連
const MAX_AUDIO_INSTANCES = 5; // 各サウンドにつき同時に再生可能な最大インスタンス数
const audioPools = {}; // 全てのサウンドプールを保持するオブジェクト

// サウンドを再生するためのヘルパー関数
function playSound(audioElement, volume = 1.0) {
    if (!audioElement || !audioElement.src) {
        console.warn('Attempted to play null or invalid audio element.');
        return;
    }

    const audioId = audioElement.id;
    if (!audioPools[audioId]) {
        // プールがまだ作成されていない場合、初期化
        audioPools[audioId] = [];
        for (let i = 0; i < MAX_AUDIO_INSTANCES; i++) {
            const audio = new Audio(audioElement.src);
            audio.preload = 'auto';
            audioPools[audioId].push(audio);
        }
    }

    // 利用可能なAudioインスタンスを探して再生
    let played = false;
    for (const audio of audioPools[audioId]) {
        if (audio.paused || audio.ended) {
            audio.currentTime = 0;
            audio.volume = volume;
            audio.play().catch(e => console.error("Audio playback failed:", e));
            played = true;
            break;
        }
    }
    if (!played) {
        // 全てのインスタンスが再生中の場合、最も古いインスタンスを停止して再利用
        // (または何もしない、ここでは最も古いものを停止して再利用)
        const oldestAudio = audioPools[audioId][0]; // 最も古いインスタンス (配列の先頭)
        if (oldestAudio) {
            oldestAudio.pause();
            oldestAudio.currentTime = 0;
            oldestAudio.volume = volume;
            oldestAudio.play().catch(e => console.error("Audio playback failed:", e));
            // 配列の最後に移動させて「最も新しい」状態にする
            audioPools[audioId].push(audioPools[audioId].shift());
        }
    }
}

// 銃口フラッシュ生成ヘルパー関数
// lightColor: PointLightの色 (発砲火花の色と合わせる)
function createMuzzleFlash(position, intensity, distance, duration = 150, lightColor = 0xffffff) {
    const flashLight = new THREE.PointLight(lightColor, intensity, distance); // 色を動的に設定
    flashLight.position.copy(position);
    flashLight.position.y += 1.0; // 光源を地面からさらに浮かせます
    scene.add(flashLight);

    new TWEEN.Tween(flashLight)
        .to({ intensity: 0 }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(flashLight);
        })
        .start();
}

// 地面への発光エフェクト生成ヘルパー関数
function createGroundFlash(position, color, radius = 1.0, duration = 150) {
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2); // 円形のテクスチャを貼るための正方形
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
        map: null, // 後で円形テクスチャを生成して設定
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending // 加算合成で明るくする
    });

    // 円形のテクスチャを動的に生成
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); // 中心は白
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)'); // 外側は透明
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    material.map = new THREE.CanvasTexture(canvas);
    material.needsUpdate = true;

    const groundFlash = new THREE.Mesh(geometry, material);
    groundFlash.position.copy(position);
    groundFlash.position.y = -FLOOR_HEIGHT + 0.01; // 地面より少し浮かせ、z-fightingを防ぐ
    groundFlash.rotation.x = -Math.PI / 2; // 地面に平行に配置
    scene.add(groundFlash);

    // 徐々にフェードアウトするアニメーション
    new TWEEN.Tween(material)
        .to({ opacity: 0 }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(groundFlash);
            groundFlash.geometry.dispose();
            groundFlash.material.dispose();
            material.map.dispose(); // テクスチャも破棄
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

// 外灯を1つ作成する関数
function createStreetLight(position) {
    const lightGroup = new THREE.Group();

    // 柱
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 5 - FLOOR_HEIGHT;
    lightGroup.add(pole);

    // 笠
    const shadeGeometry = new THREE.CylinderGeometry(0, 1, 1, 8);
    const shadeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = 10.5 - FLOOR_HEIGHT;
    lightGroup.add(shade);

    // 光源
    const pointLight = new THREE.PointLight(0xffddaa, 0, 50, 2); // 初期強度は0
    pointLight.position.y = 10 - FLOOR_HEIGHT;
    lightGroup.add(pointLight);

    lightGroup.position.copy(position);
    scene.add(lightGroup);
    streetLights.push(lightGroup);
}

// すべての外灯を作成する関数
function createStreetLights() {
    // 既に作成済みの場合は何もしない
    if (streetLights.length > 0) {
        return;
    }

    const numLights = 8; // 外灯の数
    const radius = ARENA_RADIUS + 5; // アリーナの外側に配置

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
const RESPAWN_DELAY = 10;

const AI_INITIAL_POSITION = new THREE.Vector3(0, 0, 20);
const NUM_RANDOM_OBSTACLES = 20; 

const defaultObstaclesConfig = [
    {x: 5, z: 5, height: 1.8}, {x: -5, z: -5}, {x: 0, z: 10, height: 1.8}, {x: 10, z: 0}, {x: -10, z: 5}, {x: 5, z: -10},
    {x: 15, z: 15, height: 1.8}, {x: -15, z: 15}, {x: 15, z: -15, height: 1.8}, {x: -15, z: -15}, {x: 0, z: -18, height: 1.8}, {x: -18, z: 0},
    {x: 25, z: 0, width: 0.5, depth: 10}, {x: -25, z: 0, width: 0.5, depth: 10}, {x: 0, z: 25, width: 10, depth: 0.5}, {x: 0, z: -25, width: 10, depth: 0.5},
    {x: 20, z: 20, height: 1.8}, {x: -20, z: 20}, {x: 20, z: -20, height: 1.8}, {x: -20, z: -20},
    {x: 35, z: 10, width: 0.5, depth: 8}, {x: -35, z: 10, width: 0.5, depth: 8}, {x: 10, z: 35, width: 8, depth: 0.5}, {x: -10, z: 35, width: 8, depth: 0.5},
    {x: 30, z: -30, height: 1.8}, {x: -30, z: -30},
    {x: 40, z: 0, width: 0.5, depth: 15}, {x: -40, z: 0, width: 0.5, depth: 15}, {x: 0, z: 40, width: 15, depth: 0.5, height: 1.8}, {x: 0, z: -40, width: 15, depth: 0.5},
    {x: 0, z: -30, width: 2, height: 1.8, depth: 2},  // Adjusted half-height obstacles
    {x: 10, z: -35, width: 2, height: 1.8, depth: 2},
    {x: -10, z: -35, width: 2, height: 1.8, depth: 2},
    {x: 20, z: -25, width: 3, height: 1.8, depth: 3},
    {x: -20, z: -25, width: 3, height: 1.8, depth: 3},
    {x: 30, z: -15, width: 2, height: 1.8, depth: 2}
];

function getRandomSafePosition() {
    const MAX_ATTEMPTS = 50;
    const MIN_DISTANCE_FROM_PLAYER = 15;
    const MIN_DISTANCE_FROM_OBSTACLE = 5;
    const MIN_DISTANCE_BETWEEN_PICKUPS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (ARENA_RADIUS - ARENA_EDGE_THICKNESS - 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const newPosition = new THREE.Vector3(x, 0, z);
        if (newPosition.distanceTo(PLAYER_INITIAL_POSITION) < MIN_DISTANCE_FROM_PLAYER) continue;
        let collisionDetected = false;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            const obstacleCenter = obstacleBox.getCenter(new THREE.Vector3());
            const distance = newPosition.distanceTo(obstacleCenter);
            const obstacleSize = obstacleBox.getSize(new THREE.Vector3());
            const effectiveObstacleRadius = Math.max(obstacleSize.x, obstacleSize.z) / 2;
            if (distance < MIN_DISTANCE_FROM_OBSTACLE + effectiveObstacleRadius) {
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
    return new THREE.Vector3(0, 0, 0); 
}

function createWeaponPickup(text, position, weaponType) {
    if (!font) {
        console.warn("Font not loaded, using basic box for weapon pickup.");
        const boxWidth = 1; // 短辺
        const boxHeight = 0.8; // 高さを低く変更
        const boxDepth = 2; // 長辺
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const material = new THREE.MeshLambertMaterial({ color: 0x006400 }); // 深緑色
        const box = new THREE.Mesh(geometry, material);
        box.position.copy(position);
        box.position.y = (boxHeight / 2) - FLOOR_HEIGHT;
        box.userData = { type: 'weaponPickup', weaponType: weaponType };
        scene.add(box);
        weaponPickups.push(box);
        return box;
    }

    const pickupGroup = new THREE.Group();

    // 1. 深緑色のボックスを作成
    const boxWidth = 1; // 短辺
    const boxHeight = 0.8; // 高さを低く変更
    const boxDepth = 2; // 長辺
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x006400 }); // 深緑色
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.y = boxHeight / 2; // グループ内でY座標を調整
    pickupGroup.add(boxMesh);

    // 2. 白色の武器コードテキストを作成
    const textOptions = {
        font: font,
        size: 0.35, // サイズを半減
        height: 0.2, // 文字の厚み
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 5
    };
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // 白色

    // ====== 左側面用テキスト (短辺側) ======
    const textGeometryLeft = new THREE.TextGeometry(text, textOptions);
    textGeometryLeft.computeBoundingBox();
    textGeometryLeft.translate(
        -0.5 * (textGeometryLeft.boundingBox.max.x - textGeometryLeft.boundingBox.min.x),
        -0.5 * (textGeometryLeft.boundingBox.max.y - textGeometryLeft.boundingBox.min.y),
        -0.5 * (textGeometryLeft.boundingBox.max.z - textGeometryLeft.boundingBox.min.z)
    );
    const textMeshLeft = new THREE.Mesh(textGeometryLeft, textMaterial);
    textMeshLeft.position.y = boxHeight / 2; // ボックスのY中心に配置
    textMeshLeft.position.x = -boxWidth / 2 + (textOptions.height / 2); // ボックスの左側面 (内側に少しめり込む)
    textMeshLeft.rotation.y = -Math.PI / 2; // Y軸周りに-90度回転 (反転修正)
    pickupGroup.add(textMeshLeft);

    // ====== 右側面用テキスト (短辺側) ======
    const textGeometryRight = new THREE.TextGeometry(text, textOptions);
    textGeometryRight.computeBoundingBox();
    textGeometryRight.translate(
        -0.5 * (textGeometryRight.boundingBox.max.x - textGeometryRight.boundingBox.min.x),
        -0.5 * (textGeometryRight.boundingBox.max.y - textGeometryRight.boundingBox.min.y),
        -0.5 * (textGeometryRight.boundingBox.max.z - textGeometryRight.boundingBox.min.z)
    );
    const textMeshRight = new THREE.Mesh(textGeometryRight, textMaterial);
    textMeshRight.position.y = boxHeight / 2; // ボックスのY中心に配置
    textMeshRight.position.x = boxWidth / 2 - (textOptions.height / 2); // ボックスの右側面 (内側に少しめり込む)
    textMeshRight.rotation.y = Math.PI / 2; // Y軸周りに90度回転 (反転修正)
    pickupGroup.add(textMeshRight);

    // BOXとテキストのグループ全体のY座標を調整 (地面からの高さ)
    pickupGroup.position.copy(position);
    pickupGroup.position.y = -FLOOR_HEIGHT; // グループ全体が地面に接するように

    // userDataをグループに設定
    pickupGroup.userData = { type: 'weaponPickup', weaponType: weaponType };

    scene.add(pickupGroup);
    weaponPickups.push(pickupGroup);
    return pickupGroup;
}

function createWeaponPickups() {
    for (let i = 0; i < gameSettings.mgCount; i++) {
        createWeaponPickup('MG', getRandomSafePosition(), WEAPON_MG);
    }
    for (let i = 0; i < gameSettings.rrCount; i++) {
        createWeaponPickup('RL', getRandomSafePosition(), WEAPON_RR);
    }
    for (let i = 0; i < gameSettings.srCount; i++) {
        createWeaponPickup('SR', getRandomSafePosition(), WEAPON_SR);
    }
    for (let i = 0; i < gameSettings.sgCount; i++) { // ショットガンを追加
        createWeaponPickup('SG', getRandomSafePosition(), WEAPON_SG);
    }
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
        case 0: ladderGroup.position.set(0, 0, obstacleSize.z / 2 + offset); break; // +z
        case 1: ladderGroup.position.set(0, 0, -obstacleSize.z / 2 - offset); break; // -z
        case 2: ladderGroup.position.set(obstacleSize.x / 2 + offset, 0, 0); ladderGroup.rotation.y = Math.PI / 2; break; // +x
        case 3: ladderGroup.position.set(-obstacleSize.x / 2 - offset, 0, 0); ladderGroup.rotation.y = -Math.PI / 2; break; // -x
    }
    
    obstacle.add(ladderGroup);

    // ★ センサーエリア生成ロジックの修正
    const sensorAreaDepth = 3; // センサーエリアの奥行き
    const sensorAreaWidth = 3; // センサーエリアの幅
    const sensorAreaHeight = 3; // センサーエリアの高さ（プレイヤーの高さを含むように）

    const sensorGeometry = new THREE.BoxGeometry(sensorAreaWidth, sensorAreaHeight, sensorAreaDepth);
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.3 }); // 青色の半透明
    const sensorArea = new THREE.Mesh(sensorGeometry, sensorMaterial);
    sensorArea.name = 'ladderSensorArea'; // 識別用の名前

    // センサーエリアの奥行き半分 + 梯子の壁からのオフセット (プレイヤーの体分手前)
    const offsetFromLadderWall = sensorAreaDepth / 2 - 0.5; // センサーが梯子に少しめり込むように調整
    
    // まずセンサーエリアの回転を梯子のそれに合わせる
    sensorArea.rotation.y = ladderGroup.rotation.y;

    // 梯子のワールド位置と障害物のワールド位置から方向ベクトルを計算
    const ladderWorldPosition = new THREE.Vector3();
    ladderGroup.getWorldPosition(ladderWorldPosition); // 梯子のワールド位置

    const obstacleWorldPosition = obstacle.position.clone();

    const directionFromObstacleCenterToLadder = ladderWorldPosition.clone().sub(obstacleWorldPosition);
    directionFromObstacleCenterToLadder.y = 0; // 水平方向のみ
    directionFromObstacleCenterToLadder.normalize(); // 正規化

    // センサーエリアの中心位置を計算
    // 梯子のワールド位置から、梯子の方向ベクトルに沿って offsetFromLadderWall だけずらす
    sensorArea.position.copy(ladderWorldPosition.add(directionFromObstacleCenterToLadder.multiplyScalar(offsetFromLadderWall)));
    sensorArea.position.y = (sensorAreaHeight / 2) - FLOOR_HEIGHT; // 地面を基準に配置

    sensorArea.userData.obstacle = obstacle; 
    sensorArea.userData.ladderPos = ladderWorldPosition; // ここは修正後も梯子の位置を保存しておく
    sensorArea.visible = false; // 非表示にする
    
    scene.add(sensorArea);
    ladderSwitches.push(sensorArea);

    return face; // はしごが設置された面を返す
}

function addRooftopFeatures(obstacle, ladderFace) {
    if (!obstacle.userData.rooftopParts) {
        obstacle.userData.rooftopParts = [];
    }

    const buildingWidth = obstacle.geometry.parameters.width;
    const buildingHeight = obstacle.geometry.parameters.height;
    const buildingDepth = obstacle.geometry.parameters.depth;

    // 1. Add rooftop floor for collision
    const rooftopY = obstacle.position.y + (buildingHeight / 2);
    const rooftopFloorGeometry = new THREE.BoxGeometry(buildingWidth, 0.1, buildingDepth);
    const rooftopFloorMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.0 }); // Invisible but collidable
    const rooftopFloor = new THREE.Mesh(rooftopFloorGeometry, rooftopFloorMaterial);
    rooftopFloor.position.set(obstacle.position.x, rooftopY, obstacle.position.z);
    rooftopFloor.userData.parentBuilding = obstacle; // Link to the main building body
    rooftopFloor.userData.isRooftop = true; // 屋上の床であることを示すフラグ
    scene.add(rooftopFloor);
    obstacles.push(rooftopFloor);
    obstacle.userData.rooftopParts.push(rooftopFloor); // 親のパーツリストに追加

    // 2. Add rooftop cover walls
    const wallHeight = 1.0;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x880000 });
    
    const wallDefs = [
        // +z 方向の壁 (X軸方向に buildingWidth の長さ)
        { face: 0, w: buildingWidth, h: wallHeight, d: wallThickness, ox: 0, oz: buildingDepth / 2 - wallThickness / 2 },
        // -z 方向の壁 (X軸方向に buildingWidth の長さ)
        { face: 1, w: buildingWidth, h: wallHeight, d: wallThickness, ox: 0, oz: -(buildingDepth / 2 - wallThickness / 2) },
        // +x 方向の壁 (Z軸方向に buildingDepth の長さ)
        { face: 2, w: wallThickness, h: wallHeight, d: buildingDepth, ox: buildingWidth / 2 - wallThickness / 2, oz: 0 },
        // -x 方向の壁 (Z軸方向に buildingDepth の長さ)
        { face: 3, w: wallThickness, h: wallHeight, d: buildingDepth, ox: -(buildingWidth / 2 - wallThickness / 2), oz: 0 }
    ];

    const LADDER_WIDTH = 1.5; // 梯子の幅
    const LADDER_GAP = LADDER_WIDTH + 1.0; // 梯子のための隙間

    for (const def of wallDefs) {
        if (def.face === ladderFace) {
            // 梯子のある面なので、塀を2つに分割して生成
            const wallLength = def.w > def.d ? def.w : def.d; // 壁の長さを取得 (X or Z)
            const newWallLength = (wallLength - LADDER_GAP) / 2;
            
            if (newWallLength <= 0) continue; // 隙間を作るスペースがない場合は何もしない

            const wall1 = new THREE.Mesh(
                def.w > def.d ? new THREE.BoxGeometry(newWallLength, def.h, def.d) : new THREE.BoxGeometry(def.w, def.h, newWallLength),
                wallMaterial
            );
            const wall2 = wall1.clone();

            const offset = (wallLength / 2) - (newWallLength / 2);

            if (def.w > def.d) { // Z軸に平行な壁
                wall1.position.set(obstacle.position.x + def.ox - offset, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
                wall2.position.set(obstacle.position.x + def.ox + offset, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
            } else { // X軸に平行な壁
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
            // 通常の塀を生成
            const wallGeometry = new THREE.BoxGeometry(def.w, def.h, def.d);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(
                obstacle.position.x + def.ox,
                rooftopY + (def.h / 2),
                obstacle.position.z + def.oz
            );
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
    box.userData.hp = hp; // HPをuserDataに保存
    scene.add(box);
    obstacles.push(box);

    let ladderFace = -1; // はしごがない場合は -1
    // 一定以上の高さの障害物には梯子を追加
    if (height > DEFAULT_OBSTACLE_HEIGHT * 1.5) {
        ladderFace = createAndAttachLadder(box);
    }

    // 窓と屋上の機能を追加
    if (height >= 8) {
        createWindows(box, width, height, depth);
        addRooftopFeatures(box, ladderFace);
    }

    const HIDING_DISTANCE = 1.5; 
    // HIDING_SPOTSに位置情報と関連する障害物情報を格納
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
}

function createSniperTower(x, z) {
    const TOWER_WIDTH = 6;
    const TOWER_DEPTH = 6;
    const TOWER_HEIGHT = DEFAULT_OBSTACLE_HEIGHT * 3; // DEFAULT_OBSTACLE_HEIGHTは3.0なので、TOWER_HEIGHTは9.0
    const towerYPos = (TOWER_HEIGHT / 2) - FLOOR_HEIGHT;

    // 1. Create the main tower structure
    const towerGeometry = new THREE.BoxGeometry(TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x4A4A4A }); // Dark grey
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(x, towerYPos, z);
    
    // 塔本体に userData を追加
    tower.userData.isTower = true;
    // 塔のHPを計算 (例: 通常障害物の体積比を考慮)
    const DEFAULT_OBSTACLE_VOLUME = 2 * DEFAULT_OBSTACLE_HEIGHT * 2; // 幅2, 高さDEFAULT_OBSTACLE_HEIGHT, 奥行き2
    const TOWER_VOLUME = TOWER_WIDTH * TOWER_HEIGHT * TOWER_DEPTH;
    // HPは体積比の約半分 (おおよそ1ロケット弾で0.5ダメージ)
    tower.userData.hp = Math.round(TOWER_VOLUME / DEFAULT_OBSTACLE_VOLUME / 2); // おおよそ20HP
    
    scene.add(tower);
    obstacles.push(tower);

    // 2. Determine the outward face for the ladder (0: +z, 1: -z, 2: +x, 3: -x)
    let ladderFace;
    // Simplified logic: Place ladder on the face furthest from the center (0,0)
    if (Math.abs(x) > Math.abs(z)) {
        ladderFace = x > 0 ? 2 : 3; // Furthest on X-axis, so ladder on +x or -x face
    } else {
        ladderFace = z > 0 ? 0 : 1; // Furthest on Z-axis, so ladder on +z or -z face
    }

    // 3. Attach the ladder
    ladderFace = createAndAttachLadder(tower, ladderFace);

    // 4. 窓の追加 (スナイパータワーは常に高さ8以上なので条件分岐は不要)
    createWindows(tower, TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH);

    // 5. Add rooftop features
    addRooftopFeatures(tower, ladderFace);
}

function generateObstaclePositions(count) {
    const generatedConfigs = [];
    const MIN_OBSTACLE_SIZE = 2;
    const MAX_OBSTACLE_SIZE = 15;

    const playerExclusionBox = new THREE.Box3().setFromCenterAndSize(
        PLAYER_INITIAL_POSITION,
        new THREE.Vector3(5, BODY_HEIGHT + (2 * HEAD_RADIUS), 5)
    );
    // 全てのAI初期位置の除外ボックスを作成
    const aiExclusionBoxes = AI_INITIAL_POSITIONS.map(pos => {
        return new THREE.Box3().setFromCenterAndSize(
            pos,
            new THREE.Vector3(5, BODY_HEIGHT + (2 * HEAD_RADIUS), 5)
        );
    });

    for (let i = 0; i < count; i++) {
        let positionFound = false;
        let attempts = 0;
        while (!positionFound && attempts < 100) {
            const width = Math.floor(Math.random() * (MAX_OBSTACLE_SIZE - MIN_OBSTACLE_SIZE + 1)) + MIN_OBSTACLE_SIZE;
            const depth = Math.floor(Math.random() * (MAX_OBSTACLE_SIZE - MIN_OBSTACLE_SIZE + 1)) + MIN_OBSTACLE_SIZE;
            
            // 障害物のサイズを考慮して中心座標の生成範囲を制限
            const effectiveRadius = ARENA_RADIUS - ARENA_EDGE_THICKNESS - Math.max(width, depth) / 2;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * effectiveRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const newObstacleBox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(x, 0, z),
                new THREE.Vector3(width, BODY_HEIGHT + (2 * HEAD_RADIUS), depth)
            );
            
            // プレイヤーおよび全てのAIのスポーン地点との衝突を確認
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

            // 既存の障害物とのオーバーラップを確認
            let overlapsWithExisting = false;
            for (const existingConfig of generatedConfigs) {
                const existingObstacleBox = new THREE.Box3().setFromCenterAndSize(
                    new THREE.Vector3(existingConfig.x, 0, existingConfig.z),
                    new THREE.Vector3(existingConfig.width, BODY_HEIGHT + (2 * HEAD_RADIUS), existingConfig.depth)
                );
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
    console.log('resetObstacles called. Current mapType:', gameSettings.mapType, 'customMapName:', gameSettings.customMapName);
    for (const obstacle of obstacles) {
        if (obstacle.parent) { 
            obstacle.parent.remove(obstacle);
        }
    }
    obstacles.length = 0;
    HIDING_SPOTS.length = 0;

    // スイッチもクリアする
    for (const ladderSwitch of ladderSwitches) {
        scene.remove(ladderSwitch);
    }
    ladderSwitches.length = 0;

    let obstaclesToCreate = [];
    
    // gameSettings.mapType の値に応じて障害物の設定を分岐
    if (gameSettings.mapType === 'random') {
        obstaclesToCreate = generateObstaclePositions(NUM_RANDOM_OBSTACLES);
        console.log('Generating random obstacles:', obstaclesToCreate.length);
    } else if (gameSettings.mapType === 'custom') {
        const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
        const selectedMapData = allCustomMaps[gameSettings.customMapName];
        console.log('All Custom Maps:', allCustomMaps);
        console.log('Selected Map Data:', selectedMapData);

        if (selectedMapData) {
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    obstaclesToCreate = selectedMapData.obstacles;
                    console.log('Custom map obstacles to create:', obstaclesToCreate.length);
                } else {
                    console.warn('Selected custom map data has no obstacles. Falling back to default map.');
                    obstaclesToCreate = defaultObstaclesConfig;
                }
            } catch (e) {
                console.error("Error parsing selected custom map data. Falling back to default map.", e);
                obstaclesToCreate = defaultObstaclesConfig; // パースに失敗したらデフォルトを使用
            }
        } else {
            console.warn('No selected custom map data found for name:', gameSettings.customMapName, 'Falling back to default map.');
            obstaclesToCreate = defaultObstaclesConfig;
        }
    } else { // 'default' またはそれ以外の場合
        console.log('Loading default map obstacles.');
        obstaclesToCreate = defaultObstaclesConfig;
        createSniperTower(35, -35); // Player side tower
        createSniperTower(-35, 35); // AI side tower
    }

    for (const config of obstaclesToCreate) {
        // config.height, config.color, config.hp がなければ undefined を渡し、createObstacle側のデフォルト値を使わせる
        createObstacle(config.x, config.z, config.width, config.height || undefined, config.depth, config.color || undefined, config.hp || undefined);
    }
}

const AI_INITIAL_POSITIONS = [
    new THREE.Vector3(0, 0, 20),   // 中央前方
    new THREE.Vector3(25, 0, 10),  // 右前方
    new THREE.Vector3(-25, 0, 10), // 左前方
    new THREE.Vector3(0, 0, -20),  // 中央後方 (4体目以降用に追加)
    new THREE.Vector3(20, 0, -20), // 右後方
    new THREE.Vector3(-20, 0, -20),// 左後方
];
resetObstacles(); 


// Player model for death animation
let playerBody, playerHead, playerModel;
let isPlayerDeathPlaying = false;

const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff }); // Blue
playerBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, BODY_HEIGHT, 1.0), playerMaterial);
playerHead = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 16, 16), playerMaterial);
playerBody.position.y = BODY_HEIGHT / 2;
playerHead.position.y = BODY_HEIGHT + HEAD_RADIUS;

playerModel = new THREE.Group();
playerModel.add(playerBody);
playerModel.add(playerHead);
player.add(playerModel);
playerModel.visible = false;


const AI_SPEED = 15.0;      
const HIDE_DURATION = 3.0;  
const ATTACK_DURATION = 1.0; 
const FLANK_COOLDOWN = 10.0; // 回り込みのクールダウン (秒)
const MIN_DISTANCE_BETWEEN_AIS_AT_SPOT = 10.0; // AIがスポットに固まらないための最低距離
const EVASION_RANGE = 3.5; 
const ARRIVAL_THRESHOLD = 1.0; 
const AVOIDANCE_RAY_DISTANCE = 3.0; 
const FIRING_RATE = 0.2; 
const EXPLOSION_RADIUS = 25;
const EXPLOSION_FORCE = 50;

const ais = [];

function createAI(color) {
    const bodyGeometry = new THREE.BoxGeometry(1.0, BODY_HEIGHT, 1.0);
    const headGeometry = new THREE.SphereGeometry(HEAD_RADIUS, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, material);
    const head = new THREE.Mesh(headGeometry, material);
    body.position.y = BODY_HEIGHT / 2;
    head.position.y = BODY_HEIGHT + HEAD_RADIUS;
    const aiObject = new THREE.Group();
    aiObject.add(body);
    aiObject.add(head);
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
    aiObject.aggression = Math.random(); // 好戦性 (0.0 - 1.0) を追加
    aiObject.flankAggression = Math.random(); // 回り込み積極性 (0.0 - 1.0) を追加
    aiObject.lastFlankTime = 0; // 最後に回り込みを試みた時間
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
    
    // AIからプレイヤーへの方向
    const directionToPlayer = new THREE.Vector3().subVectors(playerPos, aiHeadPos).normalize();
    
    // プレイヤーからAIへの方向（逆方向）
    const directionFromPlayer = directionToPlayer.negate();

    // AIの背後方向にレイを飛ばし、障害物があるかチェック
    // レイの開始位置をAIの頭部ではなく、AIの少し手前に調整し、障害物の前面に当たるようにする
    const rayOrigin = aiHeadPos.clone().add(directionFromPlayer.clone().multiplyScalar(1.0)); // AIの頭から少し離れた位置

    raycaster.set(rayOrigin, directionFromPlayer);
    const intersects = raycaster.intersectObjects(obstacles, true);

    if (intersects.length > 0) {
        const hitObstacle = intersects[0].object;
        const obstacleBox = new THREE.Box3().setFromObject(hitObstacle);
        const obstacleHeight = obstacleBox.max.y - obstacleBox.min.y;

        // 障害物がAIを隠せる十分な高さがあるか
        const aiStandingHeight = BODY_HEIGHT + HEAD_RADIUS * 2; // AIの立ち身長 (約3.0)
        if (obstacleHeight >= aiStandingHeight * 0.8) { // AIの大部分を隠せる高さ
            // さらに、AIが障害物の陰に十分に隠れているかを確認するため、
            // AIからプレイヤーへの視線が障害物によって遮られているかもチェックする
            // （isVisibleToPlayerの逆のチェックに近い）
            return !isVisibleToPlayer(ai);
        }
    }
    return false; // 隠れる障害物がない、または不十分
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

    const aiStandingHeight = BODY_HEIGHT + HEAD_RADIUS * 2; // AIの立ち姿勢の全高 (3.0)
    const aiCrouchingHeight = aiStandingHeight * 0.7; // AIのしゃがみ姿勢の全高 (2.1)

    // 隠れるのに適したスポットのリスト
    const viableCrouchSpots = [];
    // 通常のスポットのリスト
    const regularSpots = [];

    for (const spotInfo of HIDING_SPOTS) { // spotはspotInfoオブジェクトに変更
        const spotPosition = spotInfo.position; // spotInfo.positionを使用
        const obstacle = spotInfo.obstacle; // spotInfo.obstacleを使用

        // 障害物がない、または既に破壊されている場合はスキップ
        if (!obstacle || !obstacle.parent) continue;

        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        const obstacleHeight = obstacleBox.max.y - obstacleBox.min.y;

        // 障害物がAIの立ち姿勢より低く、かつAIがしゃがむことで隠れられる高さの場合
        if (obstacleHeight < aiStandingHeight && obstacleHeight >= aiCrouchingHeight * 0.8) {
            viableCrouchSpots.push(spotInfo); // しゃがんで隠れるのに適したスポット
        } else {
            regularSpots.push(spotInfo); // 通常のスポット
        }
    }

    let spotsToConsider = viableCrouchSpots;
    if (spotsToConsider.length === 0) {
        spotsToConsider = regularSpots; // しゃがんで隠れるスポットがなければ、通常のスポットを考慮
    }
    if (spotsToConsider.length === 0) return false; // 考慮するスポットがなければ終了

    // 考慮するスポットの中から最適なものを選ぶ
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
            bestSpot = spotInfo; // bestSpotもspotInfoオブジェクトを格納
        }
    }

    if (bestSpot) {
        ai.state = 'MOVING';
        ai.targetPosition.copy(bestSpot.position); // bestSpot.positionを使用
        ai.avoiding = false;
        return true;
    }
    return false;
}

function findObstacleAvoidanceSpot(ai, currentMoveDirection, originalTargetPosition) {
    const currentAIPos = ai.position.clone();
    
    // 現在の移動方向に対して垂直な方向（左右）を計算
    const perpendicularDirectionLeft = new THREE.Vector3(-currentMoveDirection.z, 0, currentMoveDirection.x).normalize();
    const perpendicularDirectionRight = new THREE.Vector3(currentMoveDirection.z, 0, -currentMoveDirection.x).normalize();

    // 左右どちらに迂回するかをランダムに決定 (ここではランダムで、将来的には目標地点への角度を考慮する)
    const evasionDirection = Math.random() > 0.5 ? perpendicularDirectionLeft : perpendicularDirectionRight;

    // 迂回ターゲット地点を計算
    const evasionTarget = currentAIPos.clone().add(evasionDirection.multiplyScalar(AVOIDANCE_RAY_DISTANCE * 2));
    
    // 元の目標地点への方向をブレンドする (よりスムーズな迂回のため)
    evasionTarget.lerp(originalTargetPosition, 0.3); // 30%は最終目標地点の方向に
    evasionTarget.y = 0;

    ai.avoiding = true;
    ai.targetPosition.copy(evasionTarget); 
}

function findAndTargetWeapon(ai) {
    const needsUpgrade = (ai.currentWeapon === WEAPON_PISTOL || 
                         (ai.currentWeapon === WEAPON_MG && ai.ammoMG < 10) || 
                         (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 1) ||
                         (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 1));

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
    // グローバル設定から弾速の倍率を適用
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
    const projectileLife = (weaponType === WEAPON_SG) ? SHOTGUN_RANGE / finalSpeed : Infinity; // ショットガンは短寿命
    projectiles.push({ mesh: bullet, velocity: velocity, isRocket: isRocket, source: source, isSniper: isSniper, weaponType: weaponType, life: projectileLife });
}

function createExplosionEffect(position) {
    // 1. 中心の明るい光
    const coreLight = new THREE.PointLight(0xffffff, 300, 15); // 強度と距離を調整
    coreLight.position.copy(position);
    scene.add(coreLight);
    new TWEEN.Tween(coreLight)
        .to({ intensity: 0 }, 500) // 0.5秒で消える
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => scene.remove(coreLight))
        .start();

    // 2. 爆発のメインエフェクト
    const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 1.0 });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(position);
    scene.add(explosionMesh);
    const scaleTarget = 40; // スケールを大きく
    const duration = 0.8; // 持続時間を長く
    new TWEEN.Tween(explosionMesh.scale)
        .to({ x: scaleTarget, y: scaleTarget, z: scaleTarget }, duration * 1000)
        .easing(TWEEN.Easing.Exponential.Out) // Easingを変更して勢いを出す
        .start();
    new TWEEN.Tween(explosionMaterial)
                .to({ opacity: 0 }, duration * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(explosionMesh);
            explosionMesh.geometry.dispose();
            explosionMesh.material.dispose();
        }).start();

    // 3. 周囲の煙エフェクト
    for (let i = 0; i < 5; i++) {
        createSmokeEffect(position.clone().add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 10
            )
        ));
    }
}

function destroyObstacle(obstacle, explosionPosition) {
    const obstacleIndex = obstacles.indexOf(obstacle);
    if (obstacleIndex > -1) {
        obstacles.splice(obstacleIndex, 1);
    } else {
        return;
    }

    // 屋上パーツ（床や塀）も一緒に削除する
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

    // 梯子グループとセンサーエリアの削除
    // 1. 梯子グループを障害物から削除
    const ladderGroup = obstacle.children.find(child => child.name === 'ladder');
    if (ladderGroup) {
        obstacle.remove(ladderGroup);
        // 必要に応じてladderGroupのdisposeも行う
        // ladderGroup.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
    }

    // 2. 関連するセンサーエリアをladderSwitches配列とシーンから削除
    for (let i = ladderSwitches.length - 1; i >= 0; i--) {
        const sensorArea = ladderSwitches[i];
        if (sensorArea.userData.obstacle === obstacle) {
            scene.remove(sensorArea);
            ladderSwitches.splice(i, 1);
            // 必要に応じてsensorAreaのdisposeも行う
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
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
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
    const SMOKE_PARTICLE_COUNT = 7; // パーティクル数を15から7に半減
    for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
        const smokeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, 
            transparent: true,
            opacity: 0.8 
        });
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5); 
        smoke.position.copy(position).add(offset);
        scene.add(smoke);

        const scaleTarget = 5 + Math.random() * 5; 
        const duration = 0.4 + Math.random() * 0.25; // 表示時間を約半分に短縮
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
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, 
        transparent: true,
        opacity: 0.8
    });
    const particle = new THREE.Mesh(trailGeometry, trailMaterial);
    particle.position.copy(position);
    scene.add(particle);

    const duration = 0.8 + Math.random() * 0.5;
    new TWEEN.Tween(particle.scale)
        .to({ x: 0.01, y: 0.01, z: 0.01 }, duration * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(trailMaterial)
        .to({ opacity: 0 }, duration * 1000)
        .easing(TWEEN.Easing.Linear.None)
        .onComplete(() => {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        })
        .start();
}

function handleFirePress() {
    if (!isGameRunning || playerHP <= 0) return;

    if (currentWeapon === WEAPON_SR) {
        if (ammoSR > 0 && !isScoping) {
            const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
            if (timeSinceLastFire > FIRE_RATE_SR) {
                isScoping = true;
                scopeOverlay.style.display = 'block';
                document.getElementById('crosshair').style.display = 'none';
                if (gameSettings.nightModeEnabled) { // Night Modeが有効ならナイトビジョンオーバーレイを表示
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

function handleFireRelease() {
    if (!isGameRunning) return;

    if (isScoping) {
        isScoping = false;
        document.getElementById('night-vision-overlay').style.display = 'none'; // ナイトビジョンオーバーレイを非表示に
        
        const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
        if (ammoSR > 0 && timeSinceLastFire > FIRE_RATE_SR) {
            
            srGunSound.cloneNode(true).play().catch(e => console.error("Audio playback failed:", e));

            const startPosition = new THREE.Vector3();
            player.getWorldPosition(startPosition);
            let direction = new THREE.Vector3(); // directionの定義をここに移動
            camera.getWorldDirection(direction);
            
            // 狙撃銃発砲フラッシュの生成
            const playerMuzzlePosition = startPosition.clone().add(direction.clone().multiplyScalar(1.0)); // プレイヤーの体の前方1.0ユニット先に銃口があると仮定
            createMuzzleFlash(playerMuzzlePosition, 120, 2.7, 120, 0xffff00); // 強度と距離を微増



            createProjectile(startPosition, direction, 0xffff00, 0.1, false, 'player', projectileSpeed * 2, true);

            lastFireTime = clock.getElapsedTime();
            if (--ammoSR === 0) {
                 setTimeout(() => { 
                    currentWeapon = WEAPON_PISTOL;
                    scopeOverlay.style.display = 'none';
                    document.getElementById('crosshair').style.display = 'block';
                    document.getElementById('night-vision-overlay').style.display = 'none'; // ここでも非表示に
                    new TWEEN.Tween(camera).to({ fov: 75 }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
                }, 100);
            }
        }
        setTimeout(() => { 
            if(!isScoping) { 
                scopeOverlay.style.display = 'none';
                document.getElementById('crosshair').style.display = 'block';
                document.getElementById('night-vision-overlay').style.display = 'none'; // ここでも非表示に
                new TWEEN.Tween(camera).to({ fov: 75 }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
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
        case WEAPON_PISTOL:
            canFire = true;
            fireRate = FIRE_RATE_PISTOL;
            break;
        case WEAPON_MG:
            if (ammoMG > 0) {
                canFire = true;
                projectileColor = 0xffff00;
                fireRate = FIRE_RATE_MG;
            }
            break;
        case WEAPON_RR:
            if (ammoRR > 0) {
                canFire = true;
                projectileColor = 0xff8c00;
                projectileSize = 0.5;
                fireRate = FIRE_RATE_RR;
            }
            break;
        case WEAPON_SG: // ショットガンを追加
            if (ammoSG > 0) {
                canFire = true;
                projectileColor = 0xffa500; // ショットガンの弾の色
                projectileSize = 0.05; // ショットガンの弾は小さい
                fireRate = FIRE_RATE_SG;
            }
            break;
    }
    const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
    if (canFire && timeSinceLastFire > fireRate) {
        let soundToPlay = playerGunSound;
        if (currentWeapon === WEAPON_MG) soundToPlay = mgGunSound;
        else if (currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (currentWeapon === WEAPON_SG) soundToPlay = playerSgSound; // ショットガン音
        playSound(soundToPlay);
        
        const startPosition = new THREE.Vector3();
        player.getWorldPosition(startPosition); 

        // プレイヤー発砲フラッシュの生成
        let baseDirection = new THREE.Vector3(); // baseDirectionの定義をここに移動
        camera.getWorldDirection(baseDirection);
        const playerMuzzlePosition = startPosition.clone().add(baseDirection.clone().multiplyScalar(1.0)); // プレイヤーの体の前方1.0ユニット先に銃口があると仮定
        createMuzzleFlash(playerMuzzlePosition, 100, 2.2, 100, 0xffff00); // 強度と距離を微増



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

        // ショットガン固有の発射ロジック
        if (currentWeapon === WEAPON_SG) {
            const upVector = new THREE.Vector3(0, 1, 0);
            const rightVector = new THREE.Vector3().crossVectors(baseDirection, upVector).normalize();
            const spreadStep = SHOTGUN_SPREAD_ANGLE / SHOTGUN_PELLET_COUNT;

            for (let i = 0; i < SHOTGUN_PELLET_COUNT; i++) {
                const angleOffset = (i - (SHOTGUN_PELLET_COUNT - 1) / 2) * spreadStep;
                const spreadDirection = baseDirection.clone();
                
                // 拡散を上下左右にランダムに少し広げる
                const randomAngleX = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;
                const randomAngleY = (Math.random() - 0.5) * SHOTGUN_SPREAD_ANGLE;

                spreadDirection.applyAxisAngle(upVector, angleOffset + randomAngleX); // 横方向の拡散
                spreadDirection.applyAxisAngle(rightVector, randomAngleY); // 縦方向の拡散
                
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
        } else if (currentWeapon === WEAPON_SG) { // ショットガン弾薬消費
            if (--ammoSG === 0) currentWeapon = WEAPON_PISTOL;
        }
    }
}

function aiShoot(ai, timeElapsed) {
    if (!isGameRunning || playerHP <= 0) return;

    const startPosition = ai.position.clone().add(new THREE.Vector3(0, ai.isCrouching ? BODY_HEIGHT * 0.75 * 0.5 : BODY_HEIGHT * 0.75, 0)); // AIの体の約3/4の高さから発射。しゃがみ時は半分の高さ
    const playerBodyPos = player.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    
    if (!checkLineOfSight(startPosition, playerBodyPos, obstacles)) {
        return; 
    }

    const direction = new THREE.Vector3().subVectors(playerBodyPos, startPosition);
    const distanceToPlayer = direction.length();
    direction.normalize();

    raycaster.set(startPosition, direction);
    const intersects = raycaster.intersectObjects(obstacles, true);

    if (intersects.length > 0 && intersects[0].distance < distanceToPlayer) {
        return; 
    }

    let canAIShoot = false;
    let aiProjectileColor = 0xffff00;
    let aiProjectileSize = 0.1;
    let aiFireRate = FIRING_RATE;
    let aiProjectileSpeed = projectileSpeed;
    switch (ai.currentWeapon) {
        case WEAPON_PISTOL:
            canAIShoot = true;
            aiFireRate = FIRING_RATE * (4.0 - ai.aggression * 3.0); // 発射サイクルを遅くするために乗数を変更
            break;
        case WEAPON_MG:
            if (ai.ammoMG > 0) {
                canAIShoot = true;
                aiFireRate = FIRING_RATE * (0.5 + (1.0 - ai.aggression) * 0.5); 
            }
            break;
        case WEAPON_RR:
            if (ai.ammoRR > 0) {
                canAIShoot = true;
                aiFireRate = FIRING_RATE * (5.0 - ai.aggression * 3.0); 
                aiProjectileSize = 0.5;
                aiProjectileColor = 0xff8c00; 
            }
            break;
        case WEAPON_SR:
            if (ai.ammoSR > 0) {
                canAIShoot = true;
                aiFireRate = FIRE_RATE_SR * (1.0 + (1.0 - ai.aggression) * 0.5); 
                aiProjectileColor = 0xffff00;
                aiProjectileSpeed = projectileSpeed * 2;
            }
            break;
        case WEAPON_SG: // ショットガンを追加
            if (ai.ammoSG > 0) {
                canAIShoot = true;
                aiFireRate = FIRE_RATE_SG; // プレイヤーと同じ発射レート
                aiProjectileColor = 0xffa500;
                aiProjectileSize = 0.05;
                // AIはプレイヤーの近くにいる場合、ショットガンを優先的に使うようにする
                if (distanceToPlayer < SHOTGUN_RANGE * 1.5) { // 有効射程の1.5倍以内なら積極的に使う
                    aiFireRate /= (1 + ai.aggression); // 好戦性が高いほど連射
                }
            }
            break;
    }
    if (timeElapsed - ai.lastAttackTime < aiFireRate) return; 
    if (canAIShoot) {
        let soundToPlay;
        if (ai.currentWeapon === WEAPON_MG) {
            soundToPlay = aimgGunSound;
        } else if (ai.currentWeapon === WEAPON_RR) { 
            soundToPlay = rrGunSound;
        } else if (ai.currentWeapon === WEAPON_SR) {
            soundToPlay = aiSrGunSound;
        } else if (ai.currentWeapon === WEAPON_SG) { // AIショットガン音
            soundToPlay = aiSgSound;
        } else {
            soundToPlay = aiGunSound;
        }
        playSound(soundToPlay);
        
        // aiMuzzlePosition をここで定義する (direction が初期化された後)
        const aiMuzzlePosition = startPosition.clone().add(direction.clone().multiplyScalar(1.0)); // AIの体の前方1.0ユニット先に銃口があると仮定

        // AI発砲フラッシュの生成 (PointLight)
        createMuzzleFlash(aiMuzzlePosition, 150, 3.0, 90, 0xffffff); // 強度と距離を微増

        // 地面発光を追加
        createGroundFlash(aiMuzzlePosition, 0xffffff, 1.5, 150); // 半径1.5、白色の地面発光

        // AI発砲火花 (白色の球体) の生成
        const sparkGeometry = new THREE.SphereGeometry(0.6, 8, 8); // 初期サイズを3倍に拡大
        const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }); // 白色, 透明度設定
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(aiMuzzlePosition); // 銃口位置に火花を生成
        scene.add(spark);

        // 火花の一瞬の表示と消滅アニメーション
        new TWEEN.Tween(spark.scale)
            .to({ x: 1.0, y: 1.0, z: 1.0 }, 50) // 最大サイズを大きく
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(spark.material)
            .to({ opacity: 0 }, 150) // 0.15秒でフェードアウト (持続時間を延長)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                scene.remove(spark);
                spark.geometry.dispose();
                spark.material.dispose();
            })
            .start();
        

        
        // ショットガン固有の発射ロジック
        if (ai.currentWeapon === WEAPON_SG) {
            const upVector = new THREE.Vector3(0, 1, 0);
            const rightVector = new THREE.Vector3().crossVectors(direction, upVector).normalize(); // AIの視線方向に対する右
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
        } else if (ai.currentWeapon === WEAPON_SG) { // ショットガン弾薬消費
            if (--ai.ammoSG === 0) ai.currentWeapon = WEAPON_PISTOL;
        }
    }
}

function aiCheckPickup(ai) {
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        if (!pickup.parent) continue;
        if (ai.position.distanceTo(pickup.position) < ARRIVAL_THRESHOLD + 0.5) {
            switch (pickup.userData.weaponType) {
                case WEAPON_MG: ai.currentWeapon = WEAPON_MG; ai.ammoMG = MAX_AMMO_MG; break;
                case WEAPON_RR: ai.currentWeapon = WEAPON_RR; ai.ammoRR = MAX_AMMO_RR; break;
                case WEAPON_SR: ai.currentWeapon = WEAPON_SR; ai.ammoSR = MAX_AMMO_SR; break;
                case WEAPON_SG: ai.currentWeapon = WEAPON_SG; ai.ammoSG = MAX_AMMO_SG; break; // ショットガンを追加
            }
            scene.remove(pickup);
            weaponPickups.splice(i, 1);
            respawningPickups.push({ weaponType: pickup.userData.weaponType, respawnTime: clock.getElapsedTime() + RESPAWN_DELAY });

            if (ai.targetWeaponPickup === pickup) {
                ai.targetWeaponPickup = null;
                ai.state = 'HIDING';
                ai.lastHiddenTime = clock.getElapsedTime();
            }
            break; 
        }
    }
}
// =========================================================================
// 入力イベントリスナー設定 (修正済み)
// =========================================================================

// 発射ボタンのイベントリスナー (エラー防止のため存在チェックを追加)
// 【元のコードの発射ボタン関連のイベントリスナーを全て差し替え】

// 【元のコードの fireBtn のイベントリスナーを全て差し替え】



const moveSpeed = 10.0;      
const lookSpeed = 0.006;     
let keyboardMoveVector = new THREE.Vector2(0, 0);
let joystickMoveVector = new THREE.Vector2(0, 0);

// ジョイスティックの設定
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
    // player.rotation.y -= movementX * lookSpeed; // 直接rotationを操作する代わりにrotateYを使用
    player.rotateY(-movementX * lookSpeed);
    let cameraRotationX = camera.rotation.x - movementY * lookSpeed;
    camera.rotation.x = THREE.MathUtils.clamp(cameraRotationX, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
}

document.addEventListener('mousedown', (event) => { if (!isGameRunning) return; if (event.button === 0) { handleFirePress(); } });
document.addEventListener('mouseup', (event) => { if (!isGameRunning) return; if (event.button === 0) { handleFireRelease(); } });
document.addEventListener('contextmenu', (event) => event.preventDefault());

// =========================================================================
// ★ 修正済み: 視点移動 (ルック) のタッチ入力処理
// 発射ボタンとの競合を防ぎ、上下視点移動の方向を適切に設定
// =========================================================================

let isLooking = false;
let lookTouchId = -1; 
let lastTouchX = 0;
let lastTouchY = 0;


// 👇 差し替え後の修正コード
document.addEventListener('touchstart', (event) => { 
    if (!isGameRunning || lookTouchId !== -1) return; 
    const halfWidth = window.innerWidth / 2; 
    
    for (let i = 0; i < event.changedTouches.length; i++) { 
        const touch = event.changedTouches[i]; 
        
        // ★ 修正点: 発射ボタン（fire-button）でのチェックを削除
        // 画面右半分をタッチしていれば、ルック操作として追跡を開始
        if (touch.clientX > halfWidth) { 
            
            // ただし、このタッチが発射ボタン上であれば、射撃処理も行う
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


// 注意: document.addEventListener('touchmove') と document.addEventListener('touchend') のロジックは、
// 前回修正した（lookTouchIdを追跡し、上下反転を修正した）コードをそのまま使用してください。

// 【document.addEventListener('touchmove', ...) が存在しない場合は追加】
document.addEventListener('touchmove', (event) => { 
    if (!isGameRunning || !isLooking || lookTouchId === -1) return; 
    
    let currentTouchX = 0; 
    let currentTouchY = 0; 
    let foundLookTouch = false; 

    for (let i = 0; i < event.changedTouches.length; i++) { 
        const touch = event.changedTouches[i]; 
        
        if (touch.identifier === lookTouchId) { // ★ 追跡しているIDの指の動きのみを処理
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
        
        // 左右の回転
        player.rotation.y -= dx * lookSpeed; 
        
        // 上下の回転 (符号を '-' に設定し、上下反転を解消)
        let cameraRotationX = camera.rotation.x - dy * lookSpeed; 
        camera.rotation.x = THREE.MathUtils.clamp(cameraRotationX, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1); 
        
        lastTouchX = currentTouchX; 
        lastTouchY = currentTouchY; 
    } 
}, { passive: false });


// 【document.addEventListener('touchend', ...) を差し替え】

// 👇 差し替え後の修正コード (ルック終了時に発射も停止させる)
document.addEventListener('touchend', (event) => { 
    if (!isGameRunning || lookTouchId === -1) return; 
    
    for (let i = 0; i < event.changedTouches.length; i++) { 
        const touch = event.changedTouches[i]; 
        
        if (touch.identifier === lookTouchId) {
            
            // ★ 追加修正点: ルック操作の指が離れたら、発射を停止する
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
    isCrouchingToggle = !isCrouchingToggle; // Toggle the state
    event.preventDefault(); // Prevent default touch behavior
}, { passive: false });
}


// =========================================================================
// ゲームループ・管理ロジック
// =========================================================================

// すべてのオーディオ要素を初期化/アンロックする関数
function initializeAudio() {
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
        const originalVolume = audio.volume;
        audio.volume = 0; // 一時的にミュート
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // 再生が開始されたらすぐに一時停止
                audio.pause();
                audio.currentTime = 0;
                audio.volume = originalVolume; // 音量を元に戻す
            }).catch(error => {
                // 自動再生がブロックされた場合のエラー。これは一般的なので、コンソールには表示しないか、情報として表示する程度にする
                // console.warn('Audio unlock failed for an element, this is expected on some browsers:', error);
                audio.volume = originalVolume; // エラー時も音量を元に戻す
            });
        }
    });
}

function startGame() {
    const startSc = document.getElementById('start-screen');
    if(startSc) startSc.style.display = 'none';
    
    if(renderer && renderer.domElement) {
        renderer.domElement.style.display = 'block';
    }

    // 外灯がなければ作成
    createStreetLights();

    if (gameSettings.nightModeEnabled) {
        ambientLight.intensity = 0.05;
        directionalLight.intensity = 0.05;
        renderer.setClearColor(0x111122); 
        streetLights.forEach(light => {
            const pointLight = light.children.find(child => child.isPointLight);
            if (pointLight) pointLight.intensity = 0.8;
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
    gameUI.forEach(id => { 
        const el = document.getElementById(id); 
        if (el) el.style.display = 'block'; 
    });

    // モバイル判定でUIを表示/非表示
    if ('ontouchstart' in window) { // タッチデバイスの場合
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button'); // 追加
        if(joy) joy.style.display = 'block';
        if(fire) fire.style.display = 'flex'; // fire-buttonはflexなのでflexに戻す
        if(crouch) crouch.style.display = 'flex'; // crouch-buttonもflexで表示
    } else { // PCの場合
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button'); // 追加
        if(joy) joy.style.display = 'none';
        if(fire) fire.style.display = 'none';
        if(crouch) crouch.style.display = 'none'; // PCでは非表示
    }

    // フルスクリーン処理
    const element = document.documentElement;
    try {
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => console.warn('Fullscreen API error:', err));
        } else if (element.webkitRequestFullscreen) { // Safari
            element.webkitRequestFullscreen().catch(err => console.warn('Fullscreen API error (webkit):', err));
        }
    } catch (e) {
        console.warn('Error trying to enter fullscreen:', e);
    }
    
    // 画面の向きロック
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.warn('Orientation lock failed:', e));
        }
    } catch (e) {
        console.warn('Error trying to lock orientation:', e);
    }
    
    // 障害物リセット
    if (gameSettings.fieldState === 'persist') {
        if(typeof resetObstacles === 'function') resetObstacles(); 
    }
    
}

function resetWeaponPickups() {
    for (let i = weaponPickups.length - 1; i >= 0; i--) scene.remove(weaponPickups[i]);
    weaponPickups.length = 0;
    respawningPickups.length = 0;
    createWeaponPickups();
}

// 配列をシャッフルするヘルパー関数 (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function restartGame() {
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';

    let customSpawnPoints = null;
    let availableSpawnPoints = []; // プレイヤーとAIに割り当てるスポーンポイントのリスト

    // デフォルトマップまたはランダムマップの場合、AIの数に応じてスポーン位置を動的に生成
    if (gameSettings.mapType === 'default' || gameSettings.mapType === 'random') {
        const R = ARENA_PLAY_AREA_RADIUS - 5; // アリーナの端から少し内側
        const centerOffset = new THREE.Vector3(0, 0, 0); // アリーナの中心

        if (gameSettings.aiCount === 1) { // プレイヤー1体 + AI1体 = 合計2キャラクター
            // 2つのタワーの裏付近
            availableSpawnPoints.push(new THREE.Vector3(40, 2.0, -40));
            availableSpawnPoints.push(new THREE.Vector3(-40, 2.0, 40));
        } else if (gameSettings.aiCount === 2) { // プレイヤー1体 + AI2体 = 合計3キャラクター
            // 正三角形の頂点
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                availableSpawnPoints.push(new THREE.Vector3(Math.sin(angle) * R, 2.0, Math.cos(angle) * R));
            }
        } else if (gameSettings.aiCount === 3) { // プレイヤー1体 + AI3体 = 合計4キャラクター
            // 四角形（カーディナルポイント）の頂点
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                availableSpawnPoints.push(new THREE.Vector3(Math.sin(angle) * R, 2.0, Math.cos(angle) * R));
            }
        }
        
        shuffle(availableSpawnPoints); // 生成したスポーン位置をシャッフル

    } else if (gameSettings.mapType === 'custom') {
        const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
        const selectedMapData = allCustomMaps[gameSettings.customMapName];

        if (selectedMapData) {
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    // カスタムマップのスポーンポイントはそのまま使用
                    customSpawnPoints = selectedMapData.spawnPoints.map(p => new THREE.Vector3(p.x, 2.0, p.z));
                    shuffle(customSpawnPoints); // カスタムマップの場合もシャッフル
                    availableSpawnPoints = customSpawnPoints;
                }
            } catch (e) {
                console.error("Could not parse spawn points from custom map data.", e);
            }
        }
    }
    
    playerHP = gameSettings.playerHP === 'Infinity' ? Infinity : parseInt(gameSettings.playerHP, 10);
    playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    
    // プレイヤーの位置設定
    let playerSpawnPos;
    if (availableSpawnPoints.length > 0) {
        playerSpawnPos = availableSpawnPoints.pop(); // シャッフルされたリストから位置を取得
    } else {
        const playerSpawn = customSpawnPoints ? customSpawnPoints.find(p => p.name === 'Player') : null;
        playerSpawnPos = playerSpawn ? new THREE.Vector3(playerSpawn.x, 2.0, playerSpawn.z) : PLAYER_INITIAL_POSITION;
    }
    player.position.copy(playerSpawnPos);
    player.rotation.y = Math.atan2(player.position.x, player.position.z); // 中央を向くように角度を計算
    camera.rotation.x = 0; // カメラの上下の回転はリセット
    currentWeapon = WEAPON_PISTOL;
    ammoMG = 0;
    ammoRR = 0;
    ammoSR = 0;
    
    for (const ai of ais) {
        scene.remove(ai);
    }
    ais.length = 0;

    const aiColors = [0x00ff00, 0x00ffff, 0xffb6c1]; // AI 1: 緑, AI 2: シアン, AI 3: 薄い桃色
    for (let i = 0; i < gameSettings.aiCount; i++) {
        const ai = createAI(aiColors[i] || 0xff00ff);
        
        // AIの位置設定
        let aiSpawnPos;
        if (availableSpawnPoints.length > 0) {
            aiSpawnPos = availableSpawnPoints.pop(); // シャッフルされたリストから位置を取得
        } else {
            // フォールバック: デフォルトのAI_INITIAL_POSITIONS (あるいはランダム)
            const aiSpawn = customSpawnPoints ? customSpawnPoints.find(p => p.name === `AI ${i + 1}`) : null;
            const defaultPos = AI_INITIAL_POSITIONS[i] || new THREE.Vector3(Math.random() * 20 - 10, 0, 20);
            aiSpawnPos = aiSpawn ? new THREE.Vector3(aiSpawn.x, 0, aiSpawn.z) : defaultPos;
        }
        // AIの初期y座標は-FLOOR_HEIGHTなので、それに応じて調整
        ai.position.copy(new THREE.Vector3(aiSpawnPos.x, -FLOOR_HEIGHT, aiSpawnPos.z));
        ai.rotation.y = Math.atan2(ai.position.x, ai.position.z); // 中央を向くように角度を計算


        // 3体いる場合の役割設定
        if (gameSettings.aiCount === 3) {
            if (i === 0) { // 中央突撃役
                ai.aggression = 0.7;
                ai.flankAggression = 0.1;
            } else if (i === 1) { // 左翼回り込み役
                ai.aggression = 0.4;
                ai.flankAggression = 0.8;
                ai.flankPreference = 'left'; // 左を好む
            } else { // 右翼回り込み役
                ai.aggression = 0.5;
                ai.flankAggression = 0.8;
                ai.flankPreference = 'right'; // 右を好む
            }
        } else { // 1体または2体の場合はこれまで通りランダム
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
    const ai3HPDisplay = document.getElementById('ai3-hp-display'); // 追加

    ais.forEach((ai, index) => {
        ai.hp = aiHP;
        // ai.rotation.y = 0; // lookAtで設定されるので不要
        ai.state = 'HIDING';
        ai.currentWeapon = WEAPON_PISTOL;
        ai.ammoMG = 0;
        ai.ammoRR = 0;
        ai.ammoSR = 0;
        ai.targetWeaponPickup = null;
        // ai.targetPosition.copy(ai.position); // 初期ターゲット位置も lookAt後に設定されるため不要
        ai.lastHiddenTime = 0;
        ai.lastAttackTime = 0;
        ai.currentAttackTime = 0;
        ai.avoiding = false;
        
        if (index === 0) {
            ai1HPDisplay.textContent = `AI 1 HP: ${aiHPText}`;
        } else if (index === 1) {
            ai2HPDisplay.textContent = `AI 2 HP: ${aiHPText}`;
        } else if (index === 2) { // 追加
            ai3HPDisplay.textContent = `AI 3 HP: ${aiHPText}`;
        }
    });

    // 表示・非表示のロジックを更新
    if (ai2HPDisplay) ai2HPDisplay.style.display = (gameSettings.aiCount > 1) ? 'block' : 'none';
    if (ai3HPDisplay) ai3HPDisplay.style.display = (gameSettings.aiCount > 2) ? 'block' : 'none';

    const gameUI = ['crosshair', 'player-hp-display', 'ai-hp-display', 'player-weapon-display'];
    if (gameSettings.aiCount > 1) {
        gameUI.push('ai2-hp-display');
    }
    if (gameSettings.aiCount > 2) { // 追加
        gameUI.push('ai3-hp-display');
    }
    gameUI.forEach(id => { 
        const el = document.getElementById(id); 
        if (el) el.style.display = 'block'; 
    });
    // モバイル判定でUIを表示/非表示
    if ('ontouchstart' in window) { // タッチデバイスの場合
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        if(joy) joy.style.display = 'block';
        if(fire) fire.style.display = 'flex';
        if(crouch) crouch.style.display = 'flex';
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
    resetWeaponPickups();
    
    clock.start();
    lastFireTime = -1;
    keySet.clear();
    joystickMoveVector.set(0, 0);
    isMouseButtonDown = false;
    isGameRunning = true;

    // Reset player model for death animation
    scene.remove(playerBody);
    scene.remove(playerHead);
    player.add(playerModel);
    playerModel.visible = false;
}

function startAIDeathSequence(impactVelocity, ai) {
    if (isAIDeathPlaying) return;
    isAIDeathPlaying = true;

    // 赤い煙エフェクトを追加
    createRedSmokeEffect(ai.position); 

    const joy = document.getElementById('joystick-move');
    const fire = document.getElementById('fire-button');
    const cross = document.getElementById('crosshair');
    if(joy) joy.style.display = 'none';
    if(fire) fire.style.display = 'none';
    if(cross) cross.style.display = 'none';

    const aiBody = ai.children[0];
    const aiHead = ai.children[1];

    const bodyPos = aiBody.getWorldPosition(new THREE.Vector3());
    const headPos = aiHead.getWorldPosition(new THREE.Vector3());

    ai.remove(aiBody);
    ai.remove(aiHead);
    aiBody.position.copy(bodyPos);
    aiHead.position.copy(headPos);
    aiDeathFocusObject.add(aiBody);
    aiDeathFocusObject.add(aiHead);
    
    scene.remove(ai);

    const forceMagnitude = 25; 
    const upForce = 20; 

    const bodyVelocity = impactVelocity.clone().normalize().multiplyScalar(forceMagnitude);
    bodyVelocity.y += upForce;
    aiBody.userData.velocity = bodyVelocity;
    aiBody.userData.angularVelocity = new THREE.Vector3((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);

    const headVelocity = bodyVelocity.clone().multiplyScalar(1.2); 
    headVelocity.y += 8; 
    aiHead.userData.velocity = headVelocity;
    aiHead.userData.angularVelocity = new THREE.Vector3((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25); 

    const aiDeathLocation = bodyPos.clone();
    
    // 新しいカメラロジック: プレイヤー視点を基準にする
    let cameraPos;
    const targetLookAt = aiDeathLocation.clone().add(new THREE.Vector3(0, 1, 0));

    // プレイヤーからAIへの方向
    const playerToAiDir = new THREE.Vector3().subVectors(aiDeathLocation, player.position).normalize();
    
    // 理想的なカメラ位置（プレイヤーの背後4m、高さ3m）
    const idealPos = player.position.clone().sub(playerToAiDir.multiplyScalar(4)).add(new THREE.Vector3(0, 3, 0));
    
    // 理想位置からAIへの視線チェック
    const direction = new THREE.Vector3().subVectors(targetLookAt, idealPos).normalize();
    raycaster.set(idealPos, direction);
    const intersects = raycaster.intersectObjects(obstacles, true);
    const distance = idealPos.distanceTo(targetLookAt);

    if (intersects.length > 0 && intersects[0].distance < distance - 0.5) {
        // 遮蔽物がある場合: AIの真上にカメラを置く
        cameraPos = aiDeathLocation.clone().add(new THREE.Vector3(0, 10, 5));
    } else {
        // 遮蔽物がない場合: 理想位置を採用
        cameraPos = idealPos;
    }

    cinematicCamera.position.copy(cameraPos);
    cinematicCamera.lookAt(aiDeathLocation.clone().add(new THREE.Vector3(0, 1, 0))); // 注視点を少し上に調整
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight; // アスペクト比を更新
    cinematicCamera.updateProjectionMatrix();

    new TWEEN.Tween(cinematicCamera)
        .to({ fov: 30 }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    setTimeout(() => {
        // 残っているプロジェクタイルを全て削除
        for (let i = projectiles.length - 1; i >= 0; i--) {
            scene.remove(projectiles[i].mesh);
            projectiles.splice(i, 1);
        }

        isAIDeathPlaying = false;
        aiBody.userData = {};
        aiHead.userData = {};
        aiDeathFocusObject.remove(aiBody);
        aiDeathFocusObject.remove(aiHead);

        if (ais.length > 0) {
            if(joy) joy.style.display = 'block';
            if(fire) fire.style.display = 'block';
            if(cross) cross.style.display = 'block';
        }
    }, 3500); 
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

    playerModel.visible = true; // Ensure player model is visible
    player.remove(playerModel); // Detach playerModel from player
    scene.add(playerModel); // Add playerModel directly to the scene at current player position
    playerModel.position.copy(player.position); // Ensure playerModel is at the current player position

    // AIの倒れる演出と同様にTweenでアニメーションさせる
    const fallDuration = 1.0; 
    const fallRotationAxisAngle = Math.PI / 2;
    const finalRotation = playerModel.rotation.clone();
    finalRotation.x += (Math.random() > 0.5 ? 1 : -1) * fallRotationAxisAngle;

    new TWEEN.Tween(playerModel.rotation)
        .to({ x: finalRotation.x }, fallDuration * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Player model's Y position should drop slightly to appear 'collapsed'
    const finalPlayerYPosition = -FLOOR_HEIGHT + (BODY_HEIGHT / 2); // Assuming body is 2 units high
    new TWEEN.Tween(playerModel.position)
        .to({ y: finalPlayerYPosition }, fallDuration * 1000)
        .easing(TWEEN.Easing.Quadratic.In)
        .start();
    
    // Set a flag to indicate this type of death sequence
    playerModel.userData.deathType = 'fallDown';

    setTimeout(() => {
        isPlayerDeathPlaying = false;
        showGameOver();
        playerModel.userData = {}; // Clear user data
        scene.remove(playerModel); // Remove the model from scene
    }, fallDuration * 1000 + 1500); // Wait for animation + a bit
}

function startPlayerDeathSequence(projectile) {
    if (isPlayerDeathPlaying || playerHP > 0) return;
    isPlayerDeathPlaying = true;
    isGameRunning = false;

    document.exitPointerLock();
    const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'player-weapon-display'];
    uiToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    playerModel.visible = true; // Make model visible before doing anything else
    
    // 修正: スタック問題を回避するため、ロケットランチャーでもその場で倒れる演出に統一する
    if (projectile.isRocket) {
        playerFallDownCinematicSequence(projectile);
    } else {
        playerFallDownCinematicSequence(projectile);
    }
}


function findFlankingSpot(ai, timeElapsed) {
    const playerPos = player.position.clone();
    const playerDir = new THREE.Vector3();
    player.getWorldDirection(playerDir); // プレイヤーの向いている方向を取得

    const FLANK_DISTANCE = 20; // プレイヤーの側面/背後からどれくらい離れるか
    const attempts = 5; // 試行回数

    for (let i = 0; i < attempts; i++) {
        let targetOffset;
        const rightDir = new THREE.Vector3(-playerDir.z, 0, playerDir.x); // プレイヤーの右方向
        const leftDir = new THREE.Vector3(playerDir.z, 0, -playerDir.x); // プレイヤーの左方向

        // flankPreferenceに基づいて回り込む方向を決定
        if (ai.flankPreference === 'left') {
            targetOffset = leftDir;
        } else if (ai.flankPreference === 'right') {
            targetOffset = rightDir;
        } else {
            // flankAggressionに基づいて、より積極的に背後を狙うか、側面も選択するか
            if (ai.flankAggression > 0.6 || Math.random() > 0.5) { // 比較的高確率で背後を狙う
                targetOffset = playerDir.clone().negate(); // プレイヤーの背後方向
            } else { // 側面を狙う
                targetOffset = Math.random() > 0.5 ? rightDir : leftDir;
            }
        }

        targetOffset.multiplyScalar(FLANK_DISTANCE + Math.random() * 10); // 距離をランダムに微調整

        const targetPos = playerPos.clone().add(targetOffset);
        targetPos.y = 0; // 地面に合わせる

        // Arenaの範囲内に収める
        const distFromCenter = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z);
        if (distFromCenter > ARENA_PLAY_AREA_RADIUS) {
            targetPos.multiplyScalar(ARENA_PLAY_AREA_RADIUS / distFromCenter);
        }

        // 目標地点が障害物で遮られていないかチェック (より複雑なパスファインディングが必要な場合は、A*などのアルゴリズムを導入)
        // ここでは簡易的に、AIから目標地点まで障害物がないかを確認する
        const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
        if (checkLineOfSight(aiHeadPos, targetPos, obstacles)) {
            ai.targetPosition.copy(targetPos);
            ai.state = 'FLANKING';
            ai.lastFlankTime = timeElapsed; // 現在時刻を記録
            return true;
        }
    }
    return false; // 適切な回り込み地点が見つからなかった
}

function createWindows(obstacleMesh, buildingWidth, buildingHeight, buildingDepth) {
    const WINDOW_SIZE = 1.2;
    const WINDOW_THICKNESS = 0.1;
    const WINDOW_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xcccccc }); // 薄いグレー
    const windowGeometry = new THREE.BoxGeometry(WINDOW_SIZE, WINDOW_SIZE, WINDOW_THICKNESS);

    // 窓を配置する間隔を計算 (単純化のため、ここでは固定値または建物のサイズに基づく)
    const HORIZONTAL_SPACING = 2.0; // 窓間の水平間隔
    const VERTICAL_SPACING = 2.5;   // 窓間の垂直間隔

    // 各面（前後左右）に対して窓を配置
    // 前後 (Z軸方向)
    for (let side = 0; side < 2; side++) {
        const zOffset = (buildingDepth / 2) * (side === 0 ? 1 : -1);
        const rotationY = side === 0 ? 0 : Math.PI;

        // 水平方向の窓の数
        const numHorizontalWindows = Math.floor((buildingWidth - WINDOW_SIZE) / HORIZONTAL_SPACING) + 1;
        const startX = -((numHorizontalWindows - 1) * HORIZONTAL_SPACING) / 2;

        // 垂直方向の窓の数
        const numVerticalWindows = Math.floor((buildingHeight - WINDOW_SIZE) / VERTICAL_SPACING) + 1;
        const startY = -((numVerticalWindows - 1) * VERTICAL_SPACING) / 2;

        for (let i = 0; i < numHorizontalWindows; i++) {
            for (let j = 0; j < numVerticalWindows; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, WINDOW_MATERIAL);
                windowMesh.position.set(
                    startX + i * HORIZONTAL_SPACING,
                    startY + j * VERTICAL_SPACING,
                    zOffset + (WINDOW_THICKNESS / 2) * (side === 0 ? 1 : -1) // 表面に少し浮かせず配置
                );
                windowMesh.rotation.y = rotationY;
                obstacleMesh.add(windowMesh);
            }
        }
    }

    // 左右 (X軸方向)
    for (let side = 0; side < 2; side++) {
        const xOffset = (buildingWidth / 2) * (side === 0 ? 1 : -1);
        const rotationY = side === 0 ? Math.PI / 2 : -Math.PI / 2;

        // 水平方向の窓の数 (この場合はDepthが水平方向)
        const numHorizontalWindows = Math.floor((buildingDepth - WINDOW_SIZE) / HORIZONTAL_SPACING) + 1;
        const startZ = -((numHorizontalWindows - 1) * HORIZONTAL_SPACING) / 2;

        // 垂直方向の窓の数
        const numVerticalWindows = Math.floor((buildingHeight - WINDOW_SIZE) / VERTICAL_SPACING) + 1;
        const startY = -((numVerticalWindows - 1) * VERTICAL_SPACING) / 2;

        for (let i = 0; i < numHorizontalWindows; i++) {
            for (let j = 0; j < numVerticalWindows; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, WINDOW_MATERIAL);
                windowMesh.position.set(
                    xOffset + (WINDOW_THICKNESS / 2) * (side === 0 ? 1 : -1),
                    startY + j * VERTICAL_SPACING,
                    startZ + i * HORIZONTAL_SPACING
                );
                windowMesh.rotation.y = rotationY;
                obstacleMesh.add(windowMesh);
            }
        }
    }
}


function aiFallDownCinematicSequence(impactVelocity, ai) {
    if (isAIDeathPlaying) return; 
    isAIDeathPlaying = true;
    cinematicTargetAI = ai; // 対象のAIをセット

    const joy = document.getElementById('joystick-move');
    const fire = document.getElementById('fire-button');
    const cross = document.getElementById('crosshair');
    if(joy) joy.style.display = 'none';
    if(fire) fire.style.display = 'none';
    if(cross) cross.style.display = 'none';

    createRedSmokeEffect(ai.position); 

    const aiDeathLocation = ai.position.clone(); 
    const targetCameraPosition = findClearCameraPosition(aiDeathLocation, obstacles);

    cinematicCamera.position.copy(targetCameraPosition);
    cinematicCamera.lookAt(aiDeathLocation.clone().add(new THREE.Vector3(0, 1, 0))); // 注視点を少し上に調整
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight; // アスペクト比を更新
    cinematicCamera.updateProjectionMatrix();

    new TWEEN.Tween(cinematicCamera)
        .to({ fov: 30 }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    const fallDuration = 1.0; 
    
    const fallRotationAxisAngle = Math.PI / 2;
    const finalAIRotation = ai.rotation.clone();
    finalAIRotation.x += (Math.random() > 0.5 ? 1 : -1) * fallRotationAxisAngle;

    const finalAIYPosition = -FLOOR_HEIGHT + (BODY_HEIGHT / 2);

    new TWEEN.Tween(ai.rotation)
        .to({ x: finalAIRotation.x }, fallDuration * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(ai.position)
        .to({ y: finalAIYPosition }, fallDuration * 1000)
        .easing(TWEEN.Easing.Quadratic.In)
        .start();

    setTimeout(() => {
        isAIDeathPlaying = false;
        cinematicTargetAI = null; // 対象のAIをリセット
        scene.remove(ai); 
        
        if (ais.length > 0) {
            if(joy) joy.style.display = 'block';
            if(fire) fire.style.display = 'block';
            if(cross) cross.style.display = 'block';
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
}

function checkCollision(object, obstacles, ignoreObstacle = null) {
    const objectBox = new THREE.Box3();
    const pos = object.position;
    
    let currentObjectBox;

    if (object === player) {
        objectBox.min.set(pos.x - 0.5, pos.y - playerTargetHeight, pos.z - 0.5); 
        objectBox.max.set(pos.x + 0.5, pos.y, pos.z + 0.5);
        objectBox.expandByScalar(0.01);
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
        if (ignoreObstacle && (obstacle.userData.parentTower === ignoreObstacle || obstacle.userData.parentBuildingRef === ignoreObstacle)) {
            continue;
        }

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

    // 優先候補: 弾が飛んできた方向の逆から見る
    if (projectile) {
        const fromBehind = projectile.velocity.clone().normalize().multiplyScalar(-10); // 10ユニット後方
        fromBehind.y = 5; // 少し上から
        cameraCandidates.push(fromBehind);
    }

    // 基本候補
    const baseCandidates = [
        new THREE.Vector3(0, 5, 10),    // 後方上
        new THREE.Vector3(10, 5, 0),    // 右上
        new THREE.Vector3(-10, 5, 0),   // 左上
        new THREE.Vector3(8, 6, 8),     // 右後方上
        new THREE.Vector3(-8, 6, 8),    // 左後方上
        new THREE.Vector3(8, 6, -8),    // 右前方上
        new THREE.Vector3(-8, 6, -8),   // 左前方上
        new THREE.Vector3(0, 5, -10),   // 前方上
        new THREE.Vector3(0, 12, 0.1),  // 真上（少しずらす）
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

    // すべての候補がダメだった場合、最も障害物から遠い候補を選ぶ (簡易版)
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

    return bestCandidate || targetPosition.clone().add(new THREE.Vector3(0, 15, 0)); // それでもダメなら真上
}



function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const timeElapsed = clock.getElapsedTime();

    playerTargetHeight = isCrouchingToggle ? 1.0 : 2.0;

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
        // バラバラになる演出の処理
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
        // 倒れるだけの演出の処理
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

        if (playerModel.userData.deathType === 'fallDown') { // その場で倒れる演出の場合
            // Tweenがアニメーションを処理するので、物理演算は不要
            // カメラはplayerModel全体を追跡
            cinematicCamera.lookAt(playerModel.position.clone().add(new THREE.Vector3(0, 1, 0)));
            // playerModelが既にシーンに直接addされているので、その位置を基にフォーカス
            focusPos.add(playerModel.getWorldPosition(tempVector));
            partsInFocus++;
        } else { // 吹き飛ぶ演出の場合 ('blowAway'または未設定)
            const parts = [playerBody, playerHead];
            for (const part of parts) {
                if (part && part.userData.velocity) {
                    part.userData.velocity.y -= GRAVITY * delta;
                    
                    const velocity = part.userData.velocity;
                    const oldPos = part.position.clone();

                    // Y軸
                    part.position.y += velocity.y * delta;
                    if (checkPartCollision(part)) {
                        part.position.y = oldPos.y;
                        velocity.y *= -0.5;
                    }
                    
                    // X軸
                    part.position.x += velocity.x * delta;
                    if (checkPartCollision(part)) {
                        part.position.x = oldPos.x;
                        velocity.x *= -0.5;
                    }
                    
                    // Z軸
                    part.position.z += velocity.z * delta;
                    if (checkPartCollision(part)) {
                        part.position.z = oldPos.z;
                        velocity.z *= -0.5;
                    }

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
        TWEEN.update(); // Tweenアニメーションを更新
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
            case WEAPON_MG:
                weaponName = 'Machinegun';
                ammoCount = ammoMG;
                break;
            case WEAPON_RR:
                weaponName = 'Rocket';
                ammoCount = ammoRR;
                break;
            case WEAPON_SR:
                weaponName = 'Sniper';
                ammoCount = ammoSR;
                break;
            case WEAPON_SG: // ショットガンを追加
                weaponName = 'Shotgun';
                ammoCount = ammoSG;
                break;
            case WEAPON_PISTOL:
                weaponName = 'Pistol';
                break;
        }
        weaponDisplay.innerHTML = `Weapon: ${weaponName}<br>Ammo: ${ammoCount}`;
    }

    if (isMouseButtonDown && (currentWeapon === WEAPON_MG || currentWeapon === WEAPON_SG)) { // ショットガンも長押しで連射可能に
        shoot();
    }

    if (isScoping) {
        document.getElementById('crosshair').style.display = 'none';
    }
    else {
        if (scopeOverlay.style.display === 'none') {
            document.getElementById('crosshair').style.display = 'block';
        }
    }
    
    // キー入力を毎フレーム処理
    keyboardMoveVector.set(0, 0);
    if (keySet.has('KeyW')) keyboardMoveVector.y += 1;
    if (keySet.has('KeyS')) keyboardMoveVector.y -= 1;
    if (keySet.has('KeyA')) keyboardMoveVector.x -= 1;
    if (keySet.has('KeyD')) keyboardMoveVector.x += 1;
    let finalMoveVector = joystickMoveVector.length() > 0 ? joystickMoveVector.clone() : keyboardMoveVector.clone();

                if (isElevating) {

                    const elevateSpeed = 5.0;

                    player.position.y += elevateSpeed * delta;

            

                            // 目標の高さに到達したかチェック

            

                            if (player.position.y >= elevatingTargetY) {

            

                                player.position.y = elevatingTargetY; // 目標高度に到達

            

                                isElevating = false; // エレベーターを終了

            

                                isLanding = true; // 着地シーケンスを開始

            

                                landingTimer = 1.0; // 1秒間の水平移動猶予

            

                            }

                    } else if (isLanding) {
                        // 着地シーケンス中 (水平移動のみ許可)
                        landingTimer -= delta;
                        if (landingTimer <= 0) {
                            isLanding = false;
                            elevatingTargetObstacle = null; // 登った障害物をクリア
                        }
                
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
                        
                        player.position.z += moveZ;
                        // 登った障害物との衝突は無視
                        if (checkCollision(player, obstacles, elevatingTargetObstacle)) {
                            player.position.z = oldPlayerPosition.z;
                        }
                        player.position.x += moveX;
                        if (checkCollision(player, obstacles, elevatingTargetObstacle)) {
                            player.position.x = oldPlayerPosition.x;
                        }
                        
                    } else { // 通常の移動ロジック
                        let inSensorArea = false;
                        // センサーエリアとの接触をチェック
                        // プレイヤーのBoundingBoxを作成
                        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
                            player.position.clone().add(new THREE.Vector3(0, playerTargetHeight/2, 0)), // プレイヤーの体全体
                            new THREE.Vector3(1, playerTargetHeight, 1) // プレイヤーのサイズ (幅1, 高さBODY_HEIGHT, 奥行き1)
                        );
                
                        for (const sensorArea of ladderSwitches) { // ladderSwitches配列にセンサーエリアを格納している
                            const sensorBoundingBox = new THREE.Box3().setFromObject(sensorArea);
                            
                            if (playerBoundingBox.intersectsBox(sensorBoundingBox)) {
                                                inSensorArea = true;                                const obs = sensorArea.userData.obstacle;
                
                                isElevating = true;
                                elevatingTargetObstacle = obs;
                                elevatingTargetY = (obs.position.y + obs.geometry.parameters.height / 2) + 2.1;
                
                                // プレイヤーを梯子の中心に固定し、上昇を開始
                                const ladderPos = sensorArea.userData.ladderPos;
                                if (ladderPos) {
                                    player.position.x = ladderPos.x;
                                    player.position.z = ladderPos.z;
                                }
                                break;
                            }
                        }
                        // スイッチに乗っていなければ、通常の移動処理
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
                            
                            const originalY = player.position.y;
                
                            player.position.z += moveZ;
                            if (checkCollision(player, obstacles, currentGroundObstacle)) player.position.z = oldPlayerPosition.z; 
                            player.position.x += moveX;
                            if (checkCollision(player, obstacles, currentGroundObstacle)) player.position.x = oldPlayerPosition.x; 
                            
                            const playerDistFromCenter = Math.sqrt(player.position.x * player.position.x + player.position.z * player.position.z);
                            if (playerDistFromCenter > ARENA_PLAY_AREA_RADIUS) {
                                const ratio = ARENA_PLAY_AREA_RADIUS / playerDistFromCenter;
                                player.position.x *= ratio;
                                player.position.z *= ratio;
                            }
                
                            // Y座標の処理 (重力および高さ調整)
                            let onGround = false;
                            currentGroundObstacle = null;
                            let groundY = 0; // 現在立っている地面のY座標

                            const playerFeetY = player.position.y - playerTargetHeight;

                            for (const obs of obstacles) {
                                const obstacleBox = new THREE.Box3().setFromObject(obs);
                                const topOfObstacle = obs.position.y + obs.geometry.parameters.height / 2;

                                const playerHorizontalBox = new THREE.Box2(
                                    new THREE.Vector2(player.position.x - 0.5, player.position.z - 0.5),
                                    new THREE.Vector2(player.position.x + 0.5, player.position.z + 0.5)
                                );
                                const obstacleHorizontalBox = new THREE.Box2(
                                    new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z),
                                    new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z)
                                );

                                if (playerHorizontalBox.intersectsBox(obstacleHorizontalBox)) {
                                    // isRooftopフラグを持つ床、または通常の障害物（塀ではない、かつ高さ1.5未満）の上に乗れる
                                    if ((obs.userData.isRooftop || (!obs.userData.isWall && obs.geometry.parameters.height < 1.5)) && playerFeetY >= topOfObstacle - 1.5 && playerFeetY <= topOfObstacle + 0.5) {
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
                                const targetY = groundY + playerTargetHeight;
                                player.position.y = THREE.MathUtils.lerp(player.position.y, targetY, 0.2);
                            } else {
                                player.position.y -= GRAVITY * delta;
                            }                        }
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
                            let weaponName = '';
                                        switch (pickup.userData.weaponType) {
                                            case WEAPON_MG: 
                                                currentWeapon = WEAPON_MG; 
                                                ammoMG = MAX_AMMO_MG; 
                                                weaponName = 'MACHINEGUN';
                                                break;
                                            case WEAPON_RR: 
                                                currentWeapon = WEAPON_RR; 
                                                ammoRR = MAX_AMMO_RR; 
                                                weaponName = 'ROCKET LAUNCHER';
                                                break;
                                            case WEAPON_SR: 
                                                currentWeapon = WEAPON_SR; 
                                                ammoSR = MAX_AMMO_SR; 
                                                weaponName = 'SNIPER RIFLE';
                                                break;
                                            case WEAPON_SG: 
                                                currentWeapon = WEAPON_SG; 
                                                ammoSG = MAX_AMMO_SG; 
                                                weaponName = 'SHOTGUN';
                                                break;
                                        }                
                            // 音声再生
                            const setSound = document.getElementById('setSound');
                            if (setSound) setSound.cloneNode(true).play();
                
                            // 画面表示
                            const weaponGetDisplay = document.getElementById('weapon-get-display');
                            if (weaponGetDisplay) {
                                weaponGetDisplay.textContent = `${weaponName} GET!`;
                                weaponGetDisplay.style.display = 'block';
                                setTimeout(() => {
                                    weaponGetDisplay.style.display = 'none';
                                }, 1000); // 1秒後に非表示
                            }
                
                            scene.remove(pickup);
                            weaponPickups.splice(i, 1);
                            respawningPickups.push({ weaponType: pickup.userData.weaponType, respawnTime: timeElapsed + RESPAWN_DELAY });
                            continue; 
                        }    }
    
    for (let i = respawningPickups.length - 1; i >= 0; i--) {
        const respawnItem = respawningPickups[i];
        if (timeElapsed >= respawnItem.respawnTime) {
            const weaponText = respawnItem.weaponType === WEAPON_MG ? 'MG' :
                               respawnItem.weaponType === WEAPON_RR ? 'RL' :
                               respawnItem.weaponType === WEAPON_SR ? 'SR' : 'SG';
            createWeaponPickup(weaponText, getRandomSafePosition(), respawnItem.weaponType);
            respawningPickups.splice(i, 1);
        }
    }
    
    const AI_SEPARATION_FORCE = 2.0; // AI同士が離れる力の強さ
    ais.forEach((ai, index) => {
            // AIの移動速度をしゃがみ状態に応じて調整
            const currentAISpeed = ai.isCrouching ? AI_SPEED / 2 : AI_SPEED;

            // --- AI同士の分離処理 ---
            const separation_vec = new THREE.Vector3(0, 0, 0);
            ais.forEach((otherAI, otherIndex) => {
                if (index === otherIndex) return;
                const distance = ai.position.distanceTo(otherAI.position);
                if (distance < MIN_DISTANCE_BETWEEN_AIS_AT_SPOT) {
                    const repulsion = new THREE.Vector3().subVectors(ai.position, otherAI.position);
                    // 距離が近いほど強く反発する
                    const strength = (MIN_DISTANCE_BETWEEN_AIS_AT_SPOT - distance) / MIN_DISTANCE_BETWEEN_AIS_AT_SPOT;
                    separation_vec.add(repulsion.normalize().multiplyScalar(strength));
                }
            });
            // 分離ベクトルをデルタタイムと力の強さでスケーリング
            separation_vec.multiplyScalar(delta * AI_SEPARATION_FORCE);

            aiCheckPickup(ai);
            const isAISeen = isVisibleToPlayer(ai);
            const distanceToTarget = ai.position.distanceTo(ai.targetPosition);
            const isArrived = distanceToTarget < ARRIVAL_THRESHOLD;
            const isMoving = !isArrived;
    
                                    // AIのしゃがみロジック: HIDING状態ならしゃがみ、それ以外なら立つ
    
                                    if (ai.state === 'HIDING') {
    
                                        ai.isCrouching = true;
    
                                    } else {
    
                                        ai.isCrouching = false;
    
                                    }
    
                                
    
                        
    
            
    
                    // AIのYスケール調整 (見た目の変更) と位置調整
    
                    ai.scale.y = ai.isCrouching ? 0.7 : 1.0; // 縮小率を0.7に変更
    
                    // スケール変更によってAIの足元が地面に埋まらないように、position.yを調整
    
                    ai.position.y = -FLOOR_HEIGHT - (ai.isCrouching ? (BODY_HEIGHT + HEAD_RADIUS * 2) * 0.15 : 0); // 調整量を0.15に変更 (3 * 0.15 = 0.45)
    
                
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
                        if (findNewHidingSpot(ai)) {
                             ai.lastHiddenTime = timeElapsed;
                        }
                    }
                } else {
                    if (!findAndTargetWeapon(ai)) {
                                            if (isAISeen) {
                                                ai.state = 'ATTACKING';
                                                ai.currentAttackTime = timeElapsed;
                                                ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                                            } else {
                                                const effectiveHideDuration = HIDE_DURATION * (1.0 + (1.0 - ai.aggression) * 1.5); // aggressionに基づいて隠れる時間を調整
                                                if ((timeElapsed - ai.lastHiddenTime) >= effectiveHideDuration) {
                                                    findNewHidingSpot(ai);
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
                } else if (isArrived && !isAISeen && isBehindObstacle(ai)) { // プレイヤーから見えておらず、かつ障害物の陰にいる場合のみHIDINGに
                    ai.state = 'HIDING'; 
                    ai.lastHiddenTime = timeElapsed;
                    ai.targetWeaponPickup = null;
                }
                break;                break;
            case 'FLANKING': // 新しい回り込み状態
                ai.avoiding = false;
                // 目標地点に到着したら攻撃状態に戻る、または隠れる
                if (isArrived) {
                    ai.state = 'ATTACKING'; // 目標地点に到着したら攻撃状態に
                    ai.currentAttackTime = timeElapsed;
                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                }
                // 回り込み中にプレイヤーが見えなくなったら、かつ障害物の陰にいる場合のみ、隠れることを優先
                else if (!isAISeen && isBehindObstacle(ai)) {
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
                
                // 分離ベクトルを追加
                moveVectorDelta_attack.add(separation_vec);

                ai.position.add(moveVectorDelta_attack);
                if (checkCollision(ai, obstacles)) {
                    ai.position.copy(oldAIPosition_attack);
                    ai.strafeDirection *= -1;
                }
                aiShoot(ai, timeElapsed);
                // ATTACK_DURATION が経過、またはAIからプレイヤーが見えなくなった場合
                if ((timeElapsed - ai.currentAttackTime) >= ATTACK_DURATION || !isAISeen) {
                    // 回り込みを試みる条件
                    // 1. ai.flankAggression が高い (ランダム性を加える)
                    // 2. 最後に回り込みを試みてから FLANK_COOLDOWN 時間が経過している
                    // 3. プレイヤーが見えている場合 (奇襲的な回り込み)
                    if (isAISeen && Math.random() < ai.flankAggression && (timeElapsed - ai.lastFlankTime) > FLANK_COOLDOWN) {
                        if (findFlankingSpot(ai, timeElapsed)) {
                            break; // 回り込み地点が見つかり、状態がFLANKINGに設定されたら、このケースの処理を終了
                        }
                    }

                    // 回り込みを試みなかった、または回り込み地点が見つからなかった場合、通常の行動選択
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

            // 分離ベクトルを追加
            moveVectorDelta.add(separation_vec);
            // 再正規化して速度を一定に保つ
            moveDirection = moveVectorDelta.normalize();


            raycaster.set(oldAIPosition.clone().add(new THREE.Vector3(0, 1.0, 0)), moveDirection); 
            const intersects = raycaster.intersectObjects(obstacles, true);
            if (intersects.length > 0 && intersects[0].distance < AVOIDANCE_RAY_DISTANCE && !ai.avoiding && ai.state !== 'EVADING') {
                findObstacleAvoidanceSpot(ai, moveDirection, ai.targetPosition); 
            } else {
                // moveVectorDeltaを再計算
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
        
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        // 弾の寿命を減らす
        if (p.life !== Infinity) {
            p.life -= delta;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
                continue;
            }
        }

        // --- Sniper bullet tunneling fix ---
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
        
        // 1. Obstacle Collision
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obstacle = obstacles[j];
            if (new THREE.Box3().setFromObject(obstacle).intersectsSphere(bulletSphere)) {
                hitSomething = true;
                hitObject = obstacle;
                hitType = 'obstacle';
                break;
            }
        }

        // 2. Floor Collision
        if (!hitSomething && new THREE.Box3().setFromObject(floor).intersectsSphere(bulletSphere)) {
            hitSomething = true;
            hitObject = floor;
            hitType = 'floor';
        }
        
        // 3. AI Collision (if player's projectile)
        if (!hitSomething && p.source === 'player') {
            for (let j = ais.length - 1; j >= 0; j--) {
                const ai = ais[j];
                if (new THREE.Box3().setFromObject(ai).intersectsSphere(bulletSphere)) {
                    hitSomething = true;
                    hitObject = ai;
                    hitType = 'ai';
                    
                    let damageAmount = 1;
                    if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE; // ショットガンはダメージ軽減
                    else if (p.isSniper || p.isRocket) damageAmount = ai.hp; // スナイパー・ロケランは即死

                    if (ai.hp !== Infinity) {
                        ai.hp -= damageAmount;
                        createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0))); 
                    }
                    if (ai.hp <= 0) {
                        aiFallDownCinematicSequence(p.velocity, ai);
                    } else {
                        findEvasionSpot(ai);
                    }

                    if (ai.hp <= 0) {
                        ais.splice(j, 1);
                    }
                    if (p.weaponType === WEAPON_SG) { // ショットガン弾は衝突時に削除
                        scene.remove(p.mesh);
                        projectiles.splice(i, 1);
                    }
                    // breakは削除し、外側のif文を抜ける
                }
            }
            // ループを抜けるためにここでbreak
            if (hitSomething) break;
        }
        
        // 4. Player Collision (if AI's projectile)
        if (!hitSomething && p.source === 'ai') {
            const playerPos = player.position;
            const playerBoundingBox = new THREE.Box3();
            playerBoundingBox.min.set(playerPos.x - 0.5, playerPos.y - 2.0, playerPos.z - 0.5);
            playerBoundingBox.max.set(playerPos.x + 0.5, playerPos.y + 0.5, playerPos.z + 0.5);
            if (playerBoundingBox.intersectsSphere(bulletSphere)) {
                hitSomething = true;
                hitObject = player;
                hitType = 'player';
                
                let damageAmount = 1;
                if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE; // ショットガンはダメージ軽減
                else if (p.isSniper || p.isRocket) damageAmount = playerHP; // スナイパー・ロケランは即死

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
                    // ショットガン弾はここで削除、continueはしない
                    projectiles.splice(i, 1);
                    scene.remove(p.mesh);
                }
                break; // このbreakは外側のjループを抜ける
            }
        }
        
        // 5. Process Hit (Obstacle/Floor)
        if (hitSomething) {
            if (p.isRocket) {
                explosionSound.cloneNode(true).play().catch(e => console.error("Explosion audio playback failed:", e));
                const explosionPos = p.mesh.position.clone();
                createExplosionEffect(explosionPos);

                // --- ここから範囲ダメージ処理 ---
                const ROCKET_MAX_DAMAGE = 15;
                const EXPLOSION_RADIUS_ACTUAL = 5; // 爆発の有効範囲をさらに縮小

                // AIへの範囲ダメージ (プレイヤーが撃ったロケットのみ)
                if (p.source === 'player') {
                    for (let j = ais.length - 1; j >= 0; j--) {
                        const ai = ais[j];
                        if (ai.hp <= 0) continue;

                        const distance = ai.position.distanceTo(explosionPos);
                        if (distance < EXPLOSION_RADIUS_ACTUAL) {
                            // 爆心地とAIの間に障害物がないかチェック
                            const aiCenter = ai.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                            if (checkLineOfSight(explosionPos, aiCenter, obstacles)) {
                                const damage = 1; // 爆風ダメージは常に1
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

                // プレイヤーへの範囲ダメージ (AIが撃ったロケットのみ)
                if (p.source === 'ai' && playerHP > 0) {
                    const distanceToPlayer = player.position.distanceTo(explosionPos);
                    if (distanceToPlayer < EXPLOSION_RADIUS_ACTUAL) {
                        // 爆心地とプレイヤーの間に障害物がないかチェック
                        const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
                        if (checkLineOfSight(explosionPos, playerCenter, obstacles)) {
                            const damage = 1; // 爆風ダメージは常に1
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
                // --- 範囲ダメージ処理ここまで ---

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
            
            // ヒットした弾を削除する処理をここに追加
            if (p.weaponType !== WEAPON_SG) { // ショットガン弾は既に削除されているので除外
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
            continue; // ヒットした場合は次の弾へ
        }
        


        // 6. Remove projectile if it goes too far
        if (p.mesh.position.length() > 200 && p.weaponType !== WEAPON_SG) { // ショットガンはlifeで管理
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    const aiHPDisplays = [
        document.getElementById('ai-hp-display'),
        document.getElementById('ai2-hp-display'),
        document.getElementById('ai3-hp-display')
    ];

    for (let i = 0; i < aiHPDisplays.length; i++) {
        const display = aiHPDisplays[i];
        if (!display) continue;

        const ai = ais[i];
        if (ai) {
            display.style.display = 'block';
            display.textContent = `AI ${i + 1} HP: ${ai.hp < 0 ? 0 : (ai.hp === Infinity ? '∞' : ai.hp)}`;
        } else {
            display.style.display = 'none';
        }
    }

    if (ais.length === 0 && isGameRunning && !isAIDeathPlaying) {
        showWinScreen();
    }
    playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;


    if (screenShakeDuration > 0) {
        screenShakeDuration -= delta;
        const shakeFactor = screenShakeDuration / SHAKE_DURATION_MAX;
        camera.position.x = (Math.random() - 0.5) * SHAKE_INTENSITY * shakeFactor;
        camera.position.y = (Math.random() - 0.5) * SHAKE_INTENSITY * shakeFactor;
    } else camera.position.set(0, 0, 0);
    
    TWEEN.update();
    renderer.render(scene, camera);
}
// Start Game Event (with safe check)
const startBtn = document.getElementById('start-game-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        gameSettings.playerHP = document.getElementById('player-hp').value;
        gameSettings.aiHP = document.getElementById('ai-hp').value;
        gameSettings.mgCount = parseInt(document.getElementById('mg-count').value, 10);
        gameSettings.rrCount = parseInt(document.getElementById('rr-count').value, 10);
        gameSettings.srCount = parseInt(document.getElementById('sr-count').value, 10);
        gameSettings.sgCount = parseInt(document.getElementById('sg-count').value, 10); // ショットガンを追加
        gameSettings.fieldState = document.querySelector('input[name="field-state"]:checked').value;
        gameSettings.mapType = document.querySelector('input[name="map-type"]:checked').value;
        gameSettings.aiCount = parseInt(document.querySelector('input[name="ai-count"]:checked').value, 10);

        initializeAudio();

        startGame(); // UI表示を初期化
        restartGame(); // ゲームロジックを開始
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
animate();