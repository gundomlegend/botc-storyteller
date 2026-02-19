# Saint（聖徒）規格書

## 概述

聖徒是外來者（Outsider）陣營的**被動觸發型角色**。若聖徒被投票處決，善良陣營立即落敗，遊戲結束。

**關鍵特性**：
- 白天被動觸發能力（處決結算時）
- 不是夜間能力，沒有任何夜間行動（firstNight: 0, otherNight: 0）
- 持續性能力：只要聖徒活著且被投票處決就會觸發
- 受中毒/醉酒影響（見下方說明）
- 死亡後不工作（worksWhenDead: false）
- 只有 `execution`（標準投票處決）才觸發，`virgin_ability` 不觸發

---

## 角色資料

```json
{
  "id": "saint",
  "name": "Saint",
  "name_cn": "聖徒",
  "team": "outsider",
  "ability": "If you die by execution, your team loses.",
  "ability_cn": "若你被處決，你的陣營直接落敗。",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": [],
  "setup": false,
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

**中文能力描述**：若你被處決，你的陣營直接落敗。

> **注意**：目前 `trouble-brewing.json` 中 `affectedByPoison` 和 `affectedByDrunk` 設為 `false`，需修正為 `true`。聖徒中毒時能力失效，處決不會導致善良陣營落敗。

---

## 核心機制

### 基本邏輯流程

```
投票通過，即將處決某玩家時：
├─ 步驟 1: 檢查被處決者是否為聖徒（或酒鬼以為自己是聖徒）
│  └─ 不是？ → 正常處決
│
├─ 步驟 2: 檢查聖徒能力狀態
│  ├─ 中毒？ → 能力失效，正常處決（善良陣營不會落敗）
│  └─ 實際上是酒鬼？ → 無聖徒能力，正常處決
│
├─ 步驟 3: 聖徒能力正常
│  └─ 顯示警告對話框，等待說書人確認
│
└─ 步驟 4: 執行結果
   ├─ 能力正常 → 處決聖徒，善良陣營落敗，遊戲結束
   └─ 能力失效 → 正常處決，遊戲繼續
```

### 重要規則

1. **只有投票處決觸發**：死亡原因必須是 `execution`（標準投票處決）。`virgin_ability`、`demon_kill`、`other` 均不觸發
2. **善良陣營落敗**：聖徒的「你的陣營」指善良陣營（鎮民 + 外來者），邪惡陣營（爪牙 + 惡魔）獲勝
3. **立即結束**：遊戲在處決結算後立即結束，不繼續白天流程
4. **中毒時無效**：聖徒中毒時被處決，能力失效，遊戲正常繼續
5. **酒鬼無效**：酒鬼以為自己是聖徒，被處決不會觸發任何效果

---

## 情境處理

### 情境 1：聖徒被投票處決（能力正常）

**條件**：
- 聖徒能力正常（未中毒、非酒鬼）
- 投票通過，聖徒被處決

**處理**：
1. 顯示警告對話框，提示善良陣營將落敗
2. 說書人確認後，處決聖徒（deathCause: `execution`）
3. 善良陣營落敗，邪惡陣營獲勝
4. 遊戲結束

**範例**：
```
第 2 天白天：
- 5號玩家（Saint 聖徒）被投票處決
- 聖徒能力觸發！
- 善良陣營落敗，邪惡陣營獲勝
- 遊戲結束
```

**UI 顯示**：
```
⚠️ 即將處決聖徒！

5號 Alice（聖徒 Saint）即將被處決
能力狀態：✅ 能力正常

→ 若處決聖徒，善良陣營立即落敗！

[確認處決 → 邪惡獲勝]  [取消]
```

---

### 情境 2：聖徒被投票處決（中毒中）

**條件**：
- 聖徒中毒
- 投票通過，聖徒被處決

**處理**：
1. 顯示對話框，提示能力失效
2. 說書人確認後，正常處決聖徒
3. 遊戲繼續

**範例**：
```
第 2 天白天：
- 5號玩家（Saint 聖徒，中毒中）被投票處決
- 聖徒中毒，能力失效
- 正常處決，遊戲繼續
```

**UI 顯示**：
```
即將處決聖徒

5號 Alice（聖徒 Saint）即將被處決
能力狀態：⚠️ 中毒（能力失效）

→ 聖徒中毒，處決不會導致善良陣營落敗

[確認處決]  [取消]
```

---

### 情境 3：酒鬼以為自己是聖徒被處決

**條件**：
- 玩家實際上是酒鬼（role: `drunk`, believesRole: `saint`）
- 投票通過，被處決

**處理**：
1. 顯示對話框，提示實際是酒鬼
2. 說書人確認後，正常處決
3. 遊戲繼續

**範例**：
```
第 2 天白天：
- 5號玩家（Drunk 酒鬼，以為自己是 Saint 聖徒）被投票處決
- 實際是酒鬼，無聖徒能力
- 正常處決，遊戲繼續
```

**UI 顯示**：
```
「聖徒」即將被處決

5號 Alice（實際上是酒鬼 Drunk）即將被處決
能力狀態：🍺 實際上是酒鬼（無能力）

→ 無聖徒能力，正常處決

[確認處決]  [取消]
```

---

### 情境 4：聖徒被惡魔夜殺

**條件**：
- 聖徒在夜間被惡魔殺死

**處理**：
- 死亡原因是 `demon_kill`，不是 `execution`
- 聖徒能力不觸發
- 遊戲正常繼續

---

## 特殊規則

### 1. 觸發條件嚴格限定

| 死亡原因 | 觸發聖徒能力 | 說明 |
|---|---|---|
| `execution`（投票處決） | ✅ 是 | 唯一觸發條件 |
| `virgin_ability`（貞潔者能力） | ❌ 否 | 非標準處決 |
| `demon_kill`（惡魔夜殺） | ❌ 否 | 夜間死亡 |
| `other`（其他） | ❌ 否 | 非處決死亡 |

### 2. 中毒/醉酒影響

| 狀態 | 被處決時效果 |
|---|---|
| 能力正常 | 善良陣營落敗 |
| 中毒 | 能力失效，正常處決 |
| 實際是酒鬼 | 無能力，正常處決 |

### 3. 與送葬者的互動

- 聖徒被處決後（無論能力是否觸發），送葬者仍能得知被處決者是聖徒
- 但若遊戲因聖徒能力結束，送葬者的夜間行動不會再執行

### 4. 與貞潔者的互動

- 聖徒是外來者，提名貞潔者不會觸發貞潔者能力
- 貞潔者能力處決（`virgin_ability`）不觸發聖徒能力
- 兩者的能力互不干擾

### 5. 遊戲結束優先級

- 聖徒被處決 → 遊戲結束（邪惡獲勝），不再進行其他結算
- 此處決仍設定 `executedToday`，但後續夜間不會執行

---

## 實作規格

### 與現有系統的關係

聖徒的能力在**白天處決結算時**觸發：
- **不需要 Handler**（無夜間行動）
- **不需要 Processor**（無夜間 UI）
- **需要處決階段判定邏輯**：在投票通過、處決執行前檢查聖徒條件
- **需要遊戲結束機制**：目前系統尚未實作遊戲結束邏輯，需新增

### 判定函式

```typescript
/**
 * 檢查處決聖徒時是否觸發遊戲結束
 *
 * @param player - 即將被處決的玩家
 * @returns 判定結果
 */
function checkSaintExecution(player: Player): SaintCheckResult {
  // 步驟 1: 檢查是否為聖徒（或酒鬼以為自己是聖徒）
  const isSaint = player.role === 'saint';
  const isDrunkSaint = player.role === 'drunk' && player.believesRole === 'saint';

  if (!isSaint && !isDrunkSaint) {
    return { isSaint: false };
  }

  // 步驟 2: 檢查能力狀態
  if (isDrunkSaint) {
    return {
      isSaint: true,
      abilityWorks: false,
      reason: '實際上是酒鬼',
    };
  }

  if (player.isPoisoned) {
    return {
      isSaint: true,
      abilityWorks: false,
      reason: '中毒，能力失效',
    };
  }

  // 步驟 3: 能力正常
  return {
    isSaint: true,
    abilityWorks: true,
    reason: '能力正常，善良陣營將落敗',
  };
}
```

### SaintCheckResult 型別

```typescript
export type SaintCheckResult =
  | { isSaint: false }
  | {
      isSaint: true;
      abilityWorks: boolean;
      reason: string;
    };
```

### 遊戲結束機制

需在 `GameState` 中新增遊戲結束相關欄位與方法：

```typescript
// types.ts - 新增
export interface GameState {
  // ... 現有欄位
  gameOver: boolean;
  winner: 'good' | 'evil' | null;
  gameOverReason: string | null;
}

// GameState.ts - 新增方法
endGame(winner: 'good' | 'evil', reason: string): void {
  this.state.gameOver = true;
  this.state.winner = winner;
  this.state.gameOverReason = reason;

  this.logEvent({
    type: 'game_end',
    description: `遊戲結束：${winner === 'good' ? '善良' : '邪惡'}陣營獲勝（${reason}）`,
    details: { winner, reason },
  });
}
```

> **注意**：`game_end` 需加入 `GameEvent.type` 的聯合型別。

### 處決流程整合

在 `DayView.tsx` 的處決流程中加入聖徒檢查：

```typescript
// 現有 handleExecute
const handleExecute = () => {
  if (nomineeSeat == null) return;
  const nominee = players.find((p) => p.seat === nomineeSeat);
  if (!nominee) return;

  // 聖徒檢查
  const saintResult = checkSaintExecution(nominee);
  if (saintResult.isSaint) {
    setSaintDialog({
      type: saintResult.abilityWorks ? 'game_ending' : 'ability_failed',
      player: nominee,
      result: saintResult,
    });
    return; // 等待說書人確認
  }

  // 正常處決
  killPlayer(nomineeSeat, 'execution');
  resetNomination();
};
```

### 聖徒確認後的處理

```typescript
// 能力正常 → 處決 + 遊戲結束
const handleSaintConfirmExecute = () => {
  const { player } = saintDialog;
  killPlayer(player.seat, 'execution');

  stateManager.endGame('evil', `聖徒（${player.seat}號 ${player.name}）被處決`);

  stateManager.logEvent({
    type: 'ability_use',
    description: `聖徒能力觸發：善良陣營落敗`,
    details: {
      role: 'saint',
      saintSeat: player.seat,
    },
  });

  setSaintDialog({ type: 'none' });
  resetNomination();
  // → 顯示遊戲結束畫面
};

// 能力失效 → 正常處決
const handleSaintExecuteNormal = () => {
  const { player } = saintDialog;
  killPlayer(player.seat, 'execution');
  setSaintDialog({ type: 'none' });
  resetNomination();
};

// 取消處決（說書人改變主意）
const handleSaintCancel = () => {
  setSaintDialog({ type: 'none' });
};
```

---

## UI 規格

### UI 流程

聖徒的 UI 在**投票通過、處決執行前**觸發。

#### 觸發時機

當投票通過，說書人點擊「處決」按鈕時，系統應：
1. 檢查被處決者是否為聖徒（或酒鬼以為自己是聖徒）
2. 若是，顯示聖徒確認對話框
3. 說書人確認後執行結果

#### 1. 能力觸發（能力正常，處決將導致善良落敗）

```
⚠️ 即將處決聖徒！

5號 Alice（聖徒 Saint）即將被處決
能力狀態：✅ 能力正常

→ 若處決聖徒，善良陣營立即落敗！
→ 邪惡陣營獲勝，遊戲結束

[確認處決 → 邪惡獲勝]  [取消]
```

#### 2. 能力失效（中毒）

```
即將處決聖徒

5號 Alice（聖徒 Saint）即將被處決
能力狀態：⚠️ 中毒（能力失效）

→ 聖徒中毒，處決不會導致善良陣營落敗
→ 正常處決，遊戲繼續

[確認處決]  [取消]
```

#### 3. 酒鬼（以為自己是聖徒）

```
「聖徒」即將被處決

5號 Alice（實際上是酒鬼 Drunk）即將被處決
能力狀態：🍺 實際上是酒鬼（無能力）

→ 無聖徒能力，正常處決

[確認處決]  [取消]
```

#### 4. 非聖徒

不顯示特殊 UI，正常處決流程。

### 遊戲結束畫面

聖徒被處決且能力正常觸發後，應顯示遊戲結束畫面：

```
🏁 遊戲結束

邪惡陣營獲勝！

原因：聖徒（5號 Alice）被處決，善良陣營落敗

[查看遊戲記錄]  [開始新遊戲]
```

> **備註**：遊戲結束畫面是通用元件，未來其他遊戲結束條件（惡魔死亡、僅剩兩人等）也會使用。此處先定義基本結構，後續可擴展。

### SaintDialog 狀態型別

```typescript
type SaintDialogState =
  | { type: 'none' }
  | { type: 'game_ending'; player: Player; result: SaintCheckResult & { isSaint: true } }
  | { type: 'ability_failed'; player: Player; result: SaintCheckResult & { isSaint: true } };
```

---

## 測試用例

### T1：聖徒被投票處決（能力正常）

```typescript
describe('Saint - 投票處決（能力正常）', () => {
  it('應該觸發遊戲結束，邪惡獲勝', () => {
    // Given: 5號是 Saint（能力正常）
    const player = { seat: 5, role: 'saint', team: 'outsider', isPoisoned: false };

    // When: 檢查聖徒處決
    const result = checkSaintExecution(player);

    // Then: 能力觸發
    expect(result.isSaint).toBe(true);
    expect(result.abilityWorks).toBe(true);
  });
});
```

### T2：聖徒中毒時被處決

```typescript
describe('Saint - 中毒時被處決', () => {
  it('能力失效，遊戲繼續', () => {
    // Given: 5號是 Saint（中毒中）
    const player = { seat: 5, role: 'saint', team: 'outsider', isPoisoned: true };

    // When: 檢查聖徒處決
    const result = checkSaintExecution(player);

    // Then: 能力失效
    expect(result.isSaint).toBe(true);
    expect(result.abilityWorks).toBe(false);
    expect(result.reason).toContain('中毒');
  });
});
```

### T3：酒鬼以為自己是聖徒

```typescript
describe('Saint - 酒鬼', () => {
  it('沒有聖徒能力', () => {
    // Given: 5號是 Drunk（以為自己是 Saint）
    const player = { seat: 5, role: 'drunk', believesRole: 'saint', isPoisoned: false };

    // When: 檢查聖徒處決
    const result = checkSaintExecution(player);

    // Then: 沒有能力
    expect(result.isSaint).toBe(true);
    expect(result.abilityWorks).toBe(false);
    expect(result.reason).toContain('酒鬼');
  });
});
```

### T4：非聖徒被處決

```typescript
describe('Saint - 非聖徒', () => {
  it('不觸發聖徒檢查', () => {
    // Given: 3號是 Washerwoman
    const player = { seat: 3, role: 'washerwoman', team: 'townsfolk', isPoisoned: false };

    // When: 檢查聖徒處決
    const result = checkSaintExecution(player);

    // Then: 不是聖徒
    expect(result.isSaint).toBe(false);
  });
});
```

### T5：聖徒被惡魔夜殺（不觸發）

```typescript
describe('Saint - 惡魔夜殺', () => {
  it('非處決死亡，不觸發能力', () => {
    // Given: 5號是 Saint，被惡魔夜殺
    // When: killPlayer(5, 'demon_kill')
    // Then: 聖徒能力不觸發（checkSaintExecution 只在處決流程中呼叫）
    // 此測試驗證 checkSaintExecution 不會在夜殺流程中被呼叫
  });
});
```

### T6：聖徒被貞潔者能力處決（不觸發）

```typescript
describe('Saint - 貞潔者能力處決', () => {
  it('virgin_ability 死因不觸發聖徒能力', () => {
    // Given: 聖徒因某種原因被 virgin_ability 處死
    // When: killPlayer(5, 'virgin_ability')
    // Then: 聖徒能力不觸發（checkSaintExecution 只在標準投票處決流程中呼叫）
    // 程式架構保證：checkSaintExecution 只在 handleExecute 中呼叫
    // handleExecute 只會使用 'execution' 死因
  });
});
```

### T7：聖徒處決設定 executedToday

```typescript
describe('Saint - executedToday', () => {
  it('聖徒被處決會設定 executedToday', () => {
    // Given: 5號是 Saint
    stateManager.killPlayer(5, 'execution');

    // Then: executedToday 應該被設定為 5號
    expect(stateManager.getState().executedToday).toBe(5);
  });
});
```

### T8：遊戲結束狀態

```typescript
describe('Saint - 遊戲結束', () => {
  it('聖徒被處決後遊戲結束', () => {
    // Given: 聖徒能力正常
    // When: 確認處決聖徒
    stateManager.killPlayer(5, 'execution');
    stateManager.endGame('evil', '聖徒被處決');

    // Then: 遊戲結束，邪惡獲勝
    expect(stateManager.getState().gameOver).toBe(true);
    expect(stateManager.getState().winner).toBe('evil');
  });
});
```

---

## 實作檢查清單

### 角色資料修正

- [ ] 修正 `trouble-brewing.json` 中聖徒的 `affectedByPoison` 為 `true`
- [ ] 修正 `trouble-brewing.json` 中聖徒的 `affectedByDrunk` 為 `true`

### 判定邏輯

- [ ] 新增 `src/engine/SaintAbility.ts`
  - [ ] 實作 `checkSaintExecution()` 函式
  - [ ] 定義 `SaintCheckResult` 型別
  - [ ] 檢查角色身份（saint / drunk+believesRole）
  - [ ] 檢查中毒狀態
  - [ ] 返回判定結果

### 遊戲結束機制

- [ ] 在 `GameState` 介面新增 `gameOver`、`winner`、`gameOverReason` 欄位
- [ ] 在 `GameEvent.type` 新增 `'game_end'`
- [ ] 在 `GameStateManager` 新增 `endGame()` 方法
- [ ] 在 `GameStateManager` 初始化時設定預設值

### 處決流程整合

- [ ] 在 `DayView.tsx` 的 `handleExecute` 中加入聖徒檢查
  - [ ] 被處決者是否為聖徒（或酒鬼以為自己是聖徒）
  - [ ] 呼叫 `checkSaintExecution()`
  - [ ] 根據結果顯示對話框或正常處決

### UI

- [ ] 實作 `SaintDialog` 元件
  - [ ] 能力觸發畫面（遊戲即將結束）
  - [ ] 能力失效畫面（中毒/酒鬼）
  - [ ] 取消按鈕（讓說書人可以反悔）
- [ ] 實作遊戲結束畫面（通用元件，供未來其他結束條件使用）

### 測試

- [ ] 聖徒投票處決觸發測試
- [ ] 聖徒中毒時不觸發測試
- [ ] 酒鬼以為是聖徒測試
- [ ] 非聖徒不觸發測試
- [ ] 惡魔夜殺不觸發測試
- [ ] 貞潔者能力處決不觸發測試
- [ ] executedToday 設定測試
- [ ] 遊戲結束狀態測試

---

## 注意事項

1. **死亡原因是判定關鍵**：
   - 程式碼應以 `deathCause` 判斷，而非假設場景
   - `checkSaintExecution` 只在 `handleExecute`（投票處決）流程中呼叫，從架構上保證只有 `execution` 觸發

2. **角色資料需修正**：
   - `trouble-brewing.json` 中聖徒的 `affectedByPoison` 和 `affectedByDrunk` 需改為 `true`
   - 中毒的聖徒被處決，能力失效，遊戲繼續

3. **遊戲結束是新機制**：
   - 目前系統尚未有遊戲結束邏輯
   - 聖徒實作將引入 `gameOver`、`winner`、`gameOverReason` 等狀態
   - 此機制應設計為通用架構，供未來其他結束條件使用（惡魔死亡、僅剩兩人等）

4. **UI 應提供取消選項**：
   - 聖徒被處決是不可逆的遊戲結束操作
   - 對話框應提供「取消」按鈕，讓說書人可以重新考慮
   - 這與貞潔者 UI 不同：貞潔者沒有取消選項（能力自動觸發）

5. **與其他角色的互動**：
   - 間諜：被處決的間諜不會觸發聖徒效果（間諜的偽裝不等於擁有能力）
   - 貞潔者：`virgin_ability` 不觸發聖徒能力
   - 送葬者：聖徒被處決後遊戲結束，送葬者不會執行夜間行動
