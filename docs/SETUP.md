# 專案初始化步驟

本文件提供完整的專案建置指南，可直接交給 Claude Code 執行。

## 步驟 1: 建立 React + TypeScript + Vite 專案

### 執行指令
```bash
npm create vite@latest botc-storyteller -- --template react-ts
cd botc-storyteller
npm install
```

### 驗證

- ✓ 專案目錄已建立
- ✓ 執行 `npm run dev` 可以開啟 React 應用（http://localhost:5173）

---

## 步驟 2: 安裝 Electron 依賴

### 執行指令
```bash
npm install zustand
npm install -D electron electron-builder concurrently cross-env
```

### 修改 package.json

在 `package.json` 中添加/修改以下內容：
```json
{
  "name": "botc-storyteller",
  "version": "0.1.0",
  "description": "血染鐘樓說書人助手 - Blood on the Clocktower Storyteller Assistant",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json --watch & sleep 3 && cross-env NODE_ENV=development electron .",
    "dev:vite": "vite",
    "dev:electron": "tsc -p tsconfig.main.json && cross-env NODE_ENV=development electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "tsc -p tsconfig.json && vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "preview": "vite preview",
    "package": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.botc.storyteller",
    "productName": "血染鐘樓說書人助手",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

---

## 步驟 3: 建立 Electron 主程序

### 建立文件：`src/main/index.ts`
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let displayWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: '說書人控制台',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
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
    title: '公共顯示',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
```

### 建立文件：`src/main/preload.ts`
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data: unknown) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  invoke: (channel: string, data: unknown) => {
    return ipcRenderer.invoke(channel, data);
  },
});
```

### 建立文件：`tsconfig.main.json`（Electron 主程序專用）
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist/main",
    "rootDir": "src/main",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/main"]
}
```

### 驗證
```bash
npm run dev
```

應該會開啟兩個視窗：說書人控制台 + 公共顯示。

---

## 步驟 4: 建立專案目錄結構

### 執行指令
```bash
mkdir -p src/data/roles
mkdir -p src/engine/handlers
mkdir -p src/store
mkdir -p src/components

# 建立空白檔案
touch src/engine/types.ts
touch src/engine/GameState.ts
touch src/engine/RuleEngine.ts
touch src/engine/handlers/index.ts
touch src/store/gameStore.ts
```

### 驗證

檢查目錄結構是否符合：
```
src/
├── main/                # Electron 主程序
│   ├── index.ts
│   └── preload.ts
├── renderer/            # React 前端（Vite root）
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   └── styles/
├── data/
│   └── roles/
├── engine/
│   └── handlers/
├── store/
└── components/
```

---

## 步驟 5: 準備角色資料

### 建立文件：`src/data/roles/trouble-brewing.json`

從 Pocket Grimoire 複製角色資料，或使用提供的完整資料檔案。

檔案應包含 22 個角色（13 鎮民 + 4 外來者 + 4 爪牙 + 1 惡魔）。

### 建立文件：`src/data/jinxes.json`
```json
[
  {
    "id": "fortuneteller_spy",
    "role1": "fortuneteller",
    "role2": "spy",
    "reason": "間諜對占卜師顯示為善良。"
  },
  {
    "id": "fortuneteller_recluse",
    "role1": "fortuneteller",
    "role2": "recluse",
    "reason": "陌客可以對占卜師顯示為惡魔。"
  }
]
```

### 驗證
```typescript
// 在任意 .ts 檔案中測試
import rolesData from './data/roles/trouble-brewing.json';
console.log(rolesData.length); // 應該輸出 22
```

---

## 步驟 6: 配置 TypeScript

### Renderer 用：`tsconfig.json`

確保包含以下設定：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["src/renderer", "src/engine", "src/data", "src/store", "src/components"]
}
```

### Vite 配置：`vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

---

## 完成檢查清單

- [ ] React + Vite 專案已建立
- [ ] Electron 依賴已安裝
- [ ] zustand 已安裝
- [ ] package.json 已正確配置
- [ ] Electron 主程序 (src/main/index.ts) 已建立（雙視窗）
- [ ] Preload 腳本 (src/main/preload.ts) 已建立
- [ ] tsconfig.main.json 已建立
- [ ] 執行 `npm run dev` 可開啟兩個視窗
- [ ] 專案目錄結構已建立
- [ ] 角色資料檔案已準備
- [ ] TypeScript 配置正確

全部完成後，可以進入下一階段：實作規則引擎。
