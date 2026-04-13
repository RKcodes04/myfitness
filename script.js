/* script.js */

// --- Global State ---
const state = {
    isRunning: false,
    isBreathing: false,
    timer: null,
    totalDuration: 0,
    remainingTime: 0,
    
    todayRoutine: [], // Exercises for the current day
    currentExerciseIndex: 0,
    
    // User Prefs (for Local Storage)
    settings: {
        isDarkMode: false,
        streakCount: 7,
    }
};

// Seed Data (if local storage is empty)
const defaultRoutines = {
    monday: [{ name: "Lunges", dur: 60, break: 10, img: "" }, { name: "Plank", dur: 30, break: 15, img: "" }],
    tuesday: [{ name: "Pushups", dur: 30, break: 15, img: "" }],
    wednesday: [{ name: "Squats", dur: 60, break: 10, img: "" }],
    thursday: [{ name: "Pullups", dur: 30, break: 15, img: "" }],
    friday: [{ name: "Burpees", dur: 45, break: 15, img: "" }],
    saturday: [{ name: "Rest", dur: 0, break: 0, img: "" }], // Special case: Rest day
    sunday: [{ name: "CORE HOLD", dur: 90, break: 30, img: "" }]
};

// --- DOM References ---
const ui = {
    todayTitle: document.getElementById('today-title'),
    streakCount: document.getElementById('streak-count'),
    
    // Views
    exerciseView: document.getElementById('exercise-view'),
    exerciseImage: document.getElementById('exercise-image'),
    exerciseName: document.getElementById('exercise-name'),
    
    breathingView: document.getElementById('breathing-view'),
    
    // Control Bar
    progressBar: document.getElementById('progress-bar'),
    timerMin: document.getElementById('timer-min'),
    timerSec: document.getElementById('timer-sec'),
    playPauseBtn: document.getElementById('play-pause-btn'),
    btnIcon: document.getElementById('btn-icon'),
    timerDisplay: document.getElementById('timer-display'),

    // Admin Panel
    adminOverlay: document.getElementById('admin-overlay'),
    adminInputs: document.getElementById('admin-inputs'),
    closeAdminBtn: document.getElementById('close-admin-btn'),
    saveRoutineBtn: document.getElementById('save-routine-btn'),
    addExerciseBtn: document.getElementById('add-exercise-btn')
};

// --- Initial Setup & Data Loading ---
const init = () => {
    loadData();
    updateTheme();
    setCurrentDay();
    loadExercise(0);
    bindEvents();
};

const loadData = () => {
    // Attempt to load settings and routine from LocalStorage
    const storedSettings = localStorage.getItem('workout_settings');
    const storedRoutine = localStorage.getItem('workout_routine_week');

    if (storedSettings) {
        state.settings = JSON.parse(storedSettings);
    }
    
    // If no routine is stored, use defaults
    const activeRoutine = storedRoutine ? JSON.parse(storedRoutine) : defaultRoutines;
    // Map today's weekday (0-6) to the routine data keys
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentWeekdayIndex = new Date().getDay();
    state.todayRoutine = activeRoutine[weekdays[currentWeekdayIndex]] || [];
    
    // Fallback if today's routine is empty
    if(state.todayRoutine.length === 0) {
        state.todayRoutine = [{ name: "Rest Day!", dur: 0, break: 0 }];
    }
};

const setCurrentDay = () => {
    const daysNames = ['SUNDAY: CORE', 'MONDAY: PUSH', 'TUESDAY: LEGS', 'WEDNESDAY: HIIT', 'THURSDAY: PULL', 'FRIDAY: ABS', 'SATURDAY: REST'];
    const index = new Date().getDay();
    ui.todayTitle.innerText = daysNames[index];
    ui.streakCount.innerText = state.settings.streakCount;
};

// --- Audio Handling (MVP) ---
// We use a dummy tap on the play button to init the context due to browser locks.
const playSound = (type) => {
    // This is a placeholder. For deployment, link to actual short sound files.
    // e.g. let audio = new Audio('sounds/tick.mp3'); audio.play();
    console.log(`[Sound]: ${type}`);
};

// --- Main Flow Control: Timer & State ---
const bindEvents = () => {
    ui.playPauseBtn.addEventListener('click', toggleTimer);
    ui.timerDisplay.addEventListener('dblclick', resetCurrentSet); // Reset safeguard
    ui.todayTitle.addEventListener('dblclick', openAdminPanel); // Admin shortcut
    ui.closeAdminBtn.addEventListener('click', closeAdminPanel);
    ui.addExerciseBtn.addEventListener('click', () => addExerciseEntryField()); // Add new field in editor
    ui.saveRoutineBtn.addEventListener('click', saveAdminRoutine);
};

// Swaps views between exercise holding and the glowing ring
const swapView = (viewName) => {
    ui.exerciseView.style.display = 'none';
    ui.breathingView.style.display = 'none';

    if (viewName === 'exercise') {
        ui.exerciseView.style.display = 'block';
    } else if (viewName === 'breathing') {
        ui.breathingView.style.display = 'block';
    }
};

const loadExercise = (index) => {
    state.currentExerciseIndex = index;
    const exercise = state.todayRoutine[index];
    
    if (!exercise) {
        finishRoutine();
        return;
    }

    // Set UI for active exercise
    ui.exerciseName.innerText = `${exercise.name} (Set ${index + 1}/${state.todayRoutine.length})`;
    if (exercise.img) {
        ui.exerciseImage.style.backgroundImage = `url(${exercise.img})`;
    } else {
        ui.exerciseImage.style.backgroundImage = 'none'; // Clear if no image
    }

    state.totalDuration = exercise.dur;
    state.remainingTime = exercise.dur;
    state.isBreathing = false;
    updateTimerDisplay();
    updateProgressBar(0);
    swapView('exercise');
};

const toggleTimer = () => {
    if (state.totalDuration === 0) return; // Special case for rest day
    
    if (state.isRunning) {
        clearInterval(state.timer);
        state.isRunning = false;
        ui.btnIcon.innerText = '▶';
    } else {
        // First play interaction unlocks sounds (implied here)
        playSound('start');
        state.isRunning = true;
        ui.btnIcon.innerText = '||';
        
        // Main setInterval loop (1 second ticks)
        state.timer = setInterval(timerTick, 1000);
    }
};

const timerTick = () => {
    state.remainingTime--;
    updateTimerDisplay();
    
    // Update simple progress bar
    const progress = (1 - (state.remainingTime / state.totalDuration)) * 100;
    updateProgressBar(progress);

    // Audio cues based on remaining time
    if (state.remainingTime <= 3 && state.remainingTime > 0) {
        playSound('warning'); // Last 3s distinct sound
    } else if (state.remainingTime > 3) {
        playSound('tick'); // Standard beat
    }

    // Phase Completion handling
    if (state.remainingTime <= 0) {
        clearInterval(state.timer);
        
        if (!state.isBreathing) {
            // Exercise Set Finished -> Start Transition (Breathing)
            handleBreakTransition();
        } else {
            // Breathing Finished -> Auto-load next exercise (Stay Paused)
            handleBreakFinished();
        }
    }
};

const updateTimerDisplay = () => {
    const min = Math.floor(state.remainingTime / 60);
    const sec = state.remainingTime % 60;
    // Padded formatting (MM:SS)
    ui.timerMin.innerText = String(min).padStart(2, '0');
    ui.timerSec.innerText = String(sec).padStart(2, '0');
};

const updateProgressBar = (percentage) => {
    ui.progressBar.style.width = `${percentage}%`;
};

// --- The Flow: Triggers for transitions ---
const handleBreakTransition = () => {
    playSound('finishSet');
    const breakDuration = state.todayRoutine[state.currentExerciseIndex].break;
    
    if (breakDuration > 0) {
        state.isBreathing = true;
        state.totalDuration = breakDuration;
        state.remainingTime = breakDuration;
        
        swapView('breathing'); // Activate the glowing ring screen
        
        // Restart timer loop for the break
        updateTimerDisplay();
        updateProgressBar(0);
        state.timer = setInterval(timerTick, 1000); // Autostart the break timer
    } else {
        // No break set? Go straight to break finished logic
        handleBreakFinished();
    }
};

const handleBreakFinished = () => {
    playSound('breakDone');
    state.isBreathing = false;
    state.currentExerciseIndex++;
    
    loadExercise(state.currentExerciseIndex);
    // As requested: The next exercise loads BUT remains PAUSED (Play button highlighted).
    state.isRunning = false;
    ui.btnIcon.innerText = '▶';
    ui.playPauseBtn.focus(); // Visual cue
};

const finishRoutine = () => {
    clearInterval(state.timer);
    ui.exerciseName.innerText = "Routine Complete!";
    playSound('success');
    state.totalDuration = 0;
    updateTimerDisplay();
    ui.btnIcon.innerText = '✔️';
    // Potential: Trigger Streak Update Logic here.
};

const resetCurrentSet = () => {
    clearInterval(state.timer);
    // Restart active timer (staying on same state)
    if (state.isBreathing) {
        handleBreakTransition(); // Reset the breathing timer
    } else {
        loadExercise(state.currentExerciseIndex); // Reset the holding timer
    }
    state.isRunning = false;
    ui.btnIcon.innerText = '▶';
};

// --- Theme (Light/Dark MVP) ---
const updateTheme = () => {
    if (state.settings.isDarkMode) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
};

// --- Admin Panel (Local Storage Manager) ---
function openAdminPanel() {
    state.isRunning && toggleTimer(); // Pause workout
    
    ui.adminOverlay.classList.remove('hidden');
    ui.adminInputs.innerHTML = ''; // Clear existing
    
    // We only edit *today's* weekday routine for this MVP
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentWeekday = weekdays[new Date().getDay()];
    
    // Retrieve full WEEKLY routine (from default or storage)
    const weeklyDataString = localStorage.getItem('workout_routine_week');
    const weeklyData = weeklyDataString ? JSON.parse(weeklyDataString) : defaultRoutines;
    const currentRoutine = weeklyData[currentWeekday] || [];

    // Populate editor fields
    currentRoutine.forEach((ex, idx) => addExerciseEntryField(ex, idx));
}

function addExerciseEntryField(data = { name: "", dur: 60, break: 15, img: "" }, index = null) {
    const entryId = index !== null ? index : Date.now();
    const entryHTML = `
        <div class="admin-exercise-entry" data-id="${entryId}">
            <div class="admin-input-group">
                <label>Exercise Name</label>
                <input type="text" class="ex-name" value="${data.name}" placeholder="Pushups, Holding, Plank...">
            </div>
            <div class="admin-input-group">
                <label>Hold Duration (seconds)</label>
                <input type="number" class="ex-dur" value="${data.dur}" placeholder="60">
            </div>
            <div class="admin-input-group">
                <label>Breathing Break (seconds)</label>
                <input type="number" class="ex-break" value="${data.break}" placeholder="15">
            </div>
            <div class="admin-input-group">
                <label>Image URL (Optional)</label>
                <input type="text" class="ex-img" value="${data.img}" placeholder="https://path/to/image.jpg">
            </div>
        </div>
    `;
    ui.adminInputs.insertAdjacentHTML('beforeend', entryHTML);
}

function saveAdminRoutine() {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentWeekday = weekdays[new Date().getDay()];
    
    // Read the form data
    const entries = ui.adminInputs.querySelectorAll('.admin-exercise-entry');
    const newRoutine = [];
    
    entries.forEach(entry => {
        const name = entry.querySelector('.ex-name').value;
        const dur = parseInt(entry.querySelector('.ex-dur').value);
        const breakDur = parseInt(entry.querySelector('.ex-break').value);
        const img = entry.querySelector('.ex-img').value;
        
        // Basic validation
        if (name && !isNaN(dur) && !isNaN(breakDur)) {
            newRoutine.push({ name, dur, break: breakDur, img });
        }
    });

    // Update LOCAL data structure
    state.todayRoutine = newRoutine;
    
    // Fetch full weekly structure to merge
    const weeklyDataString = localStorage.getItem('workout_routine_week');
    const weeklyData = weeklyDataString ? JSON.parse(weeklyDataString) : defaultRoutines;
    
    // Merge new data for today
    weeklyData[currentWeekday] = newRoutine;
    
    // SAVE back to LocalStorage
    localStorage.setItem('workout_routine_week', JSON.stringify(weeklyData));
    
    // Persistence for settings
    localStorage.setItem('workout_settings', JSON.stringify(state.settings));

    closeAdminPanel();
    loadExercise(0); // Restart routine
}

function closeAdminPanel() {
    ui.adminOverlay.classList.add('hidden');
}

// Start app
init();
