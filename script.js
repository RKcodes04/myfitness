const state = {
    isRunning: false,
    isBreathing: false,
    isMuted: true,
    animFrame: null,
    endTime: 0,
    totalDuration: 0,
    remainingTime: 0,
    currentExerciseIndex: 0,
    lastBeep: 0,
    clickCount: 0,
    clickTimer: null,
    activeRoutine: localStorage.getItem('active_routine') || "Default",
    editingRoutine: "",
    routine: JSON.parse(localStorage.getItem('workout_routine')) || { "Default": [] },
    streakHistory: JSON.parse(localStorage.getItem('streak_history')) || []
};

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

// UI Elements mapping
const ui = {
    themeBtn: document.getElementById('theme-toggle'),
    title: document.getElementById('today-title'),
    controlBar: document.querySelector('.control-bar'),
    progress: document.getElementById('progress-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    exView: document.getElementById('exercise-view'),
    brView: document.getElementById('breathing-view'),
    admin: document.getElementById('admin-overlay'),
    calendar: document.getElementById('calendar-overlay'),
    routineSelect: document.getElementById('routine-select'),
    adminInputs: document.getElementById('admin-inputs'),
    flame: document.getElementById('flame-trigger')
};

// GESTURES
ui.flame.onclick = () => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (state.clickCount === 2) {
            ui.calendar.classList.remove('hidden');
            renderCalendar();
        } else if (state.clickCount === 3) {
            ui.controlBar.classList.toggle('bar-mode');
        }
        state.clickCount = 0;
    }, 400);
};

ui.title.onclick = () => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (state.clickCount === 2) {
            ui.admin.classList.remove('hidden'); 
            state.editingRoutine = state.activeRoutine;
            renderRoutineSelector();
            loadAdminFields(state.editingRoutine);
        }
        state.clickCount = 0;
    }, 400);
};

// CORE LOGIC
const loadExercise = (idx) => {
    const routineData = state.routine[state.activeRoutine] || [];
    const ex = routineData[idx];
    ui.title.innerText = state.activeRoutine.toUpperCase();
    
    if (!ex) {
        document.getElementById('exercise-name').innerText = routineData.length === 0 ? "No Exercises" : "Finished!";
        document.getElementById('exercise-image').style.backgroundImage = 'none';
        state.remainingTime = 0;
        state.totalDuration = 1; 
        updateUI();
        if(routineData.length > 0) saveStreak();
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
    state.isMuted = false;

    if (state.isRunning) {
        cancelAnimationFrame(state.animFrame);
        state.isRunning = false;
        ui.playBtn.innerText = '▶';
        state.remainingTime = (state.endTime - Date.now()) / 1000;
    } else {
        state.isRunning = true;
        ui.playBtn.innerText = '||';
        playBeep(880, 0.1);
        state.endTime = Date.now() + (state.remainingTime * 1000);
        state.lastBeep = Math.ceil(state.remainingTime);
        state.animFrame = requestAnimationFrame(tick);
    }
};

const tick = () => {
    const now = Date.now();
    if (now < state.endTime) {
        state.remainingTime = (state.endTime - now) / 1000;
        const sec = Math.ceil(state.remainingTime);
        if (sec <= 3 && sec > 0 && state.lastBeep !== sec) {
            playBeep(440, 0.05);
            state.lastBeep = sec;
        }
        updateUI();
        state.animFrame = requestAnimationFrame(tick);
    } else {
        state.remainingTime = 0;
        updateUI();
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
    const ex = state.routine[state.activeRoutine][state.currentExerciseIndex];
    state.isBreathing = true;
    state.totalDuration = ex.break;
    state.remainingTime = ex.break;
    ui.exView.classList.add('hidden');
    ui.brView.classList.remove('hidden');
    state.endTime = Date.now() + (state.remainingTime * 1000);
    state.animFrame = requestAnimationFrame(tick);
};

const updateUI = () => {
    const timeToFormat = Math.max(0, state.remainingTime);
    const m = Math.floor(timeToFormat / 60);
    const s = Math.floor(timeToFormat % 60);
    document.getElementById('timer-min').innerText = String(m).padStart(2, '0');
    document.getElementById('timer-sec').innerText = String(s).padStart(2, '0');
    const percent = state.totalDuration > 0 ? (1 - state.remainingTime / state.totalDuration) * 100 : 0;
    ui.progress.style.width = `${percent}%`;
};

// ADMIN & REFRESH
const renderRoutineSelector = () => {
    ui.routineSelect.innerHTML = Object.keys(state.routine).map(r => 
        `<option value="${r}" ${r === state.editingRoutine ? 'selected' : ''}>${r}</option>`
    ).join('');
};

const loadAdminFields = (routineName) => {
    state.editingRoutine = routineName;
    ui.adminInputs.innerHTML = '';
    const items = state.routine[routineName] || [];
    items.forEach(ex => addEntry(ex));
};

const addEntry = (data = {name: "", dur: 60, break: 15, img: ""}) => {
    const div = document.createElement('div');
    div.className = 'admin-exercise-entry';
    div.innerHTML = `
        <input type="text" placeholder="Name" class="in-name" value="${data.name}">
        <div style="display:flex; gap:10px;">
            <input type="number" placeholder="Sec" class="in-dur" value="${data.dur}">
            <input type="number" placeholder="Rest" class="in-break" value="${data.break}">
        </div>
        <input type="text" placeholder="Img URL" class="in-img" value="${data.img}">
    `;
    ui.adminInputs.appendChild(div);
};

const saveRoutine = () => {
    const entries = [...ui.adminInputs.querySelectorAll('.admin-exercise-entry')];
    state.routine[state.editingRoutine] = entries.map(e => ({
        name: e.querySelector('.in-name').value,
        dur: parseInt(e.querySelector('.in-dur').value) || 0,
        break: parseInt(e.querySelector('.in-break').value) || 0,
        img: e.querySelector('.in-img').value
    }));
    state.activeRoutine = state.editingRoutine;
    localStorage.setItem('workout_routine', JSON.stringify(state.routine));
    localStorage.setItem('active_routine', state.activeRoutine);
    ui.admin.classList.add('hidden');
    location.reload(); // Hard refresh to clear state
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
        cell.innerHTML = `<div class="flame-box ${active ? 'flame-active' : ''}"><span>${d.getDate()}</span></div>`;
        grid.appendChild(cell);
    }
};

const saveStreak = () => {
    const today = new Date().toDateString();
    if (!state.streakHistory.includes(today)) {
        state.streakHistory.push(today);
        localStorage.setItem('streak_history', JSON.stringify(state.streakHistory));
    }
};

// Listeners
ui.routineSelect.onchange = (e) => loadAdminFields(e.target.value);
ui.playBtn.onclick = startTimer;
ui.themeBtn.onclick = () => document.body.classList.toggle('dark-theme');

document.getElementById('add-routine-btn').onclick = () => {
    const name = document.getElementById('new-routine-name').value.trim();
    if(name && !state.routine[name]) {
        state.routine[name] = [];
        state.editingRoutine = name;
        renderRoutineSelector();
        loadAdminFields(name);
    }
};

document.getElementById('add-exercise').onclick = () => addEntry();
document.getElementById('save-routine').onclick = saveRoutine;
document.getElementById('close-admin').onclick = () => ui.admin.classList.add('hidden');
document.getElementById('close-calendar').onclick = () => ui.calendar.classList.add('hidden');
document.getElementById('delete-all').onclick = () => {
    if(confirm("Wipe all data?")) {
        localStorage.clear();
        location.reload();
    }
};

// Init
document.getElementById('streak-count').innerText = state.streakHistory.length;
loadExercise(0);
