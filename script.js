const state = {
    isRunning: false,
    isBreathing: false,
    isMuted: true,
    animFrame: null,
    endTime: 0,
    totalDuration: 0,
    remainingTime: 0,
    currentExerciseIndex: 0,
    activeRoutine: localStorage.getItem('active_routine') || "Default",
    routine: JSON.parse(localStorage.getItem('workout_routine')) || { "Default": [] },
    streakHistory: JSON.parse(localStorage.getItem('streak_history')) || [],
    clickCount: 0,
    clickTimer: null
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const ui = {
    flame: document.getElementById('flame-trigger'),
    title: document.getElementById('today-title'),
    interaction: document.getElementById('interaction-zone'),
    playBtn: document.getElementById('play-pause-btn'),
    admin: document.getElementById('admin-overlay'),
    calendar: document.getElementById('calendar-overlay'),
    routineSelect: document.getElementById('routine-select'),
    adminInputs: document.getElementById('admin-inputs'),
    progress: document.getElementById('progress-bar')
};

// MULTI-TAP GESTURES
const handleTaps = (count, actions) => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (actions[state.clickCount]) actions[state.clickCount]();
        state.clickCount = 0;
    }, 350);
};

ui.flame.onclick = () => handleTaps(state.clickCount, {
    2: () => { ui.calendar.classList.remove('hidden'); renderFullCalendar(); },
    3: () => document.body.classList.toggle('dark-theme')
});

ui.interaction.onclick = () => handleTaps(state.clickCount, {
    2: () => resetExercise(),
    3: () => document.querySelector('.control-bar').classList.toggle('bar-mode')
});

ui.title.onclick = () => handleTaps(state.clickCount, {
    2: () => { 
        ui.admin.classList.remove('hidden'); 
        renderAdmin(); 
    }
});

// CORE ENGINE
const loadExercise = (idx) => {
    const list = state.routine[state.activeRoutine] || [];
    const ex = list[idx];
    ui.title.innerText = state.activeRoutine.toUpperCase();

    if (!ex) {
        document.getElementById('exercise-name').innerText = "Session Complete!";
        document.getElementById('exercise-image').style.backgroundImage = '';
        saveStreak();
        return;
    }

    state.currentExerciseIndex = idx;
    state.totalDuration = ex.dur;
    state.remainingTime = ex.dur;
    state.isBreathing = false;
    document.getElementById('exercise-name').innerText = ex.name;
    document.getElementById('exercise-image').style.backgroundImage = ex.img ? `url(${ex.img})` : '';
    document.getElementById('exercise-view').classList.remove('hidden');
    document.getElementById('breathing-view').classList.add('hidden');
    updateUI();
};

const tick = () => {
    const now = Date.now();
    if (now < state.endTime) {
        state.remainingTime = (state.endTime - now) / 1000;
        updateUI();
        state.animFrame = requestAnimationFrame(tick);
    } else {
        if (!state.isBreathing) {
            const ex = state.routine[state.activeRoutine][state.currentExerciseIndex];
            state.isBreathing = true;
            state.totalDuration = ex.break;
            state.remainingTime = ex.break;
            document.getElementById('exercise-view').classList.add('hidden');
            document.getElementById('breathing-view').classList.remove('hidden');
            state.endTime = Date.now() + (state.remainingTime * 1000);
            state.animFrame = requestAnimationFrame(tick);
        } else {
            state.isRunning = false;
            ui.playBtn.innerText = '▶';
            loadExercise(state.currentExerciseIndex + 1);
        }
    }
};

const updateUI = () => {
    const t = Math.max(0, state.remainingTime);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    document.getElementById('timer-min').innerText = String(m).padStart(2, '0');
    document.getElementById('timer-sec').innerText = String(s).padStart(2, '0');
    ui.progress.style.width = `${(1 - t / state.totalDuration) * 100}%`;
};

// CALENDAR
const renderFullCalendar = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    document.getElementById('calendar-month-year').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = new Date(year, month, d).toDateString();
        const div = document.createElement('div');
        div.className = `calendar-day ${state.streakHistory.includes(dateStr) ? 'active' : ''}`;
        div.innerText = d;
        grid.appendChild(div);
    }
};

// ADMIN
const renderAdmin = () => {
    ui.routineSelect.innerHTML = Object.keys(state.routine).map(r => `<option value="${r}" ${r===state.activeRoutine?'selected':''}>${r}</option>`).join('');
    loadAdminRows(ui.routineSelect.value);
};

const loadAdminRows = (name) => {
    ui.adminInputs.innerHTML = '';
    (state.routine[name] || []).forEach(ex => {
        const div = document.createElement('div');
        div.className = 'admin-row';
        div.innerHTML = `
            <input type="text" placeholder="Name" class="in-name" value="${ex.name}">
            <input type="number" placeholder="Sec" class="in-dur" value="${ex.dur}">
            <input type="number" placeholder="Rest" class="in-break" value="${ex.break}">
            <input type="text" placeholder="Image URL" class="in-img" value="${ex.img}">
        `;
        ui.adminInputs.appendChild(div);
    });
};

document.getElementById('save-routine').onclick = () => {
    const rows = [...document.querySelectorAll('.admin-row')];
    state.routine[ui.routineSelect.value] = rows.map(r => ({
        name: r.querySelector('.in-name').value,
        dur: parseInt(r.querySelector('.in-dur').value),
        break: parseInt(r.querySelector('.in-break').value),
        img: r.querySelector('.in-img').value
    }));
    state.activeRoutine = ui.routineSelect.value;
    localStorage.setItem('workout_routine', JSON.stringify(state.routine));
    localStorage.setItem('active_routine', state.activeRoutine);
    location.reload();
};

document.getElementById('add-exercise').onclick = () => {
    const div = document.createElement('div');
    div.className = 'admin-row';
    div.innerHTML = `<input type="text" placeholder="Name" class="in-name"><input type="number" placeholder="Sec" class="in-dur"><input type="number" placeholder="Rest" class="in-break"><input type="text" placeholder="Img URL" class="in-img">`;
    ui.adminInputs.appendChild(div);
};

document.getElementById('add-routine-btn').onclick = () => {
    const n = document.getElementById('new-routine-name').value;
    if(n && !state.routine[n]) { state.routine[n] = []; renderAdmin(); }
};

// INITIALIZE
ui.playBtn.onclick = () => {
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
        state.endTime = Date.now() + (state.remainingTime * 1000);
        state.animFrame = requestAnimationFrame(tick);
    }
};

document.getElementById('close-admin').onclick = () => ui.admin.classList.add('hidden');
document.getElementById('close-calendar').onclick = () => ui.calendar.classList.add('hidden');
document.getElementById('delete-all').onclick = () => { if(confirm("Clear all?")) { localStorage.clear(); location.reload(); }};
ui.routineSelect.onchange = (e) => loadAdminRows(e.target.value);

const saveStreak = () => {
    const today = new Date().toDateString();
    if (!state.streakHistory.includes(today)) {
        state.streakHistory.push(today);
        localStorage.setItem('streak_history', JSON.stringify(state.streakHistory));
        document.getElementById('streak-count').innerText = state.streakHistory.length;
    }
};

document.getElementById('streak-count').innerText = state.streakHistory.length;
loadExercise(0);
