# 血染鐘樓 AI 說書人助手

## 專案簡介

這是一個輔助說書人運行面對面血染鐘樓遊戲的桌面應用程式。

### 核心功能

- ✅ 夜間流程自動化引導
- ✅ 規則引擎自動判定能力效果
- ✅ 狀態追蹤（中毒、保護、死亡等）
- ✅ 白天流程輔助（提名、投票）
- ✅ 雙視窗架構（說書人控制台 + 公共顯示）

### 技術架構

- **前端框架**: React 18 + TypeScript
- **建置工具**: Vite 6
- **桌面應用**: Electron 33
- **狀態管理**: Zustand
- **樣式**: 基礎 CSS（無第三方 UI 框架）

### MVP 範圍

第一版只支援 **Trouble Brewing** 劇本的 22 個角色。

## 快速開始

### 前置需求

- Node.js >= 16
- npm >= 8

### 安裝步驟
```bash
# 1. 安裝依賴
npm install

# 2. 啟動開發環境（Vite + Electron 雙視窗）
npm run dev

# 3. 建置應用程式
npm run build

# 4. 打包為可執行檔
npm run package
```

## 專案結構
```
src/
├── main/                    # Electron 主程序
│   ├── index.ts            # 視窗管理（雙視窗）
│   └── preload.ts          # IPC 通訊橋接
│
├── renderer/                # React 前端（Vite root）
│   ├── App.tsx             # 主應用組件
│   ├── main.tsx            # React 入口
│   ├── index.html          # HTML 模板
│   └── styles/
│       └── global.css
│
├── data/                    # 角色資料
│   ├── roles/
│   │   └── trouble-brewing.json
│   └── jinxes.json
│
├── engine/                  # 規則引擎
│   ├── types.ts            # 類型定義
│   ├── GameState.ts        # 遊戲狀態管理
│   ├── RuleEngine.ts       # 規則引擎核心
│   └── handlers/           # 角色處理器
│       ├── index.ts
│       ├── FortunetellerHandler.ts
│       ├── MonkHandler.ts
│       ├── PoisonerHandler.ts
│       ├── ImpHandler.ts
│       └── DrunkHandler.ts
│
├── store/                   # 狀態管理
│   └── gameStore.ts
│
└── components/              # UI 組件
    ├── MainWindow.tsx      # 說書人控制台
    ├── DisplayWindow.tsx   # 公共顯示
    ├── NightView.tsx       # 夜間流程
    ├── DayView.tsx         # 白天流程
    ├── AbilityProcessor.tsx
    └── PlayerSelector.tsx
```

## 開發文件

- [初始化步驟](SETUP.md) - 專案建置指南
- [開發任務](TASKS.md) - 詳細開發清單
- [開發指南](DEVELOPMENT.md) - 開發規範與最佳實踐
- [規格文件](docs/) - 各模組詳細規格

## 授權

本專案僅供學習和個人使用。Blood on the Clocktower 是 The Pandemonium Institute 的商標。

## 致謝

- 角色資料參考 [Pocket Grimoire](https://github.com/Skateside/pocket-grimoire)
- 遊戲規則來自 [Blood on the Clocktower 官方網站](https://bloodontheclocktower.com/)