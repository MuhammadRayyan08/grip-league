

class SoundManager {
  constructor() {
    this.enabled = true;
    this.sounds = {};

    this.loadSound('correct', '../../../public/Audio/Correct Answer.mp3');
    this.loadSound('wrong', '../../../public/Audio/Wrong Answer.mp3');
    this.loadSound('timer', '../../../public/Audio/Timer.mp3');
    this.loadSound('gameStart', '../../../public/Audio/Game Start.mp3');
    this.loadSound('newQuestion', '../../../public/Audio/New Question.mp3');
    this.loadSound('leaderboard', '../../../public/Audio/Leaderboards Screen.mp3');
  }

  loadSound(name, path) {
    this.sounds[name] = new Audio(path);
    this.sounds[name].preload = 'auto';
  }

  playSound(name, volume = 1.0, loop = false) {
    if (!this.enabled || !this.sounds[name]) return;

    const sound = this.sounds[name].cloneNode();
    sound.volume = volume;
    sound.loop = loop;
    sound.play().catch(err => console.error('Error playing sound:', err));
    return sound;
  }

  stopSound(soundInstance) {
    if (soundInstance) {
      soundInstance.pause();
      soundInstance.currentTime = 0;
    }
  }

  playGameStart() {
    this.playSound('gameStart', 0.8);
  }

  playNewQuestion() {
    this.playSound('newQuestion', 0.6);
  }

  playCorrect() {
    this.playSound('correct', 0.7);
  }

  playWrong() {
    this.playSound('wrong', 0.7);
  }

  playTimer() {
    return this.playSound('timer', 0.5, true); 
  }

  playLeaderboard() {
    this.playSound('leaderboard', 0.8);
  }

  playBuzzer() {
    this.playNewQuestion();
  }

  playTick() {
    
  }

  playWarningTick() {
    
  }

  playDangerTick() {
    
  }

  playLifeline() {
    this.playNewQuestion();
  }

  playTransition() {
    
  }

  playQuestionAppear() {
    this.playNewQuestion();
  }

  playRoundComplete() {
    this.playLeaderboard();
  }

  playTieBreaker() {
    this.playGameStart();
  }

  playWinner() {
    this.playLeaderboard();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.soundManager = new SoundManager();
});
