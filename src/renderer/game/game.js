const { ipcRenderer } = require("electron");

let gameData = null;
let gameState = {
  currentRound: "WELCOME",
  currentTeamIndex: 0,
  currentQuestionIndex: 0,
  round2QuestionIndex: 0,
  audienceQuestionIndex: 0,
  tieBreakerQuestionIndex: 0,
  teams: [],
  buzzerLocked: true,
  buzzerPressedBy: null,
  timerInterval: null,
  timerValue: 15,
  timerSound: null,
  questionVisible: false,
  startMusicInstance: null,
  tiedTeams: [],
  currentTBTeamIndex: 0,
  tbAnswers: {},
  questionHistory: [], 
  isQuestionAnswered: false,
};

ipcRenderer.on("load-game", (event, game) => {
  gameData = game;
  initializeGame();
});

function formatImagePath(path) {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("https") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  
  const normalizedPath = path.replace(/\\/g, "/");

  if (normalizedPath.startsWith("file://")) {
    return normalizedPath;
  }

  return `file:///${normalizedPath}`;
}

function initializeGame() {
  
  gameState.teams = gameData.teams.map((team) => ({
    ...team,
    score: 0,
    tieBreakerScore: 0,
    lifelinesRemaining: 3,
    usedLifelines: [],
  }));

  const badge = document.getElementById("gameTypeBadge");
  badge.textContent = gameData.gameType;
  badge.className = `game-type-badge ${gameData.gameType}`;

  updateFooterControls("");

  const teamsDisplay = document.getElementById("teamsDisplay");
  teamsDisplay.innerHTML = gameState.teams
    .map(
      (team) => `
    <div class="team-badge">
      ${
        team.logo
          ? `<img src="${formatImagePath(team.logo)}" alt="${
              team.name
            }" style="height: 80px; width: 80px; object-fit: contain; margin-bottom: 15px; border-radius: 10px;">`
          : ""
      }
      <div style="font-size: 1.3rem; font-weight: 700; text-align: center;">${
        team.name
      }</div>
    </div>
  `
    )
    .join("");

  showScreen("welcomeScreen");

  if (window.soundManager) {
    gameState.startMusicInstance = window.soundManager.playSound(
      "gameStart",
      0.6,
      true
    );
  }
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");

  if (window.soundManager) {
    window.soundManager.playTransition();
  }
}

function updateFooterControls(activeId) {
  ["controls-round1", "controls-round2", "controls-tiebreaker"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === activeId ? "flex" : "none";
    }
  );

  const buzzerBtn = document.getElementById("unlockBuzzerBtn");
  if (buzzerBtn) {
    const showBuzzer = activeId === "controls-round2";
    buzzerBtn.style.display = showBuzzer ? "block" : "none";
  }
}

function showRules() {
  showScreen("rulesScreen");
  updateFooterControls(""); 
}

function startRound1() {
  gameState.currentRound = "ROUND_1";
  gameState.currentTeamIndex = 0;
  gameState.currentQuestionIndex = 0;
  gameState.questionVisible = false;
  gameState.isQuestionAnswered = false;

  if (gameState.startMusicInstance && window.soundManager) {
    window.soundManager.stopSound(gameState.startMusicInstance);
    gameState.startMusicInstance = null;
  }

  showScreen("round1Screen");
  updateFooterControls("controls-round1");
  displayRound1Question();
}

function displayRound1Question() {
  const totalQuestionsPerTeam = 5;
  const totalQuestions = gameState.teams.length * totalQuestionsPerTeam;

  const overallQuestionNumber = gameState.currentQuestionIndex;

  if (overallQuestionNumber >= totalQuestions) {
    
    startRound2();
    return;
  }

  const currentTeamIndex = overallQuestionNumber % gameState.teams.length;
  const team = gameState.teams[currentTeamIndex];
  const teamQuestionNumber = Math.floor(
    overallQuestionNumber / gameState.teams.length
  );

  const question = gameData.round1Questions[overallQuestionNumber];

  if (!question) {
    console.error("Question not found at index:", overallQuestionNumber);
    alert(
      "Not enough questions for Round 1! Need " + totalQuestions + " questions."
    );
    
    startRound2();
    return;
  }

  gameState.currentTeamIndex = currentTeamIndex;

  document.getElementById("currentTeamDisplay").innerHTML = `
    <div style="display: flex; align-items: center; gap: 25px; padding: 25px 50px; border-radius: 20px; background: rgba(102, 126, 234, 0.2); font-size: 2.5rem;">
      ${
        team.logo
          ? `<img src="${formatImagePath(team.logo)}" alt="${
              team.name
            }" style="height: 80px;">`
          : ""
      }
      <span>${team.name} - Question ${teamQuestionNumber + 1}/5</span>
    </div>
  `;

  document.getElementById("questionNumber").textContent = `Question ${
    overallQuestionNumber + 1
  }`;
  document.getElementById("questionText").textContent = question.text;

  const optionsGrid = document.getElementById("optionsGrid");
  optionsGrid.innerHTML = question.options
    .map(
      (option, index) => `
    <div class="option" id="option${index}" onclick="selectAnswer(${index})" style="cursor: pointer; ${
        !gameState.questionVisible ? "visibility: hidden;" : ""
      }">
      <strong>${String.fromCharCode(65 + index)}.</strong> ${option}
    </div>
  `
    )
    .join("");

  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.textContent = "15";
    timerElement.className = "timer";
  }

  updateLifelinesBar();

  updateMiniScoreboard("scoreboardMini");

  if (!gameState.questionVisible) {
    
    gameState.questionVisible = false;
  }
}

function updateLifelinesBar() {
  const team = gameState.teams[gameState.currentTeamIndex];
  const lifelinesBar = document.getElementById("lifelinesBar");

  lifelinesBar.innerHTML = `
    <button class="lifeline-btn" onclick="useLifeline('SKIP')" ${
      team.usedLifelines.includes("SKIP") ? "disabled" : ""
    }>
      🚫 SKIP
    </button>
    <button class="lifeline-btn" onclick="useLifeline('FIFTY_FIFTY')" ${
      team.usedLifelines.includes("FIFTY_FIFTY") ? "disabled" : ""
    }>
      50:50
    </button>
    <button class="lifeline-btn" onclick="useLifeline('AUDIENCE_HELP')" ${
      team.usedLifelines.includes("AUDIENCE_HELP") ? "disabled" : ""
    }>
      👥 AUDIENCE
    </button>
    <div style="color: #667eea; font-size: 2.5rem; font-weight: 700; padding: 15px;">
      Lifelines Remaining: ${team.lifelinesRemaining}/3
    </div>
  `;
}

function useLifeline(type) {
  const team = gameState.teams[gameState.currentTeamIndex];

  if (team.usedLifelines.includes(type) || team.lifelinesRemaining <= 0) {
    return;
  }

  team.usedLifelines.push(type);
  team.lifelinesRemaining--;

  if (window.soundManager) {
    window.soundManager.playLifeline();
  }

  if (type === "SKIP") {
    
    stopTimer();
    gameState.questionVisible = false;

    const skipQuestion = gameData.skipQuestions[gameState.currentTeamIndex];
    if (skipQuestion) {
      document.getElementById("questionText").textContent = skipQuestion.text;
      const optionsGrid = document.getElementById("optionsGrid");
      optionsGrid.innerHTML = skipQuestion.options
        .map(
          (option, index) => `
        <div class="option" id="option${index}" onclick="selectSkipAnswer(${index})" style="cursor: pointer; visibility: hidden;">
          <strong>${String.fromCharCode(65 + index)}.</strong> ${option}
        </div>
      `
        )
        .join("");
    }
  } else if (type === "FIFTY_FIFTY") {
    
    const question = gameData.round1Questions[gameState.currentQuestionIndex];

    const incorrectOptions = [0, 1, 2, 3].filter(
      (i) => i !== question.correctAnswer
    );
    const toEliminate = incorrectOptions.slice(0, 2);

    toEliminate.forEach((index) => {
      document.getElementById(`option${index}`).classList.add("eliminated");
    });
  } else if (type === "AUDIENCE_HELP") {

    gameState.usingAudienceHelp = true;
  }

  updateLifelinesBar();
}

function startTimer() {
  stopTimer();
  gameState.timerValue = 15;
  gameState.timerPaused = false;

  let timerElement;
  if (gameState.currentRound === "ROUND_1") {
    timerElement = document.getElementById("timer");
  } else if (gameState.currentRound === "ROUND_2") {
    timerElement = document.getElementById("timerR2");
  } else if (gameState.currentRound === "TIE_BREAKER") {
    timerElement = document.getElementById("timerTB");
  }

  if (!timerElement) return;

  timerElement.textContent = gameState.timerValue;
  timerElement.className = "timer";

  if (window.soundManager) {
    gameState.timerSound = window.soundManager.playTimer();
  }

  gameState.timerInterval = setInterval(() => {
    gameState.timerValue--;
    timerElement.textContent = gameState.timerValue;

    if (gameState.timerValue <= 5) {
      timerElement.className = "timer danger";
    } else if (gameState.timerValue <= 10) {
      timerElement.className = "timer warning";
    }

    if (gameState.timerValue <= 0) {
      stopTimer();
    }
  }, 1000);

  updateTimerButton();
}

function stopTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }

  if (gameState.timerSound && window.soundManager) {
    window.soundManager.stopSound(gameState.timerSound);
    gameState.timerSound = null;
  }
}

function selectAnswer(optionIndex) {
  if (!gameState.questionVisible) return; 

  stopTimer();
  const team = gameState.teams[gameState.currentTeamIndex];

  const question = gameData.round1Questions[gameState.currentQuestionIndex];

  if (!question) {
    return;
  }

  let scoreChange = 0;

  if (optionIndex === question.correctAnswer) {
    
    if (!gameState.usingAudienceHelp) {
      team.score += 10;
      scoreChange = 10;
    }
    
    if (window.soundManager) {
      window.soundManager.playCorrect();
    }

    const selectedOption = document.getElementById(`option${optionIndex}`);
    if (selectedOption) selectedOption.classList.add("correct");
  } else {
    
    if (!gameState.usingAudienceHelp) {
      team.score -= 5;
      scoreChange = -5;
    }
    
    if (window.soundManager) {
      window.soundManager.playWrong();
    }

    const selectedOption = document.getElementById(`option${optionIndex}`);
    if (selectedOption) selectedOption.classList.add("wrong");

    const correctOption = document.getElementById(
      `option${question.correctAnswer}`
    );
    if (correctOption) correctOption.classList.add("correct");
  }

  gameState.questionHistory.push({
    questionIndex: gameState.currentQuestionIndex,
    teamId: team.id,
    scoreChange: scoreChange,
    round: "ROUND_1",
  });

  gameState.usingAudienceHelp = false;

  updateMiniScoreboard("scoreboardMini");

  gameState.questionVisible = false;

  gameState.isQuestionAnswered = true;
}

function selectSkipAnswer(optionIndex) {
  if (!gameState.questionVisible) return;

  stopTimer();
  const team = gameState.teams[gameState.currentTeamIndex];
  const skipQuestion = gameData.skipQuestions[gameState.currentTeamIndex];

  if (!skipQuestion) {
    return;
  }

  let scoreChange = 0;

  if (optionIndex === skipQuestion.correctAnswer) {
    team.score += 10;
    scoreChange = 10;
    if (window.soundManager) {
      window.soundManager.playCorrect();
    }
    const selectedOption = document.getElementById(`option${optionIndex}`);
    if (selectedOption) selectedOption.classList.add("correct");
  } else {
    team.score -= 5;
    scoreChange = -5;
    if (window.soundManager) {
      window.soundManager.playWrong();
    }
    const selectedOption = document.getElementById(`option${optionIndex}`);
    if (selectedOption) selectedOption.classList.add("wrong");

    const correctOption = document.getElementById(
      `option${skipQuestion.correctAnswer}`
    );
    if (correctOption) correctOption.classList.add("correct");
  }

  gameState.questionHistory.push({
    questionIndex: gameState.currentQuestionIndex,
    teamId: team.id,
    scoreChange: scoreChange,
    round: "ROUND_1",
    isSkipQuestion: true,
  });

  updateMiniScoreboard("scoreboardMini");
  gameState.questionVisible = false;

  gameState.isQuestionAnswered = true;
}

function nextQuestion() {
  if (!gameState.questionVisible && !gameState.isQuestionAnswered) {
    
    gameState.questionVisible = true;

    const options = document.querySelectorAll(".option");
    options.forEach((option) => {
      option.style.visibility = "visible";
    });

    if (window.soundManager) {
      window.soundManager.playNewQuestion();
    }
    startTimer();
  } else if (!gameState.isQuestionAnswered && gameState.questionVisible) {

    const question = gameData.round1Questions[gameState.currentQuestionIndex];
    if (question) {
      const correctOption = document.getElementById(
        `option${question.correctAnswer}`
      );
      if (correctOption) correctOption.classList.add("correct");
    }

    stopTimer();
    gameState.isQuestionAnswered = true;
  } else {
    
    gameState.questionVisible = false;
    gameState.isQuestionAnswered = false;

    if (gameState.currentRound === "ROUND_1") {
      gameState.currentQuestionIndex++;
      displayRound1Question();
    } else if (gameState.currentRound === "ROUND_2") {
      gameState.round2QuestionIndex++;
      displayBuzzerQuestion();
    } else if (gameState.currentRound === "TIE_BREAKER") {
      
      gameState.currentTBTeamIndex++;

      if (gameState.currentTBTeamIndex >= gameState.tiedTeams.length) {
        
        gameState.currentTBTeamIndex = 0;
        gameState.tieBreakerQuestionIndex++;

        const sortedTeams = [...gameState.teams].sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return (b.tieBreakerScore || 0) - (a.tieBreakerScore || 0);
        });

        const topTeam = sortedTeams[0];
        const secondTeam = sortedTeams[1];

        const topTotal = topTeam.score + (topTeam.tieBreakerScore || 0); 

        let isStillTied = false;
        if (secondTeam) {
          if (
            topTeam.score === secondTeam.score &&
            (topTeam.tieBreakerScore || 0) === (secondTeam.tieBreakerScore || 0)
          ) {
            isStillTied = true;
          }
        }

        if (!isStillTied) {
          showWinner();
          return;
        }

        const topScore = topTeam.score;
        const topTB = topTeam.tieBreakerScore || 0;

        gameState.tiedTeams = sortedTeams.filter(
          (t) => t.score === topScore && (t.tieBreakerScore || 0) === topTB
        );

        if (
          gameState.tieBreakerQuestionIndex * gameState.tiedTeams.length >=
          gameData.tieBreakerQuestions.length
        ) {
          showWinner();
          return;
        }
      }
      displayTBQuestion();
    }
  }
}

function stopTimerButton() {
  
  stopTimer();
  gameState.timerPaused = true;

  updateTimerButton();
}

function resumeTimer() {
  
  if (!gameState.timerPaused) return;

  gameState.timerPaused = false;

  const timerElement =
    document.getElementById("timer") ||
    document.getElementById("timerR2") ||
    document.getElementById("timerTB");
  if (!timerElement) return;

  if (window.soundManager) {
    gameState.timerSound = window.soundManager.playTimer();
  }

  gameState.timerInterval = setInterval(() => {
    gameState.timerValue--;
    timerElement.textContent = gameState.timerValue;

    if (gameState.timerValue <= 5) {
      timerElement.className = "timer danger";
    } else if (gameState.timerValue <= 10) {
      timerElement.className = "timer warning";
    }

    if (gameState.timerValue <= 0) {
      stopTimer();
      gameState.timerPaused = false;
      updateTimerButton();
    }
  }, 1000);

  updateTimerButton();
}

function updateTimerButton() {
  const stopButton = document.getElementById("stopTimerBtn");
  if (!stopButton) return;

  if (gameState.timerPaused) {
    stopButton.textContent = "▶ Resume Timer";
    stopButton.onclick = resumeTimer;
    stopButton.className = "btn btn-success";
  } else {
    stopButton.textContent = "⏸ Stop Timer";
    stopButton.onclick = stopTimerButton;
    stopButton.className = "btn btn-danger";
  }
}

function backQuestion() {
  
  if (gameState.currentQuestionIndex > 0) {
    stopTimer();

    if (gameState.questionHistory.length > 0) {
      const lastQuestion =
        gameState.questionHistory[gameState.questionHistory.length - 1];

      if (lastQuestion.questionIndex === gameState.currentQuestionIndex - 1) {
        
        const team = gameState.teams.find((t) => t.id === lastQuestion.teamId);
        if (team) {
          team.score -= lastQuestion.scoreChange;
        }

        gameState.questionHistory.pop();
      }
    }

    gameState.currentQuestionIndex--;
    gameState.questionVisible = false;
    displayRound1Question();

    updateMiniScoreboard("scoreboardMini");
  }
}

function updateMiniScoreboard(elementId) {
  const scoreboard = document.getElementById(elementId);
  if (!scoreboard) return;

  scoreboard.innerHTML = gameState.teams
    .map(
      (team) => `
    <div class="team-score" style="background: rgba(102, 126, 234, 0.2); display: flex; align-items: center; gap: 8px;">
      ${
        team.logo
          ? `<img src="${formatImagePath(team.logo)}" alt="${
              team.name
            }" style="height: 20px;">`
          : ""
      }
      <span>${team.name}: ${team.score}</span>
    </div>
  `
    )
    .join("");
}

function showAudienceQuestion(index) {
  if (index >= gameData.audienceQuestions.length) {
    alert("No more audience questions available!");
    return;
  }

  const question = gameData.audienceQuestions[index];

  gameState.currentAudienceQuestionIndex = index;

  showScreen("audienceScreen");
  document.getElementById("audienceQuestionText").textContent = question.text;

  const optionsGrid = document.getElementById("audienceOptionsGrid");
  if (question.options && question.options.length > 0) {
    optionsGrid.innerHTML = question.options
      .map(
        (option, idx) => `
      <div class="option" onclick="selectAudienceAnswer(${idx})" style="cursor: pointer;">
        <strong>${String.fromCharCode(65 + idx)}.</strong> ${option}
      </div>
    `
      )
      .join("");
  } else {
    optionsGrid.innerHTML = "";
  }
}

function showAudienceQuestionButton() {
  
  if (gameState.audienceQuestionIndex === undefined) {
    gameState.audienceQuestionIndex = 0;
  }

  showAudienceQuestion(gameState.audienceQuestionIndex);

  gameState.audienceQuestionIndex++;
}

function selectAudienceAnswer(optionIndex) {
  const question =
    gameData.audienceQuestions[gameState.currentAudienceQuestionIndex];

  if (!question || !question.options) return;

  const options = document.querySelectorAll("#audienceOptionsGrid .option");
  if (question.correctAnswer !== undefined) {
    
    if (optionIndex === question.correctAnswer) {
      if (options[optionIndex]) {
        options[optionIndex].classList.add("correct");
      }
      if (window.soundManager) {
        window.soundManager.playCorrect();
      }
    } else {
      if (options[optionIndex]) {
        options[optionIndex].classList.add("wrong");
      }
      if (options[question.correctAnswer]) {
        options[question.correctAnswer].classList.add("correct");
      }
      if (window.soundManager) {
        window.soundManager.playWrong();
      }
    }
  } else {
    
    if (options[optionIndex]) {
      options[optionIndex].style.background = "rgba(102, 126, 234, 0.3)";
    }
  }

}

function continueGame() {
  
  showScreen("round1Screen");
  displayRound1Question();
}

function startRound2() {
  gameState.currentRound = "ROUND_2";
  gameState.round2QuestionIndex = 0;
  gameState.buzzerLocked = true;
  gameState.questionVisible = false;
  showScreen("round2Screen");
  updateFooterControls("controls-round2");
  displayBuzzerQuestion();
}

function displayBuzzerQuestion() {
  gameState.isQuestionAnswered = false;
  if (gameState.round2QuestionIndex >= gameData.round2Questions.length) {
    
    checkForTieOrWinner();
    return;
  }

  const question = gameData.round2Questions[gameState.round2QuestionIndex];

  document.getElementById("questionNumberR2").textContent = `Question ${
    gameState.round2QuestionIndex + 1
  }/${gameData.round2Questions.length}`;
  document.getElementById("questionTextR2").textContent = question.text;

  const optionsGrid = document.getElementById("optionsGridR2");
  optionsGrid.innerHTML = question.options
    .map(
      (option, index) => `
    <div class="option" onclick="selectBuzzerAnswer(${index})" style="cursor: pointer; visibility: hidden;">
      <strong>${String.fromCharCode(65 + index)}.</strong> ${option}
    </div>
  `
    )
    .join("");

  const timerElement = document.getElementById("timerR2");
  if (timerElement) {
    timerElement.textContent = "15";
    timerElement.className = "timer";
  }

  updateMiniScoreboard("scoreboardMiniR2");
  updateBuzzerStatus("Press your buzzer to answer!", "locked");
  gameState.buzzerLocked = true;
  gameState.buzzerPressedBy = null;
  gameState.questionVisible = false;
}

function updateBuzzerStatus(text, status) {
  const buzzerStatus = document.getElementById("buzzerStatus");
  buzzerStatus.innerHTML = `<p>${text}</p>`;
  buzzerStatus.className = `buzzer-status ${status}`;
}

function unlockBuzzer() {
  gameState.buzzerLocked = false;
  gameState.buzzerPressedBy = null;

  const teamSelection = document.getElementById("teamBuzzerSelection");
  const teamButtons = document.getElementById("teamBuzzerButtons");

  teamButtons.innerHTML = `
    <h2 style="font-size: 2.5rem; margin-bottom: 20px; color: var(--primary);">Select Buzzer Team</h2>
  `;

  teamButtons.innerHTML += gameState.teams
    .map(
      (team) => `
    <button class="team-buzzer-btn" onclick="selectBuzzerTeam('${team.id}')">
      ${
        team.logo
          ? `<img src="${formatImagePath(team.logo)}" alt="${team.name}">`
          : ""
      }
      <span>${team.name}</span>
    </button>
  `
    )
    .join("");

  teamSelection.style.display = "flex";

  updateBuzzerStatus("Select which team buzzed in:", "");
}

function selectBuzzerTeam(teamId) {
  
  const teamSelection = document.getElementById("teamBuzzerSelection");
  teamSelection.style.display = "none";

  gameState.buzzerPressedBy = teamId;
  const team = gameState.teams.find((t) => t.id === teamId);

  if (window.soundManager) {
    window.soundManager.playBuzzer();
  }

  updateBuzzerStatus(`${team.name} buzzed in!`, "pressed");

  gameState.questionVisible = true;
  const options = document.querySelectorAll("#optionsGridR2 .option");
  options.forEach((option) => {
    option.style.visibility = "visible";
  });

  startTimer();
}

function handleBuzzerPress(teamId) {

  selectBuzzerTeam(teamId);
}

function selectBuzzerAnswer(optionIndex) {
  stopTimer();
  if (!gameState.buzzerPressedBy || !gameState.questionVisible) {
    return;
  }

  const team = gameState.teams.find((t) => t.id === gameState.buzzerPressedBy);
  const question = gameData.round2Questions[gameState.round2QuestionIndex];

  if (!question) {
    return;
  }

  if (optionIndex === question.correctAnswer) {
    team.score += 10;
    
    if (window.soundManager) {
      window.soundManager.playCorrect();
    }
    
    const options = document.querySelectorAll("#optionsGridR2 .option");
    if (options[optionIndex]) {
      options[optionIndex].classList.add("correct");
    }
  } else {
    team.score -= 5;
    
    if (window.soundManager) {
      window.soundManager.playWrong();
    }
    
    const options = document.querySelectorAll("#optionsGridR2 .option");
    if (options[optionIndex]) {
      options[optionIndex].classList.add("wrong");
    }
    if (options[question.correctAnswer]) {
      options[question.correctAnswer].classList.add("correct");
    }
  }

  updateMiniScoreboard("scoreboardMiniR2");
  gameState.buzzerLocked = true;
  gameState.questionVisible = false;

  gameState.isQuestionAnswered = true;
}

function nextBuzzerQuestion() {
  if (gameState.isQuestionAnswered) {
    stopTimer();
    gameState.round2QuestionIndex++;
    gameState.questionVisible = false;
    gameState.isQuestionAnswered = false;
    displayBuzzerQuestion();
  } else {
    
    stopTimer();
    gameState.round2QuestionIndex++;
    gameState.questionVisible = false;
    gameState.isQuestionAnswered = false;
    displayBuzzerQuestion();
  }
}

function checkForTieOrWinner() {
  const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
  const topScore = sortedTeams[0].score;
  const tiedTeams = sortedTeams.filter((t) => t.score === topScore);

  if (tiedTeams.length > 1) {
    startTieBreaker();
  } else {
    showWinner();
  }
}

function startTieBreaker() {
  gameState.currentRound = "TIE_BREAKER";
  gameState.tieBreakerQuestionIndex = 0;
  gameState.currentTBTeamIndex = 0;
  gameState.questionVisible = false;
  gameState.isQuestionAnswered = false;
  gameState.tbAnswers = {};

  const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
  const topScore = sortedTeams[0].score;
  gameState.tiedTeams = sortedTeams.filter((t) => t.score === topScore);

  if (window.soundManager) {
    window.soundManager.playTieBreaker();
  }

  showScreen("tieBreakerScreen");
  updateFooterControls("controls-tiebreaker");
  displayTBQuestion();
}

function displayTBQuestion() {
  gameState.isQuestionAnswered = false;
  
  if (gameState.tiedTeams.length === 1) {
    showWinner();
    return;
  }

  const actualQuestionIndex =
    gameState.tieBreakerQuestionIndex * gameState.tiedTeams.length +
    gameState.currentTBTeamIndex;

  if (actualQuestionIndex >= gameData.tieBreakerQuestions.length) {
    
    showWinner();
    return;
  }

  const currentTeam = gameState.tiedTeams[gameState.currentTBTeamIndex];
  const question = gameData.tieBreakerQuestions[actualQuestionIndex];

  document.getElementById("questionTextTB").textContent = question.text;

  const tiebreakerInfo = document.querySelector(".tiebreaker-info");
  if (tiebreakerInfo) {
    tiebreakerInfo.innerHTML = `
      <h2>SUDDEN DEATH</h2>
      <div style="font-size: 3rem; color: var(--primary); margin-top: 20px;">
        ${
          currentTeam.logo
            ? `<img src="${formatImagePath(currentTeam.logo)}" alt="${
                currentTeam.name
              }" style="height: 80px; vertical-align: middle; margin-right: 20px;">`
            : ""
        }
        <strong>${currentTeam.name}'s Turn</strong>
      </div>
      <p style="margin-top: 10px;">Team ${
        gameState.currentTBTeamIndex + 1
      } of ${gameState.tiedTeams.length}</p>
    `;
  }

  const optionsGrid = document.getElementById("optionsGridTB");
  optionsGrid.innerHTML = question.options
    .map(
      (option, index) => `
    <div class="option" onclick="selectTBAnswer(${index})" style="cursor: pointer; visibility: hidden;">
      <strong>${String.fromCharCode(65 + index)}.</strong> ${option}
    </div>
  `
    )
    .join("");

  const timerElement = document.getElementById("timerTB");
  if (timerElement) {
    timerElement.textContent = "15";
    timerElement.className = "timer";
  }

  updateMiniScoreboard("scoreboardMiniTB");
  gameState.questionVisible = false;
}

function nextTBQuestion() {
  if (!gameState.questionVisible && !gameState.isQuestionAnswered) {
    
    gameState.questionVisible = true;

    const options = document.querySelectorAll("#optionsGridTB .option");
    options.forEach((option) => {
      option.style.visibility = "visible";
    });

    if (window.soundManager) {
      window.soundManager.playNewQuestion();
    }
    startTimer();
  } else if (!gameState.isQuestionAnswered && gameState.questionVisible) {
    
    stopTimer();
    gameState.isQuestionAnswered = true;

  } else {
    
    gameState.currentTBTeamIndex++;
    gameState.isQuestionAnswered = false;

    if (gameState.currentTBTeamIndex >= gameState.tiedTeams.length) {
      
      evaluateTBRound();
    } else {
      
      gameState.questionVisible = false;
      displayTieBreakerQuestion();
    }
  }
}

function selectTBAnswer(optionIndex) {
  if (!gameState.questionVisible) return;

  stopTimer();
  const currentTeam = gameState.tiedTeams[gameState.currentTBTeamIndex];

  const actualQuestionIndex =
    gameState.tieBreakerQuestionIndex * gameState.tiedTeams.length +
    gameState.currentTBTeamIndex;
  const question = gameData.tieBreakerQuestions[actualQuestionIndex];

  if (!question) {
    return;
  }

  const isCorrect = optionIndex === question.correctAnswer;
  gameState.tbAnswers[currentTeam.id] = isCorrect;

  if (isCorrect) {
    currentTeam.tieBreakerScore += 1;
  } else {

  }

  const options = document.querySelectorAll("#optionsGridTB .option");
  if (isCorrect) {
    if (window.soundManager) {
      window.soundManager.playCorrect();
    }
    if (options[optionIndex]) {
      options[optionIndex].classList.add("correct");
    }
  } else {
    if (window.soundManager) {
      window.soundManager.playWrong();
    }
    if (options[optionIndex]) {
      options[optionIndex].classList.add("wrong");
    }
    if (options[question.correctAnswer]) {
      options[question.correctAnswer].classList.add("correct");
    }
  }

  gameState.questionVisible = false;

  gameState.isQuestionAnswered = true;
}

function evaluateTBRound() {
  
  const correctTeams = [];
  const wrongTeams = [];

  gameState.tiedTeams.forEach((team) => {
    if (gameState.tbAnswers[team.id]) {
      correctTeams.push(team);
    } else {
      wrongTeams.push(team);
    }
  });

  if (correctTeams.length === 1 && wrongTeams.length > 0) {
    
    gameState.tiedTeams = correctTeams;
    showWinner();
  } else if (correctTeams.length > 1 && wrongTeams.length > 0) {
    
    gameState.tiedTeams = correctTeams;

    alert(`${wrongTeams.map((t) => t.name).join(", ")} eliminated!`);

    gameState.tieBreakerQuestionIndex++;
    gameState.currentTBTeamIndex = 0;
    gameState.tbAnswers = {};
    gameState.questionVisible = false;

    setTimeout(() => displayTieBreakerQuestion(), 1500);
  } else if (wrongTeams.length === gameState.tiedTeams.length) {
    
    gameState.tieBreakerQuestionIndex++;
    gameState.currentTBTeamIndex = 0;
    gameState.tbAnswers = {};
    gameState.questionVisible = false;

    setTimeout(() => displayTieBreakerQuestion(), 1500);
  } else {
    
    gameState.tieBreakerQuestionIndex++;
    gameState.currentTBTeamIndex = 0;
    gameState.tbAnswers = {};
    gameState.questionVisible = false;

    setTimeout(() => displayTieBreakerQuestion(), 1500);
  }
}

function showWinner() {
  
  const sortedTeams = [...gameState.teams].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    return b.tieBreakerScore - a.tieBreakerScore;
  });

  const topScore = sortedTeams[0].score;
  const topTBScore = sortedTeams[0].tieBreakerScore;
  const winners = sortedTeams.filter(
    (t) => t.score === topScore && t.tieBreakerScore === topTBScore
  );

  ipcRenderer.invoke("update-game-result", {
    gameId: gameData.id,
    highestScore: {
      teamName: winners[0].name,
      teamLogo: winners[0].logo,
      score: topScore,
      date: new Date().toISOString(),
    },
  });

  if (window.soundManager) {
    window.soundManager.playWinner();
  }

  showScreen("winnerScreen");
  let currentRank = 1;
  let lastScore = null;
  let sameRankCount = 0;

  const winner = sortedTeams[0];
  const winnerDisplay = document.getElementById("winnerDisplay");
  if (winner) {
    winnerDisplay.innerHTML = `
      <div class="champion-trophy">🏆</div>
      <h1 class="champion-title">LEAGUE CHAMPIONS</h1>
      <div class="champion-card">
         ${
           winner.logo
             ? `<img src="${formatImagePath(winner.logo)}" alt="${
                 winner.name
               }" class="champion-logo">`
             : ""
         }
         <div class="champion-info">
            <div class="champion-name">${winner.name}</div>
            <div class="champion-score">${
              winner.score
            } <span class="pts">PTS</span></div>
         </div>
      </div>
    `;
  }

  const finalScoreboard = document.getElementById("finalScoreboard");
  document.getElementById("winnerDisplay").innerHTML = ""; 

  finalScoreboard.innerHTML = `
    <h2 class="standings-header">FINAL STANDINGS</h2>
    <div class="leaderboard-container">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Main Score</th>
            <th>Tie Breaker</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTeams
            .map((team, index) => {
              // Rank calculation logic
              const currentTotal = team.score + (team.tieBreakerScore || 0);
              const lastTotal =
                lastScore !== null
                  ? lastScore + (sortedTeams[index - 1]?.tieBreakerScore || 0)
                  : null;

              if (lastTotal !== null && currentTotal < lastTotal) {
                currentRank += sameRankCount;
                sameRankCount = 1;
              } else if (lastTotal !== null && team.score === lastScore) {
                if (
                  team.tieBreakerScore ===
                  sortedTeams[index - 1]?.tieBreakerScore
                ) {
                  sameRankCount++;
                } else {
                  currentRank += sameRankCount;
                  sameRankCount = 1;
                }
              } else {
                sameRankCount = 1;
              }
              lastScore = team.score;
              const rank = currentRank;

              return `
              <tr class="rank-row ${rank === 1 ? "rank-gold" : ""} ${
                rank === 2 ? "rank-silver" : ""
              } ${rank === 3 ? "rank-bronze" : ""}">
                <td class="rank-cell">#${rank}</td>
                <td class="team-cell">
                  ${
                    team.logo
                      ? `<img src="${formatImagePath(
                          team.logo
                        )}" class="lb-logo">`
                      : ""
                  }
                  ${team.name}
                </td>
                <td class="score-cell">${team.score}</td>
                <td class="tb-cell">${
                  team.tieBreakerScore > 0 ? "+" + team.tieBreakerScore : "-"
                }</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function closeGame() {
  if (confirm("Close the game and return to admin panel?")) {
    window.close();
  }
}

document.addEventListener("keydown", (e) => {
  if (gameState.currentRound === "ROUND_2" && !gameState.buzzerLocked) {
    const keyMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
    const teamIndex = keyMap[e.key];

    if (teamIndex !== undefined && teamIndex < gameState.teams.length) {
      handleBuzzerPress(gameState.teams[teamIndex].id);
    }
  }

  if (gameState.currentRound === "TIE_BREAKER" && !gameState.buzzerLocked) {
    const keyMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
    const teamIndex = keyMap[e.key];

    if (teamIndex !== undefined && teamIndex < gameState.teams.length) {
      gameState.buzzerPressedBy = gameState.teams[teamIndex].id;
      const team = gameState.teams[teamIndex];
      alert(`${team.name} buzzed in!`);
      stopTimer();
    }
  }
});

window.showRules = showRules;
window.startRound1 = startRound1;
window.selectAnswer = selectAnswer;
window.selectSkipAnswer = selectSkipAnswer;
window.nextQuestion = nextQuestion;
window.stopTimerButton = stopTimerButton;
window.resumeTimer = resumeTimer;
window.backQuestion = backQuestion;
window.useLifeline = useLifeline;
window.selectAudienceAnswer = selectAudienceAnswer;
window.showAudienceQuestionButton = showAudienceQuestionButton;
window.continueGame = continueGame;
window.unlockBuzzer = unlockBuzzer;
window.selectBuzzerTeam = selectBuzzerTeam;
window.selectBuzzerAnswer = selectBuzzerAnswer;
window.nextBuzzerQuestion = nextBuzzerQuestion;
window.startTieBreaker = startTieBreaker;
window.selectTBAnswer = selectTBAnswer;
window.nextTBQuestion = nextTBQuestion;
window.showWinner = showWinner;
window.closeGame = closeGame;
