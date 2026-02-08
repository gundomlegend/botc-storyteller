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
export class RuleEngine {
  private roleRegistry: Map<string, RoleData>;
  private jinxRegistry: Jinx[];
  private handlers: Map<string, RoleHandler>;
  
  constructor();
  
  // 主處理方法
  processNightAbility(
    player: Player,
    target: Player | null,
    gameState: GameState,
    stateManager: GameStateManager
  ): NightResult;
  
  // 輔助方法
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
1. 獲取角色資料
   ↓
2. 檢查死亡狀態
   ├─ 已死亡且死後無能力 → 返回跳過
   └─ 存活或死後有能力 → 繼續
   ↓
3. 檢查狀態影響
   ├─ 檢查中毒（affectedByPoison && isPoisoned）
   ├─ 檢查醉酒（affectedByDrunk && isDrunk）
   └─ 設定 infoReliable 和 statusReason
   ↓
4. 檢查 Jinx 規則
   └─ 如有 Jinx 生效，更新 infoReliable 和 statusReason
   ↓
5. 調用處理器
   ├─ 有特殊處理器 → 調用處理器
   └─ 無特殊處理器 → 使用預設處理器
   ↓
6. 返回結果
```

**範例**:
```typescript
const engine = new RuleEngine();
const manager = new GameStateManager();

// 占卜師查驗小惡魔
const result = engine.processNightAbility(
  fortunetellerPlayer,  // 占卜師
  impPlayer,            // 小惡魔
  manager.getState(),
  manager
);

console.log(result.info);        // 'evil'
console.log(result.gesture);     // 'shake'
console.log(result.reasoning);   // '占卜師狀態正常...'
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

## 完整處理流程範例

### 案例 1: 占卜師查驗（正常狀態）
```typescript
// 設定
const ftPlayer = {
  seat: 1,
  role: 'fortuneteller',
  isPoisoned: false,
  isDrunk: false,
  isAlive: true
};

const impPlayer = {
  seat: 7,
  role: 'imp',
  team: 'demon'
};

// 處理
const result = engine.processNightAbility(
  ftPlayer,
  impPlayer,
  gameState,
  manager
);

// 結果
{
  action: 'tell_alignment',
  info: 'evil',                    // 真實資訊
  gesture: 'shake',                 // 搖頭（邪惡）
  mustFollow: false,                // 不強制
  canLie: true,                     // 說書人可以選擇撒謊
  reasoning: '占卜師狀態正常，建議給真實資訊',
  display: '查驗 7號\n真實身份：小惡魔 (邪惡)\n建議手勢：搖頭'
}
```

### 案例 2: 占卜師查驗（中毒狀態）
```typescript
// 設定
const ftPlayer = {
  seat: 1,
  role: 'fortuneteller',
  isPoisoned: true,              // 中毒！
  isDrunk: false,
  isAlive: true
};

// 處理
const result = engine.processNightAbility(
  ftPlayer,
  impPlayer,
  gameState,
  manager
);

// 結果
{
  action: 'tell_alignment',
  info: 'good',                    // 錯誤資訊（反轉）
  gesture: 'nod',                   // 點頭（善良）
  mustFollow: true,                 // 強制遵守
  canLie: false,                    // 不能撒謊
  reasoning: '占卜師中毒，必須給錯誤資訊',
  display: '...'
}
```

### 案例 3: 占卜師 + 寡婦 Jinx
```typescript
// 設定（寡婦在場）
manager.initializePlayers([
  { seat: 1, role: 'fortuneteller' },
  { seat: 2, role: 'widow' },      // 寡婦存活
  { seat: 7, role: 'imp' }
]);

const ftPlayer = manager.getPlayer(1);
const impPlayer = manager.getPlayer(7);

// 處理
const result = engine.processNightAbility(
  ftPlayer,
  impPlayer,
  manager.getState(),
  manager
);

// 結果
{
  action: 'tell_alignment',
  info: 'good',                    // 錯誤資訊（Jinx）
  gesture: 'nod',
  mustFollow: true,                 // 強制遵守
  canLie: false,
  reasoning: '寡婦 Jinx：占卜師永遠得到錯誤資訊',
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
  { seat: 2, role: 'imp' }
]);

const ft = manager.getPlayer(1);
const imp = manager.getPlayer(2);

const result = engine.processNightAbility(
  ft, imp, manager.getState(), manager
);

assert(result.info === 'evil');
assert(result.gesture === 'shake');
assert(result.canLie === true);
assert(result.mustFollow === false);
```

### 測試 2: 中毒狀態處理
```typescript
manager.addStatus(1, 'poisoned');

const result = engine.processNightAbility(
  ft, imp, manager.getState(), manager
);

assert(result.info === 'good');     // 反轉
assert(result.mustFollow === true);  // 強制
assert(result.reasoning.includes('中毒'));
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

---

## 擴展指南

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
   - 死亡檢查 > 中毒檢查 > 醉酒檢查 > Jinx 檢查

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