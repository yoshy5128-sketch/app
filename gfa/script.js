const PLAYER_INITIAL_POSITION = new THREE.Vector3(0, 2.0, -20);
let gameSettings = {
    playerHP: 20,
    aiHP: 20,
    projectileSpeedMultiplier: 2.0,
    mgCount: 1,
    rrCount: 1,
    srCount: 1,
    sgCount: 1,
    defaultWeapon: 'pistol',
    medikitCount: 0,
    mapType: 'default',
    aiCount: 2,
    autoAim: true,
    nightModeEnabled: false,
    nightModeLightIntensity: 3.0,
    timeLapseMode: false,
    customMapName: 'Default Custom Map',
    gameMode: 'battle',
    killCamMode: 'playerOnly',
    gameDuration: 180, // 3分間 (180秒)
    buttonPositions: {
        fire: { right: '20px', bottom: '120px' },
        crouch: { right: '20px', bottom: '55px' },
        joystick: { left: '10%', bottom: '10%' },
        follow: { right: '20px', bottom: '190px' }
    }
};
let originalSettings = {};
let isPaused = false;

// Character customization settings
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

// Time Lapse Mode variables
let timeLapseInterval = null;
let timeLapseStartTime = null;
let isTimeLapseMode = false;
let currentTransitionProgress = 0; // 0 = fully day, 1 = fully night
let targetTransitionProgress = 0;
const TIME_LAPSE_CYCLE_TIME = 60000; // 1 minute in milliseconds
const TRANSITION_DURATION = 5000; // 5 seconds for smooth transition

// Time Lapse Mode functions
function startTimeLapseMode() {
    if (timeLapseInterval) return; // Already running
    
    isTimeLapseMode = true;
    timeLapseStartTime = Date.now();
    currentTransitionProgress = 0; // Start with day mode
    targetTransitionProgress = 0;
    
    // Start cycle - check every second for smooth transitions
    timeLapseInterval = setInterval(() => {
        updateTimeLapseCycle();
    }, 1000); // Check every second
    
    // Initial state - start with day mode
    applyNightMode(false);
    
    // Update UI
    const nightModeCheckbox = document.getElementById('night-mode');
    if (nightModeCheckbox) {
        nightModeCheckbox.checked = false;
    }
    
    console.log('Time Lapse Mode started - beginning with day mode');
}

function stopTimeLapseMode() {
    if (timeLapseInterval) {
        clearInterval(timeLapseInterval);
        timeLapseInterval = null;
    }
    isTimeLapseMode = false;
    timeLapseStartTime = null;
    
    console.log('Time Lapse Mode stopped');
}

function updateTimeLapseCycle() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - timeLapseStartTime;
    const cycleTime = parseInt(TIME_LAPSE_CYCLE_TIME);
    const cyclePosition = (elapsedTime % cycleTime) / cycleTime;
    
    // Calculate target transition progress based on cycle position
    // 0-0.33: day mode (1 -> 0) - 20 seconds
    // 0.33-1.0: night mode (0 -> 1) - 40 seconds
    let newTargetProgress;
    if (cyclePosition < 0.33) {
        // First third: day mode (1 -> 0)
        newTargetProgress = 1 - (cyclePosition * 3); // 1 to 0 over 20 seconds
    } else {
        // Last two-thirds: night mode (0 -> 1)
        newTargetProgress = (cyclePosition - 0.33) * 1.5; // 0 to 1 over 40 seconds
    }
    
    targetTransitionProgress = newTargetProgress;
    
    console.log(`Time Lapse Debug: cyclePosition=${cyclePosition.toFixed(3)}, targetProgress=${targetTransitionProgress.toFixed(3)}`);
    
    // Apply smooth transition
    applySmoothNightMode();
}

function applySmoothNightMode() {
    // Use target progress directly instead of smooth transition
    // This prevents the "gakuri" sudden darkness
    const nightIntensity = targetTransitionProgress;
    const dayIntensity = 1 - targetTransitionProgress;
    
    // Day settings
    const dayAmbientIntensity = 0.7; // 増加 (0.5 → 0.7)
    const dayDirectionalIntensity = 1.0; // 増加 (0.8 → 1.0)
    const dayClearColor = new THREE.Color(0xADD8E6); // Light blue (brighter)
    
    // Night settings - same as regular night mode
    const nightAmbientIntensity = 0.05; // Same as regular night mode
    const nightDirectionalIntensity = 0.05; // Same as regular night mode
    const nightClearColor = new THREE.Color(0x111122); // Same as regular night mode
    
    // Interpolate between day and night
    const currentAmbientIntensity = dayAmbientIntensity * dayIntensity + nightAmbientIntensity * nightIntensity;
    const currentDirectionalIntensity = dayDirectionalIntensity * dayIntensity + nightDirectionalIntensity * nightIntensity;
    const currentClearColor = dayClearColor.clone().lerp(nightClearColor, nightIntensity);
    
    // Apply interpolated values
    if (ambientLight) {
        ambientLight.intensity = currentAmbientIntensity;
        console.log(`Time Lapse: ambientLight intensity set to ${currentAmbientIntensity.toFixed(3)} (nightIntensity: ${nightIntensity.toFixed(3)})`);
    }
    if (directionalLight) {
        directionalLight.intensity = currentDirectionalIntensity;
        console.log(`Time Lapse: directionalLight intensity set to ${currentDirectionalIntensity.toFixed(3)} (nightIntensity: ${nightIntensity.toFixed(3)})`);
    }
    if (renderer) {
        renderer.setClearColor(currentClearColor);
        console.log(`Time Lapse: renderer clear color set to #${currentClearColor.getHexString()} (nightIntensity: ${nightIntensity.toFixed(3)})`);
    }
    
    // Handle street lights - match regular night mode behavior
    if (streetLights && streetLights.length > 0) {
        streetLights.forEach(light => {
            const pointLight = light.children.find(child => child.isPointLight);
            if (pointLight) {
                // Use direct intensity like regular night mode, not smooth transition
                pointLight.intensity = nightIntensity * gameSettings.nightModeLightIntensity;
            }
        });
    }
    
    // Update UI checkbox (snap to nearest state)
    const shouldBeNightMode = nightIntensity > 0.5;
    gameSettings.nightModeEnabled = shouldBeNightMode;
    const nightModeCheckbox = document.getElementById('night-mode');
    if (nightModeCheckbox && nightModeCheckbox.checked !== shouldBeNightMode) {
        nightModeCheckbox.checked = shouldBeNightMode;
    }
}

function applyNightMode(isNight) {
    console.log('applyNightMode called with:', isNight);
    
    if (isNight) {
        // Apply night mode
        console.log('Applying night mode');
        if (ambientLight) {
            ambientLight.intensity = 0.05;
            console.log('ambientLight intensity set to 0.05');
        }
        if (directionalLight) {
            directionalLight.intensity = 0.05;
            console.log('directionalLight intensity set to 0.05');
        }
        if (renderer) {
            renderer.setClearColor(0x111122);
            console.log('renderer clear color set to night');
        }
        if (streetLights && streetLights.length > 0) {
            streetLights.forEach(light => {
                const pointLight = light.children.find(child => child.isPointLight);
                if (pointLight) pointLight.intensity = gameSettings.nightModeLightIntensity;
            });
            console.log('street lights turned on');
        }
    } else {
        // Apply day mode
        console.log('Applying day mode');
        if (ambientLight) {
            ambientLight.intensity = 0.5;
            console.log('ambientLight intensity set to 0.5');
        }
        if (directionalLight) {
            directionalLight.intensity = 0.8;
            console.log('directionalLight intensity set to 0.8');
        }
        if (renderer) {
            renderer.setClearColor(0x87CEEB);
            console.log('renderer clear color set to day');
        }
        if (streetLights && streetLights.length > 0) {
            streetLights.forEach(light => {
                const pointLight = light.children.find(child => child.isPointLight);
                if (pointLight) pointLight.intensity = 0;
            });
            console.log('street lights turned off');
        }
    }
}

// Night mode variables
let isNightMode = false;

// Character editor variables
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
        aimgGunSound = document.getElementById('aimgGunSound');
        aiGunSound = document.getElementById('aiGunSound');
        explosionSound = document.getElementById('explosionSound');
        startScreen = document.getElementById('start-screen');
        gameOverScreen = document.getElementById('game-over-screen');
        aiSrGunSound = document.getElementById('aiSrGunSound');
        playerSgSound = document.getElementById('playerSgSound');
        aiSgSound = document.getElementById('aiSgSound');
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
        updateCustomMapSelector();
        
        // ユーザーの選択を尊重（強制設定を無効化）
        // gameSettings.mapType = 'default';
        // gameSettings.customMapName = '';
        // saveSettings();
        
        const playerHpSelect = document.getElementById('player-hp');
        const aiHpSelect = document.getElementById('ai-hp');
        const mgCountSelect = document.getElementById('mg-count');
        const rrCountSelect = document.getElementById('rr-count');
        const srCountSelect = document.getElementById('sr-count');
        const sgCountSelect = document.getElementById('sg-count');
        const aiCountRadios = document.querySelectorAll('input[name="ai-count"]');
        const mapTypeRadios = document.querySelectorAll('input[name="map-type"]');
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
        mapTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    gameSettings.mapType = radio.value;
                    saveSettings();
                }
            });
        });
        
        // Set initial radio button values and update custom map selector
        mapTypeRadios.forEach(radio => {
            radio.checked = (radio.value === gameSettings.mapType);
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
                const selectedMapName = customMapSelector.value;
                gameSettings.customMapName = selectedMapName;
                saveSettings();
                // マップ選択時に保存された設定を自動読み込み
                if (selectedMapName && selectedMapName !== '') {
                    loadMapSettings(selectedMapName);
                }
            });
        }
        const saveMapSettingsBtn = document.getElementById('save-map-settings-btn');
        if (saveMapSettingsBtn) {
            saveMapSettingsBtn.addEventListener('click', () => {
                const selectedMapName = customMapSelector ? customMapSelector.value : '';
                saveMapSettings(selectedMapName);
            });
        }

        const loadSelectedCustomMapBtn = document.getElementById('load-selected-custom-map-btn');
        if (loadSelectedCustomMapBtn) {
            loadSelectedCustomMapBtn.addEventListener('click', () => {
                gameSettings.mapType = 'custom';
                const selectedMapName = customMapSelector ? customMapSelector.value : '';
                // マップ読み込み時に保存された設定を自動適用
                if (selectedMapName && selectedMapName !== '') {
                    loadMapSettings(selectedMapName);
                }
                saveSettings();
                startGame();
                restartGame();
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
        customMapSelector.value = ''; // 最初は空白にする
        if (document.getElementById('load-selected-custom-map-btn')) {
            document.getElementById('load-selected-custom-map-btn').disabled = false;
        }
        // 自動読み込みを無効化 - ユーザーが明示的に選択した場合のみ読み込む
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
let playerMGReloadUntil = 0;
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
const ENABLE_EXPERIMENTAL_AI_FLOW = false;
// Enable rooftop logic so AI can find ladders, climb to rooftops and engage players there.
const ENABLE_AI_ROOFTOP_LOGIC = true;

function isInfiniteDefaultWeaponActive(weaponType) {
    return false;
}

function applyPlayerDefaultWeaponLoadout() {
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    currentWeapon = selected;
    ammoMG = selected === WEAPON_MG ? MAX_AMMO_MG : 0;
    ammoRR = selected === WEAPON_RR ? MAX_AMMO_RR : 0;
    ammoSR = selected === WEAPON_SR ? MAX_AMMO_SR : 0;
    ammoSG = selected === WEAPON_SG ? MAX_AMMO_SG : 0;
}

function isInfiniteDefaultWeaponActiveForAI(ai, weaponType) {
    if (!ai) return false;
    return false;
}

function applyAIDefaultWeaponLoadout(ai) {
    const selected = gameSettings.defaultWeapon || WEAPON_PISTOL;
    ai.currentWeapon = selected;
    ai.ammoMG = selected === WEAPON_MG ? MAX_AMMO_MG : 0;
    ai.ammoRR = selected === WEAPON_RR ? MAX_AMMO_RR : 0;
    ai.ammoSR = selected === WEAPON_SR ? MAX_AMMO_SR : 0;
    ai.ammoSG = selected === WEAPON_SG ? MAX_AMMO_SG : 0;
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
}

function showReloadingText() {
    let el = document.getElementById('reloading-text');
    if (!el) {
        el = document.createElement('div');
        el.id = 'reloading-text';
        document.body.appendChild(el);
    }
    el.textContent = 'Reloading';
    el.style.position = 'fixed';
    el.style.top = '45%';
    el.style.left = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.color = 'red';
    el.style.fontSize = '24px';
    el.style.fontWeight = 'bold';
    el.style.zIndex = '1000';
    el.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    el.style.display = 'block';
}

function hideReloadingText() {
    const el = document.getElementById('reloading-text');
    if (el) el.style.display = 'none';
}

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
    gameSettings.nightModeEnabled = document.getElementById('night-mode').checked;
    gameSettings.nightModeIntensity = document.getElementById('night-mode-intensity').value;
    gameSettings.timeLapseMode = document.getElementById('time-lapse-mode').checked;
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
}

function loadSettings() {
    console.log('loadSettings() called');
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
        Object.assign(gameSettings, parsedSavedSettings);
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
        // Add default for buttonPositions if it doesn't exist
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.gameMode);
        });
        document.querySelectorAll('input[name="killcam-mode"]').forEach(radio => {
            radio.checked = (radio.value === gameSettings.killCamMode);
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
            const joystickZone = document.getElementById('joystick-move');
            const followButton = document.getElementById('follow-button');
            const previewFireButton = document.getElementById('preview-fire-button');
            const previewCrouchButton = document.getElementById('preview-crouch-button');
            const previewJoystickZone = document.getElementById('preview-joystick-zone');
            const previewFollowButton = document.getElementById('preview-follow-button');

            const setupButton = (btn, position, displayType = 'flex') => {
                if (!btn) return;
                if ('ontouchstart' in window) {
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
                        follow: { right: '20px', bottom: '190px' } // 追加
                    };
                } else if (parsedSavedSettings.buttonPositions.joystick === undefined) {
                    parsedSavedSettings.buttonPositions.joystick = { left: '10%', bottom: '10%' };
                } else if (parsedSavedSettings.buttonPositions.follow === undefined) { // 追加
                    parsedSavedSettings.buttonPositions.follow = { right: '20px', bottom: '190px' }; // 追加
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
                document.querySelectorAll('input[name="default-weapon"]').forEach(check => {
                    check.checked = (gameSettings.defaultWeapon === check.value);
                });
                if (document.getElementById('medikit-count')) document.getElementById('medikit-count').value = gameSettings.medikitCount;
                document.querySelectorAll('input[name="ai-count"]').forEach(radio => {
                    radio.checked = (radio.value === String(gameSettings.aiCount));
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
                document.querySelectorAll('input[name="killcam-mode"]').forEach(radio => {
                    radio.checked = (radio.value === gameSettings.killCamMode);
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
                    const joystickZone = document.getElementById('joystick-move');
                    const followButton = document.getElementById('follow-button'); // 追加
                    const previewFireButton = document.getElementById('preview-fire-button');
                    const previewCrouchButton = document.getElementById('preview-crouch-button');
                    const previewJoystickZone = document.getElementById('preview-joystick-zone');
                    const previewFollowButton = document.getElementById('preview-follow-button'); // 追加
        


                    if (fireButton) {
                        if ('ontouchstart' in window) {
                            if (gameSettings.buttonPositions.fire) {
                                fireButton.style.right = gameSettings.buttonPositions.fire.right;
                                fireButton.style.bottom = gameSettings.buttonPositions.fire.bottom;
                                fireButton.style.left = '';
                                fireButton.style.top = '';
                                fireButton.style.display = 'flex'; // モバイルなら表示
                                console.log('loadSettings(): fireButton display set to flex (mobile)');
                            }
                        } else {
                            fireButton.style.display = 'none'; // PCなら非表示
                            console.log('loadSettings(): fireButton display set to none (PC)');
                        }
                    }
                    if (crouchButton) {
                        if ('ontouchstart' in window) {
                            if (gameSettings.buttonPositions.crouch) {
                                crouchButton.style.right = gameSettings.buttonPositions.crouch.right;
                                crouchButton.style.bottom = gameSettings.buttonPositions.crouch.bottom;
                                crouchButton.style.left = '';
                                crouchButton.style.top = '';
                                crouchButton.style.display = 'flex'; // モバイルなら表示
                                console.log('loadSettings(): crouchButton display set to flex (mobile)');
                            }
                        } else {
                            crouchButton.style.display = 'none'; // PCなら非表示
                            console.log('loadSettings(): crouchButton display set to none (PC)');
                        }
                    }
                    if (joystickZone) {
                        if ('ontouchstart' in window) {
                            if (gameSettings.buttonPositions.joystick) {
                                joystickZone.style.left = gameSettings.buttonPositions.joystick.left;
                                joystickZone.style.bottom = gameSettings.buttonPositions.joystick.bottom;
                                joystickZone.style.right = '';
                                joystickZone.style.top = '';
                                joystickZone.style.display = 'block'; // モバイルなら表示
                                console.log('loadSettings(): joystickZone display set to block (mobile)');
                            }
                        } else {
                            joystickZone.style.display = 'none'; // PCなら非表示
                            console.log('loadSettings(): joystickZone display set to none (PC)');
                        }
                    }
                    if (followButton) { // 追加
                        if ('ontouchstart' in window) {
                            if (gameSettings.buttonPositions.follow) {
                                followButton.style.right = gameSettings.buttonPositions.follow.right;
                                followButton.style.bottom = gameSettings.buttonPositions.follow.bottom;
                                followButton.style.left = '';
                                followButton.style.top = '';
                                console.log('loadSettings(): followButton display updated (mobile)');
                                // followButtonの表示/非表示はstartGame()内のゲームモード判定に任せる
                            }
                        } else {
                            followButton.style.display = 'none'; // PCなら非表示
                            console.log('loadSettings(): followButton display set to none (PC)');
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
let aimgGunSound;
let aiGunSound;
let explosionSound;
let startScreen;
let gameOverScreen;
let aiSrGunSound;
let playerSgSound;
let aiSgSound;
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
            const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'player-weapon-display', 'pause-button', 'game-timer-display', 'player-team-kills-display', 'enemy-team-kills-display'];
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
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 }); // More visible
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
    const rooftopFloorGeometry = new THREE.BoxGeometry(buildingWidth, 0.1, buildingDepth);
    const rooftopFloorMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.3 });
    const rooftopFloor = new THREE.Mesh(rooftopFloorGeometry, rooftopFloorMaterial);
    rooftopFloor.position.set(obstacle.position.x, rooftopY, obstacle.position.z);
    rooftopFloor.userData.parentBuilding = obstacle;
    rooftopFloor.userData.isRooftop = true;
    scene.add(rooftopFloor);
    obstacles.push(rooftopFloor);
    obstacle.userData.rooftopParts.push(rooftopFloor);
    
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

function createHollowObstacle(x, z, width = 8, height = 5, depth = 8, color = 0xff4444, hp = 1, holeConfigs = [], isNew = true) {
    console.log('=== HOLLOW OBSTACLE (WORKING VERSION) ===');
    console.log('Building height:', height);
    
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
    
    console.log('=== CREATION COMPLETE ===');
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
    
    console.log('FRONT WALL: door width =', doorWidth, 'door height =', doorHeight);
    console.log('Building width =', width, 'height =', height);
    
    // TOP PIECE - ドアの上
    const topHeight = height - doorHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(width, topHeight, thickness);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(0, doorHeight + topHeight/2, zPos);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        console.log('Top piece: height =', topHeight, 'y =', doorHeight + topHeight/2);
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
        console.log('Left piece: width =', leftWidth, 'y =', doorHeight/2);
    }
    
    // RIGHT PIECE - ドアの右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(leftWidth, doorHeight, thickness);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(width/2 - leftWidth/2, doorHeight/2, zPos);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        console.log('Right piece: width =', leftWidth, 'y =', doorHeight/2);
    }
    
    console.log('Front wall with door created using BoxGeometry method');
}

function createBackWallWithWindows(building, width, height, thickness, zPos, material) {
    // BoxGeometry方式で確実なコリジョン
    const windowWidth = 1.2;
    const windowHeight = 1.2;
    const windowY = 0.3; // プレイヤーの視線レベルにさらに下げる
    const windowSpacing = 0.5; // 窓の間隔
    
    console.log('BACK WALL: window width =', windowWidth, 'height =', windowHeight, 'y =', windowY);
    
    // TOP PIECE - 窓の上
    const topHeight = height - windowY - windowHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(width, topHeight, thickness);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(0, windowY + windowHeight + topHeight/2, zPos);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        console.log('Back top piece: height =', topHeight, 'y =', windowY + windowHeight + topHeight/2);
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
        console.log('Back bottom piece: height =', bottomHeight, 'y =', bottomHeight/2);
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
        console.log('Back left piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    // MIDDLE PIECE - 窓の間
    const middleGeometry = new THREE.BoxGeometry(windowSpacing, windowHeight, thickness);
    const middlePiece = new THREE.Mesh(middleGeometry, material);
    middlePiece.position.set(0, windowY + windowHeight/2, zPos);
    middlePiece.userData.isWall = true;
    building.add(middlePiece);
    obstacles.push(middlePiece);
    console.log('Back middle piece: width =', windowSpacing, 'y =', windowY + windowHeight/2);
    
    // RIGHT PIECE - 右の窓の右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(leftWidth, windowHeight, thickness);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(width/2 - leftWidth/2, windowY + windowHeight/2, zPos);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        console.log('Back right piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    console.log('Back wall with windows created using BoxGeometry method');
}

function createSideWallWithWindow(building, wallDepth, height, thickness, xPos, material, rotationY) {
    // BoxGeometry方式で確実なコリジョン
    const windowWidth = 1.2;
    const windowHeight = 1.2;
    const windowY = 0.3; // プレイヤーの視線レベルにさらに下げる
    
    console.log('SIDE WALL: window width =', windowWidth, 'height =', windowHeight, 'y =', windowY);
    
    // TOP PIECE - 窓の上
    const topHeight = height - windowY - windowHeight;
    if (topHeight > 0) {
        const topGeometry = new THREE.BoxGeometry(thickness, topHeight, wallDepth);
        const topPiece = new THREE.Mesh(topGeometry, material);
        topPiece.position.set(xPos, windowY + windowHeight + topHeight/2, 0);
        topPiece.userData.isWall = true;
        building.add(topPiece);
        obstacles.push(topPiece);
        console.log('Side top piece: height =', topHeight, 'y =', windowY + windowHeight + topHeight/2);
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
        console.log('Side bottom piece: height =', bottomHeight, 'y =', bottomHeight/2);
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
        console.log('Side left piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    // RIGHT PIECE - 窓の右
    if (leftWidth > 0) {
        const rightGeometry = new THREE.BoxGeometry(thickness, windowHeight, leftWidth);
        const rightPiece = new THREE.Mesh(rightGeometry, material);
        rightPiece.position.set(xPos, windowY + windowHeight/2, wallDepth/2 - leftWidth/2);
        rightPiece.userData.isWall = true;
        building.add(rightPiece);
        obstacles.push(rightPiece);
        console.log('Side right piece: width =', leftWidth, 'y =', windowY + windowHeight/2);
    }
    
    console.log('Side wall with window created using BoxGeometry method');
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
    scene.add(box);
    obstacles.push(box);
    let ladderFace = -1;
    if (height > 6) {
        ladderFace = createAndAttachLadder(box);
    }
    // if (height >= 8) {
    //     createWindows(box, width, height, depth);
    //     addRooftopFeatures(box, ladderFace);
    // }
    const HIDING_DISTANCE = 1.5;
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z + HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x + HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
    HIDING_SPOTS.push({ position: new THREE.Vector3(x - HIDING_DISTANCE, 0, z - HIDING_DISTANCE), obstacle: box });
}

function createHouse(x, z, width = 8, height = 5, depth = 8, color = 0xff6666, hp = 8) {
    // Initialize textures if not done yet
    initializeTextures();
    
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    
    // ランダムな入口向きを追加
    const randomRotation = Math.floor(Math.random() * 4) * (Math.PI / 2); // 0, 90, 180, 270度
    house.rotation.y = randomRotation;

    const material = new THREE.MeshLambertMaterial({ 
        color: color, 
        side: THREE.DoubleSide 
    });

    const thickness = 0.2;

    // 穴あき壁を生成する共通関数
    function createWallMesh(w, h, t, mat, holes = []) {
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(w / 2, 0);
        shape.lineTo(w / 2, h);
        shape.lineTo(-w / 2, h);
        shape.lineTo(-w / 2, 0);

        holes.forEach(hole => {
            const holePath = new THREE.Path();
            holePath.moveTo(hole.x - hole.w / 2, hole.y);
            holePath.lineTo(hole.x + hole.w / 2, hole.y);
            holePath.lineTo(hole.x + hole.w / 2, hole.y + hole.h);
            holePath.lineTo(hole.x - hole.w / 2, hole.y + hole.h);
            holePath.lineTo(hole.x - hole.w / 2, hole.y);
            shape.holes.push(holePath);
        });

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: t,
            bevelEnabled: false
        });
        const mesh = new THREE.Mesh(geometry, mat);
        return mesh;
    }

    // 1. 床 - 削除して内部移動を可能に
    // const floor = new THREE.Mesh(
    //     new THREE.BoxGeometry(width, thickness, depth),
    //     material
    // );
    // floor.position.y = thickness / 2;
    // floor.receiveShadow = true;
    // house.add(floor);

    // 2. 正面壁 - ドア部分を空けて2つの壁パーツに分ける
    console.log('Creating front wall without door section');
    
    // 左側の壁
    const leftWallWidth = (width - 2) / 2; // ドア幅2mを引いて半分に
    const frontLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(leftWallWidth, height, thickness),
        material
    );
    frontLeftWall.position.set(-width/2 + leftWallWidth/2, height/2, depth / 2 - thickness/2);
    frontLeftWall.userData.isWall = true;
    house.add(frontLeftWall);
    obstacles.push(frontLeftWall);
    
    // 右側の壁
    const rightWallPart = new THREE.Mesh(
        new THREE.BoxGeometry(leftWallWidth, height, thickness),
        material
    );
    rightWallPart.position.set(width/2 - leftWallWidth/2, height/2, depth / 2 - thickness/2);
    rightWallPart.userData.isWall = true;
    house.add(rightWallPart);
    obstacles.push(rightWallPart);
    
    console.log('Door opening created - no wall at center');

    // 3. 背面壁 (窓2つ)
    const backWall = createWallMesh(width, height, thickness, material, [
        { x: -width/4, y: 1.5, w: 1.5, h: 1.5 },
        { x: width/4, y: 1.5, w: 1.5, h: 1.5 }
    ]);
    backWall.position.set(0, 0, -depth / 2);
    backWall.userData.isWall = true; // コリジョン用
    house.add(backWall);
    obstacles.push(backWall); // 障害物リストに追加

    // 4. 左壁 (窓1つ)
    const leftSideWall = createWallMesh(depth, height, thickness, material, [
        { x: 0, y: 1.5, w: 2, h: 1.5 }
    ]);
    leftSideWall.rotation.y = Math.PI / 2;
    leftSideWall.position.set(-width / 2, 0, 0);
    leftSideWall.userData.isWall = true; // コリジョン用
    house.add(leftSideWall);
    obstacles.push(leftSideWall); // 障害物リストに追加

    // 5. 右壁 (窓1つ)
    const rightSideWall = createWallMesh(depth, height, thickness, material, [
        { x: 0, y: 1.5, w: 2, h: 1.5 }
    ]);
    rightSideWall.rotation.y = -Math.PI / 2;
    rightSideWall.position.set(width / 2, 0, 0);
    rightSideWall.userData.isWall = true; // コリジョン用
    house.add(rightSideWall);
    obstacles.push(rightSideWall); // 障害物リストに追加

    // 6. 屋根
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.4, thickness, depth + 0.4),
        material
    );
    roof.position.y = height + thickness;
    roof.castShadow = true;
    house.add(roof);

    // userDataを設定
    house.userData = { 
        type: 'house',
        width: width,
        height: height,
        depth: depth,
        color: color,
        hp: hp
    };
    
    scene.add(house);
    
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
    // createWindows(tower, TOWER_WIDTH, TOWER_HEIGHT, TOWER_DEPTH); // Removed windows for performance
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
        if (config.type === 'tower') {
            // カスタムマップの塔データの場合
            createSniperTower(config.x, config.z);
        } else if (config.type === 'house') {
            // カスタムマップの家データの場合
            createHouse(config.x, config.z, config.width, config.height, config.depth, config.color, config.hp);
        } else {
            // 通常の建物の場合
            console.log('Creating solid obstacle');
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
playerModel = createCharacterModel(0xff3333, characterCustomization.player); // Player's customization
resetCharacterPose(playerModel); // Reset to default pose
// Show gun for gameplay
if (playerModel.userData.parts && playerModel.userData.parts.gun) {
    playerModel.userData.parts.gun.visible = true;
}
player.add(playerModel);
playerModel.position.set(0, -playerTargetHeight, 0);
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
    
    // Add eyes (horizontal lines) to all characters
    const eyeLineGeom = new THREE.BoxGeometry(headSize * 0.6, headSize * 0.02, headSize * 0.02);
    const eyeLineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left eye line
    const leftEyeLine = new THREE.Mesh(eyeLineGeom, eyeLineMaterial);
    leftEyeLine.position.set(-headSize * 0.15, headY + headSize * 0.2, headSize * 0.5); // Move forward to be visible
    
    // Right eye line  
    const rightEyeLine = new THREE.Mesh(eyeLineGeom, eyeLineMaterial);
    rightEyeLine.position.set(headSize * 0.15, headY + headSize * 0.2, headSize * 0.5); // Move forward to be visible

    // Hair - Different styles based on customization
    let hairParts = [];
    
    switch (custom.hairStyle) {
        case 'short':
            const shortHairGeom = new THREE.BoxGeometry(headSize * 1.1, headSize * 0.3, headSize * 1.1);
            const shortHair = new THREE.Mesh(shortHairGeom, hairMaterial);
            shortHair.position.set(0, headY + headSize * 0.4, 0);
            
            // Add back hair to cover half of the back head
            const shortBackHairGeom = new THREE.BoxGeometry(headSize * 1.0, headSize * 0.4, headSize * 0.5);
            const shortBackHair = new THREE.Mesh(shortBackHairGeom, hairMaterial);
            shortBackHair.position.set(0, headY + headSize * 0.2, -headSize * 0.25);
            
            hairParts.push(shortHair, shortBackHair);
            break;
            
        case 'long':
            // Afro style - spherical hair from back-top, leaving more face exposed
            const afroRadius = headSize * 0.8;
            const afroGeom = new THREE.SphereGeometry(afroRadius, 16, 12);
            const afro = new THREE.Mesh(afroGeom, hairMaterial);
            afro.position.set(0, headY + headSize * 0.6, -headSize * 0.4); // Move slightly forward
            afro.scale.set(1.4, 1.2, 1.3); // Wider and taller to expose more face
            
            hairParts.push(afro);
            break;
            
        case 'spiky':
            // Mohawk style - connected hair from top back to neck (raised and vertical)
            const mohawkGeom = new THREE.BoxGeometry(headSize * 0.33, headSize * 0.7, headSize * 1.2); // Taller and more vertical
            const mohawk = new THREE.Mesh(mohawkGeom, hairMaterial);
            mohawk.position.set(0, headY + headSize * 0.6, -headSize * 0.15); // Raised position
            
            hairParts.push(mohawk);
            break;
            
        case 'bald':
            // Cap style - cap covering top 1/3 of head with extended visor
            const capMainGeom = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.3, headSize * 1.0); // Main cap body
            const capMain = new THREE.Mesh(capMainGeom, hairMaterial); // Use hair material for cap color
            capMain.position.set(0, headY + headSize * 0.5, 0);
            
            const capVisorGeom = new THREE.BoxGeometry(headSize * 1.6, headSize * 0.05, headSize * 0.6); // Extended visor/brim
            const capVisor = new THREE.Mesh(capVisorGeom, hairMaterial);
            capVisor.position.set(0, headY + headSize * 0.35, headSize * 0.45); // Extended front visor
            
            hairParts.push(capMain, capVisor);
            break;
            
        case 'default':
        default:
            const hairBackGeom = new THREE.BoxGeometry(headSize * 1.15, headSize * 0.85, headSize * 0.75); // Thinner back hair
            const hairBack = new THREE.Mesh(hairBackGeom, hairMaterial);
            hairBack.position.set(0, headY, -headSize * 0.45);
            
            const hairTopGeom = new THREE.BoxGeometry(headSize * 1.05, headSize * 0.35, headSize * 1.15); // Thinner top hair
            const hairTop = new THREE.Mesh(hairTopGeom, hairMaterial);
            hairTop.position.set(0, headY + headSize * 0.45, -headSize * 0.1);
            
            const hairBangsGeom = new THREE.BoxGeometry(headSize * 0.8, headSize * 0.05, headSize * 0.3);
            const hairBangs = new THREE.Mesh(hairBangsGeom, hairMaterial);
            hairBangs.position.set(0, headY + headSize * 0.15, headSize * 0.35);
            
            // Cut the back hair to align with top hair
            const backHairCutGeom = new THREE.BoxGeometry(headSize * 1.2, headSize * 0.9, headSize * 0.3);
            const backHairCut = new THREE.Mesh(backHairCutGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
            backHairCut.position.set(0, headY + headSize * 0.4, -headSize * 0.45);
            
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

    const characterModel = new THREE.Group();
    const allParts = [body, head, leftEyeLine, rightEyeLine, aimGroup, leftHip, rightHip, waist, ...hairParts];
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
        if (child.material) child.material.dispose();
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
        parts.head.position.y = parts.baseHeadY - 0.2;
        
        // Add walking animation on top of crouch pose
        const swing = Math.sin(timeElapsed * walkSpeed) * hipAmplitude;
        parts.leftHip.rotation.x += swing;
        parts.rightHip.rotation.x -= swing;
        parts.leftKnee.rotation.x += Math.max(0, (Math.cos(timeElapsed * walkSpeed) + 1) / 2 * kneeAmplitude);
        parts.rightKnee.rotation.x += Math.max(0, (Math.cos(timeElapsed * walkSpeed + Math.PI) + 1) / 2 * kneeAmplitude);
        
        // Head movement while crouch walking
        parts.head.position.y += Math.sin(timeElapsed * walkSpeed) * 0.02;
    } else if (isCrouching) {
        const hipBend = Math.PI / 4.2;
        const kneeBend = Math.PI / 2.6;
        // Bend legs toward the forward-hand direction (human-like crouch)
        parts.leftHip.rotation.x = -hipBend;
        parts.rightHip.rotation.x = -hipBend;
        parts.leftKnee.rotation.x = kneeBend;
        parts.rightKnee.rotation.x = kneeBend;
        parts.body.rotation.x = -0.22;
        parts.head.position.y = parts.baseHeadY - 0.2;
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
        parts.head.position.y = parts.baseHeadY + Math.sin(timeElapsed * walkSpeed) * 0.05;
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
    } else if (weaponType === WEAPON_SG || weaponType === WEAPON_MG) {
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
    return intersects.length === 0;
}

function resolveCustomMapSelection() {
    const allCustomMaps = JSON.parse(localStorage.getItem('allCustomMaps') || '{}');
    const names = Object.keys(allCustomMaps);
    if (names.length === 0) return { allCustomMaps, mapName: null, mapData: null };

    let mapName = gameSettings.customMapName;
    const selector = document.getElementById('custom-map-selector');
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
    switch (ai.currentWeapon) {
        case WEAPON_SR: return 0.5;
        case WEAPON_MG: return 0.2;
        case WEAPON_RR: return 0.2;
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
        const score = dAI * 0.65 + dEnemy * 0.35;
        if (score < bestScore) {
            bestScore = score;
            best = sensor;
        }
    }
    return best;
}

function tryAssignAIRooftopGoal(ai, timeElapsed, isFollowLockedTeammate) {
    if (!ai || ai.hp <= 0 || !ai.userData) return false;
    if (ladderSwitches.length === 0) return false;
    if (isFollowLockedTeammate) return false;
    if (ai.userData.onRooftop || ai.userData.rooftopIntent || ai.isElevating) return false;
    if ((ai.userData.rooftopPhase || 'none') !== 'none') return false;
    if ((ai.userData.nextRooftopDecisionAt || 0) > timeElapsed) return false;
    ai.userData.nextRooftopDecisionAt = timeElapsed + 0.7 + Math.random() * 0.9;

    const chance = getAIRooftopClimbChance(ai);
    if (chance <= 0 || Math.random() >= chance) return false;

    if (ai.team === 'enemy' && isEnemyRooftopSlotBusy(ai)) return false;

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
        ? ((ai.currentWeapon === WEAPON_MG && ai.ammoMG < 30) || (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 3) || (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 3) || (ai.currentWeapon === WEAPON_SG && ai.ammoSG < 4))
        : ((ai.currentWeapon === WEAPON_MG && ai.ammoMG < 12) || (ai.currentWeapon === WEAPON_RR && ai.ammoRR < 2) || (ai.currentWeapon === WEAPON_SR && ai.ammoSR < 2) || (ai.currentWeapon === WEAPON_SG && ai.ammoSG < 2));
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
    raycaster.far = 0.35;
    const wallHits = raycaster.intersectObjects(obstacles, true);
    if (wallHits.length > 0) {
        return { blocked: true, impactPoint: wallHits[0].point.clone() };
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
        if (currentWeapon !== WEAPON_MG) {
            shoot();
        }
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

function handleFireRelease() {
    if (!isGameRunning) return;
    if (isScoping) {
        document.getElementById('night-vision-overlay').style.display = 'none';
        const timeSinceLastFire = clock.getElapsedTime() - lastFireTime;
        if ((ammoSR > 0 || isInfiniteDefaultWeaponActive(WEAPON_SR)) && timeSinceLastFire > FIRE_RATE_SR) {
            if (srGunSound) srGunSound.cloneNode(true).play();
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
    let canFire = false;
    let projectileColor = 0xffff00;
    let projectileSize = 0.1;
    let fireRate = FIRE_RATE_PISTOL;
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
    }
    const timeSinceLastFire = now - lastFireTime;
    if (canFire && timeSinceLastFire > fireRate) {
        let soundToPlay = playerGunSound;
        if (currentWeapon === WEAPON_MG) soundToPlay = mgGunSound;
        else if (currentWeapon === WEAPON_RR) soundToPlay = rrGunSound;
        else if (currentWeapon === WEAPON_SG) soundToPlay = playerSgSound;
        if (soundToPlay) soundToPlay.cloneNode(true).play();
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
            createProjectile(safeFire.startPosition, baseDirection, projectileColor, projectileSize, currentWeapon === WEAPON_RR, 'player');
        }
        lastFireTime = now;
        if (currentWeapon === WEAPON_MG) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_MG) && --ammoMG === 0) {
                if (gameSettings.defaultWeapon === WEAPON_MG) {
                    ammoMG = 0;
                    playerMGReloadUntil = now + 2.0;
                    showReloadingText();
                } else {
                    switchPlayerToFallbackWeapon();
                }
            }
        } else if (currentWeapon === WEAPON_RR) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_RR) && --ammoRR === 0) switchPlayerToFallbackWeapon();
        } else if (currentWeapon === WEAPON_SG) {
            if (!isInfiniteDefaultWeaponActive(WEAPON_SG) && --ammoSG === 0) switchPlayerToFallbackWeapon();
        }
    }
}

function aiShoot(ai, timeElapsed) {
    if (!isGameRunning) return;
    if (ai && ai.userData && ai.userData.mgReloadUntil && timeElapsed >= ai.userData.mgReloadUntil) {
        ai.userData.mgReloadUntil = 0;
        ai.ammoMG = MAX_AMMO_MG;
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
        case WEAPON_RR: if (ai.ammoRR > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_RR)) { canAIShoot = true; aiFireRate = FIRING_RATE * (5.0 - ai.aggression * 3.0); aiProjectileSize = 0.5; aiProjectileColor = 0xff8c00; } break;
        case WEAPON_SR: if (ai.ammoSR > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SR)) { canAIShoot = true; aiFireRate = FIRE_RATE_SR * (1.0 + (1.0 - ai.aggression) * 0.5); aiProjectileColor = 0xffff00; aiProjectileSpeed = projectileSpeed * 2; } break;
        case WEAPON_SG: if (ai.ammoSG > 0 || isInfiniteDefaultWeaponActiveForAI(ai, WEAPON_SG)) { canAIShoot = true; aiFireRate = FIRE_RATE_SG; aiProjectileColor = 0xffa500; aiProjectileSize = 0.05; if (distanceToPlayer < SHOTGUN_RANGE * 1.5) { aiFireRate /= (1 + ai.aggression); } } break;
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
                createProjectile(startPosition, spreadDirection, aiProjectileColor, aiProjectileSize, false, 'ai', aiProjectileSpeed, false, WEAPON_SG, ai);
            }
        } else {
            createProjectile(startPosition, direction, aiProjectileColor, aiProjectileSize, ai.currentWeapon === WEAPON_RR, 'ai', aiProjectileSpeed, ai.currentWeapon === WEAPON_SR, null, ai);
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
        const targetPos = getFollowSlotPosition(ai);
        if (ai.hp <= 0) {
            ai.hp = reviveHPSetting;
            ai.visible = true;
        }
        ai.position.copy(targetPos);
        ai.targetPosition.copy(targetPos);
        ai.userData.followActive = true;
        ai.state = 'FOLLOWING';
        ai.avoiding = false;
        ai.rotation.y = player.rotation.y;
    });
}

function setFollowingPlayerMode(enabled) {
    isFollowingPlayerMode = enabled;
    console.log(`AI Following Mode: ${isFollowingPlayerMode ? 'ON' : 'OFF'}`);
    if (followStatusDisplay) {
        if (isFollowingPlayerMode) {
            followStatusDisplay.style.display = 'block';
            followStatusDisplay.classList.add('blinking');
        } else {
            followStatusDisplay.style.display = 'none';
            followStatusDisplay.classList.remove('blinking');
        }
    }
    if (followButton && ('ontouchstart' in window)) {
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
    if (event.code === 'KeyC') {
        isCrouchingToggle = !isCrouchingToggle;
    } else if (event.code === 'KeyF') { // Fキーで追従モードをトグル
        toggleFollowingPlayerMode();
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
    // Preload and cache all audio elements
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
    console.log('startGame() called');
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

    if ('ontouchstart' in window) {
        console.log('startGame(): Mobile device detected. Setting UI to block/flex.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const pause = document.getElementById('pause-button');
        const followBtn = document.getElementById('follow-button'); 

        if (joy) { joy.style.display = 'block'; console.log('startGame(): joystick-move display set to block'); }
        if (fire) { fire.style.display = 'flex'; console.log('startGame(): fire-button display set to flex'); }
        if (crouch) { crouch.style.display = 'flex'; console.log('startGame(): crouch-button display set to flex'); }
        if (pause) { pause.style.display = 'block'; console.log('startGame(): pause-button display set to block'); }

        if (followBtn) { 
            if (gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade') {
                followBtn.style.display = 'flex'; console.log('startGame(): follow-button display set to flex (team mode)');
            } else {
                followBtn.style.display = 'none'; console.log('startGame(): follow-button display set to none (non-team mode)');
            }
        }
    } else {
        console.log('startGame(): PC device detected. Setting UI to none.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const followBtn = document.getElementById('follow-button'); 

        if (joy) { joy.style.display = 'none'; console.log('startGame(): joystick-move display set to none'); }
        if (fire) { fire.style.display = 'none'; console.log('startGame(): fire-button display set to none'); }
        if (crouch) { crouch.style.display = 'none'; console.log('startGame(): crouch-button display set to none'); }
        if (followBtn) { followBtn.style.display = 'none'; console.log('startGame(): follow-button display set to none'); }
    }
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
    console.log('restartGame() called');
    playerBreadcrumbs = []; // Reset the breadcrumb trail
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
        const resolved = resolveCustomMapSelection();
        const selectedMapData = resolved.mapData;
        if (resolved.mapName && resolved.mapName !== gameSettings.customMapName) {
            gameSettings.customMapName = resolved.mapName;
            saveSettings();
        }
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
    if ('ontouchstart' in window) {
        console.log('restartGame(): Mobile device detected. Setting UI to block/flex.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const pause = document.getElementById('pause-button');
        if (joy) { joy.style.display = 'block'; console.log('restartGame(): joystick-move display set to block'); }
        if (fire) { fire.style.display = 'flex'; console.log('restartGame(): fire-button display set to flex'); }
        if (crouch) { crouch.style.display = 'flex'; console.log('restartGame(): crouch-button display set to flex'); }
        if (pause) { pause.style.display = 'block'; console.log('restartGame(): pause-button display set to block'); }
    } else {
        console.log('restartGame(): PC device detected. Setting UI to none.');
        const joy = document.getElementById('joystick-move');
        const fire = document.getElementById('fire-button');
        const crouch = document.getElementById('crouch-button');
        const pause = document.getElementById('pause-button');
        if (joy) { joy.style.display = 'none'; console.log('restartGame(): joystick-move display set to none'); }
        if (fire) { fire.style.display = 'none'; console.log('restartGame(): fire-button display set to none'); }
        if (crouch) { crouch.style.display = 'none'; console.log('restartGame(): crouch-button display set to none'); }
        if (pause) { pause.style.display = 'none'; console.log('restartGame(): pause-button display set to none'); } // PauseボタンもPCでは非表示
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
    const isTeammate = ai.team === 'player';
    const isTeamModeOrArcade = gameSettings.gameMode === 'team' || gameSettings.gameMode === 'teamArcade';

    if (isFollowingPlayerMode && isTeamModeOrArcade && isTeammate) {
        const followPos = getFollowSlotPosition(ai);
        ai.position.copy(followPos);
        ai.rotation.set(0, player.rotation.y, 0);
        ai.state = 'FOLLOWING';
        ai.userData.followActive = true;
        applyAIDefaultWeaponLoadout(ai);
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

    const hostilePositions = getPlayerRespawnHostilePositions();
    const safePos = findSaferRespawnPosition(player, hostilePositions, playerTargetHeight * 2, 10, null);
    if (safePos) {
        player.position.copy(safePos);
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

    // 梯子昇降中の死亡でリスポーン後に浮くのを防ぐ
    isElevating = false;
    elevatingTargetY = 0;
    elevatingTargetObstacle = null;

    // プレイヤー死亡キルカメラ用にプレイヤーモデルを表示
    if (playerModel) {
        playerModel.visible = true;
    }

    // UIを非表示
    const uiToHide = ['joystick-move', 'fire-button', 'crosshair', 'crouch-button', 'player-hp-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'player-weapon-display', 'pause-button'];
    uiToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // プレイヤーモデルは足元基準で配置
    playerModel.position.set(0, -playerTargetHeight, 0);
    // AIと同じ姿勢ロジックで、死亡時も棒立ちを避ける
    if (playerModel.userData && playerModel.userData.parts) {
        const parts = playerModel.userData.parts;
        applyGunStyle(parts.gun, currentWeapon);
        applyWeaponPose(parts, currentWeapon);
        // Match live AI pose coordinates as-is (arms + gun), then lock gun between hands.
        alignGunGripToHands(parts, 1.0);
        // Death pose: keep natural human-like leg bend (avoid reverse-knee crouch).
        parts.leftHip.rotation.x = 0.20;
        parts.rightHip.rotation.x = 0.20;
        parts.leftKnee.rotation.x = 0.35;
        parts.rightKnee.rotation.x = 0.35;
        parts.body.rotation.x = 0.06;
    }

    // 倒れるアニメーション
    const fallDuration = 1.0;
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
    finalRotation.x += fallSign * fallRotationAxisAngle;
    new TWEEN.Tween(playerModel.rotation).to({ x: finalRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();

    // プレイヤー死亡キルカメラ: 遮蔽物を避けて必ずプレイヤーが映る角度を選ぶ
    const playerLookAt = player.position.clone().add(new THREE.Vector3(0, -playerTargetHeight + 1.1, 0));
    const preferredDir = projectile && projectile.velocity ? projectile.velocity.clone() : null;
    const playerDeathCamPos = findClearKillCameraPosition(player.position.clone(), playerLookAt, obstacles, preferredDir);
    camera.position.copy(playerDeathCamPos);
    camera.lookAt(playerLookAt);

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
            playerModel.rotation.set(0, 0, 0); 
            // playerModelがplayerの子として正しく配置されるようにリセット
            playerModel.position.set(0, -playerTargetHeight, 0); 
    
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
                if ('ontouchstart' in window) {
                    uiToShow.push('joystick-move', 'fire-button', 'crouch-button');
                } else {
                    canvas.requestPointerLock();
                }
                uiToShow.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'block';
                });
            } else {            // teamArcade以外のモードではゲームオーバー画面へ
            showGameOver();
        }
    }, 3000); // 3秒後にリスポーンまたはゲームオーバー
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
    if (mode === 'all') return true;
    if (mode === 'playerOnly') {
        return killerSource === 'player' && ai && ai.team === 'enemy';
    }
    return true;
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
    if (joy) joy.style.display = 'none';
    if (fire) fire.style.display = 'none';
    if (cross) cross.style.display = 'none';
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
    const finalAIYPosition = -FLOOR_HEIGHT + (BODY_HEIGHT / 2);
    new TWEEN.Tween(ai.rotation).to({ x: finalAIRotation.x }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.Out).start();
    new TWEEN.Tween(ai.position).to({ y: finalAIYPosition }, fallDuration * 1000).easing(TWEEN.Easing.Quadratic.In).start();
    setTimeout(() => {
        isAIDeathPlaying = false;
        cinematicTargetAI = null;
        finalizeAIDeathWithoutKillCam(ai);
        if (ais.length > 0 || gameSettings.gameMode === 'arcade') {
            if (joy) joy.style.display = 'block';
            if (fire) fire.style.display = 'block';
            if (cross) cross.style.display = 'block';
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

function checkCollision(object, obstacles, ignoreObstacle = null) {
    const objectBox = new THREE.Box3();
    const pos = object.position;
    let currentObjectBox;
    if (object === player) {
        currentObjectBox = objectBox;
        currentObjectBox.min.set(pos.x - 0.25, pos.y - playerTargetHeight - 0.1, pos.z - 0.25);
        currentObjectBox.max.set(pos.x + 0.25, pos.y + 0.1, pos.z + 0.25);
    } else if (object.userData && object.userData.isAI) {
        currentObjectBox = objectBox;
        const aiHeight = object.userData.height || BODY_HEIGHT + HEAD_RADIUS * 2;
        currentObjectBox.min.set(pos.x - 0.2, pos.y - aiHeight, pos.z - 0.2);
        currentObjectBox.max.set(pos.x + 0.2, pos.y, pos.z + 0.2);
    } else {
        currentObjectBox = new THREE.Box3().setFromObject(object);
    }
    for (const obstacle of obstacles) {
        if (obstacle === ignoreObstacle) continue;
        if (obstacle === object) continue;
        
        // 屋上の床は衝突判定から除外
        if (obstacle.userData.isRooftop) continue;
        
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
        
        // 屋上の床の場合は特別処理
        if (obs.userData.isRooftop) {
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
        // 梯子昇降中のタワーや、屋上床は衝突判定から除外
        if (obstacle.userData.isRooftop) continue;
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

    const elementsToHide = ['joystick-move', 'fire-button', 'crouch-button', 'crosshair', 'scope-overlay', 'kill-count-display', 'player-hp-display', 'player-weapon-display', 'ai-hp-display', 'ai2-hp-display', 'ai3-hp-display', 'pause-button'];
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    startScreen.style.display = 'flex';
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('resume-game-btn').style.display = 'inline-block';
    document.getElementById('restart-pause-btn').style.display = 'inline-block';
}

function resumeGame() {
    console.log('resumeGame() called');
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

        if ('ontouchstart' in window) {
            console.log('resumeGame(): Mobile device detected. Setting UI to block/flex.');
            const joy = document.getElementById('joystick-move');
            const fire = document.getElementById('fire-button');
            const crouch = document.getElementById('crouch-button');
            const pause = document.getElementById('pause-button');
            if (joy) { joy.style.display = 'block'; console.log('resumeGame(): joystick-move display set to block'); }
            if (fire) { fire.style.display = 'flex'; console.log('resumeGame(): fire-button display set to flex'); }
            if (crouch) { crouch.style.display = 'flex'; console.log('resumeGame(): crouch-button display set to flex'); }
            if (pause) { pause.style.display = 'block'; console.log('resumeGame(): pause-button display set to block'); }
        } else {
            console.log('resumeGame(): PC device detected.');
            const joy = document.getElementById('joystick-move');
            const fire = document.getElementById('fire-button');
            const crouch = document.getElementById('crouch-button');
            if (joy) { joy.style.display = 'none'; }
            if (fire) { fire.style.display = 'none'; }
            if (crouch) { crouch.style.display = 'none'; }
            canvas.requestPointerLock();
        }

        isGameRunning = true;
    }
}

function animate() {
    // --- Force hide mobile buttons on PC ---
    if (!('ontouchstart' in window)) {
        const idsToHide = ['fire-button', 'crouch-button', 'joystick-move', 'follow-button'];
        idsToHide.forEach(id => {
            const btn = document.getElementById(id);
            if (btn && btn.style.display !== 'none') {
                btn.style.display = 'none';
            }
        });
    }
    // --- End force hide ---

    if (window.justRestarted) {
        window.justRestarted = false;
    }
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

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

    // Player MG reload completion (needs to run even when not firing)
    if (playerMGReloadUntil > 0 && timeElapsed >= playerMGReloadUntil) {
        playerMGReloadUntil = 0;
        ammoMG = MAX_AMMO_MG;
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
        const playerLookAt = player.position.clone().add(new THREE.Vector3(0, -playerTargetHeight + 1.0, 0));
        camera.lookAt(playerLookAt);
        TWEEN.update();
        renderer.render(scene, camera);
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
            case WEAPON_PISTOL: weaponName = 'Pistol'; ammoCount = '∞'; break;
        }
        playerWeaponDisplay.innerHTML = `Weapon: ${weaponName}<br>Ammo: ${ammoCount}`; // playerWeaponDisplayを使用
    }
    if (isMouseButtonDown && (currentWeapon === WEAPON_MG || currentWeapon === WEAPON_SG)) {
        shoot();
    }
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
    let finalMoveVector = joystickMoveVector.length() > 0 ? joystickMoveVector.clone() : keyboardMoveVector.clone();

    if (finalMoveVector.length() > 0) finalMoveVector.normalize();
    // リスポーン直後の移動を強制的に停止させる
    if (window.justRestarted || isPlayerDeathPlaying || isElevating) {
        // console.log('Movement blocked - justRestarted:', window.justRestarted, 'isPlayerDeathPlaying:', isPlayerDeathPlaying, 'isElevating:', isElevating);
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
            // console.log('Climb completed! Dropping to rooftop...');
            player.position.y = elevatingTargetY;
            isElevating = false;
            // console.log('isElevating set to false');
            isIgnoringTowerCollision = true;
            ignoreTowerTimer = 5.0; // Extended to 5.0s for permanent rooftop safety
            lastClimbedTower = elevatingTargetObstacle;
            isCrouchingToggle = false; // 強制的に立ち状態に
            
            // Let player drop naturally to rooftop - no forward push
            // console.log('Dropping from height to rooftop');
            
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
                // console.log('Ladder detected! Starting climb...');
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
            // console.log('Movement check - inSensorArea:', inSensorArea, 'onRooftop:', player.userData.onRooftop);
            if (player.userData.onRooftop) {
                // console.log('On rooftop - allowing movement');
            }
            if (finalMoveVector.length() > 0) {
                // console.log('Input detected - finalMoveVector length:', finalMoveVector.length());
                finalMoveVector.normalize();
            } else {
                // console.log('No input detected');
            }
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
            
            // console.log('Movement calculated - moveX:', moveX, 'moveZ:', moveZ);
            
            const ignoreObstacle = isIgnoringTowerCollision ? lastClimbedTower : currentGroundObstacle;

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
                // console.log('Collision detected, resolving...');
                // 屋上にいる場合は押し出し距離を増やす
                const pushDistance = player.userData.onRooftop ? 0.2 : 0.05;
                // console.log('Using push distance:', pushDistance);
                // 衝突解決を試みる。resolvePlayerCollisionはplayer.positionを直接変更する
                const collisionResolved = resolvePlayerCollision(player, obstacles, pushDistance);

                // もし衝突解決後もまだ衝突している場合は、元の位置に戻す
                // これはresolvePlayerCollisionが全ての衝突を一度に解決できない場合のフォールバック
                if (!collisionResolved || checkCollision(player, obstacles, ignoreObstacle)) {
                    console.log('Collision resolution failed, reverting to old position');
                    console.log('Old position:', oldPlayerPosition);
                    console.log('Current position before revert:', player.position);
                    player.position.copy(oldPlayerPosition); 
                    console.log('Position after revert:', player.position);
                } else {
                    console.log('Collision resolved successfully');
                }
            } else {
                console.log('No collision detected');
            }
            console.log('Final position after movement:', player.position);
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
            if (isIgnoringTowerCollision || (currentGroundObstacle && currentGroundObstacle.userData.isRooftop)) {
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
                    if ((obs.userData.isRooftop || !obs.userData.isWall) && playerFeetY >= topOfObstacle - yTolerance && playerFeetY <= topOfObstacle + 1.0) {
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

        // AI MG reload completion
        if (ai.userData && ai.userData.mgReloadUntil && timeElapsed >= ai.userData.mgReloadUntil) {
            ai.userData.mgReloadUntil = 0;
            ai.ammoMG = MAX_AMMO_MG;
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
                ai.state = 'MOVING';
                ai.targetPosition.copy(ai.userData.rooftopLadderPos);
                ai.targetPosition.y = getGroundSurfaceY(ai.targetPosition);
                if (ai.position.distanceTo(ai.targetPosition) < 1.0) {
                    const ladderSnap = ai.userData.rooftopSensor?.userData?.ladderPos || ai.userData.rooftopLadderPos;
                    ai.position.x = ladderSnap.x;
                    ai.position.z = ladderSnap.z;
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
            ai.position.y += vDir * climbSpeed * delta;
            ai.targetPosition.copy(ai.position);
            const targetY = ai.userData.rooftopTargetY ?? -FLOOR_HEIGHT;
            if ((vDir > 0 && ai.position.y >= targetY) || (vDir < 0 && ai.position.y <= targetY)) {
                ai.position.y = targetY;
                ai.isElevating = false;
                ai.userData.elevatingDirection = 0;
                if (vDir > 0) {
                    ai.userData.onRooftop = true;
                    ai.userData.rooftopIntent = true;
                    ai.userData.rooftopPhase = 'on_roof';
                    ai.userData.rooftopStateSince = timeElapsed;
                    ai.userData.rooftopDecisionMade = false;
                    if (ai.userData.rooftopObstacle) {
                        const center = ai.userData.rooftopObstacle.position.clone();
                        const dir = new THREE.Vector3().subVectors(center, ai.position);
                        dir.y = 0;
                        if (dir.lengthSq() > 1e-6) {
                            dir.normalize();
                            ai.position.add(dir.multiplyScalar(1.2));
                        }
                    }
                } else {
                    ai.userData.onRooftop = false;
                    ai.userData.rooftopIntent = false;
                    ai.userData.rooftopSensor = null;
                    ai.userData.rooftopObstacle = null;
                    ai.userData.rooftopLadderPos = null;
                    ai.userData.rooftopDecisionMade = false;
                    ai.userData.rooftopPhase = 'none';
                    ai.userData.rooftopStateSince = timeElapsed;
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
            ai.position.y = getGroundSurfaceY(ai.position);
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
                    ai.position.add(finalMove_follow);
                    
                    // 移動後に衝突した場合の最終的な回避
                    if (checkCollision(ai, obstacles)) {
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
                    ai.userData.rooftopDecisionMade = false;
                    ai.state = 'ATTACKING';
                    ai.currentAttackTime = timeElapsed;
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
        if (isMoving && ai.state !== 'HIDING' && ai.state !== 'ATTACKING' && ai.state !== 'CLIMBING' && ai.state !== 'FOLLOWING' && ai.state !== 'ROOFTOP_COMBAT') {
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
                ai.position.copy(player.position.clone().add(toAI.multiplyScalar(minSeparation)));
                ai.position.y = -FLOOR_HEIGHT;
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
            const intersects = raycaster.intersectObjects(obstacles, true);
            if (intersects.length > 0) {
                hitSomething = true;
                hitObject = intersects[0].object;
                hitType = 'obstacle';
                p.mesh.position.copy(intersects[0].point);
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
                        projectiles.splice(i, 1);
                        scene.remove(p.mesh);
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
                                    aiFallDownCinematicSequence(new THREE.Vector3().subVectors(ai.position, explosionPos), ai, 'player');
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
                                if (p.shooter && p.shooter.kills !== undefined) {
                                    p.shooter.kills++;
                                }
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
        const projArenaR = Math.sqrt(p.mesh.position.x * p.mesh.position.x + p.mesh.position.z * p.mesh.position.z);
        if (projArenaR > ARENA_PLAY_AREA_RADIUS) {
            scene.remove(p.mesh);
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
        gameSettings.mapType = document.querySelector('input[name="map-type"]:checked').value;
        const customMapSelectorOnStart = document.getElementById('custom-map-selector');
        if (customMapSelectorOnStart && customMapSelectorOnStart.value) {
            gameSettings.customMapName = customMapSelectorOnStart.value;
        }
        if (gameSettings.customMapName) {
            // If a custom map is selected, prioritize it on start (mobile friendly).
            gameSettings.mapType = 'custom';
            document.querySelectorAll('input[name="map-type"]').forEach(radio => {
                radio.checked = (radio.value === 'custom');
            });
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
    const previewFollowButton = document.getElementById('preview-follow-button'); // 追加

    // Convert pixel values to percentage for responsiveness
    const fireRight = (parseInt(previewFireButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const fireBottom = (parseInt(previewFireButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const crouchRight = (parseInt(previewCrouchButton.style.right, 10) / window.innerWidth) * 100 + '%';
    const crouchBottom = (parseInt(previewCrouchButton.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const joystickLeft = (parseInt(previewJoystickZone.style.left, 10) / window.innerWidth) * 100 + '%';
    const joystickBottom = (parseInt(previewJoystickZone.style.bottom, 10) / window.innerHeight) * 100 + '%';
    const followRight = (parseInt(previewFollowButton.style.right, 10) / window.innerWidth) * 100 + '%'; // 追加
    const followBottom = (parseInt(previewFollowButton.style.bottom, 10) / window.innerHeight) * 100 + '%'; // 追加

    gameSettings.buttonPositions.fire = { right: fireRight, bottom: fireBottom };
    gameSettings.buttonPositions.crouch = { right: crouchRight, bottom: crouchBottom };
    gameSettings.buttonPositions.joystick = { left: joystickLeft, bottom: joystickBottom };
    gameSettings.buttonPositions.follow = { right: followRight, bottom: followBottom }; // 追加

    saveSettings();
    
    // Apply to actual buttons immediately
    const fireButton = document.getElementById('fire-button');
    const crouchButton = document.getElementById('crouch-button');
    const joystickZone = document.getElementById('joystick-move');
    const followButton = document.getElementById('follow-button'); // 追加

    if ('ontouchstart' in window) {
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
        if(joystickZone) joystickZone.style.display = 'none';
        if (followButton) followButton.style.display = 'none';
    }
}); // 閉じ括弧を追加

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
            if (child.material) child.material.dispose();
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
    
    console.log('Character data exported to JSON:', characterData);
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
            
            console.log('Character data imported successfully:', characterData);
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
            console.log('Manual night mode toggle:', this.checked);
        });
    }
    
    // Initialize editor after a small delay to ensure all elements are ready
    setTimeout(() => {
        initCharacterEditor();
    }, 100);
});

animate();
