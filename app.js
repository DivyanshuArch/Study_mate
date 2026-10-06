/* ==========================================================================
   VERTOXSTUDY APPLICATION LOGIC - SPA STATE, ROUTING & CORE MODULES
   ========================================================================== */

// Helper: Get formatted date string YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get Day Name abbreviation (Mon, Tue, etc.)
function getLocalDayAbbreviation(date = new Date()) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

const DEFAULT_STATE = {
  // Timer configurations and active status
  timer: {
    mode: 'pomodoro', // pomodoro, shortBreak, longBreak
    status: 'idle', // idle, running, paused
    timeRemaining: 1500, // in seconds
    activeSubject: 'General',
    settings: {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
      autoStart: false,
      ytApiKey: 'AIzaSyA9e_dA_HHXAQeFQ9DdN4XYmCRErtcFNLU'
    }
  },
  
  // Weekly routine items
  routines: [
    { id: 'r1', name: 'Morning Deep Focus Block', startTime: '09:00', endTime: '11:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], category: 'study' },
    { id: 'r2', name: 'Active Review & Notes consolidation', startTime: '15:00', endTime: '16:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], category: 'study' },
    { id: 'r3', name: 'Leisure Walk / Stretch Break', startTime: '11:30', endTime: '11:45', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], category: 'break' },
    { id: 'r4', name: 'Evening Coding Practice', startTime: '20:00', endTime: '21:30', days: ['Mon', 'Wed', 'Fri'], category: 'study' }
  ],
  
  // Routine completion track per date: { "YYYY-MM-DD": { "routineId": true/false } }
  routineAdherence: {},

  // Projects list
  projects: [
    {
      id: 'p1',
      title: 'Academic Term Research Paper',
      desc: 'Investigate the cognitive impact of spaced repetition models on adolescent language acquisition.',
      deadline: getLocalDateString(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
      priority: 'high',
      tasks: [
        { id: 't1', name: 'Compile academic reference bibliography', completed: true },
        { id: 't2', name: 'Draft structural introduction & hypothesis', completed: true },
        { id: 't3', name: 'Execute Socratic problem analysis on study metrics', completed: false },
        { id: 't4', name: 'Complete primary methodology write-up', completed: false },
        { id: 't5', name: 'Edit and finalize proofing drafts', completed: false }
      ]
    }
  ],



  // Finished focus session history: [{ date: "YYYY-MM-DD", duration: 1500, subject: "Coding", mode: "pomodoro" }]
  history: [],
  gatheredImages: [],
  pinnedBooks: [],
  customResources: []
};

// Seed default history if empty to populate charts immediately
const seedHistory = [
  { date: getLocalDateString(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), duration: 2700, subject: 'Math', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)), duration: 1500, subject: 'Coding', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)), duration: 1500, subject: 'Writing', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), duration: 3000, subject: 'Science', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), duration: 4500, subject: 'Coding', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), duration: 3000, subject: 'Coding', mode: 'pomodoro' },
  { date: getLocalDateString(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), duration: 1500, subject: 'General', mode: 'pomodoro' },
  { date: getLocalDateString(), duration: 1500, subject: 'Coding', mode: 'pomodoro' } // Today initial
];

class VertoxStudyApp {
  constructor() {
    this.state = null;
    this.timerInterval = null;
    this.currentView = 'dashboard';
    this.selectedRoutineDay = getLocalDayAbbreviation();
    this.activeProblemId = null;
  }

  /* ==========================================================================
     INIT & STATE SYNC
     ========================================================================== */
  init() {
    this.loadState();
    
    // Auto-seed history if new user
    if (this.state.history.length === 0) {
      this.state.history = [...seedHistory];
      this.saveState();
    }
    
    // Match timer durations to settings on load
    this.resetTimerDurations();

    this.registerViewRouting();
    this.registerTimerControls();
    this.registerRoutineControls();
    this.registerProjectControls();
    this.registerWikiControls();
    this.registerLibraryControls();
    this.registerResourcesControls();
    this.registerGeneralControls();
    
    // Start global clock widget
    this.startGlobalClock();
    
    // Asynchronously load YouTube Iframe Player API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    // Initial Render
    this.switchView('dashboard');
    lucide.createIcons();
  }

  loadState() {
    const raw = localStorage.getItem('vertoxstudy_state');
    if (raw) {
      try {
        this.state = JSON.parse(raw);
        if (!this.state.gatheredImages) {
          this.state.gatheredImages = [];
        }
        if (!this.state.pinnedBooks) {
          this.state.pinnedBooks = [];
        }
        if (!this.state.timer.settings.ytApiKey) {
          this.state.timer.settings.ytApiKey = 'AIzaSyA9e_dA_HHXAQeFQ9DdN4XYmCRErtcFNLU';
        }
        if (!this.state.customResources) {
          this.state.customResources = [];
        }
      } catch (e) {
        console.error("Failed to parse local storage state. Resetting to defaults.", e);
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    } else {
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  saveState() {
    localStorage.setItem('vertoxstudy_state', JSON.stringify(this.state));
  }

  /* ==========================================================================
     SPA ROUTER & WIDGETS
     ========================================================================== */
  registerViewRouting() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Floating Timer widget maximize btn
    document.getElementById('floating-maximize').addEventListener('click', () => {
      this.switchView('timer');
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    
    // Hide all view sections
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });
    
    // Show active view
    const activeViewElement = document.getElementById(`view-${viewName}`);
    if (activeViewElement) {
      activeViewElement.classList.remove('hidden');
    }

    // Toggle active classes on nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Header Text
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    
    const headers = {
      dashboard: { title: "Study Dashboard", subtitle: "Analyze your progress, review routine items, and track projects." },
      timer: { title: "Study Timer", subtitle: "Stay focused with Pomodoro and customized break blocks." },
      routine: { title: "Routine & Schedule", subtitle: "Design templates for recurring activities and lock down habits." },
      projects: { title: "Project Manager", subtitle: "Break massive projects into smaller subtasks with progress tracking." },
      wiki: { title: "Wiki Research", subtitle: "Search Wikipedia for concept breakdowns, word definitions, and detailed drawings." },
      library: { title: "Gutenberg Book Library", subtitle: "Search and browse over 70,000 free Project Gutenberg eBooks." },
      resources: { title: "Study Hub & Resources", subtitle: "Access curated online courses, interactive science labs, and manage bookmarks." }
    };

    if (headers[viewName]) {
      titleEl.textContent = headers[viewName].title;
      subtitleEl.textContent = headers[viewName].subtitle;
    }

    // Floating Timer display configuration
    const isTimerRunning = this.state.timer.status === 'running';
    const floatingWidget = document.getElementById('floating-timer-widget');
    if (viewName !== 'timer' && isTimerRunning) {
      floatingWidget.classList.remove('hidden');
    } else {
      floatingWidget.classList.add('hidden');
    }

    // Invoke module-specific render functions
    this.renderView(viewName);
    lucide.createIcons();
  }

  renderView(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'timer':
        this.renderTimer();
        break;
      case 'routine':
        this.renderRoutine();
        break;
      case 'projects':
        this.renderProjects();
        break;
      case 'wiki':
        this.renderGatheredBoard();
        break;
      case 'library':
        this.renderLibrary();
        break;
      case 'resources':
        this.renderResources();
        break;
    }
  }

  startGlobalClock() {
    const timeEl = document.getElementById('widget-time');
    const dateEl = document.getElementById('widget-date');

    const updateClock = () => {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
      
      // Update Dashboard Routine Day Heading if it shifts
      const routineDayHeader = document.getElementById('dashboard-routine-date');
      if (routineDayHeader && this.currentView === 'dashboard') {
        routineDayHeader.textContent = now.toLocaleDateString([], { month: 'long', day: 'numeric' });
      }
    };
    
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ==========================================================================
     TIMER MODULE
     ========================================================================== */
  resetTimerDurations() {
    const timer = this.state.timer;
    const settings = timer.settings;
    if (timer.status === 'idle') {
      if (timer.mode === 'pomodoro') timer.timeRemaining = settings.pomodoro * 60;
      else if (timer.mode === 'shortBreak') timer.timeRemaining = settings.shortBreak * 60;
      else if (timer.mode === 'longBreak') timer.timeRemaining = settings.longBreak * 60;
    }
  }

  registerTimerControls() {
    // Mode switcher buttons
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.state.timer.status === 'running') {
          if (!confirm("A study session is currently running. Switch modes and discard progress?")) {
            return;
          }
        }
        this.stopTimerInterval();
        this.state.timer.status = 'idle';
        this.state.timer.mode = btn.dataset.mode;
        
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.resetTimerDurations();
        this.renderTimer();
        this.saveState();
      });
    });

    // Subject selection change
    document.getElementById('timer-subject-select').addEventListener('change', (e) => {
      this.state.timer.activeSubject = e.target.value;
      this.saveState();
    });

    // Start/Pause Button (Main Page)
    document.getElementById('timer-toggle').addEventListener('click', () => this.toggleTimer());
    // Start/Pause Button (Floating Widget)
    document.getElementById('floating-toggle').addEventListener('click', () => this.toggleTimer());

    // Reset Button
    document.getElementById('timer-reset').addEventListener('click', () => {
      if (confirm("Reset the current timer?")) {
        this.stopTimerInterval();
        this.state.timer.status = 'idle';
        this.resetTimerDurations();
        this.renderTimer();
        this.saveState();
      }
    });

    // Skip Button
    document.getElementById('timer-skip').addEventListener('click', () => {
      if (confirm("Skip the remaining duration of this block?")) {
        this.stopTimerInterval();
        this.state.timer.status = 'idle';
        this.onTimerComplete(true); // Treat as completed or skipped
      }
    });

    // Quick Timer toggle in Header
    document.getElementById('btn-toggle-timer-widget').addEventListener('click', () => {
      this.toggleTimer();
    });
  }

  toggleTimer() {
    const timer = this.state.timer;
    
    // Web Audio permission activation on user interaction
    this.primeAudioSynth();

    if (timer.status === 'running') {
      // Pause
      this.stopTimerInterval();
      timer.status = 'paused';
    } else {
      // Play
      timer.status = 'running';
      this.startTimerInterval();
    }
    this.renderTimer();
    this.saveState();
  }

  startTimerInterval() {
    this.timerInterval = setInterval(() => {
      const timer = this.state.state ? this.state.state.timer : this.state.timer;
      if (timer.timeRemaining > 0) {
        timer.timeRemaining--;
        this.renderTimerDigitsOnly();
        
        // Save state occasionally (every 10 seconds)
        if (timer.timeRemaining % 10 === 0) {
          this.saveState();
        }
      } else {
        this.stopTimerInterval();
        timer.status = 'idle';
        this.onTimerComplete(false);
      }
    }, 1000);
  }

  stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onTimerComplete(skipped = false) {
    const timer = this.state.timer;
    const isPomodoro = timer.mode === 'pomodoro';
    
    // Play chime sound
    if (!skipped) {
      this.playAlarmChime();
    }

    if (isPomodoro && !skipped) {
      // Log session in history
      const duration = timer.settings.pomodoro * 60; // elapsed
      this.state.history.unshift({
        date: getLocalDateString(),
        duration: duration,
        subject: timer.activeSubject,
        mode: 'pomodoro'
      });
      this.saveState();
      
      alert(`Great focus session completed! You logged ${timer.settings.pomodoro} minutes of ${timer.activeSubject}.`);
    } else if (!isPomodoro && !skipped) {
      alert("Break complete! Ready to start focusing again?");
    }

    // Switch mode automatically
    if (isPomodoro) {
      timer.mode = 'shortBreak';
    } else {
      timer.mode = 'pomodoro';
    }

    // Update buttons rendering active mode
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      if (btn.dataset.mode === timer.mode) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.resetTimerDurations();
    
    if (timer.settings.autoStart) {
      timer.status = 'running';
      this.startTimerInterval();
    } else {
      timer.status = 'idle';
    }
    
    this.renderTimer();
    this.saveState();
  }

  renderTimerDigitsOnly() {
    const timer = this.state.timer;
    const mins = Math.floor(timer.timeRemaining / 60);
    const secs = timer.timeRemaining % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Main Display digits
    const mainDisplay = document.getElementById('timer-time-display');
    if (mainDisplay) mainDisplay.textContent = timeStr;
    
    // Sidebar active badge
    const sidebarBadge = document.getElementById('sidebar-timer-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = timeStr;
      if (timer.status === 'running') sidebarBadge.classList.remove('hidden');
      else sidebarBadge.classList.add('hidden');
    }

    // Floating widget digits
    const floatTime = document.getElementById('floating-time');
    if (floatTime) floatTime.textContent = timeStr;

    // Document Title Update
    const modeLabel = timer.mode === 'pomodoro' ? 'Focus' : 'Break';
    document.title = timer.status === 'running' ? `(${timeStr}) ${modeLabel} | VertoxStudy` : 'VertoxStudy | Elevate Your Learning';

    // SVG Ring progress offset update
    const ring = document.getElementById('timer-progress-ring');
    if (ring) {
      let maxDuration = timer.settings[timer.mode] * 60;
      let ratio = timer.timeRemaining / maxDuration;
      let offset = 628.3 * (1 - ratio);
      ring.style.strokeDashoffset = offset;
    }
  }

  renderTimer() {
    const timer = this.state.timer;
    this.renderTimerDigitsOnly();

    // Mode labels
    const statusLabels = {
      pomodoro: 'Focus Session',
      shortBreak: 'Short Break',
      longBreak: 'Long Break'
    };
    
    const statusEl = document.getElementById('timer-status-display');
    if (statusEl) statusEl.textContent = statusLabels[timer.mode];
    
    const floatMode = document.getElementById('floating-mode');
    if (floatMode) floatMode.textContent = timer.mode === 'pomodoro' ? 'Focus' : 'Break';

    // Toggle button icons & text
    const toggleIcon = document.getElementById('timer-toggle-icon');
    const toggleText = document.getElementById('timer-toggle-text');
    const headerToggleIcon = document.querySelector('#btn-toggle-timer-widget i');
    const floatToggleIcon = document.querySelector('#floating-toggle i');

    const isRunning = timer.status === 'running';

    if (toggleIcon) {
      toggleIcon.setAttribute('data-lucide', isRunning ? 'pause' : 'play');
      toggleText.textContent = isRunning ? 'Pause Timer' : timer.mode === 'pomodoro' ? 'Start Focus' : 'Start Break';
    }

    if (headerToggleIcon) {
      headerToggleIcon.setAttribute('data-lucide', isRunning ? 'pause' : 'play');
    }

    if (floatToggleIcon) {
      floatToggleIcon.setAttribute('data-lucide', isRunning ? 'pause' : 'play');
    }

    // Show/hide floating widget
    const floatingWidget = document.getElementById('floating-timer-widget');
    if (floatingWidget) {
      if (this.currentView !== 'timer' && isRunning) {
        floatingWidget.classList.remove('hidden');
      } else {
        floatingWidget.classList.add('hidden');
      }
    }

    // Set Subject Value dropdown
    const subSelect = document.getElementById('timer-subject-select');
    if (subSelect) subSelect.value = timer.activeSubject;

    lucide.createIcons();
  }

  // Synthesized Web Audio API alarms
  primeAudioSynth() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playAlarmChime() {
    this.primeAudioSynth();
    const ctx = this.audioCtx;
    
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Gentle volume envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Arpeggio chime C5 -> E5 -> G5
    playNote(523.25, now, 0.8);
    playNote(659.25, now + 0.15, 0.8);
    playNote(783.99, now + 0.3, 1.2);
  }

  /* ==========================================================================
     ROUTINE PLANNER MODULE
     ========================================================================== */
  registerRoutineControls() {
    // Day Selection Strip Click
    const dayBtns = document.querySelectorAll('.day-tab-btn');
    dayBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dayBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRoutineDay = btn.dataset.day;
        this.renderRoutine();
      });
    });

    // Open Modal Add Event
    const dialog = document.getElementById('dialog-add-routine');
    document.getElementById('btn-add-routine').addEventListener('click', () => {
      dialog.showModal();
    });

    // Close Modals
    document.getElementById('btn-close-routine-dialog').addEventListener('click', () => dialog.close());
    document.getElementById('btn-cancel-routine-dialog').addEventListener('click', () => dialog.close());

    // Handle Form Submit
    document.getElementById('form-add-routine').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('routine-name').value;
      const startTime = document.getElementById('routine-start-time').value;
      const endTime = document.getElementById('routine-end-time').value;
      const category = document.getElementById('routine-category').value;
      
      // Selected days list
      const checkedDays = Array.from(document.querySelectorAll('input[name="routine-days"]:checked')).map(el => el.value);
      
      if (checkedDays.length === 0) {
        alert("Please select at least one active day for this routine.");
        return;
      }

      this.state.routines.push({
        id: 'r_' + Date.now(),
        name,
        startTime,
        endTime,
        days: checkedDays,
        category
      });

      this.saveState();
      dialog.close();
      document.getElementById('form-add-routine').reset();
      this.renderRoutine();
    });
  }

  toggleRoutineAdherence(routineId, isChecked) {
    const todayStr = getLocalDateString();
    if (!this.state.routineAdherence[todayStr]) {
      this.state.routineAdherence[todayStr] = {};
    }
    
    this.state.routineAdherence[todayStr][routineId] = isChecked;
    this.saveState();
    
    this.renderRoutineTrackerOnly();
  }

  deleteRoutine(routineId) {
    if (confirm("Delete this routine item permanently?")) {
      this.state.routines = this.state.routines.filter(r => r.id !== routineId);
      // Clean up adherence tracking keys if necessary
      const todayStr = getLocalDateString();
      if (this.state.routineAdherence[todayStr]) {
        delete this.state.routineAdherence[todayStr][routineId];
      }
      this.saveState();
      this.renderRoutine();
    }
  }

  renderRoutine() {
    // 1. Render routine list filtered by active day tab
    const routineListEl = document.getElementById('routine-list');
    routineListEl.innerHTML = '';
    
    // Sort routines chronologically by starting hours
    const dayRoutines = this.state.routines
      .filter(r => r.days.includes(this.selectedRoutineDay))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (dayRoutines.length === 0) {
      routineListEl.innerHTML = `
        <div class="empty-state">
          <i data-lucide="calendar"></i>
          <p>No events scheduled for ${this.selectedRoutineDay}.</p>
        </div>
      `;
    } else {
      dayRoutines.forEach(r => {
        const item = document.createElement('div');
        item.className = 'routine-item';
        item.innerHTML = `
          <div class="routine-item-info">
            <span class="routine-item-name">${r.name}</span>
            <span class="routine-item-time">
              <i data-lucide="clock"></i>
              ${r.startTime} - ${r.endTime}
            </span>
            <div><span class="category-badge ${r.category}">${r.category}</span></div>
          </div>
          <button class="btn-delete-item" data-id="${r.id}" title="Remove event">
            <i data-lucide="trash-2"></i>
          </button>
        `;
        
        // Add delete listener
        item.querySelector('.btn-delete-item').addEventListener('click', () => {
          this.deleteRoutine(r.id);
        });

        routineListEl.appendChild(item);
      });
    }

    // 2. Render routine check-in daily progress list
    this.renderRoutineTrackerOnly();
    lucide.createIcons();
  }

  renderRoutineTrackerOnly() {
    const todayAbbrev = getLocalDayAbbreviation();
    const todayStr = getLocalDateString();
    
    const todaysRoutines = this.state.routines
      .filter(r => r.days.includes(todayAbbrev))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const trackerListEl = document.getElementById('routine-tracker-list');
    const progressBar = document.getElementById('routine-progress-bar');
    const progressPercentText = document.getElementById('routine-progress-percentage');
    
    trackerListEl.innerHTML = '';

    if (todaysRoutines.length === 0) {
      trackerListEl.innerHTML = `
        <div class="empty-state">
          <i data-lucide="smile"></i>
          <p>You have a free schedule today. No routines tracked!</p>
        </div>
      `;
      progressBar.style.width = '100%';
      progressPercentText.textContent = '100%';
      return;
    }

    let completedCount = 0;
    const adherence = this.state.routineAdherence[todayStr] || {};

    todaysRoutines.forEach(r => {
      const isCompleted = !!adherence[r.id];
      if (isCompleted) completedCount++;

      const item = document.createElement('div');
      item.className = `tracker-checklist-item ${isCompleted ? 'completed' : ''}`;
      item.innerHTML = `
        <div class="tracker-checklist-left">
          <input type="checkbox" id="chk-${r.id}" ${isCompleted ? 'checked' : ''}>
          <div>
            <div class="tracker-name" style="font-weight:600; font-size:0.95rem;">${r.name}</div>
            <div class="text-muted" style="font-size:0.8rem; margin-top:2px;">${r.startTime} - ${r.endTime}</div>
          </div>
        </div>
        <span class="category-badge ${r.category}">${r.category}</span>
      `;

      // Checkbox click listener
      item.querySelector('input').addEventListener('change', (e) => {
        this.toggleRoutineAdherence(r.id, e.target.checked);
      });

      trackerListEl.appendChild(item);
    });

    const completionRate = Math.round((completedCount / todaysRoutines.length) * 100);
    progressBar.style.width = `${completionRate}%`;
    progressPercentText.textContent = `${completionRate}%`;
  }

  /* ==========================================================================
     PROJECTS MODULE
     ========================================================================== */
  registerProjectControls() {
    const dialog = document.getElementById('dialog-add-project');
    
    // Open Dialog
    document.getElementById('btn-create-project').addEventListener('click', () => {
      dialog.showModal();
    });

    // Close Dialog
    document.getElementById('btn-close-project-dialog').addEventListener('click', () => dialog.close());
    document.getElementById('btn-cancel-project-dialog').addEventListener('click', () => dialog.close());

    // Form submit
    document.getElementById('form-add-project').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const title = document.getElementById('project-title').value;
      const desc = document.getElementById('project-desc').value;
      const deadline = document.getElementById('project-deadline').value;
      const priority = document.getElementById('project-priority').value;

      this.state.projects.push({
        id: 'p_' + Date.now(),
        title,
        desc,
        deadline,
        priority,
        tasks: []
      });

      this.saveState();
      dialog.close();
      document.getElementById('form-add-project').reset();
      this.renderProjects();
    });

    // Search and filter triggers
    document.getElementById('project-search-input').addEventListener('input', () => this.renderProjects());
    document.getElementById('project-priority-filter').addEventListener('change', () => this.renderProjects());
  }

  toggleProjectSubtask(projId, taskId, isChecked) {
    const project = this.state.projects.find(p => p.id === projId);
    if (project) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = isChecked;
        this.saveState();
        this.renderProjects();
      }
    }
  }

  addProjectSubtask(projId, taskText) {
    if (!taskText.trim()) return;
    
    const project = this.state.projects.find(p => p.id === projId);
    if (project) {
      project.tasks.push({
        id: 't_' + Date.now(),
        name: taskText,
        completed: false
      });
      this.saveState();
      this.renderProjects();
    }
  }

  deleteProjectSubtask(projId, taskId) {
    const project = this.state.projects.find(p => p.id === projId);
    if (project) {
      project.tasks = project.tasks.filter(t => t.id !== taskId);
      this.saveState();
      this.renderProjects();
    }
  }

  deleteProject(projId) {
    if (confirm("Delete this project and all its subtasks permanently?")) {
      this.state.projects = this.state.projects.filter(p => p.id !== projId);
      this.saveState();
      this.renderProjects();
    }
  }

  renderProjects() {
    const gridEl = document.getElementById('projects-grid');
    const searchVal = document.getElementById('project-search-input').value.toLowerCase();
    const priorityVal = document.getElementById('project-priority-filter').value;

    gridEl.innerHTML = '';

    // Filter project list
    const filteredProjects = this.state.projects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchVal) || p.desc.toLowerCase().includes(searchVal);
      const matchesPriority = priorityVal === 'all' || p.priority === priorityVal;
      return matchesSearch && matchesPriority;
    });

    if (filteredProjects.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-state col-span-2">
          <i data-lucide="folder-search"></i>
          <p>No projects match your current filters.</p>
        </div>
      `;
      return;
    }

    filteredProjects.forEach(p => {
      // Calculate progress rate
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter(t => t.completed).length;
      const progressRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'project-card glass-panel';
      
      // Build Subtask HTML
      let tasksListHtml = '';
      if (p.tasks.length === 0) {
        tasksListHtml = `<p class="text-muted" style="font-size:0.8rem; margin:10px 0;">No tasks added yet.</p>`;
      } else {
        p.tasks.forEach(t => {
          tasksListHtml += `
            <div class="checklist-item ${t.completed ? 'completed' : ''}">
              <input type="checkbox" data-proj-id="${p.id}" data-task-id="${t.id}" ${t.completed ? 'checked' : ''}>
              <span style="flex:1;">${t.name}</span>
              <button class="btn-delete-item delete-subtask-btn" data-proj-id="${p.id}" data-task-id="${t.id}" title="Delete subtask" style="padding: 2px;">
                <i data-lucide="x" style="width:12px; height:12px;"></i>
              </button>
            </div>
          `;
        });
      }

      card.innerHTML = `
        <div class="project-card-header">
          <div>
            <h3>${p.title}</h3>
            <span class="priority-badge ${p.priority}">${p.priority} Priority</span>
          </div>
          <button class="btn-delete-item delete-project-btn" data-id="${p.id}" title="Delete Project">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        
        <p class="project-card-desc">${p.desc || 'No description provided.'}</p>
        
        <div class="project-card-meta">
          <span><i data-lucide="calendar"></i> Due: ${p.deadline}</span>
          <span>${completedTasks}/${totalTasks} Tasks</span>
        </div>

        <div class="project-card-tasks">
          <h4>Tasks & Milestones <span>${progressRate}%</span></h4>
          <div class="proj-progress-track" style="margin: 4px 0 10px 0;">
            <div class="proj-progress-fill" style="width: ${progressRate}%;"></div>
          </div>
          <div class="project-tasks-list scrollable">
            ${tasksListHtml}
          </div>
          
          <div class="project-task-input-row">
            <input type="text" placeholder="Add milestone..." class="new-subtask-input">
            <button class="btn btn-sm btn-primary add-subtask-btn" data-proj-id="${p.id}">Add</button>
          </div>
        </div>
      `;

      // Event Listeners for checkboxes
      card.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', (e) => {
          this.toggleProjectSubtask(chk.dataset.projId, chk.dataset.taskId, e.target.checked);
        });
      });

      // Add subtask listener
      const subtaskValInput = card.querySelector('.new-subtask-input');
      card.querySelector('.add-subtask-btn').addEventListener('click', () => {
        this.addProjectSubtask(p.id, subtaskValInput.value);
      });
      subtaskValInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addProjectSubtask(p.id, subtaskValInput.value);
        }
      });

      // Delete subtask listener
      card.querySelectorAll('.delete-subtask-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.deleteProjectSubtask(btn.dataset.projId, btn.dataset.taskId);
        });
      });

      // Delete project listener
      card.querySelector('.delete-project-btn').addEventListener('click', () => {
        this.deleteProject(p.id);
      });

      gridEl.appendChild(card);
    });

    lucide.createIcons();
  }

  
  
  /* ==========================================================================
     DASHBOARD MODULE & CHARTS RENDER
     ========================================================================== */
  renderDashboard() {
    const todayStr = getLocalDateString();
    const todayAbbrev = getLocalDayAbbreviation();

    // 1. Calculate KPI Metrics
    // KPI Study Time Today (in minutes)
    const todayHistory = this.state.history.filter(h => h.date === todayStr);
    const totalTodaySeconds = todayHistory.reduce((sum, item) => sum + item.duration, 0);
    const totalTodayMins = Math.round(totalTodaySeconds / 60);
    document.getElementById('kpi-study-time').textContent = `${totalTodayMins}m`;

    // KPI Routine Adherence Rate Today
    const todaysRoutines = this.state.routines.filter(r => r.days.includes(todayAbbrev));
    if (todaysRoutines.length === 0) {
      document.getElementById('kpi-routine-rate').textContent = '100%';
    } else {
      const adherence = this.state.routineAdherence[todayStr] || {};
      const completedCount = todaysRoutines.filter(r => adherence[r.id]).length;
      const rate = Math.round((completedCount / todaysRoutines.length) * 100);
      document.getElementById('kpi-routine-rate').textContent = `${rate}%`;
    }

    // KPI Projects Milestones Progress (completed subtasks/total subtasks across all projects)
    let totalProjTasks = 0;
    let completedProjTasks = 0;
    this.state.projects.forEach(p => {
      totalProjTasks += p.tasks.length;
      completedProjTasks += p.tasks.filter(t => t.completed).length;
    });
    document.getElementById('kpi-project-milestones').textContent = `${completedProjTasks}/${totalProjTasks}`;

    // KPI Pinned eBooks
    document.getElementById('kpi-books-pinned').textContent = this.state.pinnedBooks.length;

    // 2. Render SVG Weekly Study Time Bar Chart
    this.renderWeeklyChart();

    // 3. Render Today's Schedule Checklist
    const dashboardRoutineList = document.getElementById('dashboard-routine-list');
    dashboardRoutineList.innerHTML = '';
    
    if (todaysRoutines.length === 0) {
      dashboardRoutineList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="smile"></i>
          <p>No routine scheduled for today.</p>
          <button class="btn btn-sm btn-secondary" onclick="app.switchView('routine')">Planner</button>
        </div>
      `;
    } else {
      const adherence = this.state.routineAdherence[todayStr] || {};
      todaysRoutines.forEach(r => {
        const isCompleted = !!adherence[r.id];
        const item = document.createElement('div');
        item.className = `checklist-item ${isCompleted ? 'completed' : ''}`;
        item.innerHTML = `
          <input type="checkbox" id="dash-chk-${r.id}" ${isCompleted ? 'checked' : ''}>
          <span style="flex:1;">${r.name}</span>
          <span class="text-muted" style="font-size:0.75rem;">${r.startTime}</span>
        `;
        
        // Listeners for routine checkboxes from dashboard
        item.querySelector('input').addEventListener('change', (e) => {
          this.toggleRoutineAdherence(r.id, e.target.checked);
          this.renderDashboard(); // Refresh metrics on changes
        });

        dashboardRoutineList.appendChild(item);
      });
    }

    // 4. Render Active Project Standings list
    const dashboardProjList = document.getElementById('dashboard-project-list');
    dashboardProjList.innerHTML = '';

    if (this.state.projects.length === 0) {
      dashboardProjList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="folder-plus"></i>
          <p>No active projects found.</p>
          <button class="btn btn-sm btn-secondary" onclick="app.switchView('projects')">Create</button>
        </div>
      `;
    } else {
      this.state.projects.forEach(p => {
        const total = p.tasks.length;
        const completed = p.tasks.filter(t => t.completed).length;
        const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const item = document.createElement('div');
        item.className = 'dashboard-proj-item';
        item.innerHTML = `
          <div class="proj-header">
            <span style="color:#fff;">${p.title}</span>
            <span style="font-size:0.8rem; font-weight:700;">${progressRate}%</span>
          </div>
          <div class="proj-progress-track">
            <div class="proj-progress-fill" style="width: ${progressRate}%;"></div>
          </div>
        `;
        dashboardProjList.appendChild(item);
      });
    }

    // 5. Render Recent Activities list (Last 5 log entries)
    const dashboardHistList = document.getElementById('dashboard-history-list');
    dashboardHistList.innerHTML = '';

    const recentLogs = this.state.history.slice(0, 5);

    if (recentLogs.length === 0) {
      dashboardHistList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="hourglass"></i>
          <p>Study timer history is empty.</p>
        </div>
      `;
    } else {
      recentLogs.forEach(h => {
        const durMins = Math.round(h.duration / 60);
        const item = document.createElement('div');
        item.className = 'history-item';
        
        let subjectColorClass = 'study'; // default
        if (h.subject === 'Math') subjectColorClass = 'study';
        else if (h.subject === 'Coding') subjectColorClass = 'hobby';
        else if (h.subject === 'Science') subjectColorClass = 'break';
        else if (h.subject === 'Writing') subjectColorClass = 'chore';

        item.innerHTML = `
          <div class="history-item-left">
            <span class="history-subject-tag ${subjectColorClass}">${h.subject}</span>
            <span style="color:#fff; font-weight:500;">Focus Block</span>
          </div>
          <div class="text-muted" style="display:flex; flex-direction:column; align-items:flex-end;">
            <span>${durMins} mins</span>
            <span style="font-size:0.7rem; margin-top:2px;">${h.date}</span>
          </div>
        `;
        dashboardHistList.appendChild(item);
      });
    }

    lucide.createIcons();
  }

  renderWeeklyChart() {
    const svg = document.getElementById('weekly-study-chart');
    if (!svg) return;
    
    // Clear old elements
    svg.innerHTML = '';

    // Generate last 7 dates
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        dateStr: getLocalDateString(d),
        label: d.toLocaleDateString([], { weekday: 'short' })
      });
    }

    // Map study durations to dates
    const minutesData = dates.map(dt => {
      const dayLogs = this.state.history.filter(h => h.date === dt.dateStr);
      const totalSecs = dayLogs.reduce((sum, item) => sum + item.duration, 0);
      return Math.round(totalSecs / 60);
    });

    // Chart dimensions
    const width = 500;
    const height = 220;
    const padding = { top: 20, right: 20, bottom: 40, left: 45 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale calculation
    const maxVal = Math.max(...minutesData, 60); // min scale limit at 60 mins
    const roundedMax = Math.ceil(maxVal / 30) * 30; // round up to multiple of 30

    // Add Gradients Definitions
    svg.innerHTML += `
      <defs>
        <linearGradient id="bar-gradient-purple" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e65c00" stop-opacity="1" />
          <stop offset="100%" stop-color="#ffb703" stop-opacity="0.3" />
        </linearGradient>
      </defs>
    `;

    // Draw Gridlines and Y Axis labels
    const gridDivisions = 4;
    for (let i = 0; i <= gridDivisions; i++) {
      const val = Math.round((roundedMax / gridDivisions) * i);
      const y = padding.top + chartHeight - (val / roundedMax) * chartHeight;

      // Grid line
      svg.innerHTML += `<line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
      
      // Axis Label
      svg.innerHTML += `<text class="chart-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${val}m</text>`;
    }

    // Draw X Axis line
    const yAxisBase = padding.top + chartHeight;
    svg.innerHTML += `<line class="chart-axis-line" x1="${padding.left}" y1="${yAxisBase}" x2="${width - padding.right}" y2="${yAxisBase}"></line>`;

    // Draw Bars & Labels
    const numBars = dates.length;
    const totalBarArea = chartWidth / numBars;
    const barWidth = totalBarArea * 0.5;

    dates.forEach((dt, idx) => {
      const val = minutesData[idx];
      const barHeight = (val / roundedMax) * chartHeight;
      const x = padding.left + (idx * totalBarArea) + (totalBarArea - barWidth) / 2;
      const y = yAxisBase - barHeight;

      // Dynamic bar with tooltips/labels
      svg.innerHTML += `
        <g>
          <rect class="chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 3)}" rx="4"></rect>
          <!-- Value text atop bar (only if bar holds values) -->
          ${val > 0 ? `<text class="chart-label" x="${x + barWidth/2}" y="${y - 6}" text-anchor="middle" font-weight="600" fill="#fff">${val}</text>` : ''}
          <!-- X Label -->
          <text class="chart-label" x="${x + barWidth/2}" y="${yAxisBase + 20}" text-anchor="middle">${dt.label}</text>
        </g>
      `;
    });
  }

  /* ==========================================================================
     GENERAL UTILITIES & MODAL SYSTEM
     ========================================================================== */
  registerGeneralControls() {
    // Clear History Button
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      if (confirm("Reset study timer session history? This will clear all charts.")) {
        this.state.history = [];
        this.saveState();
        this.renderDashboard();
      }
    });

    // Timer Settings Dialog controls
    const dialog = document.getElementById('dialog-timer-settings');
    
    // Open Dialog
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      document.getElementById('setting-pomodoro').value = this.state.timer.settings.pomodoro;
      document.getElementById('setting-short-break').value = this.state.timer.settings.shortBreak;
      document.getElementById('setting-long-break').value = this.state.timer.settings.longBreak;
      document.getElementById('setting-auto-start').checked = this.state.timer.settings.autoStart;
      document.getElementById('setting-yt-api-key').value = this.state.timer.settings.ytApiKey || '';
      dialog.showModal();
    });

    // Close Dialogs
    document.getElementById('btn-close-settings-dialog').addEventListener('click', () => dialog.close());
    document.getElementById('btn-cancel-settings-dialog').addEventListener('click', () => dialog.close());

    // Save timer settings Form
    document.getElementById('form-timer-settings').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const pomodoro = parseInt(document.getElementById('setting-pomodoro').value);
      const shortBreak = parseInt(document.getElementById('setting-short-break').value);
      const longBreak = parseInt(document.getElementById('setting-long-break').value);
      const autoStart = document.getElementById('setting-auto-start').checked;
      const ytApiKey = document.getElementById('setting-yt-api-key').value.trim();

      this.state.timer.settings = { pomodoro, shortBreak, longBreak, autoStart, ytApiKey };
      this.resetTimerDurations();
      this.saveState();
      
      dialog.close();
      this.renderTimer();
      alert("Settings updated successfully!");
    });
  }

  registerWikiControls() {
    const searchBtn = document.getElementById('btn-wiki-search');
    const searchInput = document.getElementById('wiki-search-input');
    const suggestions = document.getElementById('wiki-suggestions');
    const imageDialog = document.getElementById('dialog-wiki-image');

    // Sub-mode tabs routing
    const modeBtns = document.querySelectorAll('.res-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.mode;
        const wikiSection = document.getElementById('research-wiki-section');
        const imagesSection = document.getElementById('research-images-section');

        if (mode === 'wiki') {
          wikiSection.classList.remove('hidden');
          imagesSection.classList.add('hidden');
        } else {
          wikiSection.classList.add('hidden');
          imagesSection.classList.remove('hidden');
        }
      });
    });

    // Article Search elements
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        this.searchWikipedia(searchInput.value);
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchWikipedia(searchInput.value);
        }
      });
    }

    if (suggestions) {
      suggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-tag')) {
          const query = e.target.textContent;
          if (searchInput) searchInput.value = query;
          this.searchWikipedia(query);
        }
      });
    }

    // Image Search elements
    const imgSearchBtn = document.getElementById('btn-wiki-image-search');
    const imgSearchInput = document.getElementById('wiki-image-search-input');
    const imgSuggestions = document.getElementById('wiki-image-suggestions');

    if (imgSearchBtn && imgSearchInput) {
      imgSearchBtn.addEventListener('click', () => {
        this.searchCommonsImages(imgSearchInput.value);
      });

      imgSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchCommonsImages(imgSearchInput.value);
        }
      });
    }

    if (imgSuggestions) {
      imgSuggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-tag')) {
          const query = e.target.textContent;
          if (imgSearchInput) imgSearchInput.value = query;
          this.searchCommonsImages(query);
        }
      });
    }

    // Modal Image Viewer closing
    if (imageDialog) {
      document.getElementById('btn-close-image-dialog').addEventListener('click', () => {
        imageDialog.close();
      });
    }
  }

  async searchWikipedia(query) {
    query = query.trim();
    if (!query) {
      alert("Please enter a search topic first.");
      return;
    }

    const emptyState = document.getElementById('wiki-empty-state');
    const loading = document.getElementById('wiki-loading');
    const contentArea = document.getElementById('wiki-content-area');

    // Show loading
    if (emptyState) emptyState.classList.add('hidden');
    if (contentArea) contentArea.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');

    try {
      // Step 1: Use Wikipedia search endpoint to find the best title matches
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) throw new Error("Search request failed.");
      
      const searchData = await searchRes.json();
      
      if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
        this.renderWikiError("No results found", `Wikipedia has no direct matches for "${query}". Try refining your search (e.g. check spelling, or make it more general).`);
        return;
      }

      // Grab the most relevant title
      const bestTitle = searchData.query.search[0].title;

      // Step 2: Fetch the page summary from Wikipedia Page REST API
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
      const summaryRes = await fetch(summaryUrl);
      
      if (!summaryRes.ok) {
        this.renderWikiSearchFallback(bestTitle, searchData.query.search[0].snippet);
        return;
      }

      const summaryData = await summaryRes.json();
      this.renderWikiResult(summaryData);

    } catch (error) {
      console.error("Wikipedia fetch error:", error);
      this.renderWikiError("Connection error", "Unable to retrieve details from Wikipedia. Please verify your internet connection and try again.");
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  renderWikiResult(data) {
    const contentArea = document.getElementById('wiki-content-area');
    if (!contentArea) return;

    // Clear previous
    contentArea.innerHTML = '';
    contentArea.classList.remove('hidden');

    const title = data.title || "Wikipedia Article";
    const extract = data.extract_html || `<p>${data.extract || 'No text summary available.'}</p>`;
    const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    
    // Image details if present
    const hasImage = data.thumbnail && data.thumbnail.source;
    const thumbnailSrc = hasImage ? data.thumbnail.source : '';
    const fullImageSrc = (data.originalimage && data.originalimage.source) ? data.originalimage.source : thumbnailSrc;
    const descriptionText = data.description ? `<p class="wiki-image-caption">${data.description}</p>` : '';

    let imageColHtml = '';
    if (hasImage) {
      imageColHtml = `
        <div class="wiki-image-container">
          <div class="wiki-img-wrapper" id="wiki-article-img-click">
            <img src="${thumbnailSrc}" alt="${title}">
            <div class="wiki-img-overlay">
              <i data-lucide="zoom-in"></i>
            </div>
          </div>
          ${descriptionText}
        </div>
      `;
    }

    contentArea.innerHTML = `
      <div class="wiki-content-header">
        <h2>${title}</h2>
        <a href="${pageUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
          <i data-lucide="external-link"></i> Read full article
        </a>
      </div>
      <div class="wiki-content-body" style="${!hasImage ? 'grid-template-columns: 1fr;' : ''}">
        <div class="wiki-text-extract">
          ${extract}
        </div>
        ${imageColHtml}
      </div>
    `;

    lucide.createIcons();

    // Event listener for image click
    if (hasImage) {
      document.getElementById('wiki-article-img-click').addEventListener('click', () => {
        const dialog = document.getElementById('dialog-wiki-image');
        const img = document.getElementById('wiki-preview-img');
        const imgTitle = document.getElementById('wiki-image-title');
        
        if (dialog && img) {
          img.src = fullImageSrc;
          if (imgTitle) imgTitle.textContent = `${title} - Image Details`;
          dialog.showModal();
        }
      });
    }
  }

  renderWikiSearchFallback(title, snippet) {
    const contentArea = document.getElementById('wiki-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = '';
    contentArea.classList.remove('hidden');

    const cleanSnippet = snippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, '');
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

    contentArea.innerHTML = `
      <div class="wiki-content-header">
        <h2>${title}</h2>
        <a href="${pageUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
          <i data-lucide="external-link"></i> Open Wikipedia
        </a>
      </div>
      <div class="wiki-content-body" style="grid-template-columns: 1fr;">
        <div class="wiki-text-extract">
          <p>${cleanSnippet}...</p>
          <p class="text-muted" style="margin-top: 10px;">Detailed summary fetch failed, but you can read the article directly on Wikipedia by clicking the link above.</p>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  renderWikiError(title, message) {
    const contentArea = document.getElementById('wiki-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = '';
    contentArea.classList.remove('hidden');

    contentArea.innerHTML = `
      <div class="empty-state">
        <i data-lucide="alert-circle" style="width:48px; height:48px; color:var(--accent-rose);"></i>
        <h3>${title}</h3>
        <p class="text-muted" style="max-width: 420px; margin-top: 8px;">${message}</p>
      </div>
    `;
    lucide.createIcons();
  }

  async searchCommonsImages(query) {
    query = query.trim();
    if (!query) {
      alert("Please enter an image search topic.");
      return;
    }

    const emptyState = document.getElementById('wiki-image-empty-state');
    const loading = document.getElementById('wiki-image-loading');
    const grid = document.getElementById('image-results-grid');

    if (emptyState) emptyState.classList.add('hidden');
    if (grid) grid.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');

    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&gsrlimit=12&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Commons search request failed.");

      const data = await res.json();
      
      if (!data.query || !data.query.pages) {
        this.renderImageSearchError("No images found", `No educational media or diagrams found for "${query}" on Wikimedia Commons.`);
        return;
      }

      const pages = Object.values(data.query.pages);
      const images = [];

      pages.forEach(p => {
        if (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url) {
          const fileUrl = p.imageinfo[0].url;
          const ext = fileUrl.split('.').pop().toLowerCase();
          const cleanTitle = p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, "").replace(/_/g, " ");

          if (['jpg', 'jpeg', 'png', 'svg', 'gif', 'webp'].includes(ext)) {
            images.push({
              id: p.pageid,
              title: cleanTitle,
              url: fileUrl
            });
          }
        }
      });

      if (images.length === 0) {
        this.renderImageSearchError("No images found", `Found files for "${query}", but none were compatible web image formats.`);
        return;
      }

      this.renderImageSearchResults(images);

    } catch (error) {
      console.error("Commons fetch error:", error);
      this.renderImageSearchError("Connection error", "Unable to retrieve images from Wikimedia Commons. Please check your internet connection.");
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  renderImageSearchResults(images) {
    const grid = document.getElementById('image-results-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.classList.remove('hidden');

    images.forEach(img => {
      const isGathered = this.state.gatheredImages.some(g => g.url === img.url);
      const card = document.createElement('div');
      card.className = 'wiki-img-card';
      card.innerHTML = `
        <div class="wiki-card-img-wrapper">
          <img src="${img.url}" alt="${img.title}">
          <div class="card-action-overlay">
            <button class="overlay-action-btn zoom-btn" title="View Fullscreen">
              <i data-lucide="eye"></i>
            </button>
            <button class="overlay-action-btn gather-btn ${isGathered ? 'active' : ''}" title="${isGathered ? 'Remove from board' : 'Gather / Pin Reference'}">
              <i data-lucide="${isGathered ? 'check' : 'plus'}"></i>
            </button>
          </div>
        </div>
        <div class="wiki-img-card-caption">${img.title}</div>
      `;

      // Zoom listener
      card.querySelector('.zoom-btn').addEventListener('click', () => {
        const dialog = document.getElementById('dialog-wiki-image');
        const previewImg = document.getElementById('wiki-preview-img');
        const imgTitle = document.getElementById('wiki-image-title');
        
        if (dialog && previewImg) {
          previewImg.src = img.url;
          if (imgTitle) imgTitle.textContent = `${img.title} - Image Preview`;
          dialog.showModal();
        }
      });

      // Gather listener
      card.querySelector('.gather-btn').addEventListener('click', () => {
        this.gatherImage(img.title, img.url);
      });

      grid.appendChild(card);
    });

    lucide.createIcons();
  }

  updateImageSearchOverlayState() {
    const grid = document.getElementById('image-results-grid');
    if (!grid || grid.classList.contains('hidden')) return;

    const cards = grid.querySelectorAll('.wiki-img-card');
    cards.forEach(card => {
      const imgEl = card.querySelector('img');
      const gatherBtn = card.querySelector('.gather-btn');
      if (imgEl && gatherBtn) {
        const url = imgEl.src;
        const isGathered = this.state.gatheredImages.some(g => g.url === url);
        
        if (isGathered) {
          gatherBtn.classList.add('active');
          gatherBtn.title = "Remove from board";
          gatherBtn.innerHTML = '<i data-lucide="check"></i>';
        } else {
          gatherBtn.classList.remove('active');
          gatherBtn.title = "Gather / Pin Reference";
          gatherBtn.innerHTML = '<i data-lucide="plus"></i>';
        }
      }
    });
    lucide.createIcons();
  }

  renderImageSearchError(title, message) {
    const grid = document.getElementById('image-results-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.classList.remove('hidden');

    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="alert-circle" style="width:48px; height:48px; color:var(--accent-rose);"></i>
        <h3>${title}</h3>
        <p class="text-muted" style="max-width: 420px; margin-top: 8px;">${message}</p>
      </div>
    `;
    lucide.createIcons();
  }

  gatherImage(title, url) {
    const exists = this.state.gatheredImages.some(img => img.url === url);
    if (exists) {
      this.state.gatheredImages = this.state.gatheredImages.filter(img => img.url !== url);
    } else {
      this.state.gatheredImages.push({
        id: 'g_' + Date.now() + Math.random().toString(36).substr(2, 5),
        title: title,
        url: url
      });
    }
    this.saveState();
    this.renderGatheredBoard();
    this.updateImageSearchOverlayState();
  }

  ungatherImage(id) {
    this.state.gatheredImages = this.state.gatheredImages.filter(img => img.id !== id);
    this.saveState();
    this.renderGatheredBoard();
    this.updateImageSearchOverlayState();
  }

  renderGatheredBoard() {
    const grid = document.getElementById('gathered-board-grid');
    const countEl = document.getElementById('gathered-board-count');
    if (!grid) return;

    grid.innerHTML = '';
    const imgCount = this.state.gatheredImages.length;
    const bookCount = this.state.pinnedBooks.length;
    const totalCount = imgCount + bookCount;
    
    if (countEl) {
      countEl.textContent = `${imgCount} Image${imgCount !== 1 ? 's' : ''}, ${bookCount} eBook${bookCount !== 1 ? 's' : ''} Pinned`;
    }

    if (totalCount === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="flex: 1; min-height: 90px; justify-content: center; height: auto; grid-column: 1 / -1;">
          <i data-lucide="folder-plus" style="opacity: 0.4; width:32px; height:32px; color:var(--text-muted);"></i>
          <p style="font-size:0.8rem;">Gather reference diagrams or pin eBooks to populate your board.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Render Pinned Books
    this.state.pinnedBooks.forEach(book => {
      const card = document.createElement('div');
      card.className = 'gathered-img-card';
      card.title = `${book.title} - Pinned eBook`;
      card.innerHTML = `
        <img src="${book.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=120&auto=format&fit=crop'}" alt="${book.title}" style="object-fit: cover;">
        <button class="gathered-card-remove" title="Remove pin">
          <i data-lucide="trash-2"></i>
        </button>
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(6, 9, 19, 0.85); color: var(--accent-amber); font-size: 0.6rem; padding: 2px; text-align: center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-weight: 600;">
          📘 EBOOK
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.gathered-card-remove')) return;
        window.open(book.readUrl, '_blank');
      });

      card.querySelector('.gathered-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBookPin(book);
      });

      grid.appendChild(card);
    });

    // Render Gathered Images
    this.state.gatheredImages.forEach(img => {
      const card = document.createElement('div');
      card.className = 'gathered-img-card';
      card.title = `${img.title} - Gathered Image`;
      card.innerHTML = `
        <img src="${img.url}" alt="${img.title}">
        <button class="gathered-card-remove" data-id="${img.id}" title="Remove from board">
          <i data-lucide="trash-2"></i>
        </button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.gathered-card-remove')) return;
        
        const dialog = document.getElementById('dialog-wiki-image');
        const previewImg = document.getElementById('wiki-preview-img');
        const imgTitle = document.getElementById('wiki-image-title');
        
        if (dialog && previewImg) {
          previewImg.src = img.url;
          if (imgTitle) imgTitle.textContent = `${img.title} - Gathered Reference`;
          dialog.showModal();
        }
      });

      card.querySelector('.gathered-card-remove').addEventListener('click', () => {
        this.ungatherImage(img.id);
      });

      grid.appendChild(card);
    });

    lucide.createIcons();
  }

  /* ==========================================================================
     PROJECT GUTENBERG BOOK LIBRARY MODULE
     ========================================================================== */
  registerLibraryControls() {
    const searchBtn = document.getElementById('btn-library-search');
    const searchInput = document.getElementById('library-search-input');
    const bookDialog = document.getElementById('dialog-book-details');
    
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        this.fetchLibraryBooks(searchInput.value, '');
      });
      
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.fetchLibraryBooks(searchInput.value, '');
        }
      });
    }
    
    // Category tag clicks
    const tags = document.querySelectorAll('.lib-tag');
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        tags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        const topic = tag.dataset.topic;
        if (searchInput) searchInput.value = ''; // clear search when switching topics
        this.fetchLibraryBooks('', topic);
      });
    });
    
    // Close dialog handlers
    document.getElementById('btn-close-book-dialog').addEventListener('click', () => bookDialog.close());
    document.getElementById('btn-close-book-dialog-footer').addEventListener('click', () => bookDialog.close());
    
    // Pin book click
    document.getElementById('btn-pin-book').addEventListener('click', () => {
      if (this.activeBook) {
        this.toggleBookPin(this.activeBook);
      }
    });
  }

  renderLibrary() {
    const grid = document.getElementById('library-grid');
    if (grid && grid.children.length === 0) {
      this.fetchLibraryBooks('', ''); // load popular books on first visit
    }
  }

  fetchLibraryBooks(query = '', topic = '') {
    const grid = document.getElementById('library-grid');
    const loading = document.getElementById('library-loading');
    const emptyState = document.getElementById('library-empty-state');
    
    if (!grid || !loading || !emptyState) return;
    
    grid.innerHTML = '';
    loading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    let url = 'https://gutendex.com/books/';
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    } else if (topic) {
      url += `?topic=${encodeURIComponent(topic)}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        loading.classList.add('hidden');
        if (!data.results || data.results.length === 0) {
          emptyState.classList.remove('hidden');
          return;
         }
        
        data.results.forEach(book => {
          const card = document.createElement('div');
          card.className = 'book-card glass-panel';
          
          // Extract cover
          const coverUrl = book.formats['image/jpeg'] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=120&auto=format&fit=crop';
          
          // Author string
          const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
          
          // Subject tags
          const subjectsStr = book.subjects && book.subjects.length > 0 ? book.subjects[0] : 'Literature';
          
          card.innerHTML = `
            <div class="book-downloads-badge">
              <i data-lucide="download" style="width:10px; height:10px;"></i>
              <span>${book.download_count.toLocaleString()}</span>
            </div>
            <div class="book-cover-wrapper">
              <img src="${coverUrl}" alt="${book.title}" loading="lazy">
            </div>
            <div class="book-card-info">
              <span class="book-title" title="${book.title}">${book.title}</span>
              <span class="book-author">${authorName}</span>
              <div class="book-tags-row">
                <span class="book-subject-tag">${subjectsStr}</span>
              </div>
            </div>
          `;
          
          card.addEventListener('click', () => {
            this.showBookDetails(book);
          });
          
          grid.appendChild(card);
        });
        
        lucide.createIcons();
      })
      .catch(err => {
        console.error('Error fetching Gutenberg books:', err);
        loading.classList.add('hidden');
        emptyState.classList.remove('hidden');
      });
  }

  showBookDetails(book) {
    this.activeBook = book;
    const dialog = document.getElementById('dialog-book-details');
    if (!dialog) return;
    
    // Set text elements
    document.getElementById('book-detail-heading').textContent = book.title;
    
    const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
    document.getElementById('book-detail-author').textContent = authorName;
    
    const subjects = book.subjects && book.subjects.length > 0 ? book.subjects.slice(0, 3).join(', ') : 'None';
    document.getElementById('book-detail-subjects').textContent = subjects;
    
    const langs = book.languages && book.languages.length > 0 ? book.languages.join(', ').toUpperCase() : 'EN';
    document.getElementById('book-detail-languages').textContent = langs;
    
    document.getElementById('book-detail-downloads').textContent = book.download_count.toLocaleString();
    
    // Set Cover image
    const coverUrl = book.formats['image/jpeg'] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=120&auto=format&fit=crop';
    document.getElementById('book-detail-img').src = coverUrl;
    
    // Formats list injection
    const formatsList = document.getElementById('book-formats-list');
    formatsList.innerHTML = '';
    
    const formatMapping = [
      { key: 'text/html', title: 'Read Online (HTML Browser Reader)', icon: 'globe' },
      { key: 'text/plain; charset=utf-8', title: 'Plain Text Edition', icon: 'file-text' },
      { key: 'application/epub+zip', title: 'Download EPUB eBook', icon: 'tablet' },
      { key: 'application/x-mobipocket-ebook', title: 'Download Kindle Edition', icon: 'book-open' }
    ];
    
    let formatFound = false;
    formatMapping.forEach(mapping => {
      const url = book.formats[mapping.key];
      if (url) {
        formatFound = true;
        const link = document.createElement('a');
        link.className = 'format-link-item';
        link.href = url;
        link.target = '_blank';
        link.innerHTML = `
          <div class="format-link-item-left">
            <i data-lucide="${mapping.icon}"></i>
            <span>${mapping.title}</span>
          </div>
          <i data-lucide="external-link" style="width:14px; height:14px;"></i>
        `;
        formatsList.appendChild(link);
      }
    });
    
    if (!formatFound) {
      const link = document.createElement('a');
      link.className = 'format-link-item';
      link.href = `https://www.gutenberg.org/ebooks/${book.id}`;
      link.target = '_blank';
      link.innerHTML = `
        <div class="format-link-item-left">
          <i data-lucide="book"></i>
          <span>Project Gutenberg Catalog Page</span>
        </div>
        <i data-lucide="external-link" style="width:14px; height:14px;"></i>
      `;
      formatsList.appendChild(link);
    }
    
    // Set Pin Button text/icon
    this.updatePinButtonState(book.id);
    
    dialog.showModal();
    lucide.createIcons();
  }

  updatePinButtonState(bookId) {
    const pinBtn = document.getElementById('btn-pin-book');
    if (!pinBtn) return;
    
    const isPinned = this.state.pinnedBooks.some(pb => pb.id === bookId);
    const span = pinBtn.querySelector('span');
    const icon = pinBtn.querySelector('i');
    
    if (isPinned) {
      span.textContent = 'Unpin Reference';
      if (icon) icon.setAttribute('data-lucide', 'pin-off');
    } else {
      span.textContent = 'Pin Reference';
      if (icon) icon.setAttribute('data-lucide', 'pin');
    }
    lucide.createIcons();
  }

  toggleBookPin(book) {
    const isPinned = this.state.pinnedBooks.some(pb => pb.id === book.id);
    if (isPinned) {
      this.state.pinnedBooks = this.state.pinnedBooks.filter(pb => pb.id !== book.id);
      alert(`"${book.title}" removed from pinned references.`);
    } else {
      const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown';
      const coverUrl = book.formats['image/jpeg'] || '';
      this.state.pinnedBooks.push({
        id: book.id,
        title: book.title,
        author: authorName,
        cover: coverUrl,
        readUrl: book.formats['text/html'] || book.formats['text/plain; charset=utf-8'] || `https://www.gutenberg.org/ebooks/${book.id}`
      });
      alert(`"${book.title}" pinned to your reference board!`);
    }
    this.saveState();
    this.updatePinButtonState(book.id);
    
    // Refresh references drawer
    this.renderGatheredBoard();
  }

  /* ==========================================================================
     STUDY RESOURCES HUB & IN-APP READERS MODULE
     ========================================================================== */
  registerResourcesControls() {
    const addResourceDialog = document.getElementById('dialog-add-resource');
    const openAddBtn = document.getElementById('btn-open-add-resource');
    const closeAddBtnX = document.getElementById('btn-close-resource-dialog-x');
    const closeAddBtn = document.getElementById('btn-cancel-resource-dialog');
    const form = document.getElementById('form-add-resource');
    
    if (openAddBtn && addResourceDialog) {
      openAddBtn.addEventListener('click', () => {
        form.reset();
        addResourceDialog.showModal();
      });
    }
    
    if (closeAddBtnX) closeAddBtnX.addEventListener('click', () => addResourceDialog.close());
    if (closeAddBtn) closeAddBtn.addEventListener('click', () => addResourceDialog.close());
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('resource-title').value.trim();
        const url = document.getElementById('resource-url').value.trim();
        const subject = document.getElementById('resource-subject').value;
        const type = document.getElementById('resource-type').value;
        
        this.saveCustomResource(title, url, subject, type);
        addResourceDialog.close();
      });
    }

    // Programmatic click listeners for Curated Courses & Interactive Labs
    const courseCards = document.querySelectorAll('.curated-course-card');
    courseCards.forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.videoUrl;
        if (url) this.playInAppVideo(url);
      });
    });

    const labCards = document.querySelectorAll('.curated-lab-card');
    labCards.forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.labUrl;
        if (url) this.launchInAppLab(url);
      });
    });

    // YouTube Search Bindings
    const searchInput = document.getElementById('youtube-search-input');
    const searchBtn = document.getElementById('btn-youtube-search');
    const clearSearchBtn = document.getElementById('btn-clear-search-results');

    if (searchBtn && searchInput) {
      const handleSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
          this.performYoutubeSearch(query);
        }
      };
      searchBtn.addEventListener('click', handleSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        document.getElementById('youtube-search-results-section').classList.add('hidden');
        document.getElementById('curated-courses-list').classList.remove('hidden');
      });
    }

    // Tab routing (Courses vs Labs vs Saved)
    const modeBtns = document.querySelectorAll('.resource-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.resMode;
        const coursesSection = document.getElementById('resource-courses-section');
        const labsSection = document.getElementById('resource-labs-section');
        const savedSection = document.getElementById('resource-saved-section');

        coursesSection.classList.add('hidden');
        labsSection.classList.add('hidden');
        savedSection.classList.add('hidden');

        if (mode === 'courses') {
          coursesSection.classList.remove('hidden');
        } else if (mode === 'labs') {
          labsSection.classList.remove('hidden');
        } else if (mode === 'saved') {
          savedSection.classList.remove('hidden');
          this.renderResources(); // Refresh bookmarks list
        }
      });
    });

    // Close Video Player Dialog
    const videoDialog = document.getElementById('dialog-video-player');
    const closeVideoBtn = document.getElementById('btn-close-video-player');
    if (closeVideoBtn && videoDialog) {
      closeVideoBtn.addEventListener('click', () => {
        if (this.ytPlayer && this.ytPlayer.destroy) {
          try {
            this.ytPlayer.destroy();
            this.ytPlayer = null;
          } catch(e) {}
        }
        const container = document.getElementById('video-player-container');
        if (container) container.innerHTML = '';
        videoDialog.close();
      });
    }

    // Close Lab Player Dialog
    const labDialog = document.getElementById('dialog-lab-player');
    const closeLabBtn = document.getElementById('btn-close-lab-player');
    if (closeLabBtn && labDialog) {
      closeLabBtn.addEventListener('click', () => {
        document.getElementById('lab-player-iframe').src = ''; // stop lab on close
        labDialog.close();
      });
    }
  }

  getYoutubeEmbedUrl(url) {
    if (url.includes('youtube.com/embed/')) return url;
    
    let videoId = '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.includes('/watch')) {
          videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.includes('/embed/')) {
          videoId = urlObj.pathname.split('/').pop();
        } else if (urlObj.pathname.includes('/videoseries')) {
          const listId = urlObj.searchParams.get('list');
          return `https://www.youtube.com/embed/videoseries?list=${listId}`;
        }
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1);
      }
    } catch(e) {
      console.error("Failed to parse YouTube URL:", e);
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  getYoutubeVideoId(url) {
    let videoId = '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.includes('/watch')) {
          videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.includes('/embed/')) {
          videoId = urlObj.pathname.split('/').pop();
        }
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1);
      }
    } catch(e) {}
    
    if (!videoId) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      }
    }
    return videoId;
  }

  playInAppVideo(url) {
    const dialog = document.getElementById('dialog-video-player');
    if (!dialog) return;

    dialog.showModal();

    const isPlaylist = url.includes('list=');
    let videoId = '';
    let playlistId = '';

    if (isPlaylist) {
      try {
        const urlObj = new URL(url);
        playlistId = urlObj.searchParams.get('list');
      } catch(e) {}
    } else {
      videoId = this.getYoutubeVideoId(url);
    }

    const container = document.getElementById('video-player-container');
    if (container) {
      container.innerHTML = '<div id="video-player-target" style="width:100%; height:100%;"></div>';
    }

    if (window.YT && window.YT.Player) {
      if (this.ytPlayer) {
        try { this.ytPlayer.destroy(); } catch(e) {}
      }
      
      this.ytPlayer = new YT.Player('video-player-target', {
        height: '100%',
        width: '100%',
        videoId: isPlaylist ? undefined : videoId,
        playerVars: {
          autoplay: 1,
          listType: isPlaylist ? 'playlist' : undefined,
          list: isPlaylist ? playlistId : undefined,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
          }
        }
      });
    } else {
      // Fallback if YT API is not fully loaded
      const embedUrl = this.getYoutubeEmbedUrl(url);
      if (container) {
        container.innerHTML = `<iframe id="video-player-iframe" src="${embedUrl}" style="width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    }
  }

  performYoutubeSearch(query) {
    const resultsSection = document.getElementById('youtube-search-results-section');
    const resultsGrid = document.getElementById('youtube-search-results-grid');
    const curatedCoursesList = document.getElementById('curated-courses-list');
    
    if (!resultsSection || !resultsGrid) return;
    
    // Show loading skeleton
    resultsGrid.innerHTML = `
      <div style="grid-column: 1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px; gap: 16px;">
        <div class="skeleton-loader" style="width: 100%; max-width: 600px;">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
        </div>
        <span class="text-muted" style="font-size:0.9rem;">Searching YouTube Data API...</span>
      </div>
    `;
    resultsSection.classList.remove('hidden');
    curatedCoursesList.classList.add('hidden');

    const apiKey = this.state.timer.settings.ytApiKey || '';
    if (!apiKey) {
      resultsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 48px; color: var(--text-muted);">
          <i data-lucide="key" style="width:48px; height:48px; margin-bottom:12px; color:var(--accent-amber);"></i>
          <h3>YouTube API Key Required</h3>
          <p style="margin-bottom:16px;">To use the Search feature, please enter your YouTube Data API v3 Key in Study Settings.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-open-settings').click()">Open Settings</button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Call official YouTube Data API v3 Search endpoint without query suffixing
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${encodeURIComponent(apiKey)}`;

    fetch(url)
      .then(res => {
        if (!res.ok) {
          if (res.status === 400 || res.status === 403) {
            throw new Error("Invalid API key or quota exceeded.");
          }
          throw new Error("API request failed.");
        }
        return res.json();
      })
      .then(data => {
        resultsGrid.innerHTML = '';
        
        if (!data.items || data.items.length === 0) {
          resultsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 48px; color: var(--text-muted);">
              <i data-lucide="video-off" style="width:48px; height:48px; margin-bottom:12px;"></i>
              <h3>No videos found</h3>
              <p>Try refining your search terms.</p>
            </div>
          `;
          lucide.createIcons();
          return;
        }

        data.items.forEach(item => {
          if (item.id && item.id.videoId) {
            const videoId = item.id.videoId;
            const snippet = item.snippet;
            
            // Decodes HTML entities (e.g. &amp;, &#39;, &quot;) commonly returned by YouTube API
            const doc = new DOMParser().parseFromString(snippet.title, 'text/html');
            const cleanTitle = doc.documentElement.textContent;
            const cleanChannel = new DOMParser().parseFromString(snippet.channelTitle, 'text/html').documentElement.textContent;

            const card = document.createElement('div');
            card.className = 'book-card glass-panel';
            card.innerHTML = `
              <div class="book-cover-wrapper" style="aspect-ratio: 16/9; background:#000;">
                <img src="${snippet.thumbnails.medium ? snippet.thumbnails.medium.url : `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}" alt="${cleanTitle}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
                <div class="play-overlay"><i data-lucide="play-circle"></i></div>
              </div>
              <div class="book-card-info" style="margin-top:8px;">
                <span class="book-title" title="${cleanTitle}" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; line-height:1.3; font-weight:600; min-height:2.6em;">${cleanTitle}</span>
                <span class="book-author" style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block; margin-top:4px;">${cleanChannel}</span>
                <span class="book-subject-tag" style="margin-top:6px; display:inline-block; font-size:0.65rem;">Video</span>
              </div>
            `;
            
            card.addEventListener('click', () => {
              this.playInAppVideo(`https://www.youtube.com/watch?v=${videoId}`);
            });
            resultsGrid.appendChild(card);
          }
        });

        lucide.createIcons();
      })
      .catch(err => {
        console.error(err);
        resultsGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding: 48px; color: var(--text-muted);">
            <i data-lucide="alert-triangle" style="width:48px; height:48px; color:var(--accent-red); margin-bottom:12px;"></i>
            <h3>Search API Error</h3>
            <p>${err.message || 'Failed to search YouTube. Please check your API key.'}</p>
          </div>
        `;
        lucide.createIcons();
      });
  }

  launchInAppLab(url) {
    const dialog = document.getElementById('dialog-lab-player');
    const iframe = document.getElementById('lab-player-iframe');
    if (dialog && iframe) {
      iframe.src = url;
      dialog.showModal();
    }
  }

  saveCustomResource(title, url, subject, type) {
    const resource = {
      id: 'res_' + Date.now(),
      title,
      url,
      subject,
      type,
      date: getLocalDateString()
    };
    this.state.customResources.push(resource);
    this.saveState();
    this.renderResources();
    alert(`"${title}" saved successfully to your Bookmarks Vault!`);
  }

  deleteCustomResource(id) {
    if (confirm("Remove this bookmarked resource?")) {
      this.state.customResources = this.state.customResources.filter(r => r.id !== id);
      this.saveState();
      this.renderResources();
    }
  }

  renderResources() {
    const grid = document.getElementById('saved-resources-grid');
    const emptyState = document.getElementById('saved-resources-empty-state');
    if (!grid || !emptyState) return;

    grid.innerHTML = '';
    const items = this.state.customResources;

    if (items.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    items.forEach(res => {
      const card = document.createElement('div');
      card.className = 'book-card glass-panel';
      
      let iconName = 'globe';
      let thumbImg = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=200&auto=format&fit=crop';
      if (res.type === 'video') {
        iconName = 'video';
        thumbImg = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200&auto=format&fit=crop';
      } else if (res.type === 'textbook') {
        iconName = 'book';
        thumbImg = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200&auto=format&fit=crop';
      } else if (res.type === 'lab') {
        iconName = 'flask-conical';
        thumbImg = 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=200&auto=format&fit=crop';
      }
      
      const isYoutube = res.url.includes('youtube.com') || res.url.includes('youtu.be');
      if (isYoutube) {
        let ytid = '';
        try {
          const urlObj = new URL(res.url);
          if (urlObj.hostname.includes('youtube.com')) {
            ytid = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
          } else if (urlObj.hostname.includes('youtu.be')) {
            ytid = urlObj.pathname.substring(1);
          }
        } catch(e) {}
        if (ytid) {
          thumbImg = `https://img.youtube.com/vi/${ytid}/mqdefault.jpg`;
        }
      }

      card.innerHTML = `
        <button class="resource-delete-btn" title="Delete Bookmark">
          <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
        </button>
        <div class="resource-badge ${res.type}">
          <span>${res.type.toUpperCase()}</span>
        </div>
        <div class="book-cover-wrapper" style="aspect-ratio: 16/9; background:#000;">
          <img src="${thumbImg}" alt="${res.title}" loading="lazy">
          <div class="play-overlay">
            <i data-lucide="play-circle"></i>
          </div>
        </div>
        <div class="book-card-info" style="margin-top:8px;">
          <span class="book-title" title="${res.title}">${res.title}</span>
          <span class="book-author" style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block;">${res.url}</span>
          <div class="book-tags-row">
            <span class="book-subject-tag">${res.subject.toUpperCase()}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.resource-delete-btn')) return;
        
        if (res.type === 'video' || isYoutube) {
          this.playInAppVideo(res.url);
        } else if (res.type === 'lab') {
          this.launchInAppLab(res.url);
        } else {
          this.launchInAppLab(res.url);
        }
      });

      card.querySelector('.resource-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCustomResource(res.id);
      });

      grid.appendChild(card);
    });

    lucide.createIcons();
  }
}

// Instantiate and initiate on DOMContentLoaded
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new VertoxStudyApp();
  app.init();
  window.app = app; // Expose globally for HTML event triggers
});
