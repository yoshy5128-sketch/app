document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const videoInput = document.getElementById('video-input');
    const previewVideo = document.getElementById('preview-video');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const setStartBtn = document.getElementById('set-start-btn');
    const setEndBtn = document.getElementById('set-end-btn');
    const trimBtn = document.getElementById('trim-btn');
    const concatBtn = document.getElementById('concat-btn');
    const clipsList = document.getElementById('clips-list');
    const statusMessage = document.getElementById('status-message');
    const progressBar = document.getElementById('progress-bar');

    // --- ffmpegインスタンスと状態管理 ---
    let ffmpeg;
    let originalVideoFile = null; // 読み込んだ元の動画ファイル
    let clipCounter = 1; // クリップの連番

    // --- 初期化処理 ---
    const initialize = async () => {
        statusMessage.textContent = 'FFmpegを読み込んでいます... (数MBのダウンロードが必要です)';
        videoInput.disabled = true;

        // CDNから読み込んだFFmpegオブジェクト
        const { createFFmpeg, fetchFile } = FFmpeg;
        ffmpeg = createFFmpeg({
            log: true, // ffmpegのログをコンソールに出力
            progress: ({ ratio }) => {
                let msg = `処理中... ${Math.round(ratio * 100)}%`;
                if (ratio === 1) {
                    msg = "後処理中... しばらくお待ちください。";
                }
                statusMessage.textContent = msg;
                progressBar.style.display = 'block';
                progressBar.value = Math.round(ratio * 100);
            },
        });

        await ffmpeg.load();
        statusMessage.textContent = '準備完了。動画ファイルを選択してください。';
        videoInput.disabled = false;
        // 初期状態ではボタンは無効
        trimBtn.disabled = true;
        concatBtn.disabled = true;
        setStartBtn.disabled = true;
        setEndBtn.disabled = true;
    };

    // --- ヘルパー関数: 秒数を HH:MM:SS.ms 形式に変換 ---
    const formatTime = (timeInSeconds) => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.round((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

        const pad = (num, size = 2) => num.toString().padStart(size, '0');

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
    };

    // --- イベントリスナーの設定 ---

    // 1. 動画ファイル選択時の処理
    videoInput.addEventListener('change', (event) => {
        originalVideoFile = event.target.files[0];
        if (originalVideoFile) {
            const fileURL = URL.createObjectURL(originalVideoFile);
            previewVideo.src = fileURL;
            previewVideo.onloadedmetadata = () => {
                endTimeInput.value = formatTime(previewVideo.duration);
            };
            statusMessage.textContent = '動画を読み込みました。トリミング範囲を指定してください。';
            trimBtn.disabled = false;
            setStartBtn.disabled = false;
            setEndBtn.disabled = false;
        }
    });

    // 2. 開始時間設定ボタン
    setStartBtn.addEventListener('click', () => {
        startTimeInput.value = formatTime(previewVideo.currentTime);
    });

    // 3. 終了時間設定ボタン
    setEndBtn.addEventListener('click', () => {
        endTimeInput.value = formatTime(previewVideo.currentTime);
    });


    // --- ヘルパー関数: 時間文字列を秒に変換 ---
    const timeToSeconds = (timeStr) => {
        const parts = timeStr.split(':');
        const secondsParts = parts[2].split('.');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(secondsParts[0], 10);
        const milliseconds = parseInt(secondsParts[1], 10);
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    };

    // --- クリップリストに追加する関数 ---
    const addClipToList = (videoBlob) => {
        const clipId = `clip-${clipCounter}`;
        const videoURL = URL.createObjectURL(videoBlob);
        
        const li = document.createElement('li');
        li.id = clipId;
        // li要素にBlobを直接関連付ける
        li.dataset.videoBlob = videoURL;

        const fileNameInput = document.createElement('input');
        fileNameInput.type = 'text';
        fileNameInput.value = String(clipCounter).padStart(2, '0');
        
        const videoElement = document.createElement('video');
        videoElement.src = videoURL;
        videoElement.controls = false;
        videoElement.muted = true;
        videoElement.addEventListener('mouseover', () => videoElement.play());
        videoElement.addEventListener('mouseout', () => {
            videoElement.pause();
            videoElement.currentTime = 0;
        });

        const downloadLink = document.createElement('a');
        downloadLink.href = videoURL;
        downloadLink.download = `${fileNameInput.value}.mp4`;
        downloadLink.textContent = 'DL';
        
        fileNameInput.addEventListener('change', () => {
            downloadLink.download = `${fileNameInput.value}.mp4`;
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '削除';
        deleteBtn.onclick = () => {
            URL.revokeObjectURL(li.dataset.videoBlob); // メモリ解放
            li.remove();
            concatBtn.disabled = clipsList.children.length === 0;
        };
        
        li.appendChild(fileNameInput);
        li.appendChild(videoElement);
        li.appendChild(downloadLink);
        li.appendChild(deleteBtn);
        
        clipsList.appendChild(li);
        
        clipCounter++;
        concatBtn.disabled = false;
    };

    // --- トリミング処理 ---
    const handleTrim = async () => {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (timeToSeconds(startTime) >= timeToSeconds(endTime)) {
            alert('エラー: 終了時間は開始時間より後に設定してください。');
            return;
        }
        
        trimBtn.disabled = true;
        concatBtn.disabled = true;
        statusMessage.textContent = '動画を準備しています...';

        try {
            const inputFileName = 'input.mp4';
            const outputFileName = `output_${Date.now()}.mp4`;

            ffmpeg.FS('writeFile', inputFileName, await FFmpeg.fetchFile(originalVideoFile));

            statusMessage.textContent = 'トリミングを実行中...';
            await ffmpeg.run('-i', inputFileName, '-ss', startTime, '-to', endTime, '-c', 'copy', outputFileName);
            
            const data = ffmpeg.FS('readFile', outputFileName);
            const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            addClipToList(videoBlob);
            
            statusMessage.textContent = 'トリミングが完了しました。';

            ffmpeg.FS('unlink', inputFileName);
            ffmpeg.FS('unlink', outputFileName);

        } catch (error) {
            console.error(error);
            statusMessage.textContent = `エラーが発生しました: ${error}`;
        } finally {
            progressBar.style.display = 'none';
            trimBtn.disabled = false;
            concatBtn.disabled = clipsList.children.length === 0;
        }
    };

    // --- 結合処理 ---
    const handleConcat = async () => {
        const clipItems = Array.from(clipsList.children);
        if (clipItems.length < 2) {
            alert('結合するには、2つ以上のクリップが必要です。');
            return;
        }

        trimBtn.disabled = true;
        concatBtn.disabled = true;
        statusMessage.textContent = '結合の準備をしています...';

        try {
            const sortedClips = clipItems.sort((a, b) => {
                const aName = a.querySelector('input').value;
                const bName = b.querySelector('input').value;
                return aName.localeCompare(bName, undefined, { numeric: true });
            });

            const inputFiles = [];
            let filterComplex = '';
            
            for (let i = 0; i < sortedClips.length; i++) {
                const li = sortedClips[i];
                const fileName = `input_${String(i).padStart(2, '0')}.mp4`;
                const videoBlobUrl = li.dataset.videoBlob;

                ffmpeg.FS('writeFile', fileName, await FFmpeg.fetchFile(videoBlobUrl));
                inputFiles.push('-i', fileName);
                filterComplex += `[${i}:v][${i}:a]`;
            }
            
            filterComplex += `concat=n=${sortedClips.length}:v=1:a=1[outv][outa]`;

            const outputFileName = 'final_output.mp4';
            const args = [
                ...inputFiles,
                '-filter_complex',
                filterComplex,
                '-map', '[outv]',
                '-map', '[outa]',
                outputFileName
            ];

            statusMessage.textContent = 'クリップを結合中... (この処理には時間がかかる場合があります)';
            await ffmpeg.run(...args);

            const data = ffmpeg.FS('readFile', outputFileName);
            const finalBlob = new Blob([data.buffer], { type: 'video/mp4' });
            const finalUrl = URL.createObjectURL(finalBlob);

            const downloadLink = document.createElement('a');
            downloadLink.href = finalUrl;
            downloadLink.download = 'combined_video.mp4';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            setTimeout(() => URL.revokeObjectURL(finalUrl), 60000);

            statusMessage.textContent = '結合が完了し、ダウンロードが開始されました。';

            for (let i = 0; i < sortedClips.length; i++) {
                ffmpeg.FS('unlink', `input_${String(i).padStart(2, '0')}.mp4`);
            }
            ffmpeg.FS('unlink', outputFileName);

        } catch (error) {
            console.error(error);
            statusMessage.textContent = `結合エラー: ${error.message}. 解像度やコーデックが異なる動画は結合できない場合があります。`;
        } finally {
            progressBar.style.display = 'none';
            trimBtn.disabled = false;
            concatBtn.disabled = clipsList.children.length === 0;
        }
    };

    trimBtn.addEventListener('click', handleTrim);
    concatBtn.addEventListener('click', handleConcat);


    // --- アプリケーション開始 ---
    initialize();
});
