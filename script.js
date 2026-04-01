// CONFIG
const SUPABASE_URL = "https://vjodlflbxrqlrbnxwpux.supabase.co";
const SUPABASE_KEY = "sb_publishable_c1h8GSIGrW2oV4dM7SPy8A_FeXVdN1h";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let isLoading = false;
let isSeeking = false;

// Recent Backgrounds (máximo 5)
let recentBackgrounds = [];

// DOM Elements
const audio = document.getElementById('audio');
const loginContainer = document.getElementById('loginContainer');
const playerContainer = document.getElementById('playerContainer');
const playBtn = document.getElementById('playBtn');
const titleEl = document.getElementById('title');
const coverEl = document.getElementById('cover');
const progressFill = document.getElementById('progress');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const volumeIcon = document.querySelector('.volume-icon');
const backgroundContainer = document.getElementById('backgroundContainer');

// Storage Keys
const STORAGE_KEYS = {
    CURRENT_SONG: 'othrip_current_song',
    CURRENT_TIME: 'othrip_current_time',
    IS_PLAYING: 'othrip_is_playing',
    VOLUME: 'othrip_volume',
    BG_TYPE: 'othrip_bg_type',
    BG_DATA: 'othrip_bg_data',
    BG_FIT: 'othrip_bg_fit',
    RECENT_BGS: 'othrip_recent_bgs',
    THEME: 'othrip_theme'
};

// ============ THEME FUNCTIONS ============
function toggleTheme() {
    const isLightTheme = document.body.classList.toggle('light-theme');
    const theme = isLightTheme ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    
    const themeText = document.getElementById('themeText');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    if (isLightTheme) {
        themeText.textContent = 'Tema Claro';
        if (themeToggleBtn) themeToggleBtn.style.background = '#e8f5e9';
    } else {
        themeText.textContent = 'Tema Escuro';
        if (themeToggleBtn) themeToggleBtn.style.background = '#f8f8f8';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const themeText = document.getElementById('themeText');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeText) themeText.textContent = 'Tema Claro';
        if (themeToggleBtn) themeToggleBtn.style.background = '#e8f5e9';
    } else {
        document.body.classList.remove('light-theme');
        if (themeText) themeText.textContent = 'Tema Escuro';
        if (themeToggleBtn) themeToggleBtn.style.background = '#f8f8f8';
    }
}

// ============ UTILS ============
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============ BACKGROUND FUNCTIONS ============
function loadRecentBackgrounds() {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT_BGS);
    if (saved) {
        try {
            recentBackgrounds = JSON.parse(saved);
        } catch(e) {
            recentBackgrounds = [];
        }
    }
    renderRecentGrid();
}

function saveRecentBackgrounds() {
    if (recentBackgrounds.length > 5) {
        recentBackgrounds = recentBackgrounds.slice(0, 5);
    }
    localStorage.setItem(STORAGE_KEYS.RECENT_BGS, JSON.stringify(recentBackgrounds));
}

async function addToRecent(file, type) {
    try {
        const base64 = await fileToBase64(file);
        
        const exists = recentBackgrounds.some(item => item.data === base64);
        if (!exists) {
            recentBackgrounds.unshift({
                type: type,
                data: base64,
                mimeType: file.type,
                timestamp: Date.now()
            });
            
            if (recentBackgrounds.length > 5) {
                recentBackgrounds = recentBackgrounds.slice(0, 5);
            }
            
            saveRecentBackgrounds();
            renderRecentGrid();
        }
        
        return base64;
    } catch (error) {
        console.error('Error converting file to base64:', error);
        return null;
    }
}

function removeFromRecent(index) {
    recentBackgrounds.splice(index, 1);
    saveRecentBackgrounds();
    renderRecentGrid();
}

function renderRecentGrid() {
    const grid = document.getElementById('recentGrid');
    if (!grid) return;
    
    if (recentBackgrounds.length === 0) {
        grid.innerHTML = '<div class="no-recent">Nenhuma imagem recente</div>';
        return;
    }
    
    grid.innerHTML = recentBackgrounds.map((item, index) => `
        <div class="recent-item" onclick="applyRecentBackground(${index})">
            ${item.type === 'video' ? 
                `<video src="${item.data}" style="width:100%;height:100%;object-fit:cover;"></video>` :
                `<img src="${item.data}" alt="Recent">`
            }
            <div class="delete-recent" onclick="event.stopPropagation(); removeFromRecent(${index})">✕</div>
        </div>
    `).join('');
}

function applyRecentBackground(index) {
    const item = recentBackgrounds[index];
    if (item) {
        applyBackgroundFromData(item.type, item.data, item.mimeType);
    }
}

function applyBackgroundFromData(type, data, mimeType) {
    const bgVideo = document.getElementById('bgVideo');
    const bgImage = document.getElementById('bgImage');
    const videoSource = document.getElementById('bgVideoSource');
    
    if (type === 'image') {
        bgImage.src = data;
        bgImage.style.display = 'block';
        bgVideo.style.display = 'none';
        bgVideo.pause();
        localStorage.setItem(STORAGE_KEYS.BG_TYPE, 'image');
        localStorage.setItem(STORAGE_KEYS.BG_DATA, data);
    } else if (type === 'video') {
        videoSource.src = data;
        bgVideo.load();
        bgVideo.style.display = 'block';
        bgImage.style.display = 'none';
        bgVideo.play().catch(e => console.log('Video play error:', e));
        localStorage.setItem(STORAGE_KEYS.BG_TYPE, 'video');
        localStorage.setItem(STORAGE_KEYS.BG_DATA, data);
    }
}

function loadSavedBackground() {
    const bgType = localStorage.getItem(STORAGE_KEYS.BG_TYPE);
    const bgData = localStorage.getItem(STORAGE_KEYS.BG_DATA);
    const savedFit = localStorage.getItem(STORAGE_KEYS.BG_FIT) || 'fill';
    
    setFitMode(savedFit, false);
    
    if (bgType && bgData) {
        applyBackgroundFromData(bgType, bgData, bgType === 'image' ? 'image/jpeg' : 'video/mp4');
    } else {
        const bgVideo = document.getElementById('bgVideo');
        const bgImage = document.getElementById('bgImage');
        const videoSource = document.getElementById('bgVideoSource');
        videoSource.src = 'imagens/background.mp4';
        bgVideo.load();
        bgVideo.style.display = 'block';
        bgImage.style.display = 'none';
        bgVideo.play().catch(e => console.log('Default video error:', e));
    }
}

async function handleFileSelect() {
    const fileInput = document.getElementById('bgFileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    
    const base64 = await addToRecent(file, type);
    if (base64) {
        await applyBackgroundFromData(type, base64, file.type);
    }
    closeBgEditor();
}

function setFitMode(mode, save = true) {
    backgroundContainer.classList.remove('fit-fill', 'fit-contain', 'fit-cover', 'fit-stretch', 'fit-center');
    backgroundContainer.classList.add(`fit-${mode}`);
    
    document.querySelectorAll('.fit-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.fit === mode) {
            btn.classList.add('active');
        }
    });
    
    if (save) {
        localStorage.setItem(STORAGE_KEYS.BG_FIT, mode);
    }
}

function openBgEditor() {
    document.getElementById('bgEditorModal').style.display = 'flex';
    loadRecentBackgrounds();
}

function closeBgEditor() {
    document.getElementById('bgEditorModal').style.display = 'none';
    document.getElementById('bgFileInput').value = '';
}

function resetBackground() {
    localStorage.removeItem(STORAGE_KEYS.BG_TYPE);
    localStorage.removeItem(STORAGE_KEYS.BG_DATA);
    
    const bgVideo = document.getElementById('bgVideo');
    const bgImage = document.getElementById('bgImage');
    const videoSource = document.getElementById('bgVideoSource');
    videoSource.src = 'imagens/background.mp4';
    bgVideo.load();
    bgVideo.style.display = 'block';
    bgImage.style.display = 'none';
    bgVideo.play().catch(e => console.log('Default video error:', e));
    
    alert('Background reset to default!');
    closeBgEditor();
}

// ============ VOLUME FUNCTIONS ============
function setupVolume() {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    const volume = savedVolume ? parseFloat(savedVolume) : 0.8;
    audio.volume = volume;
    volumeSlider.value = volume * 100;
    volumeValue.textContent = Math.round(volume * 100) + '%';
    
    volumeSlider.addEventListener('input', function(e) {
        const newVolume = e.target.value / 100;
        audio.volume = newVolume;
        volumeValue.textContent = Math.round(newVolume * 100) + '%';
        localStorage.setItem(STORAGE_KEYS.VOLUME, newVolume);
        
        if (newVolume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (newVolume < 0.5) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    });
}

function toggleMute() {
    if (audio.volume > 0) {
        audio.dataset.previousVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
        volumeValue.textContent = '0%';
        volumeIcon.textContent = '🔇';
    } else {
        const previousVolume = audio.dataset.previousVolume || 0.8;
        audio.volume = previousVolume;
        volumeSlider.value = previousVolume * 100;
        volumeValue.textContent = Math.round(previousVolume * 100) + '%';
        volumeIcon.textContent = previousVolume < 0.5 ? '🔉' : '🔊';
    }
    localStorage.setItem(STORAGE_KEYS.VOLUME, audio.volume);
}

// ============ MUSIC FUNCTIONS ============
function updateTime() {
    if (audio.duration && !isNaN(audio.duration) && !isSeeking) {
        const currentMin = Math.floor(audio.currentTime / 60);
        const currentSec = Math.floor(audio.currentTime % 60);
        const durationMin = Math.floor(audio.duration / 60);
        const durationSec = Math.floor(audio.duration % 60);
        
        currentTimeEl.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')}`;
        durationEl.textContent = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;
        
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
    }
}

function loadMusic() {
    if (!playlist.length) return;
    
    const song = playlist[currentIndex];
    audio.src = song.audio;
    titleEl.textContent = song.title;
    coverEl.src = song.cover;
    audio.load();
    
    const savedTime = localStorage.getItem(`${STORAGE_KEYS.CURRENT_TIME}_${user?.id}`);
    if (savedTime && currentIndex === parseInt(localStorage.getItem(`${STORAGE_KEYS.CURRENT_SONG}_${user?.id}`))) {
        audio.currentTime = parseFloat(savedTime);
    }
}

function toggle() {
    if (!playlist.length) return;
    
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        isPlaying = false;
    } else {
        audio.play().catch(e => console.log('Play error:', e));
        playBtn.textContent = '⏸';
        isPlaying = true;
    }
    saveMusicState();
}

function next() {
    if (!playlist.length) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    loadMusic();
    if (isPlaying) {
        audio.play().catch(e => console.log('Play error:', e));
    }
    saveMusicState();
}

function prev() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadMusic();
    if (isPlaying) {
        audio.play().catch(e => console.log('Play error:', e));
    }
    saveMusicState();
}

function seek(event) {
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    
    if (audio.duration) {
        isSeeking = true;
        audio.currentTime = percent * audio.duration;
        setTimeout(() => { isSeeking = false; }, 100);
        saveMusicState();
    }
}

function saveMusicState() {
    if (user && playlist.length > 0) {
        localStorage.setItem(`${STORAGE_KEYS.CURRENT_SONG}_${user.id}`, currentIndex);
        localStorage.setItem(`${STORAGE_KEYS.CURRENT_TIME}_${user.id}`, audio.currentTime);
        localStorage.setItem(`${STORAGE_KEYS.IS_PLAYING}_${user.id}`, isPlaying);
    }
}

function restoreMusicState() {
    if (user && playlist.length > 0) {
        const savedSong = localStorage.getItem(`${STORAGE_KEYS.CURRENT_SONG}_${user.id}`);
        const savedPlaying = localStorage.getItem(`${STORAGE_KEYS.IS_PLAYING}_${user.id}`);
        
        if (savedSong !== null && parseInt(savedSong) < playlist.length) {
            currentIndex = parseInt(savedSong);
        }
        
        loadMusic();
        
        if (savedPlaying === 'true') {
            setTimeout(() => {
                audio.play().catch(e => console.log('Auto play error:', e));
                playBtn.textContent = '⏸';
                isPlaying = true;
            }, 500);
        }
    }
}

// ============ AUTH FUNCTIONS ============
function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

async function register() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (!email || !password) {
        alert('Please fill all fields');
        return;
    }
    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account created! Check your email to confirm.');
        closeRegisterModal();
        document.getElementById('email').value = email;
    } catch (error) {
        alert(error.message);
    }
}

async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function resetPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        alert('Please enter your email');
        return;
    }
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert('Password reset email sent!');
    } catch (error) {
        alert(error.message);
    }
}

// Toggle upload section visibility
function toggleUploadSection() {
    const uploadSection = document.getElementById('uploadSection');
    uploadSection.classList.toggle('show');
}

// Confirm logout modal
function confirmLogout() {
    document.getElementById('confirmLogoutModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmLogoutModal').style.display = 'none';
}

async function performLogout() {
    try {
        if (user) {
            localStorage.removeItem(`${STORAGE_KEYS.CURRENT_SONG}_${user.id}`);
            localStorage.removeItem(`${STORAGE_KEYS.CURRENT_TIME}_${user.id}`);
            localStorage.removeItem(`${STORAGE_KEYS.IS_PLAYING}_${user.id}`);
        }
        await supabaseClient.auth.signOut();
        closeConfirmModal();
        document.body.classList.remove('logged-in');
        location.reload();
    } catch (error) {
        alert('Logout error: ' + error.message);
    }
}

// ============ MUSIC UPLOAD ============
async function upload() {
    if (isLoading) return;
    
    const name = document.getElementById('musicName').value.trim();
    const imgFile = document.getElementById('img').files[0];
    const audioFile = document.getElementById('audioFile').files[0];
    const errorEl = document.getElementById('uploadError');
    errorEl.textContent = '';
    
    if (!name || !imgFile || !audioFile) {
        errorEl.textContent = 'Please fill all fields';
        return;
    }
    
    isLoading = true;
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    const imgName = `${Date.now()}_${imgFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const audioName = `${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
        const { error: imgError } = await supabaseClient.storage
            .from('musics')
            .upload(imgName, imgFile);
        if (imgError) throw imgError;
        
        const { error: audioError } = await supabaseClient.storage
            .from('musics')
            .upload(audioName, audioFile);
        if (audioError) throw audioError;
        
        const imgURL = supabaseClient.storage.from('musics').getPublicUrl(imgName).data.publicUrl;
        const audioURL = supabaseClient.storage.from('musics').getPublicUrl(audioName).data.publicUrl;
        
        const { error: insertError } = await supabaseClient.from('musics').insert({
            title: name,
            cover: imgURL,
            audio: audioURL,
            user_id: user.id
        });
        if (insertError) throw insertError;
        
        alert('Music uploaded successfully!');
        document.getElementById('musicName').value = '';
        document.getElementById('img').value = '';
        document.getElementById('audioFile').value = '';
        await loadMusics();
    } catch (error) {
        errorEl.textContent = 'Upload failed: ' + error.message;
    } finally {
        isLoading = false;
        uploadBtn.textContent = 'Upload Music';
        uploadBtn.disabled = false;
    }
}

async function loadMusics() {
    try {
        const { data, error } = await supabaseClient
            .from('musics')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        playlist = data || [];
        
        if (playlist.length > 0) {
            restoreMusicState();
        } else {
            titleEl.textContent = 'No songs yet. Add some!';
            coverEl.src = 'https://via.placeholder.com/220x220/333/fff?text=No+Music';
            playBtn.textContent = '▶';
            isPlaying = false;
        }
    } catch (error) {
        console.error('Error loading musics:', error);
    }
}

// ============ CHECK USER SESSION ============
async function checkUser() {
    try {
        const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
        
        if (currentUser) {
            user = currentUser;
            loginContainer.style.display = 'none';
            playerContainer.style.display = 'block';
            
            // Adiciona a classe logged-in ao body para mostrar os botões
            document.body.classList.add('logged-in');
            
            const remembered = localStorage.getItem('rememberedEmail');
            if (remembered && remembered === user.email) {
                document.getElementById('rememberMe').checked = true;
            }
            
            setupVolume();
            await loadMusics();
            
            audio.addEventListener('timeupdate', updateTime);
            audio.addEventListener('ended', next);
            audio.addEventListener('pause', () => saveMusicState());
            audio.addEventListener('play', () => saveMusicState());
        } else {
            // Remove a classe logged-in quando não há usuário
            document.body.classList.remove('logged-in');
            
            const remembered = localStorage.getItem('rememberedEmail');
            if (remembered) {
                document.getElementById('email').value = remembered;
                document.getElementById('rememberMe').checked = true;
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// ============ INITIALIZE ============
loadSavedBackground();
loadRecentBackgrounds();
loadTheme();
checkUser();

// Auth state change
supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
        checkUser();
    } else if (event === 'SIGNED_OUT') {
        location.reload();
    }
});

// Disable right click
document.addEventListener('contextmenu', (e) => e.preventDefault());