/* =============================================
   WORKOUT FLOW PRO — SCRIPT.JS
   Full rewrite — all requested changes applied
   ============================================= */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
    isRunning:            false,
    isBreathing:          false,
    // rAF-based timer
    rafId:                null,
    startTimestamp:       null,
    startRemaining:       0,
    totalDuration:        0,
    remainingTime:        0,
    // exercise
    currentExerciseIndex: 0,
    activeRoutineId:      null,   // uuid of current routine
    // gestures
    flameTaps:            0,
    flameTimer:           null,
    zoneTaps:             0,
    zoneTimer:            null,
    // admin editing
    editingRoutineId:     null,
    // persistence
    routines:  JSON.parse(localStorage.getItem('wf_routines'))  || [],
    streakHistory: JSON.parse(localStorage.getItem('wf_streak')) || []
};

// Seed demo routines if first launch
if (state.routines.length === 0) {
    state.routines = [
        {
            id: uid(), name: 'Push Day',
            exercises: [
                { name: 'Push-ups',      dur: 45, rest: 20, img: '' },
                { name: 'Dips',          dur: 40, rest: 20, img: '' },
                { name: 'Pike Push-ups', dur: 35, rest: 25, img: '' }
            ]
        },
        {
            id: uid(), name: 'Pull Day',
            exercises: [
                { name: 'Pull-ups',      dur: 40, rest: 20, img: '' },
                { name: 'Chin-ups',      dur: 35, rest: 20, img: '' },
                { name: 'Inverted Rows', dur: 45, rest: 25, img: '' }
            ]
        },
        {
            id: uid(), name: 'Leg Day',
            exercises: [
                { name: 'Squats',        dur: 50, rest: 20, img: '' },
                { name: 'Lunges',        dur: 45, rest: 20, img: '' },
                { name: 'Calf Raises',   dur: 40, rest: 15, img: '' }
            ]
        }
    ];
    persist();
}

// Set first routine as active by default
if (!state.activeRoutineId) {
    state.activeRoutineId = state.routines[0]?.id || null;
}

// ─── Audio ───────────────────────────────────────────────────────────────────
let audioCtx = null;

const ensureAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
};

const playBeep = (freq, dur) => {
    if (!audioCtx) return;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const ui = {
    title:          document.getElementById('today-title'),
    flame:          document.getElementById('flame-trigger'),
    streakCount:    document.getElementById('streak-count'),
    exView:         document.getElementById('exercise-view'),
    brView:         document.getElementById('breathing-view'),
    completeView:   document.getElementById('complete-view'),
    exImg:          document.getElementById('exercise-image'),
    exName:         document.getElementById('exercise-name'),
    setLabel:       document.getElementById('set-label'),
    breathRing:     document.getElementById('breathing-ring'),
    breathCount:    document.getElementById('breathing-countdown'),
    zone:           document.getElementById('interaction-zone'),
    progress:       document.getElementById('progress-bar'),
    timerMin:       document.getElementById('timer-min'),
    timerSec:       document.getElementById('timer-sec'),
    playBtn:        document.getElementById('play-pause-btn'),
    adminOverlay:   document.getElementById('admin-overlay'),
    calOverlay:     document.getElementById('calendar-overlay'),
    routineTabs:    document.getElementById('routine-tabs'),
    adminInputs:    document.getElementById('admin-inputs'),
    calGrid:        document.getElementById('calendar-grid'),
    calLabel:       document.getElementById('cal-month-label'),
    totalStreak:    document.getElementById('total-streak')
};

// Calendar month navigation
let calViewDate = new Date();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function persist() {
    localStorage.setItem('wf_routines', JSON.stringify(state.routines));
    localStorage.setItem('wf_streak',   JSON.stringify(state.streakHistory));
}

function getActiveRoutine() {
    return state.routines.find(r => r.id === state.activeRoutineId) || state.routines[0] || null;
}

function stopRAF() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
}

// ─── Timer (requestAnimationFrame) ───────────────────────────────────────────
function startTimer() {
    ensureAudio();   // merge audio resume with play button

    if (state.isRunning) {
        // Pause: save remaining time
        stopRAF();
        state.isRunning = false;
        ui.playBtn.textContent = '▶';
        return;
    }

    const routine = getActiveRoutine();
    if (!routine || routine.exercises.length === 0) return;

    state.isRunning      = true;
    state.startTimestamp = null;
    state.startRemaining = state.remainingTime;
    ui.playBtn.textContent = '⏸';
    playBeep(880, 0.12);

    function frame(ts) {
        if (!state.isRunning) return;

        if (!state.startTimestamp) state.startTimestamp = ts;
        const elapsed = (ts - state.startTimestamp) / 1000;
        state.remainingTime = Math.max(0, state.startRemaining - elapsed);

        // Countdown beeps in last 3 seconds
        const wholeLeft = Math.ceil(state.remainingTime);
        if (wholeLeft <= 3 && wholeLeft !== state._lastBeepAt) {
            state._lastBeepAt = wholeLeft;
            playBeep(440, 0.05);
        }

        updateUI();

        if (state.remainingTime > 0) {
            state.rafId = requestAnimationFrame(frame);
        } else {
            state.isRunning = false;
            ui.playBtn.textContent = '▶';
            playBeep(660, 0.25);
            if (!state.isBreathing) {
                startBreathing();
            } else {
                loadExercise(state.currentExerciseIndex + 1);
            }
        }
    }

    state._lastBeepAt = null;
    state.rafId = requestAnimationFrame(frame);
}

// ─── Exercise Loading ─────────────────────────────────────────────────────────
function loadExercise(idx) {
    stopRAF();
    state.isRunning   = false;
    state.isBreathing = false;
    ui.playBtn.textContent = '▶';

    const routine = getActiveRoutine();
    if (!routine) {
        showComplete();
        return;
    }

    ui.title.textContent = routine.name.toUpperCase();

    if (idx >= routine.exercises.length) {
        showComplete();
        saveStreak();
        return;
    }

    const ex = routine.exercises[idx];
    state.currentExerciseIndex = idx;
    state.totalDuration        = ex.dur;
    state.remainingTime        = ex.dur;

    ui.exName.textContent = ex.name;
    ui.setLabel.textContent = `Exercise ${idx + 1} of ${routine.exercises.length}`;
    ui.exImg.style.backgroundImage = ex.img ? `url(${ex.img})` : '';

    showPanel('exercise');
    updateUI();
}

function startBreathing() {
    const routine = getActiveRoutine();
    const ex = routine?.exercises[state.currentExerciseIndex];
    if (!ex || !ex.rest) {
        loadExercise(state.currentExerciseIndex + 1);
        return;
    }

    state.isBreathing    = true;
    state.totalDuration  = ex.rest;
    state.remainingTime  = ex.rest;
    state.startTimestamp = null;
    state.startRemaining = ex.rest;

    showPanel('breathing');
    updateBreathingCountdown();

    state.isRunning = true;
    ui.playBtn.textContent = '⏸';

    function frame(ts) {
        if (!state.isRunning) return;
        if (!state.startTimestamp) state.startTimestamp = ts;
        const elapsed = (ts - state.startTimestamp) / 1000;
        state.remainingTime = Math.max(0, state.startRemaining - elapsed);
        updateUI();
        updateBreathingCountdown();
        if (state.remainingTime > 0) {
            state.rafId = requestAnimationFrame(frame);
        } else {
            state.isRunning = false;
            ui.playBtn.textContent = '▶';
            playBeep(660, 0.2);
            loadExercise(state.currentExerciseIndex + 1);
        }
    }
    state._lastBeepAt = null;
    state.rafId = requestAnimationFrame(frame);
}

function updateBreathingCountdown() {
    ui.breathCount.textContent = Math.ceil(state.remainingTime);
    // Scale breathing ring inversely with progress for sync
    const progress = 1 - (state.remainingTime / state.totalDuration);
    const scale    = 0.78 + 0.3 * Math.sin(progress * Math.PI * 2 * (state.totalDuration / 4));
    // Let CSS animation handle it — but nudge opacity via JS for sync feel
    ui.breathRing.style.opacity = 0.4 + 0.6 * Math.abs(Math.sin(progress * Math.PI * (state.totalDuration / 4)));
}

function showComplete() {
    showPanel('complete');
    ui.title.textContent = 'DONE 💪';
}

function showPanel(which) {
    ui.exView.classList.add('hidden');
    ui.brView.classList.add('hidden');
    ui.completeView.classList.add('hidden');
    if (which === 'exercise') ui.exView.classList.remove('hidden');
    if (which === 'breathing') ui.brView.classList.remove('hidden');
    if (which === 'complete')  ui.completeView.classList.remove('hidden');
}

// ─── UI Update ────────────────────────────────────────────────────────────────
function updateUI() {
    const rem = state.remainingTime;
    const m   = Math.floor(rem / 60);
    const s   = rem % 60;
    ui.timerMin.textContent = String(m).padStart(2, '0');
    ui.timerSec.textContent = String(Math.floor(s)).padStart(2, '0');

    const pct = state.totalDuration > 0
        ? (1 - rem / state.totalDuration) * 100
        : 0;
    ui.progress.style.width = `${pct}%`;
}

// ─── Gesture: Interaction Zone ────────────────────────────────────────────────
// 2-tap = reset | 3-tap = toggle bar/timer mode
ui.zone.addEventListener('click', () => {
    state.zoneTaps++;
    clearTimeout(state.zoneTimer);
    state.zoneTimer = setTimeout(() => {
        if (state.zoneTaps === 2) resetExercise();
        if (state.zoneTaps >= 3) toggleDisplayMode();
        state.zoneTaps = 0;
    }, 300);
});

function toggleDisplayMode() {
    const zone = ui.zone;
    if (zone.classList.contains('timer-mode')) {
        zone.classList.replace('timer-mode', 'bar-mode');
    } else {
        zone.classList.replace('bar-mode', 'timer-mode');
    }
}

function resetExercise() {
    stopRAF();
    state.isRunning = false;
    ui.playBtn.textContent = '▶';
    loadExercise(state.currentExerciseIndex);
}

// ─── Gesture: Flame (2-tap = calendar | 3-tap = theme) ───────────────────────
ui.flame.addEventListener('click', () => {
    state.flameTaps++;
    clearTimeout(state.flameTimer);
    state.flameTimer = setTimeout(() => {
        if (state.flameTaps === 2) openCalendar();
        if (state.flameTaps >= 3) document.body.classList.toggle('dark-theme');
        state.flameTaps = 0;
    }, 300);
});

// ─── Admin (double-click title) ───────────────────────────────────────────────
ui.title.addEventListener('dblclick', openAdmin);

function openAdmin() {
    renderRoutineTabs();
    loadAdminFields(state.editingRoutineId || state.activeRoutineId || state.routines[0]?.id);
    ui.adminOverlay.classList.remove('hidden');
}

function renderRoutineTabs() {
    ui.routineTabs.innerHTML = '';
    state.routines.forEach(r => {
        const tab = document.createElement('div');
        tab.className = `routine-tab${r.id === state.editingRoutineId ? ' active' : ''}`;
        tab.dataset.id = r.id;
        tab.innerHTML = `<span class="tab-name">${r.name}</span><span class="tab-del" data-del="${r.id}">✕</span>`;
        tab.addEventListener('click', (e) => {
            if (e.target.dataset.del) {
                deleteRoutine(e.target.dataset.del);
            } else {
                loadAdminFields(r.id);
            }
        });
        ui.routineTabs.appendChild(tab);
    });
}

function loadAdminFields(routineId) {
    state.editingRoutineId = routineId;
    // Highlight tab
    document.querySelectorAll('.routine-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.id === routineId);
    });
    const routine = state.routines.find(r => r.id === routineId);
    ui.adminInputs.innerHTML = '';
    if (!routine) return;
    routine.exercises.forEach(ex => addEntry(ex));
}

function addEntry(data = { name: '', dur: 60, rest: 15, img: '' }) {
    const div = document.createElement('div');
    div.className = 'admin-exercise-entry';
    div.innerHTML = `
        <input type="text"   class="in-name"  placeholder="Name"       value="${escHtml(data.name)}">
        <input type="number" class="in-dur"   placeholder="60"         value="${data.dur}"  min="1">
        <input type="number" class="in-rest"  placeholder="15"         value="${data.rest}" min="0">
        <input type="text"   class="in-img"   placeholder="https://…" value="${escHtml(data.img)}">
        <button class="entry-del-btn" title="Remove">✕</button>
    `;
    div.querySelector('.entry-del-btn').addEventListener('click', () => div.remove());
    ui.adminInputs.appendChild(div);
}

function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function saveRoutine() {
    if (!state.editingRoutineId) return;
    const entries = [...ui.adminInputs.querySelectorAll('.admin-exercise-entry')];
    const idx     = state.routines.findIndex(r => r.id === state.editingRoutineId);
    if (idx === -1) return;
    state.routines[idx].exercises = entries.map(e => ({
        name: e.querySelector('.in-name').value.trim(),
        dur:  parseInt(e.querySelector('.in-dur').value)  || 30,
        rest: parseInt(e.querySelector('.in-rest').value) || 0,
        img:  e.querySelector('.in-img').value.trim()
    }));
    persist();
    location.reload();   // Hard state refresh as requested
}

function addRoutine() {
    const name = prompt('Routine name (e.g. "Push Day"):');
    if (!name) return;
    const r = { id: uid(), name: name.trim(), exercises: [] };
    state.routines.push(r);
    persist();
    renderRoutineTabs();
    loadAdminFields(r.id);
}

function deleteRoutine(routineId) {
    if (!confirm('Delete this routine?')) return;
    state.routines = state.routines.filter(r => r.id !== routineId);
    persist();
    if (state.editingRoutineId === routineId) {
        state.editingRoutineId = state.routines[0]?.id || null;
    }
    renderRoutineTabs();
    loadAdminFields(state.editingRoutineId);
}

function deleteAllData() {
    if (!confirm('⚠️ This will permanently erase all routines and streak history. Continue?')) return;
    localStorage.removeItem('wf_routines');
    localStorage.removeItem('wf_streak');
    location.reload();
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function openCalendar() {
    calViewDate = new Date();
    renderCalendar();
    ui.calOverlay.classList.remove('hidden');
}

function renderCalendar() {
    const y   = calViewDate.getFullYear();
    const m   = calViewDate.getMonth();
    const today = new Date();

    ui.calLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calViewDate);

    const firstDay   = new Date(y, m, 1).getDay();  // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    ui.calGrid.innerHTML = '';

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-cell empty';
        ui.calGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date    = new Date(y, m, d);
        const ds      = date.toDateString();
        const active  = state.streakHistory.includes(ds);
        const isToday = date.toDateString() === today.toDateString();
        const cell    = document.createElement('div');
        cell.className = `cal-cell${active ? ' active' : ''}${isToday && !active ? ' today' : ''}`;
        cell.textContent = d;
        ui.calGrid.appendChild(cell);
    }

    // Total streak count
    ui.totalStreak.textContent = state.streakHistory.length;
}

document.getElementById('cal-prev').addEventListener('click', () => {
    calViewDate.setMonth(calViewDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
    calViewDate.setMonth(calViewDate.getMonth() + 1);
    renderCalendar();
});

// ─── Streak ───────────────────────────────────────────────────────────────────
function saveStreak() {
    const today = new Date().toDateString();
    if (!state.streakHistory.includes(today)) {
        state.streakHistory.push(today);
        persist();
        ui.streakCount.textContent = state.streakHistory.length;
    }
}

// ─── Wire up buttons ──────────────────────────────────────────────────────────
ui.playBtn.addEventListener('click', startTimer);

document.getElementById('add-exercise').addEventListener('click', () => addEntry());
document.getElementById('add-routine-btn').addEventListener('click', addRoutine);
document.getElementById('save-routine').addEventListener('click', saveRoutine);
document.getElementById('close-admin').addEventListener('click', () => ui.adminOverlay.classList.add('hidden'));
document.getElementById('delete-all-data').addEventListener('click', deleteAllData);
document.getElementById('close-calendar').addEventListener('click', () => ui.calOverlay.classList.add('hidden'));

// Close overlays on backdrop click
[ui.adminOverlay, ui.calOverlay].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
ui.streakCount.textContent = state.streakHistory.length;
loadExercise(0);
