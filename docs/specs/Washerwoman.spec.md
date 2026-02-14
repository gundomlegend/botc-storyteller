# Washerwoman（洗衣婦）規格書

## 概述

洗衣婦是鎮民（Townsfolk）陣營的資訊型角色。在第一夜，洗衣婦會得知兩名玩家中有一個**鎮民（Townsfolk）角色**。

**關鍵特性**：
- 第一夜能力（firstNight: 36，在圖書管理員之前）
- 只在第一夜生效，其他夜晚無行動（otherNight: 0）
- 提供鎮民角色資訊（不是陣營資訊）
- 受中毒/醉酒影響，能力可能失效
- 需考慮間諜的特殊情況
- 陌客不影響洗衣婦（陌客不會被視為鎮民）

---

## 角色資料

```json
{
  "id": "washerwoman",
  "name": "Washerwoman",
  "name_cn": "洗衣婦",
  "team": "townsfolk",
  "ability": "You start knowing that 1 of 2 players is a particular Townsfolk.",
  "ability_cn": "遊戲開始時，你會得知兩名玩家中有一個特定的鎮民角色。",
  "firstNight": 36,
  "firstNightReminder": "Show the character token of a Townsfolk in play. Point to two players, one of which is that character.",
  "firstNightReminder_cn": "展示場上一個鎮民角色標記。指向兩名玩家，其中一人是該角色。",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": ["Townsfolk", "Wrong"],
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

**中文能力描述**：遊戲開始時，你會得知兩名玩家中有一個特定的鎮民角色。

---

## 核心機制

### 基本邏輯流程

```
洗衣婦第一夜流程：
├─ 步驟 1: 檢查洗衣婦狀態
│  ├─ 中毒？ → 資訊不可靠，說書人可選擇給錯誤資訊
│  └─ 醉酒？ → 資訊不可靠，說書人可選擇給錯誤資訊
│
├─ 步驟 2: 取得場上所有存活玩家（排除洗衣婦自己）
│
├─ 步驟 3: 篩選鎮民玩家
│  ├─ 真實鎮民（team === 'townsfolk'）
│  └─ 間諜（能力正常時可能被視為鎮民）
│
├─ 步驟 4: 特殊情況處理
│  └─ 場上只有間諜（能力正常）→ 適用間諜特殊規則
│
└─ 步驟 5: 說書人選擇
   ├─ 選擇一個鎮民角色（從步驟 3 的列表）
   ├─ 選擇兩名玩家（一個是該鎮民，另一個不是）
   └─ 展示資訊給洗衣婦
```

---

## 情境處理

### 情境 1：標準情況（場上有鎮民）

**條件**：
- 洗衣婦能力正常（未中毒、未醉酒）
- 場上有鎮民角色（除了洗衣婦自己）
- 沒有特殊角色影響

**處理**：
1. 列出所有鎮民玩家（team = 'townsfolk'，排除洗衣婦自己）
2. 說書人選擇其中一個鎮民角色
3. 說書人選擇兩名玩家：
   - 玩家 A：該鎮民角色的玩家
   - 玩家 B：任意其他玩家（非該鎮民）
4. 展示：「這兩名玩家中有一個是【鎮民角色】」

**範例**（7 人局）：
```
場上角色：
- 1號: Washerwoman（鎮民）← 洗衣婦本人
- 2號: Librarian（鎮民）
- 3號: Chef（鎮民）
- 4號: Empath（鎮民）
- 5號: Monk（鎮民）
- 6號: Poisoner（爪牙）
- 7號: Imp（惡魔）

說書人選擇：
- 選擇鎮民角色：Librarian（圖書管理員）
- 選擇玩家：2號（Librarian）和 6號（Poisoner）

展示：「2號 或 6號 是【圖書管理員】」
mustFollow: true（能力正常）
canLie: false
```

---

### 情境 2：間諜影響

#### 情境 2.1：只有間諜（能力正常）

**條件**：
- 場上唯一的"鎮民"是間諜（能力正常）
- 間諜未中毒、未醉酒
- 沒有其他真實鎮民（除了洗衣婦自己）

**處理**：
- **間諜特殊規則**：間諜能力正常時，洗衣婦看不到其他鎮民
- 但由於洗衣婦自己是鎮民，系統應該讓說書人選擇洗衣婦以外的鎮民
- 如果只有間諜可選，說書人可以選擇間諜（被視為鎮民）
- `mustFollow: false`（說書人可選擇）
- `canLie: true`

**範例**：
```
場上角色：
- 1號: Washerwoman ← 洗衣婦
- 2號: Chef（鎮民）
- 3號: Empath（鎮民）
- 4號: Spy（爪牙，能力正常）
- ...其他玩家

說書人可以選擇：
- Chef（真實鎮民）
- Empath（真實鎮民）
- Spy（間諜，可視為鎮民）

推薦：選擇真實鎮民
```

#### 情境 2.2：間諜 + 其他鎮民

**條件**：
- 場上有真實鎮民（除了洗衣婦自己）
- 同時有間諜（能力正常）

**處理**：
- 說書人可以選擇：
  - 選項 A：選擇真實鎮民（推薦）
  - 選項 B：選擇間諜（讓間諜被視為鎮民）
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可選擇間諜）

#### 情境 2.3：間諜中毒或醉酒

**條件**：
- 間諜中毒或醉酒，能力失效

**處理**：
- 間諜失去能力，**不再**被視為鎮民
- 只考慮真實鎮民
- 不會將間諜列入可選鎮民

---

### 情境 3：陌客影響

**重要**：陌客能力是「可能被視為邪惡/爪牙/惡魔」，**不會被視為鎮民**。

**處理**：
- 陌客是外來者，不影響洗衣婦
- 陌客不會出現在鎮民列表中
- 洗衣婦看不到陌客

---

### 情境 4：酒鬼影響

**重要**：酒鬼的真實角色是外來者（team = 'outsider'），**不是鎮民**。

#### 情境 4.1：酒鬼相信自己是鎮民

**條件**：
- 場上有酒鬼（Drunk）
- 酒鬼的 `believesRole` 是鎮民角色（例如 Chef）

**處理**：
- 酒鬼的真實角色是 'drunk'（外來者）
- 酒鬼**不會**出現在鎮民列表中
- 洗衣婦看不到酒鬼
- believesRole 不影響洗衣婦的判斷

**範例**：
```
場上角色：
- 1號: Washerwoman
- 2號: Librarian（鎮民）
- 3號: Drunk（外來者，believesRole = 'chef'，以為自己是廚師）
- ...

洗衣婦看到的鎮民：
- 只有 Librarian（真實鎮民）
- 不包含 Drunk（雖然 believesRole 是 chef，但真實角色是外來者）
```

---

### 情境 5：洗衣婦中毒/醉酒

**條件**：
- 洗衣婦自己中毒（被投毒者下毒）
- 或洗衣婦自己是酒鬼（believesRole = 'washerwoman'）

**處理**：
- 能力不可靠（`infoReliable = false`）
- 說書人可以給錯誤資訊：
  - 選項 A：給正確資訊（推薦，避免暴露投毒者）
  - 選項 B：給錯誤的鎮民角色
  - 選項 C：給錯誤的玩家組合
  - 選項 D：選擇不存在的鎮民角色
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可以給錯誤資訊）

**UI 提示**：
```
⚠️ 洗衣婦中毒/醉酒，能力不可靠
說書人可以選擇給予錯誤資訊。

推薦：給予正確資訊，避免暴露投毒者。
```

---

## Handler 實作規格

### WasherwomanHandler.process()

```typescript
process(context: HandlerContext): NightResult {
  const { player, gameState, stateManager } = context;

  // 步驟 1: 檢查洗衣婦狀態
  const isPoisoned = player.isPoisoned;
  const isDrunk = player.isDrunk;
  const infoReliable = !isPoisoned && !isDrunk;

  // 步驟 2: 取得所有存活玩家（排除洗衣婦自己）
  const allPlayers = stateManager.getAlivePlayers().filter(p => p.seat !== player.seat);

  // 步驟 3: 篩選鎮民玩家
  const townsfolk = allPlayers.filter(p => {
    // 真實鎮民
    if (p.team === 'townsfolk') return true;

    // 間諜（能力正常時可能被視為鎮民）
    if (p.role === 'spy' && !p.isPoisoned && !p.isDrunk) {
      return true; // 間諜可能被視為鎮民（說書人可選擇）
    }

    return false;
  });

  // 步驟 4: 準備鎮民列表
  const townsfolkList = townsfolk.map(t => ({
    seat: t.seat,
    name: t.name,
    role: t.role,
    roleName: this.getPlayerRoleName(t),
  }));

  // 步驟 5: 檢查是否有間諜（供 UI 層參考）
  const hasSpy = townsfolk.some(t =>
    t.role === 'spy' && !t.isPoisoned && !t.isDrunk
  );

  // 步驟 6: 返回資訊，讓說書人在 UI 中選擇
  const statusReason = isPoisoned ? '中毒' : isDrunk ? '醉酒' : '';

  return {
    action: 'show_info',
    display: `洗衣婦資訊獲取\n場上鎮民角色：${townsfolkList.map(t => `${t.seat}號 ${t.name}(${t.roleName})`).join('、')}`,
    info: {
      // 在場鎮民列表（供 UI 選擇）
      townsfolk: townsfolkList,
      hasSpy,
      reliable: infoReliable,
      statusReason,
    },
    gesture: 'none',
    mustFollow: false, // 中毒/醉酒時說書人可自行決定
    canLie: true,      // 說書人可給不同答案
  };
}
```

---

## UI 規格（WasherwomanProcessor）

### UI 流程

1. **標準情況（有鎮民）**：
   ```
   洗衣婦（1號 Alice）
   能力狀態：✅ 正常

   場上鎮民：
   - 2號 Bob（圖書管理員）
   - 3號 Charlie（廚師）
   - 4號 David（共情者）
   - 6號 Frank（間諜）[可視為鎮民]

   選擇鎮民角色：
   [下拉選單: Librarian, Chef, Empath, Spy]

   選擇第一位玩家（該鎮民）：
   [下拉選單: 玩家列表]

   選擇第二位玩家（非該鎮民）：
   [下拉選單: 玩家列表]

   ℹ️ 提示：間諜在場，可選擇間諜作為鎮民

   [確認]
   ```

2. **中毒/醉酒情況**：
   ```
   洗衣婦（1號 Alice）
   能力狀態：⚠️ 中毒/醉酒（能力不可靠）

   說書人可以選擇給予錯誤資訊。
   推薦：給予正確資訊，避免暴露投毒者。

   場上鎮民：
   - 2號 Bob（圖書管理員）
   - 3號 Charlie（廚師）

   選擇鎮民角色：
   [下拉選單: 所有鎮民角色，包括不在場的]

   選擇第一位玩家：
   [下拉選單: 所有玩家]

   選擇第二位玩家：
   [下拉選單: 所有玩家]

   [確認]
   ```

---

## 測試用例

### T1：標準情況（有鎮民，能力正常）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true }, // 洗衣婦
    { seat: 2, role: 'librarian', isAlive: true },   // 鎮民
    { seat: 3, role: 'chef', isAlive: true },        // 鎮民
    { seat: 4, role: 'empath', isAlive: true },      // 鎮民
    { seat: 5, role: 'monk', isAlive: true },        // 鎮民
    { seat: 6, role: 'butler', isAlive: true },      // 外來者
    { seat: 7, role: 'poisoner', isAlive: true },
    { seat: 8, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.action === 'show_info');
assert(result.info.townsfolk.length === 4); // 排除洗衣婦自己
assert(result.info.townsfolk.some(t => t.role === 'librarian'));
assert(result.info.townsfolk.some(t => t.role === 'chef'));
assert(result.info.townsfolk.some(t => t.role === 'empath'));
assert(result.info.townsfolk.some(t => t.role === 'monk'));
assert(result.info.reliable === true);
assert(result.mustFollow === false);
assert(result.canLie === true);
```

### T2：間諜 + 真實鎮民

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true },
    { seat: 2, role: 'librarian', isAlive: true },   // 真實鎮民
    { seat: 3, role: 'spy', isAlive: true },         // 間諜
    { seat: 4, role: 'chef', isAlive: true },        // 真實鎮民
    { seat: 5, role: 'empath', isAlive: true },      // 真實鎮民
    { seat: 6, role: 'butler', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.townsfolk.length === 4); // Librarian, Spy, Chef, Empath
assert(result.info.townsfolk.some(t => t.role === 'librarian'));
assert(result.info.townsfolk.some(t => t.role === 'spy')); // 間諜可被視為鎮民
assert(result.info.townsfolk.some(t => t.role === 'chef'));
assert(result.info.townsfolk.some(t => t.role === 'empath'));
assert(result.info.hasSpy === true);
```

### T3：間諜中毒（不視為鎮民）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true },
    { seat: 2, role: 'librarian', isAlive: true },
    { seat: 3, role: 'spy', isAlive: true, isPoisoned: true }, // 間諜中毒
    { seat: 4, role: 'chef', isAlive: true },
    { seat: 5, role: 'empath', isAlive: true },
    { seat: 6, role: 'butler', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.townsfolk.length === 3); // Librarian, Chef, Empath
assert(result.info.townsfolk.some(t => t.role === 'librarian'));
assert(result.info.townsfolk.some(t => t.role === 'chef'));
assert(result.info.townsfolk.some(t => t.role === 'empath'));
assert(!result.info.townsfolk.some(t => t.role === 'spy')); // 間諜中毒，不視為鎮民
assert(result.info.hasSpy === false);
```

### T4：酒鬼（相信自己是廚師）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true },
    { seat: 2, role: 'librarian', isAlive: true },
    { seat: 3, role: 'drunk', believesRole: 'chef', isAlive: true }, // 酒鬼
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.townsfolk.length === 3); // Librarian, Empath, Monk
assert(!result.info.townsfolk.some(t => t.role === 'drunk')); // 酒鬼不是鎮民
assert(!result.info.townsfolk.some(t => t.role === 'chef')); // believesRole 不影響
```

### T5：洗衣婦中毒

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true, isPoisoned: true }, // 中毒
    { seat: 2, role: 'librarian', isAlive: true },
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'butler', isAlive: true },
    { seat: 7, role: 'poisoner', isAlive: true },
    { seat: 8, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.reliable === false); // 能力不可靠
assert(result.info.statusReason === '中毒');
assert(result.mustFollow === false); // 說書人可自由選擇
assert(result.canLie === true); // 可給錯誤資訊
```

### T6：陌客不影響洗衣婦

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true },
    { seat: 2, role: 'librarian', isAlive: true },
    { seat: 3, role: 'recluse', isAlive: true }, // 陌客
    { seat: 4, role: 'chef', isAlive: true },
    { seat: 5, role: 'empath', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = washerwomanHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.townsfolk.length === 3); // Librarian, Chef, Empath
assert(!result.info.townsfolk.some(t => t.role === 'recluse')); // 陌客不是鎮民
```

---

## 與其他資訊角色的差異

| 特性 | 洗衣婦（Washerwoman） | 圖書管理員（Librarian） | 調查員（Investigator） |
|------|----------------------|-------------------------|------------------------|
| 目標陣營 | 鎮民（Townsfolk） | 外來者（Outsider） | 爪牙（Minion） |
| 間諜影響 | 可選擇間諜（視為鎮民） | 只有間諜時告知「無外來者」 | 只有間諜時告知「無爪牙」 |
| 陌客影響 | 無影響（陌客不是鎮民） | 可選擇不視為外來者 | 可能被視為爪牙 |
| 酒鬼影響 | 無影響（酒鬼不是鎮民） | 可能被選中（酒鬼是外來者） | 無影響（酒鬼不是爪牙） |
| firstNight | 36（最早） | 37 | 38（最晚） |

**關鍵差異**：
- **洗衣婦**：陌客和酒鬼都不影響（都不是鎮民）
- **圖書管理員**：陌客可選擇不顯示，酒鬼可被選中
- **調查員**：陌客可能被視為爪牙，酒鬼不影響

---

## 實作優先級

### Phase 1：Handler 實作
- [ ] 建立 `WasherwomanHandler.ts`
- [ ] 實作基本邏輯流程
- [ ] 處理間諜特殊規則
- [ ] 處理中毒/醉酒情況
- [ ] 單元測試

### Phase 2：UI 實作
- [ ] 建立 `WasherwomanProcessor.tsx`
- [ ] 實作鎮民選擇介面
- [ ] 實作雙玩家選擇介面
- [ ] 顯示能力狀態（中毒/醉酒）
- [ ] 顯示間諜提示

### Phase 3：整合測試
- [ ] 測試各種情境組合
- [ ] 測試 UI 流程
- [ ] 驗證間諜規則正確性

---

## 注意事項

1. **間諜處理**：
   - 間諜能力正常時，可能被視為鎮民
   - 說書人可選擇間諜或真實鎮民
   - 間諜中毒/醉酒時不視為鎮民

2. **酒鬼處理**：
   - 酒鬼真實角色是外來者（team = 'outsider'）
   - 即使 believesRole 是鎮民，也不會被視為鎮民
   - 洗衣婦看不到酒鬼

3. **陌客處理**：
   - 陌客是外來者，不會被視為鎮民
   - 陌客不影響洗衣婦

4. **中毒/醉酒**：
   - 說書人可以給任何資訊（包括不存在的鎮民）
   - 推薦給正確資訊，避免暴露投毒者

5. **UI 提示**：
   - 明確標示能力狀態（正常/中毒/醉酒）
   - 提供間諜相關提示
   - 中毒/醉酒時提示說書人可給錯誤資訊

6. **洗衣婦自己**：
   - 鎮民列表應排除洗衣婦自己
   - 洗衣婦不會看到自己的角色資訊
