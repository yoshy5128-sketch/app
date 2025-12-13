let map;
let currentMarker; // 現在地を示すマーカー
let selectedLocationMarker; // スポット設定時に選択された地点のマーカー
let poiMarkers = {}; // スポットのマーカーを管理するオブジェクト
let pois = []; // スポットデータを保存する配列
let watchId; // Geolocation.watchPosition()のID（現在地表示用）
let trackingLocation = false;
let mapClickLatlng; // マップがクリックされたときの座標を一時的に保持
let lastKnownPosition = null; // 最後に取得した現在地

const DEFAULT_LAT = 35.681236; // 東京駅
const DEFAULT_LNG = 139.767125;

// 現在地追跡のON/OFFを制御する変数
let followLocation = true; // 初期値は追跡ON

// DOMが完全に読み込まれた後にマップを初期化
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initMap();
    setupEventListeners();
    loadPois(); // 保存されているスポットを読み込む
    renderPois(); // スポットリストをUIに表示
    startLocationTracking(); // 現在地追跡を開始
    document.getElementById('followLocation').checked = followLocation; // チェックボックスの初期状態を設定
}

// Leaflet Mapを初期化する関数
function initMap() {
    map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    currentMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG]).addTo(map).bindPopup("現在地");
    selectedLocationMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { opacity: 0.7, draggable: true }).addTo(map).bindPopup("スポット設定地点");
    selectedLocationMarker.remove(); // 最初は非表示

    // マップがクリックされたら、その地点にスポット設定用のマーカーを移動
    map.on('click', (e) => {
        mapClickLatlng = e.latlng;
        selectedLocationMarker.setLatLng(mapClickLatlng).addTo(map);
        document.getElementById('status').textContent = `マップ上の ${mapClickLatlng.lat.toFixed(4)}, ${mapClickLatlng.lng.toFixed(4)} にスポットを設定できます。`;
    });

    // ユーザーがマップを操作したら、現在地追跡をOFFにする
    map.on('dragstart zoomstart', () => {
        if (followLocation) {
            followLocation = false;
            document.getElementById('followLocation').checked = false;
            document.getElementById('status').textContent = "マップ操作開始: 現在地追跡OFF";
        }
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    document.getElementById('addPoi').addEventListener('click', addPoi);
    document.getElementById('followLocation').addEventListener('change', (e) => {
        followLocation = e.target.checked;
        if (followLocation && lastKnownPosition) {
            // 追跡がONになり、かつ現在地が分かっていれば、マップを現在地へ移動
            map.setView(lastKnownPosition, map.getZoom());
            document.getElementById('status').textContent = "現在地追跡: ON";
        } else if (!followLocation) {
            document.getElementById('status').textContent = "現在地追跡: OFF";
        }
    });
    document.getElementById('recenterMap').addEventListener('click', () => {
        if (lastKnownPosition) {
            map.setView(lastKnownPosition, map.getZoom());
            // 手動で現在地に戻った場合は、追跡もONにする
            followLocation = true;
            document.getElementById('followLocation').checked = true;
            document.getElementById('status').textContent = "現在地に戻りました。追跡ON。";
        } else {
            document.getElementById('status').textContent = "現在地がまだ不明です。";
        }
    });
}

// 現在地追跡を開始（マップの中心表示用）
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
                const currentPos = [lat, lng];
                lastKnownPosition = currentPos; // 最後の現在地を保存

                currentMarker.setLatLng(currentPos); // 現在地マーカーを更新
                
                if (followLocation) { // followLocationがtrueの場合のみマップの中心を現在地へ移動
                    map.setView(currentPos, map.getZoom());
                }
            },
            (error) => {
                console.error("Geolocation Error for current location:", error);
                // エラー時はステータスに表示するが、アプリの機能には影響しない
                document.getElementById('status').textContent = "現在地を取得できませんでした。";
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000, // 1分間はキャッシュを利用
                timeout: 10000 // 10秒でタイムアウト
            }
        );
    } else {
        console.log("Geolocation APIがサポートされていません。");
    }
}

// スポットを追加
function addPoi() {
    if (!mapClickLatlng) {
        document.getElementById('status').textContent = "マップ上でスポットを設定する場所を選択してください。";
        return;
    }

    const name = document.getElementById('poiName').value;
    const description = document.getElementById('poiDescription').value;

    if (!name) {
        document.getElementById('status').textContent = "スポット名を入力してください。";
        return;
    }

    const newPoi = {
        id: Date.now(), // ユニークなID
        name: name,
        description: description,
        lat: mapClickLatlng.lat,
        lng: mapClickLatlng.lng,
        creationTime: new Date().toISOString()
    };

    pois.push(newPoi);
    savePois();
    renderPois();
    addPoiToMap(newPoi);
    document.getElementById('status').textContent = `スポット "${name}" を追加しました。`;

    document.getElementById('poiName').value = ''; // 入力欄をクリア
    document.getElementById('poiDescription').value = ''; // 入力欄をクリア
    selectedLocationMarker.remove(); // マーカーを非表示にする
    mapClickLatlng = null;
}

// スポットをマップに追加
function addPoiToMap(poi) {
    const poiLatLng = [poi.lat, poi.lng];

    const marker = L.marker(poiLatLng).addTo(map);
    marker.bindPopup(`<b>${poi.name}</b><br>${poi.description || 'メモなし'}<br>${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}`);
    poiMarkers[poi.id] = marker; // 後で削除できるようにIDで管理
}

// スポットをlocalStorageに保存
function savePois() {
    localStorage.setItem('personalPois', JSON.stringify(pois));
}

// localStorageからスポットを読み込み
function loadPois() {
    const savedPoisJSON = localStorage.getItem('personalPois');
    if (savedPoisJSON) {
        try {
            pois = JSON.parse(savedPoisJSON);
            pois.forEach(poi => {
                addPoiToMap(poi);
            });
            document.getElementById('status').textContent = `${pois.length}件のスポットを読み込みました。`;
        } catch (e) {
            console.error("Failed to load POIs:", e);
            document.getElementById('status').textContent = "スポットの読み込みに失敗しました。";
            pois = [];
        }
    } else {
        pois = [];
    }
}

// スポットリストをUIに表示
function renderPois() {
    const poiListElement = document.getElementById('poiList');
    poiListElement.innerHTML = ''; // リストをクリア

    if (pois.length === 0) {
        poiListElement.innerHTML = '<li>登録されたスポットはありません。</li>';
        return;
    }

    pois.forEach(poi => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="poi-name">${poi.name}</div>
            <div class="poi-description">${poi.description || 'メモなし'}</div>
            <div class="poi-location">${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}</div>
            <button class="delete-btn" data-id="${poi.id}">削除</button>
        `;
        listItem.querySelector('.delete-btn').addEventListener('click', deletePoi);
        poiListElement.appendChild(listItem);
    });
}

// スポットを削除
function deletePoi(event) {
    const idToDelete = parseInt(event.target.dataset.id, 10);
    pois = pois.filter(poi => poi.id !== idToDelete);
    savePois();
    renderPois();

    // マップ上のマーカーも削除
    if (poiMarkers[idToDelete]) {
        map.removeLayer(poiMarkers[idToDelete]);
        delete poiMarkers[idToDelete];
    }
    document.getElementById('status').textContent = "スポットを削除しました。";
}