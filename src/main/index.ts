import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let displayWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: '說書人魔典',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: process.env.NODE_ENV === 'production', // 開發模式禁用 webSecurity
      devTools: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createDisplayWindow(): void {
  displayWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: '城鎮公告',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: process.env.NODE_ENV === 'production', // 開發模式禁用 webSecurity
      devTools: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    displayWindow.loadURL('http://localhost:5173/#/display');
  } else {
    displayWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/display',
    });
  }

  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createDisplayWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// IPC Relay - Phase 1: State Sync
// 純轉發，無業務邏輯
ipcMain.on('state-sync', (_event, state) => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('state-update', state);
  }
});
