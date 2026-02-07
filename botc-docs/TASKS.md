# 開發任務清單

本文件列出所有開發任務，按階段組織。每個任務都包含驗收標準（AC）。

---

## 第一週：規則引擎核心

### Day 1: 專案初始化

#### Task 1.1: 建立專案基礎架構
- [ ] 執行 `npx create-react-app` 建立專案
- [ ] 安裝 Electron 相關依賴
- [ ] 建立 `public/electron.js`
- [ ] 配置 `package.json` 的 scripts

**AC**: 執行 `npm run electron-dev` 能開啟兩個視窗

#### Task 1.2: 建立目錄結構
- [ ] 建立 `src/data/roles/` 目錄
- [ ] 建立 `src/engine/handlers/` 目錄
- [ ] 建立 `src/store/` 目錄
- [ ] 建立 `src/components/` 目錄
- [ ] 建立 `docs/` 目錄

**AC**: 所有目錄已建立且結構正確

#### Task 1.3: 準備角色資料
- [ ] 建立 `trouble-brewing.json`（包含 16 個角色）
- [ ] 建立 `jinxes.json`（包含 Jinx 規則）
- [ ] 驗證 JSON 格式正確

**AC**: 可以在 TypeScript 中 import 並使用這些資料

---

### Day 2-3: 類型定義與狀態管理

#### Task 2.1: 定義核心類型
檔案：`src/engine/types.ts`

需要定義的介面：
- [ ] `RoleData` - 角色資料結構
- [ ] `Player` - 玩家資料結構
- [ ] `GameState` - 遊戲狀態結構
- [ ] `NightOrderItem` - 夜間順序項目
- [ ] `NightResult` - 能力處理結果
- [ ] `HandlerContext` - 處理器上下文
- [ ] `RoleHandler` - 處理器介面

**AC**: 
- 所有類型定義完成
- 可以被其他檔案正確 import
- 無 TypeScript 編譯錯誤

#### Task 2.2: 實作 GameStateManager
檔案：`src/engine/GameState.ts`

需要實作的方法：
- [ ] `constructor()` - 初始化狀態和角色註冊表
- [ ] `initializePlayers(players)` - 初始化玩家
- [ ] `getPlayer(seat)` - 獲取玩家
- [ ] `getAllPlayers()` - 獲取所有玩家
- [ ] `getAlivePlayers()` - 獲取存活玩家
- [ ] `hasAliveRole(role)` - 檢查角色是否存活
- [ ] `getAlignment(player)` - 獲取陣營
- [ ] `addStatus(seat, type, data)` - 添加狀態
- [ ] `removeStatus(seat, type)` - 移除狀態
- [ ] `hasStatus(seat, type)` - 檢查狀態
- [ ] `killPlayer(seat, cause)` - 殺死玩家
- [ ] `markAbilityUsed(seat)` - 標記能力已使用
- [ ] `startNight()` - 開始夜間
- [ ] `startDay()` - 開始白天
- [ ] `generateNightOrder(isFirstNight)` - 生成夜間順序
- [ ] `logEvent(event)` - 記錄事件
- [ ] `getHistory()` - 獲取歷史記錄
- [ ] `getMinionPlayers()` - 獲取所有爪牙
- [ ] `getDemonPlayer()` - 獲取惡魔
- [ ] `generateDemonBluffs()` - 生成三個虛張聲勢角色
- [ ] `getDemonBluffs()` - 獲取虛張聲勢角色

**AC**:
- 所有方法實作完成
- 通過單元測試
- 可以正確管理遊戲狀態

**測試用例**:
```typescript
const manager = new GameStateManager();
manager.initializePlayers([
  { seat: 1, name: '玩家1', role: 'fortuneteller' },
  { seat: 2, name: '玩家2', role: 'imp' }
]);

// 測試 1: 初始化
assert(manager.getAllPlayers().length === 2);
assert(manager.getPlayer(1)?.role === 'fortuneteller');

// 測試 2: 狀態管理
manager.addStatus(1, 'poisoned');
assert(manager.hasStatus(1, 'poisoned') === true);

// 測試 3: 夜間順序
manager.startNight();
const order = manager.generateNightOrder(true);
assert(order.length > 0);

// 測試 4: 生成虛張聲勢
const bluffs = manager.generateDemonBluffs();
assert(bluffs.length === 3);
assert(!bluffs.includes(anyAssignedRole));

// 測試 5: 獲取邪惡玩家
const minions = manager.getMinionPlayers();
const demon = manager.getDemonPlayer();
assert(minions.length > 0);
assert(demon !== undefined);

// 測試 6: 第一夜順序包含特殊階段
const order = manager.generateNightOrder(true);
assert(order[0].role === '__minion_demon_recognition__');
assert(order[1].role === '__demon_bluffs__');
```

---

### Day 4-5: 規則引擎與角色處理器

#### Task 3.1: 實作 RuleEngine
檔案：`src/engine/RuleEngine.ts`

需要實作的方法：
- [ ] `constructor()` - 載入角色和 Jinx 資料
- [ ] `processNightAbility(player, target, gameState, stateManager)` - 處理夜間能力
- [ ] `defaultHandler(roleData, player, infoReliable, statusReason)` - 預設處理器
- [ ] `checkJinxes(roleId, stateManager)` - 檢查 Jinx
- [ ] `getRoleData(roleId)` - 獲取角色資料
- [ ] `processFirstNightSpecial(type, stateManager)` - 處理第一夜特殊階段
- [ ] `processMinionDemonRecognition(stateManager)` - 處理爪牙惡魔互認
- [ ] `processDemonBluffs(stateManager)` - 處理惡魔虛張聲勢

**AC**:
- 第一夜順序自動包含特殊階段
- 爪牙惡魔互認顯示正確的玩家
- 惡魔虛張聲勢生成三個未分配角色
- 虛張聲勢不包含任何已分配的角色
- 可以正確處理簡單角色（使用預設處理器）
- 可以檢測中毒/醉酒狀態
- 可以檢測 Jinx 規則
- 可以調用特殊角色處理器

#### Task 3.2: 實作占卜師處理器
檔案：`src/engine/handlers/FortunetellerHandler.ts`

功能需求：
- [ ] 未選擇目標時，返回需要輸入
- [ ] 獲取目標真實陣營
- [ ] 檢查中毒/醉酒狀態
- [ ] 檢查 Jinx（如寡婦）
- [ ] 返回正確的查驗結果

**AC**:
```typescript
// 測試案例
const handler = new FortunetellerHandler();

// 正常狀態查驗惡魔
const result1 = handler.process({
  player: { /* 占卜師，正常狀態 */ },
  target: { /* 小惡魔 */ },
  infoReliable: true,
  statusReason: ''
});
assert(result1.info === 'evil');
assert(result1.gesture === 'shake');
assert(result1.canLie === true);

// 中毒狀態查驗惡魔
const result2 = handler.process({
  player: { /* 占卜師，中毒 */ },
  target: { /* 小惡魔 */ },
  infoReliable: false,
  statusReason: '中毒'
});
assert(result2.info === 'good'); // 反轉
assert(result2.mustFollow === true);
```

#### Task 3.3: 實作僧侶處理器
檔案：`src/engine/handlers/MonkHandler.ts`

功能需求：
- [ ] 檢查是否選擇目標
- [ ] 檢查不能保護自己
- [ ] 返回保護結果

**AC**: 可以正確添加保護狀態

#### Task 3.4: 實作投毒者處理器
檔案：`src/engine/handlers/PoisonerHandler.ts`

功能需求：
- [ ] 檢查是否選擇目標
- [ ] 返回中毒結果

**AC**: 可以正確添加中毒狀態

#### Task 3.5: 實作小惡魔處理器
檔案：`src/engine/handlers/ImpHandler.ts`

功能需求：
- [ ] 檢查是否選擇目標
- [ ] 檢查目標是否受保護
- [ ] 檢查目標是否為士兵
- [ ] 返回擊殺結果

**AC**: 
- 正常擊殺成功
- 保護狀態時擊殺失敗
- 士兵無法被擊殺

#### Task 3.6: 實作酒鬼處理器
檔案：`src/engine/handlers/DrunkHandler.ts`

功能需求：
- [ ] 返回跳過（酒鬼無夜間行動）

**AC**: 正確返回跳過訊息

#### Task 3.7: 註冊所有處理器
檔案：`src/engine/handlers/index.ts`

- [ ] 匯出處理器 Map
- [ ] 註冊所有 5 個處理器

**AC**: RuleEngine 可以正確調用所有處理器

---

## 第二週：UI 介面開發

### Day 1: 雙視窗架構

#### Task 4.1: 建立主視窗組件
檔案：`src/components/MainWindow.tsx`

功能需求：
- [ ] 顯示遊戲階段切換按鈕
- [ ] 根據階段顯示夜間/白天視圖
- [ ] 簡單的列表式布局

**AC**: 可以切換夜間/白天視圖

#### Task 4.2: 建立公共顯示組件
檔案：`src/components/DisplayWindow.tsx`

功能需求：
- [ ] 全螢幕黑色背景
- [ ] 顯示當前階段文字
- [ ] 簡單的居中布局

**AC**: 可以顯示階段資訊

#### Task 4.3: 配置路由
- [ ] 安裝 react-router-dom
- [ ] 配置 `/` 顯示主視窗
- [ ] 配置 `/display` 顯示公共視窗

**AC**: 兩個視窗顯示不同內容

---

### Day 2-3: 夜間流程 UI

#### Task 5.1: 建立夜間視圖
檔案：`src/components/NightView.tsx`

功能需求：
- [ ] 左側顯示夜間清單
- [ ] 右側顯示當前處理的角色
- [ ] 可以點擊清單跳轉
- [ ] 顯示當前進度

**AC**: 可以瀏覽完整夜間清單

#### Task 5.2: 建立能力處理器組件
檔案：`src/components/AbilityProcessor.tsx`

功能需求：
- [ ] 顯示角色資訊
- [ ] 顯示玩家選擇器
- [ ] 顯示規則判定結果
- [ ] 提供確認/重選按鈕

**AC**: 可以完成完整的能力處理流程

#### Task 5.3: 建立玩家選擇器
檔案：`src/components/PlayerSelector.tsx`

功能需求：
- [ ] 顯示所有玩家按鈕
- [ ] 標示已死亡玩家
- [ ] 支援選擇回調

**AC**: 可以選擇玩家

---

### Day 4-5: 白天流程 UI

#### Task 6.1: 建立白天視圖
檔案：`src/components/DayView.tsx`

功能需求：
- [ ] 顯示玩家狀態列表
- [ ] 顯示提名列表
- [ ] 提供新增提名按鈕

**AC**: 可以查看白天資訊

#### Task 6.2: 建立提名表單
功能需求：
- [ ] 選擇提名者
- [ ] 選擇被提名者
- [ ] 提交提名

**AC**: 可以建立提名

#### Task 6.3: 建立投票介面
功能需求：
- [ ] 顯示投票者選擇
- [ ] 計算票數
- [ ] 顯示特殊票數（如間諜）
- [ ] 判定是否通過

**AC**: 可以完成投票流程

---

## 第三週：整合測試

### Day 1-3: 完整流程測試

#### Task 7.1: 第一夜流程測試
- [ ] 初始化 7 位玩家
- [ ] 執行完整第一夜
- [ ] 驗證所有角色都正確處理

#### Task 7.2: 白天流程測試
- [ ] 公布死亡
- [ ] 執行提名
- [ ] 執行投票
- [ ] 處決玩家

#### Task 7.3: 第二夜流程測試
- [ ] 驗證中毒狀態生效
- [ ] 驗證保護狀態檢測
- [ ] 驗證死亡角色跳過

### Day 4-5: 邊緣案例處理

#### Task 8.1: 特殊狀態測試
- [ ] 貞潔者能力觸發
- [ ] 士兵免疫惡魔
- [ ] 僧侶保護阻擋擊殺
- [ ] 占卜師中毒給錯誤資訊

#### Task 8.2: 錯誤處理
- [ ] 選擇無效目標
- [ ] 重複操作處理
- [ ] 狀態不一致處理

---

## 完成檢查清單

### Week 1
- [ ] 專案初始化完成
- [ ] GameStateManager 實作完成
- [ ] RuleEngine 實作完成
- [ ] 5 個角色處理器完成
- [ ] 單元測試通過

### Week 2
- [ ] 雙視窗架構完成
- [ ] 夜間流程 UI 完成
- [ ] 白天流程 UI 完成
- [ ] 可以手動操作完整流程

### Week 3
- [ ] 完整流程測試通過
- [ ] 邊緣案例處理完成
- [ ] 可以運行完整遊戲
- [ ] 準備 v1.0 發布