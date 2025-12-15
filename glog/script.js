let map;
let marker;
let polyline;
let path = []; // 移動ログを保存する配列
let watchId; // Geolocation ID
let tracking = false;
let wakeLock = null; // Wake Lock Object

document.addEventListener('DOMContentLoaded', initMap);

function initMap() {
    // 初期表示 (東京駅周辺)
    const initialPos = { lat: 35.681236, lng: 139.767125 };

    map = L.map('map').setView([initialPos.lat, initialPos.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([initialPos.lat, initialPos.lng]).addTo(map);
    marker.bindPopup("現在地").openPopup();

    polyline = L.polyline(path, {
        color: 'red',
        weight: 4,
        opacity: 0.7,
    }).addTo(map);

    document.getElementById("status").textContent = "マップ準備完了";
    setupEventListeners();
    loadLog(); 

    // タブ復帰時にWake Lockを再取得
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });
}

function setupEventListeners() {
    document.getElementById("startTracking").addEventListener("click", startTracking);
    document.getElementById("stopTracking").addEventListener("click", stopTracking);
    document.getElementById("clearLogs").addEventListener("click", clearLogs);
    document.getElementById("saveLog").addEventListener("click", saveLog);
    document.getElementById("loadLog").addEventListener("click", loadLog);
    
    // 省電力モードのトグルボタン
    document.getElementById("toggleDimmer").addEventListener("click", toggleDimmer);
    // オーバーレイ自体がタップされても、何もしない（誤動作防止の要）
    document.getElementById("dimmerOverlay").addEventListener("click", (event) => {
        // 黒画面がタップされた場合、解除せずメッセージを出すのみ
        if (event.target === document.getElementById("dimmerOverlay")) {
            console.log("黒画面タップ: 解除はボタンから行ってください。");
            document.getElementById("status").textContent = "省電力モード中。解除は画面下のボタンから。";
        }
    });
}

// 画面常時点灯 (Wake Lock API)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock active');
        }
    } catch (err) {
        console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
    }
}

async function startTracking() {
    if (tracking) {
        document.getElementById("status").textContent = "すでに追跡中です";
        return;
    }

    if (navigator.geolocation) {
        await requestWakeLock(); // 画面常時点灯ON

        document.getElementById("status").textContent = "GPS信号を受信中...";
        tracking = true;

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // マップ更新
                marker.setLatLng([pos.lat, pos.lng]);
                map.panTo([pos.lat, pos.lng]);

                // ログ追加
                path.push([pos.lat, pos.lng]);
                polyline.setLatLngs(path);

                document.getElementById("status").textContent =
                    `Lat:${pos.lat.toFixed(5)} Lng:${pos.lng.toFixed(5)} (精度:${Math.round(position.coords.accuracy)}m)`;
            },
            (error) => {
                console.error("GPS Error:", error);
                handleLocationError(true, error.code);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0, 
                timeout: 10000,
            }
        );
    } else {
        document.getElementById("status").textContent = "GPS非対応ブラウザです";
    }
}

function stopTracking() {
    if (!tracking) return;
    
    if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
        watchId = undefined;
    }

    // Wake Lock 解除
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
        });
    }

    tracking = false;
    document.getElementById("status").textContent = "追跡停止";
}

function saveLog() {
    if (path.length > 0) {
        try {
            localStorage.setItem('gps_log_path', JSON.stringify(path));
            document.getElementById("status").textContent = `ログ(${path.length}点)を保存しました`;
        } catch (e) {
            document.getElementById("status").textContent = "保存失敗";
        }
    } else {
        document.getElementById("status").textContent = "保存するデータがありません";
    }
}

function loadLog() {
    const savedPathJSON = localStorage.getItem('gps_log_path');
    if (savedPathJSON) {
        try {
            const savedPath = JSON.parse(savedPathJSON);
            if (savedPath.length > 0) {
                path = savedPath;
                polyline.setLatLngs(path);
                const lastPos = path[path.length - 1];
                marker.setLatLng(lastPos);
                map.setView(lastPos, map.getZoom());
                document.getElementById("status").textContent = `前回ログ(${path.length}点)読込完了`;
                return;
            }
        } catch (e) {
            document.getElementById("status").textContent = "読込エラー";
        }
    }
}

function clearLogs() {
    stopTracking();
    path = [];
    polyline.setLatLngs(path);
    localStorage.removeItem('gps_log_path');
    document.getElementById("status").textContent = "ログをクリアしました";
}

// === 省電力モードのシンプルなトグル処理 ===
function toggleDimmer() {
    const dimmer = document.getElementById("dimmerOverlay");
    
    // 表示/非表示を切り替える
    if (dimmer.style.display === "flex") {
        dimmer.style.display = "none";
        document.getElementById("status").textContent = "省電力モードを解除しました";
    } else {
        dimmer.style.display = "flex";
        document.getElementById("status").textContent = "省電力モード起動中。ログ取得を続けます。";
    }
}


function handleLocationError(browserHasGeolocation, errorCode) {
    let message = "";
    switch (errorCode) {
        case 1: message = "GPS許可が必要です"; break;
        case 2: message = "位置特定不可"; break;
        case 3: message = "タイムアウト"; break;
        default: message = "GPSエラー"; break;
    }
    document.getElementById("status").textContent = message;
}

// --- Service Worker 登録処理 ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((reg) => console.log('SW Registered.', reg))
            .catch((err) => console.error('SW Registration Failed:', err));
    });
}