// --- OpenRouteService API Key (ここにあなたのAPIキーを貼り付けてください) ---
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEwYWJkYTExYzJkODRhZjhhZTlkOGM5YTExOWY5ZTM1IiwiaCI6Im11cm11cjY0In0="; 
// 例: "5b3ce3597851110001cf6248b61e2e13a9674066a506720d5885f8c8"

// --- グローバル変数 ---
let map;
let currentMarker; // 現在地を示すマーカー
let stopMarkers = {}; // 通過点のマーカーを管理するオブジェクト
let stops = []; // 通過点データを保存する配列 ({id, lat, lng})
let routePolyline; // 計算されたルートのポリライン
let watchId; // Geolocation.watchPosition()のID
let trackingLocation = false;
let lastKnownPosition = null; // 最後に取得した現在地

// 現在地追跡のON/OFFを制御する変数
let followLocation = true; // 初期値は追跡ON
// ユーザーがマップを操作中かどうかを示すフラグ
let userInteractingWithMap = false;

const DEFAULT_LAT = 35.681236; // 東京駅
const DEFAULT_LNG = 139.767125;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initMap();
    setupEventListeners();
    loadStops(); // 保存されている通過点を読み込む
    renderStops(); // 通過点リストをUIに表示
    startLocationTracking(); // 現在地追跡を開始
    document.getElementById('followLocation').checked = followLocation; // チェックボックスの初期状態を設定

    // APIキーが設定されているか確認
    if (ORS_API_KEY === "YOUR_OPENROUTESERVICE_API_KEY" || !ORS_API_KEY) {
        document.getElementById('status').textContent = "OpenRouteService APIキーが設定されていません！script.jsを確認してください。";
        document.getElementById('calculateRoute').disabled = true; // APIキーがないとルート計算できない
    }
}

// Leaflet Mapを初期化する関数
function initMap() {
    map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    currentMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG]).addTo(map).bindPopup("現在地");

    // ユーザーがマップの移動を開始したら
    map.on('movestart zoomstart', () => {
        userInteractingWithMap = true;
        if (followLocation) {
            followLocation = false;
            document.getElementById('followLocation').checked = false;
            document.getElementById('status').textContent = "マップ操作開始: 現在地追跡OFF";
        }
    });

    // ユーザーがマップの移動を終了したら
    map.on('moveend zoomend', () => {
        userInteractingWithMap = false;
        if (!followLocation && lastKnownPosition) {
            document.getElementById('status').textContent += " (マップ操作終了)";
        }
    });
}

// --- イベントリスナーの設定 ---
function setupEventListeners() {
    document.getElementById('addCurrentLocationAsFirstStop').addEventListener('click', addCurrentLocationAsFirstStop);
    document.getElementById('addStopFromAddress').addEventListener('click', addStopFromAddress); // ジオコーディングボタンのリスナー
    document.getElementById('addStop').addEventListener('click', addStopAtMapCenter);
    document.getElementById('calculateRoute').addEventListener('click', calculateRoute);
    document.getElementById('clearStops').addEventListener('click', clearAllStops);
    document.getElementById('followLocation').addEventListener('change', (e) => {
        followLocation = e.target.checked;
        if (followLocation && lastKnownPosition) {
            map.setView(lastKnownPosition, map.getZoom());
            document.getElementById('status').textContent = "現在地追跡: ON";
        } else if (!followLocation) {
            document.getElementById('status').textContent = "現在地追跡: OFF";
        }
    });
    document.getElementById('recenterMap').addEventListener('click', () => {
        if (lastKnownPosition) {
            map.setView(lastKnownPosition, map.getZoom());
            followLocation = true;
            document.getElementById('followLocation').checked = true;
            document.getElementById('status').textContent = "現在地に戻りました。追跡ON。";
        } else {
            document.getElementById('status').textContent = "現在地がまだ不明です。";
        }
    });
}

// --- 現在地追跡 ---
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
                
                if (followLocation && !userInteractingWithMap) {
                    map.setView(currentPos, map.getZoom());
                }
            },
            (error) => {
                console.error("Geolocation Error for current location:", error);
                document.getElementById('status').textContent = "現在地を取得できませんでした。";
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000, // 1分間はキャッシュを利用
                timeout: 10000 // 10秒でタイムアウト
            }
        );
    } else {
        document.getElementById('status').textContent = "エラー: Geolocation APIがサポートされていません。";
    }
}

// --- 通過点の管理 ---
function addCurrentLocationAsFirstStop() {
    if (!lastKnownPosition) {
        document.getElementById('status').textContent = "現在地がまだ取得できていません。しばらくお待ちください。";
        return;
    }

    const newStop = {
        id: Date.now(),
        lat: lastKnownPosition[0],
        lng: lastKnownPosition[1],
        name: `現在地`
    };

    // 既存の通過点がある場合は一番先頭に追加
    stops.unshift(newStop); // 配列の先頭に追加
    saveStops();
    renderStops();
    // renderStops()が呼ばれるとaddStopToMapが呼ばれるのでOK

    document.getElementById('status').textContent = "現在地を最初の通過点に追加しました。";
    updateRoute(); // 通過点追加時にルート再計算を試みる
}

async function addStopFromAddress() {
    const address = document.getElementById('addressInput').value;
    if (!address) {
        document.getElementById('status').textContent = "住所を入力してください。";
        return;
    }
    if (ORS_API_KEY === "YOUR_OPENROUTESERVICE_API_KEY" || !ORS_API_KEY) {
        document.getElementById('status').textContent = "OpenRouteService APIキーが設定されていません！script.jsを確認してください。";
        return;
    }

    document.getElementById('status').textContent = `"${address}"を検索中...`;

    try {
        const geocodeUrl = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&country=jp&size=1`;
        const response = await fetch(geocodeUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouteService Geocoding API Error Details:", errorText);
            throw new Error(`ジオコーディングAPIエラー: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}...`);
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const firstResult = data.features[0];
            const name = firstResult.properties.label || firstResult.properties.name || address;
            const coordinates = firstResult.geometry.coordinates; // [lng, lat]

            const newStop = {
                id: Date.now(),
                lat: coordinates[1],
                lng: coordinates[0],
                name: name
            };
            stops.push(newStop);
            saveStops();
            renderStops();
            // addStopToMap(newStop); // renderStopsが呼ぶ
            map.setView([newStop.lat, newStop.lng], 15); // マップをジオコーディング結果に移動
            document.getElementById('status').textContent = `"${name}"を通過点に追加しました。`;
            document.getElementById('addressInput').value = ''; // 入力欄をクリア
            updateRoute();
        } else {
            document.getElementById('status').textContent = `"${address}"の検索結果が見つかりませんでした。`;
        }

    } catch (error) {
        console.error("ジオコーディングエラー:", error);
        document.getElementById('status').textContent = `住所検索に失敗しました: ${error.message}`;
    }
}


function addStopAtMapCenter() {
    const mapCenter = map.getCenter();
    const newStop = {
        id: Date.now(),
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        name: `通過点 ${stops.length + 1}` // 仮の名前
    };
    stops.push(newStop);
    saveStops();
    renderStops();
    // addStopToMap(newStop); // renderStopsが呼ぶ
    document.getElementById('status').textContent = `マップの中心を通過点に追加しました: ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`;
    updateRoute(); // 通過点追加時にルート再計算を試みる
}

function addStopToMap(stop) {
    const stopLatLng = [stop.lat, stop.lng];
    const marker = L.marker(stopLatLng).addTo(map);
    marker.bindPopup(`<b>${stop.name}</b><br>${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`).openPopup();
    stopMarkers[stop.id] = marker;
}

function renderStops() {
    const stopListElement = document.getElementById('stopList');
    stopListElement.innerHTML = '';

    // マップ上の既存の通過点マーカーを全てクリア
    for (let id in stopMarkers) {
        map.removeLayer(stopMarkers[id]);
    }
    stopMarkers = {}; // オブジェクトもクリア

    if (stops.length === 0) {
        stopListElement.innerHTML = '<li>登録された通過点はありません。</li>';
        updateRouteInfo(0, 0); // ルート情報をクリア
        return;
    }

    stops.forEach((stop, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="stop-info">${index + 1}. ${stop.name || `通過点 ${index + 1}`}</span>
            <span class="stop-coords">${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</span>
            <button class="delete-btn" data-id="${stop.id}">削除</button>
        `;
        listItem.querySelector('.delete-btn').addEventListener('click', deleteStop);
        stopListElement.appendChild(listItem);
        
        // マップにマーカーを再追加
        addStopToMap(stop);
    });
}

function deleteStop(event) {
    const idToDelete = parseInt(event.target.dataset.id, 10);
    stops = stops.filter(stop => stop.id !== idToDelete);
    saveStops();
    renderStops();

    // マップ上のマーカーも削除 (renderStopsで再描画されるので不要だが、念のため)
    if (stopMarkers[idToDelete]) {
        map.removeLayer(stopMarkers[idToDelete]);
        delete stopMarkers[idToDelete];
    }
    document.getElementById('status').textContent = "通過点を削除しました。";
    updateRoute(); // 通過点削除時にルート再計算を試みる
}

function clearAllStops() {
    // マップ上の既存の通過点マーカーを全てクリア
    for (let id in stopMarkers) {
        map.removeLayer(stopMarkers[id]);
    }
    stopMarkers = {}; // オブジェクトもクリア

    stops = [];
    saveStops();
    renderStops();
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }
    updateRouteInfo(0, 0);
    document.getElementById('status').textContent = "全ての通過点とルートをクリアしました。";
}

// --- ルートの計算と表示 ---
async function updateRoute() {
    if (stops.length < 2) {
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        updateRouteInfo(0, 0);
        document.getElementById('status').textContent = "ルート計算には2つ以上の通過点が必要です。";
        return;
    }
    calculateRoute();
}

async function calculateRoute() {
    if (stops.length < 2) {
        document.getElementById('status').textContent = "ルート計算には2つ以上の通過点が必要です。";
        return;
    }
    if (ORS_API_KEY === "YOUR_OPENROUTESERVICE_API_KEY" || !ORS_API_KEY) {
        document.getElementById('status').textContent = "OpenRouteService APIキーが設定されていません！";
        return;
    }

    document.getElementById('status').textContent = "ルートを計算中...";
    const coordinates = stops.map(stop => [stop.lng, stop.lat]); // ORSは[lng, lat]の順
    console.log("ORS API: Request coordinates:", coordinates); // デバッグログ追加

    const requestBody = {
        coordinates: coordinates,
        profile: "driving-car", // "driving-car", "cycling-regular", "walking"など
        // preference: "shortest", // "shortest" or "recommended"
        units: "m", // meters
        format: "geojson",
        instructions: false // ルート案内は不要
    };
    console.log("ORS API: Request body:", requestBody); // デバッグログ追加

    try {
        const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
            method: "POST",
            headers: {
                "Accept": "application/json, application/geo+json, application/gpx+xml, application/zipped-ngx",
                "Content-Type": "application/json",
                "Authorization": ORS_API_KEY // ここに正しいAPIキーを設定する
            },
            body: JSON.stringify(requestBody)
        });
        console.log("ORS API: Response received:", response); // デバッグログ追加

        if (!response.ok) {
            const errorText = await response.text();
            // 詳細なエラーメッセージをコンソールに出力
            console.error("OpenRouteService API Error Details:", errorText);
            throw new Error(`OpenRouteService APIエラー: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}...`); // 長すぎるレスポンスを切り詰める
        }

        const data = await response.json();
        console.log("ORS API: Data from response.json():", data); // デバッグログ追加

        // featuresが空、または存在しない場合のエラーハンドリングを追加
        if (!data || !data.features || data.features.length === 0) {
            console.error("OpenRouteService APIエラー: ルートが見つからないか、データが不正です。", data);
            document.getElementById('status').textContent = `ルートが見つかりませんでした。詳細: ${data.metadata?.query?.error || '不明なエラー'}`;
            if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
            }
            updateRouteInfo(0, 0);
            return;
        }

        displayRoute(data);
        document.getElementById('status').textContent = "ルートを計算しました。";
    } catch (error) {
        console.error("ルート計算エラー:", error);
        document.getElementById('status').textContent = `ルート計算に失敗しました: ${error.message}`;
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        updateRouteInfo(0, 0);
    }
}

function displayRoute(geojson) {
    if (routePolyline) {
        map.removeLayer(routePolyline); // 既存のルートを削除
    }

    // ここでは calculateRoute でfeaturesの存在を確認済みなので、直接アクセス
    if (geojson.features && geojson.features.length > 0) { 
        routePolyline = L.geoJSON(geojson, {
            style: {
                color: '#3366cc',
                weight: 6,
                opacity: 0.7
            }
        }).addTo(map);

        map.fitBounds(routePolyline.getBounds()); // ルート全体が画面に収まるように調整

        // ルートデータがproperties.summaryを持つことを確認
        const summaryData = geojson.features[0].properties.summary; // ★ここを変更
        if (summaryData) {
            const distance = summaryData.distance; // メートル
            const duration = summaryData.duration; // 秒
            updateRouteInfo(distance, duration);
        } else {
            document.getElementById('status').textContent = "ルートサマリーデータが不足しています。";
            updateRouteInfo(0, 0);
        }
    } else {
        document.getElementById('status').textContent = "ルートが見つかりませんでした。";
        updateRouteInfo(0, 0);
    }
}

function updateRouteInfo(distance, duration) {
    const distanceKm = (distance / 1000).toFixed(2);
    const durationMinutes = Math.round(duration / 60);

    document.getElementById('routeDistance').textContent = distance > 0 ? `${distanceKm} km` : '--';
    document.getElementById('routeDuration').textContent = duration > 0 ? `${durationMinutes} 分` : '--';
}

// --- localStorageの管理 ---
function saveStops() {
    localStorage.setItem('routeStops', JSON.stringify(stops));
}

function loadStops() {
    const savedStopsJSON = localStorage.getItem('routeStops');
    if (savedStopsJSON) {
        try {
            stops = JSON.parse(savedStopsJSON);
            stops.forEach(stop => {
                addStopToMap(stop);
            });
            document.getElementById('status').textContent = `${stops.length}件の通過点を読み込みました。`;
            if (stops.length >= 2) {
                updateRoute(); // 読み込み後にルートを再計算
            }
        } catch (e) {
            console.error("Failed to load stops:", e);
            document.getElementById('status').textContent = "通過点の読み込みに失敗しました。";
            stops = [];
        }
    } else {
        stops = [];
    }
}