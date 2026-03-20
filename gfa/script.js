const PLAYER_INITIAL_POSITION = new THREE.Vector3(0, 2.0, -20);
let gameSettings = {
    playerHP: 20,
    aiHP: 20,
    projectileSpeedMultiplier: 2.0,
    mgCount: 1,
    rrCount: 1,
    srCount: 1,
    sgCount: 1,
    mrCount: 1,
    defaultWeapon: 'pistol',
    medikitCount: 0,
    mapType: 'default',
    aiCount: 3,
    autoAim: true,
    nightModeEnabled: false,
    nightModeLightIntensity: 3.0,
    timeLapseMode: false,
    customMapName: 'Default Custom Map',
    gameMode: 'battle',
    killCamMode: 'playerOnly',
    barrelRespawn: false,
    gameDuration: 180, // 3分間 (180秒)
    buttonPositions: {
        fire: { right: '20px', bottom: '120px' },
        crouch: { right: '20px', bottom: '55px' },
        zoom: { right: '90px', bottom: '55px' },
        joystick: { left: '10%', bottom: '10%' },
        follow: { right: '20px', bottom: '190px' }
    }
};
let originalSettings = {};
let isPaused = false;
const DEBUG_LOG = false;
function debugLog(...args) {
    if (DEBUG_LOG) debugLog(...args);
}

// キャラクター設定
let characterCustomization = {
    player: {
        hairStyle: 'default',
        hairColor: '#D2691E',
        skinColor: '#ffd1b0',
        clothingColor: '#ff3333',
        pantsColor: '#111111',
        shoesColor: '#8B4513'
    },
    enemy1: {
        hairStyle: 'default',
        hairColor: '#D2691E',
        skinColor: '#ffd1b0',
        clothingColor: '#3333ff',
        pantsColor: '#111111',
        shoesColor: '#8B4513'
    },
    enemy2: {
        hairStyle: 'default',
        hairColor: '#D2691E',
        skinColor: '#ffd1b0',
        clothingColor: '#00ff00',
        pantsColor: '#111111',
        shoesColor: '#8B4513'
    },
    enemy3: {
        hairStyle: 'default',
        hairColor: '#D2691E',
        skinColor: '#ffd1b0',
        clothingColor: '#ff8800',
        pantsColor: '#111111',
        shoesColor: '#8B4513'
    }
};

// タイムラプスモード変数
let timeLapseInterval = null;
let timeLapseStartTime = null;
let isTimeLapseMode = false;
let currentTransitionProgress = 0; // 0 = fully day, 1 = fully night
let targetTransitionProgress = 0;
const TIME_LAPSE_CYCLE_TIME = 100000; // 100 seconds in milliseconds (夜を80秒に拡大)
const TRANSITION_DURATION = 5000; // 5 seconds for smooth transition

// タイムラプスモード関数
function startTimeLapseMode() {
    if (timeLapseInterval) return; // すでに実行中
    
    isTimeLapseMode = true;
    timeLapseStartTime = Date.now();
    currentTransitionProgress = 0; // 昼モードで開始
    targetTransitionProgress = 0;
    
    // サイクル開始 - スムーズな遷移のために毎秒チェック
    timeLapseInterval = setInterval(() => {
        updateTimeLapseCycle();
    }, 1000); // 毎秒チェック
    
    // 初期状態 - 昼モードで開始
    applyNightMode(false);
    
    // UIを更新
    const nightModeCheckbox = document.getElementById('night-mode');
    if (nightModeCheckbox) {
        nightModeCheckbox.checked = false;
    }
    
    // タイムラプスモード開始 - 昼モードから開始
}

function stopTimeLapseMode() {
    if (timeLapseInterval) {
        clearInterval(timeLapseInterval);
        timeLapseInterval = null;
    }
    isTimeLapseMode = false;
    timeLapseStartTime = null;
    
    // タイムラプスモード停止
}

function updateTimeLapseCycle() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - timeLapseStartTime;
    const cycleTime = parseInt(TIME_LAPSE_CYCLE_TIME);
    const cyclePosition = (elapsedTime % cycleTime) / cycleTime;
    
    // サイクル位置に基づいて目標遷移進行度を計算
    // 0-0.20: 昼モード (1 -> 0) - 20秒
    // 0.20-1.0: 夜モード (0 -> 1) - 80秒
    let newTargetProgress;
    if (cyclePosition < 0.20) {
        // 最初の5分の1: 昼モード (1 -> 0)
        newTargetProgress = 1 - (cyclePosition * 5); // 20秒で1から0へ
    } else {
        // 最後の4分の5: 夜モード (0 -> 1)
        newTargetProgress = (cyclePosition - 0.20) * 1.25; // 80秒で0から1へ
    }
    
    targetTransitionProgress = newTargetProgress;
    
    // タイムラプスデバッグ: cyclePosition=${cyclePosition.toFixed(3)}, targetProgress=${targetTransitionProgress.toFixed(3)}
    
    // スムーズな遷移を適用
    applySmoothNightMode();
}

function applySmoothNightMode() {
    // スムーズな遷移の代わりに目標進行度を直接使用
    // これにより「ガクッ」とした突然の暗さを防ぐ
    const nightIntensity = targetTransitionProgress;
    const dayIntensity = 1 - targetTransitionProgress;
    
    // 昼の設定
    const dayAmbientIntensity = 0.7; // 増加 (0.5 → 0.7)
    const dayDirectionalIntensity = 1.0; // 増加 (0.8 → 1.0)
    const dayClearColor = new THREE.Color(0xADD8E6); // 薄い青（より明るく）
    
    // 夜の設定 - 通常の夜モードと同じ
    const nightAmbientIntensity = 0.05; // 通常の夜モードと同じ
    const nightDirectionalIntensity = 0.05; // 通常の夜モードと同じ
    const nightClearColor = new THREE.Color(0x111122); // 通常の夜モードと同じ
    
    // 昼と夜の間を補間
    const currentAmbientIntensity = dayAmbientIntensity * dayIntensity + nightAmbientIntensity * nightIntensity;
    const currentDirectionalIntensity = dayDirectionalIntensity * dayIntensity + nightDirectionalIntensity * nightIntensity;
    const currentClearColor = dayClearColor.clone().lerp(nightClearColor, nightIntensity);
    
    // 補間値を適用
    if (ambientLight) {
        ambientLight.intensity = currentAmbientIntensity;
        // タイムラプス: ambientLight intensity set to ${currentAmbientIntensity.toFixed(3)} (nightIntensity: ${nightIntensity.toFixed(3)})
    }
    if (directionalLight) {
        directionalLight.intensity = currentDirectionalIntensity;
        // タイムラプス: directionalLight intensity set to ${currentDirectionalIntensity.toFixed(3)} (nightIntensity: ${nightIntensity.toFixed(3)})
    }
    if (renderer) {
        renderer.setClearColor(currentClearColor);
        // タイムラプス: renderer clear color set to #${currentClearColor.getHexString()} (nightIntensity: ${nightIntensity.toFixed(3)})
    }
    
    // 街灯を処理 - 通常の夜モードの動作に合わせる
    if (streetLights && streetLights.length > 0) {
        streetLights.forEach(light => {
            const pointLight = light.children.find(child => child.isPointLight);
            if (pointLight) {
                // スムーズな遷移ではなく、通常の夜モードのように直接強度を使用
                pointLight.intensity = nightIntensity * gameSettings.nightModeLightIntensity;
            }
        });
    }
    
    // UIチェックボックスを更新（最も近い状態にスナップ）
    const shouldBeNightMode = nightIntensity > 0.5;
    gameSettings.nightModeEnabled = shouldBeNightMode;
    const nightModeCheckbox = document.getElementById('night-mode');
    if (nightModeCheckbox && nightModeCheckbox.checked !== shouldBeNightMode) {
        nightModeCheckbox.checked = shouldBeNightMode;
    }
}

function applyNightMode(isNight) {
    // applyNightModeが呼び出されました:
    
    if (isNight) {
        // 夜モードを適用
        // 夜モードを適用中
        if (ambientLight) {
            ambientLight.intensity = 0.05;
            // ambientLight強度を0.05に設定
        }
        if (directionalLight) {
            directionalLight.intensity = 0.05;
            // directionalLight強度を0.05に設定
        }
        if (renderer) {
            renderer.setClearColor(0x111122);
            // renderer clear colorを夜の色に設定
        }
        if (streetLights && streetLights.length > 0) {
            streetLights.forEach(light => {
                const pointLight = light.children.find(child => child.isPointLight);
                if (pointLight) pointLight.intensity = gameSettings.nightModeLightIntensity;
            });
            // 街灯をオン
        }
    } else {
        // 昼モードを適用
        // 昼モードを適用中
        if (ambientLight) {
            ambientLight.intensity = 0.5;
            // ambientLight強度を0.5に設定
        }
        if (directionalLight) {
            directionalLight.intensity = 0.8;
            // directionalLight強度を0.8に設定
        }
        if (renderer) {
            renderer.setClearColor(0x87CEEB);
            // renderer clear colorを昼の色に設定
        }
        if (streetLights && streetLights.length > 0) {
            streetLights.forEach(light => {
                const pointLight = light.children.find(child => child.isPointLight);
                if (pointLight) pointLight.intensity = 0;
            });
            // 街灯をオフ
        }
    }
}

// 夜モード変数
let isNightMode = false;

// キャラクターエディター変数
let characterEditorScene = null;
let characterEditorCamera = null;
let characterEditorRenderer = null;
let previewCharacter = null;
let currentPreviewCharacter = 'player';
let characterEditorAnimationId = null;



(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize textures first
        initializeTextures();
        
        // ここにDOM要素への割り当てを移動
        playerGunSound = document.getElementById('playerGunSound');
        mgGunSound = document.getElementById('mgGunSound');
        rrGunSound = document.getElementById('rrGunSound');
        srGunSound = document.getElementById('srGunSound');
        m1GunSound = document.getElementById('m1GunSound');
        aiM1GunSound = document.getElementById('aiM1GunSound');
        aimgGunSound = document.getElementById('aimgGunSound');
        aiGunSound = document.getElementById('aiGunSound');
        explosionSound = document.getElementById('explosionSound');
        relAudio = document.getElementById('rel-audio');
        startScreen = document.getElementById('start-screen');
        gameOverScreen = document.getElementById('game-over-screen');
        aiSrGunSound = document.getElementById('aiSrGunSound');
        playerSgSound = document.getElementById('playerSgSound');
        aiSgSound = document.getElementById('aiSgSound');
        clipSound = document.getElementById('clipSound');
        winScreen = document.getElementById('win-screen');
        playerHPDisplay = document.getElementById('player-hp-display');
        playerWeaponDisplay = document.getElementById('player-weapon-display'); // 追加
        aiHPDisplay = document.getElementById('ai-hp-display');
        ai2HPDisplay = document.getElementById('ai2-hp-display');
        ai3HPDisplay = document.getElementById('ai3-hp-display');
        redFlashOverlay = document.getElementById('red-flash-overlay');
        followStatusDisplay = document.getElementById('follow-status-display'); // 追加
        followButton = document.getElementById('follow-button'); // 追加
        // red-flash-overlayをbodyの最後に移動させて常に最前面に表示されるようにする
        if (redFlashOverlay && redFlashOverlay.parentNode !== document.body) {
            document.body.appendChild(redFlashOverlay);
        }
        scopeOverlay = document.getElementById('scope-overlay');
        cancelScopeButton = document.getElementById('cancel-scope-button');
        crosshairCircle = document.getElementById('crosshair-circle');
        crosshairPlusH = document.getElementById('crosshair-plus-h');
        crosshairPlusV = document.getElementById('crosshair-plus-v');
        killCountDisplay = document.getElementById('kill-count-display');
        gameTimerDisplay = document.getElementById('game-timer-display');
        playerTeamKillsDisplay = document.getElementById('player-team-kills-display');
        enemyTeamKillsDisplay = document.getElementById('enemy-team-kills-display');

        const editorButton = document.getElementById('map-editor-button');
        if (editorButton) {
            editorButton.addEventListener('click', () => {
                window.location.href = 'map_editor_sp.html';
            });
        }
        
        loadSettings();
        updateUnifiedMapSelector();
        
        
        const playerHpSelect = document.getElementById('player-hp');
        const aiHpSelect = document.getElementById('ai-hp');
        const mgCountSelect = document.getElementById('mg-count');
        const rrCountSelect = document.getElementById('rr-count');
        const srCountSelect = document.getElementById('sr-count');
        const sgCountSelect = document.getElementById('sg-count');
        const mrCountSelect = document.getElementById('mr-count');
        const aiCountRadios = document.querySelectorAll('input[name="ai-count"]');
        const autoAimRadios = document.querySelectorAll('input[name="auto-aim"]');
        const nightModeRadios = document.querySelectorAll('input[name="night-mode"]');
        const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
        const killCamModeRadios = document.querySelectorAll('input[name="killcam-mode"]');
        if (gameModeRadios.length > 0) { // gameModeRadiosが存在することを確認

            // ゲームモードラジオボタンの親要素を特定し、その後にプレイ時間設定を追加
            const teamArcadeRadio = document.querySelector('input[name="game-mode"][value="teamArcade"]');
            if (teamArcadeRadio) {
                const teamArcadeParentLabel = teamArcadeRadio.parentNode; // これが<label>要素

                const gameDurationDiv = document.createElement('div');
                gameDurationDiv.id = 'game-duration-setting';
                gameDurationDiv.style.marginTop = '10px';
                gameDurationDiv.innerHTML = `
                    <label style="display: block;">プレイ時間 (チームデスマッチ):</label>
                    <label style="display: inline-block; margin-right: 10px;">
                        <input type="radio" name="game-duration" value="180" checked> 3分
                    </label>
                    <label style="display: inline-block; margin-right: 10px;">
                        <input type="radio" name="game-duration" value="300"> 5分
                    </label>
                    <label style="display: inline-block;">
                        <input type="radio" name="game-duration" value="600"> 10分
                    </label>
                `;
                teamArcadeParentLabel.after(gameDurationDiv); // teamArcadeのlabelの直後に挿入

                // game-durationラジオボタンのイベントリスナーを設定
                const gameDurationRadios = document.querySelectorAll('input[name="game-duration"]');
                gameDurationRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.checked) {
                            gameSettings.gameDuration = parseInt(radio.value, 10);
                            saveSettings();
                        }
                    });
                });
            }
        }
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
        if (mrCountSelect) mrCountSelect.addEventListener('change', () => { gameSettings.mrCount = parseInt(mrCountSelect.value, 10); saveSettings(); });
        const defaultWeaponChecks = document.querySelectorAll('input[name="default-weapon"]');
        if (defaultWeaponChecks.length > 0) {
            defaultWeaponChecks.forEach(check => {
                check.checked = (gameSettings.defaultWeapon === check.value);
                check.addEventListener('change', () => {
                    if (check.checked) {
                        defaultWeaponChecks.forEach(other => {
                            if (other !== check) other.checked = false;
                        });
                        gameSettings.defaultWeapon = check.value;
                    } else {
                        const anyChecked = Array.from(defaultWeaponChecks).some(c => c.checked);
                        gameSettings.defaultWeapon = anyChecked
                            ? Array.from(defaultWeaponChecks).find(c => c.checked).value
                            : WEAPON_PISTOL;
                    }
                    saveSettings();
                });
            });
        }
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
        killCamModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.killCamMode = radio.value;
                    saveSettings();
                }
            });
        });
        const barrelRespawnRadios = document.querySelectorAll('input[name="barrel-respawn"]');
        barrelRespawnRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.barrelRespawn = radio.value === 'true';
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
        // Initialize unified map selector
        const unifiedMapSelector = document.getElementById('unified-map-selector');
        if (unifiedMapSelector) {
            unifiedMapSelector.addEventListener('change', () => {
                const selectedValue = unifiedMapSelector.value;
                
                if (selectedValue === 'default') {
                    gameSettings.mapType = 'default';
                    gameSettings.customMapName = '';
                } else if (selectedValue && selectedValue !== '---') {
                    // Custom map selected
                    gameSettings.mapType = 'custom';
                    gameSettings.customMapName = selectedValue;
                }
                
                saveSettings();
                
                // 核のオプション：地面以外のすべてのメッシュを強制削除
                debugLog('NUCLEAR OPTION: Deleting ALL mesh objects except ground...');
                const allObjects = [];
                scene.traverse((child) => {
                    if (child && child.isMesh) {
                        allObjects.push(child);
                    }
                });
                
                let deletedCount = 0;
                for (const obj of allObjects) {
                    // 地面だけは保護
                    if (obj.userData.isGround || (obj.position && obj.position.y <= 0)) {
                        debugLog('PROTECTING ground object:', obj.name || 'unnamed');
                        continue;
                    }
                    
                    debugLog('NUCLEAR DELETING:', obj.name || 'unnamed', 'type:', obj.userData.type, 'isHouseRoof:', obj.userData.isHouseRoof, 'position:', obj.position);
                    
                    // 親から削除
                    if (obj.parent) {
                        obj.parent.remove(obj);
                    } else {
                        scene.remove(obj);
                    }
                    
                    // obstacles配列から削除
                    const index = obstacles.indexOf(obj);
                    if (index > -1) {
                        obstacles.splice(index, 1);
                    }
                    
                    // メモリ解放
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                    
                    deletedCount++;
                }
                
                debugLog(`NUCLEAR OPTION: Deleted ${deletedCount} objects`);
                
                // ハードリセット：完全なゲーム再起動
                debugLog('Performing hard reset for map switching...');
                if (isGameRunning && !isPaused) {
                    restartGame();
                } else {
                    // ポーズ中や未開始時はバックグラウンドで開始しない
                    debugLog('Map switch deferred until Start/Resume.');
                }
                
                // ユーザーインタラクション後に音声を初期化
                initializeAudio();
            });
        }
        const saveMapSettingsBtn = document.getElementById('save-map-settings-btn');
        if (saveMapSettingsBtn) {
            saveMapSettingsBtn.addEventListener('click', () => {
                const unifiedMapSelector = document.getElementById('unified-map-selector');
                const selectedValue = unifiedMapSelector ? unifiedMapSelector.value : '';
                let selectedMapName = '';
                
                if (selectedValue === 'default' || selectedValue === '---') {
                    // For built-in maps, use a generic name or skip saving
                    selectedMapName = selectedValue === 'default' ? 'DefaultMap' : '';
                } else {
                    selectedMapName = selectedValue;
                }
                
                if (selectedMapName && selectedMapName !== '---') {
                    saveMapSettings(selectedMapName);
                }
            });
        }
        const resumeGameBtn = document.getElementById('resume-game-btn');
        if (resumeGameBtn) {
            resumeGameBtn.addEventListener('click', resumeGame);
        }

        const restartPauseBtn = document.getElementById('restart-pause-btn');
        if (restartPauseBtn) {
            restartPauseBtn.addEventListener('click', () => {
                startGame();
                restartGame();
            });
        }

        // --- cancelScopeButton のイベントリスナーをここに追加 ---
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
        // --- ここまで ---
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.style.backgroundColor = 'red';
        }
    // ReadMeリンクの追加
    const gunFightSettingsTitle = document.querySelector('#start-screen h1');
    if (gunFightSettingsTitle) {
        const readmeLinkDiv = document.createElement('div');
        readmeLinkDiv.style.textAlign = 'center';
        readmeLinkDiv.style.marginTop = '10px';
        const readmeLink = document.createElement('a');
        readmeLink.href = '#';
        readmeLink.textContent = 'ReadMe (説明書)';
        readmeLink.style.color = 'lightblue';
        readmeLink.style.textDecoration = 'underline';
        readmeLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('readme-screen').style.display = 'flex';
        });
        readmeLinkDiv.appendChild(readmeLink);
        gunFightSettingsTitle.after(readmeLinkDiv);
    }

    // ReadMeページの追加
    const readmeScreen = document.createElement('div');
    readmeScreen.id = 'readme-screen';
    readmeScreen.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.9);
        color: white;
        z-index: 1000;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
        flex-direction: column;
        align-items: center;
    `;
    readmeScreen.innerHTML = `
        <div style="max-width: 800px; width: 100%; text-align: left;">
            <h1 style="text-align: center; color: lightgreen;">GunFightArenaへようこそ</h1>
            <p>1V3から2V2のチームデスマッチまで、存分にGunFightが楽しめるシンプルかつ超エキサイティングなFPS！それがこのGunFightArenaだ！</p>
            <p>まずはプレイヤーと敵AIのHP（体力）を決めて、ProjectileSpeed（弾の速さ）を決めよう！×2の最速が一番エキサイティングだぞ！</p>
            <p>WeaponCountは、アリーナ内に配置できる各武器の数だ。武器は取った後も復活するぞ！但し、武器は1種類しか持つことができない。弾が尽きたら自動的にハンドガンに切り替わる。<br>Medikitは、HPが1回復する。アリーナに配置する数を決めよう！但し、1V3のアーケードモードのみで配置可だ。</p>
            <p>AICountで敵AIの数を決めよう！チームデスマッチでは、AIが1体味方になるが、その際にも必ず3AIsを選ぶようにしよう！</p>
            <p>FieldStateで、障害物が破壊された状態からのリスタートが選べるぞ！Keepの場合はどんどん隠れる場所がなくなっていくぞ！</p>
            <p>MapTypeでは、アプリ内蔵のデフォルトマップか、シンプルだが毎回障害物の配置が異なるランダムマップか、自作のオリジナルカスタムマップかをそれぞれ選べるぞ！</p>
            <p>強力なMap Editerで自作のオリジナルマップをゼロから作成可能！マップを簡単にカスタマイズして、より一層熱いバトルが楽しめる！</p>
            <p>LoadCustomMapで自作のマップデータ（.json)を読み込もう！一度読み込んだら、次回からはここからマップを呼び出せるぞ！</p>
            <p>GameModeで、さまざまなルールの熱いバトルを楽しもう！尚、プレイ時間はチームデスマッチとフリーフォーオールで有効だ！</p>
            <p>NightModeとは、まさに暗闇での夜戦モード！緊張感たっぷりのスリリングなバトルが楽しめる。LightIntensityでアリーナの明るさを調整可能！</p>
            <p>ButtonSettingでスマートフォンのボタン位置調整が可能！スマホでは、ゲーム中に★マークを押してポーズONで調整できる。自分に合ったボタンポジションでバトルに挑もう！</p>
            <p>チームデスマッチでは、味方AIからのFollow（フォロー）が受けられる。Followボタンを押すと、味方AIがプレイヤーに追従し、敵を発見した際には、攻撃もしてくれるぞ！もし敵と遭遇した際には再度ボタンを押して味方AIをフリーにさせて、積極的に攻撃をさせよう！チームワークで敵の背後に回り込んで仕留めるといった戦術も可能だ！但し、フレンドリーファイアにはくれぐれも注意！</p>
<p>■スマホでの操作：画面左半分＝前後左右移動　画面右半分＝始点移動　各種ボタン＝攻撃、しゃがみ、フォロー　★ボタン＝ポーズ&設定画面　×＝狙撃解除（スコープ画面内）</p>
<p>■PCでの操作：W=前進　S＝後進　A=左移動　D＝右移動　P=ポーズ&設定画面　F=AIフォロー　C＝しゃがむ　マウス＝視点移動　左クリック＝武器発射　右クリック＝狙撃解除</p>
            <div style="text-align: center; margin-top: 30px;">
                <button id="readme-back-button" style="padding: 15px 30px; font-size: 1.2em; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">戻る</button>
            </div>
        </div>
    `;
    document.body.appendChild(readmeScreen);

    const readmeBackButton = document.getElementById('readme-back-button');
    if (readmeBackButton) {
        readmeBackButton.addEventListener('click', () => {
            document.getElementById('readme-screen').style.display = 'none';
            document.getElementById('start-screen').style.display = 'flex';
        });
    }
    }); // Close first DOMContentLoaded event listener
})();

function updateUnifiedMapSelector() {
    const unifiedMapSelector = document.getElementById('unified-map-selector');
    if (!unifiedMapSelector) return;
    unifiedMapSelector.innerHTML = '';
    
    // Add built-in maps at the top
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'DefaultMap';
    unifiedMapSelector.appendChild(defaultOption);
    
    // Add separator
    const separator = document.createElement('option');
    separator.value = '---';
    separator.textContent = '--- Custom Maps ---';
    separator.disabled = true;
    separator.style.fontWeight = 'bold';
    separator.style.color = '#666';
    unifiedMapSelector.appendChild(separator);
    
    // Add custom maps
    const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
    const mapNames = Object.keys(allCustomMaps);
    
    if (mapNames.length === 0) {
        const noMapsOption = document.createElement('option');
        noMapsOption.value = '';
        noMapsOption.textContent = 'No custom maps available';
        noMapsOption.disabled = true;
        noMapsOption.style.color = '#999';
        unifiedMapSelector.appendChild(noMapsOption);
    } else {
        mapNames.forEach(mapName => {
            const option = document.createElement('option');
            option.value = mapName;
            option.textContent = mapName;
            unifiedMapSelector.appendChild(option);
        });
    }
    
    // Set current selection
    let currentValue = 'default'; // Always default to DefaultMap on first launch
    
    // Check if we have saved settings and valid custom map
    if (gameSettings.mapType === 'custom' && gameSettings.customMapName && allCustomMaps[gameSettings.customMapName]) {
        currentValue = gameSettings.customMapName;
    } else {
        // If mapType is not set or invalid, default to 'default'
        gameSettings.mapType = 'default';
        gameSettings.customMapName = '';
        saveSettings();
    }
    
    // Try to set the value
    unifiedMapSelector.value = currentValue;
    
    // If the value wasn't set (e.g., custom map no longer exists), default to 'default'
    if (unifiedMapSelector.value !== currentValue) {
        unifiedMapSelector.value = 'default';
        gameSettings.mapType = 'default';
        gameSettings.customMapName = '';
        saveSettings();
    }
}

// Texture variables (declare before initialization)
let brickTexture, concreteTexture;

// Initialize textures early for better performance
function initializeTextures() {
    if (!brickTexture) {
        brickTexture = createBrickTexture();
        concreteTexture = createConcreteTexture();
    }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);
const clock = new THREE.Clock();
const player = new THREE.Object3D();
player.add(camera);
scene.add(player);
player.position.copy(PLAYER_INITIAL_POSITION);
player.rotation.y = Math.PI;
camera.position.set(0, 0, 0);
camera.position.z = 5; // カメラを少し後ろに配置
let isGameRunning = false;
let playerTargetHeight = 2.0;
let isCrouchingToggle = false;
const GRAVITY = 9.8;
let playerHP = 3;
let lastPlayerDeathPos = null;
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
const WEAPON_MR = 'm1rifle';
let currentWeapon = WEAPON_PISTOL;
let ammoMG = 0;
  let ammoRR = 0;
  let ammoSR = 0;
  let ammoSG = 0;
  let ammoMR = 0;
  let ammoMRClip = 0;
  let playerMGReloadUntil = 0;
  let playerMRReloadUntil = 0;
const MAX_AMMO_MG = 50;
const MAX_AMMO_RR = 3;
  const MAX_AMMO_SR = 5;
  const MAX_AMMO_SG = 10;
  const MAX_AMMO_MR = 8;
  const PICKUP_AMMO_MR = 24;
const FIRE_RATE_PISTOL = 0.3;
const FIRE_RATE_MG = 0.1;
const FIRE_RATE_RR = 1.5;
const FIRE_RATE_SR = 2.0;
const FIRE_RATE_SG = 0.8;
const FIRE_RATE_MR = 0.3;
const MR_PROJECTILE_SPEED_MULT = 1.6;
const SHOTGUN_PELLET_COUNT = 7;
const SHOTGUN_SPREAD_ANGLE = Math.PI / 16;
const SHOTGUN_RANGE = 15;
const SHOTGUN_PELLET_DAMAGE = 2;
const WEAPON_SG_SOUND = 'sgun.mp3';
const AI_WEAPON_SG_SOUND = 'aisgun.mp3';
const ENABLE_EXPERIMENTAL_AI_FLOW = false;
// Enable rooftop logic so AI can find ladders, climb to rooftops and engage players there.
// 家の屋根には登れないようにする - 完全に無効化
const ENABLE_AI_ROOFTOP_LOGIC = true; // デフォルトマップでもAIが塔に登れるように有効化
const FORCE_AI_ROOFTOP_TEST = false; // テスト用: AIを強制的に塔へ向かわせる

function isInfiniteDefaultWeaponActive(weaponType) {
    return false;
}

function isDefaultM1Weapon() {
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    return selected === WEAPON_MR;
}

function getPlayerMRClipAmmo() {
    return isDefaultM1Weapon() ? ammoMR : ammoMRClip;
}

function getPlayerMRDisplayAmmo() {
    return isDefaultM1Weapon() ? getPlayerMRClipAmmo() : ammoMR;
}

function setPlayerMRClipAmmo(value) {
    const clamped = Math.max(0, value);
    if (isDefaultM1Weapon()) {
        ammoMR = clamped;
    } else {
        ammoMRClip = clamped;
    }
}

function isAIDefaultM1Weapon(ai) {
    if (!ai) return false;
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    return selected === WEAPON_MR;
}

function getAIClipAmmo(ai) {
    if (!ai) return 0;
    if (isAIDefaultM1Weapon(ai)) return ai.ammoMR;
    return (ai.userData && ai.userData.mrClipAmmo) ? ai.userData.mrClipAmmo : 0;
}

function setAIClipAmmo(ai, value) {
    if (!ai) return;
    const clamped = Math.max(0, value);
    if (isAIDefaultM1Weapon(ai)) {
        ai.ammoMR = clamped;
        return;
    }
    if (!ai.userData) ai.userData = {};
    ai.userData.mrClipAmmo = clamped;
}

function applyPlayerDefaultWeaponLoadout() {
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    currentWeapon = selected;
    ammoMG = selected === WEAPON_MG ? MAX_AMMO_MG : 0;
    ammoRR = selected === WEAPON_RR ? MAX_AMMO_RR : 0;
    ammoSR = selected === WEAPON_SR ? MAX_AMMO_SR : 0;
    ammoSG = selected === WEAPON_SG ? MAX_AMMO_SG : 0;
    const isDefaultM1 = selected === WEAPON_MR;
    ammoMR = isDefaultM1 ? MAX_AMMO_MR : 0;
    ammoMRClip = isDefaultM1 ? MAX_AMMO_MR : 0;
}

function isInfiniteDefaultWeaponActiveForAI(ai, weaponType) {
    if (!ai) return false;
    return false;
}

function applyAIDefaultWeaponLoadout(ai) {
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    if (!ai.userData) ai.userData = {};
    ai.currentWeapon = selected;
    ai.ammoMG = selected === WEAPON_MG ? MAX_AMMO_MG : 0;
    ai.ammoRR = selected === WEAPON_RR ? MAX_AMMO_RR : 0;
    ai.ammoSR = selected === WEAPON_SR ? MAX_AMMO_SR : 0;
    ai.ammoSG = selected === WEAPON_SG ? MAX_AMMO_SG : 0;
    const isDefaultM1 = selected === WEAPON_MR;
    ai.ammoMR = isDefaultM1 ? MAX_AMMO_MR : 0;
    ai.userData.mrClipAmmo = isDefaultM1 ? MAX_AMMO_MR : 0;
}

function getPlayerFallbackWeapon() {
    return gameSettings.defaultWeapon && gameSettings.defaultWeapon !== WEAPON_PISTOL
        ? gameSettings.defaultWeapon
        : WEAPON_PISTOL;
}

function switchPlayerToFallbackWeapon() {
    const fallback = getPlayerFallbackWeapon();
    currentWeapon = fallback;
    if (fallback === WEAPON_MG && ammoMG <= 0) ammoMG = MAX_AMMO_MG;
    if (fallback === WEAPON_RR && ammoRR <= 0) ammoRR = MAX_AMMO_RR;
    if (fallback === WEAPON_SR && ammoSR <= 0) ammoSR = MAX_AMMO_SR;
    if (fallback === WEAPON_SG && ammoSG <= 0) ammoSG = MAX_AMMO_SG;
    if (fallback === WEAPON_MR && getPlayerMRClipAmmo() <= 0 && playerMRReloadUntil <= 0) {
        setPlayerMRClipAmmo(MAX_AMMO_MR);
    }
}

function switchAIToFallbackWeapon(ai) {
    if (!ai) return;
    const fallback = gameSettings.defaultWeapon && gameSettings.defaultWeapon !== WEAPON_PISTOL
        ? gameSettings.defaultWeapon
        : WEAPON_PISTOL;
    ai.currentWeapon = fallback;
    if (fallback === WEAPON_MG && ai.ammoMG <= 0) ai.ammoMG = MAX_AMMO_MG;
    if (fallback === WEAPON_RR && ai.ammoRR <= 0) ai.ammoRR = MAX_AMMO_RR;
    if (fallback === WEAPON_SR && ai.ammoSR <= 0) ai.ammoSR = MAX_AMMO_SR;
    if (fallback === WEAPON_SG && ai.ammoSG <= 0) ai.ammoSG = MAX_AMMO_SG;
    if (fallback === WEAPON_MR && ai.ammoMR <= 0) ai.ammoMR = MAX_AMMO_MR;
}

function showReloadingText() {
    let el = document.getElementById('reloading-text');
    if (!el) {
        el = document.createElement('div');
        el.id = 'reloading-text';
        document.body.appendChild(el);
    }
    el.style.position = 'fixed';
    el.style.top = '50%';
    el.style.left = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.color = '#FFD700';
    el.style.fontSize = '24px';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    el.style.display = 'block';
    el.style.zIndex = '1000';
    el.textContent = 'RELOADING'; // テキスト内容を追加
    
    // 0.5秒遅らせてリロード音を鳴らす
    setTimeout(() => {
        if (relAudio) {
            relAudio.cloneNode(true).play().catch(e => {
                // Reload sound play failed:
            });
        }
    }, 500);
}

function hideReloadingText() {
    const el = document.getElementById('reloading-text');
    if (el) el.style.display = 'none';
}

function playSound(audioElement) {
    if (!audioElement) return;
    
    try {
        // 既存の再生中の同じ音声を停止
        const allSameAudio = document.querySelectorAll(`audio[id="${audioElement.id}"]`);
        allSameAudio.forEach(audio => {
            if (!audio.paused && audio !== audioElement) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        
        // 新しいインスタンスを作成して再生
        const soundClone = audioElement.cloneNode(true);
        soundClone.volume = audioElement.volume || 1.0;
        soundClone.play().catch(error => {
            // Sound play failed:
        });
    } catch (error) {
        // Sound error:
    }
}

let audioCtx;
const audioBufferCache = new Map();
const spatialAudioPools = new Map();
const SPATIAL_POOL_SIZE = 6;
let audioListenerPos = new THREE.Vector3();
let audioListenerForward = new THREE.Vector3();
let audioListenerRight = new THREE.Vector3();
let audioListenerUp = new THREE.Vector3();

function getAudioContext() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
    }
    return audioCtx;
}

function updateAudioListenerFromCamera(camera) {
    const ctx = getAudioContext();
    if (!ctx || !camera) return;

    const listener = ctx.listener;
    const position = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldPosition(position);
    camera.getWorldDirection(forward);
    up.copy(camera.up).applyQuaternion(camera.quaternion).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    audioListenerPos.copy(position);
    audioListenerForward.copy(forward);
    audioListenerUp.copy(up);
    audioListenerRight.copy(right);

    if (listener.positionX) {
        listener.positionX.value = position.x;
        listener.positionY.value = position.y;
        listener.positionZ.value = position.z;
        listener.forwardX.value = forward.x;
        listener.forwardY.value = forward.y;
        listener.forwardZ.value = forward.z;
        listener.upX.value = up.x;
        listener.upY.value = up.y;
        listener.upZ.value = up.z;
    } else if (listener.setPosition && listener.setOrientation) {
        listener.setPosition(position.x, position.y, position.z);
        listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
}

function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function applyRagdollPose(parts, seed = Math.random()) {
    if (!parts) return;
    const rand = mulberry32(Math.floor(seed * 1e9));
    const r = (min, max) => min + (max - min) * rand();

    if (parts.body) parts.body.rotation.set(r(-0.5, 0.5), r(-0.6, 0.6), r(-0.7, 0.7));
    if (parts.head) parts.head.rotation.set(r(-0.4, 0.4), r(-0.5, 0.5), r(-0.4, 0.4));
    if (parts.leftArm) parts.leftArm.rotation.set(r(-1.2, 0.3), r(-0.6, 0.6), r(-1.2, 1.2));
    if (parts.rightArm) parts.rightArm.rotation.set(r(-1.2, 0.3), r(-0.6, 0.6), r(-1.2, 1.2));
    if (parts.leftElbow) parts.leftElbow.rotation.set(r(0.2, 1.4), 0, 0);
    if (parts.rightElbow) parts.rightElbow.rotation.set(r(0.2, 1.4), 0, 0);
    if (parts.leftHip) parts.leftHip.rotation.set(r(-0.6, 0.6), r(-0.4, 0.4), r(-0.6, 0.6));
    if (parts.rightHip) parts.rightHip.rotation.set(r(-0.6, 0.6), r(-0.4, 0.4), r(-0.6, 0.6));
    if (parts.leftKnee) parts.leftKnee.rotation.set(r(0.1, 1.5), 0, 0);
    if (parts.rightKnee) parts.rightKnee.rotation.set(r(0.1, 1.5), 0, 0);
}

function getRooftopObstacleUnder(position, objectBodyHeight) {
    let best = null;
    let bestTop = -Infinity;
    const horizontalBox = new THREE.Box2(
        new THREE.Vector2(position.x - 0.2, position.z - 0.2),
        new THREE.Vector2(position.x + 0.2, position.z + 0.2)
    );
    const feetY = position.y - objectBodyHeight / 2;
    for (const obs of obstacles) {
        if (!obs.userData || !obs.userData.isRooftop || obs.userData.isHouseRoof) continue;
        const box = new THREE.Box3().setFromObject(obs);
        const geom = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
        const h = geom ? geom.parameters.height : 4;
        const top = obs.position.y + h / 2;
        const obstacleHorizontalBox = new THREE.Box2(
            new THREE.Vector2(box.min.x, box.min.z),
            new THREE.Vector2(box.max.x, box.max.z)
        );
        if (horizontalBox.intersectsBox(obstacleHorizontalBox) && feetY >= top - 0.1) {
            if (top > bestTop) {
                bestTop = top;
                best = obs;
            }
        }
    }
    return best;
}

function getDeathTargetPosition(basePos, objectBodyHeight, forAI, rooftopObstacle = null) {
    let target = basePos.clone();
    if (rooftopObstacle) {
        const geometry = rooftopObstacle.geometry || (rooftopObstacle.children && rooftopObstacle.children[0] ? rooftopObstacle.children[0].geometry : null);
        const width = geometry && geometry.parameters && geometry.parameters.width ? geometry.parameters.width : 6;
        const depth = geometry && geometry.parameters && geometry.parameters.depth ? geometry.parameters.depth : 6;
        const halfW = width / 2;
        const halfD = depth / 2;
        const center = rooftopObstacle.position.clone();
        const dir = new THREE.Vector3(target.x - center.x, 0, target.z - center.z);
        if (dir.lengthSq() < 0.01) {
            const angle = Math.random() * Math.PI * 2;
            dir.set(Math.cos(angle), 0, Math.sin(angle));
        }
        dir.normalize();
        const dropDistance = Math.max(halfW, halfD) + 1.5;
        target.x = center.x + dir.x * dropDistance;
        target.z = center.z + dir.z * dropDistance;
    }

    const safe = findSafePositionNear(target, 6, 1, 1.2, objectBodyHeight, 1.2);
    const groundY = forAI ? getGroundSurfaceY(safe) : getGroundY(safe, objectBodyHeight);
    const clearance = forAI ? 0.4 : 0.25; // keep bodies from sinking into the ground during killcam
    safe.y = groundY + clearance;
    return safe;
}

function isProbablyMobileDevice() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile;
    }
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

function shouldShowTouchControls() {
    // Only show touch controls on mobile devices
    if (!isProbablyMobileDevice()) return false;
    if (window.matchMedia) {
        return window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(hover: none)').matches;
    }
    return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
}

function enforceTouchUIVisibility() {
    if (shouldShowTouchControls()) return;
    const ids = ['joystick-move', 'fire-button', 'crouch-button', 'zoom-button', 'follow-button'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.style.pointerEvents = 'none';
        }
    });
}

function getSpatialPool(audioElement) {
    if (!audioElement) return null;
    const key = audioElement.id || (audioElement.currentSrc || audioElement.src);
    if (!key) return null;
    if (spatialAudioPools.has(key)) return spatialAudioPools.get(key);

    const ctx = getAudioContext();
    if (!ctx) return null;

    const pool = [];
    for (let i = 0; i < SPATIAL_POOL_SIZE; i++) {
        const el = audioElement.cloneNode(true);
        el.preload = 'auto';
        el.volume = 1.0;
        el.load();
        if (document.body) {
            document.body.appendChild(el);
        }

        const source = ctx.createMediaElementSource(el);
        const panner = ctx.createStereoPanner();
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 8000;

        const gain = ctx.createGain();
        gain.gain.value = audioElement.volume || 1.0;

        source.connect(panner);
        panner.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(ctx.destination);

        pool.push({ el, panner, lowpass, gain });
    }

    const poolData = { pool, cursor: 0 };
    spatialAudioPools.set(key, poolData);
    return poolData;
}

function playSpatialSound(audioElement, position, options = {}) {
    if (!audioElement || !position) return;

    if (window.DEBUG_SPATIAL_AUDIO) {
        console.log('[spatial] play', audioElement.id || audioElement.src, position);
    }

    const ctx = getAudioContext();
    if (!ctx) {
        if (window.DEBUG_SPATIAL_AUDIO) console.log('[spatial] no audio ctx');
        playSound(audioElement);
        return;
    }
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    const poolData = getSpatialPool(audioElement);
    if (!poolData || !poolData.pool.length) {
        if (window.DEBUG_SPATIAL_AUDIO) console.log('[spatial] no pool');
        playSound(audioElement);
        return;
    }

    const pool = poolData.pool;
    let entry = null;
    for (let i = 0; i < pool.length; i++) {
        const candidate = pool[(poolData.cursor + i) % pool.length];
        if (candidate.el.paused || candidate.el.ended) {
            entry = candidate;
            poolData.cursor = (poolData.cursor + i + 1) % pool.length;
            break;
        }
    }
    if (!entry) {
        entry = pool[poolData.cursor];
        poolData.cursor = (poolData.cursor + 1) % pool.length;
    }

    const toSound = position.clone().sub(audioListenerPos);
    const distance = Math.max(0.001, toSound.length());
    const dir = toSound.clone().normalize();
    const panRaw = audioListenerRight.dot(dir);
    const frontDot = audioListenerForward.dot(dir);
    const panScale = options.panScale || 1.2;
    const pan = Math.max(-1, Math.min(1, panRaw * panScale));

    // Distance attenuation (gentle)
    const distanceGain = 1 / (1 + (distance / (options.distanceScale || 25)));
    const behindGain = frontDot < 0 ? (options.behindGain || 0.97) : 1.0;
    const gainBoost = options.gainBoost || 1.0;
    entry.gain.gain.value = (audioElement.volume || 1.0) * distanceGain * behindGain * gainBoost;
    entry.panner.pan.value = pan;

    // Slight muffling when behind
    entry.lowpass.frequency.value = frontDot < 0 ? (options.behindCutoff || 9000) : (options.frontCutoff || 14000);

    entry.el.currentTime = 0;
    entry.el.play().catch(() => {
        if (window.DEBUG_SPATIAL_AUDIO) console.log('[spatial] play failed', audioElement.id || audioElement.src);
        playSound(audioElement);
    });
}

function playReloadSound() {
    if (relAudio) {
        setTimeout(() => {
            playSound(relAudio);
        }, 500);
    }
}

let lastFloatingCleanupTime = 0;
const FLOATING_CLEANUP_INTERVAL = 5.0; // 5秒ごとにクリーンアップ
let lastFireTime = -FIRE_RATE_PISTOL;
let isMouseButtonDown = false;
let isScoping = false;
let isRifleZoomed = false;
const MR_ZOOM_FOV = 55;
let isElevating = false;
let elevatingTargetY = 0;
let elevatingTargetObstacle = null;
let currentGroundObstacle = null;
let isIgnoringTowerCollision = false;
let ignoreTowerTimer = 0;
let lastClimbedTower = null;
let isFollowingPlayerMode = false; // AI追従モードフラグ
let playerBreadcrumbs = [];
let timeSinceLastBreadcrumb = 0;
const AUTO_AIM_RANGE = 160;
const AUTO_AIM_ANGLE = Math.PI / 8;
const AUTO_AIM_STRENGTH = 0.4; // Increased from 0.3 for easier aiming
const AUTO_AIM_SCOPE_ACQUIRE_RADIUS_NDC = 0.55; // 中心付近に入れば積極的に取得 (increased from 0.40)
const AUTO_AIM_SCOPE_KEEP_RADIUS_NDC = 0.75;    // ロック後は広めに維持して追随 (increased from 0.62)
let sniperAutoAimLockedAI = null;
let sniperAutoAimSmoothedPoint = null;

function getPlayerAutoAimCandidateForAI(ai, maxScreenRadius) {
    if (!ai || ai.hp <= 0) return null;
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';
    if (isTeamModeOrTeamArcade && ai.team === 'player') return null;

    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    let best = null;
    let bestScore = Infinity;
    const aimPoints = [getAIUpperTorsoPos(ai), getAILowerTorsoPos(ai), getAIHeadPos(ai)];
    for (const p of aimPoints) {
        if (!checkLineOfSight(origin, p, obstacles)) continue;
        const toTarget = new THREE.Vector3().subVectors(p, origin);
        const dist = toTarget.length();
        if (dist > AUTO_AIM_RANGE || dist < 0.001) continue;

        const ndc = p.clone().project(camera);
        if (ndc.z <= 0 || ndc.z >= 1) continue;
        const screenR = Math.sqrt(ndc.x * ndc.x + ndc.y * ndc.y);
        if (screenR > maxScreenRadius) continue;

        const score = screenR * 1.0 + dist * 0.002;
        if (score < bestScore) {
            bestScore = score;
            best = { ai, point: p.clone(), score };
        }
    }
    return best;
}

function getPlayerAutoAimTargetPoint() {
    // 1) ロック中はその敵だけ追従（別の敵へ飛ばない）
    if (sniperAutoAimLockedAI) {
        const locked = getPlayerAutoAimCandidateForAI(sniperAutoAimLockedAI, AUTO_AIM_SCOPE_KEEP_RADIUS_NDC);
        if (locked) return locked.point;
        sniperAutoAimLockedAI = null;
        return null; // このフレームは再取得しない（急な飛び防止）
    }

    // 2) 未ロック時は中央付近に入った敵だけ取得
    let best = null;
    let bestScore = Infinity;
    for (const ai of ais) {
        const cand = getPlayerAutoAimCandidateForAI(ai, AUTO_AIM_SCOPE_ACQUIRE_RADIUS_NDC);
        if (!cand) continue;
        if (cand.score < bestScore) {
            bestScore = cand.score;
            best = cand;
        }
    }
    if (best) {
        sniperAutoAimLockedAI = best.ai;
        return best.point;
    }
    return null;
}

function projectPointToScopeNDC(point, yaw, pitch) {
    const oldYaw = player.rotation.y;
    const oldPitch = camera.rotation.x;
    player.rotation.y = yaw;
    camera.rotation.x = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    player.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const ndc = point.clone().project(camera);
    player.rotation.y = oldYaw;
    camera.rotation.x = oldPitch;
    player.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    return ndc;
}

function updateSniperScopeAutoAim(delta) {
    if (!isScoping || currentWeapon !== WEAPON_SR) {
        sniperAutoAimLockedAI = null;
        sniperAutoAimSmoothedPoint = null;
        return;
    }
    const targetPoint = getPlayerAutoAimTargetPoint();
    if (!targetPoint) {
        sniperAutoAimSmoothedPoint = null;
        return;
    }

    if (!sniperAutoAimSmoothedPoint) sniperAutoAimSmoothedPoint = targetPoint.clone();
    const followAlpha = 1.0 - Math.exp(-14.0 * delta); // 追随を強化
    sniperAutoAimSmoothedPoint.lerp(targetPoint, followAlpha);

    const ndcNow = sniperAutoAimSmoothedPoint.clone().project(camera);
    if (ndcNow.z <= 0 || ndcNow.z >= 1) {
        sniperAutoAimLockedAI = null;
        sniperAutoAimSmoothedPoint = null;
        return;
    }
    const currentRadius = Math.hypot(ndcNow.x, ndcNow.y);
    if (currentRadius > AUTO_AIM_SCOPE_KEEP_RADIUS_NDC) {
        // スコープ外へ引っ張らない
        sniperAutoAimLockedAI = null;
        sniperAutoAimSmoothedPoint = null;
        return;
    }

    // 画面誤差ベースで吸い付ける（敵を中心へ寄せる）
    const yawGain = 8.5 * AUTO_AIM_STRENGTH;
    const pitchGain = 7.0 * AUTO_AIM_STRENGTH;
    const yawStep = THREE.MathUtils.clamp(Math.abs(ndcNow.x) * yawGain * delta, 0, 1.8 * delta);
    const pitchStep = THREE.MathUtils.clamp(Math.abs(ndcNow.y) * pitchGain * delta, 0, 1.45 * delta);

    if (yawStep > 0.00001) {
        const yaw = player.rotation.y;
        const pitch = camera.rotation.x;
        const plus = projectPointToScopeNDC(sniperAutoAimSmoothedPoint, yaw + yawStep, pitch);
        const minus = projectPointToScopeNDC(sniperAutoAimSmoothedPoint, yaw - yawStep, pitch);
        if (Math.abs(plus.x) < Math.abs(ndcNow.x) || Math.abs(minus.x) < Math.abs(ndcNow.x)) {
            player.rotation.y = (Math.abs(plus.x) <= Math.abs(minus.x)) ? yaw + yawStep : yaw - yawStep;
        }
    }

    if (pitchStep > 0.00001) {
        const yaw = player.rotation.y;
        const pitch = camera.rotation.x;
        const now = projectPointToScopeNDC(sniperAutoAimSmoothedPoint, yaw, pitch);
        const plus = projectPointToScopeNDC(sniperAutoAimSmoothedPoint, yaw, pitch + pitchStep);
        const minus = projectPointToScopeNDC(sniperAutoAimSmoothedPoint, yaw, pitch - pitchStep);
        if (Math.abs(plus.y) < Math.abs(now.y) || Math.abs(minus.y) < Math.abs(now.y)) {
            camera.rotation.x = (Math.abs(plus.y) <= Math.abs(minus.y)) ? pitch + pitchStep : pitch - pitchStep;
        }
    }
}

// Add camera rotation limits
camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
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
    gameSettings.autoAim = document.querySelector('input[name="auto-aim"]:checked').value;
    gameSettings.killCamMode = document.querySelector('input[name="killcam-mode"]:checked').value;
    const barrelRespawnRadio = document.querySelector('input[name="barrel-respawn"]:checked');
    if (barrelRespawnRadio) {
        gameSettings.barrelRespawn = barrelRespawnRadio.value === 'true';
    }
    gameSettings.nightModeEnabled = document.getElementById('night-mode').checked;
    gameSettings.nightModeIntensity = document.getElementById('night-mode-intensity').value;
    gameSettings.timeLapseMode = document.getElementById('time-lapse-mode').checked;
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
}

function loadSettings() {
    // loadSettings() called
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        const parsedSavedSettings = JSON.parse(savedSettings);
        if (parsedSavedSettings.gameMode === undefined) {
            parsedSavedSettings.gameMode = 'battle';
        }
        if (parsedSavedSettings.killCamMode === undefined) {
            parsedSavedSettings.killCamMode = 'playerOnly';
        }
        if (parsedSavedSettings.nightModeLightIntensity === undefined) {
            parsedSavedSettings.nightModeLightIntensity = 2.0;
        }
        if (parsedSavedSettings.medikitCount === undefined) {
            parsedSavedSettings.medikitCount = 0;
        }
        if (parsedSavedSettings.defaultWeapon === undefined) {
            parsedSavedSettings.defaultWeapon = 'pistol';
        }
        if (parsedSavedSettings.mrCount === undefined) {
            parsedSavedSettings.mrCount = gameSettings.mrCount;
        }
        Object.assign(gameSettings, parsedSavedSettings);
        // Add default for buttonPositions if it doesn't exist
        if (parsedSavedSettings.buttonPositions === undefined) {
            parsedSavedSettings.buttonPositions = {
                fire: { right: '20px', bottom: '120px' },
                crouch: { right: '20px', bottom: '55px' },
                zoom: { right: '90px', bottom: '55px' },
                joystick: { left: '10%', bottom: '10%' }
            };
        } else if (parsedSavedSettings.buttonPositions.joystick === undefined) {
            parsedSavedSettings.buttonPositions.joystick = { left: '10%', bottom: '10%' };
        } else if (parsedSavedSettings.buttonPositions.zoom === undefined) {
            parsedSavedSettings.buttonPositions.zoom = { right: '90px', bottom: '55px' };
        }

        Object.assign(gameSettings, parsedSavedSettings);
        // Add default for buttonPositions if it doesn't exist
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.gameMode);
        });
        document.querySelectorAll('input[name="killcam-mode"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.killCamMode);
        });
        document.querySelectorAll('input[name="barrel-respawn"]').forEach(radio => {
            radio.checked = (radio.value === String(gameSettings.barrelRespawn));
        });
        document.querySelectorAll('input[name="default-weapon"]').forEach(check => {
            check.checked = (gameSettings.defaultWeapon === check.value);
        });
        const nightModeIntensitySlider = document.getElementById('night-mode-intensity');
        const nightModeIntensityValueSpan = document.getElementById('night-mode-intensity-value');
        if (nightModeIntensitySlider) {
            nightModeIntensitySlider.value = gameSettings.nightModeLightIntensity;
        }
        if (nightModeIntensityValueSpan) {
            nightModeIntensityValueSpan.textContent = gameSettings.nightModeLightIntensity;
        }
        
        // Time Lapse Mode
        const timeLapseCheckbox = document.getElementById('time-lapse-mode');
        if (timeLapseCheckbox) {
            timeLapseCheckbox.checked = gameSettings.timeLapseMode || false;
            
            // Start Time Lapse mode if it was enabled
            if (gameSettings.timeLapseMode) {
                setTimeout(() => {
                    startTimeLapseMode();
                }, 1000); // Delay to ensure everything is loaded
            }
        }
        
        // Night Mode checkbox initialization
        const nightModeCheckbox = document.getElementById('night-mode');
        if (nightModeCheckbox) {
            nightModeCheckbox.checked = gameSettings.nightModeEnabled || false;
            applyNightMode(gameSettings.nightModeEnabled);
        }

        // Apply button positions
        if (gameSettings.buttonPositions) {
            const fireButton = document.getElementById('fire-button');
            const crouchButton = document.getElementById('crouch-button');
            const zoomButton = document.getElementById('zoom-button');
            const joystickZone = document.getElementById('joystick-move');
            const followButton = document.getElementById('follow-button');
            const previewFireButton = document.getElementById('preview-fire-button');
            const previewCrouchButton = document.getElementById('preview-crouch-button');
            const previewZoomButton = document.getElementById('preview-zoom-button');
            const previewJoystickZone = document.getElementById('preview-joystick-zone');
            const previewFollowButton = document.getElementById('preview-follow-button');

            const setupButton = (btn, position, displayType = 'flex') => {
                if (!btn) return;
                if (shouldShowTouchControls()) {
                    if (position) {
                        btn.style.right = position.right || '';
                        btn.style.bottom = position.bottom || '';
                        btn.style.left = position.left || '';
                        btn.style.top = position.top || '';
                        // startGameで表示制御するため、ここではdisplayを設定しない
                    }
                } else {
                    btn.style.display = 'none'; // PCなら非表示
                }
            };
            
            setupButton(fireButton, gameSettings.buttonPositions.fire, 'flex');
            setupButton(crouchButton, gameSettings.buttonPositions.crouch, 'flex');
            setupButton(zoomButton, gameSettings.buttonPositions.zoom, 'flex');
            setupButton(joystickZone, gameSettings.buttonPositions.joystick, 'block');
            setupButton(followButton, gameSettings.buttonPositions.follow, 'flex');

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
            if (previewZoomButton && gameSettings.buttonPositions.zoom) {
                previewZoomButton.style.right = gameSettings.buttonPositions.zoom.right;
                previewZoomButton.style.bottom = gameSettings.buttonPositions.zoom.bottom;
                previewZoomButton.style.left = '';
                previewZoomButton.style.top = '';
            }
            if (previewJoystickZone && gameSettings.buttonPositions.joystick) {
                previewJoystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                previewJoystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                previewJoystickZone.style.right = '';
                previewJoystickZone.style.top = '';
            }
            if (previewFollowButton && gameSettings.buttonPositions.follow) {
                previewFollowButton.style.right = gameSettings.buttonPositions.follow.right;
                previewFollowButton.style.bottom = gameSettings.buttonPositions.follow.bottom;
                previewFollowButton.style.left = '';
                previewFollowButton.style.top = '';
            }
        }
    }
}

// マップごとの設定を保存する関数
function saveMapSettings(mapName) {
    if (!mapName || mapName === '') {
        alert('マップが選択されていません。');
        return;
    }
    
    // 現在の設定をコピーして保存（customMapNameは除外）
    const settingsToSave = { ...gameSettings };
    delete settingsToSave.customMapName; // マップ名はキーとして使用するので除外
    
    const key = `mapSettings_${mapName}`;
    localStorage.setItem(key, JSON.stringify(settingsToSave));
    alert(`設定を保存しました: ${mapName}`);
}

// マップごとの設定を読み込む関数
function loadMapSettings(mapName) {
    if (!mapName || mapName === '') {
        return;
    }
    
    const key = `mapSettings_${mapName}`;
    const savedSettings = localStorage.getItem(key);
    if (!savedSettings) {
        return; // 保存された設定がない場合は何もしない
    }
    
    try {
        const parsedSavedSettings = JSON.parse(savedSettings);
        
        // デフォルト値の設定
        if (parsedSavedSettings.gameMode === undefined) {
            parsedSavedSettings.gameMode = 'battle';
        }
        if (parsedSavedSettings.killCamMode === undefined) {
            parsedSavedSettings.killCamMode = 'playerOnly';
        }
        if (parsedSavedSettings.nightModeLightIntensity === undefined) {
            parsedSavedSettings.nightModeLightIntensity = 0.8;
        }
        if (parsedSavedSettings.medikitCount === undefined) {
            parsedSavedSettings.medikitCount = 0;
        }
        if (parsedSavedSettings.defaultWeapon === undefined) {
            parsedSavedSettings.defaultWeapon = 'pistol';
        }
                if (parsedSavedSettings.buttonPositions === undefined) {
                    parsedSavedSettings.buttonPositions = {
                        fire: { right: '20px', bottom: '120px' },
                        crouch: { right: '20px', bottom: '55px' },
                        joystick: { left: '10%', bottom: '10%' },
                        zoom: { right: '90px', bottom: '55px' },
                        follow: { right: '20px', bottom: '190px' } // 追加
                    };
                } else if (parsedSavedSettings.buttonPositions.joystick === undefined) {
                    parsedSavedSettings.buttonPositions.joystick = { left: '10%', bottom: '10%' };
                } else if (parsedSavedSettings.buttonPositions.follow === undefined) { // 追加
                    parsedSavedSettings.buttonPositions.follow = { right: '20px', bottom: '190px' }; // 追加
                } else if (parsedSavedSettings.buttonPositions.zoom === undefined) {
                    parsedSavedSettings.buttonPositions.zoom = { right: '90px', bottom: '55px' };
                }
                
                // gameSettingsに適用
                Object.assign(gameSettings, parsedSavedSettings);
                
                // UIに反映
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
                if (document.getElementById('mr-count')) document.getElementById('mr-count').value = gameSettings.mrCount;
                document.querySelectorAll('input[name="default-weapon"]').forEach(check => {
                    check.checked = (gameSettings.defaultWeapon === check.value);
                });
                if (document.getElementById('medikit-count')) document.getElementById('medikit-count').value = gameSettings.medikitCount;
                document.querySelectorAll('input[name="ai-count"]').forEach(radio => {
                    radio.checked = (radio.value === String(gameSettings.aiCount));
                });
                // Update unified map selector
                updateUnifiedMapSelector();
                document.querySelectorAll('input[name="auto-aim"]').forEach(radio => {
                    radio.checked = (radio.value === String(gameSettings.autoAim));
                });
                document.querySelectorAll('input[name="night-mode"]').forEach(radio => {
                    radio.checked = (radio.value === String(gameSettings.nightModeEnabled));
                });
                document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
                    radio.checked = (radio.value === gameSettings.gameMode);
                });
                document.querySelectorAll('input[name="killcam-mode"]').forEach(radio => {
                    radio.checked = (radio.value === gameSettings.killCamMode);
                });
                document.querySelectorAll('input[name="barrel-respawn"]').forEach(radio => {
                    radio.checked = (radio.value === String(gameSettings.barrelRespawn));
                });
                const nightModeIntensitySlider = document.getElementById('night-mode-intensity');
                const nightModeIntensityValueSpan = document.getElementById('night-mode-intensity-value');
                if (nightModeIntensitySlider) {
                    nightModeIntensitySlider.value = gameSettings.nightModeLightIntensity;
                }
                if (nightModeIntensityValueSpan) {
                    nightModeIntensityValueSpan.textContent = gameSettings.nightModeLightIntensity;
                }
                
                // ボタン位置を適用
                if (gameSettings.buttonPositions) {
                    const fireButton = document.getElementById('fire-button');
                    const crouchButton = document.getElementById('crouch-button');
                    const zoomButton = document.getElementById('zoom-button');
                    const joystickZone = document.getElementById('joystick-move');
                    const followButton = document.getElementById('follow-button'); // 追加
                    const previewFireButton = document.getElementById('preview-fire-button');
                    const previewCrouchButton = document.getElementById('preview-crouch-button');
                    const previewZoomButton = document.getElementById('preview-zoom-button');
                    const previewJoystickZone = document.getElementById('preview-joystick-zone');
                    const previewFollowButton = document.getElementById('preview-follow-button'); // 追加
        


                    if (fireButton) {
                        if (shouldShowTouchControls()) {
                            if (gameSettings.buttonPositions.fire) {
                                fireButton.style.right = gameSettings.buttonPositions.fire.right;
                                fireButton.style.bottom = gameSettings.buttonPositions.fire.bottom;
                                fireButton.style.left = '';
                                fireButton.style.top = '';
                                fireButton.style.display = 'flex'; // モバイルなら表示
                                // loadSettings(): fireButton display set to flex (mobile)
                            }
                        } else {
                            fireButton.style.display = 'none'; // PCなら非表示
                            // loadSettings(): fireButton display set to none (PC)
                        }
                    }
                    if (crouchButton) {
                        if (shouldShowTouchControls()) {
                            if (gameSettings.buttonPositions.crouch) {
                                crouchButton.style.right = gameSettings.buttonPositions.crouch.right;
                                crouchButton.style.bottom = gameSettings.buttonPositions.crouch.bottom;
                                crouchButton.style.left = '';
                                crouchButton.style.top = '';
                                crouchButton.style.display = 'flex'; // モバイルなら表示
                                // loadSettings(): crouchButton display set to flex (mobile)
                            }
                        } else {
                            crouchButton.style.display = 'none'; // PCなら非表示
                            // loadSettings(): crouchButton display set to none (PC)
                        }
                    }
                    if (zoomButton) {
                        if (shouldShowTouchControls()) {
                            if (gameSettings.buttonPositions.zoom) {
                                zoomButton.style.right = gameSettings.buttonPositions.zoom.right;
                                zoomButton.style.bottom = gameSettings.buttonPositions.zoom.bottom;
                                zoomButton.style.left = '';
                                zoomButton.style.top = '';
                                zoomButton.style.display = 'flex';
                            }
                        } else {
                            zoomButton.style.display = 'none';
                        }
                    }
                    if (joystickZone) {
                        if (shouldShowTouchControls()) {
                            if (gameSettings.buttonPositions.joystick) {
                                joystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                                joystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                                joystickZone.style.right = '';
                                joystickZone.style.top = '';
                                joystickZone.style.display = 'block'; // モバイルなら表示
                                // loadSettings(): joystickZone display set to block (mobile)
                            }
                        } else {
                            joystickZone.style.display = 'none'; // PCなら非表示
                            // loadSettings(): joystickZone display set to none (PC)
                        }
                    }
                    if (followButton) { // 追加
                        if (shouldShowTouchControls()) {
                            if (gameSettings.buttonPositions.follow) {
                                followButton.style.right = gameSettings.buttonPositions.follow.right;
                                followButton.style.bottom = gameSettings.buttonPositions.follow.bottom;
                                followButton.style.left = '';
                                followButton.style.top = '';
                                // loadSettings(): followButton display updated (mobile)
                                // followButtonの表示/非表示はstartGame()内のゲームモード判定に任せる
                            }
                        } else {
                            followButton.style.display = 'none'; // PCなら非表示
                            // loadSettings(): followButton display set to none (PC)
                        }
                    }
        
                    // プレビューボタンも同様に処理
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
                    if (previewZoomButton && gameSettings.buttonPositions.zoom) {
                        previewZoomButton.style.right = gameSettings.buttonPositions.zoom.right;
                        previewZoomButton.style.bottom = gameSettings.buttonPositions.zoom.bottom;
                        previewZoomButton.style.left = '';
                        previewZoomButton.style.top = '';
                    }
                    if (previewJoystickZone && gameSettings.buttonPositions.joystick) {
                        previewJoystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                        previewJoystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                        previewJoystickZone.style.right = '';
                        previewJoystickZone.style.top = '';
                    }
                    if (previewFollowButton && gameSettings.buttonPositions.follow) { // 追加
                        previewFollowButton.style.right = gameSettings.buttonPositions.follow.right;
                        previewFollowButton.style.bottom = gameSettings.buttonPositions.follow.bottom;
                        previewFollowButton.style.left = '';
                        previewFollowButton.style.top = '';
                    }
                }
                
                // gameDurationのラジオボタンをロードする
                const gameDurationRadios = document.querySelectorAll('input[name="game-duration"]');
                gameDurationRadios.forEach(radio => {
                    radio.checked = (parseInt(radio.value, 10) === gameSettings.gameDuration);
                });
                
                // グローバル設定も更新
                saveSettings();
            } catch (e) {
                console.error('設定の読み込みに失敗しました:', e);
            }
        }
let playerGunSound;
let mgGunSound;
let rrGunSound;
let srGunSound;
let m1GunSound;
let aiM1GunSound;
let aimgGunSound;
let aiGunSound;
let explosionSound;
let startScreen;
let relAudio;
let gameOverScreen;
let aiSrGunSound;
let playerSgSound;
let aiSgSound;
let clipSound;
let winScreen;
let playerHPDisplay;
let playerWeaponDisplay; // 追加
let aiHPDisplay;
let ai2HPDisplay; // 追加
let ai3HPDisplay; // 追加
let redFlashOverlay;
let followStatusDisplay; // 追加
let followButton; // 追加
let scopeOverlay;
let cancelScopeButton;
let crosshairCircle;
let crosshairPlusH;
let crosshairPlusV;
let killCountDisplay;
let playerKills = 0;
let playerTeamKills = 0;
let enemyTeamKills = 0;
let gameTimer = 0;
let gameTimerInterval = null;
let gameTimerDisplay;
let playerTeamKillsDisplay;
let enemyTeamKillsDisplay;

// --- タイマー関連関数 ---
function updateTimerDisplay() {
    if (gameTimerDisplay) {
        const minutes = Math.floor(gameTimer / 60);
        const seconds = gameTimer % 60;
        gameTimerDisplay.textContent = `TIME: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function startTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
    }
    gameTimerInterval = setInterval(() => {
        if (!isGameRunning || isPaused) {
            return;
        }
        gameTimer--;
        updateTimerDisplay();
        if (gameTimer <= 0) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;
            // ゲーム終了処理と勝敗判定
            isGameRunning = false;
            document.exitPointerLock();

            // UI要素を非表示にする
            const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'zoom-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'player-weapon-display', 'pause-button', 'game-timer-display', 'player-team-kills-display', 'enemy-team-kills-display'];
            uiToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            
            if (gameSettings.gameMode === 'ffa') {
                let maxKills = playerKills;
                let playerIsWinner = true;
                for (const ai of ais) {
                    if (ai.kills > maxKills) {
                        maxKills = ai.kills;
                        playerIsWinner = false;
                    }
                }
                // Check for ties where player is not the sole winner
                if(playerIsWinner) {
                    for (const ai of ais) {
                        if (ai.kills === maxKills) {
                            playerIsWinner = false;
                            break;
                        }
                    }
                }

                if (playerIsWinner) {
                    showWinScreen();
                } else {
                    showGameOver();
                }

            } else if (playerTeamKills > enemyTeamKills) {
                showWinScreen();
            } else if (enemyTeamKills > playerTeamKills) {
                showGameOver();
            } else {
                // 引き分けの場合
                // 専用の引き分け画面を作成するか、ゲームオーバー画面を再利用
                // 今はshowGameOver()で代用
                showGameOver(); 
            }
        }
    }, 1000);
}

function stopTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
}
// --- ここまで ---

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
const ARENA_FLOOR_DEFAULT_COLOR = 0x555555;
const floorGeometry = new THREE.CircleGeometry(ARENA_RADIUS, 64);
const floorMaterial = new THREE.MeshLambertMaterial({ color: ARENA_FLOOR_DEFAULT_COLOR });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -FLOOR_HEIGHT;
floor.receiveShadow = true;
floor.userData.isGround = true; // 地面を保護するフラグ
scene.add(floor);

function setArenaFloorColor(colorValue) {
    const hex = typeof colorValue === 'number'
        ? colorValue
        : parseInt(String(colorValue).replace('#', '0x'));
    if (Number.isNaN(hex)) return;
    floor.material.color.setHex(hex);
    floor.material.needsUpdate = true;
}
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
const houses = [];
const HIDING_SPOTS = [];
const weaponPickups = [];
const ladderSwitches = [];
const respawningPickups = [];
const respawningBarrels = [];
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
    const boxWidth = 1;
    const boxHeight = 0.8;
    const boxDepth = 2;
    
    if (!font) {
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const material = new THREE.MeshLambertMaterial({ color: 0x006400 });
        const box = new THREE.Mesh(geometry, material);
        box.position.copy(position);
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
    for (let i = 0; i < gameSettings.mrCount; i++) weaponTypes.push({ name: 'MR', type: WEAPON_MR });

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
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.0 }); // 完全に透明
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
    sensorArea.visible = true; // Make visible for debugging
    scene.add(sensorArea);
    ladderSwitches.push(sensorArea);
    return face;
}

function addRooftopFeatures(obstacle, ladderFace) {
    if (!obstacle.userData.rooftopParts) {
        obstacle.userData.rooftopParts = [];
    }
    
    // ジオメトリの安全な取得
    let buildingWidth, buildingHeight, buildingDepth;
    
    if (obstacle.geometry && obstacle.geometry.parameters) {
        // BoxGeometryの場合
        buildingWidth = obstacle.geometry.parameters.width || 6;
        buildingHeight = obstacle.geometry.parameters.height || 4;
        buildingDepth = obstacle.geometry.parameters.depth || 6;
    } else {
        // デフォルト値
        buildingWidth = 6;
        buildingHeight = 4;
        buildingDepth = 6;
    }
    
    const rooftopY = obstacle.position.y + (buildingHeight / 2);
    
    // Initialize textures if not done yet
    initializeTextures();
    
    const wallHeight = 1.0;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshLambertMaterial({ 
        map: brickTexture,
        color: 0x880000 
    });
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
            wall1.userData.isRooftop = true;
            wall1.userData.parentBuildingRef = obstacle;
            scene.add(wall1);
            obstacles.push(wall1);
            obstacle.userData.rooftopParts.push(wall1);
            wall2.userData.isWall = true;
            wall2.userData.isRooftop = true;
            wall2.userData.parentBuildingRef = obstacle;
            scene.add(wall2);
            obstacles.push(wall2);
            obstacle.userData.rooftopParts.push(wall2);
        } else {
            const wallGeometry = new THREE.BoxGeometry(def.w, def.h, def.d);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(obstacle.position.x + def.ox, rooftopY + (def.h / 2), obstacle.position.z + def.oz);
            wall.userData.isWall = true;
            wall.userData.isRooftop = true;
            wall.userData.parentBuildingRef = obstacle;
            scene.add(wall);
            obstacles.push(wall);
            obstacle.userData.rooftopParts.push(wall);
        }
    }

}

function createHollowObstacle(x, z, width = 8, height = 5, depth = 8, color = 0xff4444, hp = 1, holeConfigs = [], isNew = true) {
    debugLog('=== 中空障害物（動作バージョン） ===');
    debugLog('建物の高さ:', height);
    
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    building.userData.hp = hp;
    building.userData.isHollow = true;
    building.userData.type = 'hollow_obstacle';
    building.userData.width = width;
    building.userData.height = height;
    building.userData.depth = depth;
    building.userData.color = color;
    
    const material = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
    const wallThickness = 0.3; // 壁の厚さを増やしてコリジョンを強化
    
    // 床 - 地面に配置
    const floorGeometry = new THREE.BoxGeometry(width, 0.1, depth);
    const floor = new THREE.Mesh(floorGeometry, material);
    floor.position.set(0, 0.05, 0); // 床の厚さの半分を地面から上に
    floor.userData.type = 'floor';
    floor.userData.isWall = true; // コリジョン用に壁として扱う
    building.add(floor);
    obstacles.push(floor); // 障害物リストに追加
    
    // 各壁の配置 - 床の上に配置
    createFrontWallWithDoor(building, width, height, wallThickness, depth/2, material);
    createBackWallWithWindows(building, width, height, wallThickness, -depth/2, material);
    // 側壁は回転が必要
    createSideWallWithWindow(building, depth, height, wallThickness, -width/2, material, Math.PI / 2);
    createSideWallWithWindow(building, depth, height, wallThickness, width/2, material, Math.PI / 2);
    
    // 天井の配置
    const ceilingGeometry = new THREE.BoxGeometry(width + wallThickness, 0.3, depth + wallThickness);
    const ceiling = new THREE.Mesh(ceilingGeometry, material);
    ceiling.position.set(0, height, 0); 
    ceiling.userData.type = 'ceiling';
    ceiling.userData.isWall = true; // コリジョン用に壁として扱う
    building.add(ceiling);
    obstacles.push(ceiling); // 障害物リストに追加
    
    scene.add(building);
    
    debugLog('=== 作成完了 ===');
}

// 基本の壁形状を作成する補助関数
function createBaseWallShape(w, h) {
    const shape = new THREE.Shape();
    shape.moveTo(-w/2, 0);
    shape.lineTo(w/2, 0);
    shape.lineTo(w/2, h);
    shape.lineTo(-w/2, h);
    shape.lineTo(-w/2, 0);
    return shape;
}

function createFrontWallWithDoor(building, width, height, thickness, zPos, material) {
    // BoxGeometry方式で確実なコリジョン
    const doorWidth = 2.0;
    const doorHeight = 3.2; // プレイヤーの高さ3.0m + 余裕
    
    debugLog('FRONT WALL: door width =', doorWidth, 'door height =', doorHeight);
    debugLog('Building width =', width, 'height =', height);
    
    // TOP PIECE - ドアの上
    const topHeight = height - doorHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(width, topHeight, thickness);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(0, doorHeight + topHeight/2, zPos);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        debugLog('Top piece: height =', topHeight, 'y =', doorHeight + topHeight/2);
    }
    
    // LEFT PIECE - ドアの左
    const leftWidth = (width - doorWidth) / 2;
    if (leftWidth > 0) {
        const leftGeometry = new THREE.BoxGeometry(leftWidth, doorHeight, thickness);
        const leftPiece = new THREE.Mesh(leftGeometry, material);
        leftPiece.position.set(-width/2 + leftWidth/2, doorHeight/2, zPos);
        leftPiece.userData.isWall = true;
        building.add(leftPiece);
        obstacles.push(leftPiece);
        debugLog('Left piece: width =', leftWidth, 'y =', doorHeight/2);
    }
    
    // RIGHT PIECE - ドアの右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(leftWidth, doorHeight, thickness);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(width/2 - leftWidth/2, doorHeight/2, zPos);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        debugLog('Right piece: width =', leftWidth, 'y =', doorHeight/2);
    }
    
    debugLog('Front wall with door created using BoxGeometry method');
}

function createBackWallWithWindows(building, width, height, thickness, zPos, material) {
    // BoxGeometry方式で確実なコリジョン
    const windowWidth = 1.2;
    const windowHeight = 1.2;
    const windowY = 0.3; // プレイヤーの視線レベルにさらに下げる
    const windowSpacing = 0.5; // 窓の間隔
    
    debugLog('BACK WALL: window width =', windowWidth, 'height =', windowHeight, 'y =', windowY);
    
    // TOP PIECE - 窓の上
    const topHeight = height - windowY - windowHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(width, topHeight, thickness);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(0, windowY + windowHeight + topHeight/2, zPos);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        debugLog('Back top piece: height =', topHeight, 'y =', windowY + windowHeight + topHeight/2);
    }
    
    // BOTTOM PIECE - 窓の下
    const bottomHeight = windowY;
    if (bottomHeight > 0) {
        const bottomGeometry = new THREE.BoxGeometry(width, bottomHeight, thickness);
        const bottomPiece = new THREE.Mesh(bottomGeometry, material);
        bottomPiece.position.set(0, bottomHeight/2, zPos);
        bottomPiece.userData.isWall = true;
        building.add(bottomPiece);
        obstacles.push(bottomPiece);
        debugLog('Back bottom piece: height =', bottomHeight, 'y =', bottomHeight/2);
    }
    
    // LEFT PIECE - 左の窓の左
    const leftWidth = (width - windowWidth*2 - windowSpacing) / 2;
    if (leftWidth > 0) {
        const leftGeometry = new THREE.BoxGeometry(leftWidth, windowHeight, thickness);
        const leftPiece = new THREE.Mesh(leftGeometry, material);
        leftPiece.position.set(-width/2 + leftWidth/2, windowY + windowHeight/2, zPos);
        leftPiece.userData.isWall = true;
        building.add(leftPiece);
        obstacles.push(leftPiece);
        debugLog('Back left piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    // MIDDLE PIECE - 窓の間
    const middleGeometry = new THREE.BoxGeometry(windowSpacing, windowHeight, thickness);
    const middlePiece = new THREE.Mesh(middleGeometry, material);
    middlePiece.position.set(0, windowY + windowHeight/2, zPos);
    middlePiece.userData.isWall = true;
    building.add(middlePiece);
    obstacles.push(middlePiece);
    debugLog('Back middle piece: width =', windowSpacing, 'y =', windowY + windowHeight/2);
    
    // RIGHT PIECE - 右の窓の右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(leftWidth, windowHeight, thickness);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(width/2 - leftWidth/2, windowY + windowHeight/2, zPos);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        debugLog('Back right piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    debugLog('Back wall with windows created using BoxGeometry method');
}

function createSideWallWithWindow(building, wallDepth, height, thickness, xPos, material, rotationY) {
    // BoxGeometry方式で確実なコリジョン
    const windowWidth = 1.2;
    const windowHeight = 1.2;
    const windowY = 0.3; // プレイヤーの視線レベルにさらに下げる
    
    debugLog('SIDE WALL: window width =', windowWidth, 'height =', windowHeight, 'y =', windowY);
    
    // TOP PIECE - 窓の上
    const topHeight = height - windowY - windowHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(thickness, topHeight, wallDepth);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(xPos, windowY + windowHeight + topHeight/2, 0);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        debugLog('Side top piece: height =', topHeight, 'y =', windowY + windowHeight + topHeight/2);
    }
    
    // BOTTOM PIECE - 窓の下
    const bottomHeight = windowY;
    if (bottomHeight > 0) {
        const bottomGeometry = new THREE.BoxGeometry(thickness, bottomHeight, wallDepth);
        const bottomPiece = new THREE.Mesh(bottomGeometry, material);
        bottomPiece.position.set(xPos, bottomHeight/2, 0);
        bottomPiece.userData.isWall = true;
        building.add(bottomPiece);
        obstacles.push(bottomPiece);
        debugLog('Side bottom piece: height =', bottomHeight, 'y =', bottomHeight/2);
    }
    
    // LEFT PIECE - 窓の左
    const leftWidth = (wallDepth - windowWidth) / 2;
    if (leftWidth > 0) {
        const leftGeometry = new THREE.BoxGeometry(thickness, windowHeight, leftWidth);
        const leftPiece = new THREE.Mesh(leftGeometry, material);
        leftPiece.position.set(xPos, windowY + windowHeight/2, -wallDepth/2 + leftWidth/2);
        leftPiece.userData.isWall = true;
        building.add(leftPiece);
        obstacles.push(leftPiece);
        debugLog('Side left piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    // RIGHT PIECE - 窓の右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(thickness, windowHeight, leftWidth);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(xPos, windowY + windowHeight/2, wallDepth/2 - leftWidth/2);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        debugLog('Side right piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    debugLog('Side wall with window created using BoxGeometry method');
}

function createObstacle(x, z, width = 2, height = DEFAULT_OBSTACLE_HEIGHT, depth = 2, color = 0xff0000, hp = 1) {
    // Initialize textures if not done yet
    initializeTextures();
    
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    
    // Choose texture based on obstacle type or randomly
    let material;
    if (Math.random() > 0.5) {
        material = new THREE.MeshLambertMaterial({ 
            map: brickTexture,
            color: color 
        });
    } else {
        material = new THREE.MeshLambertMaterial({ 
            map: concreteTexture,
            color: color 
        });
    }
    
    const box = new THREE.Mesh(boxGeometry, material);
    box.position.set(x, (height / 2) - FLOOR_HEIGHT, z);
    box.userData.hp = hp;
    box.castShadow = false; // 影をキャストしない
    scene.add(box);
    obstacles.push(box);
    let ladderFace = -1;
    if (height > 6) {
        ladderFace = createAndAttachLadder(box);
        // Ensure tall obstacles (towers) always get rooftop cover.
        addRooftopFeatures(box, ladderFace);
    }
    // 家の屋根には登れないようにする - 屋上機能を無効化
    // addRooftopFeatures(box, ladderFace); // 家には梯子を設置しない
    const HIDING_DISTANCE = 1.5;
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
}

function createExplosiveBarrel(x, z, color = 0xe74c3c, radius = 0.75, height = 2.4) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 20);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const barrel = new THREE.Mesh(geometry, material);
    barrel.position.set(x, (height / 2) - FLOOR_HEIGHT, z);
    barrel.userData.type = 'barrel';
    barrel.userData.color = color;
    barrel.userData.radius = radius;
    barrel.userData.height = height;
    barrel.userData.spawnPos = new THREE.Vector3(x, barrel.position.y, z);
    barrel.userData.hp = 1;
    barrel.castShadow = false;
    scene.add(barrel);
    obstacles.push(barrel);
    const HIDING_DISTANCE = radius + 0.6;
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z), obstacle: barrel });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z), obstacle: barrel });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x, 0, z + HIDING_DISTANCE), obstacle: barrel });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x, 0, z - HIDING_DISTANCE), obstacle: barrel });
}

// マテリアルを安全に破棄する関数（配列対応）
function disposeMaterial(material) {
    if (!material) return;
    
    if (Array.isArray(material)) {
        // マテリアル配列の場合
        material.forEach(mat => {
            if (mat && mat.dispose) {
                mat.dispose();
            }
        });
    } else if (material.dispose) {
        // 単一マテリアルの場合
        material.dispose();
    }
}

function createHouse(x, z, width = 8, height = 5, depth = 8, color = 0xff6666, hp = 8, rotation = 0) {
    // Initialize textures if not done yet
    initializeTextures();
    
    const house = new THREE.Group();
    house.position.set(x, height / 2 - FLOOR_HEIGHT, z); // 地面に完全に接地させる
    
    // 回転角度を設定
    if (rotation !== undefined) {
        house.rotation.y = rotation;
    } else if (arguments.length <= 2) { // パラメータがx, zのみの場合はランダム
        const randomRotation = Math.floor(Math.random() * 4) * (Math.PI / 2); // 0, 90, 180, 270度
        house.rotation.y = randomRotation;
    }

    const material = new THREE.MeshLambertMaterial({ 
        color: color, 
        side: THREE.DoubleSide 
    });

    const thickness = 0.2;

    // 外壁は指定色、内壁は濃い色に固定（光の影響を受けにくくする）
    const baseColor = new THREE.Color(color);
    const baseHSL = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(baseHSL);
    const exteriorColor = new THREE.Color().setHSL(baseHSL.h, baseHSL.s, Math.min(1, baseHSL.l * 1.0));
    const interiorColor = new THREE.Color().setHSL(baseHSL.h, baseHSL.s, Math.max(0, baseHSL.l * 0.55));
    const exteriorMaterial = new THREE.MeshStandardMaterial({
        color: exteriorColor,
        emissive: exteriorColor.clone().multiplyScalar(0.12),
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
    const interiorMaterial = new THREE.MeshStandardMaterial({
        color: interiorColor,
        emissive: new THREE.Color(0x000000),
        roughness: 0.98,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
    
    // 両面マテリアルを作成（内側と外側で色を塗り分け）
    function createDualSidedWallMaterial(exteriorMat, interiorMat) {
        const materials = [
            exteriorMat, // +X面（外側）
            interiorMat, // -X面（内側）
            exteriorMat, // +Y面（上面）
            exteriorMat, // -Y面（下面）
            exteriorMat, // +Z面（外側）
            interiorMat  // -Z面（内側）
        ];
        return materials;
    }

    function addHouseWallSegmentMesh(w, h, t, pos, rotY = 0) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, t),
            createDualSidedWallMaterial(exteriorMaterial, interiorMaterial)
        );
        mesh.position.copy(pos);
        mesh.rotation.y = rotY;
        mesh.userData.isWall = true;
        mesh.userData.isHouseWall = true;
        mesh.castShadow = false;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        house.add(mesh);
    }

    // 1. 床 - 完全に削除して内部移動を可能に
    // const floor = new THREE.Mesh(
    //     new THREE.BoxGeometry(width, thickness, depth),
    //     material
    // );
    // floor.position.y = thickness / 2;
    // house.add(floor);

    // 2. 正面壁 - ドア部分を空けて2つの壁パーツに分ける
    
    // 左側の壁
    const leftWallWidth = (width - 2.5) / 2; // ドア幅2.5mを引いて半分に
    const frontLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(leftWallWidth, height, thickness),
        createDualSidedWallMaterial(exteriorMaterial, interiorMaterial)
    );
    frontLeftWall.position.set(-width/2 + leftWallWidth/2, 0, depth / 2);
    frontLeftWall.userData.isWall = true;
    frontLeftWall.userData.isHouseWall = true;
    frontLeftWall.castShadow = false; // 影をキャストしない
    // 境界ボックスを計算して確実なコリジョンを保証
    frontLeftWall.geometry.computeBoundingBox();
    frontLeftWall.geometry.computeBoundingSphere();
    house.add(frontLeftWall);
    // obstacles.push(frontLeftWall); // コリジョンは専用コライダーで処理
    
    // 右側の壁
    const rightWallPart = new THREE.Mesh(
        new THREE.BoxGeometry(leftWallWidth, height, thickness),
        createDualSidedWallMaterial(exteriorMaterial, interiorMaterial)
    );
    rightWallPart.position.set(width/2 - leftWallWidth/2, 0, depth / 2);
    rightWallPart.userData.isWall = true;
    rightWallPart.userData.isHouseWall = true;
    rightWallPart.castShadow = false; // 影をキャストしない
    // 境界ボックスを計算して確実なコリジョンを保証
    rightWallPart.geometry.computeBoundingBox();
    rightWallPart.geometry.computeBoundingSphere();
    house.add(rightWallPart);
    // obstacles.push(rightWallPart); // コリジョンは専用コライダーで処理

    // 3. 背面壁 (窓2つ) - 分割Boxで生成
    // 4. 左壁 (窓1つ) - 分割Boxで生成
    // 5. 右壁 (窓1つ) - 分割Boxで生成

    // 6. 屋根 - 1枚のみ、家の向きに合わせて回転しない
    // カスタムマップの場合のみ屋根を生成
    if (gameSettings.mapType === 'custom') {
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.4, thickness, depth + 0.4),
            createDualSidedWallMaterial(exteriorMaterial, interiorMaterial)
        );
        roof.position.y = height / 2;
        roof.castShadow = false; // 影をキャストしない
        roof.userData.isRoof = true; // 屋根としてマーク
        roof.userData.isHouseRoof = true; // 家の屋根であることを識別
        house.add(roof);
        // obstacles.push(roof); // 個別に追加しない
    }

    // House collision-only walls (respect windows/door openings)
    function addHouseWallCollider(w, h, t, pos, rotY = 0, blocksProjectiles = true, face = '') {
        const collider = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, t),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, depthWrite: false })
        );
        collider.visible = true; // Raycaster hit needs visible objects
        collider.position.copy(pos);
        collider.rotation.y = rotY;
        collider.userData.isWall = true;
        collider.userData.isHouseWall = true;
        collider.userData.isHouseCollider = true;
        collider.userData.blocksProjectiles = blocksProjectiles;
        collider.userData.houseRef = house;
        collider.userData.houseFace = face;
        house.add(collider);
        obstacles.push(collider);
    }

    function addWindowWallVisuals(span, wallHeight, t, wallOffset, windowCenters, windowSize, rotY = 0, baseY = 0) {
        const windowBottom = windowCenters[0].y;
        const windowHeight = windowSize.h;
        const topHeight = Math.max(0, wallHeight - (windowBottom + windowHeight));
        const bottomHeight = Math.max(0, windowBottom);

        if (bottomHeight > 0) {
            const pos = wallOffset.clone().setY(baseY + (-wallHeight / 2 + bottomHeight / 2));
            addHouseWallSegmentMesh(span, bottomHeight, t, pos, rotY);
        }
        if (topHeight > 0) {
            const topCenterY = baseY + (-wallHeight / 2 + windowBottom + windowHeight + topHeight / 2);
            const pos = wallOffset.clone().setY(topCenterY);
            addHouseWallSegmentMesh(span, topHeight, t, pos, rotY);
        }

        // Vertical strips between windows
        const halfSpan = span / 2;
        const segments = [];
        let prev = -halfSpan;
        const sorted = windowCenters
            .map(c => ({ min: c.x - windowSize.w / 2, max: c.x + windowSize.w / 2 }))
            .sort((a, b) => a.min - b.min);
        for (const w of sorted) {
            if (w.min > prev) segments.push({ min: prev, max: w.min });
            prev = w.max;
        }
        if (prev < halfSpan) segments.push({ min: prev, max: halfSpan });

        const midY = baseY + (-wallHeight / 2 + windowBottom + windowHeight / 2);
        for (const seg of segments) {
            const segWidth = seg.max - seg.min;
            if (segWidth <= 0.01) continue;
            const segCenter = (seg.min + seg.max) / 2;
            const pos = wallOffset.clone();
            if (rotY === 0) {
                pos.x += segCenter;
            } else {
                pos.z += segCenter;
            }
            pos.y = midY;
            addHouseWallSegmentMesh(segWidth, windowHeight, t, pos, rotY);
        }
    }

    // Front wall: left/right colliders (door opening remains)
    addHouseWallCollider(leftWallWidth, height, thickness, new THREE.Vector3(-width / 2 + leftWallWidth / 2, 0, depth / 2), 0, true, 'front');
    addHouseWallCollider(leftWallWidth, height, thickness, new THREE.Vector3(width / 2 - leftWallWidth / 2, 0, depth / 2), 0, true, 'front');

    // Back wall windows (two)
    addWindowWallVisuals(
        width,
        height,
        thickness,
        new THREE.Vector3(0, 0, -depth / 2),
        [{ x: -width / 4, y: 1.5 }, { x: width / 4, y: 1.5 }],
        { w: 1.5, h: 1.5 },
        0,
        0
    );

    // Left wall window (rotated)
    addWindowWallVisuals(
        depth,
        height,
        thickness,
        new THREE.Vector3(-width / 2, 0, 0),
        [{ x: 0, y: 1.5 }],
        { w: 2.0, h: 1.5 },
        Math.PI / 2,
        0
    );

    // Right wall window (rotated)
    addWindowWallVisuals(
        depth,
        height,
        thickness,
        new THREE.Vector3(width / 2, 0, 0),
        [{ x: 0, y: 1.5 }],
        { w: 2.0, h: 1.5 },
        Math.PI / 2,
        0
    );

    // Solid colliders for window walls (bullets will pass through windows via analytic check)
    addHouseWallCollider(width, height, thickness, new THREE.Vector3(0, 0, -depth / 2), 0, true, 'back');
    addHouseWallCollider(depth, height, thickness, new THREE.Vector3(-width / 2, 0, 0), Math.PI / 2, true, 'left');
    addHouseWallCollider(depth, height, thickness, new THREE.Vector3(width / 2, 0, 0), Math.PI / 2, true, 'right');

    // Store window specs for analytic projectile pass-through
    house.userData.windowSpec = {
        back: [
            { x: -width / 4, y: 1.5, w: 1.5, h: 1.5 },
            { x: width / 4, y: 1.5, w: 1.5, h: 1.5 }
        ],
        side: [
            { x: 0, y: 1.5, w: 2.0, h: 1.5 }
        ]
    };

    // userDataを設定
    house.userData = { 
        type: 'house',
        width: width,
        height: height,
        depth: depth,
        color: color,
        hp: hp,
        windowSpec: house.userData.windowSpec
    };
    
    scene.add(house);
    // obstacles.push(house); // 家全体を障害物として追加しない（個別の壁パーツを追加済み）
    houses.push(house);
    
    return house;
}

function createSniperTower(x, z) {
    // Initialize textures if not done yet
    initializeTextures();
    
    const TOWER_WIDTH = 6;
    const TOWER_DEPTH = 6;
    const TOWER_HEIGHT = DEFAULT_OBSTACLE_HEIGHT * 3;
    const towerYPos = (TOWER_HEIGHT / 2) - FLOOR_HEIGHT;
    const towerGeometry = new THREE.BoxGeometry(TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH);
    
    const towerMaterial = new THREE.MeshLambertMaterial({ 
        map: concreteTexture,
        color: 0x4A4A4A 
    });
    
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(x, towerYPos, z);
    tower.userData.isTower = true;
    tower.userData.type = 'tower';
    const DEFAULT_OBSTACLE_VOLUME = 2 * DEFAULT_OBSTACLE_HEIGHT * 2;
    const TOWER_VOLUME = TOWER_WIDTH * TOWER_HEIGHT * TOWER_DEPTH;
    tower.userData.hp = Math.round(TOWER_VOLUME / DEFAULT_OBSTACLE_VOLUME / 2);
    tower.castShadow = false; // 影をキャストしない
    scene.add(tower);
    obstacles.push(tower);
    let ladderFace;
    if (Math.abs(x) > Math.abs(z)) {
        ladderFace = x > 0 ? 2 : 3;
    } else {
        ladderFace = z > 0 ? 0 : 1;
    }
    ladderFace = createAndAttachLadder(tower, ladderFace);
    // createWindows(tower, TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH); // Removed windows for performance
    // すべてのマップで屋上機能を有効化
    addRooftopFeatures(tower, ladderFace);
}

function generateObstaclePositions(count) {
    const generatedConfigs = [];
    
    // アリーナ全体に障害物をランダム配置
    const maxRadius = ARENA_PLAY_AREA_RADIUS - 5; // エッジから5m内側
    
    // 基本的な障害物を配置
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPosition = false;
        let x, z;
        
        while (!validPosition && attempts < 50) {
            // 極座標でランダムな位置を生成
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * maxRadius;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            
            // 中央エリア（半径10m）は避ける
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < 10) {
                attempts++;
                continue;
            }
            
            // 既存の障害物との距離をチェック
            validPosition = true;
            for (const existing of generatedConfigs) {
                const dist = Math.sqrt((x - existing.x) ** 2 + (z - existing.z) ** 2);
                if (dist < 4) { // 4m以上離す
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validPosition) {
            const width = 2 + Math.random() * 3; // 2-5m
            const height = 1.5 + Math.random() * 2; // 1.5-3.5m
            const depth = 2 + Math.random() * 3; // 2-5m
            const color = Math.random() > 0.5 ? 0x888888 : 0x666666;
            
            generatedConfigs.push({
                x: x,
                z: z,
                width: width,
                height: height,
                depth: depth,
                color: color
            });
        }
    }
    
    // 家をランダムに配置（0-5個）
    const houseCount = Math.floor(Math.random() * 6); // 0-5個
    for (let i = 0; i < houseCount; i++) {
        let attempts = 0;
        let validPosition = false;
        let x, z;
        
        while (!validPosition && attempts < 50) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + Math.random() * (maxRadius - 15); // 15m以降に配置
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            
            // 既存の障害物との距離をチェック
            validPosition = true;
            for (const existing of generatedConfigs) {
                const dist = Math.sqrt((x - existing.x) ** 2 + (z - existing.z) ** 2);
                if (dist < 6) { // 家は6m以上離す
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validPosition) {
            const width = 4 + Math.random() * 3; // 4-7m
            const height = 3 + Math.random() * 2; // 3-5m
            const depth = 4 + Math.random() * 3; // 4-7m
            const color = 0x8B4513; // 茶色
            
            generatedConfigs.push({
                type: 'house',
                x: x,
                z: z,
                width: width,
                height: height,
                depth: depth,
                color: color,
                hp: 50,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }
    
    // スナイパーの塔をランダムに配置（0-2個）
    const towerCount = Math.floor(Math.random() * 3); // 0-2個
    for (let i = 0; i < towerCount; i++) {
        let attempts = 0;
        let validPosition = false;
        let x, z;
        
        while (!validPosition && attempts < 50) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * (maxRadius - 20); // 20m以降に配置
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            
            // 既存の障害物との距離をチェック
            validPosition = true;
            for (const existing of generatedConfigs) {
                const dist = Math.sqrt((x - existing.x) ** 2 + (z - existing.z) ** 2);
                if (dist < 8) { // 塔は8m以上離す
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validPosition) {
            generatedConfigs.push({
                type: 'tower',
                x: x,
                z: z
            });
        }
    }
    
    return generatedConfigs;
}

function resetObstacles() {
    // まず即時クリーンアップを実行
    immediateRooftopCleanup();
    
    // Clean up all obstacles including rooftop parts
    for (const obstacle of obstacles) {
        // 家の場合は、すべての子オブジェクトを明示的に削除
        if (obstacle && obstacle.userData.type === 'house') {
            // 家のすべての子をトラバースして削除
            const childrenToRemove = [];
            if (obstacle.traverse) {
                obstacle.traverse((child) => {
                    if (child && child.isMesh && child !== obstacle) {
                        childrenToRemove.push(child);
                    }
                });
            }
            // 子オブジェクトを削除
            for (const child of childrenToRemove) {
                obstacle.remove(child);
                scene.remove(child);
                if (child.geometry) child.geometry.dispose();
                disposeMaterial(child.material); // 安全なマテリアル破棄を使用
                // obstacles配列からも削除
                const childIndex = obstacles.indexOf(child);
                if (childIndex > -1) {
                    obstacles.splice(childIndex, 1);
                }
            }
        }
        
        // Clean up rooftop parts first
        if (obstacle.userData.rooftopParts && Array.isArray(obstacle.userData.rooftopParts)) {
            for (const part of obstacle.userData.rooftopParts) {
                scene.remove(part);
                if (part.geometry) part.geometry.dispose();
                disposeMaterial(part.material); // 安全なマテリアル破棄を使用
            }
        }
        // Clean up ladders
        const ladderGroup = obstacle.children.find(child => child.name === 'ladder');
        if (ladderGroup) {
            obstacle.remove(ladderGroup);
        }
        // Remove the main obstacle
        if (obstacle.parent) {
            obstacle.parent.remove(obstacle);
        }
        // Dispose geometry and materials
        if (obstacle.geometry) obstacle.geometry.dispose();
        disposeMaterial(obstacle.material); // 安全なマテリアル破棄を使用
    }
    obstacles.length = 0;
    houses.length = 0;
    HIDING_SPOTS.length = 0;
    for (const ladderSwitch of ladderSwitches) {
        scene.remove(ladderSwitch);
    }
    ladderSwitches.length = 0;
    let obstaclesToCreate = [];
    if (gameSettings.mapType === 'custom') {
        const resolved = resolveCustomMapSelection();
        const selectedMapData = resolved.mapData;
        if (resolved.mapName && resolved.mapName !== gameSettings.customMapName) {
            gameSettings.customMapName = resolved.mapName;
            saveSettings();
        }
        if (selectedMapData) {
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    obstaclesToCreate = selectedMapData.obstacles;
                } else {
                    obstaclesToCreate = defaultObstaclesConfig;
                }
                if (selectedMapData.floorColor !== undefined) {
                    setArenaFloorColor(selectedMapData.floorColor);
                } else {
                    setArenaFloorColor(ARENA_FLOOR_DEFAULT_COLOR);
                }
            } catch (e) {
                obstaclesToCreate = defaultObstaclesConfig;
                setArenaFloorColor(ARENA_FLOOR_DEFAULT_COLOR);
            }
        } else {
            obstaclesToCreate = defaultObstaclesConfig;
            setArenaFloorColor(ARENA_FLOOR_DEFAULT_COLOR);
        }
    } else {
        obstaclesToCreate = defaultObstaclesConfig;
        setArenaFloorColor(ARENA_FLOOR_DEFAULT_COLOR);
        createSniperTower(35, -35);
        createSniperTower(-35, 35);
    }
    for (const config of obstaclesToCreate) {
        if (config.type === 'tower') {
            // カスタムマップの塔データの場合
            createSniperTower(config.x, config.z);
        } else if (config.type === 'house' && gameSettings.mapType === 'custom') {
            // カスタムマップの家データの場合のみ処理
            createHouse(config.x, config.z, config.width, config.height, config.depth, config.color, config.hp, config.rotation || 0);
        } else if (config.type === 'barrel') {
            createExplosiveBarrel(config.x, config.z, config.color, config.radius, config.height);
        } else {
            // 通常の建物の場合
            createObstacle(config.x, config.z, config.width, config.height || DEFAULT_OBSTACLE_HEIGHT, config.depth, config.color || 0xff0000, config.hp || 1);
        }
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
let playerDeathTweenPos = null;
let playerDeathTweenRotX = null;
let playerDeathTweenRotZ = null;
let playerDeathLookAt = null;
let playerDeathCamOffset = null;
let playerDeathCamSavedParent = null;
let playerDeathCamSavedLocalPos = null;
let playerDeathCamSavedLocalRot = null;
playerModel = createCharacterModel(0xff3333, characterCustomization.player); // Player's customization
resetCharacterPose(playerModel); // Reset to default pose
// Show gun for gameplay
if (playerModel.userData.parts && playerModel.userData.parts.gun) {
    playerModel.userData.parts.gun.visible = true;
}
player.add(playerModel);
playerModel.position.set(0, -playerTargetHeight, 0);
playerModel.visible = false;
const AI_SPEED = 12.0;
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
            disposeMaterial(child.material); // 安全なマテリアル破棄を使用
            if (child.texture) child.texture.dispose(); // Also dispose textures if any
        }
        // Remove the main AI group from the scene
        if (aiObject.parent) {
            aiObject.parent.remove(aiObject);
        }
    }
}

const ais = [];

function createCharacterModel(color, customization = null) {
    // Use customization if provided, otherwise use defaults
    const custom = customization || {
        hairStyle: 'default',
        hairColor: '#D2691E',
        skinColor: '#ffd1b0',
        clothingColor: color,
        pantsColor: '#111111',
        shoesColor: '#8B4513'
    };
    
    const clothingMaterial = new THREE.MeshLambertMaterial({ color: custom.clothingColor });
    const skinMaterial = new THREE.MeshLambertMaterial({ color: custom.skinColor });
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: custom.pantsColor });
    const gunMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const shoeMaterial = new THREE.MeshLambertMaterial({ color: custom.shoesColor });
    const hairMaterial = new THREE.MeshLambertMaterial({ color: custom.hairColor });

    // Use rag.html proportions, scaled to current game height (visual only; collisions unchanged)
    const targetHeight = BODY_HEIGHT + HEAD_RADIUS * 2;
    const ragTotalHeight = 2.5; // 0.6 + 0.6 + 0.9 + 0.4
    const s = targetHeight / ragTotalHeight;
    const torsoHeight = 0.7 * s; // 胴体をさらに短くする（0.8→0.7）
    const headSize = 0.4 * s; // 元のまま
    const legSegmentHeight = 0.7 * s; // 脚をさらに長くする（0.65→0.7）
    const torsoY = (legSegmentHeight * 2) + (torsoHeight / 2);
    const headY = (legSegmentHeight * 2) + torsoHeight + (headSize / 2);

    // Body and Head
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, torsoHeight, 0.3 * s), clothingMaterial);
    body.position.y = torsoY;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), skinMaterial);
    head.position.y = headY;
    
    // Add eyes (horizontal lines) to all characters - make them 2x thicker
    const eyeLineGeom = new THREE.BoxGeometry(headSize * 0.6, headSize * 0.04, headSize * 0.04); // 2x thicker (0.02→0.04)
    const eyeLineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left eye line
    const leftEyeLine = new THREE.Mesh(eyeLineGeom, eyeLineMaterial);
    leftEyeLine.position.set(-headSize * 0.15, headY + headSize * 0.2, headSize * 0.5); // Move forward to be visible
    
    // Right eye line  
    const rightEyeLine = new THREE.Mesh(eyeLineGeom, eyeLineMaterial);
    rightEyeLine.position.set(headSize * 0.15, headY + headSize * 0.2, headSize * 0.5); // Move forward to be visible

    // Add nose to all characters - positioned below eye lines
    const noseGeom = new THREE.BoxGeometry(headSize * 0.12, headSize * 0.3, headSize * 0.12); // Much longer (0.08→0.12)
    const noseMaterial = new THREE.MeshBasicMaterial({ color: custom.skinColor }); // Same color as skin
    const nose = new THREE.Mesh(noseGeom, noseMaterial);
    nose.position.set(0, headY + headSize * 0.05, headSize * 0.54); // Below eye lines (0.12→0.05)

    // Add ears to all characters - make them bigger
    const earGeom = new THREE.BoxGeometry(headSize * 0.1, headSize * 0.25, headSize * 0.05); // Bigger (0.08→0.1, 0.2→0.25, 0.04→0.05)
    const earMaterial = new THREE.MeshBasicMaterial({ color: custom.skinColor }); // Same color as skin
    
    // Left ear
    const leftEar = new THREE.Mesh(earGeom, earMaterial);
    leftEar.position.set(-headSize * 0.55, headY, 0); // Side of head
    
    // Right ear
    const rightEar = new THREE.Mesh(earGeom, earMaterial);
    rightEar.position.set(headSize * 0.55, headY, 0); // Side of head

    // Hair - Different styles based on customization
    let hairParts = [];
    
    switch (custom.hairStyle) {
        case 'short':
            const shortHairGeom = new THREE.BoxGeometry(headSize * 1.1, headSize * 0.3, headSize * 1.1);
            const shortHair = new THREE.Mesh(shortHairGeom, hairMaterial);
            shortHair.position.set(0, headSize * 0.4, 0); // 頭を基準とした相対位置
            
            // Add back hair to cover half of the back head
            const shortBackHairGeom = new THREE.BoxGeometry(headSize * 1.0, headSize * 0.4, headSize * 0.5);
            const shortBackHair = new THREE.Mesh(shortBackHairGeom, hairMaterial);
            shortBackHair.position.set(0, headSize * 0.2, -headSize * 0.25); // 頭を基準とした相対位置
            
            hairParts.push(shortHair, shortBackHair);
            break;
            
        case 'long':
            // Afro style - spherical hair from back-top, leaving more face exposed
            const afroRadius = headSize * 0.8;
            const afroGeom = new THREE.SphereGeometry(afroRadius, 16, 12);
            const afro = new THREE.Mesh(afroGeom, hairMaterial);
            afro.position.set(0, headSize * 0.6, -headSize * 0.4); // 頭を基準とした相対位置
            afro.scale.set(1.4, 1.2, 1.3); // Wider and taller to expose more face
            
            hairParts.push(afro);
            break;
            
        case 'spiky':
            // Mohawk style - connected hair from top back to neck (raised and vertical)
            const mohawkGeom = new THREE.BoxGeometry(headSize * 0.33, headSize * 0.7, headSize * 1.2); // Taller and more vertical
            const mohawk = new THREE.Mesh(mohawkGeom, hairMaterial);
            mohawk.position.set(0, headSize * 0.6, -headSize * 0.15); // 頭を基準とした相対位置
            
            hairParts.push(mohawk);
            break;
            
        case 'bald':
            // Cap style - cap covering top 1/3 of head with extended visor
            const capMainGeom = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.3, headSize * 1.2); // Larger front-back (1.0→1.2)
            const capMain = new THREE.Mesh(capMainGeom, hairMaterial); // Use hair material for cap color
            capMain.position.set(0, headSize * 0.5, 0); // 頭を基準とした相対位置
            
            const capVisorGeom = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.05, headSize * 0.8); // Extend visor forward (0.6→0.8)
            const capVisor = new THREE.Mesh(capVisorGeom, hairMaterial);
            capVisor.position.set(0, headSize * 0.35, headSize * 0.55); // Move visor further forward (0.45→0.55)
            
            hairParts.push(capMain, capVisor);
            break;
            
        case 'default':
        default:
            const hairBackGeom = new THREE.BoxGeometry(headSize * 1.15, headSize * 0.85, headSize * 0.75); // Thinner back hair
            const hairBack = new THREE.Mesh(hairBackGeom, hairMaterial);
            hairBack.position.set(0, 0, -headSize * 0.45); // 頭を基準とした相対位置
            
            const hairTopGeom = new THREE.BoxGeometry(headSize * 1.05, headSize * 0.35, headSize * 1.15); // Thinner top hair
            const hairTop = new THREE.Mesh(hairTopGeom, hairMaterial);
            hairTop.position.set(0, headSize * 0.45, -headSize * 0.1); // 頭を基準とした相対位置
            
            const hairBangsGeom = new THREE.BoxGeometry(headSize * 0.8, headSize * 0.05, headSize * 0.3);
            const hairBangs = new THREE.Mesh(hairBangsGeom, hairMaterial);
            hairBangs.position.set(0, headSize * 0.15, headSize * 0.35); // 頭を基準とした相対位置
            
            // Cut the back hair to align with top hair
            const backHairCutGeom = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.9, headSize * 0.3);
            const backHairCut = new THREE.Mesh(backHairCutGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
            backHairCut.position.set(0, headSize * 0.4, -headSize * 0.45);
            
            hairParts.push(hairBack, hairTop, hairBangs);
            break;
    }

    // Arms and Gun
    const aimGroup = new THREE.Group();
    const gunLength = 2.0;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, gunLength), gunMaterial);
    gun.position.z = gunLength / 2;
    gun.visible = true; // Show gun for gameplay (will be hidden only in preview reset)
    aimGroup.position.y = (legSegmentHeight * 2) + torsoHeight * 0.7; // Restore original arm position
    // Arms (upper + forearm)
    const upperArmLen = 0.5 * s;
    const foreArmLen = 0.5 * s;
    const upperArmGeom = new THREE.BoxGeometry(0.2 * s, 0.2 * s, upperArmLen);
    const foreArmGeom = new THREE.BoxGeometry(0.18 * s, 0.18 * s, foreArmLen);
    const leftArm = new THREE.Mesh(upperArmGeom, clothingMaterial);
    leftArm.position.set(-0.45 * s, 0, upperArmLen / 2);
    const rightArm = new THREE.Mesh(upperArmGeom, clothingMaterial);
    rightArm.position.set(0.45 * s, 0, upperArmLen / 2);
    const leftElbow = new THREE.Object3D();
    leftElbow.position.set(0, 0, upperArmLen / 2);
    leftArm.add(leftElbow);
    const rightElbow = new THREE.Object3D();
    rightElbow.position.set(0, 0, upperArmLen / 2);
    rightArm.add(rightElbow);
    const leftForearm = new THREE.Mesh(foreArmGeom, clothingMaterial);
    leftForearm.position.set(0, 0, foreArmLen / 2);
    leftElbow.add(leftForearm);
    const rightForearm = new THREE.Mesh(foreArmGeom, clothingMaterial);
    rightForearm.position.set(0, 0, foreArmLen / 2);
    rightElbow.add(rightForearm);
    const handSize = 0.16 * s;
    const leftHand = new THREE.Object3D();
    leftHand.position.set(0, 0, foreArmLen / 2);
    const leftHandMesh = new THREE.Mesh(new THREE.BoxGeometry(handSize, handSize, handSize), skinMaterial);
    leftHand.add(leftHandMesh);
    leftForearm.add(leftHand);
    const rightHand = new THREE.Object3D();
    rightHand.position.set(0, 0, foreArmLen / 2);
    const rightHandMesh = leftHandMesh.clone();
    rightHand.add(rightHandMesh);
    rightForearm.add(rightHand);
    const gunGrip = new THREE.Object3D();
    gunGrip.position.set(0, 0, 0);
    gunGrip.add(gun);
    aimGroup.add(gunGrip);
    aimGroup.add(leftArm, rightArm);

    // Legs (Thigh + Shin)
    const legWidth = 0.25 * s;
    const thighGeom = new THREE.BoxGeometry(legWidth, legSegmentHeight, legWidth);
    const shinGeom = new THREE.BoxGeometry(legWidth * 0.88, legSegmentHeight * 0.85, legWidth * 0.88);
    const leftHip = new THREE.Object3D();
    leftHip.position.set(-0.2 * s, legSegmentHeight * 2 - 0.12 * s, 0);
    const rightHip = new THREE.Object3D();
    rightHip.position.set(0.2 * s, legSegmentHeight * 2 - 0.12 * s, 0);
    const leftThigh = new THREE.Mesh(thighGeom, pantsMaterial);
    leftThigh.position.y = -legSegmentHeight / 2;
    leftHip.add(leftThigh);
    const rightThigh = new THREE.Mesh(thighGeom, pantsMaterial);
    rightThigh.position.y = -legSegmentHeight / 2;
    rightHip.add(rightThigh);
    const leftKnee = new THREE.Object3D();
    leftKnee.position.y = -legSegmentHeight;
    leftHip.add(leftKnee);
    const rightKnee = new THREE.Object3D();
    rightKnee.position.y = -legSegmentHeight;
    rightHip.add(rightKnee);
    const leftShin = new THREE.Mesh(shinGeom, pantsMaterial);
    leftShin.position.y = -legSegmentHeight / 2;
    leftKnee.add(leftShin);
    const rightShin = new THREE.Mesh(shinGeom, pantsMaterial);
    rightShin.position.y = -legSegmentHeight / 2;
    rightKnee.add(rightShin);

    // Waist/Hips (integrated with torso)
    const waistLength = 0.15 * s;
    const waistGeom = new THREE.BoxGeometry(0.65 * s, waistLength, 0.35 * s);
    const waist = new THREE.Mesh(waistGeom, pantsMaterial);
    waist.position.y = torsoY - torsoHeight / 2 - waistLength / 2;

    // Feet (Shoes)
    const footLength = 0.3 * s;
    const footWidth = 0.25 * s; // 脚の横幅に合わせる（0.35→0.25）
    const footHeight = 0.12 * s;
    const footGeom = new THREE.BoxGeometry(footWidth, footHeight, footLength);
    
    const leftFoot = new THREE.Mesh(footGeom, shoeMaterial);
    leftFoot.position.set(0, -legSegmentHeight * 0.85 + footHeight / 2 - 0.06 * s, footLength / 10);
    leftKnee.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeom, shoeMaterial);
    rightFoot.position.set(0, -legSegmentHeight * 0.85 + footHeight / 2 - 0.06 * s, footLength / 10);
    rightKnee.add(rightFoot);

    // Add hair parts to head (not to character model directly)
    hairParts.forEach(hairPart => {
        head.add(hairPart);
    });

    const characterModel = new THREE.Group();
    const allParts = [body, head, leftEyeLine, rightEyeLine, nose, leftEar, rightEar, aimGroup, leftHip, rightHip, waist];
    characterModel.add(...allParts);
    
    // Store hair parts for potential later updates
    characterModel.userData.hairParts = hairParts;
    characterModel.userData.parts = {
        body: body,
        head: head,
        aimGroup: aimGroup,
        gun: gun,
        gunGrip: gunGrip,
        leftArm: leftArm,
        rightArm: rightArm,
        leftElbow: leftElbow,
        rightElbow: rightElbow,
        leftForearm: leftForearm,
        rightForearm: rightForearm,
        leftHand: leftHand,
        rightHand: rightHand,
        leftHip: leftHip,
        rightHip: rightHip,
        leftKnee: leftKnee,
        rightKnee: rightKnee,
        leftFoot: leftFoot,
        rightFoot: rightFoot,
        waist: waist,
        hairParts: hairParts,
        baseTorsoY: torsoY,
        baseHeadY: headY,
        baseAimY: aimGroup.position.y,
        baseLeftArmPos: leftArm.position.clone(),
        baseRightArmPos: rightArm.position.clone(),
        baseLeftArmRot: leftArm.rotation.clone(),
        baseRightArmRot: rightArm.rotation.clone(),
        baseLeftElbowRot: leftElbow.rotation.clone(),
        baseRightElbowRot: rightElbow.rotation.clone()
    };
    characterModel.userData.footOffset = legSegmentHeight * 0.5;
    return characterModel;
}

function applyGunStyle(gunMesh, weaponType) {
    if (!gunMesh) return;
    // Remove old attachments (magazine/scope etc.)
    while (gunMesh.children.length > 0) {
        const child = gunMesh.children[0];
        gunMesh.remove(child);
        if (child.geometry) child.geometry.dispose();
        disposeMaterial(child.material); // 安全なマテリアル破棄を使用
    }

    let length = 1.2;
    let thickness = 0.12;
    let color = 0x111111;
    let shape = 'box';
    switch (weaponType) {
        case WEAPON_PISTOL: length = 0.6; thickness = 0.08; color = 0x222222; break;
        case WEAPON_MG: length = 1.1; thickness = 0.10; color = 0x111111; break;
        case WEAPON_RR: length = 2.6; thickness = 0.22; color = 0x6b4b1f; shape = 'cylinder'; break;
        case WEAPON_SR: length = 1.65; thickness = 0.09; color = 0xcccccc; break;
        case WEAPON_SG: length = 1.2; thickness = 0.12; color = 0x444444; break;
        case WEAPON_MR: length = 1.4; thickness = 0.12; color = 0x8b4513; break;
    }
    gunMesh.geometry.dispose();
    if (shape === 'cylinder') {
        const g = new THREE.CylinderGeometry(thickness / 2, thickness / 2, length, 16);
        g.rotateX(Math.PI / 2); // align cylinder axis to Z
        gunMesh.geometry = g;
    } else {
        gunMesh.geometry = new THREE.BoxGeometry(thickness, thickness, length);
    }
    gunMesh.material.color.setHex(color);
    
    // Add shiny effect for black weapons using MeshStandardMaterial
    if (color === 0x222222 || color === 0x111111) {
        gunMesh.material = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.8,
            roughness: 0.1
        });
    } else {
        gunMesh.material = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.3,
            roughness: 0.5
        });
    }
    gunMesh.userData.gunLength = length;
    gunMesh.position.z = length / 2;

    if (weaponType === WEAPON_MG) {
        // Add a simple box magazine under the gun
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(thickness * 0.8, thickness * 2.2, thickness * 1.1),
            new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        mag.position.set(0, -thickness * 1.5, length * 0.05);
        gunMesh.add(mag);
    } else if (weaponType === WEAPON_SR) {
        // Add a cylindrical scope on top, near left supporting hand area
        const scope = new THREE.Mesh(
            new THREE.CylinderGeometry(thickness * 0.35, thickness * 0.35, thickness * 2.6, 12),
            new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
        );
        scope.rotation.x = Math.PI / 2; // along Z
        scope.position.set(0, thickness * 0.9, length * 0.18);
        gunMesh.add(scope);
    } else if (weaponType === WEAPON_MR) {
        // Add a slightly longer black barrel
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(thickness * 0.5, thickness * 0.5, length * 0.75),
            new THREE.MeshLambertMaterial({ color: 0x111111 })
        );
        barrel.position.set(0, 0, length * 0.35);
        gunMesh.add(barrel);
    }
}

function clampAngle(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

function applyAimConstraints(parts, ownerYaw, targetWorldPos) {
    if (!parts || !parts.aimGroup) return;
    const ownerPos = new THREE.Vector3();
    parts.aimGroup.getWorldPosition(ownerPos);
    const dir = new THREE.Vector3().subVectors(targetWorldPos, ownerPos);
    const flat = new THREE.Vector3(dir.x, 0, dir.z);
    const desiredYaw = Math.atan2(flat.x, flat.z);
    const desiredPitch = Math.atan2(dir.y, flat.length());
    const relYaw = normalizeAngle(desiredYaw - ownerYaw);
    const clampedRelYaw = clampAngle(relYaw, -Math.PI / 3, Math.PI / 3); // +/- 60 deg
    // In this rig, +X pitch rotates the muzzle downward, so invert the sign.
    // Downward allowance is wider to prevent aiming above target.
    const clampedPitch = clampAngle(-desiredPitch, -0.6, 1.2);
    parts.aimGroup.rotation.y = clampedRelYaw;
    parts.aimGroup.rotation.x = clampedPitch;
}

function clampArmJoints(parts) {
    if (!parts) return;
    if (parts.leftArm) {
        parts.leftArm.rotation.x = clampAngle(parts.leftArm.rotation.x, -0.6, 0.2);
        parts.leftArm.rotation.y = clampAngle(parts.leftArm.rotation.y, -0.7, 0.7);
    }
    if (parts.rightArm) {
        parts.rightArm.rotation.x = clampAngle(parts.rightArm.rotation.x, -0.8, 0.2);
        parts.rightArm.rotation.y = clampAngle(parts.rightArm.rotation.y, -0.7, 0.7);
    }
    if (parts.leftElbow) {
        parts.leftElbow.rotation.x = clampAngle(parts.leftElbow.rotation.x, -0.8, 0.1);
    }
    if (parts.rightElbow) {
        parts.rightElbow.rotation.x = clampAngle(parts.rightElbow.rotation.x, 0, 1.0);
        parts.rightElbow.rotation.z = clampAngle(parts.rightElbow.rotation.z || 0, -1.0, 1.0);
    }
}

function applyCrouchPose(parts, isCrouching, timeElapsed, isMoving) {
    if (!parts) return;
    if (isCrouching && isMoving) {
        // Crouch walking animation
        const hipBend = Math.PI / 4.2;
        const kneeBend = Math.PI / 2.6;
        const walkSpeed = 8; // Slower walking while crouched
        const hipAmplitude = Math.PI / 8; // Reduced amplitude for crouch walking
        const kneeAmplitude = Math.PI / 6; // Reduced amplitude for crouch walking
        
        // Base crouch pose
        parts.leftHip.rotation.x = -hipBend;
        parts.rightHip.rotation.x = -hipBend;
        parts.leftKnee.rotation.x = kneeBend;
        parts.rightKnee.rotation.x = kneeBend;
        parts.body.rotation.x = -0.22;
        parts.head.position.y = parts.baseHeadY - 0.05;
        
        // Add walking animation on top of crouch pose
        const swing = Math.sin(timeElapsed * walkSpeed) * hipAmplitude;
        parts.leftHip.rotation.x += swing;
        parts.rightHip.rotation.x -= swing;
        parts.leftKnee.rotation.x += Math.max(0, (Math.cos(timeElapsed * walkSpeed) + 1) / 2 * kneeAmplitude);
        parts.rightKnee.rotation.x += Math.max(0, (Math.cos(timeElapsed * walkSpeed + Math.PI) + 1) / 2 * kneeAmplitude);
        
        // Head movement while crouch walking
        const headBobOffset = Math.sin(timeElapsed * walkSpeed) * 0.02;
        parts.head.position.y += headBobOffset;
    } else if (isCrouching) {
        const hipBend = Math.PI / 4.2;
        const kneeBend = Math.PI / 2.6;
        // Bend legs toward the forward-hand direction (human-like crouch)
        parts.leftHip.rotation.x = -hipBend;
        parts.rightHip.rotation.x = -hipBend;
        parts.leftKnee.rotation.x = kneeBend;
        parts.rightKnee.rotation.x = kneeBend;
        parts.body.rotation.x = -0.22;
        parts.head.position.y = parts.baseHeadY - 0.05;
    } else if (isMoving) {
        const walkSpeed = 10;
        const hipAmplitude = Math.PI / 4;
        const kneeAmplitude = Math.PI / 3;
        const swing = Math.sin(timeElapsed * walkSpeed) * hipAmplitude;
        parts.leftHip.rotation.x = swing;
        parts.rightHip.rotation.x = -swing;
        parts.leftKnee.rotation.x = Math.max(0, (Math.cos(timeElapsed * walkSpeed) + 1) / 2 * kneeAmplitude);
        parts.rightKnee.rotation.x = Math.max(0, (Math.cos(timeElapsed * walkSpeed + Math.PI) + 1) / 2 * kneeAmplitude);
        parts.body.rotation.x = -0.15;
        const headBobOffset = Math.sin(timeElapsed * walkSpeed) * 0.05;
        parts.head.position.y = parts.baseHeadY + headBobOffset;
    } else {
        parts.leftHip.rotation.x = 0;
        parts.rightHip.rotation.x = 0;
        parts.leftKnee.rotation.x = 0;
        parts.rightKnee.rotation.x = 0;
        parts.body.rotation.x = 0;
        parts.head.position.y = parts.baseHeadY;
    }
}

function getGunMuzzleInfo(parts) {
    if (!parts || !parts.gun || !parts.gun.geometry || !parts.gun.geometry.parameters) return null;
    const gun = parts.gun;
    const gunLength = gun.userData && gun.userData.gunLength ? gun.userData.gunLength : (gun.geometry.parameters.depth || gun.geometry.parameters.height || 0.5);
    const localMuzzle = new THREE.Vector3(0, 0, gunLength / 2);
    const worldMuzzle = gun.localToWorld(localMuzzle.clone());
    const gunQuat = new THREE.Quaternion();
    gun.getWorldQuaternion(gunQuat);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(gunQuat).normalize();
    return { position: worldMuzzle, direction: dir };
}

function alignGunGripToHands(parts, alpha = 1.0) {
    if (!parts || !parts.leftHand || !parts.rightHand || !parts.gunGrip || !parts.aimGroup) return;
    const leftWorld = new THREE.Vector3();
    const rightWorld = new THREE.Vector3();
    parts.leftHand.getWorldPosition(leftWorld);
    parts.rightHand.getWorldPosition(rightWorld);
    const mid = leftWorld.add(rightWorld).multiplyScalar(0.5);
    const localMid = parts.aimGroup.worldToLocal(mid);
    if (alpha >= 1.0) {
        parts.gunGrip.position.copy(localMid);
    } else {
        parts.gunGrip.position.lerp(localMid, alpha);
    }
}

function alignGunGripToRightHand(parts) {
    if (!parts || !parts.leftHand || !parts.gunGrip || !parts.aimGroup) return;
    const leftWorld = new THREE.Vector3();
    parts.leftHand.getWorldPosition(leftWorld);
    const localLeft = parts.aimGroup.worldToLocal(leftWorld);
    parts.gunGrip.position.copy(localLeft);
    parts.gunGrip.rotation.set(0, 0, 0);
    // Let the other hand relax away from the gun for death pose
    if (parts.rightArm) {
        parts.rightArm.rotation.set(-0.4, -0.8, 0.2);
    }
    if (parts.rightElbow) {
        parts.rightElbow.rotation.set(0.8, -0.2, -0.1);
    }
}

function getPlayerNeckPos() {
    const b = getPlayerCombatBounds();
    const p = player.position.clone();
    p.y = b.topY - b.height * 0.22;
    return p;
}

function getPlayerBodyPos() {
    const b = getPlayerCombatBounds();
    const p = player.position.clone();
    p.y = b.topY - b.height * 0.62;
    return p;
}

function getPlayerFootPos() {
    const b = getPlayerCombatBounds();
    const p = player.position.clone();
    p.y = b.bottomY + 0.1;
    return p;
}

function getPlayerUpperTorsoPos() {
    const b = getPlayerCombatBounds();
    const p = player.position.clone();
    p.y = b.topY - b.height * 0.45;
    return p;
}

function getPlayerHeadPos() {
    const b = getPlayerCombatBounds();
    const p = player.position.clone();
    // Slightly below top of hitbox to avoid overshooting above the head.
    p.y = b.topY - b.height * 0.16;
    return p;
}

function getPlayerCombatBounds() {
    // Use the actual gameplay body range (top = player.position.y, bottom = top - playerTargetHeight)
    // and add a tiny margin to reduce tunneling near edges.
    const topY = player.position.y + 0.06;
    let bottomY = player.position.y - playerTargetHeight - 0.06;
    if (bottomY < -FLOOR_HEIGHT) bottomY = -FLOOR_HEIGHT;
    const height = topY - bottomY;
    return { topY, bottomY, height };
}

// Reusable temporary vectors for performance optimization
const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const tempVector3 = new THREE.Vector3();
const tempBox1 = new THREE.Box3();

// Lightweight texture cache and loader
const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

// Create procedural textures for better performance
function createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base brick color
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 256, 256);
    
    // Brick pattern
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    
    // Draw bricks
    for (let y = 0; y < 256; y += 32) {
        for (let x = 0; x < 256; x += 64) {
            const offsetX = (y / 32) % 2 === 0 ? 0 : 32;
            ctx.strokeRect(x + offsetX, y, 64, 32);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

function createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base concrete color
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add noise for texture
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const brightness = Math.random() * 40 - 20;
        ctx.fillStyle = `rgba(128, 128, 128, ${Math.random() * 0.3})`;
        ctx.fillRect(x, y, 2, 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

function findNearbyCover(position, obstacles) {
    const coverSearchRadius = 3.0; // 3m以内の障害物を探索
    let nearestCover = null;
    let nearestDistance = coverSearchRadius;
    
    // パフォーマンス最適化：まず距離でフィルタリング
    const positionSquared = position.x * position.x + position.z * position.z;
    
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        tempBox1.setFromObject(obstacle);
        const obstacleCenter = tempBox1.getCenter(tempVector1);
        
        // まず簡単な距離チェックで除外
        const dx = obstacleCenter.x - position.x;
        const dz = obstacleCenter.z - position.z;
        const distanceSquared = dx * dx + dz * dz;
        
        if (distanceSquared < nearestDistance * nearestDistance) {
            const distance = Math.sqrt(distanceSquared);
            
            // 障害物がプレイヤーからの射線を遮る位置にあるかチェック
            tempVector2.copy(player.position).sub(position);
            tempVector3.copy(obstacleCenter).sub(position);
            
            // 障害物がプレイヤー方向にあるか
            if (tempVector3.dot(tempVector2) > 0) {
                nearestCover = obstacle;
                nearestDistance = distance;
            }
        }
    }
    
    return nearestCover;
}

function getAIUpperTorsoPos(targetAI) {
    const p = targetAI.position.clone();
    const h = targetAI.isCrouching ? BODY_HEIGHT * 0.45 : BODY_HEIGHT * 0.58;
    p.y += h;
    return p;
}

function getAIHeadPos(targetAI) {
    return targetAI.children[1].getWorldPosition(new THREE.Vector3());
}

function getAILowerTorsoPos(targetAI) {
    const p = targetAI.position.clone();
    const h = targetAI.isCrouching ? BODY_HEIGHT * 0.3 : BODY_HEIGHT * 0.42;
    p.y += h;
    return p;
}

function applyWeaponPose(parts, weaponType) {
    if (!parts || !parts.leftArm || !parts.rightArm || !parts.gun || !parts.aimGroup) return;
    // Reset to defaults
    parts.aimGroup.position.y = parts.baseAimY;
    parts.leftArm.position.copy(parts.baseLeftArmPos || new THREE.Vector3(-0.28, 0, 0.2));
    parts.rightArm.position.copy(parts.baseRightArmPos || new THREE.Vector3(0.28, 0, 0.7));
    if (parts.baseLeftArmRot) parts.leftArm.rotation.copy(parts.baseLeftArmRot);
    else parts.leftArm.rotation.set(0, Math.PI / 6, 0);
    if (parts.baseRightArmRot) parts.rightArm.rotation.copy(parts.baseRightArmRot);
    else parts.rightArm.rotation.set(0, -Math.PI / 6, 0);
    if (parts.leftElbow) {
        if (parts.baseLeftElbowRot) parts.leftElbow.rotation.copy(parts.baseLeftElbowRot);
        else parts.leftElbow.rotation.set(0, 0, 0);
    }
    if (parts.rightElbow) {
        if (parts.baseRightElbowRot) parts.rightElbow.rotation.copy(parts.baseRightElbowRot);
        else parts.rightElbow.rotation.set(0, 0, 0);
    }
    parts.gun.position.y = 0;
    parts.gun.position.z = parts.gun.geometry.parameters.depth / 2;
    if (parts.gunGrip) {
        parts.gunGrip.position.set(0, 0, 0);
    }

    if (weaponType === WEAPON_PISTOL) {
        // JSON slot: pistol
        parts.aimGroup.position.y = parts.baseAimY;
        parts.leftArm.position.set(-0.45, 0.3132, 0.0);
        parts.rightArm.position.set(0.45, 0.3132, 0.0);
        // Bring both hands more tightly together for pistol grip
        parts.leftArm.rotation.set(-0.06, 0.44, 0.0021478930549691387);
        parts.rightArm.rotation.set(-0.05, -0.44, -0.003943059002281813);
        if (parts.leftElbow) parts.leftElbow.rotation.set(0.06, 0.0020761553815649442, 0.05233736454354215);
        if (parts.rightElbow) parts.rightElbow.rotation.set(-0.02, 0.0, -0.017453292519943295);
        // Keep pistol close to joined hands (grip centered).
        parts.gun.position.set(0.0, 0.18, 0.36);
        parts.gun.rotation.set(0.0, 0.0, 0.0);
    } else if (weaponType === WEAPON_SR) {
        // JSON slot: sniper
        parts.aimGroup.position.y = parts.baseAimY;
        parts.leftArm.position.set(-0.45, 0.3132, 0.0);
        parts.rightArm.position.set(0.45, 0.3132, 0.0);
        parts.leftArm.rotation.set(0.6618416930961246, -0.3597994143825173, 2.0595783476597678);
        parts.rightArm.rotation.set(0.24274440027514796, -0.5401874416309049, 0.024265044376310912);
        if (parts.leftElbow) parts.leftElbow.rotation.set(1.753517159651292, 0.2856199806570641, -0.4952400535591467);
        if (parts.rightElbow) parts.rightElbow.rotation.set(-0.23748038772965996, -0.09328549730483378, 0.6873193048891241);
        // Pull sniper back toward shoulder/cheek.
        parts.gun.position.set(-0.12, 0.22, 0.44);
        parts.gun.rotation.set(0.0, 0.0, 0.0);
    } else if (weaponType === WEAPON_RR) {
        // JSON slot: rocket
        parts.aimGroup.position.y = parts.baseAimY;
        parts.leftArm.position.set(-0.45, 0.3132, 0.0);
        parts.rightArm.position.set(0.45, 0.3132, 0.0);
        parts.leftArm.rotation.set(0.23506191003562008, -1.2406321520450616, 0.07328647962446797);
        parts.rightArm.rotation.set(0.27004295572984904, -0.27777150302432024, -0.23935315585356648);
        if (parts.leftElbow) parts.leftElbow.rotation.set(-2.951909014214923, 0.9012344301742208, 2.6785501380109666);
        if (parts.rightElbow) parts.rightElbow.rotation.set(-0.0887078442944804, -0.8044137392457578, 2.695042877288731);
        // Rocket sits around shoulder, not floating in front.
        parts.gun.position.set(-0.22, 0.24, 0.34);
        parts.gun.rotation.set(0.0, 0.0, 0.0);
    } else if (weaponType === WEAPON_SG || weaponType === WEAPON_MG || weaponType === WEAPON_MR) {
        // JSON slot: rifle (used for MG/SG)
        parts.aimGroup.position.y = parts.baseAimY;
        parts.leftArm.position.set(-0.45, 0.22, 0.0);
        parts.rightArm.position.set(0.45, 0.3132, 0.0);
        parts.leftArm.rotation.set(1.0661433898131165, -0.6857123545620026, 0.9750821801277433);
        parts.rightArm.rotation.set(0.3611548453545697, -0.521485165467918, -0.09787351043009526);
        if (parts.leftElbow) parts.leftElbow.rotation.set(-2.9325187133696122, 0.9525931111876489, 3.0153732832397564);
        if (parts.rightElbow) parts.rightElbow.rotation.set(-0.30553800194860886, -0.2667850827551789, 1.604154961353316);
        // Rifle/MG/SG grip near center between hands.
        parts.gun.position.set(-0.16, 0.18, 0.44);
        parts.gun.rotation.set(0.0, 0.0, 0.06981317007977318);
    }
}

function createAI(color, customization = null) {
    const aiObject = createCharacterModel(color, customization);

    // AI-specific properties
    aiObject.position.y = -FLOOR_HEIGHT + 0.2; // Raise character more to prevent shoes sinking
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
    aiObject.ammoMR = 0;
    aiObject.targetWeaponPickup = null;
    aiObject.hp = 3;
    aiObject.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
    aiObject.targetPosition = new THREE.Vector3();
    aiObject.isCrouching = false;
    aiObject.crouchUntilTime = null; // 戦術的しゃがみのタイマー
    aiObject.lastCoverSearchTime = 0; // カバー探索のクールダウン
    aiObject.aggression = Math.random();
    aiObject.flankAggression = Math.random();
    aiObject.lastFlankTime = 0;
    aiObject.lastPosition = new THREE.Vector3(); // <= これを追加
    aiObject.lastUnderFireTime = -999;
    aiObject.lastSeenEnemyTime = -999;
    aiObject.lastKnownEnemyPos = null;
    aiObject.lastKnownThreatPos = null;
    aiObject.isElevating = false;
    aiObject.userData.rooftopIntent = false;
    aiObject.userData.onRooftop = false;
    aiObject.userData.rooftopSensor = null;
    aiObject.userData.rooftopObstacle = null;
    aiObject.userData.rooftopLadderPos = null;
    aiObject.userData.rooftopTargetY = -FLOOR_HEIGHT;
    aiObject.userData.elevatingDirection = 0;
    aiObject.userData.nextRooftopDecisionAt = 0;
    aiObject.userData.rooftopDecisionMade = false;
    aiObject.userData.rooftopStateSince = 0;
    aiObject.userData.rooftopPhase = 'none';
    aiObject.userData.stallStartTime = 0;
    aiObject.userData.searchPulseAt = 0;
    aiObject.userData.nextPerceptionTime = 0;
    aiObject.userData.cachedVisibleOpponentInfo = null;
    aiObject.userData.cachedIsAISeen = false;
    aiObject.userData.groundIdleSince = 0;



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

function getOpponentTargetsForAI(ai) {
    const targets = [];
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';
    if (isTeamModeOrTeamArcade) {
        if (ai.team === 'player') {
            for (const other of ais) {
                if (other !== ai && other.team === 'enemy' && other.hp > 0) targets.push(other);
            }
        } else if (ai.team === 'enemy') {
            if (playerHP > 0) targets.push(player);
            for (const other of ais) {
                if (other !== ai && other.team === 'player' && other.hp > 0) targets.push(other);
            }
        }
        return targets;
    }
    if (gameSettings.gameMode === 'ffa') {
        if (playerHP > 0) targets.push(player);
        for (const other of ais) {
            if (other !== ai && other.hp > 0) targets.push(other);
        }
        return targets;
    }
    // 非チームモード(battle等)ではプレイヤーだけでなく近くのAIも標的候補に含める
    if (playerHP > 0) targets.push(player);
    for (const other of ais) {
        if (other !== ai && other.hp > 0) targets.push(other);
    }
    return targets;
}

function getClosestOpponentPosition(ai) {
    const opponents = getOpponentTargetsForAI(ai);
    let bestPos = null;
    let bestDist = Infinity;
    for (const t of opponents) {
        const tPos = t === player ? player.position : t.position;
        const d = ai.position.distanceTo(tPos);
        if (d < bestDist) {
            bestDist = d;
            bestPos = tPos.clone();
        }
    }
    return bestPos;
}

function canAISeeAnyOpponent(ai) {
    const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
    const opponents = getOpponentTargetsForAI(ai);
    for (const t of opponents) {
        if (t === player) {
            const pHead = getPlayerHeadPos();
            const pUpper = getPlayerUpperTorsoPos();
            const pBody = getPlayerBodyPos();
            if (checkLineOfSight(aiHeadPos, pHead, obstacles) || checkLineOfSight(aiHeadPos, pUpper, obstacles) || checkLineOfSight(aiHeadPos, pBody, obstacles)) {
                return true;
            }
        } else {
            const h = getAIUpperTorsoPos(t);
            const b = getAILowerTorsoPos(t);
            if (checkLineOfSight(aiHeadPos, h, obstacles) || checkLineOfSight(aiHeadPos, b, obstacles)) {
                return true;
            }
        }
    }
    return false;
}

function checkLineOfSight(startPosition, endPosition, objectsToAvoid) {
    const direction = new THREE.Vector3().subVectors(endPosition, startPosition).normalize();
    const distance = startPosition.distanceTo(endPosition);
    raycaster.set(startPosition, direction);
    raycaster.far = distance;
    const intersects = raycaster.intersectObjects(objectsToAvoid, true);
    for (const hit of intersects) {
        if (hit.object && hit.object.userData && hit.object.userData.blocksProjectiles === false) continue;
        if (isHouseProjectilePassThrough(hit)) continue;
        return false;
    }
    return true;
}

function getFirstProjectileHit(ray, objects) {
    const intersects = ray.intersectObjects(objects, true);
    let bestHit = null;
    for (const hit of intersects) {
        if (hit.object && hit.object.userData && hit.object.userData.blocksProjectiles === false) continue;
        if (isHouseProjectilePassThrough(hit)) continue;
        bestHit = hit;
        break;
    }
    const houseHit = getHouseRayHit(ray.ray.origin, ray.ray.direction, ray.far);
    if (houseHit && (!bestHit || houseHit.distance < bestHit.distance)) {
        return houseHit;
    }
    return bestHit;
}

function isHouseProjectilePassThrough(hit) {
    if (!hit || !hit.object || !hit.object.userData) return false;
    const face = hit.object.userData.houseFace;
    const house = hit.object.userData.houseRef;
    if (!face || !house || !house.userData) return false;
    const spec = house.userData.windowSpec;
    if (!spec) return false;
    const dims = house.userData;
    const local = house.worldToLocal(hit.point.clone());
    const height = dims.height || 5;
    const depth = dims.depth || 8;
    const width = dims.width || 8;
    const windowBottom = (win) => (-height / 2 + win.y);
    const inWindow = (win, axisVal) => {
        const centerY = windowBottom(win) + win.h / 2;
        if (local.y < centerY - win.h / 2 || local.y > centerY + win.h / 2) return false;
        if (axisVal < win.x - win.w / 2 || axisVal > win.x + win.w / 2) return false;
        return true;
    };
    if (face === 'back') {
        if (Math.abs(local.z + depth / 2) > 0.4) return false;
        for (const win of spec.back) {
            if (inWindow(win, local.x)) return true;
        }
    }
    if (face === 'left') {
        if (Math.abs(local.x + width / 2) > 0.4) return false;
        for (const win of spec.side) {
            if (inWindow(win, local.z)) return true;
        }
    }
    if (face === 'right') {
        if (Math.abs(local.x - width / 2) > 0.4) return false;
        for (const win of spec.side) {
            if (inWindow(win, local.z)) return true;
        }
    }
    return false;
}

function getHouseRayHit(origin, direction, maxDist) {
    let best = null;
    for (const house of houses) {
        if (!house || !house.userData) continue;
        const w = house.userData.width || 8;
        const h = house.userData.height || 5;
        const d = house.userData.depth || 8;
        const doorHalf = Math.min(2.5, w * 0.6) / 2;
        const winBack = house.userData.windowSpec?.back || [];
        const winSide = house.userData.windowSpec?.side || [];

        const q = new THREE.Quaternion();
        house.getWorldQuaternion(q);
        const invQ = q.clone().invert();
        const localOrigin = house.worldToLocal(origin.clone());
        const localDir = direction.clone().applyQuaternion(invQ).normalize();

        const tryPlane = (t, face) => {
            if (t <= 0 || t > maxDist) return;
            const p = localOrigin.clone().add(localDir.clone().multiplyScalar(t));
            if (p.y < -h / 2 || p.y > h / 2) return;
            if (face === 'front') {
                if (p.x < -w / 2 || p.x > w / 2) return;
                if (Math.abs(p.x) < doorHalf) return;
            }
            if (face === 'back') {
                if (p.x < -w / 2 || p.x > w / 2) return;
                for (const win of winBack) {
                    const cy = -h / 2 + win.y + win.h / 2;
                    if (p.x >= win.x - win.w / 2 && p.x <= win.x + win.w / 2 &&
                        p.y >= cy - win.h / 2 && p.y <= cy + win.h / 2) {
                        return;
                    }
                }
            }
            if (face === 'left') {
                if (p.z < -d / 2 || p.z > d / 2) return;
                for (const win of winSide) {
                    const cy = -h / 2 + win.y + win.h / 2;
                    if (p.z >= win.x - win.w / 2 && p.z <= win.x + win.w / 2 &&
                        p.y >= cy - win.h / 2 && p.y <= cy + win.h / 2) {
                        return;
                    }
                }
            }
            if (face === 'right') {
                if (p.z < -d / 2 || p.z > d / 2) return;
                for (const win of winSide) {
                    const cy = -h / 2 + win.y + win.h / 2;
                    if (p.z >= win.x - win.w / 2 && p.z <= win.x + win.w / 2 &&
                        p.y >= cy - win.h / 2 && p.y <= cy + win.h / 2) {
                        return;
                    }
                }
            }
            const worldPoint = house.localToWorld(p.clone());
            if (!best || t < best.distance) {
                best = {
                    object: { userData: { isHouseWall: true, isHouseHitProxy: true } },
                    point: worldPoint,
                    distance: t
                };
            }
        };

        if (Math.abs(localDir.z) > 1e-6) {
            tryPlane((d / 2 - localOrigin.z) / localDir.z, 'front');
            tryPlane((-d / 2 - localOrigin.z) / localDir.z, 'back');
        }
        if (Math.abs(localDir.x) > 1e-6) {
            tryPlane((-w / 2 - localOrigin.x) / localDir.x, 'left');
            tryPlane((w / 2 - localOrigin.x) / localDir.x, 'right');
        }
    }
    return best;
}

function getObjectAABBForCollision(object) {
    const pos = object.position;
    const box = new THREE.Box3();
    if (ais.includes(object)) {
        const aiBodyHeight = BODY_HEIGHT + (HEAD_RADIUS * 2); 
        const aiCollisionHeight = object.isCrouching ? aiBodyHeight * 0.7 : aiBodyHeight; 
        box.min.set(pos.x - 0.3, pos.y - aiCollisionHeight, pos.z - 0.3);
        box.max.set(pos.x + 0.3, pos.y, pos.z + 0.3);
    } else {
        box.min.set(pos.x - 0.2, pos.y - playerTargetHeight, pos.z - 0.2);
        box.max.set(pos.x + 0.2, pos.y, pos.z + 0.2);
    }
    return box;
}

function checkHouseCollisionBox(objectBox) {
    const corners = [
        new THREE.Vector3(objectBox.min.x, objectBox.min.y, objectBox.min.z),
        new THREE.Vector3(objectBox.min.x, objectBox.min.y, objectBox.max.z),
        new THREE.Vector3(objectBox.min.x, objectBox.max.y, objectBox.min.z),
        new THREE.Vector3(objectBox.min.x, objectBox.max.y, objectBox.max.z),
        new THREE.Vector3(objectBox.max.x, objectBox.min.y, objectBox.min.z),
        new THREE.Vector3(objectBox.max.x, objectBox.min.y, objectBox.max.z),
        new THREE.Vector3(objectBox.max.x, objectBox.max.y, objectBox.min.z),
        new THREE.Vector3(objectBox.max.x, objectBox.max.y, objectBox.max.z)
    ];
    for (const house of houses) {
        if (!house || !house.userData) continue;
        const w = house.userData.width || 8;
        const h = house.userData.height || 5;
        const d = house.userData.depth || 8;
        const doorHalf = Math.min(2.5, w * 0.6) / 2;
        const localMin = new THREE.Vector3(Infinity, Infinity, Infinity);
        const localMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        for (const c of corners) {
            const lc = house.worldToLocal(c.clone());
            localMin.min(lc);
            localMax.max(lc);
        }
        const t = 0.15;
        // Front wall (door opening allowed)
        if (localMax.z >= d / 2 - t && localMin.z <= d / 2 + t &&
            localMax.y >= -h / 2 && localMin.y <= h / 2 &&
            localMax.x >= -w / 2 && localMin.x <= w / 2) {
            if (localMin.x < -doorHalf || localMax.x > doorHalf) return true;
        }
        // Back wall
        if (localMax.z >= -d / 2 - t && localMin.z <= -d / 2 + t &&
            localMax.y >= -h / 2 && localMin.y <= h / 2 &&
            localMax.x >= -w / 2 && localMin.x <= w / 2) {
            return true;
        }
        // Left wall
        if (localMax.x >= -w / 2 - t && localMin.x <= -w / 2 + t &&
            localMax.y >= -h / 2 && localMin.y <= h / 2 &&
            localMax.z >= -d / 2 && localMin.z <= d / 2) {
            return true;
        }
        // Right wall
        if (localMax.x >= w / 2 - t && localMin.x <= w / 2 + t &&
            localMax.y >= -h / 2 && localMin.y <= h / 2 &&
            localMax.z >= -d / 2 && localMin.z <= d / 2) {
            return true;
        }
    }
    return false;
}

function resolveCustomMapSelection() {
    const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
    const names = Object.keys(allCustomMaps);
    if (names.length === 0) return { allCustomMaps, mapName: null, mapData: null };

    // mapTypeが'custom'でない場合はnullを返す
    if (gameSettings.mapType !== 'custom') {
        return { allCustomMaps, mapName: null, mapData: null };
    }

    let mapName = gameSettings.customMapName;
    const selector = document.getElementById('unified-map-selector');
    if ((!mapName || !allCustomMaps[mapName]) && selector && selector.value && allCustomMaps[selector.value]) {
        mapName = selector.value;
    }
    if (!mapName || !allCustomMaps[mapName]) {
        mapName = names[0];
    }
    return { allCustomMaps, mapName, mapData: allCustomMaps[mapName] || null };
}

function findNearestLadder(ai, playerPosition) {
    let nearestLadder = null;
    let minDistance = Infinity;
    const aiPos = ai.position.clone();

    // プレイヤーが地上より十分に高い位置にいるかを単純な高さで判定する
    // これにより、どの屋上にいるかの複雑な判定を避け、ロバスト性を高める
    const playerIsSignificantlyHigher = playerPosition.y > (DEFAULT_OBSTACLE_HEIGHT * 0.8);

    if (playerIsSignificantlyHigher) {
        for (const sensorArea of ladderSwitches) {
            // どの建物かは問わず、単純に最も近いラダーセンサーを探す
            const distanceToLadder = aiPos.distanceTo(sensorArea.position);
            if (distanceToLadder < minDistance) {
                minDistance = distanceToLadder;
                nearestLadder = sensorArea;
            }
        }
    }
    return nearestLadder;
}

function getAIRooftopClimbChance(ai) {
    // Specified probabilities when holding a non-shotgun weapon:
    // Sniper: 50%, Machinegun: 20%, RocketLauncher: 20%, Pistol: 10%
    // Shotgun and other weapons: 0%
    if (!ai || !ai.currentWeapon) return 0.0;
    const nearbyLadder = findNearbyLadderSensor(ai, 22);
    const nearbyTower = nearbyLadder && isTowerObstacle(nearbyLadder.userData?.obstacle);
    if (nearbyTower) {
        switch (ai.currentWeapon) {
            case WEAPON_SR: return 0.6;
            case WEAPON_MG: return 0.35;
            case WEAPON_RR: return 0.3;
            case WEAPON_PISTOL: return 0.12;
            case WEAPON_SG: return 0.0;
            default: return 0.0;
        }
    }
    switch (ai.currentWeapon) {
        case WEAPON_SR: return 0.45;
        case WEAPON_MG: return 0.25;
        case WEAPON_RR: return 0.22;
        case WEAPON_PISTOL: return 0.1;
        case WEAPON_SG: return 0.0;
        default: return 0.0;
    }
}

function isAIWeaponOutOfAmmo(ai) {
    if (!ai) return false;
    switch (ai.currentWeapon) {
        case WEAPON_MG: return !isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_MG) && ai.ammoMG <= 0;
        case WEAPON_RR: return !isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_RR) && ai.ammoRR <= 0;
        case WEAPON_SR: return !isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SR) && ai.ammoSR <= 0;
        case WEAPON_SG: return !isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SG) && ai.ammoSG <= 0;
        case WEAPON_MR: return !isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_MR) && ai.ammoMR <= 0;
        default: return false;
    }
}

function isEnemyRooftopSlotBusy(requesterAI) {
    for (const other of ais) {
        if (!other || other === requesterAI || other.hp <= 0) continue;
        if (other.team !== 'enemy') continue;
        if (
            other.userData?.rooftopIntent ||
            other.userData?.onRooftop ||
            other.state === 'MOVING_TO_LADDER' ||
            other.state === 'CLIMBING' ||
            other.state === 'ROOFTOP_COMBAT' ||
            other.state === 'DESCENDING'
        ) {
            return true;
        }
    }
    return false;
}

function chooseLadderForAI(ai) {
    if (!ladderSwitches || ladderSwitches.length === 0) return null;
    const targetPos = getClosestOpponentPosition(ai) || player.position.clone();
    let best = null;
    let bestScore = Infinity;
    for (const sensor of ladderSwitches) {
        const ladderPos = sensor.userData?.ladderPos;
        const obstacle = sensor.userData?.obstacle;
        if (!ladderPos || !obstacle) continue;
        const dAI = ai.position.distanceTo(ladderPos);
        const dEnemy = targetPos.distanceTo(obstacle.position);
        const towerBias = isTowerObstacle(obstacle) ? 0.8 : 1.0;
        const score = (dAI * 0.65 + dEnemy * 0.35) * towerBias;
        if (score < bestScore) {
            bestScore = score;
            best = sensor;
        }
    }
    return best;
}

function getObstacleHeight(obstacle) {
    if (!obstacle) return 0;
    const geometry = obstacle.geometry || (obstacle.children && obstacle.children[0] ? obstacle.children[0].geometry : null);
    return geometry && geometry.parameters && geometry.parameters.height ? geometry.parameters.height : 0;
}

function isTowerObstacle(obstacle) {
    if (!obstacle) return false;
    if (obstacle.userData && obstacle.userData.isTower) return true;
    return getObstacleHeight(obstacle) >= DEFAULT_OBSTACLE_HEIGHT * 2.2;
}

function findNearbyLadderSensor(ai, maxDist) {
    if (!ladderSwitches || ladderSwitches.length === 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (const sensor of ladderSwitches) {
        const ladderPos = sensor.userData?.ladderPos || sensor.position;
        if (!ladderPos) continue;
        const d = ai.position.distanceTo(ladderPos);
        if (d < maxDist && d < bestDist) {
            bestDist = d;
            best = sensor;
        }
    }
    return best;
}

function findSafeRooftopLanding(ai, obstacle, ladderPos) {
    if (!ai || !obstacle) return null;
    const geometry = obstacle.geometry || (obstacle.children && obstacle.children[0] ? obstacle.children[0].geometry : null);
    const width = geometry && geometry.parameters && geometry.parameters.width ? geometry.parameters.width : 6;
    const depth = geometry && geometry.parameters && geometry.parameters.depth ? geometry.parameters.depth : 6;
    const height = geometry && geometry.parameters && geometry.parameters.height ? geometry.parameters.height : 4;
    const center = obstacle.position.clone();
    const halfW = Math.max(1.0, width / 2 - 0.7);
    const halfD = Math.max(1.0, depth / 2 - 0.7);
    const roofY = obstacle.position.y + height / 2;
    const dir = center.clone().sub(ladderPos || center);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();

    const candidates = [];
    // Center-first landing to avoid pushing off the rooftop.
    candidates.push(center.clone());
    const base = (ladderPos ? ladderPos.clone() : center.clone()).add(dir.clone().multiplyScalar(0.8));
    base.x = THREE.MathUtils.clamp(base.x, center.x - halfW, center.x + halfW);
    base.z = THREE.MathUtils.clamp(base.z, center.z - halfD, center.z + halfD);
    candidates.push(base);
    candidates.push(center.clone().add(new THREE.Vector3(halfW * 0.35, 0, halfD * 0.35)));
    candidates.push(center.clone().add(new THREE.Vector3(-halfW * 0.35, 0, halfD * 0.35)));
    candidates.push(center.clone().add(new THREE.Vector3(halfW * 0.35, 0, -halfD * 0.35)));
    candidates.push(center.clone().add(new THREE.Vector3(-halfW * 0.35, 0, -halfD * 0.35)));

    const originalPos = ai.position.clone();
    for (const c of candidates) {
        c.y = roofY;
        ai.position.copy(c);
        if (!checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
            return c;
        }
    }
    ai.position.copy(originalPos);
    const fallback = center.clone();
    fallback.y = roofY;
    return fallback;
}

function clampAIToRooftop(ai) {
    if (!ai || !ai.userData || !ai.userData.onRooftop || !ai.userData.rooftopObstacle) return;
    const obstacle = ai.userData.rooftopObstacle;
    const geometry = obstacle.geometry || (obstacle.children && obstacle.children[0] ? obstacle.children[0].geometry : null);
    if (!geometry || !geometry.parameters) return;
    const width = geometry.parameters.width || 6;
    const depth = geometry.parameters.depth || 6;
    const height = geometry.parameters.height || DEFAULT_OBSTACLE_HEIGHT;
    const center = obstacle.position;
    const margin = 0.6;
    const halfW = Math.max(0.5, width / 2 - margin);
    const halfD = Math.max(0.5, depth / 2 - margin);
    ai.position.x = THREE.MathUtils.clamp(ai.position.x, center.x - halfW, center.x + halfW);
    ai.position.z = THREE.MathUtils.clamp(ai.position.z, center.z - halfD, center.z + halfD);
    ai.position.y = center.y + height / 2;
}

function tryAssignAIRooftopGoal(ai, timeElapsed, isFollowLockedTeammate) {
    if (!ai || ai.hp <= 0 || !ai.userData) return false;
    if (ladderSwitches.length === 0) return false;
    if (isFollowLockedTeammate) return false;
    if (ai.userData.onRooftop || ai.userData.rooftopIntent || ai.isElevating) return false;
    if ((ai.userData.rooftopPhase || 'none') !== 'none') return false;
    if (!FORCE_AI_ROOFTOP_TEST) {
        if ((ai.userData.nextRooftopDecisionAt || 0) > timeElapsed) return false;
        ai.userData.nextRooftopDecisionAt = timeElapsed + 0.7 + Math.random() * 0.9;
    }

    if (!FORCE_AI_ROOFTOP_TEST) {
        const chance = getAIRooftopClimbChance(ai);
        if (chance <= 0 || Math.random() >= chance) return false;
    }

    if (!FORCE_AI_ROOFTOP_TEST && ai.team === 'enemy' && isEnemyRooftopSlotBusy(ai)) return false;

    const sensor = chooseLadderForAI(ai);
    if (!sensor) return false;
    const ladderPos = sensor.userData?.ladderPos;
    const obstacle = sensor.userData?.obstacle;
    if (!ladderPos || !obstacle) return false;

    ai.userData.rooftopIntent = true;
    ai.userData.rooftopSensor = sensor;
    ai.userData.rooftopObstacle = obstacle;
    // Move to the sensor area (outside wall), then snap to ladder line when climbing starts.
    ai.userData.rooftopLadderPos = sensor.position.clone();
    ai.userData.rooftopLadderSnap = ladderPos.clone();
    // 空洞建物の場合、床のジオメトリーから高さを取得
    const geometry = obstacle.geometry || (obstacle.children && obstacle.children[0] ? obstacle.children[0].geometry : null);
    const height = geometry ? geometry.parameters.height : 4;
    ai.userData.rooftopTargetY = obstacle.position.y + height / 2;
    ai.userData.rooftopDecisionMade = false;
    ai.userData.nextRooftopDecisionAt = timeElapsed + 4.0;
    ai.userData.rooftopPhase = 'to_ladder';
    ai.userData.rooftopStateSince = timeElapsed;
    ai.state = 'MOVING';
    ai.targetPosition.copy(ai.userData.rooftopLadderPos);
    ai.targetPosition.y = getGroundSurfaceY(ai.targetPosition);
    return true;
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
    const playerPos = getClosestOpponentPosition(ai) || player.position.clone();
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

function getVisibleOpponentInfo(ai) {
    const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
    const opponents = getOpponentTargetsForAI(ai);
    let best = null;
    for (const t of opponents) {
        const dist = ai.position.distanceTo(t === player ? player.position : t.position);
        if (t === player) {
            const pHead = getPlayerHeadPos();
            const pUpper = getPlayerUpperTorsoPos();
            const pBody = getPlayerBodyPos();
            let targetPos = null;
            if (checkLineOfSight(aiHeadPos, pHead, obstacles)) targetPos = pHead;
            else if (checkLineOfSight(aiHeadPos, pUpper, obstacles)) targetPos = pUpper;
            else if (checkLineOfSight(aiHeadPos, pBody, obstacles)) targetPos = pBody;
            if (targetPos && (!best || dist < best.distance)) best = { target: t, targetPos, distance: dist };
        } else {
            const tUpper = getAIUpperTorsoPos(t);
            const tLower = getAILowerTorsoPos(t);
            let targetPos = null;
            if (checkLineOfSight(aiHeadPos, tUpper, obstacles)) targetPos = tUpper;
            else if (checkLineOfSight(aiHeadPos, tLower, obstacles)) targetPos = tLower;
            if (targetPos && (!best || dist < best.distance)) best = { target: t, targetPos, distance: dist };
        }
    }
    return best;
}

function findSmartCoverPosition(ai, threatPos) {
    if (!threatPos) return null;
    let best = null;
    let bestScore = Infinity;
    const aiPos = ai.position.clone();
    for (const obs of obstacles) {
        // 空洞建物の場合、床のジオメトリーから高さを取得
        const geometry = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
        if (!geometry || !geometry.parameters || obs.userData.isRooftop) continue;
        const box = new THREE.Box3().setFromObject(obs);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.z) * 0.6 + 1.0;
        const away = center.clone().sub(threatPos).setY(0);
        if (away.lengthSq() < 1e-6) continue;
        away.normalize();
        const candidate = center.clone().add(away.multiplyScalar(radius));
        candidate.y = getGroundSurfaceY(candidate);
        const d = candidate.distanceTo(aiPos);
        if (d > 22) continue;

        const candidateEye = candidate.clone().add(new THREE.Vector3(0, 1.2, 0));
        const threatEye = threatPos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const blocked = !checkLineOfSight(threatEye, candidateEye, obstacles);
        if (!blocked) continue;

        const oldPos = ai.position.clone();
        ai.position.copy(candidate);
        const collides = checkCollision(ai, obstacles, obs);
        ai.position.copy(oldPos);
        if (collides) continue;

        const score = d + center.distanceTo(aiPos) * 0.35;
        if (score < bestScore) {
            bestScore = score;
            best = candidate;
        }
    }
    return best;
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
    const now = clock.getElapsedTime();
    const preferredSide = (ai.userData && ai.userData.lastAvoidSide) ? -ai.userData.lastAvoidSide : (Math.random() > 0.5 ? 1 : -1);
    const sides = preferredSide > 0
        ? [perpendicularDirectionLeft, perpendicularDirectionRight]
        : [perpendicularDirectionRight, perpendicularDirectionLeft];
    const sideSigns = preferredSide > 0 ? [1, -1] : [-1, 1];
    const sideDistance = AVOIDANCE_RAY_DISTANCE * 2.2;
    const forwardDistance = AVOIDANCE_RAY_DISTANCE * 1.4;
    const aiHeadPos = currentAIPos.clone().add(new THREE.Vector3(0, 1.0, 0));
    let bestCandidate = null;
    let bestScore = Infinity;

    for (let i = 0; i < sides.length; i++) {
        const sideDir = sides[i];
        const candidate = currentAIPos.clone()
            .add(sideDir.clone().multiplyScalar(sideDistance))
            .add(currentMoveDirection.clone().multiplyScalar(forwardDistance));
        candidate.y = 0;

        const candidateHeadPos = candidate.clone().add(new THREE.Vector3(0, 1.0, 0));
        if (!checkLineOfSight(aiHeadPos, candidateHeadPos, obstacles)) continue;

        const score = candidate.distanceTo(originalTargetPosition);
        if (score < bestScore) {
            bestScore = score;
            bestCandidate = { pos: candidate, side: sideSigns[i] };
        }
    }

    if (!bestCandidate) {
        const fallbackSide = sides[0];
        bestCandidate = {
            pos: currentAIPos.clone().add(fallbackSide.multiplyScalar(sideDistance)),
            side: sideSigns[0]
        };
        bestCandidate.pos.y = 0;
    }

    ai.avoiding = true;
    ai.targetPosition.copy(bestCandidate.pos);
    ai.userData.lastAvoidSide = bestCandidate.side;
    ai.userData.avoidUntil = now + 0.45;
}

function findAndTargetWeapon(ai) {
    // 全AIが武器をより積極的に拾う
    const isTeammate = (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.team === 'player';
    const isFollowTeammate = isTeammate && isFollowingPlayerMode && ai.userData && ai.userData.followActive !== false;
    const lowAmmo = isTeammate
        ? ((ai.currentWeapon === WEAPON_MG && ai.ammoMG < 30)
            || (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 3)
            || (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 3)
            || (ai.currentWeapon === WEAPON_SG && ai.ammoSG < 4)
            || (ai.currentWeapon === WEAPON_MR && ai.ammoMR < 4))
        : ((ai.currentWeapon === WEAPON_MG && ai.ammoMG < 12)
            || (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 2)
            || (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 2)
            || (ai.currentWeapon === WEAPON_SG && ai.ammoSG < 2)
            || (ai.currentWeapon === WEAPON_MR && ai.ammoMR < 2));
    const aggressivePickup = ai.currentWeapon === WEAPON_PISTOL || lowAmmo || Math.random() < 0.25;
    const needsUpgrade = weaponPickups.length > 0 && (isFollowTeammate || aggressivePickup);
    if (!needsUpgrade || ai.targetWeaponPickup) {
        return false;
    }
    let bestVisiblePickup = null;
    let minVisibleDistance = Infinity;
    let bestAnyPickup = null;
    let minAnyDistance = Infinity;
    const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
    for (const pickup of weaponPickups) {
        const distance = ai.position.distanceTo(pickup.position);
        if (distance < minAnyDistance) {
            minAnyDistance = distance;
            bestAnyPickup = pickup;
        }
        if (checkLineOfSight(aiHeadPos, pickup.position, obstacles) && distance < minVisibleDistance) {
            minVisibleDistance = distance;
            bestVisiblePickup = pickup;
        }
    }
    const bestPickup = bestVisiblePickup || bestAnyPickup;
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
const MAX_PROJECTILES = 180;
const ROCKET_EXPLOSION_RADIUS = 5;
const BARREL_EXPLOSION_RADIUS = ROCKET_EXPLOSION_RADIUS * 1.5;

function createProjectile(startPos, direction, color, size = 0.1, isRocket = false, source = 'unknown', speed = projectileSpeed, isSniper = false, weaponType = null, shooter = null) {
    if (projectiles.length >= MAX_PROJECTILES) {
        return;
    }
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
    projectiles.push({ mesh: bullet, velocity: velocity, isRocket: isRocket, source: source, isSniper: isSniper, weaponType: weaponType, life: projectileLife, shooter: shooter });
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
        disposeMaterial(explosionMesh.material); // 安全なマテリアル破棄を使用
    }).start();
    for (let i = 0; i < 5; i++) {
        createSmokeEffect(position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 10)));
    }
}

function immediateRooftopCleanup() {
    debugLog('Performing safe rooftop cleanup...');
    let removedCount = 0;
    
    // より安全なクリーンアップ：obstacles配列をベースに処理
    const objectsToRemove = [];
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];
        if (!obj) continue;
        
        // 屋根パーツのみを対象にする
        if (obj.userData.isRooftop || obj.userData.isHouseRoof) {
            // obstacles配列に含まれるが、親が存在しない孤立オブジェクトを削除
            if (!obj.parent || obj.parent === scene) {
                objectsToRemove.push(obj);
            }
        }
    }
    
    // オブジェクトを削除
    for (const obj of objectsToRemove) {
        scene.remove(obj);
        const index = obstacles.indexOf(obj);
        if (index > -1) {
            obstacles.splice(index, 1);
        }
        if (obj.geometry) obj.geometry.dispose();
        disposeMaterial(obj.material); // 安全なマテリアル破棄を使用
        removedCount++;
    }
    
    debugLog(`Safe cleanup removed ${removedCount} rooftop parts`);
    return removedCount;
}

// 建築物専用強制クリーンアップ関数
function forceBuildingCleanup() {
    debugLog('FORCING BUILDING CLEANUP - removing all ungrouped building remnants...');
    let removedCount = 0;
    
    // シーンからすべての建築物を検索して削除
    const objectsToRemove = [];
    scene.traverse(child => {
        // 建築物の条件をチェック
        if (child.isMesh && (
            child.userData.isHollow ||
            child.userData.type === 'hollow_obstacle' ||
            child.userData.type === 'floor' ||
            child.userData.type === 'ceiling' ||
            (child.userData.isWall && !child.userData.isHouseWall) // 家の壁ではない一般の壁
        )) {
            debugLog('Found building remnant:', child.name || 'unnamed', 'type:', child.userData.type, 'position:', child.position);
            objectsToRemove.push(child);
        }
        
        // グループ内もチェック
        if (child.isObject3D && child.children && child.children.length > 0) {
            child.children.forEach(grandchild => {
                if (grandchild.isMesh && (
                    grandchild.userData.isHollow ||
                    grandchild.userData.type === 'hollow_obstacle' ||
                    grandchild.userData.type === 'floor' ||
                    grandchild.userData.type === 'ceiling' ||
                    (grandchild.userData.isWall && !grandchild.userData.isHouseWall)
                )) {
                    debugLog('Found building in group:', grandchild.name || 'unnamed', 'type:', grandchild.userData.type, 'parent:', child.name || 'group');
                    objectsToRemove.push(grandchild);
                }
            });
        }
    });
    
    // 建築物を削除
    for (const building of objectsToRemove) {
        scene.remove(building);
        if (building.parent) {
            building.parent.remove(building); // 親からも削除
        }
        if (building.geometry) building.geometry.dispose();
        disposeMaterial(building.material);
        removedCount++;
    }
    
    // obstacles配列からも削除
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];
        if (obj.isMesh && (
            obj.userData.isHollow ||
            obj.userData.type === 'hollow_obstacle' ||
            obj.userData.type === 'floor' ||
            obj.userData.type === 'ceiling' ||
            (obj.userData.isWall && !obj.userData.isHouseWall)
        )) {
            obstacles.splice(i, 1);
            debugLog('Removed building from obstacles array');
        }
    }
    
    debugLog(`Building cleanup removed ${removedCount} building remnants`);
    return removedCount;
}

// 屋根専用強制クリーンアップ関数
function forceRoofCleanup() {
    debugLog('FORCING ROOF CLEANUP - removing all roof remnants...');
    let removedCount = 0;
    
    // シーンからすべての屋根を検索して削除
    const objectsToRemove = [];
    scene.traverse(child => {
        // 屋根の条件をチェック（より広範囲に）
        if (child.isMesh && (
            child.userData.isRoof || 
            child.userData.isHouseRoof ||
            child.name === 'roof' ||
            (child.position && child.position.y > 4 && child.geometry && 
             child.geometry.parameters && 
             (child.geometry.parameters.width > 5 || child.geometry.parameters.depth > 5)) // 大きくて高い位置のメッシュ
        )) {
            debugLog('Found roof remnant:', child.name || 'unnamed', 'position:', child.position, 'userData:', child.userData);
            objectsToRemove.push(child);
        }
        
        // 家のグループ内もチェック
        if (child.isObject3D && child.children && child.children.length > 0) {
            child.children.forEach(grandchild => {
                if (grandchild.isMesh && (
                    grandchild.userData.isRoof || 
                    grandchild.userData.isHouseRoof ||
                    grandchild.name === 'roof' ||
                    (grandchild.position && grandchild.position.y > 4 && grandchild.geometry && 
                     grandchild.geometry.parameters && 
                     (grandchild.geometry.parameters.width > 5 || grandchild.geometry.parameters.depth > 5))
                )) {
                    debugLog('Found roof in house group:', grandchild.name || 'unnamed', 'parent:', child.name || 'house', 'position:', grandchild.position);
                    objectsToRemove.push(grandchild);
                }
            });
        }
    });
    
    // 屋根を削除
    for (const roof of objectsToRemove) {
        scene.remove(roof);
        if (roof.parent) {
            roof.parent.remove(roof); // 親からも削除
        }
        if (roof.geometry) roof.geometry.dispose();
        disposeMaterial(roof.material);
        removedCount++;
    }
    
    // obstacles配列からも削除
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];
        if (obj.isMesh && (
            obj.userData.isRoof || 
            obj.userData.isHouseRoof ||
            obj.name === 'roof' ||
            (obj.position && obj.position.y > 4 && obj.geometry && 
             obj.geometry.parameters && 
             (obj.geometry.parameters.width > 5 || obj.geometry.parameters.depth > 5))
        )) {
            obstacles.splice(i, 1);
            debugLog('Removed roof from obstacles array');
        }
    }
    
    debugLog(`Roof cleanup removed ${removedCount} roof remnants`);
    return removedCount;
}

// 家オブジェクト専用の強制クリーンアップ関数
function forceHouseCleanup() {
    debugLog('FORCING HOUSE CLEANUP - removing all house remnants...');
    let removedCount = 0;
    const objectsToRemove = new Set();

    // シーンから家グループ・家パーツを検索
    scene.traverse(child => {
        if (!child) return;

        const isHouseGroup = child.isGroup && child.userData && child.userData.type === 'house';
        const isHousePart = child.isMesh && (child.userData.isHouseWall || child.userData.isHouseRoof);

        let hasHouseAncestor = false;
        if (child.parent) {
            let p = child.parent;
            while (p) {
                if (p.userData && p.userData.type === 'house') {
                    hasHouseAncestor = true;
                    break;
                }
                p = p.parent;
            }
        }

        if (isHouseGroup || isHousePart || (child.isMesh && hasHouseAncestor)) {
            objectsToRemove.add(child);
        }
    });

    // メッシュを先に削除
    for (const obj of objectsToRemove) {
        if (!obj.isMesh) continue;
        if (obj.parent) {
            obj.parent.remove(obj);
        } else {
            scene.remove(obj);
        }
        const index = obstacles.indexOf(obj);
        if (index > -1) {
            obstacles.splice(index, 1);
        }
        if (obj.geometry) obj.geometry.dispose();
        disposeMaterial(obj.material);
        removedCount++;
    }

    // 家グループを最後に削除
    for (const obj of objectsToRemove) {
        if (!obj.isGroup || !obj.userData || obj.userData.type !== 'house') continue;
        if (obj.parent) {
            obj.parent.remove(obj);
        } else {
            scene.remove(obj);
        }
        removedCount++;
    }

    debugLog(`House cleanup removed ${removedCount} house remnants`);
    return removedCount;
}

// 強制シーンリセット関数
function forceSceneReset() {
    debugLog('FORCING COMPLETE SCENE RESET (protecting ground)...');
    
    // 屋根を先にクリーンアップ
    forceRoofCleanup();
    
    // シーンからすべてのメッシュを削除（地面を除く）
    const objectsToRemove = [];
    if (scene && scene.traverse) {
        scene.traverse((child) => {
            if (child && child.isMesh) {
                // 地面は保護
                if (child.userData.isGround) {
                    return;
                }
                objectsToRemove.push(child);
            }
        });
    }
    
    objectsToRemove.forEach(obj => {
        debugLog('Removing object:', obj.name || 'unnamed', 'type:', obj.userData.type, 'position:', obj.position);
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        disposeMaterial(obj.material); // 安全なマテリアル破棄を使用
    });
    
    // obstacles配列から地面以外のオブジェクトを削除
    const remainingObstacles = obstacles.filter(obj => {
        const isGround = obj.userData.isGround || (obj.position && obj.position.y <= 0);
        if (!isGround) {
            debugLog('Removing from obstacles:', obj.userData.type);
        }
        return isGround;
    });
    
    // 配列をクリアして地面のみを再設定
    obstacles.length = 0;
    obstacles.push(...remainingObstacles);
    
    debugLog(`Force reset removed ${objectsToRemove.length} objects (protected ground)`);
}

function cleanupFloatingRooftopParts() {
    let removedCount = 0;
    
    // すべてのマップタイプで屋根をクリーンアップ
    // デフォルトマップかカスタムマップかに関わらず、すべての屋根オブジェクトを削除
    
    // シーン内のすべての子オブジェクトを直接スキャン
    const objectsToRemove = [];
    
    scene.traverse((child) => {
        // Meshオブジェクトのみを処理
        if (child.isMesh) {
            // 地面は保護
            if (child.userData.isGround || child.position && child.position.y <= 0) {
                return; // 地面は削除しない
            }
            
    // 屋根パーツの特徴を持つオブジェクトを検出
    const isRooftopPart = (
        child.userData.isRooftop ||
        child.userData.isHouseRoof ||
        child.userData.parentBuildingRef ||
        (child.material && child.material.color && child.material.color.getHex() === 0x880000) // 赤レンガ色
    );
    
    if (!isRooftopPart) return;

    // Only remove truly orphaned rooftop parts.
    const parentRef = child.userData.parentBuildingRef;
    if (parentRef) {
        const parentAlive = parentRef.parent && obstacles.includes(parentRef);
        if (!parentAlive) {
            objectsToRemove.push(child);
        }
        return;
    }

    // No parent reference: treat as valid by default to avoid deleting active rooftops.
        }
    });
    
    // 削除対象のオブジェクトを一括で削除
    for (const obj of objectsToRemove) {
        scene.remove(obj);
        
        // obstacles配列から削除
        const index = obstacles.indexOf(obj);
        if (index > -1) {
            obstacles.splice(index, 1);
        }
        
        // メモリ解放
        if (obj.geometry) obj.geometry.dispose();
        disposeMaterial(obj.material); // 安全なマテリアル破棄を使用
        
        removedCount++;
    }
    
    if (removedCount > 0) {
        debugLog(`Removed ${removedCount} floating rooftop parts`);
    }
    
    return removedCount;
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
            disposeMaterial(part.material); // 安全なマテリアル破棄を使用
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
            disposeMaterial(sensorArea.material); // 安全なマテリアル破棄を使用
        }
    }
    scene.remove(obstacle);
    const NUM_FRAGMENTS_PER_AXIS = 3;
    // 空洞建物の場合、床のジオメトリーから寸法を取得
    const geometry = obstacle.geometry || (obstacle.children && obstacle.children[0] ? obstacle.children[0].geometry : null);
    const width = geometry ? geometry.parameters.width : 6;
    const height = geometry ? geometry.parameters.height : 4;
    const depth = geometry ? geometry.parameters.depth : 6;
    const fragmentSize = new THREE.Vector3(width / NUM_FRAGMENTS_PER_AXIS, height / NUM_FRAGMENTS_PER_AXIS, depth / NUM_FRAGMENTS_PER_AXIS);
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

function destroyBarrel(barrel, explosionPosition) {
    const barrelIndex = obstacles.indexOf(barrel);
    if (barrelIndex > -1) {
        obstacles.splice(barrelIndex, 1);
    }
    scene.remove(barrel);
    const radius = barrel.userData.radius || 0.75;
    const height = barrel.userData.height || 1.2;
    const fragmentCount = 18;
    const fragmentSize = Math.max(0.1, radius * 0.35);
    const fragmentGeometry = new THREE.BoxGeometry(fragmentSize, fragmentSize, fragmentSize);
    const fragmentMaterial = barrel.material;
    for (let i = 0; i < fragmentCount; i++) {
        const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * radius * 1.6,
            (Math.random() - 0.5) * height,
            (Math.random() - 0.5) * radius * 1.6
        );
        fragment.position.copy(barrel.position).add(offset);
        scene.add(fragment);
        const forceDirection = new THREE.Vector3().subVectors(fragment.position, explosionPosition).normalize();
        const forceMagnitude = 12 + Math.random() * 16;
        const velocity = forceDirection.multiplyScalar(forceMagnitude);
        velocity.y += Math.random() * 8;
        const angularVelocity = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        debris.push({ mesh: fragment, velocity: velocity, angularVelocity: angularVelocity, life: 2 + Math.random() * 2 });
    }
    if (barrel.geometry) barrel.geometry.dispose();
    disposeMaterial(barrel.material);
}

function applyBarrelKillScoring(victimAI, source, shooter) {
    if (source === 'player') {
        if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
            if (victimAI.team === 'enemy') playerTeamKills++;
            if (victimAI.team === 'player') enemyTeamKills++;
        } else if (gameSettings.gameMode === 'ffa' || gameSettings.gameMode === 'arcade') {
            playerKills++;
        }
        return;
    }
    if (source === 'ai' && shooter) {
        if (shooter.kills !== undefined) shooter.kills++;
        if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
            if (shooter.team === 'player' && victimAI.team === 'enemy') playerTeamKills++;
            if (shooter.team === 'enemy' && victimAI.team === 'player') enemyTeamKills++;
        }
    }
}

function explodeBarrel(barrel, source = 'unknown', shooter = null) {
    if (!barrel || (barrel.userData && barrel.userData.exploding)) return;
    if (barrel.userData) barrel.userData.exploding = true;
    const explosionPos = barrel.position.clone();
    if (gameSettings.barrelRespawn) {
        const spawnPos = (barrel.userData && barrel.userData.spawnPos) ? barrel.userData.spawnPos : barrel.position;
        respawningBarrels.push({
            x: spawnPos.x,
            z: spawnPos.z,
            color: barrel.userData?.color ?? 0xe74c3c,
            radius: barrel.userData?.radius ?? 0.75,
            height: barrel.userData?.height ?? 2.4,
            respawnTime: clock.getElapsedTime() + 30
        });
    }
    destroyBarrel(barrel, explosionPos);
    if (explosionSound) playSpatialSound(explosionSound, explosionPos);
    createExplosionEffect(explosionPos);
    const radius = BARREL_EXPLOSION_RADIUS;
    const chainTargets = obstacles.filter(o => o && o.userData && o.userData.type === 'barrel' && !o.userData.exploding && o.position && o.position.distanceTo(explosionPos) < radius);
    chainTargets.forEach(target => explodeBarrel(target, source, shooter));
    for (let j = ais.length - 1; j >= 0; j--) {
        const ai = ais[j];
        if (ai.hp <= 0) continue;
        const distance = ai.position.distanceTo(explosionPos);
        if (distance < radius) {
            const aiCenter = ai.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            if (checkLineOfSight(explosionPos, aiCenter, obstacles)) {
                if (ai.hp !== Infinity) {
                    ai.hp = 0;
                    createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                }
                if (ai.hp <= 0) {
                    applyBarrelKillScoring(ai, source, shooter);
                    aiFallDownCinematicSequence(new THREE.Vector3().subVectors(ai.position, explosionPos), ai, source);
                }
            }
        }
    }
    if (playerHP > 0) {
        const distanceToPlayer = player.position.distanceTo(explosionPos);
        if (distanceToPlayer < radius) {
            const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
            if (checkLineOfSight(explosionPos, playerCenter, obstacles)) {
                if (playerHP !== Infinity) {
                    playerHP = 0;
                    screenShakeDuration = SHAKE_DURATION_MAX;
                    if (redFlashOverlay) {
                        redFlashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                        setTimeout(() => { redFlashOverlay.style.backgroundColor = 'transparent'; }, 100);
                    }
                }
                if (playerHP <= 0 && !isPlayerDeathPlaying) {
                    if (source === 'ai' && shooter && shooter.kills !== undefined) {
                        shooter.kills++;
                        if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                            enemyTeamKills++;
                        }
                    }
                    startPlayerDeathSequence(null);
                }
            }
        }
    }
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
            disposeMaterial(smoke.material); // 安全なマテリアル破棄を使用
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
            disposeMaterial(smoke.material); // 安全なマテリアル破棄を使用
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
        disposeMaterial(particle.material); // 安全なマテリアル破棄を使用
    }).start();
}

function clearAIRocketInFlight(projectile) {
    if (!projectile || !projectile.isRocket || projectile.source !== 'ai') return;
    const shooter = projectile.shooter;
    if (shooter && shooter.userData) shooter.userData.rocketInFlight = false;
}

function getPlayerSafeFireData(direction) {
    const dir = direction.clone().normalize();
    const eyePos = new THREE.Vector3();
    camera.getWorldPosition(eyePos);

    raycaster.set(eyePos, dir);
    raycaster.far = 1.2;
    const wallHits = raycaster.intersectObjects(obstacles, true);

    const minClearance = 0.18;
    if (wallHits.length > 0 && wallHits[0].distance < minClearance) {
        const impact = wallHits[0].point.clone();
        return {
            blocked: true,
            startPosition: eyePos.clone().add(dir.clone().multiplyScalar(0.02)),
            muzzlePosition: impact.clone(),
            impactPoint: impact
        };
    }

    const maxForwardOffset = 0.55;
    const safeForwardOffset = wallHits.length > 0
        ? Math.max(0.08, Math.min(maxForwardOffset, wallHits[0].distance - 0.08))
        : maxForwardOffset;

    const startPosition = eyePos.clone().add(dir.clone().multiplyScalar(safeForwardOffset));
    const muzzlePosition = startPosition.clone().add(dir.clone().multiplyScalar(0.18));
    return { blocked: false, startPosition, muzzlePosition, impactPoint: null };
}

function getAISafeFireData(startPos, direction) {
    const dir = direction.clone().normalize();
    raycaster.set(startPos, dir);
    raycaster.far = 2.0; // 適切な距離で壁を検出するように増加
    const wallHits = raycaster.intersectObjects(obstacles, true);
    
    if (wallHits.length > 0) {
        const hitObject = wallHits[0].object;
        
        // AIが塔の内部にいる場合、その塔自体との衝突は無視する
        // ただし、他の障害物や他の塔とは衝突する
        let shouldIgnore = false;
        for (const ai of ais) {
            // AIの位置から最も近い塔を探す
            if (ai.position && hitObject.userData.type === 'tower') {
                const aiToTowerDist = ai.position.distanceTo(hitObject.position);
                const towerSize = 6; // 塔の幅は6
                if (aiToTowerDist < towerSize / 2) {
                    // AIが塔の内部にいる場合、この塔との衝突を無視
                    shouldIgnore = true;
                    break;
                }
            }
        }
        
        if (!shouldIgnore) {
            return { blocked: true, impactPoint: wallHits[0].point.clone() };
        }
    }
    return { blocked: false, impactPoint: null };
}

function handleFirePress() {
    if (!isGameRunning || playerHP <= 0) return;
    if (currentWeapon === WEAPON_SR) {
        if ((ammoSR > 0 || isInfiniteDefaultWeaponActive(WEAPON_SR)) && !isScoping) {
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
        shoot(); // MGも含めて全武器でshoot()を呼ぶ
    }
}

function cancelScope() {

    isScoping = false;
    sniperAutoAimLockedAI = null;
    sniperAutoAimSmoothedPoint = null;
    scopeOverlay.style.display = 'none';
    cancelScopeButton.style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('night-vision-overlay').style.display = 'none';
    new TWEEN.Tween(camera).to({ fov: 75 }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
}

function setRifleZoom(enabled) {
    if (isScoping) return;
    if (isRifleZoomed === enabled) return;
    isRifleZoomed = enabled;
    const targetFov = enabled ? MR_ZOOM_FOV : 75;
    new TWEEN.Tween(camera).to({ fov: targetFov }, 100).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => camera.updateProjectionMatrix()).start();
}

function handleFireRelease() {
    if (!isGameRunning) return;
    if (isScoping) {
        document.getElementById('night-vision-overlay').style.display = 'none';
        const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
        if ((ammoSR > 0 || isInfiniteDefaultWeaponActive(WEAPON_SR)) && timeSinceLastFire > FIRE_RATE_SR) {
            if (srGunSound) playSound(srGunSound);
            let direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            const safeFire = getPlayerSafeFireData(direction);
            createMuzzleFlash(safeFire.muzzlePosition, 120, 2.7, 120, 0xffff00);
            if (safeFire.blocked) {
                createSmokeEffect(safeFire.impactPoint || safeFire.muzzlePosition);
            } else {
                createProjectile(safeFire.startPosition, direction, 0xffff00, 0.1, false, 'player', projectileSpeed * 2, true);
            }
            lastFireTime = clock.getElapsedTime();
            if (!isInfiniteDefaultWeaponActive(WEAPON_SR) && --ammoSR === 0) {
                setTimeout(() => {
                    switchPlayerToFallbackWeapon();
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
    const now = clock.getElapsedTime();
    if (playerMGReloadUntil > 0 && now >= playerMGReloadUntil) {
        playerMGReloadUntil = 0;
        ammoMG = MAX_AMMO_MG;
        hideReloadingText();
    }
    if (playerMRReloadUntil > 0 && now >= playerMRReloadUntil) {
        playerMRReloadUntil = 0;
        const nextClip = isDefaultM1Weapon() ? MAX_AMMO_MR : Math.min(MAX_AMMO_MR, ammoMR);
        setPlayerMRClipAmmo(nextClip);
        hideReloadingText();
    }
    let canFire = false;
    let projectileColor = 0xffff00;
    let projectileSize = 0.1;
    let fireRate = FIRE_RATE_PISTOL;
    let projectileSpeedOverride = projectileSpeed;
    let weaponType = null;
    let isSniperShot = false;
    switch (currentWeapon) {
        case WEAPON_PISTOL: canFire = true; fireRate = FIRE_RATE_PISTOL; break;
        case WEAPON_MG:
            if (gameSettings.defaultWeapon === WEAPON_MG && now < playerMGReloadUntil) {
                canFire = false;
                break;
            }
            if (ammoMG > 0 || isInfiniteDefaultWeaponActive(WEAPON_MG)) {
                canFire = true;
                projectileColor = 0xffff00;
                fireRate = FIRE_RATE_MG;
            }
            break;
        case WEAPON_RR: if (ammoRR > 0 || isInfiniteDefaultWeaponActive(WEAPON_RR)) { canFire = true; projectileColor = 0xff8c00; projectileSize = 0.5; fireRate = FIRE_RATE_RR; } break;
        case WEAPON_SG: if (ammoSG > 0 || isInfiniteDefaultWeaponActive(WEAPON_SG)) { canFire = true; projectileColor = 0xffa500; projectileSize = 0.05; fireRate = FIRE_RATE_SG; } break;
        case WEAPON_MR:
            if (playerMRReloadUntil > 0 && now < playerMRReloadUntil) {
                canFire = false;
                break;
            }
            if (getPlayerMRClipAmmo() > 0) {
                canFire = true;
                projectileColor = 0xffff00;
                fireRate = FIRE_RATE_MR;
                projectileSpeedOverride = projectileSpeed * MR_PROJECTILE_SPEED_MULT;
                weaponType = WEAPON_MR;
            }
            break;
    }
    const timeSinceLastFire = now - lastFireTime;
    if (canFire && timeSinceLastFire > fireRate) {
        let soundToPlay = playerGunSound;
        if (currentWeapon === WEAPON_MG) soundToPlay = mgGunSound;
        else if (currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (currentWeapon === WEAPON_SG) soundToPlay = playerSgSound;
        else if (currentWeapon === WEAPON_MR) soundToPlay = m1GunSound;
        if (soundToPlay) playSound(soundToPlay);
        let baseDirection = new THREE.Vector3();
        camera.getWorldDirection(baseDirection);
        const safeFire = getPlayerSafeFireData(baseDirection);
        createMuzzleFlash(safeFire.muzzlePosition, 100, 2.2, 100, 0xffff00);
        // Legacy global auto-aim removed.
        // Auto-aim now works only for scoped sniper by moving the scope in animate().
        if (safeFire.blocked) {
            createSmokeEffect(safeFire.impactPoint || safeFire.muzzlePosition);
        } else if (currentWeapon === WEAPON_SG) {
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
                createProjectile(safeFire.startPosition, spreadDirection, projectileColor, projectileSize, false, 'player', projectileSpeed, false, WEAPON_SG);
            }
        } else {
            createProjectile(safeFire.startPosition, baseDirection, projectileColor, projectileSize, currentWeapon === WEAPON_RR, 'player', projectileSpeedOverride, isSniperShot, weaponType);
        }
        lastFireTime = now;
        if (currentWeapon === WEAPON_MG) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_MG) && --ammoMG === 0) {
                ammoMG = 0;
                if (gameSettings.defaultWeapon === WEAPON_MG) {
                    // デフォルトMGのみリロード
                    playerMGReloadUntil = now + 2.0;
                    showReloadingText();
                } else {
                    // 拾ったMGは弾切れで即フォールバックへ
                    playerMGReloadUntil = 0;
                    hideReloadingText();
                    switchPlayerToFallbackWeapon();
                }
            }
        } else if (currentWeapon === WEAPON_RR) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_RR) && --ammoRR === 0) switchPlayerToFallbackWeapon();
        } else if (currentWeapon === WEAPON_SG) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_SG) && --ammoSG === 0) switchPlayerToFallbackWeapon();
        } else if (currentWeapon === WEAPON_MR) {
            if (isDefaultM1Weapon()) {
                const nextClip = getPlayerMRClipAmmo() - 1;
                setPlayerMRClipAmmo(nextClip);
                if (nextClip <= 0) {
                    if (clipSound) playSound(clipSound);
                    playerMRReloadUntil = now + 2.0;
                    showReloadingText();
                }
            } else {
                ammoMR = Math.max(0, ammoMR - 1);
                ammoMRClip = Math.max(0, ammoMRClip - 1);
                if (ammoMRClip <= 0) {
                    if (clipSound) playSound(clipSound);
                    if (ammoMR > 0) {
                        playerMRReloadUntil = now + 2.0;
                        showReloadingText();
                    } else {
                        switchPlayerToFallbackWeapon();
                    }
                }
            }
        }
    }
}

function aiShoot(ai, timeElapsed) {
    if (!isGameRunning) return;
    if (ai && ai.userData && ai.userData.mgReloadUntil && timeElapsed >= ai.userData.mgReloadUntil) {
        ai.userData.mgReloadUntil = 0;
        ai.ammoMG = MAX_AMMO_MG;
    }
    if (ai && ai.userData && ai.userData.mrReloadUntil && timeElapsed >= ai.userData.mrReloadUntil) {
        ai.userData.mrReloadUntil = 0;
        const nextClip = isAIDefaultM1Weapon(ai) ? MAX_AMMO_MR : Math.min(MAX_AMMO_MR, ai.ammoMR);
        setAIClipAmmo(ai, nextClip);
    }
    let startPosition = ai.position.clone().add(new THREE.Vector3(0, ai.isCrouching ? BODY_HEIGHT * 0.75 * 0.5 : BODY_HEIGHT * 0.75, 0));
    const aimOrigin = ai.position.clone().add(new THREE.Vector3(0, ai.isCrouching ? BODY_HEIGHT * 0.65 : BODY_HEIGHT * 0.9, 0));
    const muzzleInfo = (ai.userData && ai.userData.parts) ? getGunMuzzleInfo(ai.userData.parts) : null;
    let muzzleDirection = muzzleInfo ? muzzleInfo.direction.clone().normalize() : null;
    let targetIsPlayer = false;
    if (muzzleInfo) {
        startPosition = muzzleInfo.position.clone();
    }
    
    let targetPosition = null;
    let distanceToTarget = 0;
    
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';

    // チームモードまたはチームアーケードモードの場合
    if (isTeamModeOrTeamArcade && ai.team === 'player') {
        // 最も近い敵AIを探す
        let closestEnemyAI = null;
        let closestDistance = Infinity;
        for (const enemyAI of ais) {
            if (enemyAI === ai || enemyAI.team !== 'enemy' || enemyAI.hp <= 0) continue;
            const distance = ai.position.distanceTo(enemyAI.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemyAI = enemyAI;
            }
        }
        if (closestEnemyAI) {
            const enemyHeadPos = getAIUpperTorsoPos(closestEnemyAI);
            const enemyBodyPos = getAILowerTorsoPos(closestEnemyAI);
            if (checkLineOfSight(startPosition, enemyHeadPos, obstacles)) {
                targetPosition = enemyHeadPos;
            } else if (checkLineOfSight(startPosition, enemyBodyPos, obstacles)) {
                targetPosition = enemyBodyPos;
            }
            distanceToTarget = closestDistance;
        }
    } else if (isTeamModeOrTeamArcade && ai.team === 'enemy') {
        // 敵AIはプレイヤーと味方AIを状況で選ぶ（味方AI寄り）
        const targets = [];
        
        // プレイヤーをターゲット候補に追加
        const playerHeadPos = getPlayerHeadPos();
        const playerUpperPos = getPlayerUpperTorsoPos();
        const playerBodyPos = getPlayerBodyPos();
        if (playerHP > 0) {
            if (checkLineOfSight(aimOrigin, playerHeadPos, obstacles)) {
                targets.push({ position: playerHeadPos, distance: ai.position.distanceTo(player.position), type: 'player' });
            } else if (checkLineOfSight(aimOrigin, playerUpperPos, obstacles)) {
                targets.push({ position: playerUpperPos, distance: ai.position.distanceTo(player.position), type: 'player' });
            } else if (checkLineOfSight(aimOrigin, playerBodyPos, obstacles)) {
                targets.push({ position: playerBodyPos, distance: ai.position.distanceTo(player.position), type: 'player' });
            }
        }
        
        // 味方AIをターゲット候補に追加
        for (const teammateAI of ais) {
            if (teammateAI === ai || teammateAI.team !== 'player' || teammateAI.hp <= 0) continue;
            const teammateHeadPos = getAIUpperTorsoPos(teammateAI);
            const teammateBodyPos = getAILowerTorsoPos(teammateAI);
            const distance = ai.position.distanceTo(teammateAI.position);
            if (checkLineOfSight(startPosition, teammateHeadPos, obstacles)) {
                targets.push({ position: teammateHeadPos, distance: distance, type: 'teammate' });
            } else if (checkLineOfSight(startPosition, teammateBodyPos, obstacles)) {
                targets.push({ position: teammateBodyPos, distance: distance, type: 'teammate' });
            }
        }
        
        // ターゲット選択:
        // - 味方AIが見えているなら高確率でそちらを優先
        // - いなければ最寄りターゲット
        if (targets.length > 0) {
            targets.sort((a, b) => a.distance - b.distance);
            const teammateTargets = targets.filter(t => t.type === 'teammate');
            let selectedTarget = targets[0];
            if (teammateTargets.length > 0 && Math.random() < 0.75) {
                selectedTarget = teammateTargets[0];
            }
            targetPosition = selectedTarget.position;
            distanceToTarget = selectedTarget.distance;
            targetIsPlayer = selectedTarget.type === 'player';
        }
    } else if (gameSettings.gameMode === 'ffa') {
        const potentialTargets = [];
        // プレイヤーをターゲット候補に追加
        if (playerHP > 0) {
            const playerHeadPos = getPlayerHeadPos();
            const playerUpperPos = getPlayerUpperTorsoPos();
            const playerBodyPos = getPlayerBodyPos();
            if (checkLineOfSight(aimOrigin, playerHeadPos, obstacles)) {
                potentialTargets.push({ target: player, position: playerHeadPos, distance: ai.position.distanceTo(player.position) });
            } else if (checkLineOfSight(aimOrigin, playerUpperPos, obstacles)) {
                potentialTargets.push({ target: player, position: playerUpperPos, distance: ai.position.distanceTo(player.position) });
            } else if (checkLineOfSight(aimOrigin, playerBodyPos, obstacles)) {
                potentialTargets.push({ target: player, position: playerBodyPos, distance: ai.position.distanceTo(player.position) });
            }
        }
        // 他のAIをターゲット候補に追加
        for (const otherAI of ais) {
            if (otherAI === ai || otherAI.hp <= 0) continue;
            const otherAIHeadPos = getAIUpperTorsoPos(otherAI);
            const otherAIBodyPos = getAILowerTorsoPos(otherAI);
            if (checkLineOfSight(startPosition, otherAIHeadPos, obstacles)) {
                potentialTargets.push({ target: otherAI, position: otherAIHeadPos, distance: ai.position.distanceTo(otherAI.position) });
            } else if (checkLineOfSight(startPosition, otherAIBodyPos, obstacles)) {
                potentialTargets.push({ target: otherAI, position: otherAIBodyPos, distance: ai.position.distanceTo(otherAI.position) });
            }
        }

        if (potentialTargets.length > 0) {
            // 最も近いターゲットを選択
            potentialTargets.sort((a, b) => a.distance - b.distance);
            const closestTarget = potentialTargets[0];
            targetPosition = closestTarget.position;
            distanceToTarget = closestTarget.distance;
            targetIsPlayer = closestTarget.target === player;
        }
    } else {
        // 通常モードまたは敵AIはプレイヤーを狙う
        const playerHeadPos = getPlayerHeadPos();
        const playerUpperPos = getPlayerUpperTorsoPos();
        const playerBodyPos = getPlayerBodyPos();
        if (checkLineOfSight(aimOrigin, playerHeadPos, obstacles)) {
            targetPosition = playerHeadPos;
        } else if (checkLineOfSight(aimOrigin, playerUpperPos, obstacles)) {
            targetPosition = playerUpperPos;
        } else if (checkLineOfSight(aimOrigin, playerBodyPos, obstacles)) {
            targetPosition = playerBodyPos;
        }
        distanceToTarget = ai.position.distanceTo(player.position);
        targetIsPlayer = true;
    }
    
    if (targetPosition === null) return;
    // Strict rule: do not fire if obstacle blocks muzzle -> target.
    if (!checkLineOfSight(startPosition, targetPosition, obstacles)) {
        return;
    }
    // Re-aim right before firing so muzzle direction matches the intended target.
    let desiredYaw = Math.atan2(targetPosition.x - ai.position.x, targetPosition.z - ai.position.z);
    if (ai.userData && ai.userData.parts) {
        ai.rotation.y = desiredYaw;
        applyAimConstraints(ai.userData.parts, ai.rotation.y, targetPosition);
        const freshMuzzleInfo = getGunMuzzleInfo(ai.userData.parts);
        if (freshMuzzleInfo) {
            startPosition = freshMuzzleInfo.position.clone();
            muzzleDirection = freshMuzzleInfo.direction.clone().normalize();
        }
    }
    // Recheck LOS after final pose/muzzle update (prevents wall-through on AI-vs-AI).
    if (!checkLineOfSight(startPosition, targetPosition, obstacles)) {
        return;
    }

    const toTarget = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
    let direction = toTarget.clone();
    const distanceToPlayer = distanceToTarget;
    // 物理整合性優先: 銃口方向とターゲット方向が極端にズレる場合のみ発砲しない
    if (muzzleDirection) {
        const muzzleToTargetAngle = muzzleDirection.angleTo(toTarget);
        if (muzzleToTargetAngle > THREE.MathUtils.degToRad(45)) return;
    }
    direction.normalize();
    let canAIShoot = false;
    let aiProjectileColor = 0xffff00;
    let aiProjectileSize = 0.1;
    let aiFireRate = FIRING_RATE;
    let aiProjectileSpeed = projectileSpeed;
    switch (ai.currentWeapon) {
        case WEAPON_PISTOL: canAIShoot = true; aiFireRate = FIRING_RATE * (4.0 - ai.aggression * 3.0); break;
        case WEAPON_MG:
            if (ai.userData && ai.userData.mgReloadUntil && timeElapsed < ai.userData.mgReloadUntil) {
                canAIShoot = false;
                break;
            }
            if (ai.ammoMG > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_MG)) {
                canAIShoot = true;
                aiFireRate = FIRING_RATE * (0.5 + (1.0 - (ai.aggression || 0.5)) * 0.5);
            }
            break;
        case WEAPON_RR:
            if (ai.userData && ai.userData.rocketInFlight) {
                canAIShoot = false;
                break;
            }
            if (ai.ammoRR > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_RR)) {
                canAIShoot = true;
                aiFireRate = FIRING_RATE * (5.0 - ai.aggression * 3.0);
                aiProjectileSize = 0.5;
                aiProjectileColor = 0xff8c00;
            }
            break;
        case WEAPON_SR: if (ai.ammoSR > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SR)) { canAIShoot = true; aiFireRate = FIRE_RATE_SR * (1.0 + (1.0 - ai.aggression) * 0.5); aiProjectileColor = 0xffff00; aiProjectileSpeed = projectileSpeed * 2; } break;
        case WEAPON_SG: if (ai.ammoSG > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SG)) { canAIShoot = true; aiFireRate = FIRE_RATE_SG; aiProjectileColor = 0xffa500; aiProjectileSize = 0.05; if (distanceToPlayer < SHOTGUN_RANGE * 1.5) { aiFireRate /= (1 + ai.aggression); } } break;
        case WEAPON_MR:
            if (ai.userData && ai.userData.mrReloadUntil && timeElapsed < ai.userData.mrReloadUntil) {
                canAIShoot = false;
                break;
            }
            if (getAIClipAmmo(ai) > 0) {
                canAIShoot = true;
                aiFireRate = FIRE_RATE_MR;
                aiProjectileColor = 0xffff00;
                aiProjectileSpeed = projectileSpeed * MR_PROJECTILE_SPEED_MULT;
            }
            break;
    }
    if (isTeamModeOrTeamArcade && ai.team === 'player' && ai.currentWeapon !== WEAPON_MG) {
        // 味方AIはやや高頻度で攻撃（ただしMGは敵と同じレートにするため除外）
        aiFireRate *= 0.7;
    }
    if (timeElapsed - ai.lastAttackTime < aiFireRate) return;
    if (canAIShoot) {
        const safeAIShot = getAISafeFireData(startPosition, direction);
        if (safeAIShot.blocked) {
            createSmokeEffect(safeAIShot.impactPoint || startPosition);
            ai.lastAttackTime = timeElapsed;
            return;
        }
        let soundToPlay;
        if (ai.currentWeapon === WEAPON_MG) soundToPlay = aimgGunSound;
        else if (ai.currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (ai.currentWeapon === WEAPON_SR) soundToPlay = aiSrGunSound;
        else if (ai.currentWeapon === WEAPON_SG) soundToPlay = aiSgSound;
        else if (ai.currentWeapon === WEAPON_MR) soundToPlay = aiM1GunSound;
        else soundToPlay = aiGunSound;
        if (soundToPlay) playSpatialSound(soundToPlay, startPosition, { gainBoost: 1.3 });
    if (window.DEBUG_SPATIAL_AUDIO && soundToPlay) {
        console.log('[aiShoot] sound', soundToPlay.id || soundToPlay.src);
    }
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
            disposeMaterial(spark.material); // 安全なマテリアル破棄を使用
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
                createProjectile(startPosition, spreadDirection, aiProjectileColor, aiProjectileSize, false, 'ai', aiProjectileSpeed, false, WEAPON_SG, ai);
            }
        } else {
            const aiWeaponType = ai.currentWeapon === WEAPON_MR ? WEAPON_MR : null;
            if (ai.currentWeapon === WEAPON_RR && ai.userData) {
                ai.userData.rocketInFlight = true;
            }
            createProjectile(startPosition, direction, aiProjectileColor, aiProjectileSize, ai.currentWeapon === WEAPON_RR, 'ai', aiProjectileSpeed, ai.currentWeapon === WEAPON_SR, aiWeaponType, ai);
        }
        ai.lastAttackTime = timeElapsed;
        if (ai.currentWeapon === WEAPON_MG) {
            if (!isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_MG) && --ai.ammoMG === 0) {
                ai.ammoMG = 0;
                if (ai.userData) ai.userData.mgReloadUntil = timeElapsed + 2.0;
                switchAIToFallbackWeapon(ai);
            }
        } else if (ai.currentWeapon === WEAPON_RR) {
            if (!isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_RR) && --ai.ammoRR === 0) switchAIToFallbackWeapon(ai);
        } else if (ai.currentWeapon === WEAPON_SR) {
            if (!isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SR) && --ai.ammoSR === 0) switchAIToFallbackWeapon(ai);
        } else if (ai.currentWeapon === WEAPON_SG) {
            if (!isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SG) && --ai.ammoSG === 0) switchAIToFallbackWeapon(ai);
        } else if (ai.currentWeapon === WEAPON_MR) {
            if (isAIDefaultM1Weapon(ai)) {
                const nextClip = getAIClipAmmo(ai) - 1;
                setAIClipAmmo(ai, nextClip);
                if (nextClip <= 0) {
                    if (ai.userData) ai.userData.mrReloadUntil = timeElapsed + 2.0;
                }
            } else {
                ai.ammoMR = Math.max(0, ai.ammoMR - 1);
                setAIClipAmmo(ai, getAIClipAmmo(ai) - 1);
                if (getAIClipAmmo(ai) <= 0) {
                    if (ai.ammoMR > 0) {
                        if (ai.userData) ai.userData.mrReloadUntil = timeElapsed + 2.0;
                    } else {
                        switchAIToFallbackWeapon(ai);
                    }
                }
            }
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
                case WEAPON_MR: {
                    const isDefaultM1 = isAIDefaultM1Weapon(ai);
                    const wasUsingM1 = ai.currentWeapon === WEAPON_MR;
                    ai.currentWeapon = WEAPON_MR;
                    if (!isDefaultM1) {
                        ai.ammoMR += PICKUP_AMMO_MR;
                        if (!wasUsingM1) {
                            setAIClipAmmo(ai, Math.min(MAX_AMMO_MR, ai.ammoMR));
                        } else if (getAIClipAmmo(ai) <= 0 && !(ai.userData && ai.userData.mrReloadUntil)) {
                            setAIClipAmmo(ai, Math.min(MAX_AMMO_MR, ai.ammoMR));
                        }
                    }
                    break;
                }
            }
            scene.remove(pickup);
            weaponPickups.splice(i, 1);
            respawningPickups.push({ type: 'weapon', weaponType: pickup.userData.weaponType, respawnTime: clock.getElapsedTime() + RESPAWN_DELAY });
            if (ai.targetWeaponPickup === pickup) {
                ai.targetWeaponPickup = null;
                // 味方AIで追従モードONの場合、ai.stateを変更しない
                if (!((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.team === 'player' && isFollowingPlayerMode)) {
                    if ((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.team === 'player') {
                        ai.state = 'ATTACKING';
                        ai.currentAttackTime = clock.getElapsedTime();
                        ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                    } else {
                        ai.state = 'HIDING';
                        ai.lastHiddenTime = clock.getElapsedTime();
                    }
                }
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
    const joystickZone = document.getElementById('joystick-move');
    const moveManager = nipplejs.create({
        zone: joystickZone,
        mode: 'dynamic',
        position: { left: '50%', top: '50%' },
        color: 'blue',
        size: 150,
        restOpacity: 0.7
    });

    moveManager.on('start', function () {
        if (!isGameRunning) return;
        joystickMoveVector.set(0, 0);
    });

    moveManager.on('move', function (evt, data) {
        if (!isGameRunning) return;
        joystickMoveVector.set(data.vector.x, data.vector.y);
    });

    moveManager.on('end', function () {
        joystickMoveVector.set(0, 0);
    });
}
const keySet = new Set();

function getNearestLivingEnemyPosition(originPosition) {
    let closestEnemy = null;
    let closestDistance = Infinity;
    for (const ai of ais) {
        if (!ai || ai.hp <= 0 || ai.team !== 'enemy') continue;
        const d = originPosition.distanceTo(ai.position);
        if (d < closestDistance) {
            closestDistance = d;
            closestEnemy = ai;
        }
    }
    return closestEnemy ? closestEnemy.position.clone() : null;
}

function getFollowSlotPosition(ai) {
    const teammates = ais.filter(member => member && member.team === 'player');
    const slotIndex = Math.max(0, teammates.indexOf(ai));
    const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    playerForward.y = 0;
    if (playerForward.lengthSq() < 0.0001) playerForward.set(0, 0, -1);
    else playerForward.normalize();
    const right = new THREE.Vector3().crossVectors(playerForward, new THREE.Vector3(0, 1, 0)).normalize();
    const ring = Math.floor(slotIndex / 2);
    const side = slotIndex % 2 === 0 ? -1 : 1;
    const backDistance = 7.0 + ring * 1.1;
    const sideDistance = 2.4 + ring * 0.5;
    const slotPos = player.position.clone()
        .add(playerForward.clone().multiplyScalar(-backDistance))
        .add(right.clone().multiplyScalar(side * sideDistance));
    slotPos.y = getGroundSurfaceY(slotPos);
    return slotPos;
}

function getSafeFollowSlotPosition(ai) {
    const base = getFollowSlotPosition(ai);
    const offsets = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.8, 0, 0),
        new THREE.Vector3(-1.8, 0, 0),
        new THREE.Vector3(0, 0, 1.8),
        new THREE.Vector3(0, 0, -1.8),
        new THREE.Vector3(2.6, 0, 2.6),
        new THREE.Vector3(-2.6, 0, 2.6),
        new THREE.Vector3(2.6, 0, -2.6),
        new THREE.Vector3(-2.6, 0, -2.6)
    ];

    const originalPos = ai.position.clone();
    for (const offset of offsets) {
        const candidate = base.clone().add(offset);
        candidate.y = getGroundSurfaceY(candidate);
        ai.position.copy(candidate);
        if (!checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
            return candidate;
        }
    }
    ai.position.copy(originalPos);
    return base;
}

function getNearbyTeammateSpawnPosition(ai) {
    const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    playerForward.y = 0;
    if (playerForward.lengthSq() < 0.0001) playerForward.set(0, 0, -1);
    else playerForward.normalize();
    const right = new THREE.Vector3().crossVectors(playerForward, new THREE.Vector3(0, 1, 0)).normalize();
    const baseCandidates = [
        player.position.clone().add(playerForward.clone().multiplyScalar(-3.5)).add(right.clone().multiplyScalar(-2.0)),
        player.position.clone().add(playerForward.clone().multiplyScalar(-3.5)).add(right.clone().multiplyScalar(2.0)),
        player.position.clone().add(playerForward.clone().multiplyScalar(-4.5)).add(right.clone().multiplyScalar(-2.6)),
        player.position.clone().add(playerForward.clone().multiplyScalar(-4.5)).add(right.clone().multiplyScalar(2.6))
    ];

    const originalPos = ai.position.clone();
    for (const candidate of baseCandidates) {
        candidate.y = -FLOOR_HEIGHT;
        ai.position.copy(candidate);
        if (!checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
            return candidate;
        }
    }
    ai.position.copy(originalPos);
    return getFollowSlotPosition(ai);
}

function warpTeammatesInFrontForFollow() {
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';
    if (!isTeamModeOrTeamArcade) return;
    const teammates = ais.filter(ai => ai && ai.team === 'player');
    if (teammates.length === 0) return;

    const reviveHPSetting = gameSettings.aiHP === 'Infinity' ? Infinity : Math.max(1, parseInt(gameSettings.aiHP, 10) || 3);

    teammates.forEach((ai) => {
        const targetPos = getSafeFollowSlotPosition(ai);
        if (ai.hp <= 0) {
            ai.hp = reviveHPSetting;
            ai.visible = true;
        }
        const originalPos = ai.position.clone();
        ai.position.copy(targetPos);
        if (checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
        }
        ai.targetPosition.copy(targetPos);
        ai.userData.followActive = true;
        ai.state = 'FOLLOWING';
        ai.avoiding = false;
        ai.rotation.y = player.rotation.y;
    });
}

function setFollowingPlayerMode(enabled) {
    isFollowingPlayerMode = enabled;
    debugLog(`AI Following Mode: ${isFollowingPlayerMode ? 'ON' : 'OFF'}`);
    if (followStatusDisplay) {
        if (isFollowingPlayerMode) {
            followStatusDisplay.style.display = 'block';
            followStatusDisplay.classList.add('blinking');
        } else {
            followStatusDisplay.style.display = 'none';
            followStatusDisplay.classList.remove('blinking');
        }
    }
    if (followButton && (shouldShowTouchControls())) {
        if (isFollowingPlayerMode) {
            followButton.classList.add('blinking');
            followButton.textContent = 'FOLLOWING';
        } else {
            followButton.classList.remove('blinking');
            followButton.textContent = 'FOLLOW';
        }
    }
    if (isFollowingPlayerMode) {
        for (const ai of ais) {
            if (ai && ai.team === 'player') ai.userData.followActive = true;
        }
        warpTeammatesInFrontForFollow();
    } else {
        for (const ai of ais) {
            if (ai && ai.team === 'player') ai.userData.followActive = false;
        }
    }
}

function toggleFollowingPlayerMode() {
    setFollowingPlayerMode(!isFollowingPlayerMode);
}

document.addEventListener('keydown', (event) => {
    if (!isGameRunning) return;
    keySet.add(event.code);
    // デバッグ: キー入力をログ
    if (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD') {
        debugLog('Key pressed:', event.code, 'isGameRunning:', isGameRunning, 'justRestarted:', window.justRestarted);
    }
    if (event.code === 'KeyC') {
        isCrouchingToggle = !isCrouchingToggle;
    } else if (event.code === 'KeyF') { // Fキーで追従モードをトグル
        toggleFollowingPlayerMode();
    }
});
document.addEventListener('keyup', (event) => { 
    if (!isGameRunning) return;
    keySet.delete(event.code); 
});
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
        if (currentWeapon === WEAPON_MR) {
            setRifleZoom(!isRifleZoomed);
        } else if (isScoping) {
            cancelScope();
        }
    }
});
document.addEventListener('mouseup', (event) => { if (!isGameRunning) return; if (event.button === 0) { handleFireRelease(); } });
document.addEventListener('contextmenu', (event) => event.preventDefault());



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

// zoomButton のイベントリスナーを追加
const zoomButtonElement = document.getElementById('zoom-button');
if (zoomButtonElement) {
    const toggleZoom = (event) => {
        if (!isGameRunning) return;
        if (currentWeapon === WEAPON_MR) {
            setRifleZoom(!isRifleZoomed);
        } else if (isScoping) {
            cancelScope();
        }
        event.preventDefault();
    };
    if (shouldShowTouchControls()) {
        zoomButtonElement.addEventListener('touchstart', toggleZoom, { passive: false });
    } else {
        zoomButtonElement.addEventListener('click', toggleZoom);
    }
}

// followButton のイベントリスナーを追加
const followButtonElement = document.getElementById('follow-button');
if (followButtonElement) {
    followButtonElement.addEventListener('touchstart', (event) => {
        if (!isGameRunning) return;
        toggleFollowingPlayerMode();
        event.preventDefault();
    }, { passive: false });
}

function initializeAudio() {
    // ユーザーインタラクション後に音声を初期化
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
        // 音声ファイルをプリロード
        audio.load();
        // 一時的にミュートにして再生を試みる（ブラウザポリシー対応）
        audio.muted = true;
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            debugLog('Audio initialized:', audio.id);
        }).catch(error => {
            audio.muted = false;
            debugLog('Audio initialization failed:', audio.id, error);
        });
    });

    // Warm up spatial pools for AI guns and explosions
    const spatialIds = ['aiGunSound', 'aimgGunSound', 'aiSrGunSound', 'aiSgSound', 'aiM1GunSound', 'explosionSound'];
    spatialIds.forEach(id => {
        const base = document.getElementById(id);
        const poolData = getSpatialPool(base);
        if (!poolData) return;
        poolData.pool.forEach(entry => {
            entry.el.muted = true;
            entry.el.play().then(() => {
                entry.el.pause();
                entry.el.currentTime = 0;
                entry.el.muted = false;
            }).catch(() => {
                entry.el.muted = false;
            });
        });
    });
}

function startGame() {
    debugLog('startGame() called');
    
    // シーンを完全にクリーンアップ（マップ切り替え時のゴースト対策）
    forceRoofCleanup();
    forceBuildingCleanup(); // 建築物クリーンアップを追加
    resetObstacles();
    isRifleZoomed = false;
    camera.fov = 75;
    camera.updateProjectionMatrix();
    
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
    const gameUI = ['crosshair', 'player-hp-display', 'player-weapon-display']; // 共通UI

    if (gameSettings.gameMode === 'arcade') {
        gameUI.push('kill-count-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display'); // アーケードモードのAI HP表示も追加
    } else if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'ffa') {
        gameUI.push('ai-hp-display', 'ai2-hp-display', 'ai3-hp-display'); // チームモードのAI HP表示
        if (gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'ffa') {
            gameUI.push('game-timer-display');
        }
        if (gameSettings.gameMode === 'teamArcade') {
            gameUI.push('player-team-kills-display', 'enemy-team-kills-display');
        }
    }
    gameUI.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    // 新しく追加したコンテナの表示制御
    const teamKillsContainer = document.getElementById('team-kills-container');
    const aiHpContainer = document.getElementById('ai-hp-container');

    if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
        if (teamKillsContainer) teamKillsContainer.style.display = 'flex';
        if (aiHpContainer) aiHpContainer.style.display = 'block';
    } else if (gameSettings.gameMode === 'ffa') {
        if (teamKillsContainer) teamKillsContainer.style.display = 'none';
        if (aiHpContainer) aiHpContainer.style.display = 'block';
    } else {
        if (teamKillsContainer) teamKillsContainer.style.display = 'none';
        if (aiHpContainer) aiHpContainer.style.display = 'block'; // AI HPは常に表示する
    }
    const element = document.documentElement;

    if (shouldShowTouchControls()) {
        debugLog('startGame(): Mobile device detected. Setting UI to block/flex.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const zoom = document.getElementById('zoom-button');
        const pause = document.getElementById('pause-button');
        const followBtn = document.getElementById('follow-button'); 

        if (joy) { joy.style.display = 'block'; debugLog('startGame(): joystick-move display set to block'); }
        if (fire) { fire.style.display = 'flex'; debugLog('startGame(): fire-button display set to flex'); }
        if (crouch) { crouch.style.display = 'flex'; debugLog('startGame(): crouch-button display set to flex'); }
        if (zoom) { zoom.style.display = 'flex'; debugLog('startGame(): zoom-button display set to flex'); }
        if (pause) { pause.style.display = 'block'; debugLog('startGame(): pause-button display set to block'); }

        if (followBtn) { 
            if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                followBtn.style.display = 'flex'; debugLog('startGame(): follow-button display set to flex (team mode)');
            } else {
                followBtn.style.display = 'none'; debugLog('startGame(): follow-button display set to none (non-team mode)');
            }
        }
    } else {
        debugLog('startGame(): PC device detected. Setting UI to none.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const zoom = document.getElementById('zoom-button');
        const followBtn = document.getElementById('follow-button'); 

        if (joy) { joy.style.display = 'none'; debugLog('startGame(): joystick-move display set to none'); }
        if (fire) { fire.style.display = 'none'; debugLog('startGame(): fire-button display set to none'); }
        if (crouch) { crouch.style.display = 'none'; debugLog('startGame(): crouch-button display set to none'); }
        if (zoom) { zoom.style.display = 'none'; debugLog('startGame(): zoom-button display set to none'); }
        if (followBtn) { followBtn.style.display = 'none'; debugLog('startGame(): follow-button display set to none'); }
    }
    enforceTouchUIVisibility();
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
    if (typeof resetObstacles === 'function') resetObstacles();
    // 強制的に表示設定 (デバッグ目的)
    if (playerHPDisplay) playerHPDisplay.style.display = 'block';
    if (playerWeaponDisplay) playerWeaponDisplay.style.display = 'block';
    
    // Start Time Lapse mode if enabled
    if (gameSettings.timeLapseMode) {
        startTimeLapseMode();
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
    debugLog('restartGame() called');
    playerBreadcrumbs = []; // Reset the breadcrumb trail
    
    // 屋根ゴーストと建築物を先にクリーンアップ
    forceHouseCleanup();
    forceRoofCleanup();
    forceBuildingCleanup(); // 建築物クリーンアップを追加
    
    resetObstacles();
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
    if (gameSettings.mapType === 'default') {
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
        const resolved = resolveCustomMapSelection();
        const selectedMapData = resolved.mapData;
        if (resolved.mapName && resolved.mapName !== gameSettings.customMapName) {
            gameSettings.customMapName = resolved.mapName;
            saveSettings();
        }
        if (selectedMapData) {
            debugLog("カスタムマップが選択されました。選択されたマップデータ:", selectedMapData); // 追加
            try {
                if (selectedMapData && selectedMapData.obstacles) {
                    customSpawnPoints = selectedMapData.spawnPoints.map(p => new THREE.Vector3(p.x, 2.0, p.z));
                    shuffle(customSpawnPoints);
                    availableSpawnPoints = customSpawnPoints;
                }
                if (selectedMapData.floorColor !== undefined) {
                    setArenaFloorColor(selectedMapData.floorColor);
                }
            } catch (e) {
                console.error("Could not parse spawn points from custom map data.", e);
            }
        }
    }
    playerHP = gameSettings.playerHP === 'Infinity' ? Infinity : parseInt(gameSettings.playerHP, 10);
    if (playerHPDisplay) { // nullチェックを追加
        playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    }
    playerKills = 0;
    if (killCountDisplay) killCountDisplay.textContent = `KILLS: ${playerKills}`;

    // --- 新しいゲームモードの追加 ---
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'team';
    if (isTeamModeOrTeamArcade) {
        playerTeamKills = 0;
        enemyTeamKills = 0;
        if (playerTeamKillsDisplay) playerTeamKillsDisplay.textContent = `PLAYER TEAM KILLS: ${playerTeamKills}`;
        if (enemyTeamKillsDisplay) enemyTeamKillsDisplay.textContent = `ENEMY TEAM KILLS: ${enemyTeamKills}`;
        if (gameSettings.gameMode === 'teamArcade') { // teamArcadeモードの場合のみタイマーを開始
            gameTimer = gameSettings.gameDuration; // gameDurationを初期タイマー値に設定
            updateTimerDisplay(); // タイマー表示を初期化
            startTimer(); // タイマー開始
        } else {
            stopTimer(); // teamモードではタイマーを停止
        }
    } else if (gameSettings.gameMode === 'ffa') {
        if (killCountDisplay) killCountDisplay.style.display = 'block';
        gameTimer = gameSettings.gameDuration;
        updateTimerDisplay();
        startTimer();
        if (playerTeamKillsDisplay) playerTeamKillsDisplay.style.display = 'none';
        if (enemyTeamKillsDisplay) enemyTeamKillsDisplay.style.display = 'none';
    } else {
        stopTimer(); // チームモード以外ではタイマーを停止
        if (gameTimerDisplay) gameTimerDisplay.style.display = 'none';
        if (playerTeamKillsDisplay) playerTeamKillsDisplay.style.display = 'none';
        if (enemyTeamKillsDisplay) enemyTeamKillsDisplay.style.display = 'none';
    }
    // --- ここまで ---
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
    const playerDir = new THREE.Vector3();
    player.getWorldDirection(playerDir);
    camera.rotation.x = 0;
    applyPlayerDefaultWeaponLoadout();
    let finalAICount = gameSettings.aiCount;
    const isTeamMode = gameSettings.gameMode === 'team';
    const isTeamArcadeMode = gameSettings.gameMode === 'teamArcade';

    if (isTeamMode || isTeamArcadeMode) { // 変更
        finalAICount = 3; // チームモードおよびチームアーケードモードでは常に3体（1体味方 + 2体敵）
    }
    for (const ai of ais) {
        cleanupAI(ai); // Use cleanupAI to properly remove AI and its resources
    }
    ais.length = 0;
    const aiColors = [0x00ff00, 0x00ffff, 0x0FFa500];
    const teamColors = {
        player: 0x00ffff, // 味方AIはシアン
        enemy: [0x00ff00, 0xffff00] // 敵AIは緑と黄
    };
    for (let i = 0; i < finalAICount; i++) {
        let aiColor;
        let aiTeam = null; // FFA and Battle mode have no teams initially

        if (isTeamMode || isTeamArcadeMode) { // 変更
            if (i === 0) {
                aiTeam = 'player'; // 最初の1体は味方
                aiColor = teamColors.player;
            } else {
                aiTeam = 'enemy'; // 残り2体は敵
                aiColor = teamColors.enemy[i - 1];
            }
        } else { // Battle, Arcade, FFA
            aiColor = aiColors[i] || 0xff00ff;
        }
        // Determine AI customization based on index
        let aiCustomization = null;
        if (i === 0) {
            aiCustomization = characterCustomization.enemy1;
        } else if (i === 1) {
            aiCustomization = characterCustomization.enemy2;
        } else if (i === 2) {
            aiCustomization = characterCustomization.enemy3;
        }
        
        const ai = createAI(aiColor, aiCustomization);
        resetCharacterPose(ai); // Reset to default pose
        // Show gun for gameplay
        if (ai.userData.parts && ai.userData.parts.gun) {
            ai.userData.parts.gun.visible = true;
        }
        ai.team = aiTeam; // チームプロパティを設定 (null for non-team modes)
        ai.kills = 0; // キル数を初期化
        let aiSpawnPos;
        if ((isTeamMode || isTeamArcadeMode) && aiTeam === 'player') {
            aiSpawnPos = getNearbyTeammateSpawnPosition(ai);
        } else if (availableSpawnPoints.length > 0) {
            aiSpawnPos = availableSpawnPoints.pop();
        } else {
            const aiSpawn = customSpawnPoints ? customSpawnPoints.find(p => p.name === `AI ${i + 1}`) : null;
            const defaultPos = AI_INITIAL_POSITIONS[i] || new THREE.Vector3(Math.random() * 20 - 10, 0, 20);
            aiSpawnPos = aiSpawn ? new THREE.Vector3(aiSpawn.x, 0, aiSpawn.z) : defaultPos;
        }
        ai.position.copy(new THREE.Vector3(aiSpawnPos.x, -FLOOR_HEIGHT, aiSpawnPos.z));
        // Make AI face center of stage (like player logic)
        const lookAtPoint = new THREE.Vector3(0, ai.position.y, 0);
        const direction = new THREE.Vector3().subVectors(lookAtPoint, ai.position);
        ai.rotation.y = Math.atan2(direction.x, direction.z);
        // Initialize lastPosition to current position to avoid immediate 'stuck' watchdog triggers
        if (ai.lastPosition) ai.lastPosition.copy(ai.position);
        if (finalAICount === 3 && !isTeamMode) {
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
    // 初期向きを「最寄りの敵対対象」に合わせる（開始直後に逆向きで走るのを防ぐ）
    for (const ai of ais) {
        // 初期の探索を積極化するため、近接ターゲットを取得して即座に向かわせる
        const initTarget = getClosestOpponentPosition(ai);
        if (initTarget) {
            ai.targetPosition.copy(initTarget);
            ai.rotation.y = Math.atan2(initTarget.x - ai.position.x, initTarget.z - ai.position.z);
        } else {
            // ターゲットが取れない場合のみアリーナ中央を向く
            ai.rotation.y = Math.atan2(0 - ai.position.x, 0 - ai.position.z);
        }
        // 開始直後から索敵・攻撃判断をさせる
        ai.userData.nextPerceptionTime = 0;
    }
    const aiHP = gameSettings.aiHP === 'Infinity' ? Infinity : parseInt(gameSettings.aiHP, 10);
    const aiHPText = gameSettings.aiHP === 'Infinity' ? '∞' : aiHP;
    const ai1HPDisplay = document.getElementById('ai-hp-display');
    const ai2HPDisplay = document.getElementById('ai2-hp-display');
    const ai3HPDisplay = document.getElementById('ai3-hp-display');
    ais.forEach((ai, index) => {
        ai.hp = aiHP;
        // 味方AIは積極的に攻撃するため、初期状態をATTACKINGにする
        if ((isTeamMode || isTeamArcadeMode) && ai.team === 'player') {
            ai.state = 'ATTACKING';
            ai.currentAttackTime = 0;
            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
            ai.aggression = 0.9; // 味方AIは高攻撃性
            ai.flankAggression = 0.8;
            // 味方AIは開始時から近い敵を追いかける
            const closestEnemy = getClosestOpponentPosition(ai);
            if (closestEnemy) ai.targetPosition.copy(closestEnemy);
            ai.userData.nextPerceptionTime = 0;
        } else if ((isTeamMode || isTeamArcadeMode) && ai.team === 'enemy') {
            ai.state = 'ATTACKING';
            ai.currentAttackTime = 0;
            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
            ai.aggression = 0.75;
            ai.flankAggression = 0.5;
            // 敵AIも近くのターゲットへすぐ移動する
            const closestEnemy = getClosestOpponentPosition(ai);
            if (closestEnemy) ai.targetPosition.copy(closestEnemy);
            ai.userData.nextPerceptionTime = 0;
        } else {
            // 非チームモードでも開始直後から戦闘意思を持たせる
            ai.state = 'ATTACKING';
            ai.currentAttackTime = 0;
            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);

            const closest = getClosestOpponentPosition(ai);
            if (closest) {
                ai.targetPosition.copy(closest);
            } else {
                // 念のため: ターゲットが取れない場合は移動へ
                ai.state = 'MOVING';
                const angle = Math.random() * Math.PI * 2;
                const r = ARENA_PLAY_AREA_RADIUS * 0.6 * Math.random();
                ai.targetPosition.set(Math.cos(angle) * r, -FLOOR_HEIGHT, Math.sin(angle) * r);
            }

            ai.userData.searchPulseAt = clock.getElapsedTime() + 0.1;
            ai.userData.nextPerceptionTime = 0;
            ai.aggression = Math.max(0.3, ai.aggression || Math.random());
        }
        applyAIDefaultWeaponLoadout(ai);
        ai.targetWeaponPickup = null;
        ai.lastHiddenTime = 0; ai.lastAttackTime = -999; ai.currentAttackTime = 0; ai.avoiding = false;
        if (isTeamMode) {
            if (index === 0) { // 味方AI
                if (ai1HPDisplay) ai1HPDisplay.textContent = `Teammate HP: ${aiHPText}`;
                if (ai1HPDisplay) ai1HPDisplay.style.color = 'cyan'; // 味方はシアン色
            } else if (index === 1) { // 敵AI 1
                if (ai2HPDisplay) ai2HPDisplay.textContent = `Enemy 1 HP: ${aiHPText}`;
                if (ai2HPDisplay) ai2HPDisplay.style.color = 'limegreen';
            } else if (index === 2) { // 敵AI 2
                if (ai3HPDisplay) ai3HPDisplay.textContent = `Enemy 2 HP: ${aiHPText}`;
                if (ai3HPDisplay) ai3HPDisplay.style.color = 'orange';
            }
        } else {
            if (index === 0) { if (ai1HPDisplay) ai1HPDisplay.textContent = `AI 1 HP: ${aiHPText}`; if (ai1HPDisplay) ai1HPDisplay.style.color = 'limegreen'; }
            else if (index === 1) { if (ai2HPDisplay) ai2HPDisplay.textContent = `AI 2 HP: ${aiHPText}`; if (ai2HPDisplay) ai2HPDisplay.style.color = 'cyan'; }
            else if (index === 2) { if (ai3HPDisplay) ai3HPDisplay.textContent = `AI 3 HP: ${aiHPText}`; if (ai3HPDisplay) ai3HPDisplay.style.color = 'orange'; }
        }
    });

    resetWeaponPickups(ais);

    // AI HPの個別表示制御はコンテナに任せるため削除

    const gameUI = ['crosshair', 'player-hp-display', 'player-weapon-display']; // 共通UI

    if (gameSettings.gameMode === 'arcade') {
        gameUI.push('kill-count-display'); // アーケードモードのキル表示のみ追加
    } else if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
        gameUI.push('player-team-kills-display', 'enemy-team-kills-display'); // 追加
        // AI HP表示はコンテナで制御するため、gameUI配列には追加しない
        if (gameSettings.gameMode === 'teamArcade') {
            gameUI.push('game-timer-display');
        }
    }
    gameUI.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    // 新しく追加したコンテナの表示制御
    const teamKillsContainer = document.getElementById('team-kills-container');
    const aiHpContainer = document.getElementById('ai-hp-container');

    if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
        if (teamKillsContainer) teamKillsContainer.style.display = 'flex';
        if (aiHpContainer) aiHpContainer.style.display = 'block';
    } else {
        if (teamKillsContainer) teamKillsContainer.style.display = 'none';
        if (aiHpContainer) aiHpContainer.style.display = 'block'; // AI HPは常に表示する
    }
    if (shouldShowTouchControls()) {
        debugLog('restartGame(): Mobile device detected. Setting UI to block/flex.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const zoom = document.getElementById('zoom-button');
        const pause = document.getElementById('pause-button');
        if (joy) { joy.style.display = 'block'; debugLog('restartGame(): joystick-move display set to block'); }
        if (fire) { fire.style.display = 'flex'; debugLog('restartGame(): fire-button display set to flex'); }
        if (crouch) { crouch.style.display = 'flex'; debugLog('restartGame(): crouch-button display set to flex'); }
        if (zoom) { zoom.style.display = 'flex'; debugLog('restartGame(): zoom-button display set to flex'); }
        if (pause) { pause.style.display = 'block'; debugLog('restartGame(): pause-button display set to block'); }
    } else {
        debugLog('restartGame(): PC device detected. Setting UI to none.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const zoom = document.getElementById('zoom-button');
        const pause = document.getElementById('pause-button');
        if (joy) { joy.style.display = 'none'; debugLog('restartGame(): joystick-move display set to none'); }
        if (fire) { fire.style.display = 'none'; debugLog('restartGame(): fire-button display set to none'); }
        if (crouch) { crouch.style.display = 'none'; debugLog('restartGame(): crouch-button display set to none'); }
        if (zoom) { zoom.style.display = 'none'; debugLog('restartGame(): zoom-button display set to none'); }
        if (pause) { pause.style.display = 'none'; debugLog('restartGame(): pause-button display set to none'); } // PauseボタンもPCでは非表示
    }
    enforceTouchUIVisibility();
    for (let i = projectiles.length - 1; i >= 0; i--) {
        clearAIRocketInFlight(projectiles[i]);
        scene.remove(projectiles[i].mesh);
    }
    projectiles.length = 0;
    for (let i = debris.length - 1; i >= 0; i--) {
        const mesh = debris[i].mesh;
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
    }
    debris.length = 0;
    resetObstacles();
    // resetWeaponPickups(); // Moved to after AI creation
    if (gameSettings.gameMode === 'arcade' && gameSettings.medikitCount > 0) {
        for (let i = 0; i < gameSettings.medikitCount; i++) {
            createMedikitPickup(getRandomSafePosition(MEDIKIT_WIDTH, MEDIKIT_HEIGHT, MEDIKIT_DEPTH));
        }
    }
    clock.start();
    lastFireTime = -1;
    playerMGReloadUntil = 0;
    playerMRReloadUntil = 0;
    hideReloadingText();
    keySet.clear();
    joystickMoveVector.set(0, 0);
    isMouseButtonDown = false;
    isScoping = false; // スコープ状態もリセット
    isElevating = false; // 昇降状態もリセット
    isGameRunning = true;
    isPaused = false; // ゲームが一時停止状態ではないことを明確にする
    document.exitPointerLock(); // 念のためポインターロックを解除し、再取得の機会を与える
    
    // 既存のplayerModelがplayerに追加されている場合、まず削除する
    if (playerModel && playerModel.parent) {
        player.remove(playerModel);
    }
    playerModel = createCharacterModel(0xff3333, characterCustomization.player); // Player's customization
    player.add(playerModel);
    playerModel.position.set(0, -playerTargetHeight, 0);
    if (playerModel) { // 念のためnullチェック
        playerModel.visible = false; // プレイヤーモデルは非表示に保つ
    }
    // playerBodyとplayerHeadをplayerModelのuserDataから取得
    playerBody = playerModel.userData.parts.body;
    playerHead = playerModel.userData.parts.head;
}

function startAIDeathSequence(impactVelocity, ai) {
    aiFallDownCinematicSequence(impactVelocity, ai);
}

function getPlayerRespawnHostilePositions() {
    const hostiles = [];
    const isTeamModeOrArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';
    if (isTeamModeOrArcade) {
        for (const ai of ais) {
            if (ai && ai.hp > 0 && ai.team === 'enemy') hostiles.push(ai.position.clone());
        }
        return hostiles;
    }
    for (const ai of ais) {
        if (ai && ai.hp > 0) hostiles.push(ai.position.clone());
    }
    return hostiles;
}

function findSaferRespawnPosition(entity, hostilePositions, objectBodyHeight, minDistanceFromAIs = 0, excludedAI = null) {
    const R = ARENA_PLAY_AREA_RADIUS - 5;
    const NUM_CANDIDATES = 90;
    const oldPos = entity.position.clone();
    const oldRot = entity.rotation.clone();

    let bestPos = null;
    let bestScore = -Infinity;

    for (let i = 0; i < NUM_CANDIDATES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * R;
        const candidate = new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        candidate.y = getGroundY(candidate, objectBodyHeight);

        entity.position.copy(candidate);
        if (checkCollision(entity, obstacles)) continue;

        if (minDistanceFromAIs > 0) {
            let tooClose = false;
            for (const otherAI of ais) {
                if (!otherAI || otherAI === excludedAI || otherAI.hp <= 0) continue;
                if (candidate.distanceTo(otherAI.position) < minDistanceFromAIs) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;
        }

        let nearestHostileDist = 1000;
        if (hostilePositions && hostilePositions.length > 0) {
            nearestHostileDist = Infinity;
            for (const hp of hostilePositions) {
                const d = candidate.distanceTo(hp);
                if (d < nearestHostileDist) nearestHostileDist = d;
            }
        }

        if (nearestHostileDist > bestScore) {
            bestScore = nearestHostileDist;
            bestPos = candidate.clone();
        }
    }

    entity.position.copy(oldPos);
    entity.rotation.copy(oldRot);
    return bestPos;
}


function respawnAI(ai) {
    const aiHP = gameSettings.aiHP === 'Infinity' ? Infinity : parseInt(gameSettings.aiHP, 10);
    ai.hp = aiHP;
    if (ai.userData) ai.userData.rocketInFlight = false;
    const isTeammate = ai.team === 'player';
    const isTeamModeOrArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';

    if (isFollowingPlayerMode && isTeamModeOrArcade && isTeammate) {
        const followPos = getSafeFollowSlotPosition(ai);
        const originalPos = ai.position.clone();
        ai.position.copy(followPos);
        if (checkCollision(ai, obstacles)) {
            ai.position.copy(originalPos);
            ai.position.copy(getNearbyTeammateSpawnPosition(ai));
        }
        ai.rotation.set(0, player.rotation.y, 0);
        ai.state = 'FOLLOWING';
        ai.userData.followActive = true;
        applyAIDefaultWeaponLoadout(ai);
        resetCharacterVisualPose(ai, ai.currentWeapon);
        ai.targetWeaponPickup = null;
        ai.lastHiddenTime = clock.getElapsedTime();
        ai.lastAttackTime = 0; ai.currentAttackTime = 0; ai.avoiding = false; ai.isCrouching = false;
        ai.isElevating = false;
        if (ai.userData) ai.userData.mgReloadUntil = 0;
        ai.userData.rooftopIntent = false;
        ai.userData.onRooftop = false;
        ai.userData.rooftopSensor = null;
        ai.userData.rooftopObstacle = null;
        ai.userData.rooftopLadderPos = null;
        ai.userData.rooftopTargetY = -FLOOR_HEIGHT;
        ai.userData.elevatingDirection = 0;
        ai.userData.rooftopDecisionMade = false;
        ai.userData.rooftopPhase = 'none';
        ai.userData.nextRooftopDecisionAt = clock.getElapsedTime() + 1.0;
        ai.userData.stallStartTime = 0;
        ai.userData.searchPulseAt = clock.getElapsedTime() + 1.0;
        ai.userData.nextPerceptionTime = 0;
        ai.userData.cachedVisibleOpponentInfo = null;
        ai.userData.cachedIsAISeen = false;
        ai.userData.groundIdleSince = 0;
        ai.visible = true;
        scene.add(ai);
        return;
    }

    const hostilePositions = getOpponentTargetsForAI(ai).map(t => (t === player ? player.position.clone() : t.position.clone()));
    let farthestPosition = findSaferRespawnPosition(ai, hostilePositions, BODY_HEIGHT * 2, 10, ai);
    if (!farthestPosition) farthestPosition = new THREE.Vector3(0, getGroundY(new THREE.Vector3(0, 0, 0), BODY_HEIGHT * 2), 0);
    ai.position.copy(farthestPosition);
    ai.rotation.set(0, Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z), 0);
    ai.state = 'HIDING';
    applyAIDefaultWeaponLoadout(ai);
    resetCharacterVisualPose(ai, ai.currentWeapon);
    ai.targetWeaponPickup = null;
    ai.lastHiddenTime = clock.getElapsedTime();
    ai.lastAttackTime = 0; ai.currentAttackTime = 0; ai.avoiding = false; ai.isCrouching = false;
    ai.isElevating = false;
    if (ai.userData) ai.userData.mgReloadUntil = 0;
    if (ai.userData) ai.userData.mrReloadUntil = 0;
    if (ai.userData) ai.userData.mrReloadUntil = 0;
    ai.userData.rooftopIntent = false;
    ai.userData.onRooftop = false;
    ai.userData.rooftopSensor = null;
    ai.userData.rooftopObstacle = null;
    ai.userData.rooftopLadderPos = null;
    ai.userData.rooftopTargetY = -FLOOR_HEIGHT;
    ai.userData.elevatingDirection = 0;
    ai.userData.rooftopDecisionMade = false;
    ai.userData.rooftopPhase = 'none';
    ai.userData.nextRooftopDecisionAt = clock.getElapsedTime() + 1.0;
    ai.userData.stallStartTime = 0;
    ai.userData.searchPulseAt = clock.getElapsedTime() + 1.0;
    ai.userData.nextPerceptionTime = 0;
    ai.userData.cachedVisibleOpponentInfo = null;
    ai.userData.cachedIsAISeen = false;
    ai.userData.groundIdleSince = 0;
    scene.add(ai);
}

function respawnPlayer() {
    playerHP = gameSettings.playerHP === 'Infinity' ? Infinity : parseInt(gameSettings.playerHP, 10);
    if (playerHPDisplay) { // nullチェックを追加
        playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    }

    // 梯子昇降中に死亡した場合のゴースト状態を完全にリセット
    isElevating = false;
    elevatingTargetY = 0;
    elevatingTargetObstacle = null;
    isIgnoringTowerCollision = false;
    ignoreTowerTimer = 0;
    lastClimbedTower = null;

    // プレイヤーの入力状態を完全にリセット
    keySet.clear();
    joystickMoveVector.set(0, 0);
    isMouseButtonDown = false;
    isScoping = false; // スコープ状態もリセット
    cancelScope(); // もしスコープ中だったら解除

    if (playerDeathTweenPos) { playerDeathTweenPos.stop(); playerDeathTweenPos = null; }
    if (playerDeathTweenRotX) { playerDeathTweenRotX.stop(); playerDeathTweenRotX = null; }
    if (playerDeathTweenRotZ) { playerDeathTweenRotZ.stop(); playerDeathTweenRotZ = null; }

    if (!player.userData) player.userData = {};
    const hostilePositions = getPlayerRespawnHostilePositions();
    let safePos = findSaferRespawnPosition(player, hostilePositions, playerTargetHeight * 2, 10, null);
    if (safePos && lastPlayerDeathPos) {
        let retryCount = 0;
        while (safePos.distanceTo(lastPlayerDeathPos) < 8 && retryCount < 4) {
            safePos = findSaferRespawnPosition(player, hostilePositions, playerTargetHeight * 2, 10, null);
            retryCount++;
        }
    }
    if (safePos) {
        player.position.copy(safePos);
        lastPlayerDeathPos = null;
    } else {
        console.error("Could not find a safe spawn point after multiple attempts. Spawning at default (0, 0, 0).");
        const playerSpawnPos = new THREE.Vector3(0, 0, 0);
        player.position.copy(playerSpawnPos);
        const groundYAtDefaultSpawn = getGroundY(player.position, playerTargetHeight * 2);
        player.position.y = groundYAtDefaultSpawn + 0.2; // Raise player more to prevent shoes sinking
    }
    
    // プレイヤーの位置と向きを設定
    // player.position.copy(playerSpawnPos); // ループ内で既に設定済み
    player.rotation.y = Math.atan2(0 - player.position.x, 0 - player.position.z) + Math.PI; // 中心を向く
    camera.rotation.x = 0; // カメラの縦回転をリセット
    applyPlayerDefaultWeaponLoadout();

    // playerModelの表示状態を確実に更新
    if (playerModel) {
        resetCharacterPose(playerModel);
        if (playerModel.userData && playerModel.userData.parts && playerModel.userData.parts.gun) {
            playerModel.userData.parts.gun.visible = true;
        }
        playerModel.rotation.set(0, 0, 0);
        if (!playerModel.parent) { // もしplayerModelがシーンから削除されていたらplayerに追加
            player.add(playerModel);
        }
        // playerModel.visible = true; // 常に表示
        playerModel.visible = false; // <-- ここに明示的に追加
        playerModel.position.set(0, -playerTargetHeight, 0); // playerModelはplayerの子なので相対位置を設定
    }
}


function forceResetTouchState() {
    isLooking = false;
    lookTouchId = -1;
    isMouseButtonDown = false;
}

function startPlayerDeathSequence(projectile) {
    if (isPlayerDeathPlaying || playerHP > 0) return;
    forceResetTouchState(); // Reset input states
    isPlayerDeathPlaying = true;
    isGameRunning = false; // 一時的にゲームを停止
    document.exitPointerLock();
    lastPlayerDeathPos = player.position.clone();

    // 梯子昇降中の死亡でリスポーン後に浮くのを防ぐ
    isElevating = false;
    elevatingTargetY = 0;
    elevatingTargetObstacle = null;

    // プレイヤー死亡キルカメラ用にプレイヤーモデルを表示
    if (playerModel) {
        playerModel.visible = true;
    }

    // UIを非表示
    const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'zoom-button', 'follow-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'player-weapon-display', 'pause-button'];
    uiToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // プレイヤーモデルは足元基準で配置
    playerModel.position.set(0, -playerTargetHeight, 0);
    const playerBodyHeight = playerTargetHeight * 2;
    const rooftopObstacle = getRooftopObstacleUnder(player.position.clone(), playerBodyHeight);
    const deathTargetPos = getDeathTargetPosition(player.position.clone(), playerBodyHeight, false, rooftopObstacle);
    const fallDuration = 1.0;

    // AIと同じ姿勢ロジックで、死亡時も棒立ちを避ける
    if (playerModel.userData && playerModel.userData.parts) {
        const parts = playerModel.userData.parts;
        if (parts.gun) {
            applyGunStyle(parts.gun, currentWeapon);
        }
        applyRagdollPose(parts);
        alignGunGripToRightHand(parts);
    }
    
    // 倒れるアニメーション
    const fallRotationAxisAngle = Math.PI / 2;
    const impactDir = (projectile && projectile.velocity)
        ? projectile.velocity.clone().setY(0).normalize()
        : new THREE.Vector3(0, 0, 1);
    // 被弾方向へ体の正面を向ける（背中を撃った相手へ向けない）
    const shooterDir = impactDir.clone().multiplyScalar(-1);
    if (shooterDir.lengthSq() > 1e-6) {
        const shooterYaw = Math.atan2(shooterDir.x, shooterDir.z);
        playerModel.rotation.y = normalizeAngle(shooterYaw - player.rotation.y);
    }
    const finalRotation = playerModel.rotation.clone();
    // 弾が正面から来たら後ろへ仰向け、背後から来たら前へ倒れる
    const modelWorldQuat = new THREE.Quaternion();
    playerModel.getWorldQuaternion(modelWorldQuat);
    const modelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(modelWorldQuat).setY(0).normalize();
    const hitFromFront = modelForward.dot(impactDir) < 0;
    const fallSign = hitFromFront ? -1 : 1;
    finalRotation.x += fallSign * (fallRotationAxisAngle + (Math.random() * 0.4 - 0.2));
    finalRotation.z += (Math.random() * 0.6 - 0.3);
    playerDeathTweenRotX = new TWEEN.Tween(playerModel.rotation).to({ x: finalRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    playerDeathTweenRotZ = new TWEEN.Tween(playerModel.rotation).to({ z: finalRotation.z }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();

    // Ensure player ends on ground and not inside obstacles (incl. rooftop fall)
    playerDeathTweenPos = new TWEEN.Tween(player.position).to(
        { x: deathTargetPos.x, y: deathTargetPos.y, z: deathTargetPos.z },
        fallDuration * 1000
    ).easing(TWEEN.Easing.Quadratic.InOut).start();

    // プレイヤー死亡キルカメラ: 遮蔽物を避けて必ずプレイヤーが映る角度を選ぶ
    playerDeathLookAt = getPlayerDeathLookAt();
    const playerLookAt = playerDeathLookAt.clone();
    const preferredDir = projectile && projectile.velocity ? projectile.velocity.clone() : null;
    const playerDeathCamPos = findPlayerDeathCameraPosition(playerLookAt, obstacles, preferredDir);
    cinematicCamera.position.copy(playerDeathCamPos);
    cinematicCamera.lookAt(playerLookAt);
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight;
    cinematicCamera.updateProjectionMatrix();
    playerDeathCamOffset = playerDeathCamPos.clone().sub(playerLookAt);

    const redFlashOverlay = document.getElementById('red-flash-overlay');
    if (redFlashOverlay) {
        // 初期状態をリセットし、表示をブロック
        redFlashOverlay.className = ''; // クラスを全てクリア
        redFlashOverlay.style.opacity = '0'; // 明示的に透明に
        redFlashOverlay.style.backgroundColor = 'rgba(0,0,0,0)'; // 明示的に透明な黒に
        redFlashOverlay.style.display = 'block';

        // 赤フラッシュを開始
        setTimeout(() => {
            redFlashOverlay.classList.add('red-flash'); // 赤フラッシュクラスを追加
        }, 50);

        // 黒画面への移行
        setTimeout(() => {
            redFlashOverlay.classList.remove('red-flash'); // 赤フラッシュクラスを削除
            redFlashOverlay.classList.add('fade-to-black'); // 黒画面クラスを追加
        }, 300); // 赤フラッシュ表示時間

        // 黒画面からフェードアウト
        setTimeout(() => {
            redFlashOverlay.classList.remove('fade-to-black'); // 黒画面クラスを削除
            redFlashOverlay.classList.add('fade-out'); // フェードアウトクラスを追加
        }, 1300); // 黒画面表示時間

        // オーバーレイを完全に非表示にする
        setTimeout(() => {
            redFlashOverlay.style.display = 'none';
            redFlashOverlay.className = ''; // クラスをクリアしてリセット
            redFlashOverlay.style.opacity = '0'; // 明示的に透明に
            redFlashOverlay.style.backgroundColor = 'rgba(0,0,0,0)'; // 明示的に透明な黒に
        }, 2300); // フェードアウト完了後


    }

            // 3秒後にリスポーンまたはゲームオーバー画面へ
        setTimeout(() => { // このsetTimeoutは全体の演出時間に合わせて調整
            isPlayerDeathPlaying = false;
            // プレイヤーモデルの回転をリセット
            if (playerModel) {
                playerModel.rotation.set(0, 0, 0); 
                // playerModelがplayerの子として正しく配置されるようにリセット
                playerModel.position.set(0, -playerTargetHeight, 0); 
            }
    
            // カメラをリセット (通常のプレイヤー視点に戻す)
            camera.position.set(0, 0, 0); // 相対位置としてリセット
            camera.rotation.set(0, 0, 0); // 相対角度としてリセット
            
            if (gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'ffa') {
                respawnPlayer(); // プレイヤーをリスポーン地点に移動
                if (isFollowingPlayerMode) {
                    for (const ai of ais) {
                        if (ai && ai.team === 'player') ai.userData.followActive = true;
                    }
                    warpTeammatesInFrontForFollow();
                }
                isGameRunning = true; // ゲームを再開
                if (player) player.traverse((object) => { object.visible = true; }); // プレイヤーをシーンに再追加
                // UIを再表示
                const uiToShow = ['crosshair', 'player-hp-display', 'player-weapon-display', 'game-timer-display', 'player-team-kills-display', 'enemy-team-kills-display', 'pause-button'];
                if (shouldShowTouchControls()) {
                    uiToShow.push('joystick-move', 'fire-button', 'crouch-button', 'zoom-button');
                } else {
                    canvas.requestPointerLock();
                }
                uiToShow.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'block';
                });
                const followBtn = document.getElementById('follow-button');
                if (followBtn) {
                    const shouldShowFollow = (shouldShowTouchControls()) && (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade');
                    followBtn.style.display = shouldShowFollow ? 'flex' : 'none';
                }
            } else if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                // チームモード：残りHPを確認
                const playerTeamAlive = checkTeamAlive('player');
                const enemyTeamAlive = checkTeamAlive('enemy');
                
                if (!playerTeamAlive) {
                    showGameOver();
                } else if (!enemyTeamAlive) {
                    showWinScreen();
                } else {
                    // まだ生存者がいる場合はリスポーン
                    respawnPlayer();
                    if (isFollowingPlayerMode) {
                        for (const ai of ais) {
                            if (ai && ai.team === 'player') ai.userData.followActive = true;
                        }
                        warpTeammatesInFrontForFollow();
                    }
                    isGameRunning = true;
                    if (player) player.traverse((object) => { object.visible = true; });
                    // UIを再表示
                    const uiToShow = ['crosshair', 'player-hp-display', 'player-weapon-display', 'game-timer-display', 'player-team-kills-display', 'enemy-team-kills-display', 'pause-button'];
                    if (shouldShowTouchControls()) {
                        uiToShow.push('joystick-move', 'fire-button', 'crouch-button', 'zoom-button');
                    } else {
                        canvas.requestPointerLock();
                    }
                    uiToShow.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.display = 'block';
                    });
                    const followBtn = document.getElementById('follow-button');
                    if (followBtn) {
                        const shouldShowFollow = (shouldShowTouchControls()) && (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade');
                        followBtn.style.display = shouldShowFollow ? 'flex' : 'none';
                    }
                }
            } else {
                // FFAモード：ゲームオーバー
                showGameOver();
            }
    }, 3000); // 3秒後にリスポーンまたはゲームオーバー
}

function checkTeamAlive(team) {
    // プレイヤーチームの場合はプレイヤーもチェック
    if (team === 'player') {
        if (playerHP > 0) return true;
    }
    
    // AIチームメンバーをチェック
    for (const ai of ais) {
        if (ai.team === team && ai.hp > 0) {
            return true;
        }
    }
    
    return false;
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

function shouldPlayAIDeathKillCam(ai, killerSource) {
    const mode = gameSettings.killCamMode || 'playerOnly';
    if (mode === 'off') return false;
    if (mode === 'all') return true;
    if (mode === 'playerOnly') {
        if (killerSource !== 'player' || !ai) return false;
        if (gameSettings.gameMode === 'ffa') return true;
        return ai.team === 'enemy';
    }
    return true;
}

let enemyKilledMessageTimer = null;
function showEnemyKilledMessage() {
    let el = document.getElementById('enemy-killed-message');
    if (!el) {
        el = document.createElement('div');
        el.id = 'enemy-killed-message';
        el.textContent = 'enemy killed';
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.top = '44%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.color = 'red';
        el.style.fontSize = '24px';
        el.style.fontWeight = 'bold';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9999';
        el.style.display = 'none';
        document.body.appendChild(el);
    }
    el.style.display = 'block';
    if (enemyKilledMessageTimer) {
        clearTimeout(enemyKilledMessageTimer);
        enemyKilledMessageTimer = null;
    }
    enemyKilledMessageTimer = setTimeout(() => {
        el.style.display = 'none';
    }, 2000);
}

function finalizeAIDeathWithoutKillCam(ai) {
    if (!ai) return;
    ai.targetWeaponPickup = null;
    if (gameSettings.gameMode === 'arcade' || gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'ffa') {
        respawnAI(ai);
    } else {
        ai.visible = false;
    }
}

function aiFallDownCinematicSequence(impactVelocity, ai, killerSource = 'unknown') {
    if (!shouldPlayAIDeathKillCam(ai, killerSource)) {
        if (gameSettings.killCamMode === 'off' && killerSource === 'player' && ai) {
            showEnemyKilledMessage();
        }
        finalizeAIDeathWithoutKillCam(ai);
        return;
    }
    if (isAIDeathPlaying) return;
    isAIDeathPlaying = true;
    ai.targetWeaponPickup = null; // Clear target weapon pickup when AI dies
    cinematicTargetAI = ai;
    if (player) player.visible = false; // AI死亡時はプレイヤーを非表示
    const joy = document.getElementById('joystick-move');
    const fire = document.getElementById('fire-button');
    const cross = document.getElementById('crosshair');
    const followBtn = document.getElementById('follow-button');
    if (joy) joy.style.display = 'none';
    if (fire) fire.style.display = 'none';
    if (cross) cross.style.display = 'none';
    if (followBtn) followBtn.style.display = 'none';
    createRedSmokeEffect(ai.position);
    const aiDeathLocation = ai.position.clone();
    const aiLookAt = aiDeathLocation.clone().add(new THREE.Vector3(0, 1.2, 0));
    const targetCameraPosition = findClearKillCameraPosition(aiDeathLocation, aiLookAt, obstacles, impactVelocity);
    cinematicCamera.position.copy(targetCameraPosition);
    cinematicCamera.lookAt(aiLookAt);
    cinematicCamera.fov = 75;
    cinematicCamera.aspect = window.innerWidth / window.innerHeight;
    cinematicCamera.updateProjectionMatrix();
    new TWEEN.Tween(cinematicCamera).to({ fov: 30 }, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();
    const fallDuration = 1.0;
    const fallRotationAxisAngle = Math.PI / 2;
    const finalAIRotation = ai.rotation.clone();
    finalAIRotation.x += (Math.random() > 0.5 ? 1 : -1) * fallRotationAxisAngle;
    const rooftopObstacle = (ai.userData && ai.userData.onRooftop) ? ai.userData.rooftopObstacle : null;
    const deathTargetPos = getDeathTargetPosition(ai.position.clone(), BODY_HEIGHT, true, rooftopObstacle);
    if (ai.userData && ai.userData.parts) {
        const parts = ai.userData.parts;
        if (parts.gun) {
            applyGunStyle(parts.gun, ai.currentWeapon);
        }
        applyRagdollPose(parts);
        alignGunGripToRightHand(parts);
    }
    new TWEEN.Tween(ai.rotation).to({ x: finalAIRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    new TWEEN.Tween(ai.position).to({ x: deathTargetPos.x, y: deathTargetPos.y, z: deathTargetPos.z }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.InOut).start();
    setTimeout(() => {
        isAIDeathPlaying = false;
        cinematicTargetAI = null;
        finalizeAIDeathWithoutKillCam(ai);
        if (ais.length > 0 || gameSettings.gameMode === 'arcade') {
            if (joy) joy.style.display = 'block';
            if (fire) fire.style.display = 'block';
            if (cross) cross.style.display = 'block';
            if (followBtn) {
                const shouldShowFollow = (shouldShowTouchControls()) && (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade');
                followBtn.style.display = shouldShowFollow ? 'flex' : 'none';
            }
            if (player) {
                player.traverse((object) => { object.visible = true; }); // AI死亡演出終了時はプレイヤーを再表示
                if (playerModel) {
                    playerModel.visible = false; // プレイヤーモデルは非表示に保つ
                }
            }
        }
    }, fallDuration * 1000 + 500);
}

function showGameOver() {
    forceResetTouchState();
    isGameRunning = false;
    gameOverScreen.style.display = 'flex';
    document.exitPointerLock();
}

function showWinScreen() {
    forceResetTouchState();
    isGameRunning = false;
    winScreen.style.display = 'flex';
    document.exitPointerLock();
    const pauseBtn = document.getElementById('pause-button');
    if(pauseBtn) pauseBtn.style.display = 'none';
}

function updateCrosshairForWeapon() {
    const crosshair = document.getElementById('crosshair');
    if (!crosshair) return;
    const lineH = document.getElementById('line-h');
    const lineV = document.getElementById('line-v');
    const circle = crosshairCircle || document.getElementById('crosshair-circle');
    const plusH = crosshairPlusH || document.getElementById('crosshair-plus-h');
    const plusV = crosshairPlusV || document.getElementById('crosshair-plus-v');
    if (lineH) lineH.style.display = 'block';
    if (lineV) lineV.style.display = 'block';
    if (circle) circle.style.display = 'none';
    if (plusH) plusH.style.display = 'none';
    if (plusV) plusV.style.display = 'none';

    if (currentWeapon === WEAPON_SG) {
        if (lineH) lineH.style.display = 'none';
        if (lineV) lineV.style.display = 'none';
        if (circle) circle.style.display = 'block';
    } else if (currentWeapon === WEAPON_RR) {
        if (lineH) lineH.style.display = 'none';
        if (lineV) lineV.style.display = 'none';
        if (circle) circle.style.display = 'block';
        if (plusH) plusH.style.display = 'block';
        if (plusV) plusV.style.display = 'block';
    }
}

function checkCollision(object, obstacles, ignoreObstacle = null) {
    const objectBox = new THREE.Box3();
    const pos = object.position;
    let currentObjectBox;
    
    for (const obstacle of obstacles) {
        if (obstacle === ignoreObstacle) continue;
        if (obstacle === object) continue;
        
        // 屋上の床は衝突判定から除外（家の屋根は強力な衝突判定）
        if (obstacle.userData.isRooftop && !obstacle.userData.isHouseRoof) continue;
        
        // 家の屋根はAIに対して強力な衝突判定を適用
        if (obstacle.userData.isHouseRoof && ais.includes(object)) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            const objectBox = new THREE.Box3().setFromObject(object);
            if (obstacleBox.intersectsBox(objectBox)) {
                return true; // 強力な衝突
            }
        }
        
        // 家の屋根はAIの地面計算から完全に除外
        if (obstacle.userData.isHouseRoof && ais.includes(object)) {
            continue;
        }
        
        // AIが家に入れるように特別処理
        if (ais.includes(object) && obstacle.userData.type === 'house') {
            // 家の壁は個別に衝突判定するため、家グループ自体とは衝突しない
            // 壁はobstacles配列に個別に追加されていないため、子要素をチェック
            let hasCollision = false;
            obstacle.traverse((child) => {
                if (child.userData.isWall && child.isMesh) {
                    const childBox = new THREE.Box3().setFromObject(child);
                    const objectBox = new THREE.Box3().setFromObject(object);
                    if (childBox.intersectsBox(objectBox)) {
                        hasCollision = true;
                    }
                }
            });
            if (hasCollision) return true;
            continue;
        }
        
        currentObjectBox = new THREE.Box3().setFromObject(obstacle);
        
        // AIの場合は少し大きめのバウンディングボックスを使用
        if (ais.includes(object)) {
            const aiBodyHeight = BODY_HEIGHT + (HEAD_RADIUS * 2); 
            const aiCollisionHeight = object.isCrouching ? aiBodyHeight * 0.7 : aiBodyHeight; 
            objectBox.min.set(pos.x - 0.3, pos.y - aiCollisionHeight, pos.z - 0.3);
            objectBox.max.set(pos.x + 0.3, pos.y, pos.z + 0.3);
        } else {
            // プレイヤーの場合
            objectBox.min.set(pos.x - 0.2, pos.y - playerTargetHeight, pos.z - 0.2);
            objectBox.max.set(pos.x + 0.2, pos.y, pos.z + 0.2);
        }
        
        if (objectBox.intersectsBox(currentObjectBox)) {
            return true;
        }
    }
    if (checkHouseCollisionBox(objectBox)) return true;
    return false;
}

// AI移動のスイープチェック（薄い壁のすり抜け対策）
function applyAIMovementWithSweep(ai, moveVec, ignoreObstacle = null) {
    const moveLen = moveVec.length();
    if (moveLen < 1e-6) return false;
    const origin = ai.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const dir = moveVec.clone().normalize();
    raycaster.set(origin, dir);
    raycaster.far = moveLen + 0.35;
    const hits = raycaster.intersectObjects(obstacles, true);
    for (const hit of hits) {
        const obj = hit.object;
        if (obj === ignoreObstacle) continue;
        if (obj.userData && obj.userData.isRooftop && !obj.userData.isHouseRoof) continue;
        const safeLen = Math.max(0, hit.distance - 0.35);
        if (safeLen < moveLen) {
            moveVec.multiplyScalar(safeLen / moveLen);
        }
        break;
    }
    const oldPos = ai.position.clone();
    ai.position.add(moveVec);
    if (checkCollision(ai, obstacles)) {
        ai.position.copy(oldPos);
        return false;
    }
    return true;
}

// AI専用の衝突判定関数
function checkAICollisionWithObstacles(ai, newPos, obstacles) {
    const oldPos = ai.position.clone();
    ai.position.copy(newPos);
    const collides = checkCollision(ai, obstacles);
    ai.position.copy(oldPos);
    return collides;
}

function checkPartCollision(part) {
    if (part.userData && part.userData.isDeadPart === true) {
        return false; // 死亡したパーツは衝突判定を行わない
    }
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

function findClearKillCameraPosition(targetPosition, lookAtTarget, obstaclesArray, preferredDirection = null) {
    const candidates = [];
    const up = new THREE.Vector3(0, 1, 0);
    if (preferredDirection && preferredDirection.lengthSq() > 1e-6) {
        const dir = preferredDirection.clone().normalize();
        candidates.push(targetPosition.clone().add(dir.clone().multiplyScalar(-10)).add(new THREE.Vector3(0, 4.5, 0)));
        candidates.push(targetPosition.clone().add(dir.clone().multiplyScalar(-8)).add(new THREE.Vector3(0, 6.0, 0)));
    }

    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 8.5 : 11.5;
        const h = i % 3 === 0 ? 3.8 : (i % 3 === 1 ? 5.5 : 7.0);
        candidates.push(targetPosition.clone().add(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r)));
    }
    candidates.push(targetPosition.clone().add(new THREE.Vector3(0, 9.5, 0.5)));

    let bestCandidate = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
        const toLook = new THREE.Vector3().subVectors(lookAtTarget, candidate);
        const distToLook = toLook.length();
        if (distToLook < 0.01) continue;
        raycaster.set(candidate, toLook.normalize());
        const hits = raycaster.intersectObjects(obstaclesArray, true);
        const clear = hits.length === 0 || hits[0].distance > distToLook - 0.15;
        if (clear) return candidate;

        const score = hits.length > 0 ? hits[0].distance : 0;
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    }
    return bestCandidate || targetPosition.clone().add(new THREE.Vector3(0, 12, 0.5));
}

function findPlayerDeathCameraPosition(lookAtTarget, obstaclesArray, preferredDirection = null) {
    const candidates = [];
    const up = new THREE.Vector3(0, 1, 0);
    const baseDirs = [];
    if (preferredDirection && preferredDirection.lengthSq() > 1e-6) {
        baseDirs.push(preferredDirection.clone().normalize().multiplyScalar(-1));
    }
    baseDirs.push(new THREE.Vector3(0, 0, 1));
    baseDirs.push(new THREE.Vector3(0, 0, -1));
    baseDirs.push(new THREE.Vector3(1, 0, 0));
    baseDirs.push(new THREE.Vector3(-1, 0, 0));
    baseDirs.push(new THREE.Vector3(1, 0, 1).normalize());
    baseDirs.push(new THREE.Vector3(-1, 0, 1).normalize());
    baseDirs.push(new THREE.Vector3(1, 0, -1).normalize());
    baseDirs.push(new THREE.Vector3(-1, 0, -1).normalize());

    const distances = [7.5, 10.5, 13.5];
    const heights = [3.8, 5.2, 6.8];
    for (const dir of baseDirs) {
        for (const d of distances) {
            for (const h of heights) {
                candidates.push(lookAtTarget.clone().add(dir.clone().multiplyScalar(d)).add(up.clone().multiplyScalar(h)));
            }
        }
    }
    candidates.push(lookAtTarget.clone().add(new THREE.Vector3(0, 10.5, 0.2)));

    let bestCandidate = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
        const toLook = new THREE.Vector3().subVectors(lookAtTarget, candidate);
        const distToLook = toLook.length();
        if (distToLook < 0.01) continue;
        raycaster.set(candidate, toLook.normalize());
        const hits = raycaster.intersectObjects(obstaclesArray, true);
        const clear = hits.length === 0 || hits[0].distance > distToLook - 0.15;
        if (clear) return candidate;
        const score = hits.length > 0 ? hits[0].distance : 0;
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    }
    return bestCandidate || lookAtTarget.clone().add(new THREE.Vector3(0, 12, 0.5));
}

// 指定された位置の真下にある最適な地面のY座標を返すヘルパー関数
function getGroundY(position, objectBodyHeight) {
    let currentGroundY = -FLOOR_HEIGHT; // デフォルトはステージの最下部

    // プレイヤーの足元の水平位置
    const horizontalBox = new THREE.Box2(
        new THREE.Vector2(position.x - 0.2, position.z - 0.2), 
        new THREE.Vector2(position.x + 0.2, position.z + 0.2)
    );
    const feetY = position.y - objectBodyHeight / 2; // オブジェクトの足元のY座標

    for (const obs of obstacles) {
        // 壁は地面としてカウントしない
        if (obs.userData.isWall) continue;
        
        const obstacleBox = new THREE.Box3().setFromObject(obs);
        // 空洞建物の場合、床のジオメトリーから高さを取得
        const geometry = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
        const height = geometry ? geometry.parameters.height : 4;
        const topOfObstacle = obs.position.y + height / 2;
        
        // 障害物の水平位置
        const obstacleHorizontalBox = new THREE.Box2(
            new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z), 
            new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z)
        );

        if (horizontalBox.intersectsBox(obstacleHorizontalBox)) {
            // プレイヤーの足元が障害物の上または少し上にある場合
            if (feetY >= topOfObstacle - 0.1) { // わずかな誤差を許容
                // 最も高い着地点を優先
                if (topOfObstacle > currentGroundY) {
                    currentGroundY = topOfObstacle;
                }
            }
        }
    }
    return currentGroundY + objectBodyHeight / 2; // オブジェクトの中心Y座標としての着地位置
}

// Feet-based ground Y (for rigs whose origin is at the feet, e.g. AI/character groups)
function getGroundSurfaceY(position) {
    let currentGroundY = -FLOOR_HEIGHT;
    const horizontalBox = new THREE.Box2(
        new THREE.Vector2(position.x - 0.25, position.z - 0.25),
        new THREE.Vector2(position.x + 0.25, position.z + 0.25)
    );
    for (const obs of obstacles) {
        if (obs.userData.isWall) continue;
        
        // 家の屋根は完全に無視
        if (obs.userData.isHouseRoof) continue;
        
        // 屋上の床の場合は特別処理（家の屋根は含めない）
        if (obs.userData.isRooftop && !obs.userData.isHouseRoof) {
            const obstacleBox = new THREE.Box3().setFromObject(obs);
            const obstacleHorizontalBox = new THREE.Box2(
                new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z),
                new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z)
            );
            if (horizontalBox.intersectsBox(obstacleHorizontalBox)) {
                const rooftopY = obs.position.y;
                if (rooftopY > currentGroundY) currentGroundY = rooftopY;
            }
            continue;
        }
        
        const obstacleBox = new THREE.Box3().setFromObject(obs);
        // 空洞建物の場合、床のジオメトリーから高さを取得
        const geometry = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
        const height = geometry ? geometry.parameters.height : 4;
        const topOfObstacle = obs.position.y + height / 2;
        const obstacleHorizontalBox = new THREE.Box2(
            new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z),
            new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z)
        );
        if (horizontalBox.intersectsBox(obstacleHorizontalBox)) {
            if (topOfObstacle > currentGroundY) currentGroundY = topOfObstacle;
        }
    }
    return currentGroundY;
}

// プレイヤーが障害物にめり込んでいる場合に、外側に押し出す関数
function resolvePlayerCollision(playerObj, obstaclesArray, pushOutDistance = 0.05) { // pushOutDistanceを少し小さく設定
    let playerBoundingBox;
    if (playerObj === player) {
        const pos = playerObj.position;
        playerBoundingBox = new THREE.Box3();
        // checkCollision と同じロジックでバウンディングボックスを定義
        playerBoundingBox.min.set(pos.x - 0.2, pos.y - playerTargetHeight, pos.z - 0.2);
        playerBoundingBox.max.set(pos.x + 0.2, pos.y, pos.z + 0.2);
    } else {
        // AIなどの場合は既存のロジックを維持
        playerBoundingBox = new THREE.Box3().setFromObject(playerObj);
    }

    let resolved = false;

    for (const obstacle of obstaclesArray) {
        // 梯子昇降中のタワーや、屋上床は衝突判定から除外（家の屋根は含めない）
        if (obstacle.userData.isRooftop && !obstacle.userData.isHouseRoof) continue;
        // 梯子を登っている最中は、そのタワーとは衝突しないようにする
        if (obstacle.userData.isTower && playerObj === player && isIgnoringTowerCollision && obstacle === lastClimbedTower) {
            continue;
        }
        // 屋上にいる場合は、登った塔との衝突を無視
        if (obstacle.userData.isTower && playerObj === player && player.userData.onRooftop && obstacle === player.userData.lastClimbedTower) {
            continue;
        }
        // 屋上にいる場合は、梯子との衝突も無視
        if (playerObj === player && player.userData.onRooftop && obstacle.userData.isLadder) {
            continue;
        }

        const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle);

        if (playerBoundingBox.intersectsBox(obstacleBoundingBox)) {
            const overlap = playerBoundingBox.intersect(obstacleBoundingBox);
            
            const overlapX = overlap.max.x - overlap.min.x;
            const overlapY = overlap.max.y - overlap.min.y;
            const overlapZ = overlap.max.z - overlap.min.z;

            // X-Z平面での最小オーバーラップ軸を見つける
            // プレイヤーが障害物の上にいる場合（Y軸のオーバーラップが大きい場合）は、XまたはZで押し出す。
            // 逆に、Y軸のオーバーラップが小さい場合は、垂直方向の衝突とみなし、ここでは水平方向の解決を優先する。
            let minHorizontalOverlap = Math.min(overlapX, overlapZ);
            let pushVector = new THREE.Vector3();

            // プレイヤーの中心と障害物の中心を比較して押し出す方向を決定
            const playerCenter = playerBoundingBox.getCenter(new THREE.Vector3());
            const obstacleCenter = obstacleBoundingBox.getCenter(new THREE.Vector3());

            if (minHorizontalOverlap === overlapX && overlapX > 0.001) { // わずかなオーバーラップも考慮
                const pushAmount = overlapX / 2 + pushOutDistance;
                pushVector.x = (playerCenter.x < obstacleCenter.x) ? -pushAmount : pushAmount;
            } 
            else if (minHorizontalOverlap === overlapZ && overlapZ > 0.001) { // わずかなオーバーラップも考慮
                const pushAmount = overlapZ / 2 + pushOutDistance;
                pushVector.z = (playerCenter.z < obstacleCenter.z) ? -pushAmount : pushAmount;
            }
            
            if (pushVector.lengthSq() > 0) { // 押し出しベクトルが0でなければ適用
                playerObj.position.add(pushVector);
                resolved = true;
            }
            // 複数衝突する場合でも、一度解決を試みる
            // ただし、一度に複数の衝突を解決しようとすると、かえって不安定になる可能性があるため、
            // ここでは一つの衝突解決でbreakし、animateループで再度チェックするアプローチとする
            break; 
        }
    }
    return resolved;
}

function showSettingsAndPause() {
    if (!isGameRunning && !isPaused) return;

    forceResetTouchState();
    isGameRunning = false;
    if (!isPaused) {
        originalSettings = JSON.parse(JSON.stringify(gameSettings));
    }
    isPaused = true;

    document.exitPointerLock();

    const elementsToHide = ['joystick-move', 'fire-button', 'crouch-button', 'zoom-button', 'crosshair', 'scope-overlay', 'kill-count-display', 'player-hp-display', 'player-weapon-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'pause-button'];
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    startScreen.style.display = 'flex';
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('resume-game-btn').style.display = 'inline-block';
    document.getElementById('restart-pause-btn').style.display = 'inline-block';
    
    // Update unified map selector to show current map
    updateUnifiedMapSelector();
}

function resumeGame() {
    debugLog('resumeGame() called');
    const settingsChanged = JSON.stringify(originalSettings) !== JSON.stringify(gameSettings);

    startScreen.style.display = 'none';
    document.getElementById('resume-game-btn').style.display = 'none';
    document.getElementById('restart-pause-btn').style.display = 'none';
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

        if (shouldShowTouchControls()) {
            // resumeGame(): Mobile device detected. Setting UI to block/flex.
            const joy = document.getElementById('joystick-move');
            const fire = document.getElementById('fire-button');
            const crouch = document.getElementById('crouch-button');
            const zoom = document.getElementById('zoom-button');
            const pause = document.getElementById('pause-button');
            if (joy) { joy.style.display = 'block'; }
            if (fire) { fire.style.display = 'flex'; }
            if (crouch) { crouch.style.display = 'flex'; }
            if (zoom) { zoom.style.display = 'flex'; }
            if (pause) { pause.style.display = 'block'; }
        } else {
            // resumeGame(): PC device detected.
            const joy = document.getElementById('joystick-move');
            const fire = document.getElementById('fire-button');
            const crouch = document.getElementById('crouch-button');
            const zoom = document.getElementById('zoom-button');
            if (joy) { joy.style.display = 'none'; }
            if (fire) { fire.style.display = 'none'; }
            if (crouch) { crouch.style.display = 'none'; }
            if (zoom) { zoom.style.display = 'none'; }
            canvas.requestPointerLock();
        }
        enforceTouchUIVisibility();

        isGameRunning = true;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (window.justRestarted) {
        window.justRestarted = false;
    }

    enforceTouchUIVisibility();

    if (isPlayerDeathPlaying) {
        playerDeathLookAt = getPlayerDeathLookAt();
        if (playerDeathCamOffset) {
            cinematicCamera.position.copy(playerDeathLookAt.clone().add(playerDeathCamOffset));
        }
        cinematicCamera.lookAt(playerDeathLookAt);
        cinematicCamera.updateProjectionMatrix();
        TWEEN.update();
        renderer.render(scene, cinematicCamera);
        return;
    }
    
    if (!isGameRunning) {
        // ゲームが実行中でない場合は最小限の処理のみ
        renderer.render(scene, camera);
        return;
    }

    // Breadcrumb dropping logic
    if (isGameRunning) {
        timeSinceLastBreadcrumb += delta;
        if (timeSinceLastBreadcrumb > 0.25) {
            playerBreadcrumbs.push(player.position.clone());
            if (playerBreadcrumbs.length > 100) {
                playerBreadcrumbs.shift(); // Keep the array size limited
            }
            timeSinceLastBreadcrumb = 0;
        }
    }

    if (isIgnoringTowerCollision) {
        ignoreTowerTimer -= delta;
        if (ignoreTowerTimer <= 0) {
            isIgnoringTowerCollision = false;
            lastClimbedTower = null;
        }
    }
    const timeElapsed = clock.getElapsedTime();
    const isTeamModeOrTeamArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';

    // 定期的に浮遊屋根パーツをクリーンアップ
    if (typeof lastFloatingCleanupTime === 'undefined') {
        lastFloatingCleanupTime = timeElapsed;
        // すべてのマップタイプで即時クリーンアップを実行
        debugLog('Initial cleanup - forcing complete scene reset...');
        forceSceneReset();
    }
    if (timeElapsed - lastFloatingCleanupTime > 10.0) { // 10秒ごとに軽量クリーンアップ
        debugLog('Periodic cleanup - using lightweight cleanup...');
        const removedCount = cleanupFloatingRooftopParts(); // 軽量なクリーンアップを使用
        lastFloatingCleanupTime = timeElapsed;
    }

    // Player MG reload completion (needs to run even when not firing)
    if (playerMGReloadUntil > 0 && timeElapsed >= playerMGReloadUntil) {
        playerMGReloadUntil = 0;
        if (gameSettings.defaultWeapon === WEAPON_MG) {
            ammoMG = MAX_AMMO_MG;
            hideReloadingText();
        }
    }
    if (playerMRReloadUntil > 0 && timeElapsed >= playerMRReloadUntil) {
        playerMRReloadUntil = 0;
        const nextClip = isDefaultM1Weapon() ? MAX_AMMO_MR : Math.min(MAX_AMMO_MR, ammoMR);
        setPlayerMRClipAmmo(nextClip);
        hideReloadingText();
    }
    
    // Crouching state change adjustment
    const oldPlayerTargetHeight = playerTargetHeight;
    // プレイヤー当たり判定/拾得判定が崩れない高さに固定
    const playerStandingHeight = 2.0;
    const playerCrouchHeight = 0.9;
    playerTargetHeight = isCrouchingToggle ? playerCrouchHeight : playerStandingHeight;
    // しゃがむ/立つときに高さを即座に反映させる
    if (playerTargetHeight < oldPlayerTargetHeight) { // Crouching down
        player.position.y -= oldPlayerTargetHeight - playerTargetHeight;
    } else if (playerTargetHeight > oldPlayerTargetHeight) { // Standing up
        player.position.y += playerTargetHeight - oldPlayerTargetHeight;
    }

    const currentMoveSpeed = (isCrouchingToggle || isRifleZoomed) ? moveSpeed / 2 : moveSpeed;
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
        playerDeathLookAt = getPlayerDeathLookAt();
        if (playerDeathCamOffset) {
            cinematicCamera.position.copy(playerDeathLookAt.clone().add(playerDeathCamOffset));
        }
        cinematicCamera.lookAt(playerDeathLookAt);
        cinematicCamera.updateProjectionMatrix();
        TWEEN.update();
        renderer.render(scene, cinematicCamera);
        return;
    }

    if (!isGameRunning) {
        renderer.render(scene, camera);
        return;
    }

    // プレイヤーモデルを常に非表示にする
    if (playerModel) {
        playerModel.visible = false;
    }
    if (playerWeaponDisplay) { // グローバル変数を使用し、nullチェック
        let weaponName = currentWeapon;
        let ammoCount = 0;
        switch (currentWeapon) {
            case WEAPON_MG: weaponName = 'Machinegun'; ammoCount = ammoMG; break;
            case WEAPON_RR: weaponName = 'Rocket'; ammoCount = ammoRR; break;
            case WEAPON_SR: weaponName = 'Sniper'; ammoCount = ammoSR; break;
            case WEAPON_SG: weaponName = 'Shotgun'; ammoCount = ammoSG; break;
            case WEAPON_MR: weaponName = 'M1 Rifle'; ammoCount = getPlayerMRDisplayAmmo(); break;
            case WEAPON_PISTOL: weaponName = 'Pistol'; ammoCount = '∞'; break;
        }
        playerWeaponDisplay.innerHTML = `Weapon: ${weaponName}<br>Ammo: ${ammoCount}`; // playerWeaponDisplayを使用
    }
    if (isRifleZoomed && currentWeapon !== WEAPON_MR) {
        setRifleZoom(false);
    }
    if (isMouseButtonDown && (currentWeapon === WEAPON_MG || currentWeapon === WEAPON_SG || currentWeapon === WEAPON_MR)) {
        shoot();
    }
    updateCrosshairForWeapon();
    if (isScoping) {
        document.getElementById('crosshair').style.display = 'none';
        updateSniperScopeAutoAim(delta);
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
    
    // デバッグ: キーボード移動ベクトルをログ
    if (keyboardMoveVector.length() > 0) {
        debugLog('Keyboard move vector:', keyboardMoveVector, 'keys:', Array.from(keySet));
    }
    
    let finalMoveVector = joystickMoveVector.length() > 0 ? joystickMoveVector.clone() : keyboardMoveVector.clone();

    if (finalMoveVector.length() > 0) finalMoveVector.normalize();
    // リスポーン直後の移動を強制的に停止させる
    if (window.justRestarted || isPlayerDeathPlaying || isElevating) {
        debugLog('Movement blocked - justRestarted:', window.justRestarted, 'isPlayerDeathPlaying:', isPlayerDeathPlaying, 'isElevating:', isElevating);
        finalMoveVector.set(0, 0); // 移動を強制的にキャンセル
        keyboardMoveVector.set(0, 0); // 念のためキーボード移動もリセット
        joystickMoveVector.set(0, 0); // 念のためジョイスティック移動もリセット
        // isPlayerDeathPlayingはプレイヤー死亡中、isElevatingは梯子昇降中なので、その間は移動させない
    }
    const forwardMove = finalMoveVector.y * currentMoveSpeed * delta;
    const rightMove = finalMoveVector.x * currentMoveSpeed * delta;

    const moveDirection = new THREE.Vector3(rightMove, 0, -forwardMove);

    moveDirection.applyQuaternion(player.quaternion);

    if (isElevating) {
        const elevateSpeed = 5.0;
        player.position.y += elevateSpeed * delta;
        if (player.position.y >= elevatingTargetY) {
            // debugLog('Climb completed! Dropping to rooftop...');
            player.position.y = elevatingTargetY;
            isElevating = false;
            // debugLog('isElevating set to false');
            isIgnoringTowerCollision = true;
            ignoreTowerTimer = 5.0; // Extended to 5.0s for permanent rooftop safety
            lastClimbedTower = elevatingTargetObstacle;
            isCrouchingToggle = false; // 強制的に立ち状態に
            
            // Let player drop naturally to rooftop - no forward push
            // debugLog('Dropping from height to rooftop');
            
            // Mark player as being on rooftop for permanent collision ignoring
            player.userData.onRooftop = true;
            player.userData.lastClimbedTower = elevatingTargetObstacle;
            
            // Enable gravity to drop naturally
            playerVelocityY = 0; // Reset velocity and let gravity take over
        }    } else {
        let inSensorArea = false;
        const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(player.position.clone().add(new THREE.Vector3(0, playerTargetHeight / 2, 0)), new THREE.Vector3(1, playerTargetHeight, 1));
        for (const sensorArea of ladderSwitches) {
            const sensorBoundingBox = new THREE.Box3().setFromObject(sensorArea);
            if (playerBoundingBox.intersectsBox(sensorBoundingBox)) {
                // debugLog('Ladder detected! Starting climb...');
                inSensorArea = true; const obs = sensorArea.userData.obstacle;
                isElevating = true;
                elevatingTargetObstacle = obs;
                // 空洞建物の場合、床のジオメトリーから高さを取得
                const geometry = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
                const height = geometry ? geometry.parameters.height : 4;
                elevatingTargetY = (obs.position.y + height / 2) + 4.0; // Increased from 2.0 to 4.0
                const ladderPos = sensorArea.userData.ladderPos;
                if (ladderPos) {
                    player.position.x = ladderPos.x;
                    player.position.z = ladderPos.z;
                }
                break;
            }
        }
        if (!inSensorArea || player.userData.onRooftop) {
            // debugLog('Movement check - inSensorArea:', inSensorArea, 'onRooftop:', player.userData.onRooftop);
            if (player.userData.onRooftop) {
                // debugLog('On rooftop - allowing movement');
            }
            if (finalMoveVector.length() > 0) {
                // debugLog('Input detected - finalMoveVector length:', finalMoveVector.length());
                finalMoveVector.normalize();
            } else {
                // debugLog('No input detected');
            }
            const forwardMove = finalMoveVector.y * currentMoveSpeed * delta;
            const rightMove = finalMoveVector.x * currentMoveSpeed * delta;
            const oldPlayerPosition = player.position.clone();
            const forwardVector = new THREE.Vector3();
            player.getWorldDirection(forwardVector);
            forwardVector.y = 0;
            forwardVector.normalize();
            const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardVector);
            let moveX = rightVector.x * rightMove + forwardVector.x * -forwardMove;
            let moveZ = rightVector.z * rightMove + forwardVector.z * -forwardMove;
            
            // debugLog('Movement calculated - moveX:', moveX, 'moveZ:', moveZ);
            
            const ignoreObstacle = isIgnoringTowerCollision ? lastClimbedTower : currentGroundObstacle;

            // 薄い壁のすり抜け対策：移動ベクトルのスイープチェック
            const moveVec = new THREE.Vector3(moveX, 0, moveZ);
            const moveLen = moveVec.length();
            if (moveLen > 0) {
                const origin = player.position.clone().add(new THREE.Vector3(0, playerTargetHeight * 0.5, 0));
                const dir = moveVec.clone().normalize();
                raycaster.set(origin, dir);
                raycaster.far = moveLen + 0.35;
                const hits = raycaster.intersectObjects(obstacles, true);
                let blockingHit = null;
                for (const hit of hits) {
                    const obj = hit.object;
                    if (obj.userData && obj.userData.isRooftop && !obj.userData.isHouseRoof) continue;
                    if (obj.userData && obj.userData.isLadder && player.userData.onRooftop) continue;
                    if (obj === ignoreObstacle) continue;
                    blockingHit = hit;
                    break;
                }
                if (blockingHit && blockingHit.distance < moveLen + 0.35) {
                    const safeLen = Math.max(0, blockingHit.distance - 0.35);
                    if (safeLen < moveLen) {
                        const scale = safeLen / moveLen;
                        moveX *= scale;
                        moveZ *= scale;
                    }
                }
            }

            // まず、プレイヤーのXとZの位置を更新
            player.position.x += moveX;
            player.position.z += moveZ;
            
            // 屋上にいる場合はY座標を地面高さに更新
            if (player.userData.onRooftop) {
                const groundY = getGroundSurfaceY(player.position);
                if (groundY > -FLOOR_HEIGHT) {
                    player.position.y = groundY;
                } else {
                    // 地面高さが低すぎる場合は屋上状態を解除
                    player.userData.onRooftop = false;
                    player.userData.lastClimbedTower = null;
                }
            }

            // 新しい位置で衝突があるかチェックし、あれば解決を試みる
            if (checkCollision(player, obstacles, ignoreObstacle)) {
                // debugLog('Collision detected, resolving...');
                // 屋上にいる場合は押し出し距離を増やす
                const pushDistance = player.userData.onRooftop ? 0.2 : 0.05;
                // debugLog('Using push distance:', pushDistance);
                // 衝突解決を試みる。resolvePlayerCollisionはplayer.positionを直接変更する
                const collisionResolved = resolvePlayerCollision(player, obstacles, pushDistance);

                // もし衝突解決後もまだ衝突している場合は、元の位置に戻す
                // これはresolvePlayerCollisionが全ての衝突を一度に解決できない場合のフォールバック
                if (!collisionResolved || checkCollision(player, obstacles, ignoreObstacle)) {
                    debugLog('Collision resolution failed, reverting to old position');
                    debugLog('Old position:', oldPlayerPosition);
                    debugLog('Current position before revert:', player.position);
                    player.position.copy(oldPlayerPosition); 
                    debugLog('Position after revert:', player.position);
                } else {
                    debugLog('Collision resolved successfully');
                }
            } else {
                debugLog('No collision detected');
            }
            debugLog('Final position after movement:', player.position);
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

            // Use a lenient tolerance after climbing or on a rooftop, otherwise use a strict one.
            let yTolerance = 0.5;
            if (isIgnoringTowerCollision || (currentGroundObstacle && currentGroundObstacle.userData.isRooftop && !currentGroundObstacle.userData.isHouseRoof)) {
                yTolerance = 2.0;
            }

            for (const obs of obstacles) {
                const obstacleBox = new THREE.Box3().setFromObject(obs);
                // 空洞建物の場合、床のジオメトリーから高さを取得
                const geometry = obs.geometry || (obs.children && obs.children[0] ? obs.children[0].geometry : null);
                const height = geometry ? geometry.parameters.height : 4;
                const topOfObstacle = obs.position.y + height / 2;
                const playerHorizontalBox = new THREE.Box2(new THREE.Vector2(player.position.x - 0.5, player.position.z - 0.5), new THREE.Vector2(player.position.x + 0.5, player.position.z + 0.5));
                const obstacleHorizontalBox = new THREE.Box2(new THREE.Vector2(obstacleBox.min.x, obstacleBox.min.z), new THREE.Vector2(obstacleBox.max.x, obstacleBox.max.z));
                if (playerHorizontalBox.intersectsBox(obstacleHorizontalBox)) {
                    if (((obs.userData.isRooftop && !obs.userData.isHouseRoof) || !obs.userData.isWall) && playerFeetY >= topOfObstacle - yTolerance && playerFeetY <= topOfObstacle + 1.0) {
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
                if (currentGroundObstacle && currentGroundObstacle.userData.isRooftop && !currentGroundObstacle.userData.isHouseRoof) {
                                    // 空洞建物の場合、床のジオメトリーから高さを取得
                                    const geometry = currentGroundObstacle.geometry || (currentGroundObstacle.children && currentGroundObstacle.children[0] ? currentGroundObstacle.children[0].geometry : null);
                                    const height = geometry ? geometry.parameters.height : 4;
                                    const rooftopY = currentGroundObstacle.position.y + height / 2;
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
                    case WEAPON_MR:
                        {
                            const isDefaultM1 = isDefaultM1Weapon();
                            const wasUsingM1 = currentWeapon === WEAPON_MR;
                            if (!wasUsingM1) currentWeapon = WEAPON_MR;

                            if (!isDefaultM1) {
                                ammoMR += PICKUP_AMMO_MR;
                                if (!wasUsingM1) {
                                    ammoMRClip = Math.min(MAX_AMMO_MR, ammoMR);
                                } else if (ammoMRClip <= 0 && playerMRReloadUntil <= 0) {
                                    ammoMRClip = Math.min(MAX_AMMO_MR, ammoMR);
                                }
                            }

                            weaponName = 'M1 RIFLE';
                            break;
                        }
                }
                const setSound = document.getElementById('setSound');
                if (setSound) playSound(setSound);
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
                if (setSound) playSound(setSound);
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
                const weaponText = respawnItem.weaponType === WEAPON_MG ? 'MG'
                    : respawnItem.weaponType === WEAPON_RR ? 'RL'
                    : respawnItem.weaponType === WEAPON_SR ? 'SR'
                    : respawnItem.weaponType === WEAPON_MR ? 'MR'
                    : 'SG';
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
    for (let i = respawningBarrels.length - 1; i >= 0; i--) {
        const respawnBarrel = respawningBarrels[i];
        if (timeElapsed >= respawnBarrel.respawnTime) {
            createExplosiveBarrel(respawnBarrel.x, respawnBarrel.z, respawnBarrel.color, respawnBarrel.radius, respawnBarrel.height);
            respawningBarrels.splice(i, 1);
        }
    }
    const AI_SEPARATION_FORCE = 2.0;
    ais.forEach((ai, index) => {
        if (ai.hp <= 0 && gameSettings.gameMode !== 'arcade') {
            ai.visible = false; // Just in case
            return;
        }
        const aiStartPos = ai.position.clone();

        // AI MG reload completion
        if (ai.userData && ai.userData.mgReloadUntil && timeElapsed >= ai.userData.mgReloadUntil) {
            ai.userData.mgReloadUntil = 0;
            ai.ammoMG = MAX_AMMO_MG;
        }
        if (ai.userData && ai.userData.mrReloadUntil && timeElapsed >= ai.userData.mrReloadUntil) {
            ai.userData.mrReloadUntil = 0;
            const nextClip = isAIDefaultM1Weapon(ai) ? MAX_AMMO_MR : Math.min(MAX_AMMO_MR, ai.ammoMR);
            setAIClipAmmo(ai, nextClip);
        }

        if ((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.hp > 0) {
            // Start-of-match combat enforcement: keep all AIs (ally + enemies) in combat immediately.
            if (timeElapsed < 2.5 && (ai.state === 'HIDING' || ai.state === 'FOLLOWING')) {
                ai.state = 'ATTACKING';
                ai.currentAttackTime = timeElapsed;
                ai.lastAttackTime = -999;
                if (ai.userData) {
                    ai.userData.nextPerceptionTime = 0;
                    ai.userData.cachedVisibleOpponentInfo = null;
                    ai.userData.cachedIsAISeen = false;
                }
            }
            // Also correct initial facing so AIs don't start looking outward.
            if (timeElapsed < 1.2) {
                const initTarget = getClosestOpponentPosition(ai);
                if (initTarget) {
                    ai.targetPosition.copy(initTarget);
                    ai.rotation.y = Math.atan2(initTarget.x - ai.position.x, initTarget.z - ai.position.z);
                }
            }
        }

        if (ai.state === 'MOVING_TO_LADDER' || ai.state === 'CLIMBING' || ai.state === 'ROOFTOP_COMBAT' || ai.state === 'DESCENDING') {
            ai.state = 'MOVING';
        }
        if (!ENABLE_AI_ROOFTOP_LOGIC && (ai.userData.rooftopPhase || 'none') !== 'none') {
            ai.state = 'ATTACKING';
            ai.isElevating = false;
            ai.userData.rooftopIntent = false;
            ai.userData.onRooftop = false;
            ai.userData.rooftopSensor = null;
            ai.userData.rooftopObstacle = null;
            ai.userData.rooftopLadderPos = null;
            ai.userData.rooftopDecisionMade = false;
            ai.userData.rooftopPhase = 'none';
        }
        const currentAISpeed = ai.isCrouching ? AI_SPEED / 2 : AI_SPEED;
        const separation_vec = new THREE.Vector3(0, 0, 0);

        // ais.forEachループ内で一度だけ定義
        const isTeammateInTeamModeOrArcade = (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.team === 'player';

        // FOLLOWING_PLAYER ロジック
        if (isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false) {
            const playerPos = player.position.clone();
            const avoidLockActive = ai.avoiding && ai.userData && ai.userData.avoidUntil && timeElapsed < ai.userData.avoidUntil;
            if (ai.avoiding && ai.position.distanceTo(ai.targetPosition) < 0.7) {
                ai.avoiding = false;
                if (ai.userData) ai.userData.avoidUntil = 0;
            }

            // --- Aiming and Shooting Logic ---
            let targetToLookAt = player.position.clone(); // Default to looking at player
            let foundVisibleEnemy = false;
            
            for (const enemyAI of ais) {
                if (enemyAI.team !== 'enemy' || enemyAI.hp <= 0) continue;
                
                const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
                const enemyHeadPos = enemyAI.children[1].getWorldPosition(new THREE.Vector3());
                const enemyTorsoPos = getAIUpperTorsoPos(enemyAI);

                if (checkLineOfSight(aiHeadPos, enemyHeadPos, obstacles) || checkLineOfSight(aiHeadPos, enemyTorsoPos, obstacles)) {
                    foundVisibleEnemy = true;
                    targetToLookAt = enemyAI.position.clone();
                    break;
                }
            }

            if (foundVisibleEnemy) {
                ai.userData.followCombatUntil = timeElapsed + 2.2;
                ai.state = 'ATTACKING';
                if (!ai.currentAttackTime) ai.currentAttackTime = timeElapsed;
                aiShoot(ai, timeElapsed);
            } else if (!avoidLockActive) {
                const combatUntil = (ai.userData && ai.userData.followCombatUntil) ? ai.userData.followCombatUntil : 0;
                if (combatUntil > timeElapsed) {
                    ai.state = 'ATTACKING';
                } else {
                    ai.state = 'FOLLOWING';
                }
                if (ai.targetWeaponPickup && !ai.targetWeaponPickup.parent) {
                    ai.targetWeaponPickup = null;
                }
                if (!foundVisibleEnemy && combatUntil <= timeElapsed && !ai.targetWeaponPickup && findAndTargetWeapon(ai)) {
                    ai.state = 'MOVING';
                }
                if (ai.state === 'MOVING') {
                    targetToLookAt.copy(ai.targetPosition);
                } else {
                // 常にプレイヤー後方のスロットを追う（見失い対策はパンくず）
                const desiredBehindPos = getFollowSlotPosition(ai);
                // プレイヤーに近すぎると重なって見えなくなるため最低距離を維持
                const minFollowDistance = 4.0;
                const vecFromPlayer = desiredBehindPos.clone().sub(playerPos);
                if (vecFromPlayer.lengthSq() > 1e-6 && ai.position.distanceTo(playerPos) < minFollowDistance) {
                    vecFromPlayer.normalize();
                    desiredBehindPos.copy(playerPos).add(vecFromPlayer.multiplyScalar(minFollowDistance + 1.8));
                    desiredBehindPos.y = -FLOOR_HEIGHT;
                }
                const aiHeadPos = ai.children[1].getWorldPosition(new THREE.Vector3());
                const desiredHeadPos = desiredBehindPos.clone().add(new THREE.Vector3(0, 1.0, 0));

                if (checkLineOfSight(aiHeadPos, desiredHeadPos, obstacles)) {
                    ai.targetPosition.lerp(desiredBehindPos, 0.35);
                } else {
                    let foundCrumb = false;
                    for (let i = playerBreadcrumbs.length - 1; i >= 0; i--) {
                        const crumb = playerBreadcrumbs[i];
                        const crumbDistToPlayer = crumb.distanceTo(playerPos);
                        if (crumbDistToPlayer >= 4.2 && checkLineOfSight(aiHeadPos, crumb, obstacles)) {
                            ai.targetPosition.copy(crumb);
                            foundCrumb = true;
                            break;
                        }
                    }
                    if (!foundCrumb) {
                        ai.targetPosition.copy(desiredBehindPos);
                    }
                }
                targetToLookAt.copy(playerPos);
                }
            }

            // follow中は基本プレイヤー向き（敵視認時は上で切替）
            const targetAngle = Math.atan2(targetToLookAt.x - ai.position.x, targetToLookAt.z - ai.position.z);
            ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 5 * delta);
            
        } else if (isTeammateInTeamModeOrArcade && !isFollowingPlayerMode && ai.state === 'FOLLOWING') {
            // AIチームメイトだが追従モードがOFFになり、かつ現在の状態がFOLLOWINGの場合、HIDINGに戻す
            ai.state = 'HIDING';
            ai.lastHiddenTime = timeElapsed;
        }        ais.forEach((otherAI, otherIndex) => {
            if (index === otherIndex) return;
            const distance = ai.position.distanceTo(otherAI.position);
            if (distance < MIN_DISTANCE_BETWEEN_AIS_AT_SPOT) {
                const repulsion = new THREE.Vector3().subVectors(ai.position, otherAI.position);
                if (repulsion.lengthSq() > 0) { // Prevent NaN from normalize() if distance is 0
                    const strength = (MIN_DISTANCE_BETWEEN_AIS_AT_SPOT - distance) / MIN_DISTANCE_BETWEEN_AIS_AT_SPOT;
                    separation_vec.add(repulsion.normalize().multiplyScalar(strength));
                }
            }
        });
        separation_vec.multiplyScalar(delta * AI_SEPARATION_FORCE);
        aiCheckPickup(ai);
        let visibleOpponentInfo = ai.userData.cachedVisibleOpponentInfo;
        let isAISeen = !!ai.userData.cachedIsAISeen;
            if (timeElapsed >= (ai.userData.nextPerceptionTime || 0)) {
            // Reduce frequency of LOS checks to lower CPU by spacing updates (~180-240ms)
            visibleOpponentInfo = getVisibleOpponentInfo(ai);
            isAISeen = !!visibleOpponentInfo;
            ai.userData.cachedVisibleOpponentInfo = visibleOpponentInfo;
            ai.userData.cachedIsAISeen = isAISeen;
            ai.userData.nextPerceptionTime = timeElapsed + 0.18 + Math.random() * 0.06;
        }
        if (visibleOpponentInfo) {
            ai.lastSeenEnemyTime = timeElapsed;
            ai.lastKnownEnemyPos = visibleOpponentInfo.targetPos.clone();
        }

        // Make teammates more proactive: if a teammate is idle (HIDING or FOLLOWING when not following),
        // pulse them to search/move toward the nearest opponent or patrol point.
        if (isTeammateInTeamModeOrArcade && !isFollowingPlayerMode && (ai.state === 'HIDING' || ai.state === 'FOLLOWING') && timeElapsed >= (ai.userData.searchPulseAt || 0)) {
            const close = getClosestOpponentPosition(ai);
            if (close) {
                ai.state = 'MOVING';
                ai.targetPosition.copy(close);
            } else {
                // No nearby opponent: pick a short patrol near player
                const ang = Math.random() * Math.PI * 2;
                const r = 6 + Math.random() * 6;
                const patrol = player.position.clone().add(new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r));
                patrol.y = getGroundSurfaceY(patrol);
                ai.state = 'MOVING';
                ai.targetPosition.copy(patrol);
            }
            ai.userData.searchPulseAt = timeElapsed + 0.6; // pulse every 0.6s
        }

        // Fallback: if a teammate remains HIDING/FOLLOWING (not following player) for too long,
        // force them to move to a nearby opponent or patrol point to avoid staying idle.
        if (isTeammateInTeamModeOrArcade && !isFollowingPlayerMode && (ai.state === 'HIDING' || ai.state === 'FOLLOWING')) {
            const stuckDuration = timeElapsed - (ai.lastHiddenTime || 0);
            if (stuckDuration > 2.5) {
                const close = getClosestOpponentPosition(ai);
                if (close) {
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(close);
                } else {
                    const ang = Math.random() * Math.PI * 2;
                    const r = 6 + Math.random() * 6;
                    const patrol = player.position.clone().add(new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r));
                    patrol.y = getGroundSurfaceY(patrol);
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(patrol);
                }
                ai.userData.searchPulseAt = timeElapsed + 0.9;
                ai.lastHiddenTime = timeElapsed - 0.1; // reset a little to avoid immediate re-trigger
            }
        }

        const underFireRecently = (timeElapsed - (ai.lastUnderFireTime || -999)) < 1.1;
        const isFollowLockedTeammate = isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false;

        if (ENABLE_EXPERIMENTAL_AI_FLOW) {
            // Proactive search: prevents "standing still until shot".
            if (!isFollowLockedTeammate && !isAISeen && !ai.isElevating) {
                const lockedRooftopState = ai.state === 'MOVING_TO_LADDER' || ai.state === 'CLIMBING' || ai.state === 'ROOFTOP_COMBAT' || ai.state === 'DESCENDING';
                if (!lockedRooftopState && timeElapsed >= (ai.userData.searchPulseAt || 0)) {
                    const huntPosBase = ai.lastKnownEnemyPos || getClosestOpponentPosition(ai);
                    if (huntPosBase) {
                        const huntPos = huntPosBase.clone();
                        huntPos.x += (Math.random() - 0.5) * 2.5;
                        huntPos.z += (Math.random() - 0.5) * 2.5;
                        huntPos.y = getGroundSurfaceY(huntPos);
                        ai.state = 'MOVING';
                        ai.targetPosition.copy(huntPos);
                    } else {
                        ai.state = 'ATTACKING';
                        ai.currentAttackTime = timeElapsed;
                        ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                    }
                    ai.userData.searchPulseAt = timeElapsed + 1.1 + Math.random() * 0.8;
                }
            } else if (isAISeen) {
                ai.userData.searchPulseAt = timeElapsed + 1.4;
            }
        }

        // Rooftop behavior decision (weapon-based probability; both enemy and teammate AI)
        if (ENABLE_AI_ROOFTOP_LOGIC) {
            tryAssignAIRooftopGoal(ai, timeElapsed, isFollowLockedTeammate);
        }

        if (ENABLE_AI_ROOFTOP_LOGIC && ai.userData.rooftopPhase === 'to_ladder') {
            if (!ai.userData.rooftopLadderPos || !ai.userData.rooftopObstacle) {
                ai.userData.rooftopIntent = false;
                ai.userData.rooftopPhase = 'none';
            } else {
                if ((timeElapsed - (ai.userData.rooftopStateSince || timeElapsed)) > 6.0) {
                    ai.userData.rooftopIntent = false;
                    ai.userData.rooftopPhase = 'none';
                    ai.userData.nextRooftopDecisionAt = timeElapsed + 3.0;
                }
                ai.state = 'MOVING';
                ai.targetPosition.copy(ai.userData.rooftopLadderPos);
                ai.targetPosition.y = getGroundSurfaceY(ai.targetPosition);
                if (ai.position.distanceTo(ai.targetPosition) < 0.8) {
                    const ladderSnap = ai.userData.rooftopLadderSnap || ai.userData.rooftopSensor?.userData?.ladderPos || ai.userData.rooftopLadderPos;
                    // 梯子にスムーズに接続するために位置を補完
                    ai.position.x += (ladderSnap.x - ai.position.x) * 0.5;
                    ai.position.z += (ladderSnap.z - ai.position.z) * 0.5;
                    ai.isElevating = true;
                    ai.userData.elevatingDirection = 1;
                    // 空洞建物の場合、床のジオメトリーから高さを取得
                    const geometry = ai.userData.rooftopObstacle.geometry || (ai.userData.rooftopObstacle.children && ai.userData.rooftopObstacle.children[0] ? ai.userData.rooftopObstacle.children[0].geometry : null);
                    const height = geometry ? geometry.parameters.height : 4;
                    ai.userData.rooftopTargetY = ai.userData.rooftopObstacle.position.y + height / 2;
                    ai.userData.rooftopPhase = 'climbing';
                    ai.userData.rooftopStateSince = timeElapsed;
                }
            }
        }

        if (ENABLE_AI_ROOFTOP_LOGIC && ai.userData.rooftopPhase === 'on_roof') {
            ai.userData.onRooftop = true;
            ai.state = 'ATTACKING';
            aiShoot(ai, timeElapsed);
            if (!ai.userData.rooftopLeaveAt) {
                ai.userData.rooftopLeaveAt = timeElapsed + 6.0 + Math.random() * 4.0;
            }
            if (ai.userData.rooftopObstacle) {
                const c = ai.userData.rooftopObstacle.position;
                const halfW = (ai.userData.rooftopObstacle.geometry.parameters.width || 6) * 0.32;
                const halfD = (ai.userData.rooftopObstacle.geometry.parameters.depth || 6) * 0.32;
                ai.targetPosition.set(
                    c.x + (Math.random() - 0.5) * halfW,
                    ai.position.y,
                    c.z + (Math.random() - 0.5) * halfD
                );
            }
            // If AI runs out of ammo while on rooftop, force a descent.
            if (isAIWeaponOutOfAmmo(ai) && !ai.userData.rooftopDecisionMade) {
                ai.userData.rooftopDecisionMade = true;
                ai.userData.rooftopPhase = 'to_ground';
                ai.userData.rooftopStateSince = timeElapsed;
            }
            if (ai.userData.rooftopLeaveAt && timeElapsed > ai.userData.rooftopLeaveAt) {
                const canSee = canAISeeAnyOpponent(ai);
                if (canSee && (ai.currentWeapon === WEAPON_SR || ai.currentWeapon === WEAPON_MG)) {
                    ai.userData.rooftopLeaveAt = timeElapsed + 2.0;
                } else {
                    ai.userData.rooftopDecisionMade = true;
                    ai.userData.rooftopPhase = 'to_ground';
                    ai.userData.rooftopStateSince = timeElapsed;
                }
            }
        }

        if (ENABLE_AI_ROOFTOP_LOGIC && ai.userData.rooftopPhase === 'to_ground') {
            if (!ai.userData.rooftopLadderPos) {
                ai.userData.rooftopPhase = 'none';
                ai.userData.rooftopIntent = false;
                ai.userData.onRooftop = false;
            } else {
                ai.state = 'MOVING';
                ai.targetPosition.copy(ai.userData.rooftopLadderPos);
                ai.targetPosition.y = ai.position.y;
                const flatDist = new THREE.Vector3(ai.position.x - ai.targetPosition.x, 0, ai.position.z - ai.targetPosition.z).length();
                if (flatDist < 0.9) {
                    ai.isElevating = true;
                    ai.userData.elevatingDirection = -1;
                    ai.userData.rooftopTargetY = -FLOOR_HEIGHT;
                    ai.userData.rooftopPhase = 'descending';
                    ai.userData.rooftopStateSince = timeElapsed;
                }
            }
        }

        // AI vertical climb/descend animation via ladder
        if (ENABLE_AI_ROOFTOP_LOGIC && ai.isElevating) {
            const vDir = ai.userData.elevatingDirection || 1;
            const climbSpeed = 3.6;
            
            // 梯子登り中は水平位置を梯子に固定してふわふわを防止
            if (ai.userData.rooftopLadderSnap || ai.userData.rooftopLadderPos) {
                const snap = ai.userData.rooftopLadderSnap || ai.userData.rooftopLadderPos;
                const targetX = snap.x;
                const targetZ = snap.z;
                const lerpFactor = 0.15; // 滑らかに梯子位置に補完
                ai.position.x += (targetX - ai.position.x) * lerpFactor;
                ai.position.z += (targetZ - ai.position.z) * lerpFactor;
            }
            
            ai.position.y += vDir * climbSpeed * delta;
            ai.targetPosition.copy(ai.position);
            const targetY = ai.userData.rooftopTargetY ?? -FLOOR_HEIGHT;
            if ((vDir > 0 && ai.position.y >= targetY) || (vDir < 0 && ai.position.y <= targetY)) {
                ai.position.y = targetY;
                ai.isElevating = false;
                ai.userData.elevatingDirection = 0;
                if (vDir > 0) {
                    // 上昇完了時の安全チェック
                    if (targetY < 2 || !ai.userData.rooftopObstacle) {
                        // ルーフトップに到達できなかった場合、地上に戻す
                        ai.position.y = 0;
                        ai.targetPosition.y = 0;
                        ai.userData.rooftopIntent = false;
                        ai.userData.onRooftop = false;
                        ai.userData.rooftopPhase = 'none';
                        ai.state = 'ATTACKING';
                        ai.currentAttackTime = timeElapsed;
                    } else {
                        ai.userData.onRooftop = true;
                        ai.userData.rooftopIntent = true;
                        ai.userData.rooftopPhase = 'on_roof';
                        ai.userData.rooftopStateSince = timeElapsed;
                        ai.userData.rooftopDecisionMade = false;
                        ai.userData.rooftopLeaveAt = timeElapsed + 6.0 + Math.random() * 4.0;
                        if (ai.userData.rooftopObstacle) {
                            const ladderPos = ai.userData.rooftopLadderSnap || ai.userData.rooftopSensor?.userData?.ladderPos || ai.userData.rooftopLadderPos || ai.position.clone();
                            const landing = findSafeRooftopLanding(ai, ai.userData.rooftopObstacle, ladderPos);
                            ai.position.copy(landing);
                            ai.targetPosition.copy(landing);
                        }
                    }
                } else {
                    ai.userData.onRooftop = false;
                    ai.userData.rooftopIntent = false;
                    ai.userData.rooftopSensor = null;
                    ai.userData.rooftopObstacle = null;
                    ai.userData.rooftopLadderPos = null;
                    ai.userData.rooftopLadderSnap = null;
                    ai.userData.rooftopDecisionMade = false;
                    ai.userData.rooftopPhase = 'none';
                    ai.userData.rooftopStateSince = timeElapsed;
                    ai.userData.rooftopLeaveAt = 0;
                }
            }
        }

        if (!isFollowLockedTeammate && ai.state !== 'CLIMBING' && ai.state !== 'EVADING' && ai.state !== 'AVOIDING' && ai.state !== 'MOVING_TO_LADDER' && ai.state !== 'ROOFTOP_COMBAT' && ai.state !== 'DESCENDING') {
            if (underFireRecently && !isAISeen) {
                const threatPos = ai.lastKnownThreatPos || ai.lastKnownEnemyPos || getClosestOpponentPosition(ai);
                const coverPos = findSmartCoverPosition(ai, threatPos);
                if (coverPos) {
                    ai.state = 'EVADING';
                    ai.targetPosition.copy(coverPos);
                }
            } else if (!isAISeen && ai.state === 'ATTACKING') {
                if ((timeElapsed - (ai.lastSeenEnemyTime || -999)) < 2.0 && ai.lastKnownEnemyPos) {
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(ai.lastKnownEnemyPos);
                } else {
                    ai.state = 'HIDING';
                    ai.lastHiddenTime = timeElapsed;
                }
            }
        }
        if (isAISeen && ai.state !== 'ATTACKING' && ai.state !== 'CLIMBING' && ai.state !== 'EVADING' && ai.state !== 'AVOIDING' && ai.state !== 'MOVING_TO_LADDER' && ai.state !== 'ROOFTOP_COMBAT' && ai.state !== 'DESCENDING') {
            // 被弾直後は隠れることを優先
            if (ai.crouchUntilTime && timeElapsed < ai.crouchUntilTime) {
                // クールダウンチェック（0.5秒に1回まで）
                if (timeElapsed - ai.lastCoverSearchTime > 0.5) {
                    ai.lastCoverSearchTime = timeElapsed;
                    const nearbyCover = findNearbyCover(ai.position, obstacles);
                    if (nearbyCover) {
                        // 障害物の裏に移動
                        tempBox1.setFromObject(nearbyCover);
                        const coverCenter = tempBox1.getCenter(tempVector1);
                        tempVector2.copy(coverCenter).sub(ai.position);
                        const coverDistance = tempVector2.length();
                        
                        if (coverDistance > 1.0) {
                            // 障害物に近づく
                            const moveDirection = tempVector2.normalize();
                            tempVector3.copy(moveDirection).multiplyScalar(Math.min(coverDistance * 0.8, 2.0));
                            const targetPos = ai.position.clone().add(tempVector3);
                            ai.targetPosition.copy(targetPos);
                            ai.state = 'MOVING_TO_COVER';
                        } else {
                            // 障害物に到着したら攻撃準備
                            ai.state = 'ATTACKING';
                            ai.currentAttackTime = timeElapsed;
                            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                        }
                    } else {
                        ai.state = 'ATTACKING';
                        ai.currentAttackTime = timeElapsed;
                        ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                    }
                }
            } else {
                ai.state = 'ATTACKING';
                ai.currentAttackTime = timeElapsed;
                ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
            }
        }
        const distanceToTarget = ai.position.distanceTo(ai.targetPosition);
        const isArrived = distanceToTarget < ARRIVAL_THRESHOLD;
        const isMoving = !isArrived;
        if (ai.state !== 'CLIMBING' && ai.state !== 'DESCENDING' && !ai.isElevating) {
            if (ai.state === 'HIDING') {
                ai.isCrouching = true;
            } else if (ai.state === 'FOLLOWING') { // FOLLOWING状態ではしゃがまない
                ai.isCrouching = false;
            } else {
                // 戦術的しゃがみ：時間経過で解除
                if (ai.crouchUntilTime && timeElapsed > ai.crouchUntilTime) {
                    ai.isCrouching = false;
                    ai.crouchUntilTime = null;
                }
                // HIDING状態でない場合は基本立つ
                if (!ai.crouchUntilTime) {
                    ai.isCrouching = false;
                }
            }
            ai.scale.y = ai.isCrouching ? 0.7 : 1.0;
            if (ai.userData && ai.userData.onRooftop && ai.userData.rooftopObstacle) {
                const height = getObstacleHeight(ai.userData.rooftopObstacle) || DEFAULT_OBSTACLE_HEIGHT;
                ai.position.y = ai.userData.rooftopObstacle.position.y + height / 2;
            } else {
                ai.position.y = getGroundSurfaceY(ai.position);
            }
        }
        if (ai.state === 'ATTACKING' || isMoving) {
            let targetAngle;
            const closestOpponentPos = getClosestOpponentPosition(ai);
            if (closestOpponentPos) {
                targetAngle = Math.atan2(closestOpponentPos.x - ai.position.x, closestOpponentPos.z - ai.position.z);
            } else {
                targetAngle = ai.rotation.y;
            }
            ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 5 * delta);
        }
        switch (ai.state) {
            case 'MOVING_TO_COVER':
                // 隠れる場所への移動中はしゃがみ続ける
                ai.isCrouching = true;
                ai.scale.y = 0.7;
                
                // 移動完了チェック
                if (isArrived) {
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                } else {
                    // 通常移動ロジックと同じ
                    tempVector2.subVectors(ai.targetPosition, ai.position);
                    const distance = tempVector2.length();
                    if (distance > 0.01) {
                        let moveDirection = tempVector2.normalize();
                        const moveVectorDelta = tempVector3.copy(moveDirection).multiplyScalar(currentAISpeed * delta);
                        moveVectorDelta.add(separation_vec);
                        if (moveVectorDelta.lengthSq() < 1e-8) break;
                        moveDirection = moveVectorDelta.normalize();
                        const newPos = ai.position.clone().add(moveDirection);
                        if (!checkAICollisionWithObstacles(ai, newPos, obstacles)) {
                            ai.position.copy(newPos);
                            ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, Math.atan2(moveDirection.x, moveDirection.z), 5 * delta);
                        }
                    }
                }
                break;
            case 'HIDING':
                ai.avoiding = false;
                // const isTeammate = gameSettings.gameMode === 'team' && ai.team === 'player'; // この行は削除
                // const isTeammateInTeamModeOrArcade = isTeammateInTeamModeOrArcade && ai.team === 'player'; // この行は削除
                if (isTeammateInTeamModeOrArcade) {
                    // 味方AIは積極的に攻撃する（HIDING状態を回避）
                    if (!findAndTargetWeapon(ai)) {
                        ai.state = 'ATTACKING';
                        ai.currentAttackTime = timeElapsed;
                        ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                    }
                    break;
                }
                if (ai.currentWeapon === WEAPON_SR && ai.ammoSR > 0) {
                    let targetAngle;
                    if (isTeammateInTeamModeOrArcade) {
                        // 味方AIは最も近い敵AIの方向を向く
                        let closestEnemyAI = null;
                        let closestDistance = Infinity;
                        for (const enemyAI of ais) {
                            if (enemyAI === ai || enemyAI.team !== 'enemy' || enemyAI.hp <= 0) continue;
                            const distance = ai.position.distanceTo(enemyAI.position);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestEnemyAI = enemyAI;
                            }
                        }
                        if (closestEnemyAI) {
                            targetAngle = Math.atan2(closestEnemyAI.position.x - ai.position.x, closestEnemyAI.position.z - ai.position.z);
                        } else {
                            targetAngle = Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z);
                        }
                    } else {
                        targetAngle = Math.atan2(player.position.x - ai.position.x, player.position.z - ai.position.z);
                    }
                    ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 2 * delta);
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
                            let effectiveHideDuration = HIDE_DURATION * (1.0 + (1.0 - ai.aggression) * 1.5);
                            // Teammates should hide far less; make them aggressive.
                            if (isTeammateInTeamModeOrArcade) effectiveHideDuration *= 0.35;
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
            case 'FOLLOWING': // 新しい追従状態
                // 常にプレイヤーへの追従移動ロジックを実行する
                const oldAIPosition_follow = ai.position.clone();
                const toFollowTarget = new THREE.Vector3().subVectors(ai.targetPosition, ai.position);
                const followDistance = toFollowTarget.length();
                if (followDistance < 0.35) {
                    break;
                }
                let moveDirection_follow = toFollowTarget.multiplyScalar(1 / followDistance);
                const moveVectorDelta_follow = moveDirection_follow.clone().multiplyScalar(currentAISpeed * delta);
                moveVectorDelta_follow.add(separation_vec); // AI間の分離力も考慮
                if (moveVectorDelta_follow.lengthSq() < 1e-8) {
                    break;
                }
                moveDirection_follow = moveVectorDelta_follow.normalize(); // Normalize after adding separation_vec

                raycaster.set(oldAIPosition_follow.clone().add(new THREE.Vector3(0, 1.0, 0)), moveDirection_follow);
                const intersects = raycaster.intersectObjects(obstacles, true);

                if (intersects.length > 0 && intersects[0].distance < AVOIDANCE_RAY_DISTANCE && !ai.avoiding && ai.state !== 'EVADING') {
                    // 移動する前に障害物を検知したら回避
                    findObstacleAvoidanceSpot(ai, moveDirection_follow, ai.targetPosition);
                } else {
                    // 障害物がなければ移動
                    const finalMove_follow = moveDirection_follow.multiplyScalar(currentAISpeed * delta);
                    const moved = applyAIMovementWithSweep(ai, finalMove_follow);
                    if (!moved) {
                        ai.position.copy(oldAIPosition_follow);
                        findObstacleAvoidanceSpot(ai, moveDirection_follow, ai.targetPosition);
                    }
                }
                break; // FOLLOWING状態の処理終了

            case 'MOVING_TO_LADDER':
                ai.avoiding = false;
                if ((timeElapsed - (ai.userData.rooftopStateSince || timeElapsed)) > 7.0) {
                    ai.userData.rooftopIntent = false;
                    ai.userData.onRooftop = false;
                    ai.userData.rooftopSensor = null;
                    ai.userData.rooftopObstacle = null;
        ai.userData.rooftopLadderPos = null;
        ai.userData.rooftopLadderSnap = null;
                    ai.userData.rooftopDecisionMade = false;
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    
                    // 梯子移動タイムアウト時に地上に安全に戻す
                    if (ai.position.y > 2) {
                        ai.position.y = 0; // 地上に戻す
                        ai.targetPosition.y = 0;
                    }
                    break;
                }
                if (!ai.userData.rooftopLadderPos || !ai.userData.rooftopObstacle) {
                    ai.userData.rooftopIntent = false;
                    ai.state = 'ATTACKING';
                    break;
                }
                ai.targetPosition.copy(ai.userData.rooftopLadderPos);
                ai.targetPosition.y = getGroundSurfaceY(ai.targetPosition);
                if (ai.position.distanceTo(ai.targetPosition) < 1.05) {
                    const ladderSnap = ai.userData.rooftopSensor?.userData?.ladderPos || ai.userData.rooftopLadderPos;
                    ai.position.x = ladderSnap.x;
                    ai.position.z = ladderSnap.z;
                    ai.isElevating = true;
                    ai.userData.elevatingDirection = 1;
                    // 空洞建物の場合、床のジオメトリーから高さを取得
                    const geometry = ai.userData.rooftopObstacle.geometry || (ai.userData.rooftopObstacle.children && ai.userData.rooftopObstacle.children[0] ? ai.userData.rooftopObstacle.children[0].geometry : null);
                    const height = geometry ? geometry.parameters.height : 4;
                    ai.userData.rooftopTargetY = ai.userData.rooftopObstacle.position.y + height / 2;
                    ai.state = 'CLIMBING';
                    ai.userData.rooftopStateSince = timeElapsed;
                }
                break;

            case 'CLIMBING':
                ai.avoiding = false;
                if ((timeElapsed - (ai.userData.rooftopStateSince || timeElapsed)) > 5.5) {
                    ai.isElevating = false;
                    ai.userData.elevatingDirection = 0;
                    ai.userData.rooftopIntent = false;
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    
                    // 梯子登り失敗時に地上に安全に戻す
                    if (ai.position.y > 2) {
                        ai.position.y = 0; // 地上に戻す
                        ai.targetPosition.y = 0;
                    }
                }
                // Vertical movement is handled by ai.isElevating block above.
                break;

            case 'ROOFTOP_COMBAT':
                ai.avoiding = false;
                ai.userData.onRooftop = true;
                aiShoot(ai, timeElapsed);
                ai.isCrouching = Math.random() < 0.35;
                if (ai.userData.rooftopObstacle) {
                    const c = ai.userData.rooftopObstacle.position;
                    const halfW = (ai.userData.rooftopObstacle.geometry.parameters.width || 6) * 0.35;
                    const halfD = (ai.userData.rooftopObstacle.geometry.parameters.depth || 6) * 0.35;
                    ai.targetPosition.set(
                        c.x + (Math.random() - 0.5) * halfW,
                        ai.position.y,
                        c.z + (Math.random() - 0.5) * halfD
                    );
                    const move = ai.targetPosition.clone().sub(ai.position);
                    move.y = 0;
                    if (move.lengthSq() > 0.01) {
                        move.normalize().multiplyScalar(currentAISpeed * 0.35 * delta);
                        ai.position.add(move);
                    }
                }
                // If rooftop weapon is out of ammo, immediately start descending.
                if (isAIWeaponOutOfAmmo(ai) && !ai.userData.rooftopDecisionMade) {
                    ai.userData.rooftopDecisionMade = true;
                    ai.state = 'DESCENDING';
                    ai.userData.rooftopStateSince = timeElapsed;
                }
                break;

            case 'DESCENDING':
                ai.avoiding = false;
                ai.isCrouching = false;
                if ((timeElapsed - (ai.userData.rooftopStateSince || timeElapsed)) > 7.0) {
                    ai.isElevating = false;
                    ai.userData.elevatingDirection = 0;
                    ai.userData.onRooftop = false;
                    ai.userData.rooftopIntent = false;
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
                    break;
                }
                if (!ai.userData.rooftopLadderPos || !ai.userData.rooftopObstacle) {
                    ai.userData.rooftopIntent = false;
                    ai.userData.onRooftop = false;
                    ai.state = 'ATTACKING';
                    break;
                }
                ai.targetPosition.copy(ai.userData.rooftopLadderPos);
                ai.targetPosition.y = ai.position.y;
                if (ai.position.distanceTo(new THREE.Vector3(ai.targetPosition.x, ai.position.y, ai.targetPosition.z)) < 0.9) {
                    ai.position.x = ai.userData.rooftopLadderPos.x;
                    ai.position.z = ai.userData.rooftopLadderPos.z;
                    ai.isElevating = true;
                    ai.userData.elevatingDirection = -1;
                    ai.userData.rooftopTargetY = -FLOOR_HEIGHT;
                    ai.userData.rooftopStateSince = timeElapsed;
                }
                break;

            case 'MOVING':
                ai.avoiding = false;
                if (isTeammateInTeamModeOrArcade) {
                    // 味方AIは武器を拾った後、すぐに攻撃状態に移行
                    if (isArrived) {
                        ai.targetWeaponPickup = null;
                        if (isFollowingPlayerMode && ai.userData.followActive !== false) {
                            ai.state = 'FOLLOWING';
                        } else {
                            ai.state = 'ATTACKING';
                            ai.currentAttackTime = timeElapsed;
                            ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                        }
                    }
                } else {
                                                    if (isAISeen) {
                                                        ai.targetWeaponPickup = null;
                                                        ai.state = 'ATTACKING';
                                                        ai.currentAttackTime = timeElapsed;
                                                        ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                                                    } else if (isArrived) {
                                                        if (ai.lastKnownEnemyPos && (timeElapsed - (ai.lastSeenEnemyTime || -999)) < 2.0) {
                                                            ai.targetPosition.copy(ai.lastKnownEnemyPos);
                                                        } else if (!findNewHidingSpot(ai)) {
                                                            ai.state = 'HIDING';
                                                            ai.lastHiddenTime = timeElapsed;
                                                        }
                                                    }                }
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
                if (isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false) {
                    const combatUntil = (ai.userData && ai.userData.followCombatUntil) ? ai.userData.followCombatUntil : 0;
                    if (combatUntil <= timeElapsed) {
                        ai.state = 'FOLLOWING';
                        break;
                    }
                }
                if (isTeammateInTeamModeOrArcade && ai.position.distanceTo(player.position) > 16) {
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(player.position);
                    break;
                }
                const oldAIPosition_attack = ai.position.clone();
                let attackTargetPos = getClosestOpponentPosition(ai);
                if (!attackTargetPos) {
                    if (isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false) {
                        ai.state = 'FOLLOWING';
                        break;
                    }
                    attackTargetPos = player.position.clone();
                }
                const directionToTarget = new THREE.Vector3().subVectors(attackTargetPos, ai.position);
                directionToTarget.y = 0;
                if (directionToTarget.lengthSq() < 1e-6) break;
                directionToTarget.normalize();
                const strafeVector = new THREE.Vector3(directionToTarget.z, 0, -directionToTarget.x);
                const strafeSpeed = currentAISpeed * 0.5;
                const moveVectorDelta_attack = strafeVector.multiplyScalar(ai.strafeDirection * strafeSpeed * delta);
                moveVectorDelta_attack.add(separation_vec);
                ai.position.add(moveVectorDelta_attack);
                if (checkCollision(ai, obstacles)) {
                    ai.position.copy(oldAIPosition_attack);
                    ai.strafeDirection *= -1;
                }
                aiShoot(ai, timeElapsed);
                if (ENABLE_EXPERIMENTAL_AI_FLOW) {
                    // If AI keeps seeing an opponent but doesn't fire, force tactical reposition.
                    const attackStall = isAISeen && (timeElapsed - ai.lastAttackTime) > 1.2;
                    if (attackStall) {
                        if (Math.random() < 0.65 && findFlankingSpot(ai, timeElapsed)) {
                            break;
                        }
                        const threatPos = (visibleOpponentInfo && visibleOpponentInfo.targetPos)
                            ? visibleOpponentInfo.targetPos
                            : (ai.lastKnownEnemyPos || getClosestOpponentPosition(ai));
                        const coverPos = threatPos ? findSmartCoverPosition(ai, threatPos) : null;
                        if (coverPos) {
                            ai.state = 'MOVING';
                            ai.targetPosition.copy(coverPos);
                            ai.userData.searchPulseAt = timeElapsed + 0.8;
                            break;
                        }
                        ai.strafeDirection *= -1;
                        const nudge = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
                        if (nudge.lengthSq() > 1e-6) {
                            nudge.normalize().multiplyScalar(2.0);
                            ai.state = 'MOVING';
                            ai.targetPosition.copy(ai.position.clone().add(nudge));
                            ai.targetPosition.y = getGroundSurfaceY(ai.targetPosition);
                            break;
                        }
                    }
                }
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

        if (ENABLE_AI_ROOFTOP_LOGIC) {
            // Ground anti-idle: prevent standing still on the ground when rooftop logic is enabled.
            const groundRooftopStates = ['MOVING_TO_LADDER', 'CLIMBING', 'ROOFTOP_COMBAT', 'DESCENDING'];
            const isInRooftopFlow = groundRooftopStates.includes(ai.state) || ai.isElevating || ai.userData.onRooftop;
            const movedNow = ai.position.distanceTo(ai.lastPosition) > 0.02;
            const canGroundIdleCheck = !isInRooftopFlow && ai.state !== 'FOLLOWING';
            if (canGroundIdleCheck && !movedNow) {
                if (!ai.userData.groundIdleSince) ai.userData.groundIdleSince = timeElapsed;
                const noFireTooLong = (timeElapsed - (ai.lastAttackTime || 0)) > 1.6;
                if ((timeElapsed - ai.userData.groundIdleSince) > 1.5 && noFireTooLong) {
                    const chase = ai.lastKnownEnemyPos || getClosestOpponentPosition(ai) || player.position.clone();
                    const vec = new THREE.Vector3().subVectors(chase, ai.position);
                    vec.y = 0;
                    if (vec.lengthSq() < 1e-6) vec.set(Math.random() - 0.5, 0, Math.random() - 0.5);
                    vec.normalize();
                    const side = new THREE.Vector3(vec.z, 0, -vec.x).multiplyScalar((Math.random() > 0.5 ? 1 : -1) * 2.0);
                    const moveTo = ai.position.clone().add(vec.multiplyScalar(2.6)).add(side);
                    moveTo.y = getGroundSurfaceY(moveTo);
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(moveTo);
                    ai.userData.groundIdleSince = 0;
                }
            } else {
                ai.userData.groundIdleSince = 0;
            }
        }

        if (ENABLE_EXPERIMENTAL_AI_FLOW) {
            // Hard watchdog: any prolonged freeze (seen or unseen) must break into motion.
            const movedSinceLastFrame = ai.position.distanceTo(ai.lastPosition) > 0.03;
            const protectedStates = ['CLIMBING', 'DESCENDING', 'FOLLOWING'];
            const canWatchdog = !protectedStates.includes(ai.state) && !ai.isElevating;
            if (canWatchdog && !movedSinceLastFrame) {
                if (!ai.userData.stallStartTime) ai.userData.stallStartTime = timeElapsed;
                const stallLimit = isAISeen ? 1.0 : 1.8;
                if ((timeElapsed - ai.userData.stallStartTime) > stallLimit) {
                    if (ai.state === 'MOVING_TO_LADDER' || ai.state === 'ROOFTOP_COMBAT') {
                        ai.userData.rooftopIntent = false;
                        ai.userData.onRooftop = false;
                        ai.userData.rooftopSensor = null;
                        ai.userData.rooftopObstacle = null;
        ai.userData.rooftopLadderPos = null;
        ai.userData.rooftopLadderSnap = null;
                        ai.userData.rooftopDecisionMade = false;
                    }
                    const anchor = (visibleOpponentInfo && visibleOpponentInfo.targetPos)
                        ? visibleOpponentInfo.targetPos
                        : (ai.lastKnownEnemyPos || getClosestOpponentPosition(ai) || player.position.clone());
                    const dir = new THREE.Vector3().subVectors(anchor, ai.position);
                    dir.y = 0;
                    if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
                    dir.normalize();
                    const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar((Math.random() > 0.5 ? 1 : -1) * 2.8);
                    const stepTarget = ai.position.clone().add(dir.multiplyScalar(3.0)).add(side);
                    stepTarget.y = getGroundSurfaceY(stepTarget);
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(stepTarget);
                    ai.currentAttackTime = timeElapsed;
                    ai.strafeDirection = (Math.random() > 0.5 ? 1 : -1);
                    ai.userData.searchPulseAt = timeElapsed + 0.7;
                    ai.userData.nextRooftopDecisionAt = timeElapsed + 1.2;
                    ai.userData.stallStartTime = 0;
                }
            } else {
                ai.userData.stallStartTime = 0;
            }
        }

        // Anti-stall: if AI keeps hiding without LOS, advance toward nearest opponent's last known area.
        if (ai.state === 'HIDING' && !isAISeen) {
            const isFollowLockedTeammate = isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false;
            if (!isFollowLockedTeammate && (timeElapsed - ai.lastHiddenTime) > 1.2) {
                const huntPos = ai.lastKnownEnemyPos || getClosestOpponentPosition(ai);
                if (huntPos) {
                    ai.state = 'MOVING';
                    ai.targetPosition.copy(huntPos);
                }
            }
        }
        if (isMoving && ai.state !== 'HIDING' && ai.state !== 'ATTACKING' && ai.state !== 'CLIMBING' && ai.state !== 'FOLLOWING' && ai.state !== 'ROOFTOP_COMBAT' && !ai.isElevating) {
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
                const moved = applyAIMovementWithSweep(ai, finalMove);
                if (!moved) {
                    ai.position.copy(oldAIPosition);
                    findObstacleAvoidanceSpot(ai, moveDirection, ai.targetPosition);
                }
            }
        }
        // FOLLOW中の味方は必ずプレイヤーに重ならないように強制分離する
        if (isTeammateInTeamModeOrArcade && isFollowingPlayerMode && ai.userData.followActive !== false) {
            const toAI = new THREE.Vector3().subVectors(ai.position, player.position);
            toAI.y = 0;
            const minSeparation = 4.2;
            if (toAI.lengthSq() < minSeparation * minSeparation) {
                if (toAI.lengthSq() < 1e-6) {
                    const pf = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
                    pf.y = 0;
                    toAI.copy(pf.lengthSq() > 1e-6 ? pf.normalize().negate() : new THREE.Vector3(0, 0, 1));
                } else {
                    toAI.normalize();
                }
                const desired = player.position.clone().add(toAI.multiplyScalar(minSeparation));
                desired.y = getGroundSurfaceY(desired);
                const oldPos = ai.position.clone();
                ai.position.copy(desired);
                const desiredHead = desired.clone().add(new THREE.Vector3(0, 1.0, 0));
                const aiHead = oldPos.clone().add(new THREE.Vector3(0, 1.0, 0));
                if (checkCollision(ai, obstacles) || !checkLineOfSight(aiHead, desiredHead, obstacles)) {
                    ai.position.copy(oldPos);
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

            applyGunStyle(parts.gun, ai.currentWeapon);
            applyWeaponPose(parts, ai.currentWeapon);

            // Aiming: Make the aimGroup look at the target
            let targetHeadPos = new THREE.Vector3();
            if (isTeamModeOrTeamArcade && ai.team === 'player') { // isTeamModeOrTeamArcadeを使用
                // 味方AIは最も近い敵AIを向く
                let closestEnemyAI = null;
                let closestDistance = Infinity;
                for (const enemyAI of ais) {
                    if (enemyAI === ai || enemyAI.team !== 'enemy' || enemyAI.hp <= 0) continue;
                    const distance = ai.position.distanceTo(enemyAI.position);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemyAI = enemyAI;
                    }
                }
                if (closestEnemyAI) {
                    targetHeadPos.copy(getAIUpperTorsoPos(closestEnemyAI));
                } else {
                    // 敵AIがいない場合はプレイヤーを向く
                    const aimOrigin = ai.position.clone().add(new THREE.Vector3(0, BODY_HEIGHT * 0.75, 0));
                    const pHead = getPlayerHeadPos();
                    const pUpper = getPlayerUpperTorsoPos();
                    const pBody = getPlayerBodyPos();
                    if (checkLineOfSight(aimOrigin, pHead, obstacles)) targetHeadPos.copy(pHead);
                    else if (checkLineOfSight(aimOrigin, pUpper, obstacles)) targetHeadPos.copy(pUpper);
                    else targetHeadPos.copy(pBody);
                }
            } else {
                // 通常モードまたは敵AIはプレイヤーを向く
                const aimOrigin = ai.position.clone().add(new THREE.Vector3(0, BODY_HEIGHT * 0.75, 0));
                const pHead = getPlayerHeadPos();
                const pUpper = getPlayerUpperTorsoPos();
                const pBody = getPlayerBodyPos();
                if (checkLineOfSight(aimOrigin, pHead, obstacles)) targetHeadPos.copy(pHead);
                else if (checkLineOfSight(aimOrigin, pUpper, obstacles)) targetHeadPos.copy(pUpper);
                else targetHeadPos.copy(pBody);
            }
            applyAimConstraints(parts, ai.rotation.y, targetHeadPos);

            // Keep gun aligned to the midpoint between hands
            alignGunGripToHands(parts, 0.8);

            // Leg Animation
            const actuallyMoving = ai.position.distanceTo(ai.lastPosition) > 0.001; // 実際に動いているかを判定
            applyCrouchPose(parts, ai.isCrouching, timeElapsed, actuallyMoving);
        }
        // 最終的な衝突チェック（薄い壁のすり抜け対策）
        if (checkCollision(ai, obstacles)) {
            const resolved = resolvePlayerCollision(ai, obstacles, 0.06);
            if (!resolved && checkCollision(ai, obstacles)) {
                ai.position.copy(aiStartPos);
            }
        }
        clampAIToRooftop(ai);
        // AIの現在の位置を保存して次フレームで比較できるようにする
        ai.lastPosition.copy(ai.position);

    });
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const prevProjectilePos = p.mesh.position.clone();
        let hitSomething = false;
        let hitObject = null;
        let hitType = '';
        if (p.life !== Infinity) {
            p.life -= delta;
                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    clearAIRocketInFlight(p);
                    projectiles.splice(i, 1);
                    continue;
                }
        }
        const moveVector = p.velocity.clone().multiplyScalar(delta);
        const moveDistance = moveVector.length();
        if (moveDistance > 0) {
            const moveDir = moveVector.clone().normalize();
            raycaster.set(prevProjectilePos, moveDir);
            raycaster.far = moveDistance;
            const hit = getFirstProjectileHit(raycaster, obstacles);
            if (hit) {
                hitSomething = true;
                hitObject = hit.object;
                hitType = 'obstacle';
                p.mesh.position.copy(hit.point);
            } else {
                p.mesh.position.copy(prevProjectilePos).add(moveVector);
            }
        }
        if (p.isRocket) {
            createRocketTrail(p.mesh.position.clone());
        }
        const bulletSphere = new THREE.Sphere(p.mesh.position, p.isRocket ? 0.5 : 0.1);
        // Obstacle hit is already handled by the segment raycast above.
        // Avoid doing another full obstacle scan per projectile per frame.
        // For AI bullets, defer floor hit test until after player hit test.
        if (!hitSomething && p.source !== 'ai' && new THREE.Box3().setFromObject(floor).intersectsSphere(bulletSphere)) {
            hitSomething = true;
            hitObject = floor;
            hitType = 'floor';
        }
        if (!hitSomething && p.source === 'player') {
            for (let j = ais.length - 1; j >= 0; j--) {
                const ai = ais[j];
                if (new THREE.Box3().setFromObject(ai).intersectsSphere(bulletSphere)) {
                    if (ai.hp <= 0) continue; 
                    
                    if ((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && ai.team === 'player') {
                        continue;
                    }

                    hitSomething = true;
                    hitObject = ai;
                    hitType = 'ai';
                    let damageAmount = 1;
                    if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE;
                    else if (p.weaponType === WEAPON_MR) damageAmount = 9;
                    else if (p.isSniper || p.isRocket) damageAmount = ai.hp;
                    
                    if (ai.hp !== Infinity) {
                        ai.hp -= damageAmount;
                        createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                        ai.lastUnderFireTime = timeElapsed;
                        if (p.shooter) ai.lastKnownThreatPos = p.shooter.position.clone();
                        
                        // 戦術的しゃがみ：被弾時に障害物近くならしゃがんで隠れる
                        if (ai.state !== 'CLIMBING' && ai.state !== 'DESCENDING' && !ai.isElevating) {
                            // クールダウンチェック（0.5秒に1回まで）
                            if (timeElapsed - ai.lastCoverSearchTime > 0.5) {
                                ai.lastCoverSearchTime = timeElapsed;
                                const nearbyCover = findNearbyCover(ai.position, obstacles);
                                if (nearbyCover) {
                                    ai.isCrouching = true;
                                    ai.scale.y = 0.7;
                                    // しゃがみ状態を2-4秒維持
                                    ai.crouchUntilTime = timeElapsed + 2 + Math.random() * 2;
                                }
                            }
                        }
                        else ai.lastKnownThreatPos = prevProjectilePos.clone();
                    }

                    if (ai.hp <= 0) {
                        // 【修正】チームデスマッチ時のスコア加算
                        if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                            playerTeamKills++;
                        }
                        // FFA/Arcade用
                        if (gameSettings.gameMode === 'ffa' || gameSettings.gameMode === 'arcade') {
                            playerKills++;
                        }
                        aiFallDownCinematicSequence(p.velocity, ai, 'player');
                    } else {
                        findEvasionSpot(ai);
                    }
                    if (p.weaponType === WEAPON_SG) {
                        scene.remove(p.mesh);
                        clearAIRocketInFlight(p);
                        projectiles.splice(i, 1);
                    }
                }
            }
            if (hitSomething) break;
        }
        if (!hitSomething && p.source === 'ai') {
            const shooterAI = p.shooter;
            const shooterTeam = shooterAI ? shooterAI.team : 'enemy';
            
            if ((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade' || gameSettings.gameMode === 'ffa') && shooterAI) {
                for (let j = ais.length - 1; j >= 0; j--) {
                    const ai = ais[j];
                    if (ai === shooterAI || ai.hp <= 0) continue; 
                    
                    if (gameSettings.gameMode !== 'ffa' && ai.team === shooterTeam) continue;
                    
                    if (new THREE.Box3().setFromObject(ai).intersectsSphere(bulletSphere)) {
                        hitSomething = true;
                        hitObject = ai;
                        hitType = 'ai';
                        let damageAmount = 1;
                        if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE;
                        else if (p.weaponType === WEAPON_MR) damageAmount = 9;
                        else if (p.isSniper || p.isRocket) damageAmount = ai.hp;
                        if (ai.hp !== Infinity) {
                            ai.hp -= damageAmount;
                            createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                            ai.lastUnderFireTime = timeElapsed;
                            if (p.shooter) ai.lastKnownThreatPos = p.shooter.position.clone();
                            
                            // 戦術的しゃがみ：被弾時に障害物近くならしゃがんで隠れる
                            if (ai.state !== 'CLIMBING' && ai.state !== 'DESCENDING' && !ai.isElevating) {
                                // クールダウンチェック（0.5秒に1回まで）
                                if (timeElapsed - ai.lastCoverSearchTime > 0.5) {
                                    ai.lastCoverSearchTime = timeElapsed;
                                    const nearbyCover = findNearbyCover(ai.position, obstacles);
                                    if (nearbyCover) {
                                        ai.isCrouching = true;
                                        ai.scale.y = 0.7;
                                        // しゃがみ状態を2-4秒維持
                                        ai.crouchUntilTime = timeElapsed + 2 + Math.random() * 2;
                                    }
                                }
                            }
                            else ai.lastKnownThreatPos = prevProjectilePos.clone();
                        }
                        if (ai.hp <= 0) {
                            if (p.shooter && p.shooter.kills !== undefined) {
                                p.shooter.kills++;
                            }
                            // 【修正】AI同士のキルによるスコア加算
                            if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                                if (shooterTeam === 'player' && ai.team === 'enemy') playerTeamKills++;
                                if (shooterTeam === 'enemy' && ai.team === 'player') enemyTeamKills++;
                            }

                            aiFallDownCinematicSequence(p.velocity, ai, 'ai');
                        } else {
                            findEvasionSpot(ai);
                        }
                        if (p.weaponType === WEAPON_SG) {
                            scene.remove(p.mesh);
                            clearAIRocketInFlight(p);
                            projectiles.splice(i, 1);
                        }
                        break;
                    }
                }
                if (hitSomething) break;
            }
            
            if (!hitSomething && (gameSettings.gameMode !== 'team' || shooterTeam === 'enemy')) {
                const playerPos = player.position;
                const playerBoundingBox = new THREE.Box3();
                const bounds = getPlayerCombatBounds();
                const playerTopY = bounds.topY;
                const playerBottomY = bounds.bottomY;
                playerBoundingBox.min.set(playerPos.x - 0.7, playerBottomY, playerPos.z - 0.7);
                playerBoundingBox.max.set(playerPos.x + 0.7, playerTopY, playerPos.z + 0.7);
                let hitPlayer = playerBoundingBox.intersectsSphere(bulletSphere);
                if (!hitPlayer) {
                    const segDir = new THREE.Vector3().subVectors(p.mesh.position, prevProjectilePos);
                    const segLen = segDir.length();
                    if (segLen > 1e-6) {
                        segDir.normalize();
                        const segRay = new THREE.Ray(prevProjectilePos.clone(), segDir);
                        const hitPoint = segRay.intersectBox(playerBoundingBox, new THREE.Vector3());
                        if (hitPoint) {
                            hitPlayer = prevProjectilePos.distanceTo(hitPoint) <= segLen;
                        }
                    }
                }
                if (!hitPlayer) {
                    // Fallback: capsule-like center sphere check to avoid crouch edge misses.
                    const centerY = (playerTopY + playerBottomY) * 0.5;
                    const center = new THREE.Vector3(playerPos.x, centerY, playerPos.z);
                    const seg = new THREE.Vector3().subVectors(p.mesh.position, prevProjectilePos);
                    const segLen = seg.length();
                    if (segLen > 1e-6) {
                        const segDir = seg.clone().normalize();
                        const toCenter = new THREE.Vector3().subVectors(center, prevProjectilePos);
                        const t = THREE.MathUtils.clamp(toCenter.dot(segDir), 0, segLen);
                        const closest = prevProjectilePos.clone().add(segDir.multiplyScalar(t));
                        const r = isCrouchingToggle ? 0.75 : 0.8;
                        if (closest.distanceToSquared(center) <= r * r) {
                            hitPlayer = true;
                        }
                    }
                }
                if (hitPlayer) {
                    hitSomething = true;
                    hitObject = player;
                    hitType = 'player';
                    let damageAmount = 1;
                    if (p.weaponType === WEAPON_SG) damageAmount = SHOTGUN_PELLET_DAMAGE;
                    else if (p.weaponType === WEAPON_MR) damageAmount = 9;
                    else if (p.isSniper || p.isRocket) damageAmount = playerHP;
                    if (playerHP !== Infinity) {
                        playerHP -= damageAmount;
                        screenShakeDuration = SHAKE_DURATION_MAX;
                        if (redFlashOverlay) {
                            // 死亡アニメーション用のクラスを一旦クリアし、初期状態をリセット
                            redFlashOverlay.classList.remove('fade-to-black', 'fade-out', 'red-flash');
                            redFlashOverlay.style.opacity = '0'; // 初期状態を透明に
                            redFlashOverlay.style.backgroundColor = 'rgba(0,0,0,0)'; // 背景色をリセット
                            redFlashOverlay.style.display = 'block'; // 表示を有効に

                            // 短時間後に赤フラッシュクラスを追加し、アニメーションを開始
                            // red-flashクラスがopacityを制御する場合、ここでのopacity設定は不要か、調整が必要
                            // CSS側のred-flashアニメーションがopacity: 1; を持つことを前提とする
                            setTimeout(() => {
                                redFlashOverlay.classList.add('red-flash');
                                redFlashOverlay.style.opacity = '1'; 
                            }, 10); // 短い遅延でクラス追加をトリガー

                            // 一定時間後に赤フラッシュクラスを削除し、透明に戻す
                            setTimeout(() => {
                                redFlashOverlay.classList.remove('red-flash');
                                redFlashOverlay.style.opacity = '0'; // 透明に戻す
                                // フェードアウトが完了するまで待ってからdisplayをnoneにする
                                setTimeout(() => { redFlashOverlay.style.display = 'none'; }, 500); 
                            }, 300); // フラッシュの継続時間（ms）
                        }
                    }
                    if (playerHP <= 0 && !isPlayerDeathPlaying) {
                        if (p.shooter && p.shooter.kills !== undefined) {
                            p.shooter.kills++;
                        }
                        // 【修正】プレイヤーが倒された時の敵チームスコア加算
                        if ((gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') && shooterTeam === 'enemy') {
                            enemyTeamKills++;
                        }
                        startPlayerDeathSequence(p);
                    }
                    if (p.weaponType === WEAPON_SG) {
                        scene.remove(p.mesh);
                        clearAIRocketInFlight(p);
                        projectiles.splice(i, 1);
                    }
                    break;
                }
            }
        }
        // Deferred floor test for AI bullets (after player/AI hit checks).
        if (!hitSomething && p.source === 'ai' && new THREE.Box3().setFromObject(floor).intersectsSphere(bulletSphere)) {
            hitSomething = true;
            hitObject = floor;
            hitType = 'floor';
        }
        if (hitSomething) {
                const hitIsBarrel = hitType === 'obstacle' && hitObject && hitObject.userData && hitObject.userData.type === 'barrel';
                if (hitIsBarrel) {
                    explodeBarrel(hitObject, p.source, p.shooter || null);
                } else if (p.isRocket) {
                    const explosionPos = p.mesh.position.clone();
                    if (explosionSound) playSpatialSound(explosionSound, explosionPos);
                    createExplosionEffect(explosionPos);
                const EXPLOSION_RADIUS_ACTUAL = ROCKET_EXPLOSION_RADIUS;
                if (p.source === 'player') {
                    for (let j = ais.length - 1; j >= 0; j--) {
                        const ai = ais[j];
                        if (ai.hp <= 0) continue;
                        const distance = ai.position.distanceTo(explosionPos);
                        if (distance < EXPLOSION_RADIUS_ACTUAL) {
                            const aiCenter = ai.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                            if (checkLineOfSight(explosionPos, aiCenter, obstacles)) {
                                if (ai.hp !== Infinity) {
                                    ai.hp = 0;
                                    createRedSmokeEffect(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                                }
                                if (ai.hp <= 0) {
                                    aiFallDownCinematicSequence(new THREE.Vector3().subVectors(ai.position, explosionPos), ai, 'player');
                                }
                            }
                        }
                    }
                    if (playerHP > 0) {
                        const distanceToPlayer = player.position.distanceTo(explosionPos);
                        if (distanceToPlayer < EXPLOSION_RADIUS_ACTUAL) {
                            const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
                            if (checkLineOfSight(explosionPos, playerCenter, obstacles)) {
                                if (playerHP !== Infinity) {
                                    playerHP = 0;
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
                }
                if (p.source === 'ai' && playerHP > 0) {
                    const distanceToPlayer = player.position.distanceTo(explosionPos);
                    if (distanceToPlayer < EXPLOSION_RADIUS_ACTUAL) {
                        const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
                        if (checkLineOfSight(explosionPos, playerCenter, obstacles)) {
                            if (playerHP !== Infinity) {
                                playerHP = 0;
                                screenShakeDuration = SHAKE_DURATION_MAX;
                                redFlashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                                setTimeout(() => { redFlashOverlay.style.backgroundColor = 'transparent'; }, 100);
                            }
                            if (playerHP <= 0 && !isPlayerDeathPlaying) {
                                if (p.shooter && p.shooter.kills !== undefined) {
                                    p.shooter.kills++;
                                }
                                startPlayerDeathSequence(p);
                            }
                        }
                    }
                }
                if (hitType === 'obstacle') {
                    if (hitObject.userData && hitObject.userData.isHouseWall) {
                        // Do not damage house walls
                    } else if (hitObject.userData && hitObject.userData.type === 'barrel') {
                        // Barrel already exploded above
                    } else {
                    if (hitObject.userData.hp === undefined) {
                        hitObject.userData.hp = 1;
                    }
                    hitObject.userData.hp -= 1;
                    if (hitObject.userData.hp <= 0) {
                        destroyObstacle(hitObject, p.mesh.position);
                    }
                    }
                }
            } else {
                createSmokeEffect(p.mesh.position);
            }
            if (p.weaponType !== WEAPON_SG) {
                scene.remove(p.mesh);
                clearAIRocketInFlight(p);
                projectiles.splice(i, 1);
            }
            continue;
        }
        const projArenaR = Math.sqrt(p.mesh.position.x * p.mesh.position.x + p.mesh.position.z * p.mesh.position.z);
        if (projArenaR > ARENA_PLAY_AREA_RADIUS) {
            scene.remove(p.mesh);
            clearAIRocketInFlight(p);
            projectiles.splice(i, 1);
        }
    }
    const aiHPDisplays = [aiHPDisplay, ai2HPDisplay, ai3HPDisplay]; // グローバル変数を使用
    for (let i = 0; i < aiHPDisplays.length; i++) {
        const display = aiHPDisplays[i];
        if (!display) continue;
        const ai = ais[i]; // ais配列から削除されていないことを前提

        if (ai && ai.hp > 0) {
            display.style.display = 'block';
            if (isTeamModeOrTeamArcade) { // isTeamModeOrTeamArcadeに変更
                if (i === 0) {
                    display.textContent = `Teammate HP: ${ai.hp === Infinity ? '∞' : ai.hp}`;
                    display.style.color = 'cyan';
                } else if (i === 1) {
                    display.textContent = `Enemy 1 HP: ${ai.hp === Infinity ? '∞' : ai.hp}`;
                    display.style.color = 'limegreen';
                } else if (i === 2) {
                    display.textContent = `Enemy 2 HP: ${ai.hp === Infinity ? '∞' : ai.hp}`;
                    display.style.color = 'orange';
                }
            } else if (gameSettings.gameMode === 'ffa') {
                display.textContent = `AI ${i + 1} HP: ${ai.hp === Infinity ? '∞' : ai.hp} | Kills: ${ai.kills}`;
                if (i === 0) display.style.color = 'limegreen';
                else if (i === 1) display.style.color = 'cyan';
                else if (i === 2) display.style.color = 'orange';
            } else {
                display.textContent = `AI ${i + 1} HP: ${ai.hp === Infinity ? '∞' : ai.hp}`;
                if (i === 0) display.style.color = 'limegreen';
                else if (i === 1) display.style.color = 'cyan';
                else if (i === 2) display.style.color = 'orange';
            }
            display.classList.remove('dead-ai-hp'); // 生きている場合はクラスを削除
        } else if (ai && ai.hp <= 0) { // AIが存在し、HPが0以下の場合
            display.style.display = 'block';
            if (isTeamModeOrTeamArcade) { // isTeamModeOrTeamArcadeに変更
                if (i === 0) {
                    display.textContent = `Teammate HP: 0`;
                    display.style.color = 'cyan';
                } else if (i === 1) {
                    display.textContent = `Enemy 1 HP: 0`;
                    display.style.color = 'limegreen';
                } else if (i === 2) {
                    display.textContent = `Enemy 2 HP: 0`;
                    display.style.color = 'orange';
                }
            } else if (gameSettings.gameMode === 'ffa') {
                display.textContent = `AI ${i + 1} HP: 0 | Kills: ${ai.kills}`;
                if (i === 0) display.style.color = 'limegreen';
                else if (i === 1) display.style.color = 'cyan';
                else if (i === 2) display.style.color = 'orange';
            } else {
                display.textContent = `AI ${i + 1} HP: 0`;
                if (i === 0) display.style.color = 'limegreen';
                else if (i === 1) display.style.color = 'cyan';
                else if (i === 2) display.style.color = 'orange';
            }
            display.classList.add('dead-ai-hp'); // 死んでいる場合はクラスを追加
        } else { // AIが存在しない場合 (AIの総数よりiが大きい場合)
            display.style.display = 'none';
        }
    }
    // チームモードの場合、敵チーム全滅で勝利
    if (gameSettings.gameMode === 'team') {
        const enemyAIsDefeated = ais.filter(ai => ai.team === 'enemy').every(ai => ai.hp <= 0);
        if (enemyAIsDefeated && ais.filter(ai => ai.team === 'enemy').length > 0 && isGameRunning && !isAIDeathPlaying) {
            showWinScreen();
        }
    } else {
        const allAIsDefeated = ais.every(ai => ai.hp <= 0);
        if (allAIsDefeated && ais.length > 0 && isGameRunning && !isAIDeathPlaying && (gameSettings.gameMode === 'battle' || gameSettings.gameMode === 'ffa')) {
            showWinScreen();
        }
    }
    if (playerHPDisplay) { 
        playerHPDisplay.textContent = `HP: ${playerHP === Infinity ? '∞' : playerHP}`;
    }

    // 【修正】チームデスマッチ時のスコア表示更新
    if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
        if (playerTeamKillsDisplay) playerTeamKillsDisplay.textContent = `PLAYER TEAM KILLS: ${playerTeamKills}`;
        if (enemyTeamKillsDisplay) enemyTeamKillsDisplay.textContent = `ENEMY TEAM KILLS: ${enemyTeamKills}`;
        if (killCountDisplay) killCountDisplay.style.display = 'none';
    } else if (gameSettings.gameMode === 'arcade' || gameSettings.gameMode === 'ffa') {
        if (killCountDisplay) {
            killCountDisplay.style.display = 'block';
            killCountDisplay.textContent = `KILLS: ${playerKills}`;
        }
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
    
    // Apply smooth time lapse transitions in the animation loop
    if (isTimeLapseMode) {
        applySmoothNightMode();
    }
    
    updateAudioListenerFromCamera(camera);
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
        if (document.getElementById('mr-count')) {
            gameSettings.mrCount = parseInt(document.getElementById('mr-count').value, 10);
        }
        // Get map selection from unified selector
        const unifiedMapSelectorOnStart = document.getElementById('unified-map-selector');
        if (unifiedMapSelectorOnStart && unifiedMapSelectorOnStart.value) {
            const selectedValue = unifiedMapSelectorOnStart.value;
            if (selectedValue === 'default') {
                gameSettings.mapType = 'default';
                gameSettings.customMapName = '';
            } else if (selectedValue && selectedValue !== '---') {
                gameSettings.mapType = 'custom';
                gameSettings.customMapName = selectedValue;
            }
        }
        gameSettings.aiCount = parseInt(document.querySelector('input[name="ai-count"]:checked').value, 10);
        const durationRadio = document.querySelector('input[name="game-duration"]:checked');
        if (durationRadio) {
            gameSettings.gameDuration = parseInt(durationRadio.value, 10);
        }
        saveSettings();
        initializeAudio();
        startGame();
        restartGame();
    });
}
const rButtons = document.querySelectorAll('.restart-button');
rButtons.forEach(button => button.addEventListener('click', () => {
    initializeAudio();
    restartGame();
    if (!(shouldShowTouchControls())) canvas.requestPointerLock();
})); // End of rButtons.forEach callback
    
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
    const previewZoomButton = document.getElementById('preview-zoom-button');
    const previewJoystickZone = document.getElementById('preview-joystick-zone');
    const previewFollowButton = document.getElementById('preview-follow-button'); // 追加

    // Convert pixel values to percentage for responsiveness
    const fireRight = (parseInt(previewFireButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const fireBottom = (parseInt(previewFireButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const crouchRight = (parseInt(previewCrouchButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const crouchBottom = (parseInt(previewCrouchButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const zoomRight = (parseInt(previewZoomButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const zoomBottom = (parseInt(previewZoomButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const joystickLeft = (parseInt(previewJoystickZone.style.left, 10) / window.innerWidth) * 100 + '%';
    const joystickBottom = (parseInt(previewJoystickZone.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const followRight = (parseInt(previewFollowButton.style.right, 10) / window.innerWidth) * 100 + '%'; // 追加
    const followBottom = (parseInt(previewFollowButton.style.bottom, 10) / window.innerHeight) * 100 + '%'; // 追加

    gameSettings.buttonPositions.fire = { right: fireRight, bottom: fireBottom };
    gameSettings.buttonPositions.crouch = { right: crouchRight, bottom: crouchBottom };
    gameSettings.buttonPositions.zoom = { right: zoomRight, bottom: zoomBottom };
    gameSettings.buttonPositions.joystick = { left: joystickLeft, bottom: joystickBottom };
    gameSettings.buttonPositions.follow = { right: followRight, bottom: followBottom }; // 追加

    saveSettings();
    
    // Apply to actual buttons immediately
    const fireButton = document.getElementById('fire-button');
    const crouchButton = document.getElementById('crouch-button');
    const zoomButton = document.getElementById('zoom-button');
    const joystickZone = document.getElementById('joystick-move');
    const followButton = document.getElementById('follow-button'); // 追加

    if (shouldShowTouchControls()) {
        if(fireButton) {
            fireButton.style.right = fireRight;
            fireButton.style.bottom = fireBottom;
            fireButton.style.left = '';
            fireButton.style.top = '';
        }
        if(crouchButton) {
            crouchButton.style.right = crouchRight;
            crouchButton.style.bottom = crouchBottom;
            crouchButton.style.left = '';
            crouchButton.style.top = '';
        }
        if(zoomButton) {
            zoomButton.style.right = zoomRight;
            zoomButton.style.bottom = zoomBottom;
            zoomButton.style.left = '';
            zoomButton.style.top = '';
        }
        if(joystickZone) {
            joystickZone.style.left = joystickLeft;
            joystickZone.style.bottom = joystickBottom;
            joystickZone.style.right = '';
            joystickZone.style.top = '';
        }
        if (followButton) {
            followButton.style.right = followRight;
            followButton.style.bottom = followBottom;
            followButton.style.left = '';
            followButton.style.top = '';
        }
    } else {
        if(fireButton) fireButton.style.display = 'none';
        if(crouchButton) crouchButton.style.display = 'none';
        if(zoomButton) zoomButton.style.display = 'none';
        if(joystickZone) joystickZone.style.display = 'none';
        if (followButton) followButton.style.display = 'none';
    }
}); // End of saveButtonPositionsBtn.addEventListener callback

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
makeDraggable(document.getElementById('preview-zoom-button'));
makeDraggable(document.getElementById('preview-joystick-zone'), true);
makeDraggable(document.getElementById('preview-follow-button')); // 追加

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

// Character Editor Functions
function initCharacterEditor() {
    // Ensure editor is closed on initialization
    const editorScreen = document.getElementById('character-editor-screen');
    if (editorScreen) {
        editorScreen.style.display = 'none';
    }
    
    const openButton = document.getElementById('open-character-editor');
    const closeButton = document.getElementById('close-character-editor');
    const saveButton = document.getElementById('save-character-settings');
    
    if (openButton) {
        openButton.addEventListener('click', function(e) {
            e.preventDefault();
            openCharacterEditor();
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', e => { e.preventDefault(); closeCharacterEditor(); });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', e => { e.preventDefault(); saveCharacterSettings(); });
    }
    
    // Export JSON button
    const exportButton = document.getElementById('export-character-json');
    if (exportButton) {
        exportButton.addEventListener('click', e => { e.preventDefault(); exportCharacterDataToJSON(); });
    }
    
    // Import JSON button
    const importButton = document.getElementById('import-character-json');
    const fileInput = document.getElementById('json-file-input');
    
    if (importButton && fileInput) {
        importButton.addEventListener('click', e => { 
            e.preventDefault(); 
            fileInput.click(); 
        });
        
        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                importCharacterDataFromJSON(file);
            }
            // Reset file input
            fileInput.value = '';
        });
    }
    
    // Preview buttons
    const previewButtons = [
        { id: 'preview-player', character: 'player' },
        { id: 'preview-enemy1', character: 'enemy1' },
        { id: 'preview-enemy2', character: 'enemy2' },
        { id: 'preview-enemy3', character: 'enemy3' }
    ];
    
    previewButtons.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element) {
            element.addEventListener('click', () => {
                currentPreviewCharacter = btn.character;
                updatePreviewCharacter();
            });
        }
    });
    
    // Default buttons
    const defaultButtons = [
        { id: 'default-player', character: 'player' },
        { id: 'default-enemy1', character: 'enemy1' },
        { id: 'default-enemy2', character: 'enemy2' },
        { id: 'default-enemy3', character: 'enemy3' }
    ];
    
    defaultButtons.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element) {
            element.addEventListener('click', () => {
                resetCharacterToDefault(btn.character);
            });
        }
    });
    
    // Add zoom functionality to preview container
    const previewContainer = document.getElementById('character-preview-container');
    if (previewContainer) {
        setupZoomControls(previewContainer);
    }
    
    // Add event listeners for all customization controls
    setupCustomizationListeners();
}

function setupCustomizationListeners() {
    const characters = ['player', 'enemy1', 'enemy2', 'enemy3'];
    const properties = ['hair-style', 'hair-color', 'skin-color', 'clothing-color', 'pants-color', 'shoes-color'];
    
    characters.forEach(char => {
        properties.forEach(prop => {
            const element = document.getElementById(`${char}-${prop}`);
            if (element) {
                element.addEventListener('change', () => {
                    updateCharacterCustomization(char, prop, element.value);
                    if (currentPreviewCharacter === char) {
                        updatePreviewCharacter();
                    }
                });
            }
        });
    });
}

// Zoom functionality for character preview
function setupZoomControls(container) {
    let zoomLevel = 1;
    const minZoom = 0.5;
    const maxZoom = 3;
    const zoomSpeed = 0.1;
    
    // Mouse wheel zoom for PC
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
        
        if (characterEditorCamera) {
            characterEditorCamera.position.z = 5 / zoomLevel;
        }
    });
    
    // Touch pinch zoom for mobile
    let initialDistance = 0;
    
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getTouchDistance(e.touches);
        }
    });
    
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            const currentDistance = getTouchDistance(e.touches);
            const scale = currentDistance / initialDistance;
            
            zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * scale));
            
            if (characterEditorCamera) {
                characterEditorCamera.position.z = 5 / zoomLevel;
            }
            
            initialDistance = currentDistance;
        }
    });
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Reset character to default settings
function resetCharacterToDefault(character) {
    const defaultSettings = {
        player: {
            hairStyle: 'default',
            hairColor: '#D2691E',
            skinColor: '#ffd1b0',
            clothingColor: '#ff3333',
            pantsColor: '#111111',
            shoesColor: '#8B4513'
        },
        enemy1: {
            hairStyle: 'default',
            hairColor: '#D2691E',
            skinColor: '#ffd1b0',
            clothingColor: '#3333ff',
            pantsColor: '#111111',
            shoesColor: '#8B4513'
        },
        enemy2: {
            hairStyle: 'default',
            hairColor: '#D2691E',
            skinColor: '#ffd1b0',
            clothingColor: '#00ff00',
            pantsColor: '#111111',
            shoesColor: '#8B4513'
        },
        enemy3: {
            hairStyle: 'default',
            hairColor: '#D2691E',
            skinColor: '#ffd1b0',
            clothingColor: '#ff8800',
            pantsColor: '#111111',
            shoesColor: '#8B4513'
        }
    };
    
    // Update the character customization
    if (defaultSettings[character]) {
        characterCustomization[character] = { ...defaultSettings[character] };
        
        // Update UI to reflect the changes
        loadCharacterSettingsToUI();
        
        // Update preview if this character is currently selected
        if (currentPreviewCharacter === character) {
            updatePreviewCharacter();
        }
        
        debugLog(`${character} reset to default settings`);
    }
}

function updateCharacterCustomization(character, property, value) {
    if (!characterCustomization[character]) return;
    
    // Convert property names to match the data structure
    const propertyMap = {
        'hair-style': 'hairStyle',
        'hair-color': 'hairColor',
        'skin-color': 'skinColor',
        'clothing-color': 'clothingColor',
        'pants-color': 'pantsColor',
        'shoes-color': 'shoesColor'
    };
    
    const propKey = propertyMap[property];
    if (propKey && characterCustomization[character][propKey] !== undefined) {
        characterCustomization[character][propKey] = value;
    }
}

function openCharacterEditor() {
    const editorScreen = document.getElementById('character-editor-screen');
    if (editorScreen) {
        editorScreen.style.display = 'block';
        initCharacterPreview();
        loadCharacterSettingsToUI();
        updatePreviewCharacter();
    }
}

function closeCharacterEditor() {
    const editorScreen = document.getElementById('character-editor-screen');
    if (editorScreen) {
        editorScreen.style.display = 'none';
        cleanupCharacterPreview();
    }
}

function initCharacterPreview() {
    const container = document.getElementById('character-preview-container');
    if (!container) return;
    
    // Create scene
    characterEditorScene = new THREE.Scene();
    characterEditorScene.background = new THREE.Color(0x111111);
    
    // Create camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    characterEditorCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    characterEditorCamera.position.set(0, 2, 5);
    characterEditorCamera.lookAt(0, 2, 0);
    
    // Create renderer
    characterEditorRenderer = new THREE.WebGLRenderer({ antialias: true });
    characterEditorRenderer.setSize(width, height);
    characterEditorRenderer.shadowMap.enabled = true;
    characterEditorRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear container and add renderer
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(characterEditorRenderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    characterEditorScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    characterEditorScene.add(directionalLight);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    characterEditorScene.add(ground);
    
    // Start animation loop
    animateCharacterPreview();
}

function animateCharacterPreview() {
    characterEditorAnimationId = requestAnimationFrame(animateCharacterPreview);
    
    if (previewCharacter) {
        previewCharacter.rotation.y += 0.01;
    }
    
    characterEditorRenderer.render(characterEditorScene, characterEditorCamera);
}

function cleanupCharacterPreview() {
    if (characterEditorAnimationId) {
        cancelAnimationFrame(characterEditorAnimationId);
        characterEditorAnimationId = null;
    }
    
    if (previewCharacter) {
        characterEditorScene.remove(previewCharacter);
        previewCharacter = null;
    }
    
    if (characterEditorRenderer) {
        characterEditorRenderer.dispose();
        characterEditorRenderer = null;
    }
    
    characterEditorScene = null;
    characterEditorCamera = null;
}

function updatePreviewCharacter() {
    if (!characterEditorScene) return;
    
    // Remove existing preview character
    if (previewCharacter) {
        characterEditorScene.remove(previewCharacter);
        previewCharacter.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            disposeMaterial(child.material); // 安全なマテリアル破棄を使用
        });
    }
    
    // Create new preview character with current customization
    const customization = characterCustomization[currentPreviewCharacter];
    previewCharacter = createCharacterModel(0xffffff, customization);
    
    // Reset pose to default standing position
    resetCharacterPose(previewCharacter);
    
    previewCharacter.position.set(0, 0, 0);
    previewCharacter.castShadow = true;
    previewCharacter.receiveShadow = true;
    
    characterEditorScene.add(previewCharacter);
}

function resetCharacterPose(character) {
    if (!character || !character.userData.parts) return;
    
    const parts = character.userData.parts;
    
    // Reset all body parts to default positions
    if (parts.body) {
        parts.body.rotation.set(0, 0, 0);
    }
    if (parts.head) {
        parts.head.rotation.set(0, 0, 0);
    }
    if (parts.aimGroup) {
        parts.aimGroup.rotation.set(0, 0, 0);
    }
    if (parts.leftArm) {
        parts.leftArm.rotation.set(0, 0, 0);
    }
    if (parts.rightArm) {
        parts.rightArm.rotation.set(0, 0, 0);
    }
    if (parts.leftElbow) {
        parts.leftElbow.rotation.set(0, 0, 0);
    }
    if (parts.rightElbow) {
        parts.rightElbow.rotation.set(0, 0, 0);
    }
    if (parts.leftHip) {
        parts.leftHip.rotation.set(0, 0, 0);
    }
    if (parts.rightHip) {
        parts.rightHip.rotation.set(0, 0, 0);
    }
    if (parts.leftKnee) {
        parts.leftKnee.rotation.set(0, 0, 0);
    }
    if (parts.rightKnee) {
        parts.rightKnee.rotation.set(0, 0, 0);
    }
    // Hide gun only for preview characters
    if (parts.gun) {
        parts.gun.visible = false;
    }
}

function resetCharacterVisualPose(character, weaponType) {
    if (!character || !character.userData || !character.userData.parts) return;
    const parts = character.userData.parts;
    resetCharacterPose(character);
    if (parts.head && typeof parts.baseHeadY === 'number') {
        parts.head.position.y = parts.baseHeadY;
    }
    if (parts.gun) {
        applyGunStyle(parts.gun, weaponType);
    }
    applyWeaponPose(parts, weaponType);
    if (parts.gun) parts.gun.visible = true;
}

function getPlayerDeathLookAt() {
    if (playerModel && playerModel.userData && playerModel.userData.parts) {
        const parts = playerModel.userData.parts;
        const ref = parts.body || parts.aimGroup || playerModel;
        const pos = new THREE.Vector3();
        ref.getWorldPosition(pos);
        pos.y += 0.2;
        return pos;
    }
    return player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
}

function attachDeathCameraToScene() {
    if (!camera) return;
    if (!playerDeathCamSavedParent) {
        playerDeathCamSavedParent = camera.parent;
        playerDeathCamSavedLocalPos = camera.position.clone();
        playerDeathCamSavedLocalRot = camera.rotation.clone();
    }
    if (camera.parent !== scene) {
        scene.add(camera);
    }
}

function restoreDeathCameraParent() {
    if (!camera || !playerDeathCamSavedParent) return;
    if (camera.parent !== playerDeathCamSavedParent) {
        playerDeathCamSavedParent.add(camera);
    }
    if (playerDeathCamSavedLocalPos) camera.position.copy(playerDeathCamSavedLocalPos);
    if (playerDeathCamSavedLocalRot) camera.rotation.copy(playerDeathCamSavedLocalRot);
    playerDeathCamSavedParent = null;
    playerDeathCamSavedLocalPos = null;
    playerDeathCamSavedLocalRot = null;
}

function loadCharacterSettingsToUI() {
    const characters = ['player', 'enemy1', 'enemy2', 'enemy3'];
    const properties = ['hair-style', 'hair-color', 'skin-color', 'clothing-color', 'pants-color', 'shoes-color'];
    
    characters.forEach(char => {
        const custom = characterCustomization[char];
        if (!custom) return;
        
        properties.forEach(prop => {
            const element = document.getElementById(`${char}-${prop}`);
            if (element) {
                const propertyMap = {
                    'hair-style': 'hairStyle',
                    'hair-color': 'hairColor',
                    'skin-color': 'skinColor',
                    'clothing-color': 'clothingColor',
                    'pants-color': 'pantsColor',
                    'shoes-color': 'shoesColor'
                };
                
                const propKey = propertyMap[prop];
                if (propKey && custom[propKey] !== undefined) {
                    element.value = custom[propKey];
                }
            }
        });
    });
}

function saveCharacterSettings() {
    // Save to localStorage
    localStorage.setItem('characterCustomization', JSON.stringify(characterCustomization));
    
    // Show feedback
    const saveButton = document.getElementById('save-character-settings');
    if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.backgroundColor = '#4CAF50';
        }, 1500);
    }
}

function loadCharacterSettings() {
    const saved = localStorage.getItem('characterCustomization');
    if (saved) {
        try {
            characterCustomization = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load character customization:', e);
        }
    }
}

// Export character data to JSON
function exportCharacterDataToJSON() {
    const characterData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        characters: {
            player: characterCustomization.player,
            enemy1: characterCustomization.enemy1,
            enemy2: characterCustomization.enemy2,
            enemy3: characterCustomization.enemy3
        }
    };
    
    const jsonString = JSON.stringify(characterData, null, 2);
    
    // Create and download JSON file
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `character_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugLog('Character data exported to JSON:', characterData);
}

// Import character data from JSON
function importCharacterDataFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const characterData = JSON.parse(e.target.result);
            
            // Validate JSON structure
            if (!characterData.characters || !characterData.characters.player) {
                throw new Error('Invalid character data format');
            }
            
            // Update character customization
            characterCustomization.player = characterData.characters.player || characterCustomization.player;
            characterCustomization.enemy1 = characterData.characters.enemy1 || characterCustomization.enemy1;
            characterCustomization.enemy2 = characterData.characters.enemy2 || characterCustomization.enemy2;
            characterCustomization.enemy3 = characterData.characters.enemy3 || characterCustomization.enemy3;
            
            // Update UI with loaded data
            loadCharacterSettingsToUI();
            
            // Save to localStorage
            saveCharacterSettings();
            
            // Update preview if currently showing
            if (previewCharacter) {
                updatePreviewCharacter();
            }
            
            debugLog('Character data imported successfully:', characterData);
            alert('Character data imported successfully!');
            
        } catch (error) {
            console.error('Error importing character data:', error);
            alert('Error importing character data: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Initialize character editor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load settings first
    loadCharacterSettings();
    
    // Time Lapse Mode event listener
    const timeLapseCheckbox = document.getElementById('time-lapse-mode');
    if (timeLapseCheckbox) {
        timeLapseCheckbox.addEventListener('change', function() {
            if (this.checked) {
                startTimeLapseMode();
            } else {
                stopTimeLapseMode();
            }
        });
    }
    
    // Night Mode event listener
    const nightModeCheckbox = document.getElementById('night-mode');
    if (nightModeCheckbox) {
        nightModeCheckbox.addEventListener('change', function() {
            gameSettings.nightModeEnabled = this.checked;
            applyNightMode(this.checked);
            saveSettings();
            debugLog('Manual night mode toggle:', this.checked);
        });
    }
    
    // Initialize editor after a small delay to ensure all elements are ready
    setTimeout(() => {
        initCharacterEditor();
    }, 100);
}); // End of second DOMContentLoaded event listener

animate();
