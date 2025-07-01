// UTILITIES
const $ = id => document.getElementById(id);
const modals = document.querySelectorAll('.modal');

// STATE
let flashData = JSON.parse(localStorage.getItem('flashData')) || { folders: {} };
let lastFolder = localStorage.getItem('lastFolder') || null;
let studyList = [], studyIndex = 0;
let timer = null;
let timerState = {
  work: 1500, shortBreak: 300, longBreak: 900,
  currentPhase: 'work', remaining: 1500, sessions: 0, isRunning: false, alarm: true
};
let savedSettings = JSON.parse(localStorage.getItem('pomodoro-settings')) || null;

// VIEW SWITCHING
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('visible'));
  $(viewId).classList.add('visible');
}

// MODALS
function showModal(id) {
  modals.forEach(m => m.style.display = 'none');
  $(id).style.display = 'flex';
}
function closeModal(id) { $(id).style.display = 'none'; }

// TIMER LOGIC
function applySettings(settings) {
  Object.assign(timerState, settings);
  timerState.remaining = settings.work;
  timerState.currentPhase = 'work';
  timerState.sessions = 0;
  updateDisplays();
}

function updateDisplays() {
  const min = Math.floor(timerState.remaining / 60).toString().padStart(2, '0');
  const sec = (timerState.remaining % 60).toString().padStart(2, '0');
  $('timer-display').textContent = `${min}:${sec}`;
  $('home-timer-display').textContent = `${min}:${sec}`;
  const total = timerState[timerState.currentPhase];
  const pct = 360 - ((timerState.remaining / total) * 360);
  document.querySelectorAll('.timer-progress').forEach(el => {
    el.style.background = `conic-gradient(var(--accent) ${pct}deg, var(--accent-soft) ${pct}deg 360deg)`;
  });
}

function startTimer() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  $('pause-resume-btn').textContent = 'Pause';
  timer = setInterval(() => {
    if (timerState.remaining > 0) {
      timerState.remaining--;
      updateDisplays();
    } else {
      clearInterval(timer);
      timerState.isRunning = false;
      phaseChange();
    }
  }, 1000);
}

function phaseChange() {
  if (timerState.alarm) new Audio('assets/alarm.mp3').play();
  timerState.currentPhase = (timerState.currentPhase === 'work')
    ? ((++timerState.sessions % 3 === 0) ? 'longBreak' : 'shortBreak')
    : 'work';
  timerState.remaining = timerState[timerState.currentPhase];
  updateDisplays();
  startTimer();
}

// INIT
updateDisplays();

// EVENT HANDLERS — TIMER & HOME
$('start-btn').addEventListener('click', () => {
  if (savedSettings) showModal('last-settings-modal');
  else showModal('settings-modal');
});
$('pause-resume-btn').addEventListener('click', () => {
  if (timerState.isRunning) {
    clearInterval(timer);
    timerState.isRunning = false;
    $('pause-resume-btn').textContent = 'Resume';
  } else {
    startTimer();
  }
});
$('reset-timer-btn').addEventListener('click', () => {
  clearInterval(timer);
  timerState.isRunning = false;
  timerState.remaining = timerState[timerState.currentPhase];
  updateDisplays();
  switchView('home-view');
});
$('cancel-settings-btn').addEventListener('click', () => closeModal('settings-modal'));
$('cancel-last-btn').addEventListener('click', () => closeModal('last-settings-modal'));
$('edit-settings-btn').addEventListener('click', () => {
  closeModal('last-settings-modal');
  showModal('settings-modal');
});
$('use-last-btn').addEventListener('click', () => {
  applySettings(savedSettings);
  startTimer();
  closeModal('last-settings-modal');
  switchView('timer-view');
});
$('settings-form').addEventListener('submit', e => {
  e.preventDefault();
  const newSettings = {
    work: parseInt($('work-duration').value),
    shortBreak: parseInt($('short-break-duration').value),
    longBreak: parseInt($('long-break-duration').value),
    alarm: $('alarm-toggle').checked
  };
  savedSettings = newSettings;
  localStorage.setItem('pomodoro-settings', JSON.stringify(savedSettings));
  applySettings(newSettings);
  startTimer();
  closeModal('settings-modal');
  switchView('timer-view');
});

// FLASHCARDS
function buildFolderDropdown() {
  const menu = $('folder-menu');
  menu.innerHTML = '';

  Object.keys(flashData.folders).forEach(folder => {
    const btn = document.createElement('button');
    btn.textContent = folder;
    btn.addEventListener('click', () => selectFolder(folder));
    menu.appendChild(btn);
  });

  const plus = document.createElement('button');
  plus.textContent = '➕ Add Folder';
  plus.addEventListener('click', () => showModal('add-folder-modal'));
  menu.appendChild(plus);

  if (Object.keys(flashData.folders).length > 0) {
    const del = document.createElement('button');
    del.textContent = '🗑 Delete Folder';
    del.addEventListener('click', deleteFolderPrompt);
    menu.appendChild(del);
  }
}

function selectFolder(folder) {
  lastFolder = folder;
  localStorage.setItem('lastFolder', folder);
  $('folder-toggle').textContent = folder + ' ▾';
  $('folder-menu').style.display = 'none';
  $('study-bar').classList.remove('hidden');
  renderCards(folder);
  updateStudyBarVisibility();
}

function renderCards(folder) {
  const grid = $('flashcard-grid');
  grid.innerHTML = '';
  flashData.folders[folder].forEach((card, idx) => {
    const div = document.createElement('div');
    div.className = 'flashcard';
    div.textContent = card.question;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn icon-btn';
    delBtn.innerHTML = svgs.trash;
    delBtn.addEventListener('click', () => deleteCard(folder, idx));
    div.appendChild(delBtn);

    grid.appendChild(div);
    updateStudyBarVisibility();
  });

  if (flashData.folders[folder].length === 0) {
    $('study-bar').classList.add('hidden');
  }
}

function deleteCard(folder, index) {
  if (!confirm("Delete this card?")) return;
  flashData.folders[folder].splice(index, 1);
  saveFlash();
  renderCards(folder);
}

function deleteFolderPrompt() {
  if (!lastFolder) return alert("No folder selected.");
  if (confirm(`Delete folder "${lastFolder}"?`)) {
    delete flashData.folders[lastFolder];
    saveFlash();
    lastFolder = null;
    localStorage.removeItem('lastFolder');
    buildFolderDropdown();
    $('folder-toggle').textContent = "Select Set ▾";
    $('flashcard-grid').innerHTML = '';
    $('study-bar').classList.add('hidden');
  }
}

function saveFlash() {
  localStorage.setItem('flashData', JSON.stringify(flashData));
}

// FLASHCARD UI EVENTS
$('flashcard-btn').addEventListener('click', () => {
  switchView('flash-view');
  buildFolderDropdown();
});
$('add-flashcard-btn').addEventListener('click', () => {
  if (!lastFolder) return alert("Please select a folder first.");
  showModal('add-card-modal');
});
$('confirm-add-folder').addEventListener('click', () => {
  const name = $('new-folder-name').value.trim();
  if (!name || flashData.folders[name]) return;
  flashData.folders[name] = [];
  saveFlash();
  buildFolderDropdown();
  closeModal('add-folder-modal');
});
$('cancel-add-folder').addEventListener('click', () => closeModal('add-folder-modal'));
$('confirm-add-card').addEventListener('click', () => {
  const q = $('new-question').value.trim();
  const a = $('new-answer').value.trim();
  if (!q || !a) return;
  flashData.folders[lastFolder].push({ question: q, answer: a, flagged: false });
  saveFlash();
  renderCards(lastFolder);
  $('new-question').value = '';
  $('new-answer').value = '';
  closeModal('add-card-modal');
});
$('cancel-add-card').addEventListener('click', () => closeModal('add-card-modal'));
$('exit-flash-btn').addEventListener('click', () => switchView('home-view'));

// STUDY MODE
function renderStudyCard() {
  const card = studyList[studyIndex];
  $('study-front').textContent = card.question;
  $('study-back').textContent = card.answer;
  $('study-card').classList.remove('flipped');
  $('study-counter').textContent = `${studyIndex+1} / ${studyList.length}`;
  $('icon-flag').innerHTML = card.flagged ? svgs['flagged'] : svgs['flag'];
}

$('start-study-btn').addEventListener('click', () => {
  if (!lastFolder) return;
  studyList = [...flashData.folders[lastFolder]];
  studyIndex = 0;
  renderStudyCard();
  switchView('study-view');
});

$('study-card').addEventListener('click', () => {
  $('study-card').classList.toggle('flipped');
});
$('next-btn').addEventListener('click', () => {
  if (studyIndex < studyList.length - 1) studyIndex++;
  renderStudyCard();
});
$('prev-btn').addEventListener('click', () => {
  if (studyIndex > 0) studyIndex--;
  renderStudyCard();
});
$('exit-study-btn').addEventListener('click', () => switchView('flash-view'));
$('shuffle-btn').addEventListener('click', () => {
  for (let i = studyList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [studyList[i], studyList[j]] = [studyList[j], studyList[i]];
  }
  studyIndex = 0;
  renderStudyCard();
});

// SVG LOADER
const svgs = {};
const svgFiles = ['Trash', 'Flag', 'Flagged', 'Light-mode', 'Dark-mode'];
svgFiles.forEach(name => {
  fetch(`assets/${name}.svg`)
    .then(r => r.text())
    .then(data => svgs[name.toLowerCase()] = data)
    .catch(err => console.error(`Failed to load ${name}:`, err));
});

function waitForSVGs(callback) {
  const check = setInterval(() => {
    if (Object.keys(svgs).length === svgFiles.length) {
      clearInterval(check);
      callback();
    }
  }, 50);
}

// Fix #1: Make "Select Set" dropdown work again
$('folder-toggle').addEventListener('click', () => {
  const menu = $('folder-menu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});

// Fix #2: Restore "Start Studying" visibility logic
function updateStudyBarVisibility() {
  if (lastFolder && flashData.folders[lastFolder].length > 0) {
    $('study-bar').classList.remove('hidden');
  } else {
    $('study-bar').classList.add('hidden');
  }
}


// THEME & FLAG BUTTONS
waitForSVGs(() => {
  const dark = document.body.classList.contains('dark');
  $('icon-theme').innerHTML = svgs[dark ? 'light-mode' : 'dark-mode'];

  $('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    $('icon-theme').innerHTML = svgs[isDark ? 'light-mode' : 'dark-mode'];
  });

  $('flag-btn').addEventListener('click', () => {
    const card = studyList[studyIndex];
    card.flagged = !card.flagged;
    saveFlash();
    renderStudyCard();
  });
});

