const state = {
    isRunning: false,
    isBreathing: false,
    isMuted: true,
    timer: null,
    totalDuration: 0,
    remainingTime: 0,
    currentExerciseIndex: 0,
    clickCount: 0,
    clickTimer: null,
    editingDay: "",
    routine: JSON.parse(localStorage.getItem('workout_routine')) || {
        monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
    },
    streakHistory: JSON.parse(localStorage.getItem('streak_history')) || []
};

// --- Audio Initialization ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playBeep = (freq, dur) => {
    if (state.isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
};

const ui = {
    themeBtn: document.getElementById('theme-toggle'),
    soundBtn: document.getElementById('sound-toggle'),
    title: document.getElementById('today-title'),
    interactionZone: document.getElementById('interaction-zone'),
    progress: document.getElementById('progress-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    exView: document.getElementById('exercise-view'),
    brView: document.getElementById('breathing-view'),
    admin: document.getElementById('admin-overlay'),
    calendar: document.getElementById('calendar-overlay'),
    daySelector: document.getElementById('day-selector'),
    adminInputs: document.getElementById('admin-inputs')
};

// --- Gestures ---
ui.interactionZone.onclick = () => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (state.clickCount === 2) resetExercise();
        if (state.clickCount === 3) toggleMode();
        state.clickCount = 0;
    }, 300);
};

const toggleMode = () => ui.interactionZone.classList.toggle('bar-mode');
const resetExercise = () => {
    clearInterval(state.timer);
    state.isRunning = false;
    ui.playBtn.innerText = '▶';
    loadExercise(state.currentExerciseIndex);
};

// --- Logic ---
const getTodayKey = () => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toLowerCase();

const loadExercise = (idx) => {
    const day = getTodayKey();
    const todayData = state.routine[day] || [];
    const ex = todayData[idx];

    ui.title.innerText = `${day.toUpperCase()}`;
    if (!ex) {
        document.getElementById('exercise-name').innerText = "Workout Complete!";
        saveStreak();
        return;
    }

    state.currentExerciseIndex = idx;
    state.totalDuration = ex.dur;
    state.remainingTime = ex.dur;
    state.isBreathing = false;
    document.getElementById('exercise-name').innerText = ex.name;
    document.getElementById('exercise-image').style.backgroundImage = ex.img ? `url(${ex.img})` : '';
    ui.exView.classList.remove('hidden');
    ui.brView.classList.add('hidden');
    updateUI();
};

const startTimer = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (state.isRunning) {
        clearInterval(state.timer);
        state.isRunning = false;
        ui.playBtn.innerText = '▶';
    } else {
        state.isRunning = true;
        ui.playBtn.innerText = '||';
        playBeep(880, 0.1);
        state.timer = setInterval(tick, 1000);
    }
};

const tick = () => {
    if (state.remainingTime > 0) {
        state.remainingTime--;
        if (state.remainingTime < 4) playBeep(440, 0.05);
        updateUI();
    } else {
        clearInterval(state.timer);
        playBeep(660, 0.2);
        if (!state.isBreathing) {
            startBreathing();
        } else {
            state.isRunning = false;
            ui.playBtn.innerText = '▶';
            loadExercise(state.currentExerciseIndex + 1);
        }
    }
};

const startBreathing = () => {
    const day = getTodayKey();
    const ex = state.routine[day][state.currentExerciseIndex];
    state.isBreathing = true;
    state.totalDuration = ex.break;
    state.remainingTime = ex.break;
    ui.exView.classList.add('hidden');
    ui.brView.classList.remove('hidden');
    state.timer = setInterval(tick, 1000);
};

const updateUI = () => {
    const m = Math.floor(state.remainingTime / 60);
    const s = state.remainingTime % 60;
    document.getElementById('timer-min').innerText = String(m).padStart(2, '0');
    document.getElementById('timer-sec').innerText = String(s).padStart(2, '0');
    ui.progress.style.width = `${(1 - state.remainingTime / state.totalDuration) * 100}%`;
};

// --- Admin & Day Selection ---
const renderDaySelector = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    ui.daySelector.innerHTML = days.map(d => `
        <input type="radio" name="admin-day" id="day-${d}" value="${d}" ${d === getTodayKey() ? 'checked' : ''}>
        <label for="day-${d}">${d.slice(0,3).toUpperCase()}</label>
    `).join('');
    
    ui.daySelector.onchange = (e) => loadAdminFields(e.target.value);
    loadAdminFields(getTodayKey());
};

const loadAdminFields = (day) => {
    state.editingDay = day;
    ui.adminInputs.innerHTML = '';
    const items = state.routine[day] || [];
    items.forEach(ex => addEntry(ex));
};

const addEntry = (data = {name: "", dur: 60, break: 15, img: ""}) => {
    const div = document.createElement('div');
    div.className = 'admin-exercise-entry';
    div.innerHTML = `
        <input type="text" placeholder="Name" class="in-name" value="${data.name}">
        <input type="number" placeholder="Duration (s)" class="in-dur" value="${data.dur}">
        <input type="number" placeholder="Break (s)" class="in-break" value="${data.break}">
        <input type="text" placeholder="Image URL" class="in-img" value="${data.img}">
    `;
    ui.adminInputs.appendChild(div);
};

const saveRoutine = () => {
    const entries = [...ui.adminInputs.querySelectorAll('.admin-exercise-entry')];
    state.routine[state.editingDay] = entries.map(e => ({
        name: e.querySelector('.in-name').value,
        dur: parseInt(e.querySelector('.in-dur').value) || 0,
        break: parseInt(e.querySelector('.in-break').value) || 0,
        img: e.querySelector('.in-img').value
    }));
    localStorage.setItem('workout_routine', JSON.stringify(state.routine));
    ui.admin.classList.add('hidden');
    loadExercise(0);
};

// --- Calendar & Streak ---
const saveStreak = () => {
    const today = new Date().toDateString();
    if (!state.streakHistory.includes(today)) {
        state.streakHistory.push(today);
        localStorage.setItem('streak_history', JSON.stringify(state.streakHistory));
    }
};

const renderCalendar = () => {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const active = state.streakHistory.includes(d.toDateString());
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `
            <div class="flame-box ${active ? 'flame-active' : ''}"><span>${d.getDate()}</span></div>
        `;
        grid.appendChild(cell);
    }
};

// --- Toggles & Init ---
ui.themeBtn.onclick = () => document.body.classList.toggle('dark-theme');
ui.soundBtn.onclick = () => {
    state.isMuted = !state.isMuted;
    ui.soundBtn.innerText = state.isMuted ? 'muted' : 'sound';
    if (!state.isMuted && audioCtx.state === 'suspended') audioCtx.resume();
};
ui.playBtn.onclick = startTimer;
ui.title.ondblclick = () => { ui.admin.classList.remove('hidden'); renderDaySelector(); };
ui.flame.ondblclick = () => { ui.calendar.classList.remove('hidden'); renderCalendar(); };
document.getElementById('add-exercise').onclick = () => addEntry();
document.getElementById('save-routine').onclick = saveRoutine;
document.getElementById('close-admin').onclick = () => ui.admin.classList.add('hidden');
document.getElementById('close-calendar').onclick = () => ui.calendar.classList.add('hidden');

loadExercise(0);
