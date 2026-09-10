import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { Storage } from '../utils/storage';
import { SavedGame, GameSession } from '../types';

const ADMIN_PASSWORD = 'admin123';

let adminWindow: BrowserWindow | null = null;
let gameWindow: BrowserWindow | null = null;

function createAdminWindow() {
  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../../public/Logo.ico'),
    title: 'GRIP League - Admin Panel',
  });

  adminWindow.loadFile(path.join(__dirname, '../../src/renderer/admin/login.html'));

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

function createGameWindow(gameId: string) {
  gameWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../../public/Logo.ico'),
    title: 'GRIP League - Game Display',
  });

  gameWindow.loadFile(path.join(__dirname, '../../src/renderer/game/index.html'));

  gameWindow.webContents.on('did-finish-load', () => {
    const game = Storage.getGameById(gameId);
    if (game && gameWindow) {
      gameWindow.webContents.send('load-game', game);
    }
  });

  gameWindow.on('closed', () => {
    gameWindow = null;
  });
}

ipcMain.handle('verify-password', async (event, password: string) => {
  return password === ADMIN_PASSWORD;
});

ipcMain.handle('get-all-games', async () => {
  return Storage.getAllGames();
});

ipcMain.handle('save-game', async (event, game: SavedGame) => {
  return Storage.saveGame(game);
});

ipcMain.handle('get-game', async (event, id: string) => {
  return Storage.getGameById(id);
});

ipcMain.handle('delete-game', async (event, id: string) => {
  return Storage.deleteGame(id);
});

ipcMain.handle('generate-id', async () => {
  return Storage.generateId();
});

ipcMain.handle('update-game-result', async (event, result: { gameId: string; highestScore: any }) => {
  return Storage.updateGameResult(result.gameId, { highestScore: result.highestScore });
});

ipcMain.on('open-game-window', (event, gameId: string) => {
  createGameWindow(gameId);
});

ipcMain.on('close-game-window', () => {
  if (gameWindow) {
    gameWindow.close();
  }
});

app.whenReady().then(() => {
  createAdminWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAdminWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
