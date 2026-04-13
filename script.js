:root {
    --orange: #FF6600;
    --gray: #e0e0e0;
    --timer-blue: linear-gradient(#5082ff, #3255ff);
    --timer-peach: linear-gradient(#ff9a8b, #ff6a88);
}

* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
body { background: #fff; height: 100vh; overflow: hidden; }

.app-container { display: flex; flex-direction: column; height: 100%; padding: 40px 25px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.today-title { font-size: 1.8rem; font-weight: 900; cursor: pointer; text-transform: uppercase; }

.content-area { flex-grow: 1; display: flex; align-items: center; justify-content: center; position: relative; }
.exercise-image { width: 100%; max-width: 400px; height: 250px; background: #f7f7f7; border-radius: 20px; background-size: cover; background-position: center; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.exercise-name { font-size: 1.4rem; font-weight: 700; text-align: center; }

/* Breathing Ring */
.breathing-ring-container { position: relative; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; }
.breathing-ring { position: absolute; width: 100%; height: 100%; border: 12px solid var(--orange); border-radius: 50%; animation: pulse 4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(0.8); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 40px var(--orange); } }
.breathing-text { font-weight: 900; color: var(--orange); font-size: 1.4rem; }

/* Control Bar */
.control-bar { display: flex; align-items: center; justify-content: space-between; padding-top: 20px; position: relative; }
.progress-container { position: absolute; top: -10px; width: 100%; height: 6px; background: var(--gray); border-radius: 10px; overflow: hidden; }
.progress-bar { height: 100%; width: 0%; background: var(--orange); transition: width 0.2s linear; }

/* Timer Display */
.timer-display { font-size: 4rem; font-weight: 900; display: flex; cursor: pointer; user-select: none; }
.timer-min { background: var(--timer-blue); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.timer-sec { background: var(--timer-peach); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.colon { color: #ccc; padding: 0 5px; }

/* Bar Mode Logic */
.bar-mode-active .timer-display span { display: none; }
.bar-mode-active .progress-container { height: 45px; top: -45px; }

.play-pause-btn { width: 65px; height: 65px; border-radius: 50%; border: none; background: var(--orange); color: #fff; font-size: 1.8rem; cursor: pointer; }

/* Admin & Calendar Modals */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(5px); }
.modal { background: #fff; padding: 30px; border-radius: 25px; width: 92%; max-width: 450px; position: relative; }
.admin-scroll-area { max-height: 50vh; overflow-y: auto; margin: 20px 0; padding-right: 10px; }
.hidden { display: none !important; }

.admin-exercise-entry { background: #fcfcfc; border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 15px; }
.admin-exercise-entry input { width: 100%; margin-top: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; }

.btn-add { width: 100%; padding: 12px; background: #f0f0f0; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
.btn-primary { padding: 12px 25px; background: var(--orange); color: #fff; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }
.btn-close { padding: 12px 25px; background: #eee; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }

/* Calendar Streak */
.calendar-wrapper { position: relative; padding: 30px 0; }
.streak-line { position: absolute; top: 50%; left: 0; right: 0; height: 3px; background: #f0f0f0; z-index: 1; transform: translateY(-50%); }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; position: relative; z-index: 2; }
.day-cell { display: flex; flex-direction: column; align-items: center; }
.flame-box { width: 40px; height: 40px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #999; font-weight: bold; transition: 0.3s; }
.flame-active { background: var(--orange); color: #fff; border-radius: 50% 50% 10% 50%; transform: rotate(-45deg); box-shadow: 0 5px 15px rgba(255,102,0,0.3); }
.flame-active span { transform: rotate(45deg); }
.close-icon { position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; }
