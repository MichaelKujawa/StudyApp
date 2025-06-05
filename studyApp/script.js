let timer;
let isRunning = false;
let isMuted = false;
let currentPhase = 'work';
let workSessions = 0;
let timeLeft;

const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const muteBtn = document.getElementById("mute-btn");

const alarmSound = new Audio("sounds/alarm.mp3");

const workSelect = document.getElementById("work-duration");
const shortBreakSelect = document.getElementById("short-break-duration");
const longBreakSelect = document.getElementById("long-break-duration");

function getDuration(type) {
  if (type === 'work') return parseInt(workSelect.value);
  if (type === 'break') return parseInt(shortBreakSelect.value);
  if (type === 'long-break') return parseInt(longBreakSelect.value);
  return 1500;
}

function updateDisplay() {
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  timerDisplay.textContent = `${mins}:${secs}`;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;

  timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateDisplay();
    } else {
      clearInterval(timer);
      isRunning = false;

      if (!isMuted) alarmSound.play();

      if (currentPhase === "work") {
        workSessions++;
        currentPhase = workSessions % 3 === 0 ? "long-break" : "break";
      } else {
        currentPhase = "work";
      }

      timeLeft = getDuration(currentPhase);
      updateDisplay();
      startTimer(); // auto-continue
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
}

function resetTimer() {
  pauseTimer();
  currentPhase = "work";
  workSessions = 0;
  timeLeft = getDuration(currentPhase);
  updateDisplay();
}

function toggleMute() {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔈";
}

[startBtn, pauseBtn, resetBtn, muteBtn].forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn === startBtn) startTimer();
    if (btn === pauseBtn) pauseTimer();
    if (btn === resetBtn) resetTimer();
    if (btn === muteBtn) toggleMute();
  });
});

// Store and restore settings
[workSelect, shortBreakSelect, longBreakSelect].forEach(select => {
  const saved = localStorage.getItem(select.id);
  if (saved) select.value = saved;

  select.addEventListener("change", () => {
    localStorage.setItem(select.id, select.value);
    resetTimer();
  });
});

// Initialize
timeLeft = getDuration("work");
updateDisplay();

let flashcardData = JSON.parse(localStorage.getItem("flashcardData")) || { folders: {} };

const toggleBtn = document.getElementById("flashcard-toggle");
const flashcardSection = document.getElementById("flashcards");
const folderSelect = document.getElementById("folder-select");
const createFolderBtn = document.getElementById("create-folder-btn");
const confirmFolderBtn = document.getElementById("confirm-create-folder");
const newFolderForm = document.getElementById("new-folder-form");
const newFolderName = document.getElementById("new-folder-name");
const flashcardForm = document.getElementById("flashcard-form");
const questionInput = document.getElementById("question");
const answerInput = document.getElementById("answer");
const flashcardDisplay = document.getElementById("flashcard-display");

function saveFlashData() {
  localStorage.setItem("flashcardData", JSON.stringify(flashcardData));
}

function updateFolderSelect() {
  folderSelect.innerHTML = "";
  for (let name in flashcardData.folders) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    folderSelect.appendChild(opt);
  }
}

function renderCards(folderName) {
  flashcardDisplay.innerHTML = "";
  if (!folderName || !flashcardData.folders[folderName]) return;

  flashcardData.folders[folderName].forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard";
    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-front">${card.question}</div>
        <div class="card-back">${card.answer}</div>
      </div>
    `;
    cardEl.addEventListener("click", () => {
      cardEl.classList.toggle("flipped");
    });
    flashcardDisplay.appendChild(cardEl);
  });
}

toggleBtn.addEventListener("click", () => {
  const visible = flashcardSection.style.display === "block";
  flashcardSection.style.display = visible ? "none" : "block";
  if (!visible) renderCards(folderSelect.value);
});

createFolderBtn.addEventListener("click", () => {
  newFolderForm.style.display = "block";
});

confirmFolderBtn.addEventListener("click", () => {
  const name = newFolderName.value.trim();
  if (!name || flashcardData.folders[name]) return;
  flashcardData.folders[name] = [];
  newFolderName.value = "";
  newFolderForm.style.display = "none";
  updateFolderSelect();
  folderSelect.value = name;
  renderCards(name);
  saveFlashData();
});

flashcardForm.addEventListener("submit", e => {
  e.preventDefault();
  const folder = folderSelect.value;
  const q = questionInput.value.trim();
  const a = answerInput.value.trim();
  if (!folder || !q || !a) return;

  flashcardData.folders[folder].push({ question: q, answer: a });
  questionInput.value = "";
  answerInput.value = "";
  renderCards(folder);
  saveFlashData();
});

folderSelect.addEventListener("change", () => {
  renderCards(folderSelect.value);
});

// Init
updateFolderSelect();
renderCards(folderSelect.value);

