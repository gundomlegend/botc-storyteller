# 開發任務清單（TASKS）

本文件列出所有開發任務，按週期與里程碑組織。每個任務都包含驗收標準（AC）。
原則：**文件與實作必須同步**，任何新增/變更都必須同時更新對應 SPEC / TASKS / 測試。

---

## 第一週：資料與核心引擎（Engine Core）

### Day 1：專案初始化（Vite + Electron 雙視窗）

#### Task 1.1：建立專案基礎架構
- [x] 使用 Vite 建立 React + TypeScript 專案
- [x] 安裝 Electron 與開發所需依賴
- [x] 建立 Electron 主程序（主視窗/顯示視窗）與 preload IPC 橋接
- [x] 設定 scripts：`npm run dev` 可同時啟動 Vite + Electron

**AC**
- [x] `npm run dev` 會開啟兩個視窗（說書人控制台 + 公共顯示）
- [x] DevTools 可正常開啟
- [x] TypeScript 無編譯錯誤

#### Task 1.2：建立目錄結構
- [x] 建立 `src/main/`（Electron 主程序）
- [x] 建立 `src/renderer/`（React 前端）
- [x] 建立 `src/data/roles/`（角色資料）
- [x] 建立 `src/engine/`（規則引擎）
- [x] 建立 `src/engine/handlers/`（角色處理器）
- [x] 建立 `src/store/`（狀態管理）
- [x] 建立 `src/components/`（UI）
- [x] 建立 `src/tests/`（測試）
- [x] 建立 `docs/`（規格文件）

**AC**
- [x] 結構與 README / SETUP.md 描述一致
- [x] 主要入口檔案可被正確 import / build

---

### Day 1-2：資料準備（Trouble Brewing）

#### Task 1.3：準備角色資料（Trouble Brewing）
檔案：
- `src/data/roles/trouble-brewing.json`
- `src/data/jinxes.json`

- [x] `trouble-brewing.json` 應包含 **22 個角色**（13 townsfolk + 4 outsider + 4 minion + 1 demon）
- [x] `jinxes.json` 建立並可被匯入（先放常見幾條也可，後續擴充）
- [x] 寫一個簡單的驗證腳本或測試，檢查角色數量/欄位齊全

**AC**
- [x] TypeScript 可正常 import 角色資料
- [x] 角色數量正確（22）
- [x] 每個角色至少包含 id / name / team / ability / firstNight / otherNight（若先不齊可在 TODO 註明）

---

## 第二週：GameState 與規則引擎（Rule Engine）

### Day 2-3：型別定義（types.ts）

#### Task 2.1：定義核心型別
檔案：`src/engine/types.ts`

需要定義：
- [x] `RoleData`
- [x] `Player`
- [x] `GameState`
- [x] `StatusEffect`（poisoned/protected/drunk 等）— 已定義 `StatusEffectType` + `StatusEffect` interface
- [x] `NightOrderItem`
- [x] `GameEvent`
- [x] `NightResult`
- [x] `HandlerContext`
- [x] `RoleHandler`

**AC**
- [x] `src/engine/*` 可正常引用全部型別
- [x] 無 TypeScript 編譯錯誤
- [x] 型別設計可支撐 SPEC_GameState / SPEC_RuleEngine 的用法

---

### Day 2-4：GameStateManager（狀態合約先行）

#### Task 2.2：實作 GameStateManager
檔案：`src/engine/GameState.ts`
規格：`docs/SPEC_GameState.md`

必作方法（至少要達到 SPEC 類別定義）：
- [x] `constructor()`
- [x] `initializePlayers(players)`
- [x] `getPlayer(seat)`
- [x] `getAllPlayers()`
- [x] `getAlivePlayers()`
- [x] `getPlayersByRole(role)`
- [x] `hasAliveRole(role)`
- [x] `getAlignment(player)`
- [x] `getRoleData(roleId)`

狀態操作：
- [x] `addStatus(seat, type, sourceSeat, data?)` — 新增 `sourceSeat` 參數，記錄施加來源；拒絕對已死亡玩家加狀態
- [x] `removeStatus(seat, type)`
- [x] `hasStatus(seat, type)`
- [x] `killPlayer(seat, cause)` — 內部呼叫 `revokeEffectsFrom(seat, 'death')`
- [x] `markAbilityUsed(seat)`

能力失效支援（見 `AbilityInvalidation.contract.md`）：
- [x] `revokeEffectsFrom(sourceSeat, reason)` — 撤銷指定玩家施加的所有持續性狀態
- [x] `replaceRole(seat, newRole)` — 角色替換，內部呼叫 `revokeEffectsFrom(seat, 'role_change')`

階段控制：
- [x] `startNight()`（清除 protected 與 poisoned）

夜間順序：
- [x] `generateNightOrder(isFirstNight)`

歷史記錄：
- [x] `logEvent(event)`
- [x] `getHistory()`
- [x] `getState()`

邪惡方輔助（故事流程必用）：
- [x] `getMinionPlayers()`
- [x] `getDemonPlayer()`
- [x] `generateDemonBluffs()`
- [x] `getDemonBluffs()`

**AC（功能）**
- [x] 可正確初始化玩家（seat 唯一、玩家依 seat 排序）
- [x] 狀態不可重複加入
- [x] 已死亡玩家不可再獲得狀態
- [x] history 只可 append
- [x] startNight 清除 protected
- [x] startNight 清除 poisoned（確保 N1 下毒 → D1 中毒；N2 不中毒）
- [x] `addStatus` 記錄 `sourceSeat`，死亡玩家靜默忽略
- [x] `killPlayer` 自動撤銷該玩家施加的持續狀態（`revokeEffectsFrom`）
- [x] `replaceRole` 自動撤銷舊角色持續狀態並更新角色資料

**AC（測試：Contract Tests 必須通過）**
- [x] 新增 `src/engine/__tests__/GameState.contract.test.ts`（或合併在 GameState.test.ts 但要清楚標示 Contract）
- [x] Contract Tests 內容必須覆蓋 SPEC_GameState 的「State Contract」條目

---

### Day 4-5：RuleEngine（處理流程骨架）

#### Task 3.1：實作 RuleEngine 核心
檔案：`src/engine/RuleEngine.ts`
規格：`docs/SPEC_RuleEngine.md`

- [x] 設計一個「可注入 handlers」的引擎
- [x] 能根據 `NightOrderItem` 逐一執行
- [x] 能回傳每一步處理結果（給 UI 顯示）
- [x] 支援 Jinx 規則檢查（先做到結構/介面即可）

能力失效 — 統一後處理（見 `AbilityInvalidation.contract.md`）：
- [x] `startNightResolution()` — 每夜結算前重置 `NightContext`
- [x] `applyInvalidation()` — handler 回傳後統一檢查：效果型 + `!infoReliable` → 標記 `effectNullified: true`
- [x] `NightContext.blockedRoles` — 攔截類能力（如 Exorcist）阻止後續角色結算

**AC**
- [x] 可以跑完一個夜晚流程（不含 UI）
- [x] 可以產生「本夜行動清單 + 執行結果」
- [x] 中毒的僧侶保護結果帶有 `effectNullified: true`
- [x] `NightContext` 攔截可阻止 Demon 行動

---

## 第三週：角色處理器（Handlers）與最小可玩

### Day 1-3：先做 5 個角色（MVP）
檔案：`src/engine/handlers/*`
規格：`docs/SPEC_Handlers.md`

先完成：
- [x] Fortuneteller
- [x] Monk
- [x] Poisoner
- [x] Imp
- [x] Drunk（或以 status/placeholder 方式先落地）

Imp Star Pass（自殺繼承）：
- [x] Imp 自殺時偵測 `target.seat === player.seat`
- [x] 從 `gameState.players` 尋找存活爪牙，紅唇女郎（scarletwoman）優先
- [x] 回傳 `info.starPass: true` + 新惡魔資訊 + 喚醒提示
- [x] AbilityProcessor 收到 star pass 時依序呼叫 `killPlayer` → `replaceRole`

**AC**
- [x] handlers 可被註冊與呼叫
- [x] 與 GameStateManager 的狀態行為一致（poison/protect/kill/ability_used）
- [ ] 有單元測試：每個 handler 至少 1-2 個核心情境
- [x] Imp 自殺時正確選擇繼承者（紅唇女郎優先）
- [x] Star pass 結果包含新惡魔資訊與喚醒提示
- [x] AbilityProcessor 正確處理 star pass 狀態變更（killPlayer + replaceRole）

---

## 第四週：UI（雙視窗最小可用）

### Day 1-3：主控台（說書人）夜晚 UI

#### Task 5.1：建立夜晚視圖 NightView
檔案：`src/components/NightView.tsx`

- [x] 顯示夜晚順序清單
- [x] 顯示「目前輪到誰」
- [x] 顯示該角色提示文字（reminder）
- [x] 可進行下一步/上一部（至少 next）
- [x] 可選擇目標玩家（串 PlayerSelector）

**AC**
- [x] 可以手動完成第一夜流程（依序點選/確認）
- [x] 能看到每一步處理結果（成功/失敗/原因）

#### Task 5.2：能力處理元件 AbilityProcessor
檔案：`src/components/AbilityProcessor.tsx`

- [x] 接收一個 NightOrderItem
- [x] 提供目標選擇（若需要）
- [x] 送到 RuleEngine 執行並顯示結果

**AC**
- [x] 至少支援 Poisoner / Monk / Imp 的目標互動流程

#### Task 5.3：玩家選擇器 PlayerSelector
檔案：`src/components/PlayerSelector.tsx`

- [x] 顯示所有玩家
- [x] 已死亡玩家標示 💀 且不可選（或可選但提示）
- [x] 支援 onSelect callback

**AC**
- [x] 可正確選取玩家 seat 並回傳

---

### Day 4-5：公共顯示視窗（Display）

#### Task 6.1：建立 DisplayWindow（公開資訊）
檔案：`src/components/DisplayWindow.tsx`

- [ ] 顯示目前 Day/Night 與回合數
- [ ] 顯示玩家列表（僅公開：座位、名字、存活）
- [ ] 顯示公開事件（例如：昨夜死亡名單、處決結果）

**AC**
- [ ] 說書人端操作後，公共顯示會同步更新（透過 store/IPC 任一方式）

---

## 第五週：整合測試與流程驗收

### Day 1-3：完整流程測試（最小可玩）
- [ ] 初始化 7 位玩家（含 demon/minions/townsfolk/outsider）
- [ ] 跑完第一夜（含 demon bluffs 生成）
- [ ] 進入白天（至少能「公布死亡」）

**AC**
- [ ] 沒有狀態不同步（尤其 poisoned/protected 清除時機）
- [ ] Contract Tests 全數通過
- [ ] MVP 角色（5 個）能被正確觸發並產生可理解結果

---

## 完成檢查清單（里程碑）

### Milestone A：Engine Contract Ready
- [x] GameStateManager 完整 + Contract Tests 通過
- [x] trouble-brewing.json（22）可 import
- [x] demon bluffs 可生成且不與已分配角色重複

### Milestone B：RuleEngine MVP
- [x] RuleEngine 可跑完整夜晚順序
- [x] 5 個角色 handler 可用 + 基本測試

### Milestone C：Playable MVP
- [ ] 說書人 UI 可走第一夜流程
- [ ] 公共顯示視窗可同步公開資訊
