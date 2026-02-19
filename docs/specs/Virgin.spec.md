# Virgin（貞潔者）規格書

## 概述

貞潔者是鎮民（Townsfolk）陣營的**白天觸發型角色**。當貞潔者第一次被提名時，若提名者是鎮民，該提名者會被**立即處決**。

**關鍵特性**：
- 白天觸發能力（提名階段）
- 不是夜間能力，沒有任何夜間行動（firstNight: 0, otherNight: 0）
- 一次性能力：第一次被提名後失效（無論是否觸發處決）
- 受中毒/醉酒影響（affectedByPoison: true, affectedByDrunk: true）
- 死亡後不工作（worksWhenDead: false）
- 觸發的處決使用 `virgin_ability` 死亡原因（非標準處決）

---

## 角色資料

```json
{
  "id": "virgin",
  "name": "Virgin",
  "name_cn": "貞潔者",
  "team": "townsfolk",
  "ability": "The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.",
  "ability_cn": "你第一次被提名時，若提名你的人是鎮民，則其立即被處刑。",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": ["No Ability"],
  "setup": false,
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

**中文能力描述**：你第一次被提名時，若提名你的人是鎮民，則其立即被處刑。

---

## 核心機制

### 基本邏輯流程

```
貞潔者被提名時的流程：
├─ 步驟 1: 檢查貞潔者能力是否已使用
│  └─ abilityUsed = true？ → 跳過（能力已失效，當作普通提名）
│
├─ 步驟 2: 標記能力已使用
│  └─ 設定 abilityUsed = true（無論後續結果如何）
│
├─ 步驟 3: 檢查貞潔者狀態
│  ├─ 死亡？ → 不會觸發（死亡後不工作，且死人不能被提名）
│  ├─ 中毒或醉酒？ → 能力失效，當作普通提名，且標記能力已使用
│  └─ 酒鬼？ → 視同無能力，當作普通提名
│
├─ 步驟 4: 判定提名者身份
│  ├─ 提名者是鎮民（Townsfolk）？ → 觸發處決
│  ├─ 提名者是外來者（Outsider）？ → 不觸發，但標記能力已使用
│  ├─ 提名者是爪牙（Minion）？ → 不觸發，但標記能力已使用
│  │   └─ 例外：間諜（能力正常）可被視為鎮民 → 說書人可以選擇是否觸發
│  └─ 提名者是惡魔（Demon）？ → 不觸發
│
└─ 步驟 5: 執行結果
   ├─ 觸發 → 提名者立即被處決（deathCause: 'virgin_ability'）
   │   └─ 此提名程序中止，不進入投票階段，直接進入夜間階段
   └─ 不觸發 → 正常進入投票程序
```

### 重要規則

1. **一次性能力**：無論能力是否實際觸發處決，第一次被提名後能力即失效
2. **立即處決**：提名者的處決是立即生效的，不經過投票
3. **非標準處決**：Virgin 觸發的處決使用 `virgin_ability` 作為死亡原因，與投票處決（`execution`）不同，但都被送葬者視為白天被處決
4. **提名中止**：若觸發處決，該次提名程序中止，貞潔者不會進入被投票階段
5. **會影響每日處決名額**：Virgin 觸發的處決視同「今日處決」，會直接進入夜間階段

---

## 情境處理

### 情境 1：鎮民提名貞潔者（能力正常）

**條件**：
- 貞潔者能力正常（未中毒、未醉酒、非酒鬼）
- 貞潔者能力尚未使用
- 提名者是鎮民

**處理**：
1. 標記貞潔者能力已使用（abilityUsed = true）
2. 提名者立即被處決（deathCause: 'virgin_ability'）
3. 此提名程序中止
4. 記錄事件
5. 進入夜間階段

**範例**：
```
第 1 天白天：
- 3號玩家（Washerwoman 洗衣婦）提名 5號玩家（Virgin 貞潔者）
- 貞潔者能力觸發！
- 3號玩家（洗衣婦）立即被處決死亡
- 提名程序中止，不進入投票
- 進入夜間階段
```

**UI 顯示**：
```
⚡ 貞潔者能力觸發！

5號 Alice（貞潔者 Virgin）被提名
提名者：3號 Bob

3號 Bob 是鎮民（洗衣婦 Washerwoman）
→ 提名者立即被處決

[確認]
```

---

### 情境 2：非鎮民提名貞潔者（能力正常）

**條件**：
- 貞潔者能力正常
- 貞潔者能力尚未使用
- 提名者不是鎮民（外來者、爪牙、惡魔）

**處理**：
1. 標記貞潔者能力已使用（abilityUsed = true）
2. 不觸發處決
3. 正常進入投票程序

**範例**：
```
第 1 天白天：
- 6號玩家（Imp 小惡魔）提名 5號玩家（Virgin 貞潔者）
- 提名者不是鎮民 → 不觸發
- 貞潔者能力已消耗
- 正常進入投票程序
```

**UI 顯示**：
```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
提名者：6號 Charlie

6號 Charlie 不是鎮民
→ 貞潔者能力未觸發（能力已消耗）

[確認，進入投票]
```

---

### 情境 3：貞潔者中毒/醉酒時被提名

**條件**：
- 貞潔者中毒或醉酒
- 貞潔者能力尚未使用
- 提名者是鎮民

**處理**：
1. 標記貞潔者能力已使用（abilityUsed = true）
2. 能力失效，不觸發處決
3. 正常進入投票程序
4. 說書人不應向玩家揭示能力失效的原因

**範例**：
```
第 1 天白天：
- 5號玩家（Virgin 貞潔者，中毒中）被3號玩家（Washerwoman 洗衣婦）提名
- 貞潔者中毒，能力失效
- 不觸發處決，正常進入投票
- 貞潔者能力已消耗（即使解毒後也不會再觸發）
```

**UI 顯示**：
```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
能力狀態：⚠️ 中毒（能力失效）
提名者：3號 Bob（洗衣婦 Washerwoman）← 鎮民

⚠️ 貞潔者中毒，能力失效
→ 不觸發處決，正常進入投票

[確認，進入投票]
```

---

### 情境 4：酒鬼以為自己是貞潔者

**條件**：
- 玩家實際上是酒鬼（role: 'drunk', believesRole: 'virgin'）
- 被鎮民提名

**處理**：
1. 酒鬼沒有貞潔者能力，不觸發任何效果
2. 正常進入投票程序

**範例**：
```
第 1 天白天：
- 5號玩家（Drunk 酒鬼，以為自己是 Virgin 貞潔者）被3號玩家（Washerwoman）提名
- 5號實際是酒鬼，沒有貞潔者能力
- 正常進入投票
```

**UI 顯示**：
```
「貞潔者」被提名

5號 Alice（實際上是酒鬼 Drunk）被提名
能力狀態：🍺 實際上是酒鬼（無能力）

→ 無貞潔者能力，正常進入投票

[確認，進入投票]
```

---

### 情境 5：貞潔者能力已使用，再次被提名

**條件**：
- 貞潔者能力已使用（abilityUsed = true）
- 再次被提名

**處理**：
1. 能力已失效，當作普通提名
2. 正常進入投票程序

**範例**：
```
第 2 天白天：
- 5號玩家（Virgin 貞潔者，能力已使用）被2號玩家提名
- 能力已失效，當作普通提名
- 正常進入投票
```

---

### 情境 6：間諜提名貞潔者

**條件**：
- 貞潔者能力正常，尚未使用
- 提名者是間諜（Spy），且間諜能力正常（未中毒/醉酒）

**處理**：
1. 間諜能力正常時，可被視為善良角色（鎮民/外來者）
2. 說書人可選擇：
   - 將間諜視為鎮民 → 觸發貞潔者能力，間諜被處決，進入夜間階段
   - 將間諜視為爪牙（真實身份）→ 不觸發
3. 無論選擇如何，貞潔者能力都標記為已使用

**範例**：
```
第 1 天白天：
- 6號玩家（Spy 間諜，能力正常）提名 5號玩家（Virgin 貞潔者）
- 說書人可選擇：
  - 間諜被視為鎮民 → 觸發處決，間諜死亡，進入夜間階段
  - 間諜保持爪牙身份 → 不觸發，正常投票
```

**UI 顯示**：
```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
提名者：6號 Lee（間諜 Spy，能力正常）

選擇判定：
○ 間諜被視為鎮民 → 觸發貞潔者能力，間諜被處決，進入夜間階段
○ 間諜保持爪牙身份 → 不觸發，正常投票

ℹ️ 提示：間諜能力正常，可以被認定為善良角色

[確認]
```

---

## 特殊規則

### 1. 能力消耗時機

**第一次被提名 = 能力消耗**：
- 無論提名者是什麼角色
- 無論能力是否中毒/醉酒
- 無論是否觸發處決
- 都標記 abilityUsed = true

**唯一例外**：
- 如果貞潔者已死亡，則不會被提名（死人不能被提名）

### 2. Virgin 處決 vs 標準處決

| | Virgin 處決 | 標準處決 |
|---|---|---|
| 死亡原因 | `virgin_ability` | `execution` |
| 觸發送葬者 | 是 | 是 |
| 計入每日處決 | 是 | 是 |
| 需要投票 | 否（立即生效） | 是 |
| 觸發聖徒 | 否 | 是 |

### 3. 與間諜的互動

- 間諜提名貞潔者時，間諜能力正常 → 說書人可選擇將間諜視為鎮民
- 間諜中毒/醉酒 → 失去偽裝能力，以爪牙身份判定 → 不觸發

### 4. 與陌客的互動

- 陌客提名貞潔者 → 陌客是外來者，不是鎮民 → 不觸發
- 陌客的「可被視為邪惡」能力不影響此判定（無論如何都不是鎮民）

### 5. 提名中止規則

- Virgin 觸發處決時，該次提名程序**立即中止**
- 不進入投票階段
- 被提名的貞潔者**不會因此次提名而死亡**
- 直接進入夜間階段

---

## 實作規格

### 與現有系統的關係

貞潔者的能力在**白天提名階段**觸發，不需要 Handler 或 Processor：
- **不需要 Handler**（無夜間行動）
- **不需要 Processor**（無夜間 UI）
- **需要提名階段判定邏輯**：在提名流程中檢查貞潔者條件

### 判定函式

```typescript
/**
 * 檢查貞潔者能力是否觸發
 *
 * @param virgin - 被提名的貞潔者玩家
 * @param nominator - 提名者玩家
 * @returns 判定結果
 */
function checkVirginAbility(
  virgin: Player,
  nominator: Player,
): VirginCheckResult {
  // 步驟 1: 檢查能力是否已使用
  if (virgin.abilityUsed) {
    return { triggered: false, reason: '能力已使用' };
  }

  // 步驟 2: 標記能力已使用（無論後續結果如何）
  // 注意：實際標記在呼叫端執行

  // 步驟 3: 檢查貞潔者狀態
  const isVirginDrunk = virgin.role === 'drunk';
  const isVirginPoisoned = virgin.isPoisoned;
  const abilityWorks = !isVirginDrunk && !isVirginPoisoned;

  if (!abilityWorks) {
    return {
      triggered: false,
      reason: isVirginDrunk ? '實際上是酒鬼' : '中毒，能力失效',
      abilityMalfunctioned: true,
    };
  }

  // 步驟 4: 判定提名者身份
  const nominatorIsTownsfolk = nominator.team === 'townsfolk';

  // 間諜特殊處理
  const isSpy = nominator.role === 'spy'
    && !nominator.isPoisoned
    && !nominator.isDrunk;

  if (nominatorIsTownsfolk) {
    return { triggered: true, reason: '提名者是鎮民' };
  }

  if (isSpy) {
    return {
      triggered: false,
      reason: '提名者是間諜（能力正常）',
      spyCanRegisterAsTownsfolk: true,
    };
  }

  return { triggered: false, reason: '提名者不是鎮民' };
}
```

### VirginCheckResult 型別

```typescript
export interface VirginCheckResult {
  triggered: boolean;           // 是否觸發處決
  reason: string;               // 判定原因
  abilityMalfunctioned?: boolean; // 能力是否因中毒/醉酒失效
  spyCanRegisterAsTownsfolk?: boolean; // 間諜是否可被視為鎮民
}
```

### 處決執行

```typescript
// 在提名流程中
const result = checkVirginAbility(virgin, nominator);

// 無論結果如何，標記能力已使用
stateManager.markAbilityUsed(virgin.seat);

if (result.triggered) {
  // 提名者立即被處決
  stateManager.killPlayer(nominator.seat, 'virgin_ability');

  // 設定今日處決（送葬者會追蹤）
  stateManager.getState().executedToday = nominator.seat;

  stateManager.logEvent({
    type: 'ability_use',
    description: `貞潔者能力觸發：${nominator.seat}號 ${nominator.name} 被立即處決`,
    details: {
      role: 'virgin',
      virginSeat: virgin.seat,
      nominatorSeat: nominator.seat,
      nominatorRole: nominator.role,
    },
  });

  // 直接進入夜間階段
}
```

### GameState 相關

貞潔者的處決使用現有的 `killPlayer(seat, 'virgin_ability')`，已在 GameState 中支援：

```typescript
// src/engine/GameState.ts - 已存在
killPlayer(seat: number, cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other'): void

// src/engine/types.ts - 已存在
deathCause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other' | null;
```

**重要**：`virgin_ability` 處決**會設定** `executedToday`，送葬者會視為白天被處決。觸發後直接進入夜間階段。

---

## UI 規格

### UI 流程

貞潔者的 UI 在**白天提名階段**觸發，而非夜間處理。

#### 觸發時機

當說書人確認某玩家提名貞潔者時，系統應：
1. 自動檢查貞潔者狀態與提名者身份
2. 顯示判定結果對話框
3. 說書人確認後執行結果

#### 1. 能力觸發（鎮民提名，能力正常）

```
⚡ 貞潔者能力觸發！

5號 Alice（貞潔者 Virgin）被提名
提名者：3號 Bob（洗衣婦 Washerwoman）← 鎮民

→ 3號 Bob 將被立即處決
→ 直接進入夜間階段

[確認處決，進入夜間]
```

#### 2. 能力未觸發（非鎮民提名，能力正常）

```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
提名者：6號 Charlie（小惡魔 Imp）← 非鎮民

→ 能力未觸發，正常進入投票
（貞潔者能力已消耗）

[確認，進入投票]
```

#### 3. 能力失效（中毒/醉酒）

```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
能力狀態：⚠️ 中毒（能力失效）
提名者：3號 Bob（洗衣婦 Washerwoman）← 鎮民

⚠️ 貞潔者中毒，能力失效
→ 不觸發處決，正常進入投票
（貞潔者能力已消耗）

[確認，進入投票]
```

#### 4. 酒鬼（以為自己是貞潔者）

```
「貞潔者」被提名

5號 Alice 被提名
能力狀態：🍺 實際上是酒鬼（無能力）

→ 無貞潔者能力，正常進入投票

[確認，進入投票]
```

#### 5. 間諜提名（能力正常）

```
貞潔者被提名

5號 Alice（貞潔者 Virgin）被提名
提名者：6號 Lee（間諜 Spy，能力正常）

選擇判定：
○ 間諜被視為鎮民 → 觸發貞潔者能力，間諜被處決
○ 間諜保持爪牙身份 → 不觸發，正常投票

ℹ️ 提示：間諜能力正常，可以被認定為善良角色

[確認]
```

#### 6. 能力已使用

不顯示特殊 UI，當作普通提名處理。

---

## 測試用例

### T1：鎮民提名貞潔者（能力正常）

```typescript
describe('Virgin - 鎮民提名', () => {
  it('應該觸發處決提名者', () => {
    // Given: 5號是 Virgin（能力正常），3號是 Washerwoman 提名 5號
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 3, role: 'washerwoman', team: 'townsfolk' };

    // When: 檢查貞潔者能力
    const result = checkVirginAbility(virgin, nominator);

    // Then: 觸發處決
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('鎮民');
  });
});
```

### T2：非鎮民提名貞潔者

```typescript
describe('Virgin - 非鎮民提名', () => {
  it('外來者提名不觸發', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 3, role: 'butler', team: 'outsider' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
  });

  it('爪牙提名不觸發', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 3, role: 'poisoner', team: 'minion' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
  });

  it('惡魔提名不觸發', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 3, role: 'imp', team: 'demon' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
  });
});
```

### T3：貞潔者中毒

```typescript
describe('Virgin - 中毒', () => {
  it('中毒時鎮民提名不觸發', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: true };
    const nominator = { seat: 3, role: 'washerwoman', team: 'townsfolk' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
    expect(result.abilityMalfunctioned).toBe(true);
  });
});
```

### T4：酒鬼以為自己是貞潔者

```typescript
describe('Virgin - 酒鬼', () => {
  it('酒鬼沒有貞潔者能力', () => {
    const virgin = { seat: 5, role: 'drunk', believesRole: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 3, role: 'washerwoman', team: 'townsfolk' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
    expect(result.abilityMalfunctioned).toBe(true);
  });
});
```

### T5：能力已使用

```typescript
describe('Virgin - 能力已使用', () => {
  it('第二次被提名不觸發', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: true, isPoisoned: false };
    const nominator = { seat: 3, role: 'washerwoman', team: 'townsfolk' };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('已使用');
  });
});
```

### T6：間諜提名貞潔者

```typescript
describe('Virgin - 間諜提名', () => {
  it('間諜能力正常時，可被視為鎮民', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 6, role: 'spy', team: 'minion', isPoisoned: false, isDrunk: false };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false); // 預設不觸發
    expect(result.spyCanRegisterAsTownsfolk).toBe(true); // 但說書人可選擇觸發
  });

  it('間諜中毒時，不能偽裝為鎮民', () => {
    const virgin = { seat: 5, role: 'virgin', abilityUsed: false, isPoisoned: false };
    const nominator = { seat: 6, role: 'spy', team: 'minion', isPoisoned: true, isDrunk: false };

    const result = checkVirginAbility(virgin, nominator);

    expect(result.triggered).toBe(false);
    expect(result.spyCanRegisterAsTownsfolk).toBeUndefined();
  });
});
```

### T7：Virgin 處決觸發送葬者

```typescript
describe('Virgin - 與送葬者的互動', () => {
  it('virgin_ability 處決會設定 executedToday', () => {
    // Given: 貞潔者能力觸發，3號被處決
    stateManager.killPlayer(3, 'virgin_ability');
    stateManager.getState().executedToday = 3;

    // Then: executedToday 應該被設定為 3號
    expect(stateManager.getExecutedPlayerToday()?.seat).toBe(3);
  });
});
```

### T8：Virgin 處決後直接進入夜間階段

```typescript
describe('Virgin - 進入夜間階段', () => {
  it('Virgin 處決後不會繼續白天流程', () => {
    // Given: 貞潔者能力觸發，3號被 virgin_ability 處決
    // Then: 應直接進入夜間階段，不繼續白天的提名/投票流程
    // 此測試驗證 UI 流程在觸發後正確導向夜間階段
  });
});
```

---

## 實作檢查清單

### 判定邏輯

- [ ] 實作 `checkVirginAbility()` 函式
  - [ ] 檢查 abilityUsed 狀態
  - [ ] 檢查中毒/醉酒/酒鬼
  - [ ] 判定提名者是否為鎮民
  - [ ] 處理間諜特殊情況
  - [ ] 返回 VirginCheckResult

### 提名流程整合

- [ ] 在提名流程中加入貞潔者檢查
  - [ ] 被提名者是否為貞潔者（或酒鬼以為自己是貞潔者）
  - [ ] 呼叫 checkVirginAbility()
  - [ ] 根據結果執行處決或繼續投票
  - [ ] 標記 abilityUsed

### UI

- [ ] 實作貞潔者判定對話框
  - [ ] 能力觸發畫面（鎮民提名）
  - [ ] 能力未觸發畫面（非鎮民提名）
  - [ ] 能力失效畫面（中毒/醉酒）
  - [ ] 間諜提名時的選擇 UI

### 型別定義

- [ ] 定義 `VirginCheckResult` 介面

### 測試

- [ ] 鎮民提名觸發測試
- [ ] 非鎮民提名不觸發測試
- [ ] 中毒/醉酒失效測試
- [ ] 酒鬼測試
- [ ] 能力已使用測試
- [ ] 間諜提名測試
- [ ] Virgin 處決設定 executedToday 測試
- [ ] Virgin 處決後進入夜間階段測試

---

## 注意事項

1. **能力消耗時機**：
   - 第一次被提名即消耗，無論能力是否正常運作
   - 中毒時被提名也消耗能力（解毒後不會恢復）

2. **death cause 區分**：
   - `virgin_ability` 與 `execution` 是不同的死亡原因
   - 送葬者會追蹤 `virgin_ability` 處決（視為白天被處決）
   - 聖徒能力只在 `execution` 時觸發（Virgin 處決不觸發聖徒）

3. **提名流程影響**：
   - Virgin 觸發時中止提名，不進入投票
   - 直接進入夜間階段，不會繼續白天的提名/投票

4. **與間諜的互動**：
   - 間諜能力正常時，說書人可選擇將間諜視為鎮民
   - 這是一個說書人決策點，需要 UI 支援選擇
   - 間諜中毒/醉酒時失去偽裝能力

5. **與酒鬼的關係**：
   - 酒鬼以為自己是貞潔者 → 完全沒有貞潔者能力
   - 對其他玩家來說，提名「貞潔者」（實際是酒鬼）不會有任何效果
