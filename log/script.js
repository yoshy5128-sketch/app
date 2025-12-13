let map;
let marker;
let polyline;
let path = []; // 移動ログを保存する配列
let watchId; // Geolocation.watchPosition()のID
let tracking = false;

// DOMが完全に読み込まれた後にマップを初期化
document.addEventListener('DOMContentLoaded', initMap);

// Leaflet Mapを初期化する関数
function initMap() {
    // 初期表示の中心座標 (東京駅を仮に設定)
    const initialPos = { lat: 35.681236, lng: 139.767125 };

    // マップを初期化し、中心座標とズームレベルを設定
    map = L.map('map').setView([initialPos.lat, initialPos.lng], 15);

    // OpenStreetMapのタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 現在地を示すマーカー
    marker = L.marker([initialPos.lat, initialPos.lng]).addTo(map);
    marker.bindPopup("現在地").openPopup();

    // 移動経路を示すポリライン
    polyline = L.polyline(path, {
        color: 'red',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(map);

    document.getElementById("status").textContent = "マップの準備ができました。";
    setupEventListeners();
    loadLog(); // 起動時に前回のログを自動で読み込む
}

// イベントリスナーの設定
function setupEventListeners() {
    document.getElementById("startTracking").addEventListener("click", startTracking);
    document.getElementById("stopTracking").addEventListener("click", stopTracking);
    document.getElementById("clearLogs").addEventListener("click", clearLogs);
    document.getElementById("saveLog").addEventListener("click", saveLog); // 追加
    document.getElementById("loadLog").addEventListener("click", loadLog); // 追加
}

// 追跡開始
function startTracking() {
    if (tracking) {
        document.getElementById("status").textContent = "すでに追跡中です。";
        return;
    }

    if (navigator.geolocation) {
        document.getElementById("status").textContent = "位置情報へのアクセスを要求しています...";
        console.log("Geolocation APIを呼び出し中...");
        tracking = true;

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log("Geolocation success:", position);
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                marker.setLatLng([pos.lat, pos.lng]);
                map.panTo([pos.lat, pos.lng]);

                path.push([pos.lat, pos.lng]);
                polyline.setLatLngs(path);

                document.getElementById("status").textContent =
                    `緯度: ${pos.lat.toFixed(6)}, 経度: ${pos.lng.toFixed(6)} (精度: ${position.coords.accuracy.toFixed(2)}m)`;
            },
            (error) => {
                console.error("Geolocation error:", error);
                handleLocationError(true, error.code);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5 * 60 * 1000, // 5分までキャッシュを許可
                timeout: 30 * 1000, // 30秒でタイムアウト
            }
        );
    } else {
        document.getElementById("status").textContent = "エラー: お使いのブラウザは位置情報に対応していません。";
        console.error("Geolocation is not supported by this browser.");
    }
}

// 追跡停止
function stopTracking() {
    if (!tracking) {
        document.getElementById("status").textContent = "追跡は停止しています。";
        return;
    }
    if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
        watchId = undefined;
    }
    tracking = false;
    document.getElementById("status").textContent = "位置情報の追跡を停止しました。";
}

// ログを保存
function saveLog() {
    if (path.length > 0) {
        try {
            localStorage.setItem('gps_log_path', JSON.stringify(path));
            document.getElementById("status").textContent = `ログを${path.length}点保存しました。`;
            console.log("Log saved:", path);
        } catch (e) {
            document.getElementById("status").textContent = "ログの保存に失敗しました。";
            console.error("Failed to save log:", e);
        }
    } else {
        document.getElementById("status").textContent = "保存するログがありません。";
    }
}

// 前回のログを読み込む
function loadLog() {
    const savedPathJSON = localStorage.getItem('gps_log_path');
    if (savedPathJSON) {
        try {
            const savedPath = JSON.parse(savedPathJSON);
            if (savedPath.length > 0) {
                path = savedPath; // path配列を更新
                polyline.setLatLngs(path); // ポリラインを更新
                const lastPos = path[path.length - 1];
                marker.setLatLng(lastPos); // マーカーを最終地点に移動
                map.setView(lastPos, map.getZoom()); // マップビューを最終地点に移動
                document.getElementById("status").textContent = `前回のログ（${path.length}点）を読み込みました。`;
                console.log("Log loaded:", path);
                return;
            }
        } catch (e) {
            document.getElementById("status").textContent = "ログの読み込みに失敗しました。データが破損している可能性があります。";
            console.error("Failed to load log:", e);
        }
    }
    document.getElementById("status").textContent = "保存されたログはありません。";
}


// ログをクリア
function clearLogs() {
    stopTracking(); // 追跡を停止
    path = []; // 経路をクリア
    polyline.setLatLngs(path); // ポリラインをリセット
    localStorage.removeItem('gps_log_path'); // localStorageからも削除
    document.getElementById("status").textContent = "ログをクリアしました。";
}

function handleLocationError(browserHasGeolocation, errorCode) { // errorCodeを追加
    let message = "";
    if (browserHasGeolocation) {
        switch (errorCode) {
            case 1: // PERMISSION_DENIED
                message = "エラー: 位置情報の利用が拒否されました。ブラウザ設定を確認してください。";
                break;
            case 2: // POSITION_UNAVAILABLE
                message = "エラー: 位置情報を利用できません。GPS信号を確認してください。";
                break;
            case 3: // TIMEOUT
                message = "エラー: 位置情報の取得がタイムアウトしました。";
                break;
            default:
                message = "エラー: 位置情報サービスを利用できません。";
                break;
        }
    } else {
        message = "エラー: お使いのブラウザは位置情報に対応していません。";
    }
    document.getElementById("status").textContent = message;
    console.error("handleLocationError called. Code:", errorCode, "Message:", message); // コンソールにも出力
}