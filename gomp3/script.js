        const getEl = (id) => document.getElementById(id);

        let currentPlaylist = [], currentIndex = -1, isPlaying = false, isShuffling = true,
            repeatMode = 1, // 0: off, 1: repeat all, 2: repeat one
            dragStartIndex,
            directoryHandle = null, directoryHandles = {}, currentPlaylistName = '';

        // Declared here, but assigned in initialize after DOM is ready
        let audioPlayer, newPlaylistBtn, addSongsBtn, folderStatusText, playlistListElement, shuffleBtn,
            repeatBtn, messageDisplay, trackTitleMain, trackArtistMain, trackTitleFooter, trackArtistFooter,
            playPauseBtn, nextBtn, prevBtn, seekBar, currentTimeDisplay, durationDisplay, playlistStatus,
            savePlaylistBtn, playlistNameInput, savedPlaylistsList, recursiveScanCheckbox,
            progressContainer, progressBar, exportPlaylistBtn, importPlaylistBtn, importPlaylistInput;
        
        let tabButtons, tabContents;
        let playerMain; // Kept for hide/show logic
        let playlistSidebar; // Kept for general height control

        function updateRepeatState() {
            audioPlayer.loop = (repeatMode === 2);
            switch (repeatMode) {
                case 0: // off
                    repeatBtn.classList.remove('active');
                    repeatBtn.textContent = '🔁';
                    break;
                case 1: // repeat all
                    repeatBtn.classList.add('active');
                    repeatBtn.textContent = '🔁';
                    break;
                case 2: // repeat one
                    repeatBtn.classList.add('active');
                    repeatBtn.textContent = '🔂';
                    break;
            }
        }
            
        // Moved event listeners inside initialize to ensure elements are available
        function addAllEventListeners() {
            if ('showDirectoryPicker' in window) {
                newPlaylistBtn.addEventListener('click', () => selectDirectoryAndProcessFiles(false));
                addSongsBtn.addEventListener('click', () => selectDirectoryAndProcessFiles(true));
                savePlaylistBtn.addEventListener('click', saveCurrentPlaylist);
                exportPlaylistBtn.addEventListener('click', exportPlaylist);
                importPlaylistBtn.addEventListener('click', () => importPlaylistInput.click());
                importPlaylistInput.addEventListener('change', handlePlaylistImport);

                tabButtons.forEach(button => {
                    button.addEventListener('click', () => switchTab(button.dataset.tab));
                });
            } else {
                folderStatusText.textContent = "お使いのブラウザはこの機能に非対応です。";
                [newPlaylistBtn, addSongsBtn, savePlaylistBtn, playlistNameInput, exportPlaylistBtn, importPlaylistBtn].forEach(el => el.style.display = 'none');
            }

            // Playback controls
            playPauseBtn.addEventListener('click', () => { 
                if (currentPlaylist.length === 0) return; 
                isPlaying = !isPlaying; 
                if (isPlaying) {
                    audioPlayer.play();
                } else {
                    audioPlayer.pause();
                }
                playPauseBtn.textContent = isPlaying ? '⏸' : '▶'; 
            });
            nextBtn.addEventListener('click', () => { 
                if(currentPlaylist.length === 0) return; 
                currentIndex = (currentIndex + 1) % currentPlaylist.length; 
                loadTrack(currentIndex, isPlaying); 
            });
            prevBtn.addEventListener('click', () => { 
                if(currentPlaylist.length === 0) return; 
                if(audioPlayer.currentTime > 5) audioPlayer.currentTime=0; 
                else { 
                    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; 
                    loadTrack(currentIndex, isPlaying); 
                } 
            });
            shuffleBtn.addEventListener('click', () => { 
                isShuffling = !isShuffling; 
                shuffleBtn.classList.toggle('active', isShuffling); 
                messageDisplay.textContent = `シャッフル ${isShuffling ? 'ON' : 'OFF'}`; 
                if(isShuffling) shuffleArray(currentPlaylist); 
                renderPlaylist(); 
            });
            repeatBtn.addEventListener('click', () => {
                repeatMode = (repeatMode + 1) % 3;
                updateRepeatState();
                switch (repeatMode) {
                    case 0: messageDisplay.textContent = 'リピート OFF'; break;
                    case 1: messageDisplay.textContent = '全曲リピート ON'; break;
                    case 2: messageDisplay.textContent = '1曲リピート ON'; break;
                }
            });

            audioPlayer.addEventListener('play', () => {
                isPlaying = true;
                playPauseBtn.textContent = '⏸';
            });
            audioPlayer.addEventListener('pause', () => {
                isPlaying = false;
                playPauseBtn.textContent = '▶';
            });
            audioPlayer.addEventListener('ended', () => {
                if (audioPlayer.loop) return;

                const isLastTrack = currentIndex === currentPlaylist.length - 1;

                if (repeatMode === 0 && isLastTrack) {
                    isPlaying = false;
                    playPauseBtn.textContent = '▶';
                    renderPlaylist();
                    messageDisplay.textContent = 'プレイリストの再生が終了しました。';
                } else {
                    // Go to the next track and ensure it plays
                    currentIndex = (currentIndex + 1) % currentPlaylist.length;
                    loadTrack(currentIndex, true);
                }
            });
            audioPlayer.addEventListener('loadedmetadata', () => { 
                durationDisplay.textContent = formatTime(audioPlayer.duration); 
                seekBar.max = audioPlayer.duration; 
            });
            audioPlayer.addEventListener('timeupdate', () => { 
                currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime); 
                if (!seekBar.isDragging) seekBar.value = audioPlayer.currentTime; 
            });
            seekBar.addEventListener('input', () => {
                audioPlayer.currentTime = seekBar.value;
            });
        }


        function updateProgressBar(progress, total, message = '') {
            const percentage = (progress >= 0 && total > 0) ? Math.round((progress / total) * 100) : 0;
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
            
            if (message) {
                messageDisplay.textContent = message;
            } else if (percentage === 0 && progress === -1) {
                messageDisplay.textContent = ''; // Clear message when hiding progress (if progress is -1)
            } else if (total > 0) {
                messageDisplay.textContent = `ファイルを処理中 (${progress}/${total})`;
            } else {
                messageDisplay.textContent = ''; // Default clear
            }
        }

        function switchTab(tabId) {
            tabContents.forEach(content => {
                if (content.id === `tab-content-${tabId}`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            tabButtons.forEach(button => {
                if (button.dataset.tab === tabId) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });

            // Hide playerMain (cassette area)
            playerMain.style.display = 'none';

            // Ensure lists inside tabs are scrollable if needed
            const activeContent = document.querySelector(`.tab-content.active`);
            if (activeContent) {
                const tabControlsHeight = tabButtons[0] ? tabButtons[0].offsetHeight : 0;
                activeContent.style.height = `calc(100% - ${tabControlsHeight}px)`; // Adjust height based on tab buttons
            }
        }

        const PLAYLISTS_COLLECTION_KEY = 'mp3_playlists_collection', DIR_HANDLES_KEY = 'mp3_dir_handles', LAST_PLAYED_KEY = 'mp3_last_played';

        const idbKeyval = {
            db: null,
            getDb() { if (this.db) return Promise.resolve(this.db); return new Promise((resolve, reject) => { const req = indexedDB.open('mp3-player-db', 3); req.onupgradeneeded = (event) => { const db = event.target.result; if (event.oldVersion < 1) { db.createObjectStore('keyval'); } }; req.onsuccess = () => { this.db = req.result; resolve(this.db); }; req.onerror = () => reject(req.error); }); },
            async get(key) { const db = await this.getDb(); return new Promise(r => db.transaction('keyval').objectStore('keyval').get(key).onsuccess = e => r(e.target.result)); },
            async set(key, val) { const db = await this.getDb(); return new Promise(r => db.transaction('keyval', 'readwrite').objectStore('keyval').put(val, key).onsuccess = r); }
        };

        function formatTime(s) { if(isNaN(s)) return '0:00'; const m = Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2, '0')}`; }
        function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
        function readTags(file) { return new Promise(r => { const d_t = file.name.replace(/\.[^/.]+$/, "") || 'Unknown'; if (window.jsmediatags) window.jsmediatags.read(file, { onSuccess: t => r({ title: t.tags.title || d_t, artist: t.tags.artist || 'Unknown' }), onError: () => r({ title: d_t, artist: 'Unknown' }) }); else r({ title: d_t, artist: 'Unknown' }); }); }
        
        function getPlaylists() { return JSON.parse(localStorage.getItem(PLAYLISTS_COLLECTION_KEY) || '{}'); }
        function savePlaylists(playlists) { localStorage.setItem(PLAYLISTS_COLLECTION_KEY, JSON.stringify(playlists)); }

        function renderSavedPlaylists() {
            const playlists = getPlaylists();
            savedPlaylistsList.innerHTML = '';
            for (const name in playlists) {
                const li = document.createElement('li');
                li.className = 'saved-playlist-item';
                li.innerHTML = `<span class="playlist-name">${name} (${playlists[name].tracks.length}曲)</span>`;
                li.addEventListener('click', () => loadNamedPlaylist(name));
                // Add swipe to delete for saved playlists
                addSwipeToDelete(li, name, (playlistName) => {
                    deletePlaylist(playlistName);
                });
                savedPlaylistsList.appendChild(li);
            }
            // Add spacer for fixed footer
            const spacer = document.createElement('div');
            spacer.className = 'scroll-spacer';
            savedPlaylistsList.appendChild(spacer);
        }

        async function saveCurrentPlaylist() {
            const name = playlistNameInput.value.trim();
            if (!name) { messageDisplay.textContent = 'プレイリスト名を入力してください。'; return; }
            if (currentPlaylist.length === 0) { messageDisplay.textContent = 'プレイリストが空です。'; return; }
            const playlists = getPlaylists();
            playlists[name] = {
                tracks: currentPlaylist.map(t => ({ 
                    title: t.title, 
                    artist: t.artist, 
                    fileName: t.fileName, 
                    directoryName: t.directoryName 
                })),
                isShuffling
            };
            savePlaylists(playlists);
            renderSavedPlaylists();
            messageDisplay.textContent = `プレイリスト「${name}」を保存しました。`;
            currentPlaylistName = name;
        }

        function exportPlaylist() {
            if (currentPlaylist.length === 0) {
                messageDisplay.textContent = 'エクスポートするプレイリストがありません。';
                return;
            }

            const playlistName = playlistNameInput.value.trim() || 'playlist';

            const exportData = {
                name: playlistName,
                isShuffling: isShuffling,
                tracks: currentPlaylist.map(t => ({ 
                    title: t.title, 
                    artist: t.artist, 
                    fileName: t.fileName, 
                    directoryName: t.directoryName 
                }))
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${playlistName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            messageDisplay.textContent = `プレイリスト「${playlistName}」をエクスポートしました。`;
        }

        async function getFileHandleByPath(rootDirHandle, path) {
            const parts = path.split('/');
            const fileName = parts.pop();
            let currentDirHandle = rootDirHandle;
            for (const part of parts) {
                if(!part) continue;
                currentDirHandle = await currentDirHandle.getDirectoryHandle(part);
            }
            return await currentDirHandle.getFileHandle(fileName);
        }

        async function getAllFileHandles(dirHandle, path = '') {
            const handles = [];
            for await (const entry of dirHandle.values()) {
                const newPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file') {
                    handles.push({ handle: entry, path: newPath });
                } else if (entry.kind === 'directory') {
                    const subHandles = await getAllFileHandles(entry, newPath);
                    handles.push(...subHandles);
                }
            }
            return handles;
        }

        async function processFilesFromDirectory(handle, isAdding = false) {
            updateProgressBar(0, 0, "ファイルを検索中..."); // Initialize/reset progress bar
            messageDisplay.textContent = "ファイルを検索中...";

            if (!isAdding) { currentPlaylist.forEach(t => { if(t.url) URL.revokeObjectURL(t.url); }); currentPlaylist = []; }
            
            let allFileHandles = [];
            if (recursiveScanCheckbox.checked) {
                messageDisplay.textContent = "サブフォルダを検索中...";
                allFileHandles = await getAllFileHandles(handle);
            } else {
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file') {
                        allFileHandles.push({ handle: entry, path: entry.name });
                    }
                }
            }
            
            const mp3FileHandles = allFileHandles.filter(f => f.handle.name.toLowerCase().endsWith('.mp3') && !currentPlaylist.some(t => t.fileName === f.path && t.directoryName === handle.name));
            
            let processedCount = 0;
            const totalToProcess = mp3FileHandles.length;
            const newTracks = [];
            const chunkSize = 10; // Process 10 files at a time

            for (let i = 0; i < totalToProcess; i += chunkSize) {
                const chunk = mp3FileHandles.slice(i, i + chunkSize);
                const chunkPromises = chunk.map(async fileInfo => {
                    try {
                        const file = await fileInfo.handle.getFile();
                        const tags = await readTags(file);
                        return { 
                            file, 
                            url: URL.createObjectURL(file), 
                            title: tags.title, 
                            artist: tags.artist, 
                            fileName: fileInfo.path,
                            directoryName: handle.name 
                        };
                    } catch(e) { 
                        console.warn(`ファイルの処理中にエラーが発生しました: ${fileInfo.path}`, e);
                        return null;
                    }
                });
                
                const results = await Promise.all(chunkPromises);
                newTracks.push(...results.filter(Boolean));
                processedCount += chunk.length;
                updateProgressBar(processedCount, totalToProcess, "MP3ファイルを処理中...");
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI thread
            }
        
            if (!isAdding) currentPlaylist = newTracks; else currentPlaylist.push(...newTracks);
            if (isShuffling) shuffleArray(currentPlaylist);
            renderPlaylist();
            if (!isAdding && currentPlaylist.length > 0) { currentIndex = 0; loadTrack(0); }
            messageDisplay.textContent = `${newTracks.length} 曲を処理しました。`;
            updateProgressBar(-1, 0); // Hide progress bar (by setting width to 0)
        }

        async function selectDirectoryAndProcessFiles(isAdding = false) {
            console.log("selectDirectoryAndProcessFiles called, isAdding:", isAdding);
            try {
                const handle = await window.showDirectoryPicker();
                
                directoryHandles[handle.name] = handle;
                directoryHandle = handle;
                await idbKeyval.set(DIR_HANDLES_KEY, directoryHandles);

                folderStatusText.textContent = `フォルダ: ${handle.name}`;
                if (!isAdding) playlistNameInput.value = handle.name;

                await processFilesFromDirectory(handle, isAdding);
                switchTab('now-playing'); // Switch to "Now Playing" tab after processing files
            } catch (err) { 
                if (err.name === 'AbortError') {
                    messageDisplay.textContent = "フォルダ選択がキャンセルされました。";
                } else {
                    messageDisplay.textContent = `フォルダ選択に失敗しました: ${err.name} - ${err.message}`; 
                    console.error("フォルダ選択エラー:", err);
                }
            }
        }

        async function loadNamedPlaylist(name) {
            messageDisplay.textContent = `プレイリスト「${name}」をロード中...`;
            updateProgressBar(0, 0, "プレイリストをロード中..."); // Reset and show progress bar
            
            const playlists = getPlaylists();
            if (!playlists[name]) {
                updateProgressBar(-1, 0); // Hide progress bar
                return;
            }
            const p = playlists[name];

            // 1. Find all unique directories needed for this playlist
            const requiredDirs = [...new Set(p.tracks.map(t => t.directoryName))];
            
            // 2. Verify permissions for all required directories
            try {
                for (const dirName of requiredDirs) {
                    let handle = directoryHandles[dirName];
                    if (!handle) {
                        handle = (await idbKeyval.get(DIR_HANDLES_KEY) || {})[dirName];
                        if (!handle) throw new Error(`フォルダハンドル「${dirName}」が見つかりません。`);
                    }
                    if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
                        if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') {
                            throw new Error(`フォルダ「${dirName}」へのアクセスが拒否されました。`);
                        }
                    }
                    directoryHandles[dirName] = handle; // Cache the handle
                }
            } catch (err) {
                messageDisplay.textContent = `プレイリストのロードに失敗しました: ${err.name} - ${err.message}`;
                console.error("プレイリストロードエラー:", err);
                updateProgressBar(-1, 0); // Hide progress bar on error
                return;
            }
            
            // Set the *last used* directory as the active one for UI feedback
            directoryHandle = directoryHandles[requiredDirs[requiredDirs.length - 1]];
            folderStatusText.textContent = `フォルダ: ${p.tracks.length}曲 (${requiredDirs.length}フォルダ)`;

            isShuffling = p.isShuffling;
            shuffleBtn.classList.toggle('active', isShuffling);

            // 3. Load tracks using the correct handle for each
            const loadedTracks = [];
            let loadedCount = 0;
            const totalTracksToLoad = p.tracks.length;

            for (const trackInfo of p.tracks) {
                try {
                    const rootDirHandle = directoryHandles[trackInfo.directoryName];
                    if (!rootDirHandle) throw new Error(`Handle for ${trackInfo.directoryName} not ready.`);
                    
                    const fileHandle = await getFileHandleByPath(rootDirHandle, trackInfo.fileName);
                    const file = await fileHandle.getFile();
                    loadedTracks.push({ ...trackInfo, file, url: URL.createObjectURL(file) });
                } catch(e) { console.warn(`File not found: ${trackInfo.fileName} in ${trackInfo.directoryName}`, e); }
                loadedCount++;
                updateProgressBar(loadedCount, totalTracksToLoad, "ファイルをロード中...");
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI thread
            }
            
            currentPlaylist = loadedTracks;
            currentPlaylistName = name;
            playlistNameInput.value = name;
            localStorage.setItem(LAST_PLAYED_KEY, name);
            renderPlaylist();
            if (currentPlaylist.length > 0) { currentIndex = 0; loadTrack(0); }
            messageDisplay.textContent = `プレイリスト「${name}」をロードしました。 (${currentPlaylist.length}曲)`;
            updateProgressBar(-1, 0); // Hide progress bar
        }

        function handlePlaylistImport(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || !data.tracks || !Array.isArray(data.tracks)) {
                        throw new Error('無効なプレイリストファイルです。');
                    }
                    await loadImportedPlaylist(data);
                } catch (err) {
                    messageDisplay.textContent = `インポートエラー: ${err.message}`;
                    console.error(err);
                }
            };
            reader.readAsText(file);
            event.target.value = null;
        }

        async function loadImportedPlaylist(p) {
            messageDisplay.textContent = `プレイリスト「${p.name}」をインポート中...`;
            updateProgressBar(0, 0, "プレイリストをインポート中...");

            const requiredDirs = [...new Set(p.tracks.map(t => t.directoryName))];
            
            try {
                for (const dirName of requiredDirs) {
                    let handle = directoryHandles[dirName];
                    if (!handle) {
                        handle = (await idbKeyval.get(DIR_HANDLES_KEY) || {})[dirName];
                        if (!handle) throw new Error(`フォルダ「${dirName}」が見つかりません。先にフォルダを開いてください。`);
                    }
                    if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
                        if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') {
                            throw new Error(`フォルダ「${dirName}」へのアクセスが拒否されました。`);
                        }
                    }
                    directoryHandles[dirName] = handle;
                }
            } catch (err) {
                messageDisplay.textContent = `インポートに失敗: ${err.message}`;
                updateProgressBar(-1, 0);
                return;
            }

            const loadedTracks = [];
            let loadedCount = 0;
            const totalTracksToLoad = p.tracks.length;

            for (const trackInfo of p.tracks) {
                try {
                    const rootDirHandle = directoryHandles[trackInfo.directoryName];
                    if (!rootDirHandle) throw new Error(`Handle for ${trackInfo.directoryName} not found.`);
                    
                    const fileHandle = await getFileHandleByPath(rootDirHandle, trackInfo.fileName);
                    const file = await fileHandle.getFile();
                    loadedTracks.push({ ...trackInfo, file, url: URL.createObjectURL(file) });
                } catch(e) { console.warn(`File not found: ${trackInfo.fileName} in ${trackInfo.directoryName}`, e); }
                loadedCount++;
                updateProgressBar(loadedCount, totalTracksToLoad, "ファイルをロード中...");
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            currentPlaylist.forEach(t => { if(t.url) URL.revokeObjectURL(t.url); });
            currentPlaylist = loadedTracks;
            isShuffling = p.isShuffling ?? true;
            currentPlaylistName = p.name;
            playlistNameInput.value = p.name;
            
            shuffleBtn.classList.toggle('active', isShuffling);
            renderPlaylist();
            if (currentPlaylist.length > 0) { currentIndex = 0; loadTrack(0); }
            messageDisplay.textContent = `プレイリスト「${p.name}」をインポートしました。 (${currentPlaylist.length}曲)`;
            updateProgressBar(-1, 0);
            switchTab('now-playing');
        }
        
        function deletePlaylist(name) {
            const playlists = getPlaylists();
            delete playlists[name];
            savePlaylists(playlists);
            renderSavedPlaylists();
            messageDisplay.textContent = `プレイリスト「${name}」を削除しました。`;
            if (currentPlaylistName === name) {
                 currentPlaylist = [];
                 renderPlaylist();
            }
        }
                
        function renderPlaylist() {
            playlistListElement.innerHTML = '';
            playlistStatus.textContent = `（${currentPlaylist.length}曲）`;
            if (currentPlaylist.length === 0) { 
                playlistListElement.innerHTML = '<li class="playlist-item">リストは空です</li>';
                audioPlayer.src = '';
                trackTitleMain.textContent = '曲名';
                trackArtistMain.textContent = 'アーティスト名';
                trackTitleFooter.textContent = '曲名';
                trackArtistFooter.textContent = 'アーティスト名';
                return;
            }

            currentPlaylist.forEach((track, index) => {
                const li = document.createElement('li');
                li.className = 'playlist-item';
                li.dataset.index = index;
                li.setAttribute('draggable', true);

                if (index === currentIndex) li.classList.add('is-playing');
                
                const trackInfoDiv = document.createElement('div');
                trackInfoDiv.style.flexGrow = '1'; // Make info div take up space
                trackInfoDiv.innerHTML = `<div class="playlist-title">${index + 1}. ${track.title}</div><div class="playlist-artist">${track.artist} (${track.fileName})</div>`;
                
                li.appendChild(trackInfoDiv);
                
                // --- Event Listeners ---
                li.addEventListener('click', () => { currentIndex = index; loadTrack(currentIndex, true); });

                // Drag and Drop
                li.addEventListener('dragstart', dragStart);
                li.addEventListener('dragover', dragOver);
                li.addEventListener('dragleave', dragLeave);
                li.addEventListener('drop', dragDrop);
                li.addEventListener('dragend', dragEnd);

                addSwipeToDelete(li, index, (trackIndex) => {
                    if (trackIndex === currentIndex) {
                        audioPlayer.pause();
                        audioPlayer.src = '';
                        isPlaying = false;
                        playPauseBtn.textContent = '▶';
                    }

                    currentPlaylist.splice(trackIndex, 1);
                    if (trackIndex < currentIndex) {
                        currentIndex--;
                    } else if (trackIndex === currentIndex) {
                        currentIndex = (currentPlaylist.length > 0) ? Math.min(trackIndex, currentPlaylist.length - 1) : -1;
                        if (currentIndex !== -1) {
                            loadTrack(currentIndex, false); 
                        }
                    }
                    renderPlaylist(); // Re-render the list after deletion
                });

                playlistListElement.appendChild(li);
            });

            // Add spacer for fixed footer
            const spacer = document.createElement('div');
            spacer.className = 'scroll-spacer';
            playlistListElement.appendChild(spacer.cloneNode());
        }

        function dragStart(e) {
            dragStartIndex = +this.dataset.index;
            e.dataTransfer.effectAllowed = 'move';
        }

        function dragOver(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        }

        function dragLeave() {
            this.classList.remove('drag-over');
        }
        
        function dragEnd() {
            document.querySelectorAll('.playlist-item').forEach(item => item.classList.remove('drag-over'));
        }

        function dragDrop(e) {
            e.stopPropagation(); 
            const dragEndIndex = +this.dataset.index;
            swapTracks(dragStartIndex, dragEndIndex);
            this.classList.remove('drag-over');
        }

        function swapTracks(fromIndex, toIndex) {
            if (fromIndex === toIndex) return;

            const playingTrack = (currentIndex > -1) ? currentPlaylist[currentIndex] : null;

            const item = currentPlaylist.splice(fromIndex, 1)[0];
            currentPlaylist.splice(toIndex, 0, item);

            // Update the index of the currently playing track
            if (playingTrack) {
                currentIndex = currentPlaylist.findIndex(track => track.url === playingTrack.url);
            }
            
            renderPlaylist();
        }
                
        function addSwipeToDelete(li, itemIdentifier, deleteCallback) {
            let touchStartX = 0;
            let touchStartY = 0;
            let touchMoveX = 0;
            const SWIPE_THRESHOLD = 80; // Pixels to trigger delete
            const SWIPE_Y_THRESHOLD = 30; // Max vertical movement for horizontal swipe

            li.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                li.style.transition = 'none'; // Disable transition during swipe
                li.classList.add('swiping'); // Add a class for styling feedback
                li.style.zIndex = '10'; // Bring swiped item to front
            });

            li.addEventListener('touchmove', (e) => {
                touchMoveX = e.touches[0].clientX;
                const deltaX = touchMoveX - touchStartX;
                const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

                if (deltaY > SWIPE_Y_THRESHOLD) return; // Not a horizontal swipe

                if (deltaX > 0) { // Only allow right swipe
                    li.style.transform = `translateX(${deltaX}px)`;
                } else {
                    li.style.transform = 'translateX(0px)'; // Prevent left swipe
                }
            });

            li.addEventListener('touchend', (e) => {
                const deltaX = touchMoveX - touchStartX;
                li.style.transition = 'transform 0.3s ease-out'; // Re-enable transition
                li.classList.remove('swiping');
                li.style.zIndex = ''; // Reset z-index

                if (deltaX > SWIPE_THRESHOLD) {
                    deleteCallback(itemIdentifier); // Execute deletion callback
                } else {
                    // Reset position if not enough swipe
                    li.style.transform = 'translateX(0px)';
                }
            });
        }
                
        function loadTrack(index, andPlay = false) {
            if (index < 0 || index >= currentPlaylist.length) return;
            const track = currentPlaylist[index];
            if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
            audioPlayer.src = track.url;
            
            trackTitleMain.textContent = track.title;
            trackArtistMain.textContent = track.artist;
            trackTitleFooter.textContent = track.title;
            trackArtistFooter.textContent = track.artist; // Fix: Display actual artist name
            
            renderPlaylist();
            
            if (andPlay) { 
                audioPlayer.play(); 
            }
        }
        
        async function initialize() {
            // Assign DOM elements inside initialize
            audioPlayer = getEl('audio-player');
            newPlaylistBtn = getEl('new-playlist-btn');
            addSongsBtn = getEl('add-songs-btn');
            folderStatusText = getEl('folder-status-text');
            playlistListElement = getEl('playlist-list');
            shuffleBtn = getEl('shuffle-btn');
            repeatBtn = getEl('repeat-btn');
            messageDisplay = getEl('message');
            trackTitleMain = getEl('track-title');
            trackArtistMain = getEl('track-artist');
            trackTitleFooter = getEl('track-title-footer');
            trackArtistFooter = getEl('track-artist-footer');
            playPauseBtn = getEl('play-pause-btn');
            nextBtn = getEl('next-btn');
            prevBtn = getEl('prev-btn');
            seekBar = getEl('seek-bar');
            currentTimeDisplay = getEl('current-time');
            durationDisplay = getEl('duration');
            playlistStatus = getEl('playlist-status-tab');
            savePlaylistBtn = getEl('save-playlist-btn');
            playlistNameInput = getEl('playlist-name-input');
            savedPlaylistsList = getEl('saved-playlists-list');
            recursiveScanCheckbox = getEl('recursive-scan-checkbox');
            progressContainer = getEl('progress-container');
            progressBar = getEl('progress-bar');
            exportPlaylistBtn = getEl('export-playlist-btn');
            importPlaylistBtn = getEl('import-playlist-btn');
            importPlaylistInput = getEl('import-playlist-input');
            playerMain = document.querySelector('.player-main'); // playerMain needed for hide/show logic
            playlistSidebar = document.querySelector('.playlist-sidebar');

            tabButtons = document.querySelectorAll('.tab-btn');
            tabContents = document.querySelectorAll('.tab-content');
            
            // Add all event listeners here, after elements are assigned
            addAllEventListeners();
            
            if ('showDirectoryPicker' in window) {
                directoryHandles = await idbKeyval.get(DIR_HANDLES_KEY) || {};
                renderSavedPlaylists(); // Render into the 'playlists' tab initially
                const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);
                if (lastPlayed) { 
                    await loadNamedPlaylist(lastPlayed); 
                    switchTab('now-playing'); // Switch to "Now Playing" tab after loading saved playlist
                } else { 
                    messageDisplay.textContent = "ようこそ！「操作」タブから音楽フォルダを選択してください。"; 
                }
            } else {
                folderStatusText.textContent = "お使いのブラウザはこの機能に非対応です。";
                [newPlaylistBtn, addSongsBtn, savePlaylistBtn, playlistNameInput].forEach(el => el.style.display = 'none');
            }
            shuffleBtn.classList.toggle('active', isShuffling);
            updateRepeatState();
            renderPlaylist(); 
        }

        // Register Service Worker
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { updateViaCache: 'all' })
              .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
              })
              .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
              });
          });
        }

        document.addEventListener('DOMContentLoaded', initialize);