# ROADRAGE - PWA版

## 概要
ROADRAGEは3Dレースゲームです。このバージョンは**PWA（プログレッシブウェブアプリ）**として、インターネット接続なしでインストールしてプレイできます。

## 🚀 PWAの特徴
- **ワンクリックインストール**: 「アプリをインストール」ボタンから簡単にインストール
- **オフライン対応**: インストール後はインターネット不要でプレイ可能
- **アプリ感覚**: デスクトップやスマホにアイコンが追加され、アプリのように起動
- **自動更新**: 新バージョンがあれば自動で更新

## セットアップ手順

### 方法1: PWAとしてインストール（推奨）
1. 下記の「サーバー起動」手順でゲームを起動
2. 画面右下に表示される「📱 アプリをインストール」ボタンをクリック
3. 「インストール」を選択
4. デスクトップ/ホーム画面にROADRAGEアイコンが追加されます
5. 以降はアイコンから直接起動可能（オフラインOK）

### 方法2: ブラウザでプレイ
サーバー起動後、ブラウザから http://localhost:8000 にアクセス

## 📋 サーバー起動手順

### 1. ライブラリのダウンロード
以下のURLからライブラリをダウンロードして、`libs/` フォルダに保存してください：

1. **Three.js v0.160.0**
   - URL: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js
   - 保存先: `libs/three.min.js`

2. **OrbitControls**
   - URL: https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/OrbitControls.js
   - 保存先: `libs/OrbitControls.js`

3. **lil-gui v0.17.0**
   - URL: https://cdn.jsdelivr.net/npm/lil-gui@0.17.0/dist/lil-gui.umd.min.js
   - 保存先: `libs/lil-gui.umd.min.js`

### 2. アイコンの準備
`icon.png` を用意した後、以下のコマンドで各サイズのアイコンを生成：
```bash
python create_icons.py
```

### 3. ゲームの起動

#### Pythonを使用する場合（推奨）
```bash
python server.py
```

#### その他の方法
- Node.js: `npx http-server -p 8000`
- PHP: `php -S localhost:8000`
- VS Code Live Server拡張機能

## 🎮 ゲーム機能

### メインゲーム（index.html）
- 30ステージのレースゲーム
- 車のカスタマイズ機能
- リプレイ機能
- パフォーマンスHUD

### カーエディター（cs.html）
- 車のデザインをカスタマイズ
- ヘッドライト形状の編集
- JSON形式でのエクスポート/インポート

## 🕹️ 操作方法

### キーボード
- **矢印キー**: 移動
- **スペース**: ブレーキ

### タッチデバイス
- 画面の左右をタップして操作

## 📱 PWA対応ブラウザ
- Chrome/Edge (推奨)
- Firefox (一部機能制限あり)
- Safari (iOS 11.3+)

## 🔧 トラブルシューティング

### 「アプリをインストール」ボタンが表示されない
- ブラウザがPWAに対応しているか確認
- HTTPS環境でアクセスしているか確認（localhostは例外）
- Service Workerが正常に登録されているかコンソールで確認

### オフラインで動作しない
- アプリが正しくインストールされているか確認
- キャッシュがクリアされていないか確認

### 音声が再生されない場合
- ブラウザの自動再生ポリシーにより、最初の操作が必要な場合があります

## 📁 ファイル構成
```
rr/
├── index.html              # メインゲーム（PWA対応）
├── cs.html                 # カーエディター（PWA対応）
├── manifest.json           # PWAマニフェスト
├── sw.js                   # Service Worker
├── server.py               # Pythonサーバースクリプト
├── create_icons.py         # アイコン生成スクリプト
├── libs/                   # JavaScriptライブラリ
│   ├── three.min.js
│   ├── OrbitControls.js
│   └── lil-gui.umd.min.js
├── *.png                   # アイコンファイル
├── *.mp3                   # 効果音ファイル
└── README.md               # このファイル
```

## 🆕 PWAの仕組み
- **Service Worker**: オフライン対応とキャッシュ管理
- **Web App Manifest**: アプリ情報とインストール設定
- **Responsive Design**: あらゆる画面サイズに対応

## 📄 ライセンス
このゲームは個人利用のみを目的としています。
