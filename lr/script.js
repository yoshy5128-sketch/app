let map;
let currentMarker; // 現在地を示すマーカー
let selectedLocationMarker; // リマインダー設定時に選択された地点のマーカー
let reminderCircles = {}; // リマインダーの円を管理するオブジェクト
let reminders = []; // リマインダーデータを保存する配列
let watchId; // Geolocation.watchPosition()のID
let trackingLocation = false;
let mapClickLatlng; // マップがクリックされたときの座標を一時的に保持

const DEFAULT_LAT = 35.681236; // 東京駅
const DEFAULT_LNG = 139.767125;

// DOMが完全に読み込まれた後にマップを初期化
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initMap();
    setupEventListeners();
    loadReminders(); // 保存されているリマインダーを読み込む
    renderReminders(); // リマインダーリストをUIに表示
    startLocationTracking(); // 現在地追跡を開始
}

// Leaflet Mapを初期化する関数
function initMap() {
    map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    currentMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG]).addTo(map).bindPopup("現在地");
    selectedLocationMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { opacity: 0.7 }).addTo(map).bindPopup("リマインダー設定地点");
    selectedLocationMarker.remove(); // 最初は非表示

    // マップがクリックされたら、その地点にリマインダー設定用のマーカーを移動
    map.on('click', (e) => {
        mapClickLatlng = e.latlng;
        selectedLocationMarker.setLatLng(mapClickLatlng).addTo(map);
        document.getElementById('status').textContent = `マップ上の ${mapClickLatlng.lat.toFixed(4)}, ${mapClickLatlng.lng.toFixed(4)} にリマインダーを設定できます。`;
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    document.getElementById('setReminder').addEventListener('click', setReminder);
}

// 現在地追跡を開始
function startLocationTracking() {
    if (trackingLocation) {
        return;
    }

    if (navigator.geolocation) {
        trackingLocation = true;
        console.log("現在地追跡を開始中...");

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                const currentPos = [lat, lng];

                currentMarker.setLatLng(currentPos); // 現在地マーカーを更新
                map.setView(currentPos, map.getZoom()); // マップビューを現在地に合わせる
                document.getElementById('status').textContent = `現在地: ${lat.toFixed(4)}, ${lng.toFixed(4)} (精度: ${accuracy.toFixed(1)}m)`;

                checkReminders(currentPos); // リマインダーをチェック
            },
            (error) => {
                console.error("Geolocation Error:", error);
                let errorMessage = "エラー: ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "位置情報の利用が拒否されました。";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "位置情報を利用できません。";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "位置情報の取得がタイムアウトしました。";
                        break;
                    default:
                        errorMessage += "不明なエラー。";
                        break;
                }
                document.getElementById('status').textContent = errorMessage;
                trackingLocation = false;
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0, // キャッシュを使わない
                timeout: 10000 // 10秒でタイムアウト
            }
        );
    } else {
        document.getElementById('status').textContent = "エラー: Geolocation APIがサポートされていません。";
    }
}

// リマインダーを設定
function setReminder() {
    if (!mapClickLatlng) {
        document.getElementById('status').textContent = "マップ上でリマインダーを設定する場所を選択してください。";
        return;
    }

    const message = document.getElementById('reminderMessage').value;
    const radius = parseInt(document.getElementById('radiusInput').value, 10);

    if (!message) {
        document.getElementById('status').textContent = "リマインダーメッセージを入力してください。";
        return;
    }
    if (isNaN(radius) || radius < 1) {
        document.getElementById('status').textContent = "有効な半径（メートル）を入力してください。";
        return;
    }

    const newReminder = {
        id: Date.now(), // ユニークなID
        message: message,
        lat: mapClickLatlng.lat,
        lng: mapClickLatlng.lng,
        radius: radius,
        active: true, // リマインダーが有効かどうか
        triggered: false, // 一度トリガーされたら一時的に無効にする
        creationTime: new Date().toISOString()
    };

    reminders.push(newReminder);
    saveReminders();
    renderReminders();
    addReminderToMap(newReminder);
    document.getElementById('status').textContent = `リマインダー "${message}" を設定しました。`;

    document.getElementById('reminderMessage').value = ''; // 入力欄をクリア
    selectedLocationMarker.remove(); // マーカーを非表示にする
    mapClickLatlng = null;
}

// リマインダーをマップに追加
function addReminderToMap(reminder) {
    const reminderLatLng = [reminder.lat, reminder.lng];

    const circle = L.circle(reminderLatLng, {
        color: 'blue',
        fillColor: '#007bff',
        fillOpacity: 0.2,
        radius: reminder.radius
    }).addTo(map);

    circle.bindPopup(`<b>${reminder.message}</b><br>半径: ${reminder.radius}m`);
    reminderCircles[reminder.id] = circle; // 後で削除できるようにIDで管理
}

// リマインダーをチェック
function checkReminders(currentPos) {
    reminders.forEach(reminder => {
        if (reminder.active && !reminder.triggered) {
            const reminderLatLng = L.latLng(reminder.lat, reminder.lng);
            const currentLatLng = L.latLng(currentPos[0], currentPos[1]);
            const distance = reminderLatLng.distanceTo(currentLatLng); // メートル単位

            if (distance <= reminder.radius) {
                // リマインダーをトリガー
                document.getElementById('status').textContent = `リマインダー発動！: ${reminder.message} が ${Math.round(distance)}m 圏内`;
                alert(`リマインダー発動！\n「${reminder.message}」が ${Math.round(distance)}m 圏内です。`);
                reminder.triggered = true; // 一度トリガーしたら一時的に無効化
                saveReminders(); // トリガー状態を保存
            } else {
                // 圏外に出たらリセット（複数回トリガーを許可する場合）
                if (reminder.triggered) {
                    reminder.triggered = false;
                    saveReminders();
                }
            }
        }
    });
}

// リマインダーをlocalStorageに保存
function saveReminders() {
    localStorage.setItem('locationReminders', JSON.stringify(reminders));
}

// localStorageからリマインダーを読み込み
function loadReminders() {
    const savedRemindersJSON = localStorage.getItem('locationReminders');
    if (savedRemindersJSON) {
        try {
            reminders = JSON.parse(savedRemindersJSON);
            reminders.forEach(reminder => {
                // triggered状態をリセットして、再起動時にリマインダーが再び発動可能にする
                reminder.triggered = false; 
                addReminderToMap(reminder);
            });
            saveReminders(); // リセットした状態を保存
            document.getElementById('status').textContent = `${reminders.length}件のリマインダーを読み込みました。`;
        } catch (e) {
            console.error("Failed to load reminders:", e);
            document.getElementById('status').textContent = "リマインダーの読み込みに失敗しました。";
            reminders = [];
        }
    } else {
        reminders = [];
    }
}

// リマインダーリストをUIに表示
function renderReminders() {
    const reminderListElement = document.getElementById('reminderList');
    reminderListElement.innerHTML = ''; // リストをクリア

    if (reminders.length === 0) {
        reminderListElement.innerHTML = '<li>登録されたリマインダーはありません。</li>';
        return;
    }

    reminders.forEach(reminder => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="reminder-info">${reminder.message}</div>
            <div class="reminder-location">
                ${reminder.lat.toFixed(4)}, ${reminder.lng.toFixed(4)} (半径: ${reminder.radius}m)
            </div>
            <button class="delete-btn" data-id="${reminder.id}">削除</button>
        `;
        listItem.querySelector('.delete-btn').addEventListener('click', deleteReminder);
        reminderListElement.appendChild(listItem);
    });
}

// リマインダーを削除
function deleteReminder(event) {
    const idToDelete = parseInt(event.target.dataset.id, 10);
    reminders = reminders.filter(reminder => reminder.id !== idToDelete);
    saveReminders();
    renderReminders();

    // マップ上のマーカーと円も削除
    if (reminderCircles[idToDelete]) {
        map.removeLayer(reminderCircles[idToDelete]);
        delete reminderCircles[idToDelete];
    }
    document.getElementById('status').textContent = "リマインダーを削除しました。";
}

// 位置情報取得のエラーハンドラ
function handleLocationError(browserHasGeolocation, errorCode) {
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
    console.error("handleLocationError called. Code:", errorCode, "Message:", message);
}
