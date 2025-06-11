// ⏱️ Pomodoro Timer
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
      startTimer();
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

[workSelect, shortBreakSelect, longBreakSelect].forEach(select => {
  const saved = localStorage.getItem(select.id);
  if (saved) select.value = saved;

  select.addEventListener("change", () => {
    localStorage.setItem(select.id, select.value);
    resetTimer();
  });
});

timeLeft = getDuration("work");
updateDisplay();

// 🃏 Flashcards
let flashcardData = JSON.parse(localStorage.getItem("flashcardData")) || { folders: {} };

// Auto-upgrade old data
for (let key in flashcardData.folders) {
  let f = flashcardData.folders[key];
  if (Array.isArray(f)) {
    flashcardData.folders[key] = { starred: false, cards: f.map(q => ({ ...q, flagged: false })) };
  } else if (!f.cards) {
    f.cards = [];
  }
}

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
    const folderObj = flashcardData.folders[name];
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = folderObj.starred ? `⭐ ${name}` : name;
    folderSelect.appendChild(opt);
  }
}

function renderCards(folderName) {
  flashcardDisplay.innerHTML = "";
  if (!folderName || !flashcardData.folders[folderName]) return;

  const cards = flashcardData.folders[folderName].cards;

  cards.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard";
    if (card.flagged) cardEl.style.borderColor = "red";

    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-front">${card.question}</div>
        <div class="card-back">${card.answer}</div>
      </div>
      <div class="card-actions">
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
        <button class="flag-btn">${card.flagged ? "🚩" : "⚐"}</button>
      </div>
    `;

    cardEl.querySelector(".card-inner").addEventListener("click", () => {
      cardEl.classList.toggle("flipped");
    });

    cardEl.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Delete this card?")) {
        cards.splice(index, 1);
        saveFlashData();
        renderCards(folderName);
      }
    });

    cardEl.querySelector(".edit-btn").addEventListener("click", () => {
      const newQ = prompt("Edit Question", card.question);
      const newA = prompt("Edit Answer", card.answer);
      if (newQ && newA) {
        card.question = newQ;
        card.answer = newA;
        saveFlashData();
        renderCards(folderName);
      }
    });

    cardEl.querySelector(".flag-btn").addEventListener("click", () => {
      card.flagged = !card.flagged;
      saveFlashData();
      renderCards(folderName);
    });

    flashcardDisplay.appendChild(cardEl);
  });
}

// Toggle Flashcard Section
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
  flashcardData.folders[name] = { starred: false, cards: [] };
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

  flashcardData.folders[folder].cards.push({ question: q, answer: a, flagged: false });
  questionInput.value = "";
  answerInput.value = "";
  renderCards(folder);
  saveFlashData();
});

folderSelect.addEventListener("change", () => {
  renderCards(folderSelect.value);
});

document.getElementById("star-folder-btn").addEventListener("click", () => {
  const name = folderSelect.value;
  if (!name) return;
  flashcardData.folders[name].starred = !flashcardData.folders[name].starred;
  saveFlashData();
  updateFolderSelect();
});

document.getElementById("delete-folder-btn").addEventListener("click", () => {
  const name = folderSelect.value;
  if (!name || !confirm(`Delete folder "${name}"?`)) return;
  delete flashcardData.folders[name];
  saveFlashData();
  updateFolderSelect();
  renderCards(folderSelect.value);
});

// Study Mode state
let currentStudyIndex = 0;
let currentStudyCards = [];
let showFlaggedOnly = false;

const studySection = document.getElementById("study-mode");
const flashSection = document.getElementById("flashcards");

const studyFront = document.getElementById("study-front");
const studyBack = document.getElementById("study-back");
const studyCard = document.getElementById("study-card");

const prevBtn = document.getElementById("prev-card");
const nextBtn = document.getElementById("next-card");
const flipBtn = document.getElementById("flip-card");
const exitBtn = document.getElementById("exit-study");
const flaggedOnlyToggle = document.getElementById("flagged-only-toggle");


document.getElementById("start-study-btn").addEventListener("click", () => {
  const folder = folderSelect.value;
  if (!folder || !flashcardData.folders[folder]) return;

  currentStudyCards = [...flashcardData.folders[folder].cards];
  showFlaggedOnly = flaggedOnlyToggle.checked;
  if (showFlaggedOnly) {
    currentStudyCards = currentStudyCards.filter(c => c.flagged);
  }

  if (currentStudyCards.length === 0) {
    alert("No cards to study.");
    return;
  }

  flashcardSection.style.display = "none";
  studySection.style.display = "block";
  currentStudyIndex = 0;
  updateStudyCard();
});

exitBtn.addEventListener("click", () => {
  studySection.style.display = "none";
  flashcardSection.style.display = "block";
});

function updateStudyCard() {
  const card = currentStudyCards[currentStudyIndex];
  if (!card) return;

  studyFront.textContent = card.question;
  studyBack.textContent = card.answer;

  // Reset flip
  studyCard.classList.remove("flipped");
}

flipBtn.addEventListener("click", () => {
  studyCard.classList.toggle("flipped");
});

prevBtn.addEventListener("click", () => {
  if (currentStudyIndex > 0) {
    currentStudyIndex--;
    updateStudyCard();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentStudyIndex < currentStudyCards.length - 1) {
    currentStudyIndex++;
    updateStudyCard();
  }
});

flaggedOnlyToggle.addEventListener("change", () => {
  const folder = folderSelect.value;
  if (!folder) return;
  currentStudyCards = [...flashcardData.folders[folder].cards];
  showFlaggedOnly = flaggedOnlyToggle.checked;
  if (showFlaggedOnly) {
    currentStudyCards = currentStudyCards.filter(c => c.flagged);
  }
  currentStudyIndex = 0;
  updateStudyCard();
});


// INIT
updateFolderSelect();
renderCards(folderSelect.value);

