const state = {
    isRunning: false,
    isBreathing: false,
    timer: null,
    totalDuration: 0,
    remainingTime: 0,
    currentExerciseIndex: 0,
    clickCount: 0,
    clickTimer: null,
    // Using simple weekday names to avoid RangeErrors
    routine: JSON.parse(localStorage.getItem('workout_routine')) || {
        monday: [{ name: "Standard Pushups", dur: 60, break: 15, img: "" }],
        tuesday: [{ name: "Bodyweight Squats", dur: 60, break: 15, img: "" }],
        wednesday: [{ name: "Plank Hold", dur: 45, break: 20, img: "" }],
        thursday: [{ name: "Dips", dur: 60, break: 15, img: "" }],
        friday: [{ name: "Burpees", dur: 30, break: 30, img: "" }],
        saturday: [{ name: "Rest Day", dur: 0, break: 0, img: "" }],
        sunday: [{ name: "Core Crunches", dur: 60, break: 15, img: "" }]
    },
    streakHistory: JSON.parse(localStorage.getItem('streak_history')) || []
};

const ui = {
    title: document.getElementById('today-title'),
    timerContainer: document.getElementById('timer-display'),
    progress: document.getElementById('progress-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    exView: document.getElementById('exercise-view'),
    brView: document.getElementById('breathing-view'),
    admin: document.getElementById('admin-overlay'),
    calendar: document.getElementById('calendar-overlay'),
    adminInputs: document.getElementById('admin-inputs'),
    calendarGrid: document.getElementById('calendar-grid')
};

// --- Gesture Detection (Reset / Toggle Mode) ---
ui.timerContainer.onclick = () => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => {
        if (state.clickCount === 2) resetExercise();
        if (state.clickCount === 3) toggleBarMode();
        state.clickCount = 0;
    }, 300);
};

const toggleBarMode = () => {
    document.querySelector('.control-bar').classList.toggle('bar-mode-active');
};

const resetExercise = () => {
    clearInterval(state.timer);
    state.isRunning = false;
    ui.playBtn.innerText = '▶';
    loadExercise(state.currentExerciseIndex);
};

// --- Routine Logic ---
const getTodayKey = () => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toLowerCase();
};

const loadExercise = (idx) => {
    const day = getTodayKey();
    const todayData = state.routine[day] || [];
    const ex = todayData[idx];

    ui.title.innerText = `${day}: ${todayData[0]?.name || 'Routine'}`;

    if (!ex) {
        finishWorkout();
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
            // Manual start for next exercise
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
    
    // Auto-start breathing
    state.timer = setInterval(tick, 1000);
};

const updateUI = () => {
    const m = Math.floor(state.remainingTime / 60);
    const s = state.remainingTime % 60;
    document.getElementById('timer-min').innerText = String(m).padStart(2, '0');
    document.getElementById('timer-sec').innerText = String(s).padStart(2, '0');
    ui.progress.style.width = `${(1 - state.remainingTime / state.totalDuration) * 100}%`;
};

// --- Streak & Calendar ---
const renderCalendar = () => {
    ui.calendarGrid.innerHTML = '';
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDate();
    
    days.forEach((day, i) => {
        const isCompleted = state.streakHistory.includes(today - (new Date().getDay() - i));
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `
            <div class="flame-box ${isCompleted ? 'flame-active' : ''}">
                <span>${i + 1}</span>
            </div>
            <small style="margin-top:5px; color:#999">${day}</small>
        `;
        ui.calendarGrid.appendChild(cell);
    });
};

const finishWorkout = () => {
    const today = new Date().getDate();
    if (!state.streakHistory.includes(today)) {
        state.streakHistory.push(today);
        localStorage.setItem('streak_history', JSON.stringify(state.streakHistory));
    }
    document.getElementById('exercise-name').innerText = "WORKOUT DONE! 🔥";
    ui.playBtn.innerText = '✔';
};

// --- Admin ---
const addExerciseEntry = (data = {name: "", dur: 60, break: 15, img: ""}) => {
    const div = document.createElement('div');
    div.className = 'admin-exercise-entry';
    div.innerHTML = `
        <input type="text" placeholder="Exercise Name" class="in-name" value="${data.name}">
        <input type="number" placeholder="Duration (sec)" class="in-dur" value="${data.dur}">
        <input type="number" placeholder="Break (sec)" class="in-break" value="${data.break}">
        <input type="text" placeholder="Image URL" class="in-img" value="${data.img}">
    `;
    ui.adminInputs.appendChild(div);
};

ui.title.ondblclick = () => {
    ui.admin.classList.remove('hidden');
    ui.adminInputs.innerHTML = '';
    const todayRoutine = state.routine[getTodayKey()] || [];
    todayRoutine.forEach(ex => addExerciseEntry(ex));
};

document.getElementById('save-routine').onclick = () => {
    const day = getTodayKey();
    const entries = [...ui.adminInputs.querySelectorAll('.admin-exercise-entry')];
    state.routine[day] = entries.map(e => ({
        name: e.querySelector('.in-name').value,
        dur: parseInt(e.querySelector('.in-dur').value),
        break: parseInt(e.querySelector('.in-break').value),
        img: e.querySelector('.in-img').value
    }));
    localStorage.setItem('workout_routine', JSON.stringify(state.routine));
    ui.admin.classList.add('hidden');
    loadExercise(0);
};

// Init
ui.playBtn.onclick = startTimer;
document.getElementById('add-exercise').onclick = () => addExerciseEntry();
document.getElementById('close-admin').onclick = () => ui.admin.classList.add('hidden');
document.getElementById('flame-trigger').ondblclick = () => {
    ui.calendar.classList.remove('hidden');
    renderCalendar();
};
document.getElementById('close-calendar').onclick = () => ui.calendar.classList.add('hidden');

loadExercise(0);
