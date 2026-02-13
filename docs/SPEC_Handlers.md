# 角色處理器規格文件

本文件詳細說明所有特殊角色處理器的實作規格。

---

## 技能驗證 (Ability Invalidation)

能力失效合約：`docs/contracts/AbilityInvalidation.contract.md`

**Handler 不負責 invalidation 檢查。** 所有 invalidation 由 RuleEngine 統一後處理：

| 情境 | 誰負責 | Handler 要做什麼 |
|---|---|---|
| 中毒/醉酒導致效果型能力不落地（AC1） | RuleEngine `applyInvalidation()` 標記 `effectNullified: true` | 不用管，照常回傳結果 |
| 中毒/醉酒導致資訊不可靠（AC1） | UI 層提示說書人可自行決定 | 回傳實際偵測結果，不反轉；UI 根據 `item.isPoisoned/isDrunk` 提示 |
| 死亡跳過（AC2） | RuleEngine 前檢查 | 不用管 |
| 角色變更撤銷持續狀態（AC3） | GameState `revokeEffectsFrom()` | 不用管 |
| NightContext 攔截（AC4） | RuleEngine 前檢查 `blockedRoles` | 不用管 |

**設計原則**：Handler 只寫純能力邏輯（happy path），不做防禦性檢查。

## 處理器介面

所有角色處理器必須實作 `RoleHandler` 介面：
```typescript
interface RoleHandler {
  process(context: HandlerContext): NightResult;
}

interface HandlerContext {
  roleData: RoleData;        // 角色資料
  player: Player;            // 執行能力的玩家
  target: Player | null;     // 目標玩家
  secondTarget?: Player;     // 第二個目標（如占卜師）
  gameState: GameState;      // 遊戲狀態
  infoReliable: boolean;     // 資訊是否可靠
  statusReason: string;      // 狀態原因
}
```

---

## 1. 占卜師處理器 (FortunetellerHandler)

### 檔案位置
`src/engine/handlers/FortunetellerHandler.ts`

### 角色能力
每個夜晚，選擇兩位玩家：你得知他們其中是否有惡魔。有一位善良玩家（干擾項）會對你顯示為惡魔。

### 設計原則
- **Handler 回傳實際偵測結果，不反轉**
- 中毒/醉酒時由 UI 層提示說書人可給任意答案
- 說書人永遠做最終決定（有惡魔/無惡魔）

### 干擾項（Red Herring）

第一晚占卜師階段開始前，說書人從善良陣營（townsfolk / outsider）選擇一位玩家標記為干擾項。

- **≤ 6 人局**：可選占卜師自己
- **> 6 人局**：不可選占卜師自己
- 干擾項設定後在整場遊戲中持續有效，存於 `gameState.redHerringSeat`

### 偵測判定邏輯

```
targetTriggersDetection(target) =
  target.team === 'demon'                                           // 惡魔
  || (target.role === 'recluse' && !target.isPoisoned && !target.isDrunk)  // 陌客（正常時觸發）
  || target.seat === redHerringSeat                                 // 干擾項

rawDetection = triggers(target1) || triggers(target2)
```

**陌客檢測規則**：
- **陌客正常狀態**：觸發偵測（說書人決定）
- **陌客中毒/醉酒**：能力失效，**不觸發偵測**

> 陌客帶干擾項 → 無額外效果（本來就會觸發偵測）
> 爪牙（minion）不觸發偵測

**與廚師邏輯一致性**：
- 廚師：陌客中毒/醉酒 → 不被視為邪惡
- 占卜師：陌客中毒/醉酒 → 不觸發偵測
- 兩者行為一致，符合「能力失效」規則

### 中毒/醉酒處理
- Handler 仍回傳實際偵測結果（`rawDetection`）
- UI 層根據 `item.isPoisoned / item.isDrunk` 顯示警告
- 中毒/醉酒時：回答選項**不預選**，說書人必須自行選擇
- 正常狀態時：回答選項**預選**實際偵測結果

### 處理流程
```
1. 檢查雙目標
   ├─ target 或 secondTarget 為空 → 返回 needInput (select_two_players)
   └─ 兩者皆有 → 繼續
   ↓
2. 偵測判定
   ├─ target1: 是惡魔 / 陌客 / 干擾項？
   └─ target2: 是惡魔 / 陌客 / 干擾項？
   ↓
3. 計算 rawDetection = t1Triggers || t2Triggers
   ↓
4. 回傳結果
   └─ info.rawDetection、各目標偵測細節、reasoning
```

### 回傳格式
```typescript
{
  action: 'tell_alignment',
  info: {
    rawDetection: boolean,
    target1: { seat: number, isDemon: boolean, isRecluse: boolean, isRedHerring: boolean },
    target2: { seat: number, isDemon: boolean, isRecluse: boolean, isRedHerring: boolean },
  },
  mustFollow: false,
  canLie: true,
  reasoning: string,   // 偵測原因說明
  display: string,      // 完整顯示文字
}
```

### UI 流程（FortunetellerProcessor）

占卜師使用專屬 UI 處理器 `FortunetellerProcessor`（`src/components/roleProcessors/FortunetellerProcessor.tsx`），
透過 `ROLE_PROCESSORS` 註冊表由 `AbilityProcessor` 自動路由。

```
第一晚：
  1. 干擾項選擇（善良陣營角色清單，≤6人可選自己，>6人排除自己）
  2. 第一位目標選擇（PlayerSelector mode=single）
  3. 第二位目標選擇（PlayerSelector mode=single，排除已選目標）
  4. 執行能力 → 顯示偵測結果
  5. 說書人選擇回答：
     ├─ 正常：預選 rawDetection 對應選項
     └─ 中毒/醉酒：不預選 + 警告提示
  6. 確認 → 記錄到歷史

第二晚起：
  跳過步驟 1，其餘相同
```

### 測試案例
```typescript
describe('FortunetellerHandler', () => {
  test('無目標 → needInput, select_two_players');
  test('只有一個目標 → needInput');
  test('雙善良、無干擾項 → rawDetection: false');
  test('其中一個是惡魔 → rawDetection: true');
  test('爪牙不觸發偵測 → rawDetection: false');
  test('干擾項玩家被選中 → rawDetection: true');
  test('陌客正常狀態被選中 → rawDetection: true');
  test('陌客中毒被選中 → rawDetection: false');
  test('陌客醉酒被選中 → rawDetection: false');
  test('陌客帶干擾項（冗餘） → rawDetection: true');
  test('占卜師中毒時仍回傳實際偵測結果，mustFollow: false');
});
```

---

## 2. 廚師處理器 (ChefHandler)

### 檔案位置
`src/engine/handlers/ChefHandler.ts`

### 角色能力
遊戲開始時，你會得知有多少組相鄰且存活的邪惡玩家。

### 設計原則
- **第一夜限定**：只在第一晚執行，其他夜晚跳過
- **自動計算**：不需要選擇目標，自動掃描所有玩家
- **Handler 回傳實際數字**：中毒/醉酒由 UI 層提示說書人可自行決定

### 相鄰配對計算邏輯

座位視為**環形**（seat 1 與最後一位相鄰）。

#### 邪惡玩家判定規則

```
isEvilForChef(player):
  // 特例 1：間諜
  if (player.role === 'spy') {
    // 間諜中毒/醉酒：能力失效，被視為邪惡
    if (player.isPoisoned || player.isDrunk) return true;
    // 間諜正常：不被視為邪惡
    return false;
  }

  // 特例 2：陌客
  if (player.role === 'recluse') {
    // 陌客中毒/醉酒：能力失效，不被視為邪惡
    if (player.isPoisoned || player.isDrunk) return false;
    // 陌客正常：被視為邪惡（說書人決定）
    return true;  // 說書人決定
  }

  // 一般規則：爪牙和惡魔
  return player.team === 'minion' || player.team === 'demon';
```

**特殊角色處理**：
- **間諜（Spy）**：
  - **正常狀態**：雖然是爪牙，但**不會**被廚師偵測為邪惡
  - **中毒/醉酒**：能力失效，**會**被廚師偵測為邪惡
- **陌客（Recluse）**：
  - **正常狀態**：雖然是外來者（善良），但**可能**被廚師偵測為邪惡（說書人決定）
  - **中毒/醉酒**：能力失效，**不會**被廚師偵測為邪惡

#### 計算方法

```
定義：
  - evil(player) = isEvilForChef(player)  // 使用上述判定規則
  - 相鄰：座位號碼連續（考慮環形）

計算方法：
  1. 找出所有「被視為邪惡」的玩家座位號
  2. 找出所有連續邪惡玩家的區塊（segments）
  3. 對每個區塊：N 個連續邪惡玩家 = N-1 組配對
  4. 總配對數 = Σ(每個區塊的配對數)
```

#### 範例

**範例 1：分散的邪惡玩家**
```
座位: 1   2   3   4   5   6
陣營: 善  惡  善  惡  善  善

連續區塊：
  - [2]：1 個邪惡 → 0 組配對
  - [4]：1 個邪惡 → 0 組配對

總配對數 = 0
```

**範例 2：兩個相鄰的邪惡玩家**
```
座位: 1   2   3   4   5   6
陣營: 善  惡  惡  善  善  善

連續區塊：
  - [2, 3]：2 個邪惡 → 1 組配對 (2-3)

總配對數 = 1
```

**範例 3：三個相鄰的邪惡玩家**
```
座位: 1   2   3   4   5   6
陣營: 善  惡  惡  惡  善  善

連續區塊：
  - [2, 3, 4]：3 個邪惡 → 2 組配對 (2-3, 3-4)

總配對數 = 2
```

**範例 4：多個分離區塊**
```
座位: 1   2   3   4   5   6   7   8
陣營: 善  惡  惡  善  善  惡  惡  惡

連續區塊：
  - [2, 3]：2 個邪惡 → 1 組配對
  - [6, 7, 8]：3 個邪惡 → 2 組配對

總配對數 = 3
```

**範例 5：環形相鄰（跨越邊界）**
```
座位: 1   2   3   4   5   6
陣營: 惡  善  善  善  善  惡

連續區塊（環形）：
  - [6, 1]：2 個邪惡 → 1 組配對 (6-1 環形相鄰)

總配對數 = 1
```

**範例 6：全邪惡（理論情況）**
```
座位: 1   2   3   4   5   6
陣營: 惡  惡  惡  惡  惡  惡

連續區塊（環形）：
  - [1, 2, 3, 4, 5, 6]：6 個邪惡 → 5 組配對

總配對數 = 5
```

**範例 7：包含間諜（不計入邪惡）**
```
座位: 1      2      3      4      5      6
角色: Monk   Spy    Imp    Monk   Poisoner Chef
陣營: 善     爪牙*   惡魔   善     爪牙    善

*間諜不被視為邪惡

連續區塊：
  - [3]：1 個邪惡 (Imp) → 0 組配對
  - [5]：1 個邪惡 (Poisoner) → 0 組配對

注意：雖然 2-3 座位相鄰，但 Spy 不算邪惡，所以 Imp 是孤立的

總配對數 = 0
```

**範例 8：包含陌客（被視為邪惡）**
```
座位: 1        2      3      4      5
角色: Recluse  Monk   Imp    Monk   Poisoner
陣營: 外來者*   善     惡魔   善     爪牙

*陌客被視為邪惡（說書人選擇）

連續區塊：
  - [1]：1 個邪惡 (Recluse) → 0 組配對
  - [3]：1 個邪惡 (Imp) → 0 組配對
  - [5, 1]：2 個邪惡 (環形) → 1 組配對 (5-1)

總配對數 = 1
```

**範例 9：間諜打斷連續區塊**
```
座位: 1        2      3      4      5      6
角色: Poisoner Spy    Imp    Baron  Monk   Chef
陣營: 爪牙     爪牙*   惡魔   爪牙   善     善

*間諜不被視為邪惡

連續區塊：
  - [1]：1 個邪惡 (Poisoner) → 0 組配對
  - [3, 4]：2 個邪惡 (Imp, Baron) → 1 組配對 (3-4)

注意：Spy 打斷了 Poisoner 和 Imp 的連續性

總配對數 = 1
```

**範例 10：間諜中毒（被視為邪惡）**
```
座位: 1        2         3      4      5
角色: Poisoner Spy(中毒) Imp    Monk   Chef
陣營: 爪牙     爪牙*     惡魔   善     善

*間諜中毒，能力失效，被視為邪惡

連續區塊：
  - [1, 2, 3]：3 個邪惡 → 2 組配對 (1-2, 2-3)

注意：中毒的間諜被視為邪惡，與相鄰的 Poisoner 和 Imp 形成連續區塊

總配對數 = 2
```

**範例 11：陌客醉酒（不被視為邪惡）**
```
座位: 1            2      3      4
角色: Recluse(醉酒) Monk   Imp    Chef
陣營: 外來者*       善     惡魔   善

*陌客醉酒，能力失效，不被視為邪惡

連續區塊：
  - [3]：1 個邪惡 (Imp) → 0 組配對

注意：醉酒的陌客不被視為邪惡

總配對數 = 0
```

**範例 12：間諜醉酒 + 陌客中毒（雙重反轉）**
```
座位: 1            2         3      4      5
角色: Recluse(中毒) Spy(醉酒) Imp    Monk   Chef
陣營: 外來者*       爪牙*     惡魔   善     善

*陌客中毒：不被視為邪惡
*間諜醉酒：被視為邪惡

連續區塊：
  - [2, 3]：2 個邪惡 (Spy 醉酒, Imp) → 1 組配對 (2-3)

總配對數 = 1
```

### 中毒/醉酒處理

**設計原則**：提供正確答案，但讓說書人決定要告訴玩家什麼數字。

- Handler 仍回傳實際計算結果（`actualPairCount`）
- UI 層根據 `item.isPoisoned / item.isDrunk` 顯示不同介面
- **正常狀態**：
  - 顯示完整偵測資訊（區塊、配對明細）
  - **自動使用**實際計算結果
  - 說書人直接確認即可
- **中毒/醉酒狀態**：
  - 顯示警告：「⚠️ 廚師中毒/醉酒，你可以告訴玩家任意數字」
  - 顯示實際正確數字：「🍽 相鄰的邪惡客人：X 組（你可以選擇撒謊）」
  - 顯示數字輸入框，說書人必須自行輸入要告訴玩家的數字
  - 記錄說書人實際告訴玩家的數字（可能與正確答案不同）

**UI 建議範圍**：
```
告訴廚師的數字 (建議範圍: 0-{邪惡玩家數-1})：
```

- 顯示動態範圍提示
- 輸入框限制：`min="0"`, `max={邪惡玩家數-1}`
- 理論依據：
  - **最小值 0**：所有邪惡玩家分散（無相鄰）
  - **最大值 N-1**：所有 N 個邪惡玩家連續坐（形成 N-1 組配對）
- 範例：
  - 3 個邪惡玩家 → 建議範圍 0-2
  - 5 個邪惡玩家 → 建議範圍 0-4

**記錄內容**：
```typescript
historyEntry = {
  actualPairCount: number,      // 實際配對數（永遠正確）
  toldPairCount: number,        // 說書人告訴玩家的數字（正常狀態 = actualPairCount）
  isPoisoned: boolean,
  isDrunk: boolean,
  storytellerOverride: boolean, // toldPairCount !== actualPairCount（只在中毒/醉酒時可能為 true）
  segments: number[][],         // 連續區塊
  pairDetails: string[],        // 配對明細
  recluseSeats: number[],       // 陌客座位
  spySeats: number[],           // 間諜座位
}

### 處理流程
```
1. 檢查夜晚數
   ├─ night > 1 → 返回 skip（僅第一晚）
   └─ night === 1 → 繼續
   ↓
2. 掃描所有存活玩家
   └─ 篩選出邪惡陣營玩家（minion / demon）
   ↓
3. 計算相鄰配對數
   ├─ 找出所有連續邪惡玩家區塊（考慮環形）
   └─ 每個區塊 N 個玩家 → N-1 組配對
   ↓
4. 回傳結果
   └─ info.pairCount、詳細配對清單、reasoning
```

### 回傳格式
```typescript
{
  action: 'tell_number',
  info: {
    actualPairCount: number,     // 實際配對總數（永遠正確）
    toldPairCount?: number,      // 說書人告訴玩家的數字（UI 填入後更新）
    evilSeats: number[],         // 所有「被視為邪惡」的玩家座位
    segments: number[][],        // 連續區塊 [[2,3], [6,7,8]]
    pairDetails: string[],       // 配對詳情 ["2-3", "6-7", "7-8"]
    recluseSeats: number[],      // 陌客座位（若有）
    spySeats: number[],          // 間諜座位（若有，不計入邪惡）
  },
  mustFollow: false,
  canLie: true,
  reasoning: string,             // 計算說明
  display: string,               // 完整顯示文字
}
```

**UI 處理流程**：
1. Handler 回傳 `actualPairCount`
2. UI 根據 `isPoisoned/isDrunk` 決定顯示模式：
   - 正常：自動使用 `actualPairCount`，不顯示輸入框
   - 中毒/醉酒：顯示輸入框，說書人手動輸入 `toldPairCount`
3. 記錄到歷史時包含兩個數字

### 演算法實作
```typescript
private isEvilForChef(player: Player): boolean {
  // 特例 1：間諜
  if (player.role === 'spy') {
    // 間諜中毒/醉酒：能力失效，被視為邪惡
    if (player.isPoisoned || player.isDrunk) return true;
    // 間諜正常：不被視為邪惡
    return false;
  }

  // 特例 2：陌客
  if (player.role === 'recluse') {
    // 陌客中毒/醉酒：能力失效，不被視為邪惡
    if (player.isPoisoned || player.isDrunk) return false;
    // 陌客正常：被視為邪惡（說書人決定，預設為 true）
    return true;
  }

  // 一般規則：爪牙和惡魔
  return player.team === 'minion' || player.team === 'demon';
}

private findAdjacentPairs(gameState: GameState): {
  actualPairCount: number;
  segments: number[][];
  pairDetails: string[];
  evilSeats: number[];
  recluseSeats: number[];
  spySeats: number[];
} {
  const players = Array.from(gameState.players.values())
    .filter(p => p.isAlive)
    .sort((a, b) => a.seat - b.seat);

  // 篩選被視為邪惡的玩家
  const evilSeats = players
    .filter(p => this.isEvilForChef(p))
    .map(p => p.seat);

  // 記錄特殊角色
  const recluseSeats = players
    .filter(p => p.role === 'recluse')
    .map(p => p.seat);

  const spySeats = players
    .filter(p => p.role === 'spy')
    .map(p => p.seat);

  if (evilSeats.length === 0) {
    return {
      actualPairCount: 0,
      segments: [],
      pairDetails: [],
      evilSeats: [],
      recluseSeats,
      spySeats,
    };
  }

  // 找連續區塊（考慮環形）
  const segments: number[][] = [];
  const visited = new Set<number>();

  for (const seat of evilSeats) {
    if (visited.has(seat)) continue;

    const segment: number[] = [seat];
    visited.add(seat);

    // 向右擴展
    let next = this.getNextSeat(seat, players.length);
    while (evilSeats.includes(next) && !visited.has(next)) {
      segment.push(next);
      visited.add(next);
      next = this.getNextSeat(next, players.length);
    }

    // 向左擴展
    let prev = this.getPrevSeat(seat, players.length);
    while (evilSeats.includes(prev) && !visited.has(prev)) {
      segment.unshift(prev);
      visited.add(prev);
      prev = this.getPrevSeat(prev, players.length);
    }

    segments.push(segment);
  }

  // 計算配對
  let actualPairCount = 0;
  const pairDetails: string[] = [];

  for (const segment of segments) {
    const pairs = segment.length - 1;
    actualPairCount += pairs;

    for (let i = 0; i < segment.length - 1; i++) {
      pairDetails.push(`${segment[i]}-${segment[i + 1]}`);
    }
  }

  return {
    actualPairCount,
    segments,
    pairDetails,
    evilSeats,
    recluseSeats,
    spySeats,
  };
}

private getNextSeat(seat: number, totalPlayers: number): number {
  return seat === totalPlayers ? 1 : seat + 1;
}

private getPrevSeat(seat: number, totalPlayers: number): number {
  return seat === 1 ? totalPlayers : seat - 1;
}
```

### 程式碼實作
```typescript
export class ChefHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { gameState, getRoleName } = context;

    // 步驟 1: 僅第一晚執行
    if (gameState.night > 1) {
      return {
        skip: true,
        skipReason: '廚師僅在第一晚獲得資訊',
        display: '廚師僅在第一晚行動',
      };
    }

    // 步驟 2-3: 計算相鄰配對
    const result = this.findAdjacentPairs(gameState);
    const { actualPairCount, segments, pairDetails, evilSeats, recluseSeats, spySeats } = result;

    // 步驟 4: 回傳結果
    const reasoning = this.buildReasoning(
      actualPairCount,
      segments,
      recluseSeats,
      spySeats,
      gameState,
      getRoleName
    );

    return {
      action: 'tell_number',
      info: {
        actualPairCount,
        toldPairCount: undefined,  // UI 層填入
        evilSeats,
        segments,
        pairDetails,
        recluseSeats,
        spySeats,
      },
      mustFollow: false,
      canLie: true,
      reasoning,
      display: this.formatDisplay(
        actualPairCount,
        segments,
        pairDetails,
        recluseSeats,
        spySeats,
        gameState,
        getRoleName
      ),
    };
  }

  private buildReasoning(
    actualPairCount: number,
    segments: number[][],
    recluseSeats: number[],
    spySeats: number[],
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): string {
    const notes: string[] = [];

    if (recluseSeats.length > 0) {
      const recluseList = recluseSeats.map(s => `${s}號`).join('、');
      notes.push(`陌客 ${recluseList} 被視為邪惡`);
    }

    if (spySeats.length > 0) {
      const spyList = spySeats.map(s => `${s}號`).join('、');
      notes.push(`間諜 ${spyList} 不被視為邪惡`);
    }

    if (actualPairCount === 0) {
      const noteStr = notes.length > 0 ? `（${notes.join('；')}）` : '';
      return `沒有相鄰的邪惡玩家${noteStr}`;
    }

    const parts: string[] = [];
    for (const segment of segments) {
      const roles = segment.map(seat => {
        const player = gameState.players.get(seat)!;
        return `${seat}號(${getRoleName(player.role)})`;
      }).join('、');

      const pairs = segment.length - 1;
      parts.push(`${roles} 形成 ${pairs} 組配對`);
    }

    if (notes.length > 0) {
      parts.push(`註：${notes.join('；')}`);
    }

    return parts.join('；');
  }

  private formatDisplay(
    actualPairCount: number,
    segments: number[][],
    pairDetails: string[],
    recluseSeats: number[],
    spySeats: number[],
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): string {
    const specialNotes: string[] = [];

    if (recluseSeats.length > 0) {
      specialNotes.push(`⚠️ 陌客 ${recluseSeats.join('、')}號 被視為邪惡`);
    }

    if (spySeats.length > 0) {
      specialNotes.push(`ℹ️ 間諜 ${spySeats.join('、')}號 不被視為邪惡`);
    }

    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    if (actualPairCount === 0) {
      return `廚師資訊：0 組相鄰邪惡玩家配對

沒有邪惡玩家相鄰而坐${specialNotesStr}`;
    }

    const segmentInfo = segments.map(seg => {
      const players = seg.map(seat => {
        const player = gameState.players.get(seat)!;
        const role = getRoleName(player.role);
        return `${seat}號 ${player.name}(${role})`;
      }).join(' - ');
      return `  • ${players}`;
    }).join('\n');

    return `廚師資訊：${actualPairCount} 組相鄰邪惡玩家配對

連續邪惡玩家區塊：
${segmentInfo}

配對明細：${pairDetails.join(', ')}${specialNotesStr}`;
  }

  // findAdjacentPairs, getNextSeat, getPrevSeat 如上所示
}
```

### 測試案例
```typescript
describe('ChefHandler', () => {
  test('第一晚之後跳過', () => {
    const gs = makeGameState([...], 2); // night = 2
    const result = handler.process({ gameState: gs });
    expect(result.skip).toBe(true);
  });

  test('沒有邪惡玩家 → pairCount: 0', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'chef', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(0);
  });

  test('單獨邪惡玩家不形成配對 → pairCount: 0', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 4, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(0);
  });

  test('兩個相鄰邪惡玩家 → pairCount: 1', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.pairDetails).toEqual(['2-3']);
  });

  test('三個相鄰邪惡玩家 → pairCount: 2', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(2);
    expect(result.info.pairDetails).toEqual(['2-3', '3-4']);
  });

  test('兩個分離區塊 → pairCount: 總和', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 4, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 5, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 6, role: 'scarletwoman', team: 'minion' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(2); // [2-3] + [5-6]
  });

  test('環形相鄰：首尾相接 → 正確計算', () => {
    const players = [
      makePlayer({ seat: 1, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 4, role: 'poisoner', team: 'minion' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });
    expect(result.info.actualPairCount).toBe(1); // [4-1] 環形
    expect(result.info.segments).toEqual([[4, 1]]);
  });

  test('中毒時仍回傳實際計算結果', () => {
    const players = [
      makePlayer({ seat: 1, role: 'chef', team: 'townsfolk', isPoisoned: true }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
    ];
    const result = handler.process({
      gameState: makeGameState(players),
      infoReliable: false,
      statusReason: '中毒',
    });

    // 仍回傳實際結果，UI 層提示說書人
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.toldPairCount).toBeUndefined(); // UI 填入
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  test('間諜不被視為邪惡 → 不計入配對', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 雖然 2-3 相鄰，但 Spy 不算邪惡，所以 Imp 是孤立的
    expect(result.info.actualPairCount).toBe(0);
    expect(result.info.spySeats).toEqual([2]);
    expect(result.info.evilSeats).toEqual([3]); // 只有 Imp
  });

  test('間諜打斷連續區塊', () => {
    const players = [
      makePlayer({ seat: 1, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'baron', team: 'minion' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // Spy 打斷連續性：[1], [3, 4]
    expect(result.info.actualPairCount).toBe(1); // 只有 3-4
    expect(result.info.segments).toEqual([[1], [3, 4]]);
    expect(result.info.pairDetails).toEqual(['3-4']);
  });

  test('陌客被視為邪惡 → 計入配對', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'recluse', team: 'outsider' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 陌客被視為邪惡，2-3 形成配對
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.recluseSeats).toEqual([2]);
    expect(result.info.evilSeats).toEqual([2, 3]);
    expect(result.info.pairDetails).toEqual(['2-3']);
  });

  test('陌客在環形邊界形成配對', () => {
    const players = [
      makePlayer({ seat: 1, role: 'recluse', team: 'outsider' }),
      makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 4, role: 'poisoner', team: 'minion' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 環形：4-1 形成配對
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.segments).toEqual([[4, 1]]);
  });

  test('陌客和間諜同時存在', () => {
    const players = [
      makePlayer({ seat: 1, role: 'recluse', team: 'outsider' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'monk', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // Recluse 算邪惡，Spy 不算：[1], [3] → 兩個孤立
    expect(result.info.actualPairCount).toBe(0);
    expect(result.info.recluseSeats).toEqual([1]);
    expect(result.info.spySeats).toEqual([2]);
    expect(result.info.evilSeats).toEqual([1, 3]);
  });

  test('間諜中毒 → 被視為邪惡，形成連續區塊', () => {
    const players = [
      makePlayer({ seat: 1, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion', isPoisoned: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 中毒的 Spy 被視為邪惡：[1, 2, 3] → 2 組配對
    expect(result.info.actualPairCount).toBe(2);
    expect(result.info.evilSeats).toEqual([1, 2, 3]);
    expect(result.info.pairDetails).toEqual(['1-2', '2-3']);
    expect(result.info.spySeats).toEqual([2]); // 記錄有間諜
  });

  test('間諜醉酒 → 被視為邪惡', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion', isDrunk: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 醉酒的 Spy 被視為邪惡：[2, 3] → 1 組配對
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.evilSeats).toEqual([2, 3]);
    expect(result.info.pairDetails).toEqual(['2-3']);
  });

  test('陌客中毒 → 不被視為邪惡', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 中毒的 Recluse 不被視為邪惡：[3] → 0 組配對
    expect(result.info.actualPairCount).toBe(0);
    expect(result.info.evilSeats).toEqual([3]); // 只有 Imp
    expect(result.info.recluseSeats).toEqual([2]); // 記錄有陌客
  });

  test('陌客醉酒 → 不被視為邪惡', () => {
    const players = [
      makePlayer({ seat: 1, role: 'recluse', team: 'outsider', isDrunk: true }),
      makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 醉酒的 Recluse 不被視為邪惡：[3] → 0 組配對
    expect(result.info.actualPairCount).toBe(0);
    expect(result.info.evilSeats).toEqual([3]);
  });

  test('間諜醉酒 + 陌客中毒（雙重反轉）', () => {
    const players = [
      makePlayer({ seat: 1, role: 'recluse', team: 'outsider', isPoisoned: true }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion', isDrunk: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'monk', team: 'townsfolk' }),
    ];
    const result = handler.process({ gameState: makeGameState(players) });

    // 中毒的 Recluse 不算邪惡，醉酒的 Spy 算邪惡：[2, 3] → 1 組配對
    expect(result.info.actualPairCount).toBe(1);
    expect(result.info.evilSeats).toEqual([2, 3]);
    expect(result.info.pairDetails).toEqual(['2-3']);
    expect(result.info.recluseSeats).toEqual([1]);
    expect(result.info.spySeats).toEqual([2]);
  });
});
```

### UI 處理器（ChefProcessor）

廚師使用專屬 UI 處理器 `ChefProcessor`（`src/components/roleProcessors/ChefProcessor.tsx`），
透過 `ROLE_PROCESSORS` 註冊表由 `AbilityProcessor` 自動路由。

#### UI 流程

```
1. 自動執行能力
   └─ useEffect 自動調用 processAbility(item.seat, null)
   ↓
2. 顯示計算結果
   ├─ 完整偵測資訊（區塊、配對明細）
   ├─ 特殊角色標記（陌客/間諜）
   └─ 實際配對數
   ↓
3. 根據狀態顯示不同介面
   ├─ 正常：
   │   ├─ 顯示完整結果
   │   ├─ 自動使用實際數字（預填到 state）
   │   └─ 直接確認
   └─ 中毒/醉酒：
       ├─ 顯示警告：「⚠️ 廚師中毒/醉酒，你可以告訴玩家任意數字」
       ├─ 顯示實際數字：「🍽 相鄰的邪惡客人：X 組（你可以選擇撒謊）」
       ├─ 顯示輸入框（建議範圍: 0-{maxPossiblePairs}）
       └─ 說書人手動輸入數字
   ↓
4. 撒謊警告（若數字 ≠ 實際，僅中毒/醉酒時可能出現）
   └─ 「⚠️ 注意：你將告訴廚師不同於實際的數字（撒謊）」
   ↓
5. 確認 → 記錄到歷史
```

#### 實作細節

```typescript
// 根據狀態預填數字（正常狀態自動預填）
useEffect(() => {
  if (result?.action === 'tell_number' && result.info && typeof result.info === 'object') {
    const info = result.info as Record<string, unknown>;
    if (!isPoisonedOrDrunk) {
      setToldPairCount(String(info.actualPairCount ?? 0));
    }
  }
}, [result, isPoisonedOrDrunk]);

// 計算建議範圍
const maxPossiblePairs = Math.max(0, evilSeats.length - 1);

// 中毒/醉酒時才顯示輸入框
{isPoisonedOrDrunk && (
  <div>
    <label>告訴廚師的數字 (建議範圍: 0-{maxPossiblePairs})：</label>
    <input
      type="number"
      min="0"
      max={maxPossiblePairs}
      value={toldPairCount}
      placeholder="請輸入數字"
    />
  </div>
)}

// 記錄歷史
stateManager.logEvent({
  type: 'ability_use',
  description: `廚師資訊：說書人告知 ${toldNumber} 組相鄰邪惡配對${storytellerOverride ? ` (實際: ${actualPairCount})` : ''}`,
  details: {
    actualPairCount,
    toldPairCount: toldNumber,
    storytellerOverride,
    // ... 其他詳細資訊
  },
});
```

---

## 3. 僧侶處理器 (MonkHandler)

### 檔案位置
`src/engine/handlers/MonkHandler.ts`

### 角色能力
每個夜晚（第一夜除外），選擇一位玩家（不能是你自己）：今晚他不會死於惡魔。

### 能力機制

**保護效果**：
- **正常狀態**：保護生效，目標玩家不會被惡魔擊殺（包含惡魔自殺也會失敗）
- **中毒/醉酒**：保護失效，惡魔擊殺正常執行

**invalidation 處理**：
- Handler 照常回傳 `add_protection` 結果
- RuleEngine 的 `applyInvalidation()` 會標記 `effectNullified: true`
- 效果層（Imp 擊殺檢查時）不會套用失效的保護

**夜晚順序控制**：
- 僧侶只在第二晚起行動（`firstNight: 0`, `otherNight: 12`）
- 夜晚順序由 NightOrder 系統控制，Handler 不檢查夜晚數

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 檢查是否選擇自己
   ├─ 選擇自己 → 返回錯誤
   └─ 選擇他人 → 繼續
   ↓
3. 返回保護結果
   └─ 外部會調用 gameState.addStatus(target, 'protected')
```

#### 程式碼實作
```typescript
export class MonkHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '僧侶選擇要保護的玩家（不能選擇自己）',
        display: '等待僧侶選擇保護目標...'
      };
    }
    
    // 步驟 2: 檢查不能保護自己
    if (target.seat === player.seat) {
      return {
        skip: true,
        skipReason: '僧侶不能保護自己',
        display: '🚫 僧侶不能保護自己，請重新選擇'
      };
    }

    // 步驟 3: 返回保護結果
    return {
      action: 'add_protection',
      info: {
        targetSeat: target.seat,
        targetName: target.name
      },
      display: `僧侶保護 ${target.seat}號 (${target.name})\n今晚該玩家不會被惡魔擊殺`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('MonkHandler', () => {
  test('保護其他玩家', () => {
    const result = handler.process({
      player: monk,
      target: otherPlayer
    });
    
    expect(result.action).toBe('add_protection');
    expect(result.info.targetSeat).toBe(otherPlayer.seat);
  });
  
  test('不能保護自己', () => {
    const result = handler.process({
      player: monk,
      target: monk
    });
    
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不能保護自己');
  });
});
```

---

## 4. 共情者處理器 (EmpathHandler)

### 檔案位置
`src/engine/handlers/EmpathHandler.ts`

### 角色能力
每個夜晚，你會得知你左右兩側相鄰且存活的玩家中，有幾位是邪惡陣營（0、1 或 2）。

### 能力機制

**鄰居偵測**：
- 偵測左右兩側相鄰且**存活**的玩家
- 座位為環形結構（1號左邊是最後一位，最後一位右邊是1號）
- 只計算存活玩家，死亡玩家跳過
- 回傳邪惡玩家數量（0、1 或 2）

**特殊角色處理**（與廚師邏輯一致）：

**陌客（Recluse）**：
- **正常狀態**：被視為邪惡（說書人決定，預設為 true）
- **中毒/醉酒**：能力失效，不被視為邪惡

**間諜（Spy）**：
- **正常狀態**：不被視為邪惡（登記為善良）
- **中毒/醉酒**：能力失效，被視為邪惡

### 中毒/醉酒處理

**設計原則**：提供正確答案，但讓說書人決定要告訴玩家什麼數字。

- Handler 回傳實際計算結果（`actualEvilCount`）
- UI 層根據 `item.isPoisoned / item.isDrunk` 顯示不同介面
- **正常狀態**：
  - 顯示完整偵測資訊（鄰居身份、實際邪惡數量）
  - **自動使用**實際計算結果
  - 說書人直接確認即可
- **中毒/醉酒狀態**：
  - 顯示警告：「ℹ️ 共情者中毒/醉酒，你可以告訴玩家任意數字」
  - 顯示實際正確數字：「ℹ️ 相鄰的邪惡玩家：X 位（你可以選擇撒謊）」
  - 顯示數字輸入框（建議範圍: 0-2）
  - 記錄說書人實際告訴玩家的數字（可能與正確答案不同）

**記錄內容**：
```typescript
historyEntry = {
  actualEvilCount: number,      // 實際邪惡數量（0-2，永遠正確）
  toldEvilCount: number,         // 說書人告訴玩家的數字（正常狀態 = actualEvilCount）
  isPoisoned: boolean,
  isDrunk: boolean,
  storytellerOverride: boolean,  // toldEvilCount !== actualEvilCount
  leftNeighbor: { seat, name, role, isEvil },
  rightNeighbor: { seat, name, role, isEvil },
  recluseSeats: number[],        // 陌客座位
  spySeats: number[],            // 間諜座位
}
```

### 演算法實作

#### 鄰居查找邏輯

```typescript
private findAliveNeighbors(
  player: Player,
  gameState: GameState
): { left: Player | null; right: Player | null } {
  const alivePlayers = Array.from(gameState.players.values())
    .filter(p => p.isAlive)
    .sort((a, b) => a.seat - b.seat);

  if (alivePlayers.length < 2) {
    return { left: null, right: null };
  }

  const playerIndex = alivePlayers.findIndex(p => p.seat === player.seat);
  if (playerIndex === -1) {
    return { left: null, right: null };
  }

  // 環形結構：左右鄰居
  const leftIndex = (playerIndex - 1 + alivePlayers.length) % alivePlayers.length;
  const rightIndex = (playerIndex + 1) % alivePlayers.length;

  return {
    left: alivePlayers[leftIndex],
    right: alivePlayers[rightIndex],
  };
}
```

#### 邪惡判定邏輯

```typescript
private isEvilForEmpath(player: Player): boolean {
  // 特例 1：間諜
  if (player.role === 'spy') {
    // 間諜中毒/醉酒：能力失效，被視為邪惡
    if (player.isPoisoned || player.isDrunk) return true;
    // 間諜正常：不被視為邪惡
    return false;
  }

  // 特例 2：陌客
  if (player.role === 'recluse') {
    // 陌客中毒/醉酒：能力失效，不被視為邪惡
    if (player.isPoisoned || player.isDrunk) return false;
    // 陌客正常：被視為邪惡（說書人決定，預設為 true）
    return true;
  }

  // 一般規則：爪牙和惡魔
  return player.team === 'minion' || player.team === 'demon';
}
```

### 處理流程

```
1. 找出左右相鄰且存活的玩家
   ├─ 篩選存活玩家並排序
   ├─ 找出共情者在存活玩家中的位置
   └─ 計算環形結構下的左右鄰居
   ↓
2. 計算邪惡玩家數量
   ├─ 檢查左鄰居是否為邪惡（考慮陌客/間諜特例）
   ├─ 檢查右鄰居是否為邪惡（考慮陌客/間諜特例）
   └─ 累計邪惡數量（0-2）
   ↓
3. 回傳結果
   └─ action: 'tell_number'
   └─ info: { actualEvilCount, leftNeighbor, rightNeighbor, ... }
```

### 程式碼實作

```typescript
export class EmpathHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, gameState, getRoleName } = context;

    // 步驟 1: 找出左右相鄰且存活的玩家
    const { left, right } = this.findAliveNeighbors(player, gameState);

    if (!left || !right) {
      return {
        skip: true,
        skipReason: '存活玩家不足，無法偵測鄰居',
        display: '存活玩家不足（需至少3人含共情者）',
      };
    }

    // 步驟 2: 計算邪惡玩家數量
    const leftIsEvil = this.isEvilForEmpath(left);
    const rightIsEvil = this.isEvilForEmpath(right);
    const actualEvilCount = (leftIsEvil ? 1 : 0) + (rightIsEvil ? 1 : 0);

    // 記錄特殊角色
    const recluseSeats = [left, right]
      .filter(p => p.role === 'recluse')
      .map(p => p.seat);

    const spySeats = [left, right]
      .filter(p => p.role === 'spy')
      .map(p => p.seat);

    // 步驟 3: 回傳結果
    const reasoning = this.buildReasoning(
      left, right, leftIsEvil, rightIsEvil,
      recluseSeats, spySeats, getRoleName
    );

    return {
      action: 'tell_number',
      info: {
        actualEvilCount,
        toldEvilCount: undefined, // UI 層填入
        leftNeighbor: {
          seat: left.seat,
          name: left.name,
          role: left.role,
          isEvil: leftIsEvil,
        },
        rightNeighbor: {
          seat: right.seat,
          name: right.name,
          role: right.role,
          isEvil: rightIsEvil,
        },
        recluseSeats,
        spySeats,
      },
      mustFollow: false,
      canLie: true,
      reasoning,
      display: this.formatDisplay(
        left, right, leftIsEvil, rightIsEvil,
        actualEvilCount, recluseSeats, spySeats, getRoleName
      ),
    };
  }

  private buildReasoning(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    recluseSeats: number[],
    spySeats: number[],
    getRoleName: (roleId: string) => string
  ): string {
    const parts: string[] = [];

    if (leftIsEvil) {
      parts.push(`左鄰 ${left.seat}號 ${getRoleName(left.role)} 是邪惡`);
    }
    if (rightIsEvil) {
      parts.push(`右鄰 ${right.seat}號 ${getRoleName(right.role)} 是邪惡`);
    }

    if (recluseSeats.length > 0) {
      parts.push(`陌客 ${recluseSeats.join('、')}號 被視為邪惡`);
    }
    if (spySeats.length > 0) {
      parts.push(`間諜 ${spySeats.join('、')}號 不被視為邪惡`);
    }

    return parts.length > 0 ? parts.join('；') : '兩側鄰居皆為善良';
  }

  private formatDisplay(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    actualEvilCount: number,
    recluseSeats: number[],
    spySeats: number[],
    getRoleName: (roleId: string) => string
  ): string {
    const leftTag = leftIsEvil ? ' [邪惡]' : '';
    const rightTag = rightIsEvil ? ' [邪惡]' : '';

    const specialNotes: string[] = [];
    if (recluseSeats.length > 0) {
      specialNotes.push(`ℹ️ 陌客 ${recluseSeats.join('、')}號 被視為邪惡`);
    }
    if (spySeats.length > 0) {
      specialNotes.push(`ℹ️ 間諜 ${spySeats.join('、')}號 不被視為邪惡`);
    }

    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    return `共情者資訊：${actualEvilCount} 位相鄰邪惡玩家

左鄰：${left.seat}號 ${left.name}（${getRoleName(left.role)}）${leftTag}
右鄰：${right.seat}號 ${right.name}（${getRoleName(right.role)}）${rightTag}${specialNotesStr}`;
  }

  private findAliveNeighbors(
    player: Player,
    gameState: GameState
  ): { left: Player | null; right: Player | null } {
    // 實作如上
  }

  private isEvilForEmpath(player: Player): boolean {
    // 實作如上
  }
}
```

### UI 處理流程

```
1. 自動執行能力
   └─ useEffect 自動調用 processAbility(item.seat, null)
   ↓
2. 顯示偵測結果
   ├─ 左右鄰居資訊（座位、姓名、角色、是否邪惡）
   ├─ 特殊角色標記（陌客/間諜）
   └─ 實際邪惡數量
   ↓
3. 根據狀態顯示不同介面
   ├─ 正常：
   │   ├─ 顯示完整結果
   │   ├─ 自動使用實際數字（預填到 state）
   │   └─ 直接確認
   └─ 中毒/醉酒：
       ├─ 顯示警告：「⚠️ 共情者中毒/醉酒，你可以告訴玩家任意數字」
       ├─ 顯示實際數字：「👥 相鄰的邪惡玩家：X 位（你可以選擇撒謊）」
       ├─ 顯示數字輸入框（建議範圍: 0-2）
       └─ 說書人手動輸入數字
   ↓
4. 撒謊警告（若數字 ≠ 實際）
   └─ 「⚠️ 注意：你將告訴共情者不同於實際的數字（撒謊）」
   ↓
5. 確認 → 記錄到歷史
```

#### 實作細節

```typescript
// EmpathProcessor.tsx

const [toldEvilCount, setToldEvilCount] = useState<string>('');

// 根據狀態預填數字（正常狀態自動預填）
useEffect(() => {
  if (result?.action === 'tell_number' && result.info) {
    const info = result.info as Record<string, unknown>;
    if (!isPoisonedOrDrunk) {
      setToldEvilCount(String(info.actualEvilCount ?? 0));
    }
  }
}, [result, isPoisonedOrDrunk]);

// 中毒/醉酒時才顯示輸入框
{isPoisonedOrDrunk && (
  <div>
    <label>告訴共情者的數字 (建議範圍: 0-2)：</label>
    <input
      type="number"
      min="0"
      max="2"
      value={toldEvilCount}
      onChange={(e) => setToldEvilCount(e.target.value)}
      placeholder="請輸入數字"
    />
  </div>
)}

// 記錄歷史
stateManager.logEvent({
  type: 'ability_use',
  description: `共情者資訊：說書人告知 ${toldNumber} 位相鄰邪惡玩家${storytellerOverride ? ` (實際: ${actualEvilCount})` : ''}`,
  details: {
    actualEvilCount,
    toldEvilCount: toldNumber,
    isPoisoned,
    isDrunk,
    storytellerOverride,
    leftNeighbor: info.leftNeighbor,
    rightNeighbor: info.rightNeighbor,
    recluseSeats: info.recluseSeats,
    spySeats: info.spySeats,
  },
});
```

### 測試案例

```typescript
describe('EmpathHandler', () => {
  test('兩側鄰居皆為善良 → actualEvilCount: 0');
  test('左鄰是惡魔 → actualEvilCount: 1');
  test('右鄰是爪牙 → actualEvilCount: 1');
  test('兩側皆為邪惡 → actualEvilCount: 2');
  test('陌客正常狀態被視為邪惡 → actualEvilCount 增加');
  test('陌客中毒不被視為邪惡 → actualEvilCount 不增加');
  test('陌客醉酒不被視為邪惡 → actualEvilCount 不增加');
  test('間諜正常狀態不被視為邪惡 → actualEvilCount 不增加');
  test('間諜中毒被視為邪惡 → actualEvilCount 增加');
  test('存活玩家不足（< 3人）→ skip');
  test('環形座位正確計算（1號的左鄰是最後一位）');
  test('跳過死亡玩家，找到下一位存活鄰居');
});
```

---

## 5. 投毒者處理器 (PoisonerHandler)

### 角色能力
每個夜晚，選擇一位玩家：他今晚和明天白天中毒。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 返回中毒結果
   └─ 外部會調用 gameState.addStatus(target, 'poisoned')
```

#### 程式碼實作
```typescript
export class PoisonerHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '投毒者選擇要下毒的玩家',
        display: '等待投毒者選擇下毒目標...'
      };
    }
    
    // 步驟 2: 返回中毒結果
    return {
      action: 'add_poison',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
        targetRole: target.role
      },
      display: `投毒者下毒 ${target.seat}號 (${target.name})
角色：${target.role}
該玩家今晚和明天的能力將失效`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('PoisonerHandler', () => {
  test('下毒目標玩家', () => {
    const result = handler.process({
      player: poisoner,
      target: fortuneteller
    });
    
    expect(result.action).toBe('add_poison');
    expect(result.info.targetSeat).toBe(fortuneteller.seat);
  });
});
```

---

## 5. 小惡魔處理器 (ImpHandler)

### 角色能力
每個夜晚（第一夜除外），選擇一位玩家：他死亡。如果你殺死自己，一位爪牙變成小惡魔。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 檢查是否自殺（Star Pass）
   ├─ target.seat === player.seat → 檢查惡魔是否受保護
   │   ├─ 惡魔受保護 → 自殺失敗（保護阻擋）
   │   └─ 惡魔未受保護 → 進入 Star Pass 流程
   │       ├─ 尋找存活爪牙
   │       │   ├─ 無存活爪牙 → 純自殺（無繼承）
   │       │   └─ 有存活爪牙 → 選擇繼承者
   │       │       ├─ 紅唇女郎（scarletwoman）存活 → 優先選她
   │       │       └─ 否則 → 隨機選一位存活爪牙
   │       └─ 回傳 star pass 結果（含新惡魔資訊 + 喚醒提示）
   └─ 否 → 繼續一般擊殺流程
   ↓
3. 檢查保護狀態
   ├─ 受保護 → 擊殺失敗
   └─ 未保護 → 繼續
   ↓
4. 檢查士兵免疫
   ├─ 是士兵 → 擊殺失敗
   └─ 非士兵 → 繼續
   ↓
5. 擊殺成功
   └─ 外部會調用 gameState.killPlayer(target, 'demon_kill')
```

#### Star Pass 結果格式

外部（AbilityProcessor）收到 `info.starPass === true` 時，需依序執行：
1. `killPlayer(impSeat, 'demon_kill')` — Imp 死亡（觸發 AC2 revokeEffectsFrom）
2. `replaceRole(newDemonSeat, 'imp')` — 爪牙變成 Imp（觸發 AC3 revokeEffectsFrom）

```typescript
// Star Pass 回傳範例
{
  action: 'kill',
  info: {
    targetSeat: player.seat,     // 自己
    targetName: player.name,
    blocked: false,
    starPass: true,
    newDemonSeat: 3,
    newDemonName: '某某',
    newDemonOldRole: 'poisoner',
  },
  display: '小惡魔自殺！\n3號 某某（投毒者）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔',
  gesture: 'none'
}

// 純自殺（無存活爪牙）回傳範例
{
  action: 'kill',
  info: {
    targetSeat: player.seat,
    targetName: player.name,
    blocked: false,
    starPass: false,
  },
  display: '小惡魔自殺！\n無存活爪牙可繼承，惡魔陣營失去惡魔',
  gesture: 'none'
}
```

#### 程式碼實作
```typescript
export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, gameState, getRoleName } = context;

    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '小惡魔選擇擊殺目標',
        display: '等待小惡魔選擇擊殺目標...'
      };
    }

    // 步驟 2: 檢查自殺（Star Pass）
    if (target.seat === player.seat) {
      return this.handleStarPass(player, gameState, getRoleName);
    }

    // 步驟 3: 檢查保護
    if (target.isProtected) { ... }

    // 步驟 4: 檢查士兵
    if (target.role === 'soldier' && !target.isPoisoned && !target.isDrunk) { ... }

    // 步驟 5: 擊殺成功
    return { action: 'kill', info: { ... }, ... };
  }

  private handleStarPass(
    player: Player,
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): NightResult {
    // 尋找存活爪牙
    const aliveMinions = Array.from(gameState.players.values())
      .filter(p => p.team === 'minion' && p.isAlive);

    if (aliveMinions.length === 0) {
      return {
        action: 'kill',
        info: { targetSeat: player.seat, targetName: player.name, blocked: false, starPass: false },
        display: `小惡魔自殺！\n無存活爪牙可繼承，惡魔陣營失去惡魔`,
        gesture: 'none'
      };
    }

    // 紅唇女郎優先，否則隨機
    const scarletWoman = aliveMinions.find(p => p.role === 'scarletwoman');
    const newDemon = scarletWoman ?? aliveMinions[Math.floor(Math.random() * aliveMinions.length)];

    return {
      action: 'kill',
      info: {
        targetSeat: player.seat,
        targetName: player.name,
        blocked: false,
        starPass: true,
        newDemonSeat: newDemon.seat,
        newDemonName: newDemon.name,
        newDemonOldRole: newDemon.role,
      },
      display: `小惡魔自殺！\n${newDemon.seat}號 ${newDemon.name}（${getRoleName(newDemon.role)}）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('ImpHandler', () => {
  test('正常擊殺', () => {
    const result = handler.process({
      player: imp,
      target: normalPlayer
    });

    expect(result.action).toBe('kill');
    expect(result.info.blocked).toBe(false);
  });

  test('保護阻擋擊殺', () => {
    protectedPlayer.isProtected = true;

    const result = handler.process({
      player: imp,
      target: protectedPlayer
    });

    expect(result.info.blocked).toBe(true);
    expect(result.info.reason).toContain('保護');
  });

  test('士兵免疫', () => {
    const result = handler.process({
      player: imp,
      target: soldier
    });

    expect(result.info.blocked).toBe(true);
    expect(result.info.reason).toContain('士兵');
  });

  test('中毒士兵可被擊殺', () => {
    soldier.isPoisoned = true;

    const result = handler.process({
      player: imp,
      target: soldier
    });

    expect(result.info.blocked).toBe(false);
  });

  test('自殺時爪牙繼承（Star Pass）', () => {
    // gameState 中有存活爪牙
    const result = handler.process({
      player: imp,
      target: imp,   // 目標是自己
      gameState: stateWithAliveMinions
    });

    expect(result.action).toBe('kill');
    expect(result.info.starPass).toBe(true);
    expect(result.info.newDemonSeat).toBeDefined();
    expect(result.display).toContain('成為新的小惡魔');
    expect(result.display).toContain('請喚醒該玩家');
  });

  test('自殺時紅唇女郎優先繼承', () => {
    const result = handler.process({
      player: imp,
      target: imp,
      gameState: stateWithScarletWoman
    });

    expect(result.info.starPass).toBe(true);
    expect(result.info.newDemonOldRole).toBe('scarletwoman');
  });

  test('自殺時無存活爪牙', () => {
    const result = handler.process({
      player: imp,
      target: imp,
      gameState: stateWithNoAliveMinions
    });

    expect(result.info.starPass).toBe(false);
    expect(result.display).toContain('無存活爪牙');
  });
});
```

---

## 6. 酒鬼處理器 (DrunkHandler)

### 角色能力
你不知道你是酒鬼。你以為你是一個鎮民角色，但你不是。

### 實作規格

**注意**：酒鬼的狀態在遊戲設置時就已配置好，夜間無需處理。

#### 程式碼實作
```typescript
export class DrunkHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 酒鬼無夜間行動
    return {
      skip: true,
      skipReason: '酒鬼無夜間行動（狀態已在設置時配置）',
      display: '酒鬼無夜間行動'
    };
  }
}
```

#### 設置時處理

酒鬼的配置應在 `GameStateManager.initializePlayers()` 中處理：
```typescript
// 在初始化玩家時
if (player.role === 'drunk') {
  player.isDrunk = true;
  player.believesRole = selectRandomTownsfolk(); // 隨機善良角色
  player.originalRole = 'drunk';
}
```

---

## 7. 鎮長處理器 (MayorHandler)

### 檔案位置
`src/engine/handlers/MayorHandler.ts`

### 角色能力
1. **三人勝利條件**（白天階段）：若場上僅剩 3 人且當天未處決任何人，善良陣營獲勝
2. **死亡轉移機制**（夜晚階段）：若你在夜晚死亡，可能改由另一名玩家死亡

### 設計原則
- **鎮長無主動夜間能力**，Handler 僅用於死亡轉移機制
- 死亡轉移由說書人決定，系統提供建議但不強制
- 三人勝利條件由白天階段檢查（不在此 Handler 中）

### 死亡轉移機制

#### 觸發條件
```
1. 鎮長被惡魔攻擊（ImpHandler 中檢測）
2. 鎮長未中毒/醉酒（能力有效）
3. 鎮長未受僧侶保護（保護優先於轉移）
```

#### 處理流程
```
ImpHandler 檢測到目標是鎮長：
1. 檢查鎮長能力是否有效
   ├─ 中毒/醉酒 → 直接擊殺鎮長
   └─ 能力有效 → 繼續
   ↓
2. 返回特殊結果 mayor_bounce
   └─ 提示說書人選擇轉移目標
   ↓
3. 說書人選擇
   ├─ 不轉移 → 擊殺鎮長
   └─ 轉移 → 選擇其他玩家（排除惡魔）
   ↓
4. 執行擊殺
   └─ 擊殺選定的目標玩家
```

#### 轉移建議邏輯

根據場上陣營比例提供建議：

```typescript
function suggestBounceTarget(gameState: GameState): {
  suggestion: 'keep' | 'bounce';
  recommendedTargets?: Player[];
  reason: string;
} {
  const alive = gameState.getAlivePlayers();
  const evilCount = alive.filter(p => p.team === 'minion' || p.team === 'demon').length;
  const goodCount = alive.length - evilCount;

  // 邪惡較多：建議轉給爪牙
  if (evilCount > goodCount + 1) {
    const minions = alive.filter(p => p.team === 'minion');
    return {
      suggestion: 'bounce',
      recommendedTargets: minions,
      reason: '邪惡玩家較多，建議轉移給爪牙以平衡局勢'
    };
  }

  // 好人較多：建議保留鎮長
  if (goodCount > evilCount + 1) {
    return {
      suggestion: 'keep',
      reason: '好人玩家較多，建議不轉移以保持平衡'
    };
  }

  // 勢均力敵：建議轉給次要目標
  const secondaryTargets = alive.filter(p =>
    p.role === 'soldier' ||                           // 士兵（已免疫惡魔）
    p.isProtected ||                                   // 受僧侶保護
    p.isPoisoned || p.isDrunk ||                      // 失去能力的角色
    (p.team === 'townsfolk' && hasLostAbility(p)) || // 已用完能力的鎮民
    p.team === 'outsider'                             // 外來者
  );

  return {
    suggestion: 'bounce',
    recommendedTargets: secondaryTargets,
    reason: '雙方勢均力敵，建議轉移給次要目標（士兵/受保護/失能角色）'
  };
}
```

#### 轉移目標排除規則

```typescript
// 不可轉移的目標
function canBeBounceTarget(player: Player): boolean {
  return (
    player.role !== 'mayor' &&        // 不能轉回鎮長自己
    player.team !== 'demon' &&        // 不能轉給惡魔
    player.isAlive                     // 必須存活
  );
}
```

### ImpHandler 整合

修改 ImpHandler 以支援鎮長轉移：

```typescript
// 在 ImpHandler.process() 中，士兵檢查之前
if (target.role === 'mayor' && !target.isPoisoned && !target.isDrunk) {
  return {
    action: 'mayor_bounce',
    info: {
      mayorSeat: target.seat,
      mayorName: target.name,
      suggestion: calculateBounceSuggestion(gameState),
      availableTargets: gameState.getAlivePlayers()
        .filter(p => p.seat !== target.seat && p.team !== 'demon')
    },
    display: `小惡魔選擇擊殺鎮長 ${target.seat}號 (${target.name})

鎮長的死亡轉移能力觸發！
說書人可選擇是否將死亡轉移給其他玩家`,
    gesture: 'none',
  };
}
```

### UI 流程

#### MayorBounceProcessor（未來實作）

```typescript
export default function MayorBounceProcessor({ item, onDone }: RoleProcessorProps) {
  const [shouldBounce, setShouldBounce] = useState<boolean | null>(null);
  const [bounceTarget, setBounceTarget] = useState<number | null>(null);

  // 階段 1：決定是否轉移
  if (shouldBounce === null) {
    return (
      <BounceDecisionUI
        suggestion={result.info.suggestion}
        reason={result.info.reason}
        onDecide={setShouldBounce}
      />
    );
  }

  // 階段 2：不轉移 → 直接擊殺鎮長
  if (shouldBounce === false) {
    killPlayer(mayorSeat);
    logEvent('鎮長被擊殺（說書人選擇不轉移）');
    onDone();
  }

  // 階段 3：轉移 → 選擇目標
  if (bounceTarget === null) {
    return (
      <TargetSelectionUI
        availableTargets={result.info.availableTargets}
        recommendedTargets={result.info.recommendedTargets}
        onSelect={setBounceTarget}
      />
    );
  }

  // 階段 4：執行轉移擊殺
  killPlayer(bounceTarget);
  logEvent(`鎮長轉移死亡：${bounceTarget}號被擊殺`);
  onDone();
}
```

### NightResult 擴展

```typescript
// 新增 action 類型
type NightAction =
  | 'kill'
  | 'mayor_bounce'  // 新增
  | ... ;

// mayor_bounce 的 info 結構
interface MayorBounceInfo {
  mayorSeat: number;
  mayorName: string;
  suggestion: {
    action: 'keep' | 'bounce';
    reason: string;
  };
  availableTargets: Player[];
  recommendedTargets?: Player[];
}
```

### 測試案例

```typescript
describe('MayorHandler - Death Bounce', () => {
  test('鎮長正常狀態觸發轉移', () => {
    const result = impHandler.process({
      player: imp,
      target: mayor,  // 未中毒/醉酒
      gameState
    });

    expect(result.action).toBe('mayor_bounce');
    expect(result.info.mayorSeat).toBe(mayor.seat);
    expect(result.info.availableTargets).not.toContain(
      expect.objectContaining({ team: 'demon' })
    );
  });

  test('中毒鎮長直接被擊殺', () => {
    mayor.isPoisoned = true;

    const result = impHandler.process({
      player: imp,
      target: mayor,
      gameState
    });

    expect(result.action).toBe('kill');
    expect(result.info.blocked).toBe(false);
  });

  test('建議轉移給爪牙（邪惡較多）', () => {
    // 設置場景：5 邪惡 vs 3 好人
    const result = impHandler.process({
      player: imp,
      target: mayor,
      gameState: evilMajorityState
    });

    expect(result.info.suggestion.action).toBe('bounce');
    expect(result.info.recommendedTargets).toContain(
      expect.objectContaining({ team: 'minion' })
    );
  });

  test('建議保留鎮長（好人較多）', () => {
    // 設置場景：3 邪惡 vs 7 好人
    const result = impHandler.process({
      player: imp,
      target: mayor,
      gameState: goodMajorityState
    });

    expect(result.info.suggestion.action).toBe('keep');
  });

  test('建議轉移給次要目標（勢均力敵）', () => {
    const result = impHandler.process({
      player: imp,
      target: mayor,
      gameState: balancedState
    });

    expect(result.info.suggestion.action).toBe('bounce');
    expect(result.info.recommendedTargets).toContain(
      expect.objectContaining({ role: 'soldier' })
    );
  });
});
```

### 實作優先順序

#### Phase 1（本次實作）
- ✅ 撰寫規格文件
- ⬜ 修改 ImpHandler 偵測鎮長並返回 mayor_bounce
- ⬜ 實作建議邏輯（suggestBounceTarget）
- ⬜ 臨時 UI：使用 AbilityProcessor 通用流程處理

#### Phase 2（未來優化）
- ⬜ 建立專屬 MayorBounceProcessor UI
- ⬜ 改善建議演算法（更細緻的角色評估）
- ⬜ 實作三人勝利條件（白天階段）

### 注意事項

1. **優先順序**：僧侶保護 > 鎮長轉移 > 士兵免疫
2. **中毒/醉酒**：鎮長失去能力時，直接被擊殺，不觸發轉移
3. **不可轉移目標**：惡魔、鎮長自己、已死亡玩家
4. **記錄事件**：需詳細記錄轉移決定與目標，供回顧使用

---

## 處理器註冊

### 檔案：`src/engine/handlers/index.ts`
```typescript
import { RoleHandler } from '../types';
import { FortunetellerHandler } from './FortunetellerHandler';
import { MonkHandler } from './MonkHandler';
import { PoisonerHandler } from './PoisonerHandler';
import { ImpHandler } from './ImpHandler';
import { DrunkHandler } from './DrunkHandler';

export const handlers = new Map<string, RoleHandler>([
  ['fortuneteller', new FortunetellerHandler()],
  ['monk', new MonkHandler()],
  ['poisoner', new PoisonerHandler()],
  ['imp', new ImpHandler()],
  ['drunk', new DrunkHandler()]
]);
```

---

## UI 處理器註冊（roleProcessors）

部分角色的 UI 互動邏輯較複雜（例如占卜師需要干擾項選擇、雙目標、說書人回答），
從 `AbilityProcessor` 抽取至專屬 UI 處理器。

### 檔案：`src/components/roleProcessors/index.ts`
```typescript
import type { ComponentType } from 'react';
import type { NightOrderItem } from '../../engine/types';

export interface RoleProcessorProps {
  item: NightOrderItem;
  onDone: () => void;
}

export const ROLE_PROCESSORS: Record<string, ComponentType<RoleProcessorProps>> = {
  fortuneteller: FortunetellerProcessor,
};
```

`AbilityProcessor` 在入口處查詢 `ROLE_PROCESSORS[item.role]`：
- 有對應處理器 → 路由至該處理器
- 無對應處理器 → 走通用流程（單目標選擇 + 通用結果顯示）

### 新增 UI 處理器

1. 在 `src/components/roleProcessors/` 建立新檔案（如 `EmpathProcessor.tsx`）
2. 實作 `RoleProcessorProps` 介面
3. 在 `index.ts` 的 `ROLE_PROCESSORS` 中註冊

---

## 新增處理器指南

### 步驟 1: 建立處理器檔案

在 `src/engine/handlers/` 建立新檔案，例如 `EmpathHandler.ts`

### 步驟 2: 實作 RoleHandler 介面
```typescript
import { RoleHandler, HandlerContext, NightResult } from '../types';

export class EmpathHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 實作邏輯
  }
}
```

### 步驟 3: 註冊處理器

在 `handlers/index.ts` 中添加：
```typescript
import { EmpathHandler } from './EmpathHandler';

export const handlers = new Map<string, RoleHandler>([
  // ... 現有處理器
  ['empath', new EmpathHandler()]
]);
```

### 步驟 4: 撰寫測試

在 `__tests__/` 目錄下建立測試檔案。

---

## 常見模式

### 模式 1: 需要選擇目標
```typescript
if (!target) {
  return {
    needInput: true,
    inputType: 'select_player',
    inputPrompt: '選擇目標玩家',
    display: '等待選擇...'
  };
}
```

### 模式 2: 資訊型角色回傳實際結果
```typescript
// 資訊型 handler 回傳實際偵測結果，不根據 infoReliable 反轉。
// 中毒/醉酒由 UI 層提示說書人可自行決定。
return {
  action: 'tell_alignment',
  info: { rawDetection },
  mustFollow: false,
  canLie: true,
  reasoning: '...',
  display: '...',
};
```

### 模式 3: 檢查特殊條件
```typescript
if (specialCondition) {
  return {
    skip: true,
    skipReason: '條件不符',
    display: '能力無法使用'
  };
}
```

---

## 注意事項

1. **不要修改遊戲狀態**
   - 處理器只返回結果
   - 狀態修改由外部（UI 層）調用 GameStateManager

2. **錯誤處理**
   - 使用 `skip` 而非拋出異常
   - 提供清楚的 `skipReason`

3. **顯示訊息**
   - `display` 用於 UI 顯示
   - 使用清楚的繁體中文
   - 包含所有必要資訊

4. **測試覆蓋率**
   - 每個處理器至少 3 個測試案例
   - 測試正常流程和邊緣情況