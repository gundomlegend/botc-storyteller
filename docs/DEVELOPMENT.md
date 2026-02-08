# 開發指南

本文件提供開發規範、最佳實踐和常見問題解答。

---

## 開發環境設置

### 必要工具

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **編輯器**: VS Code（推薦）
- **Git**: 版本控制

### VS Code 擴展推薦
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 環境變數

開發模式下 `NODE_ENV=development` 由 `cross-env` 在啟動腳本中自動設置，無需額外配置。

---

## 程式碼規範

### TypeScript 規範

#### 1. 明確的類型定義
```typescript
// ✓ 好
function processAbility(player: Player, target: Player | null): NightResult {
  // ...
}

// ✗ 不好
function processAbility(player: any, target: any): any {
  // ...
}
```

#### 2. 避免使用 `any`
```typescript
// ✓ 好
const players: Map<number, Player> = new Map();

// ✗ 不好
const players: any = new Map();
```

#### 3. 使用介面而非類型別名（除非必要）
```typescript
// ✓ 好
interface Player {
  seat: number;
  name: string;
}

// ✗ 不好（除非需要聯合類型）
type Player = {
  seat: number;
  name: string;
};
```

### 命名規範

#### 檔案命名
```
PascalCase  : 組件檔案 (PlayerCard.tsx)
camelCase   : 工具函數 (formatDate.ts)
kebab-case  : 樣式檔案 (player-card.css)
UPPER_CASE  : 常數檔案 (CONSTANTS.ts)
```

#### 變數命名
```typescript
// 布林值：使用 is/has/can 前綴
const isAlive = true;
const hasAbility = false;
const canVote = true;

// 函數：使用動詞開頭
function getPlayer() {}
function setStatus() {}
function handleClick() {}

// 組件：使用 PascalCase
function PlayerCard() {}
function NightView() {}
```

### 組件規範

#### React 函數組件模板
```typescript
import React, { useState } from 'react';
import { Player } from '../engine/types';

interface PlayerCardProps {
  player: Player;
  onClick?: (player: Player) => void;
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    onClick?.(player);
  };
  
  return (
    <div 
      className="player-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <span>{player.seat}號 - {player.name}</span>
      {!player.isAlive && <span>💀</span>}
    </div>
  );
}
```

### 註解規範
```typescript
/**
 * 處理玩家的夜間能力
 * 
 * @param player - 執行能力的玩家
 * @param target - 目標玩家（可選）
 * @param gameState - 當前遊戲狀態
 * @returns 能力處理結果
 * 
 * @example
 * const result = processNightAbility(
 *   fortuneteller,
 *   imp,
 *   gameState
 * );
 */
function processNightAbility(
  player: Player,
  target: Player | null,
  gameState: GameState
): NightResult {
  // ...
}
```

---

## Git 工作流程

### 分支策略
```
main        : 穩定版本
develop     : 開發分支
feature/*   : 功能分支
bugfix/*    : 錯誤修復分支
```

### Commit 訊息規範

使用 [Conventional Commits](https://www.conventionalcommits.org/)：
```
feat: 新增占卜師處理器
fix: 修復僧侶不能保護自己的檢查
docs: 更新 README
style: 格式化程式碼
refactor: 重構 GameState 類別
test: 新增 RuleEngine 測試
chore: 更新依賴套件
```

### 範例工作流程
```bash
# 1. 建立功能分支
git checkout -b feature/add-empath-handler

# 2. 開發並提交
git add src/engine/handlers/EmpathHandler.ts
git commit -m "feat: 新增共情者處理器"

# 3. 推送到遠端
git push origin feature/add-empath-handler

# 4. 建立 Pull Request
# 在 GitHub 上建立 PR

# 5. 合併後刪除分支
git branch -d feature/add-empath-handler
```

---

## 測試指南

### 測試結構
```
src/
└── engine/
    ├── __tests__/
    │   ├── GameState.test.ts
    │   ├── RuleEngine.test.ts
    │   └── handlers/
    │       ├── FortunetellerHandler.test.ts
    │       └── MonkHandler.test.ts
    ├── GameState.ts
    └── RuleEngine.ts
```

### 測試範例
```typescript
import { GameStateManager } from '../GameState';

describe('GameStateManager', () => {
  let manager: GameStateManager;
  
  beforeEach(() => {
    manager = new GameStateManager();
  });
  
  describe('初始化', () => {
    test('應該正確初始化玩家', () => {
      manager.initializePlayers([
        { seat: 1, name: '測試1', role: 'fortuneteller' },
        { seat: 2, name: '測試2', role: 'imp' }
      ]);
      
      expect(manager.getAllPlayers().length).toBe(2);
      expect(manager.getPlayer(1)?.role).toBe('fortuneteller');
    });
  });
  
  describe('狀態管理', () => {
    beforeEach(() => {
      manager.initializePlayers([
        { seat: 1, name: '測試', role: 'fortuneteller' }
      ]);
    });
    
    test('應該正確添加中毒狀態', () => {
      manager.addStatus(1, 'poisoned');
      expect(manager.hasStatus(1, 'poisoned')).toBe(true);
    });
    
    test('應該在新夜晚清除保護狀態', () => {
      manager.addStatus(1, 'protected');
      manager.startNight();
      expect(manager.hasStatus(1, 'protected')).toBe(false);
    });
  });
});
```

### 執行測試
```bash
# 執行所有測試
npm test

# 執行特定測試
npm test GameState

# 執行測試並顯示覆蓋率
npm test -- --coverage

# 監聽模式
npm test -- --watch

# 類型檢查（Renderer + Engine）
npx tsc --noEmit

# 類型檢查（Main process）
npx tsc -p tsconfig.main.json --noEmit
```

---

## 除錯技巧

### 使用 Console
```typescript
// 開發環境專用的 log
if (process.env.NODE_ENV === 'development') {
  console.log('[GameState] 初始化玩家：', players);
}

// 使用 console.table 顯示複雜資料
console.table(nightOrder);

// 使用 console.group 組織輸出
console.group('夜間能力處理');
console.log('玩家：', player);
console.log('目標：', target);
console.log('結果：', result);
console.groupEnd();
```

### Electron DevTools
```typescript
// src/main/index.ts
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}
```

### React DevTools
```bash
# 安裝 React DevTools
npm install -g react-devtools
```

---

## 效能優化

### React 最佳實踐

#### 1. 使用 React.memo
```typescript
export const PlayerCard = React.memo(function PlayerCard({ player }: Props) {
  // ...
});
```

#### 2. 避免不必要的重新渲染
```typescript
// ✓ 好
const handleClick = useCallback(() => {
  onClick(player);
}, [player, onClick]);

// ✗ 不好（每次渲染都建立新函數）
const handleClick = () => {
  onClick(player);
};
```

#### 3. 使用 useMemo 快取計算結果
```typescript
const nightOrder = useMemo(() => {
  return manager.generateNightOrder(isFirstNight);
}, [isFirstNight, players]);
```

---

## 常見問題

### Q1: TypeScript 編譯錯誤

**問題**: `Cannot find module './data/roles/trouble-brewing.json'`

**解決**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

### Q2: Electron 視窗無法開啟

**問題**: `Error: spawn ENOENT`

**解決**:
```bash
# 重新安裝 Electron
rm -rf node_modules
npm install
```

### Q3: 狀態更新不生效

**問題**: 修改狀態後 UI 沒有更新

**解決**:
```typescript
// ✗ 不好（直接修改）
player.isPoisoned = true;

// ✓ 好（使用狀態管理）
manager.addStatus(player.seat, 'poisoned');
```

### Q4: 角色資料載入失敗

**問題**: 無法讀取角色資料

**解決**:
```typescript
// 確保正確的 import
import rolesData from './data/roles/trouble-brewing.json';
const roles: RoleData[] = rolesData as RoleData[];
```

---

## 發布流程

### 版本號規則

遵循 [Semantic Versioning](https://semver.org/)：
```
MAJOR.MINOR.PATCH

1.0.0 : 初始版本
1.1.0 : 新增功能
1.1.1 : 錯誤修復
2.0.0 : 重大變更
```

### 建置步驟
```bash
# 1. 更新版本號
npm version patch  # 或 minor / major

# 2. 建置應用程式
npm run build

# 3. 打包為可執行檔
npm run package

# 4. 測試建置結果
# 在 release/ 目錄檢查輸出檔案

# 5. 建立 Git 標籤
git tag v1.0.0
git push origin v1.0.0

# 6. 發布（如果有）
# 上傳到 GitHub Releases
```

---

## 資源連結

### 官方文檔

- [React 文檔](https://react.dev/)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)
- [Electron 文檔](https://www.electronjs.org/docs/)

### 專案相關

- [Blood on the Clocktower 官網](https://bloodontheclocktower.com/)
- [Pocket Grimoire](https://github.com/Skateside/pocket-grimoire)

### 開發工具

- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)