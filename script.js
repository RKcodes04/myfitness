const state = {
    isRunning: false,
    isBreathing: false,
    timer: null,
    totalDuration: 0,
    remainingTime: 0,
    currentExerciseIndex: 0,
    clickCount: 0,
    clickTimer: null,
    routine: JSON.parse(localStorage.getItem('workout_routine')) || {
        monday: [{ name: "Pushups", dur: 60, break: 15, img: "" }],
        tuesday: [{ name: "Squats", dur: 45, break: 10, img: "" }],
        // ... add other days
    }
};

const ui = {
    title: document.getElementById('today-title'),
    flame: document.getElementById('flame-trigger'),
    timerContainer: document.getElementById('timer-display'),
    progress: document.getElementById('progress-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    exView: document.getElementById('exercise-view'),
    brView: document.getElementById('breathing-view'),
    admin: document.getElementById('admin-overlay'),
    calendar: document.getElementById('calendar-overlay')
};

// --- Gesture Manager ---
const handleGesture = (e) => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (state.clickCount === 2) resetExercise();
        if (state.clickCount === 3) toggleBarMode();
        state.clickCount = 0;
    }, 300);
};

const toggleBarMode = () => {
    ui.timerContainer.classList.toggle('bar-mode');
    document.querySelector('.control-bar').classList.toggle('bar-mode-active');
};

const resetExercise = () => {
    clearInterval(state.timer);
    state.isRunning = false;
    ui.playBtn.innerText = '▶';
    loadExercise(state.currentExerciseIndex);
};

// --- Logic ---
const loadExercise = (idx) => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
    const todayData = state.routine[day] || [{ name: "Rest", dur: 0, break: 0 }];
    const ex = todayData[idx];

    if (!ex) {
        document.getElementById('exercise-name').innerText = "Workout Complete!";
        return;
    }

    state.currentExerciseIndex = idx;
    state.totalDuration = ex.dur;
    state.remainingTime = ex.dur;
    state.isBreathing = false;
    
    document.getElementById('exercise-name').innerText = ex.name;
    document.getElementById('exercise-image').style.backgroundImage = ex.img ? `url(${ex.img})` : 'none';
    
    ui.exView.classList.remove('hidden');
    ui.brView.classList.add('hidden');
    updateUI();
};

const startTimer = () => {
    if (state.isRunning) {
        clearInterval(state.timer);
        state.isRunning = false;
        ui.playBtn.innerText = '▶';
    } else {
        state.isRunning = true;
        ui.playBtn.innerText = '||';
        state.timer = setInterval(tick, 1000);
    }
};

const tick = () => {
    if (state.remainingTime > 0) {
        state.remainingTime--;
        updateUI();
    } else {
        clearInterval(state.timer);
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
    const day = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
    const breakDur = state.routine[day][state.currentExerciseIndex].break;
    
    state.isBreathing = true;
    state.totalDuration = breakDur;
    state.remainingTime = breakDur;
    
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

// --- Events ---
ui.playBtn.onclick = startTimer;
ui.timerContainer.onclick = handleGesture;
ui.title.ondblclick = () => ui.admin.classList.remove('hidden');
ui.flame.ondblclick = () => ui.calendar.classList.remove('hidden');
document.getElementById('close-admin').onclick = () => ui.admin.classList.add('hidden');
document.getElementById('close-calendar').onclick = () => ui.calendar.classList.add('hidden');

// Start
loadExercise(0);
