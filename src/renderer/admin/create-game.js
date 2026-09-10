const { ipcRenderer } = require('electron');

const TEAM_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

let questionCounters = {
  round1: 0,
  round2: 0,
  audience: 0,
  tiebreaker: 0,
  skip: 0
};

let editingGameId = null;
let existingGameData = null;

function switchTab(tabName) {
  
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

function generateTeamInputs() {
  const numberOfTeams = parseInt(document.getElementById('numberOfTeams').value);
  const teamInputs = document.getElementById('teamInputs');

  if (!numberOfTeams) {
    return;
  }

  teamInputs.innerHTML = '';

  for (let i = 0; i < numberOfTeams; i++) {
    teamInputs.innerHTML += `
      <div class="team-card">
        <div class="team-card-header">Team ${i + 1}</div>
        <div class="team-grid">
          <div class="form-group">
            <label>Team Name <span class="required">*</span></label>
            <input type="text" id="teamName${i}" required placeholder="e.g., Team Alpha">
          </div>
          <div class="form-group">
            <label>Team Logo</label>
            <div class="logo-upload-area">
              <div class="logo-preview" id="logoPreview${i}">
                <span class="logo-preview-placeholder">🖼️</span>
              </div>
              <div class="file-input-btn">
                <input type="file" id="teamLogo${i}" accept="image/*" onchange="previewLogo(${i})">
                <label for="teamLogo${i}">📁 Choose Logo</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  generateRound1Questions(numberOfTeams);

  generateSkipQuestions(numberOfTeams);
}

function generateRound1Questions(numberOfTeams) {
  const questionsNeeded = numberOfTeams * 5; 
  const container = document.getElementById('round1Questions');
  const description = document.getElementById('round1Description');

  description.textContent = `${questionsNeeded} questions required (5 per team × ${numberOfTeams} teams)`;

  container.innerHTML = '';
  questionCounters.round1 = 0;

  for (let i = 0; i < questionsNeeded; i++) {
    const questionId = `round1_${questionCounters.round1++}`;
    const teamNum = Math.floor(i / 5) + 1;
    const questionNum = (i % 5) + 1;

    const questionHTML = `
      <div class="question-item" id="${questionId}">
        <div class="question-header">
          <h3>Team ${teamNum} - Question ${questionNum}</h3>
        </div>

        <div class="form-group">
          <label>Question Text <span class="required">*</span></label>
          <textarea class="question-text" required placeholder="Enter your question here"></textarea>
        </div>

        <div class="form-group">
          <label>Answer Options <span class="required">*</span></label>
          <div class="question-options">
            <div>
              <span class="option-label">Option A</span>
              <input type="text" class="option" placeholder="First option" required>
            </div>
            <div>
              <span class="option-label">Option B</span>
              <input type="text" class="option" placeholder="Second option" required>
            </div>
            <div>
              <span class="option-label">Option C</span>
              <input type="text" class="option" placeholder="Third option" required>
            </div>
            <div>
              <span class="option-label">Option D</span>
              <input type="text" class="option" placeholder="Fourth option" required>
            </div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Correct Answer <span class="required">*</span></label>
            <select class="correct-answer" required>
              <option value="">Select Correct Answer</option>
              <option value="0">Option A</option>
              <option value="1">Option B</option>
              <option value="2">Option C</option>
              <option value="3">Option D</option>
            </select>
          </div>

          <div class="form-group">
            <label>Category (Optional)</label>
            <input type="text" class="category" placeholder="e.g., Pricing, Clinical Data">
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', questionHTML);
  }
}

function generateSkipQuestions(numberOfTeams) {
  const container = document.getElementById('skipQuestions');

  container.innerHTML = '';
  questionCounters.skip = 0;

  for (let i = 0; i < numberOfTeams; i++) {
    const questionId = `skip_${questionCounters.skip++}`;
    const teamNum = i + 1;

    const questionHTML = `
      <div class="question-item" id="${questionId}">
        <div class="question-header">
          <h3>Team ${teamNum} Skip Question</h3>
        </div>

        <div class="form-group">
          <label>Question Text <span class="required">*</span></label>
          <textarea class="question-text" required placeholder="Enter skip question for Team ${teamNum}"></textarea>
        </div>

        <div class="form-group">
          <label>Answer Options <span class="required">*</span></label>
          <div class="question-options">
            <div>
              <span class="option-label">Option A</span>
              <input type="text" class="option" placeholder="First option" required>
            </div>
            <div>
              <span class="option-label">Option B</span>
              <input type="text" class="option" placeholder="Second option" required>
            </div>
            <div>
              <span class="option-label">Option C</span>
              <input type="text" class="option" placeholder="Third option" required>
            </div>
            <div>
              <span class="option-label">Option D</span>
              <input type="text" class="option" placeholder="Fourth option" required>
            </div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Correct Answer <span class="required">*</span></label>
            <select class="correct-answer" required>
              <option value="">Select Correct Answer</option>
              <option value="0">Option A</option>
              <option value="1">Option B</option>
              <option value="2">Option C</option>
              <option value="3">Option D</option>
            </select>
          </div>

          <div class="form-group">
            <label>Category (Optional)</label>
            <input type="text" class="category" placeholder="e.g., Skip Question">
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', questionHTML);
  }
}

function previewLogo(teamIndex) {
  const fileInput = document.getElementById(`teamLogo${teamIndex}`);
  const preview = document.getElementById(`logoPreview${teamIndex}`);

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();

    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Team Logo">`;
    };

    reader.readAsDataURL(fileInput.files[0]);
  }
}

function addQuestion(roundType) {
  const container = document.getElementById(`${roundType}Questions`);
  const questionId = `${roundType}_${questionCounters[roundType]++}`;

  const questionHTML = `
    <div class="question-item" id="${questionId}">
      <div class="question-header">
        <h3>Question ${questionCounters[roundType]}</h3>
        <button type="button" class="btn btn-danger" onclick="removeQuestion('${questionId}', '${roundType}')" style="padding: 8px 20px; font-size: 0.9rem;">
          🗑 Remove
        </button>
      </div>

      <div class="form-group">
        <label>Question Text <span class="required">*</span></label>
        <textarea class="question-text" required placeholder="Enter your question here"></textarea>
      </div>

      <div class="form-group">
        <label>Answer Options <span class="required">*</span></label>
        <div class="question-options">
          <div>
            <span class="option-label">Option A</span>
            <input type="text" class="option" placeholder="First option" required>
          </div>
          <div>
            <span class="option-label">Option B</span>
            <input type="text" class="option" placeholder="Second option" required>
          </div>
          <div>
            <span class="option-label">Option C</span>
            <input type="text" class="option" placeholder="Third option" required>
          </div>
          <div>
            <span class="option-label">Option D</span>
            <input type="text" class="option" placeholder="Fourth option" required>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Correct Answer <span class="required">*</span></label>
          <select class="correct-answer" required>
            <option value="">Select Correct Answer</option>
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
          </select>
        </div>

        <div class="form-group">
          <label>Category (Optional)</label>
          <input type="text" class="category" placeholder="e.g., Pricing, Clinical Data">
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', questionHTML);
}

function removeQuestion(questionId, roundType) {
  document.getElementById(questionId).remove();
  questionCounters[roundType]--;
}

function goBack() {
  window.location.href = 'dashboard.html';
}

document.getElementById('gameForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const gameTitle = document.getElementById('gameTitle').value;
  const gameType = document.getElementById('gameType').value;
  const numberOfTeams = parseInt(document.getElementById('numberOfTeams').value);

  const teams = [];
  for (let i = 0; i < numberOfTeams; i++) {
    const logoInput = document.getElementById(`teamLogo${i}`);
    let logoData = null;

    if (logoInput.files && logoInput.files[0]) {
      const reader = new FileReader();
      logoData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(logoInput.files[0]);
      });
    }

    teams.push({
      id: `team_${i + 1}`,
      name: document.getElementById(`teamName${i}`).value,
      logo: logoData,
    });
  }

  const round1Questions = collectQuestions('round1Questions');
  const round2Questions = collectQuestions('round2Questions');
  const audienceQuestions = collectQuestions('audienceQuestions');
  const tieBreakerQuestions = collectQuestions('tiebreakerQuestions');
  const skipQuestions = collectQuestions('skipQuestions');

  const gameId = editingGameId || await ipcRenderer.invoke('generate-id');

  const game = {
    id: gameId,
    title: gameTitle,
    gameType: gameType,
    dateCreated: editingGameId ? existingGameData.dateCreated : new Date().toISOString(),
    numberOfTeams: numberOfTeams,
    teams: teams,
    round1Questions: round1Questions,
    round2Questions: round2Questions,
    audienceQuestions: audienceQuestions,
    tieBreakerQuestions: tieBreakerQuestions,
    skipQuestions: skipQuestions,
  };

  const success = await ipcRenderer.invoke('save-game', game);

  if (success) {
    alert(editingGameId ? 'Game updated successfully!' : 'Game created successfully!');
    window.location.href = 'dashboard.html';
  } else {
    alert('Error saving game. Please try again.');
  }
});

function collectQuestions(containerId) {
  const container = document.getElementById(containerId);
  const questionItems = container.querySelectorAll('.question-item');
  const questions = [];

  questionItems.forEach((item, index) => {
    const text = item.querySelector('.question-text').value;
    const options = Array.from(item.querySelectorAll('.option')).map(opt => opt.value);
    const correctAnswer = parseInt(item.querySelector('.correct-answer').value);
    const category = item.querySelector('.category').value;

    questions.push({
      id: `q_${Date.now()}_${index}`,
      text: text,
      options: options,
      correctAnswer: correctAnswer,
      category: category || '',
    });
  });

  return questions;
}

window.addEventListener('load', async () => {
  
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');

  if (gameId) {
    
    editingGameId = gameId;
    existingGameData = await ipcRenderer.invoke('get-game', gameId);

    if (existingGameData) {
      loadGameData(existingGameData);
    }
  } else {
    
    setTimeout(() => {
      addQuestion('round2');
      addQuestion('audience');
      addQuestion('tiebreaker');
    }, 100);
  }
});

function loadGameData(game) {
  
  document.title = 'GRIP League - Edit Game';
  const pageTitle = document.querySelector('.create-container h1');
  if (pageTitle) {
    pageTitle.textContent = 'Edit Game';
  }

  document.getElementById('gameTitle').value = game.title;
  document.getElementById('gameType').value = game.gameType;
  document.getElementById('numberOfTeams').value = game.numberOfTeams;

  generateTeamInputs();

  game.teams.forEach((team, index) => {
    document.getElementById(`teamName${index}`).value = team.name;

    if (team.logo) {
      const preview = document.getElementById(`logoPreview${index}`);
      preview.innerHTML = `<img src="${team.logo}" alt="Team Logo">`;
    }
  });

  loadRound1QuestionData(game.round1Questions);

  game.round2Questions.forEach(question => {
    addQuestionWithData('round2', question);
  });

  game.audienceQuestions.forEach(question => {
    addQuestionWithData('audience', question);
  });

  game.tieBreakerQuestions.forEach(question => {
    addQuestionWithData('tiebreaker', question);
  });

  if (game.skipQuestions) {
    loadSkipQuestionData(game.skipQuestions);
  }
}

function loadSkipQuestionData(questions) {
  const container = document.getElementById('skipQuestions');
  const questionItems = container.querySelectorAll('.question-item');

  questions.forEach((questionData, index) => {
    if (questionItems[index]) {
      const item = questionItems[index];

      const textArea = item.querySelector('.question-text');
      if (textArea) textArea.value = questionData.text;

      const options = item.querySelectorAll('.option');
      questionData.options.forEach((optionText, optIdx) => {
        if (options[optIdx]) options[optIdx].value = optionText;
      });

      const correctAnswerSelect = item.querySelector('.correct-answer');
      if (correctAnswerSelect) correctAnswerSelect.value = questionData.correctAnswer;

      const categoryInput = item.querySelector('.category');
      if (categoryInput && questionData.category) categoryInput.value = questionData.category;
    }
  });
}

function loadRound1QuestionData(questions) {
  const container = document.getElementById('round1Questions');
  const questionItems = container.querySelectorAll('.question-item');

  questions.forEach((questionData, index) => {
    if (questionItems[index]) {
      const item = questionItems[index];

      const textArea = item.querySelector('.question-text');
      if (textArea) textArea.value = questionData.text;

      const options = item.querySelectorAll('.option');
      questionData.options.forEach((optionText, optIdx) => {
        if (options[optIdx]) options[optIdx].value = optionText;
      });

      const correctAnswerSelect = item.querySelector('.correct-answer');
      if (correctAnswerSelect) correctAnswerSelect.value = questionData.correctAnswer;

      const categoryInput = item.querySelector('.category');
      if (categoryInput) categoryInput.value = questionData.category || '';
    }
  });
}

function addQuestionWithData(roundType, questionData) {
  const container = document.getElementById(`${roundType}Questions`);
  const questionId = `${roundType}_${questionCounters[roundType]++}`;

  const questionHTML = `
    <div class="question-item" id="${questionId}">
      <div class="question-header">
        <h3>Question ${questionCounters[roundType]}</h3>
        <button type="button" class="btn btn-danger" onclick="removeQuestion('${questionId}', '${roundType}')" style="padding: 8px 20px; font-size: 0.9rem;">
          🗑 Remove
        </button>
      </div>

      <div class="form-group">
        <label>Question Text <span class="required">*</span></label>
        <textarea class="question-text" required placeholder="Enter your question here">${questionData.text}</textarea>
      </div>

      <div class="form-group">
        <label>Answer Options <span class="required">*</span></label>
        <div class="question-options">
          <div>
            <span class="option-label">Option A</span>
            <input type="text" class="option" placeholder="First option" required value="${questionData.options[0] || ''}">
          </div>
          <div>
            <span class="option-label">Option B</span>
            <input type="text" class="option" placeholder="Second option" required value="${questionData.options[1] || ''}">
          </div>
          <div>
            <span class="option-label">Option C</span>
            <input type="text" class="option" placeholder="Third option" required value="${questionData.options[2] || ''}">
          </div>
          <div>
            <span class="option-label">Option D</span>
            <input type="text" class="option" placeholder="Fourth option" required value="${questionData.options[3] || ''}">
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Correct Answer <span class="required">*</span></label>
          <select class="correct-answer" required>
            <option value="">Select Correct Answer</option>
            <option value="0" ${questionData.correctAnswer === 0 ? 'selected' : ''}>Option A</option>
            <option value="1" ${questionData.correctAnswer === 1 ? 'selected' : ''}>Option B</option>
            <option value="2" ${questionData.correctAnswer === 2 ? 'selected' : ''}>Option C</option>
            <option value="3" ${questionData.correctAnswer === 3 ? 'selected' : ''}>Option D</option>
          </select>
        </div>

        <div class="form-group">
          <label>Category (Optional)</label>
          <input type="text" class="category" placeholder="e.g., Pricing, Clinical Data" value="${questionData.category || ''}">
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', questionHTML);
}
