# RuleEngine 規格文件

## 概述

`RuleEngine` 是規則判定的核心引擎，負責：
- 處理所有角色的夜間能力
- 檢測狀態影響（中毒、醉酒）
- 檢測 Jinx 規則
- 調用特殊角色處理器
- 提供預設處理器處理簡單角色

---

## 類別定義
```typescript
/** 夜間結算上下文，追蹤本夜已生效的攔截 */
interface NightContext {
  blockedRoles: Set<string>;  // 被攔截的角色類型，例如 'demon'
}

/** 效果型 action 清單，用於統一後處理判定 */
const EFFECT_ACTIONS = new Set(['add_protection', 'add_poison', 'kill']);

export class RuleEngine {
  private roleRegistry: Map<string, RoleData>;
  private jinxRegistry: Jinx[];
  private handlers: Map<string, RoleHandler>;
  private nightContext: NightContext;

  constructor();

  /** 每夜開始時呼叫，重置攔截狀態 */
  startNightResolution(): void;

  /** 獲取玩家的有效角色（用於 Handler 路由，處理酒鬼） */
  private getEffectiveRole(player: Player): string;

  // 主處理方法（含統一後處理）
  processNightAbility(
    player: Player,
    target: Player | null,
    gameState: GameState,
    stateManager: GameStateManager
  ): NightResult;

  // 輔助方法
  private applyInvalidation(
    result: NightResult,
    infoReliable: boolean,
    statusReason: string
  ): NightResult;

  private defaultHandler(
    roleData: RoleData,
    player: Player,
    infoReliable: boolean,
    statusReason: string
  ): NightResult;

  private checkJinxes(
    roleId: string,
    stateManager: GameStateManager
  ): string | null;

  getRoleData(roleId: string): RoleData | undefined;
}
```

---

## 方法詳細規格

### constructor()

**功能**: 初始化規則引擎

**實作細節**:
```typescript
constructor() {
  // 1. 載入角色資料
  this.roleRegistry = new Map();
  rolesData.forEach(role => {
    this.roleRegistry.set(role.id, role);
  });
  
  // 2. 載入 Jinx 規則
  this.jinxRegistry = jinxesData;
  
  // 3. 載入角色處理器
  this.handlers = handlers; // 從 handlers/index.ts 匯入
}
```

---

### processNightAbility()

**功能**: 處理玩家的夜間能力

**輸入**:
- `player: Player` - 執行能力的玩家
- `target: Player | null` - 目標玩家（如果需要）
- `gameState: GameState` - 當前遊戲狀態
- `stateManager: GameStateManager` - 狀態管理器實例

**輸出**: `NightResult` - 能力處理結果

**處理流程**:
```
1. 獲取角色資料（透過 getEffectiveRole()）
   ├─ 酒鬼角色（role='drunk' && believesRole 存在）→ 使用假角色資料
   └─ 其他角色 → 使用實際角色資料
   ↓
2. 檢查 NightContext 攔截（AC4）
   ├─ 該角色類型在 blockedRoles 中 → 返回 null 結果
   └─ 未被攔截 → 繼續
   ↓
3. 檢查死亡狀態
   ├─ 已死亡且死後無能力 → 返回跳過
   └─ 存活或死後有能力 → 繼續
   ↓
4. 檢查狀態影響
   ├─ 檢查中毒（affectedByPoison && isPoisoned）
   ├─ 檢查醉酒狀態標記（affectedByDrunk && isDrunk）
   └─ 設定 infoReliable 和 statusReason
   ↓
5. 檢查 Jinx 規則
   └─ 如有 Jinx 生效，更新 infoReliable 和 statusReason
   ↓
6. 調用處理器（酒鬼使用假角色的 Handler）
   ├─ 有特殊處理器 → 調用處理器
   └─ 無特殊處理器 → 使用預設處理器
   ↓
7. 酒鬼角色本質檢查（永久無能力）
   ├─ role='drunk' && believesRole 存在 → 標記 effectNullified: true
   └─ 其他角色 → 繼續
   ↓
8. 統一後處理 applyInvalidation()（AC1 狀態類失效）
   ├─ !infoReliable 且 action 為效果型 → 標記 effectNullified: true
   └─ 資訊型結果 → 不介入（handler 回傳實際結果，由 UI 層提示說書人）
   ↓
9. 返回結果
```

**範例**:
```typescript
const engine = new RuleEngine();
const manager = new GameStateManager();

// 占卜師查驗小惡魔（需要雙目標）
const result = engine.processNightAbility(
  fortunetellerPlayer,  // 占卜師
  impPlayer,            // 目標 1：小惡魔
  manager.getState(),
  manager,
  goodPlayer            // 目標 2：善良玩家
);

console.log((result.info as any).rawDetection);  // true（偵測到惡魔）
console.log(result.mustFollow);                   // false
console.log(result.canLie);                       // true
```

---

### getEffectiveRole()

**功能**: 獲取玩家的有效角色（用於 Handler 路由）

**輸入**: `player: Player` - 玩家物件

**輸出**: `string` - 有效角色 ID

**邏輯**:
```typescript
private getEffectiveRole(player: Player): string {
  // 酒鬼玩家：使用假角色的 Handler
  if (player.role === 'drunk' && player.believesRole) {
    return player.believesRole;
  }
  // 其他玩家：使用實際角色
  return player.role;
}
```

**重要說明**:
- **酒鬼角色本質 vs 醉酒狀態標記**：
  - `role='drunk'` = 永久無能力（角色本質，immutable）
  - `isDrunk=true` = 臨時醉酒狀態（狀態標記，mutable）
- 酒鬼玩家會使用假角色的完整 Handler（包含 UI、目標選擇等）
- 能力效果會在步驟 7 被無效化（因為 `role='drunk'`）
- 這讓酒鬼執行假角色的完整行為，但不產生實際效果

**範例**:
```typescript
// 酒鬼玩家（以為自己是占卜師）
const drunkPlayer = {
  seat: 3,
  role: 'drunk',
  believesRole: 'fortuneteller'
};

const effectiveRole = engine.getEffectiveRole(drunkPlayer);
// 返回 'fortuneteller' → 使用 FortunetellerHandler
// 但在步驟 7 會標記 effectNullified: true
```

---

### defaultHandler()

**功能**: 預設處理器，處理簡單角色

**輸入**:
- `roleData: RoleData` - 角色資料
- `player: Player` - 玩家
- `infoReliable: boolean` - 資訊是否可靠
- `statusReason: string` - 狀態原因

**輸出**: `NightResult`

**適用角色**:
- 洗衣婦 (Washerwoman)
- 圖書管理員 (Librarian)
- 調查員 (Investigator)
- 廚師 (Chef)
- 送葬者 (Undertaker)
- 守鴉人 (Ravenkeeper)
- 管家 (Butler)
- 間諜 (Spy)

**行為**:
```typescript
{
  action: 'show_info',
  display: roleData.firstNightReminder_cn || roleData.otherNightReminder_cn,
  info: {
    role: roleData.name_cn,
    reminder: reminder,
    reliable: infoReliable,
    statusReason: statusReason
  },
  gesture: 'none'
}
```

**範例輸出**:
```typescript
// 洗衣婦
{
  action: 'show_info',
  display: '展示一個鎮民角色標記。指向兩位玩家，其中一位是該角色。',
  info: {
    role: '洗衣婦',
    reminder: '展示一個鎮民角色標記...',
    reliable: true,
    statusReason: ''
  },
  gesture: 'none'
}
```

---

### checkJinxes()

**功能**: 檢查當前角色是否受 Jinx 規則影響

**輸入**:
- `roleId: string` - 當前角色 ID
- `stateManager: GameStateManager` - 用於檢查其他角色是否在場

**輸出**: `string | null`
- 如果有 Jinx 生效，返回 Jinx 說明
- 如果無 Jinx，返回 `null`

**演算法**:
```
1. 遍歷所有 Jinx 規則
2. 檢查當前角色是否在 Jinx 中（role1 或 role2）
3. 如果在，獲取另一個角色
4. 檢查另一個角色是否存活在場
5. 如果在場，返回 Jinx 說明
6. 如果都不符合，返回 null
```

**範例**:
```typescript
// Jinx 資料
{
  role1: 'fortuneteller',
  role2: 'spy',
  reason: '間諜對占卜師顯示為善良。'
}

// 檢查占卜師
const jinx = engine.checkJinxes('fortuneteller', manager);
// 如果間諜存活 → 返回 '間諜對占卜師顯示為善良。'
// 如果間諜不在場 → 返回 null
```

---

### startNightResolution()

**功能**: 每夜結算開始前呼叫，重置 NightContext

**實作**:
```typescript
startNightResolution(): void {
  this.nightContext = { blockedRoles: new Set() };
}
```

---

### applyInvalidation()

**功能**: 統一後處理，在 handler 回傳結果後檢查是否需要標記 `effectNullified`

**輸入**:
- `result: NightResult` - handler 回傳的原始結果
- `infoReliable: boolean` - 資訊是否可靠
- `statusReason: string` - 狀態原因

**輸出**: `NightResult` - 可能被標記 `effectNullified` 的結果

**邏輯**:
```typescript
private applyInvalidation(
  result: NightResult,
  infoReliable: boolean,
  statusReason: string
): NightResult {
  // 跳過、需要輸入、或資訊可靠 → 不介入
  if (result.skip || result.needInput || infoReliable) {
    return result;
  }

  // 效果型 action 且 infoReliable === false → 標記無效
  if (result.action && EFFECT_ACTIONS.has(result.action)) {
    return {
      ...result,
      effectNullified: true,
      reasoning: `${statusReason}，效果不落地（仍喚醒玩家）`,
    };
  }

  // 資訊型 → handler 回傳實際結果，不介入
  return result;
}
```

**行為說明**:
- 中毒的僧侶：handler 回傳 `action: 'add_protection'` → 後處理標記 `effectNullified: true` → UI 不執行 `addStatus`
- 中毒的占卜師：handler 回傳實際偵測結果（`rawDetection`），`tell_alignment` 不是效果型 action → 後處理不介入 → UI 層根據 `item.isPoisoned/isDrunk` 提示說書人可自行選擇回答
- 正常的僧侶：`infoReliable === true` → 後處理不介入

---

## 完整處理流程範例

### 案例 1: 占卜師查驗（正常狀態）
```typescript
// 設定
const ftPlayer = { seat: 1, role: 'fortuneteller', isPoisoned: false, isDrunk: false, isAlive: true };
const impPlayer = { seat: 7, role: 'imp', team: 'demon' };
const goodPlayer = { seat: 3, role: 'monk', team: 'townsfolk' };

// 處理（占卜師需要雙目標）
const result = engine.processNightAbility(ftPlayer, impPlayer, gameState, manager, goodPlayer);

// 結果
{
  action: 'tell_alignment',
  info: {
    rawDetection: true,            // 偵測到惡魔
    target1: { seat: 7, isDemon: true, isRecluse: false, isRedHerring: false },
    target2: { seat: 3, isDemon: false, isRecluse: false, isRedHerring: false },
  },
  mustFollow: false,                // 說書人可自行決定
  canLie: true,                     // 說書人可給不同答案
  reasoning: '7號是惡魔（小惡魔）',
  display: '查驗目標：\n  1. 7號 — 小惡魔 [惡魔]\n  2. 3號 — 僧侶\n\n偵測結果：偵測到惡魔'
}
```

### 案例 2: 占卜師查驗（中毒狀態）
```typescript
// 設定
const ftPlayer = { seat: 1, role: 'fortuneteller', isPoisoned: true, isDrunk: false, isAlive: true };

// 處理
const result = engine.processNightAbility(ftPlayer, impPlayer, gameState, manager, goodPlayer);

// 結果（中毒的占卜師仍回傳實際偵測結果）
{
  action: 'tell_alignment',
  info: {
    rawDetection: true,            // 實際偵測結果（不反轉）
    target1: { seat: 7, isDemon: true, isRecluse: false, isRedHerring: false },
    target2: { seat: 3, isDemon: false, isRecluse: false, isRedHerring: false },
  },
  mustFollow: false,                // 說書人自行決定
  canLie: true,                     // 說書人可給不同答案
  reasoning: '7號是惡魔（小惡魔）',
  display: '...'
}
// UI 層：因 item.isPoisoned === true，不預選答案，顯示警告
```

### 案例 3: 占卜師 + 寡婦 Jinx
```typescript
// 設定（寡婦在場）
manager.initializePlayers([
  { seat: 1, role: 'fortuneteller' },
  { seat: 2, role: 'widow' },      // 寡婦存活
  { seat: 3, role: 'monk' },
  { seat: 7, role: 'imp' }
]);

const ftPlayer = manager.getPlayer(1);
const impPlayer = manager.getPlayer(7);
const monkPlayer = manager.getPlayer(3);

// 處理
const result = engine.processNightAbility(ftPlayer, impPlayer, manager.getState(), manager, monkPlayer);

// 結果（Jinx 使 infoReliable=false，但 handler 仍回傳實際結果）
{
  action: 'tell_alignment',
  info: {
    rawDetection: true,            // 實際偵測結果（不反轉）
    target1: { seat: 7, isDemon: true, isRecluse: false, isRedHerring: false },
    target2: { seat: 3, isDemon: false, isRecluse: false, isRedHerring: false },
  },
  mustFollow: false,                // 說書人自行決定
  canLie: true,
  reasoning: '7號是惡魔（小惡魔）',
  display: '...'
}
```

### 案例 4: 簡單角色（洗衣婦）
```typescript
const washerwoman = {
  seat: 3,
  role: 'washerwoman',
  isAlive: true,
  isPoisoned: false
};

const result = engine.processNightAbility(
  washerwoman,
  null,              // 洗衣婦不需要選擇目標
  gameState,
  manager
);

// 結果（使用預設處理器）
{
  action: 'show_info',
  display: '展示一個鎮民角色標記。指向兩位玩家...',
  info: {
    role: '洗衣婦',
    reminder: '展示一個鎮民角色標記...',
    reliable: true,
    statusReason: ''
  },
  gesture: 'none'
}
```

---

## 測試用例

### 測試 1: 正常狀態處理
```typescript
const engine = new RuleEngine();
const manager = new GameStateManager();

manager.initializePlayers([
  { seat: 1, role: 'fortuneteller' },
  { seat: 2, role: 'imp' },
  { seat: 3, role: 'monk' }
]);

const ft = manager.getPlayer(1);
const imp = manager.getPlayer(2);
const monk = manager.getPlayer(3);

const result = engine.processNightAbility(
  ft, imp, manager.getState(), manager, monk
);

assert((result.info as any).rawDetection === true);
assert(result.canLie === true);
assert(result.mustFollow === false);
```

### 測試 2: 中毒狀態處理
```typescript
manager.addStatus(1, 'poisoned', 99);

const result = engine.processNightAbility(
  ft, imp, manager.getState(), manager, monk
);

// 中毒不反轉，仍回傳實際偵測結果
assert((result.info as any).rawDetection === true);
assert(result.mustFollow === false);
assert(result.canLie === true);
// UI 層根據 item.isPoisoned 提示說書人可自行決定
```

### 測試 3: Jinx 檢測
```typescript
manager.initializePlayers([
  { seat: 1, role: 'fortuneteller' },
  { seat: 2, role: 'spy' },        // 間諜在場
  { seat: 3, role: 'imp' }
]);

const jinx = engine['checkJinxes']('fortuneteller', manager);
assert(jinx !== null);
assert(jinx.includes('間諜'));
```

### 測試 4: 死亡角色跳過
```typescript
manager.killPlayer(1, 'demon_kill');

const result = engine.processNightAbility(
  ft, imp, manager.getState(), manager
);

assert(result.skip === true);
assert(result.skipReason.includes('死亡'));
```

### 測試 5: 統一後處理 — 中毒的僧侶保護被標記無效
```typescript
manager.initializePlayers([
  { seat: 1, name: 'A', role: 'monk' },
  { seat: 2, name: 'B', role: 'fortuneteller' },
  { seat: 3, name: 'C', role: 'imp' },
]);

manager.startNight();
manager.addStatus(1, 'poisoned', 3); // 僧侶被毒

const monk = manager.getPlayer(1)!;
const ft = manager.getPlayer(2)!;

const result = engine.processNightAbility(
  monk, ft, manager.getState(), manager
);

assert(result.action === 'add_protection');
assert(result.effectNullified === true);     // 效果被標記為無效
assert(result.reasoning.includes('中毒'));
```

### 測試 6: NightContext 攔截 — Exorcist 阻止 Demon
```typescript
const engine = new RuleEngine();
engine.startNightResolution();

// 模擬 Exorcist 結算成功，加入攔截
engine['nightContext'].blockedRoles.add('demon');

const imp = manager.getPlayer(3)!;
const target = manager.getPlayer(2)!;

const result = engine.processNightAbility(
  imp, target, manager.getState(), manager
);

assert(result.skip === true);
assert(result.skipReason.includes('攔截'));
```

---

## 擴展指南
### 結算優先順序與 NightContext

- Night order 為唯一結算順序來源。
- 每夜結算前必須呼叫 `startNightResolution()` 重置 `NightContext`。
- 攔截機制透過 `NightContext.blockedRoles` 實現：
  - 攔截類能力（例如 Exorcist）結算成功時，將目標角色類型加入 `blockedRoles`
  - 後續角色結算時（步驟 2），若該角色類型在 `blockedRoles` 中，直接回傳 null 結果
  - 範例：Exorcist 結算 → `blockedRoles.add('demon')` → Imp 結算時檢查到 `'demon'` 被攔截 → 跳過
- 能力是否失效以「說書人結算該動作」時間點判定：
  - 在結算點前的狀態（poisoned/drunk/dead/role-changed）才會影響該次行動。

### 添加新角色處理器

1. 在 `src/engine/handlers/` 建立新檔案
2. 實作 `RoleHandler` 介面
3. 在 `handlers/index.ts` 註冊處理器

範例：
```typescript
// EmathHandler.ts
export class EmpathHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 實作邏輯
  }
}

// handlers/index.ts
import { EmpathHandler } from './EmpathHandler';

export const handlers = new Map<string, RoleHandler>([
  ['fortuneteller', new FortunetellerHandler()],
  ['empath', new EmpathHandler()],  // 新增
  // ...
]);
```

---

## 注意事項

1. **狀態檢查優先順序**
   - NightContext 攔截檢查 > 死亡檢查 > 中毒檢查 > 醉酒狀態檢查 > Jinx 檢查 > 酒鬼本質檢查 > 統一後處理

2. **酒鬼角色本質 vs 醉酒狀態**
   - `role='drunk'` + `believesRole` = 永久無能力的酒鬼角色（角色本質）
   - `isDrunk=true` = 被其他角色能力導致的臨時醉酒（狀態標記）
   - 酒鬼初始化時 `isDrunk=false`（因為醉酒是狀態，不是本質）
   - 酒鬼的無能力透過步驟 7 檢查，不是透過 `isDrunk` 標記

2. **預設處理器限制**
   - 只適用於無複雜邏輯的角色
   - 不處理目標選擇
   - 不修改遊戲狀態

3. **Jinx 規則**
   - 需要兩個角色都存活才生效
   - 檢查在狀態檢查之後
   - 優先級低於中毒/醉酒

4. **錯誤處理**
   - 未知角色返回跳過結果
   - 不會拋出異常（防止遊戲崩潰）