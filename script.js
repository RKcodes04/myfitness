const state = {
    isRunning: false,
    isBreathing: false,
    timer: null,
    totalDuration: 0,
    remainingTime: 0,
    todayRoutine: [],
    currentExerciseIndex: 0,
    clickTimeout: null,
    clickCount: 0,
    settings: { streak: 7, history: ['2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13'] }
};

// --- Gesture Detection Fix ---
const handleClicks = (e, doubleAction, tripleAction) => {
    state.clickCount++;
    clearTimeout(state.clickTimeout);
    
    state.clickTimeout = setTimeout(() => {
        if (state.clickCount === 2) doubleAction();
        else if (state.clickCount === 3) tripleAction();
        state.clickCount = 0;
    }, 250); // 250ms window to capture taps
};

const ui = {
    title: document.getElementById('today-title'),
    timer: document.getElementById('timer-display'),
    flame: document.getElementById('streak-flame'),
    bar: document.getElementById('progress-bar'),
    btn: document.getElementById('play-pause-btn'),
    admin: document.getElementById('admin-overlay')
};

// --- Core Actions ---
const toggleTimerMode = () => {
    ui.timer.classList.toggle('bar-mode');
    console.log("Mode Toggled");
};

const resetSet = () => {
    clearInterval(state.timer);
    state.isRunning = false;
    loadExercise(state.currentExerciseIndex);
    ui.btn.innerHTML = '▶';
};

// --- Event Listeners ---
ui.timer.addEventListener('click', (e) => {
    handleClicks(e, resetSet, toggleTimerMode);
});

ui.title.addEventListener('click', (e) => {
    state.clickCount++;
    clearTimeout(state.clickTimeout);
    state.clickTimeout = setTimeout(() => {
        if (state.clickCount === 2) ui.admin.classList.remove('hidden');
        state.clickCount = 0;
    }, 250);
});

// Play/Pause
ui.btn.addEventListener('click', () => {
    if (state.isRunning) {
        clearInterval(state.timer);
        state.isRunning = false;
        ui.btn.innerHTML = '▶';
    } else {
        state.isRunning = true;
        ui.btn.innerHTML = '||';
        state.timer = setInterval(runTimer, 1000);
    }
});

const runTimer = () => {
    if (state.remainingTime > 0) {
        state.remainingTime--;
        updateUI();
    } else {
        clearInterval(state.timer);
        // Trigger breathing or next
    }
};

const updateUI = () => {
    const m = Math.floor(state.remainingTime / 60);
    const s = state.remainingTime % 60;
    document.getElementById('timer-min').innerText = String(m).padStart(2, '0');
    document.getElementById('timer-sec').innerText = String(s).padStart(2, '0');
    ui.bar.style.width = `${(1 - state.remainingTime / state.totalDuration) * 100}%`;
};

// Initial Load
const loadExercise = (idx) => {
    const routine = JSON.parse(localStorage.getItem('routine')) || [{name: "Pushups", dur: 60}];
    state.todayRoutine = routine;
    state.totalDuration = routine[idx].dur;
    state.remainingTime = routine[idx].dur;
    updateUI();
};

loadExercise(0);
