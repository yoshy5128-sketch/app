document.addEventListener('DOMContentLoaded', () => {
    const playerContainer = document.getElementById('player-container');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoFile = document.getElementById('videoFile');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const seekBar = document.getElementById('seekBar');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    const setStartBtn = document.getElementById('setStartBtn');
    const setEndBtn = document.getElementById('setEndBtn');
    const clearRepeatBtn = document.getElementById('clearRepeatBtn');
    const repeatDisplay = document.getElementById('repeat-display');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const playbackRateSelect = document.getElementById('playbackRateSelect');

    let repeatStart = null;
    let repeatEnd = null;

    // ファイル選択
    videoFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            videoPlayer.src = fileURL;
            resetPlayer();
        }
    });

    // 再生・一時停止
    playPauseBtn.addEventListener('click', () => {
        if (!videoPlayer.src) return;
        if (videoPlayer.paused) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    });

    videoPlayer.addEventListener('play', () => {
        playPauseBtn.textContent = '一時停止';
    });

    videoPlayer.addEventListener('pause', () => {
        playPauseBtn.textContent = '再生';
    });

    // 時間とシークバーの更新
    videoPlayer.addEventListener('timeupdate', () => {
        // 現在時間の更新
        currentTimeSpan.textContent = formatTime(videoPlayer.currentTime);
        
        // シークバーの更新
        if (videoPlayer.duration) {
            const percentage = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            seekBar.value = percentage;
        }

        // 区間リピートのロジック
        if (repeatStart !== null && repeatEnd !== null) {
            if (videoPlayer.currentTime >= repeatEnd || videoPlayer.currentTime < repeatStart) {
                videoPlayer.currentTime = repeatStart;
            }
        }
    });

    // シークバー操作
    seekBar.addEventListener('input', () => {
        if (videoPlayer.duration) {
            const time = (seekBar.value / 100) * videoPlayer.duration;
            videoPlayer.currentTime = time;
        }
    });

    // 動画のメタデータ読み込み完了時
    videoPlayer.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(videoPlayer.duration);
        seekBar.value = 0;
    });

    // 始点設定
    setStartBtn.addEventListener('click', () => {
        if (!videoPlayer.src) return;
        repeatStart = videoPlayer.currentTime;
        if (repeatEnd !== null && repeatStart >= repeatEnd) {
            repeatEnd = null;
        }
        updateRepeatDisplay();
    });

    // 終点設定
    setEndBtn.addEventListener('click', () => {
        if (!videoPlayer.src || repeatStart === null) return;
        if (videoPlayer.currentTime > repeatStart) {
            repeatEnd = videoPlayer.currentTime;
            updateRepeatDisplay();
        }
    });

    // リピート解除
    clearRepeatBtn.addEventListener('click', () => {
        repeatStart = null;
        repeatEnd = null;
        updateRepeatDisplay();
    });

    // フルスクリーン機能
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            playerContainer.requestFullscreen().catch(err => {
                alert(`フルスクリーンモードにできませんでした: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // フルスクリーン状態の変更を監視
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.textContent = '通常画面';
        } else {
            fullscreenBtn.textContent = 'フルスクリーン';
        }
    });

    // 再生速度の変更
    playbackRateSelect.addEventListener('change', (event) => {
        videoPlayer.playbackRate = parseFloat(event.target.value);
    });


    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateRepeatDisplay() {
        if (repeatStart !== null && repeatEnd !== null) {
            repeatDisplay.textContent = `リピート: ${formatTime(repeatStart)} - ${formatTime(repeatEnd)}`;
        } else if (repeatStart !== null) {
            repeatDisplay.textContent = `リピート: ${formatTime(repeatStart)} - (終点未設定)`;
        } else {
            repeatDisplay.textContent = 'リピート区間: なし';
        }
    }
    
    function resetPlayer() {
        playPauseBtn.textContent = '再生';
        seekBar.value = 0;
        currentTimeSpan.textContent = '00:00';
        durationSpan.textContent = '00:00';
        repeatStart = null;
        repeatEnd = null;
        updateRepeatDisplay();
        playbackRateSelect.value = '1';
        videoPlayer.playbackRate = 1;
    }
});
