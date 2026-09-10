import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { SavedGame, GameSession } from "../types";

const USER_DATA_PATH = app.getPath("userData");
const DATA_DIR = path.join(USER_DATA_PATH, "data");
const GAMES_FILE = path.join(DATA_DIR, "games.json");

const DEFAULT_GAMES: SavedGame[] = [
  {
    id: "game_placeholder_1",
    title: "GRIP League Demo",
    gameType: "RESPIRATORY",
    dateCreated: new Date().toISOString(),
    numberOfTeams: 3,
    teams: [
      { id: "team_1", name: "Alpha Squad", logo: "" },
      { id: "team_2", name: "Beta Blockers", logo: "" },
      { id: "team_3", name: "Gamma Rays", logo: "" },
    ],
    round1Questions: Array(15)
      .fill(null)
      .map((_, i) => ({
        id: `q_r1_${i}`,
        text: `Demo Question ${
          i + 1
        }: What is the primary function of the respiratory system?`,
        options: ["Gas Exchange", "Digestion", "Circulation", "Movement"],
        correctAnswer: 0,
        category: "Respiratory",
      })),
    round2Questions: Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `q_r2_${i}`,
        text: `Buzzer Question ${
          i + 1
        }: Which organ is primarily responsible for pumping blood?`,
        options: ["Heart", "Lungs", "Liver", "Brain"],
        correctAnswer: 0,
        category: "General",
      })),
    audienceQuestions: Array(3)
      .fill(null)
      .map((_, i) => ({
        id: `q_aud_${i}`,
        text: `Audience Poll ${i + 1}: Who will win today?`,
        options: ["Alpha", "Beta", "Gamma", "Draw"],
        correctAnswer: 0,
      })),
    tieBreakerQuestions: Array(5)
      .fill(null)
      .map((_, i) => ({
        id: `q_tb_${i}`,
        text: `Tie Breaker ${i + 1}: Speed Question!`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
      })),
    skipQuestions: Array(3)
      .fill(null)
      .map((_, i) => ({
        id: `q_skip_${i}`,
        text: `Skip Question ${i + 1}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
      })),
  },
  {
    id: "game_placeholder_2",
    title: "Oncology Challenge",
    gameType: "GASTRO",
    dateCreated: new Date().toISOString(),
    numberOfTeams: 2,
    teams: [
      { id: "team_1", name: "Chemo Champions", logo: "" },
      { id: "team_2", name: "Radio Rebels", logo: "" },
    ],
    round1Questions: Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `q_onc_${i}`,
        text: `Oncology Question ${i + 1}: Define metastasis.`,
        options: ["Spread of cancer", "Cell division", "DNA repair", "None"],
        correctAnswer: 0,
      })),
    round2Questions: Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `q_onc_r2_${i}`,
        text: `Round 2 Q${i + 1}: What does T stand for in TNM staging?`,
        options: ["Tumor", "Time", "Target", "Type"],
        correctAnswer: 0,
      })),
    audienceQuestions: Array(2)
      .fill(null)
      .map((_, i) => ({
        id: `q_onc_aud_${i}`,
        text: `Audience Q${i + 1}: Best prevention method?`,
        options: ["Screening", "Diet", "Exercise", "All above"],
        correctAnswer: 3,
      })),
    tieBreakerQuestions: Array(5)
      .fill(null)
      .map((_, i) => ({
        id: `q_onc_tb_${i}`,
        text: `TB Q${i + 1}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
      })),
    skipQuestions: Array(2)
      .fill(null)
      .map((_, i) => ({
        id: `q_onc_skip_${i}`,
        text: `Skip Q${i + 1}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
      })),
  },
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(GAMES_FILE)) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(DEFAULT_GAMES, null, 2));
}

export class Storage {
  static getAllGames(): SavedGame[] {
    try {
      const data = fs.readFileSync(GAMES_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading games:", error);
      return [];
    }
  }

  static saveGame(game: SavedGame): boolean {
    try {
      const games = this.getAllGames();
      const existingIndex = games.findIndex((g) => g.id === game.id);

      if (existingIndex >= 0) {
        games[existingIndex] = game;
      } else {
        games.push(game);
      }

      fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving game:", error);
      return false;
    }
  }

  static getGameById(id: string): SavedGame | null {
    const games = this.getAllGames();
    return games.find((g) => g.id === id) || null;
  }

  static deleteGame(id: string): boolean {
    try {
      const games = this.getAllGames();
      const filtered = games.filter((g) => g.id !== id);
      fs.writeFileSync(GAMES_FILE, JSON.stringify(filtered, null, 2));
      return true;
    } catch (error) {
      console.error("Error deleting game:", error);
      return false;
    }
  }

  static generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static updateGameResult(
    gameId: string,
    result: { highestScore: any }
  ): boolean {
    try {
      const games = this.getAllGames();
      const gameIndex = games.findIndex((g) => g.id === gameId);

      if (gameIndex >= 0) {
        const game = games[gameIndex];

        if (
          !game.highestScore ||
          result.highestScore.score > game.highestScore.score
        ) {
          games[gameIndex] = {
            ...game,
            highestScore: result.highestScore,
            lastPlayedDate: new Date().toISOString(),
          };

          fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
          return true;
        }

        games[gameIndex].lastPlayedDate = new Date().toISOString();
        fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating game result:", error);
      return false;
    }
  }
}
