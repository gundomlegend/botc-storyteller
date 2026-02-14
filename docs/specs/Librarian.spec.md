# Librarian（圖書管理員）規格書

## 概述

圖書管理員是鎮民（Townsfolk）陣營的資訊型角色。在第一夜，圖書管理員會得知兩名玩家中有一個**外來者（Outsider）角色**。

**關鍵特性**：
- 第一夜能力（firstNight: 37，在惡魔資訊之後）
- 只在第一夜生效，其他夜晚無行動（otherNight: 0）
- 提供外來者角色資訊（不是陣營資訊）
- 受中毒/醉酒影響，能力可能失效
- 需考慮間諜、陌客、酒鬼的特殊情況

---

## 角色資料

```json
{
  "id": "librarian",
  "name": "Librarian",
  "name_cn": "圖書管理員",
  "team": "townsfolk",
  "ability": "You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)",
  "ability_cn": "遊戲開始時，你會得知兩名玩家中有一個特定的外來者角色。（或是場上沒有外來者。）",
  "firstNight": 37,
  "firstNightReminder": "Show the character token of an Outsider in play. Point to two players, one of which is that character.",
  "firstNightReminder_cn": "展示場上一個外來者角色標記。指向兩名玩家，其中一人是該角色。",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": ["Wrong"],
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

**中文能力描述**：遊戲開始時，你會得知兩名玩家中有一個特定的外來者角色。如果場上沒有外來者，你會得知這個訊息。

---

## 核心機制

### 基本邏輯流程

```
圖書管理員第一夜流程：
├─ 步驟 1: 檢查圖書管理員狀態
│  ├─ 中毒？ → 資訊不可靠，說書人可選擇給錯誤資訊
│  └─ 醉酒？ → 資訊不可靠，說書人可選擇給錯誤資訊
│
├─ 步驟 2: 取得場上所有存活玩家（排除圖書管理員自己）
│
├─ 步驟 3: 篩選出外來者玩家
│  ├─ 真實外來者（Butler, Drunk, Recluse, Saint）
│  └─ 間諜（能力正常時可能被視為外來者）
│
├─ 步驟 4: 特殊情況處理
│  ├─ 場上無外來者 → 告知「場上沒有外來者」
│  ├─ 場上只有間諜（能力正常）→ 適用間諜特殊規則
│  └─ 場上有酒鬼（believesRole 是外來者）→ 可選擇酒鬼
│
└─ 步驟 5: 說書人選擇
   ├─ 選擇一個外來者角色（從步驟 3 的列表）
   ├─ 選擇兩名玩家（一個是該外來者，另一個不是）
   └─ 展示資訊給圖書管理員
```

---

## 情境處理

### 情境 1：標準情況（場上有外來者）

**條件**：
- 圖書管理員能力正常（未中毒、未醉酒）
- 場上有 1 個或多個外來者
- 沒有特殊角色影響

**處理**：
1. 列出所有外來者玩家（role = 'butler' | 'drunk' | 'recluse' | 'saint'）
2. 說書人選擇其中一個外來者角色
3. 說書人選擇兩名玩家：
   - 玩家 A：該外來者角色的玩家
   - 玩家 B：任意其他玩家（非該外來者）
4. 展示：「這兩名玩家中有一個是【外來者角色】」

**範例**（7 人局）：
```
場上角色：
- 1號: Washerwoman（鎮民）
- 2號: Librarian（鎮民）← 圖書管理員本人
- 3號: Chef（鎮民）
- 4號: Empath（鎮民）
- 5號: Monk（鎮民）
- 6號: Poisoner（爪牙）
- 7號: Imp（惡魔）

→ 場上無外來者

展示：「場上沒有任何外來者角色。」
mustFollow: true
```

**範例**（9 人局有外來者）：
```
場上角色：
- 1號: Washerwoman（鎮民）
- 2號: Librarian（鎮民）← 圖書管理員本人
- 3號: Butler（外來者）
- 4號: Recluse（外來者）
- 5號: Empath（鎮民）
- 6號: Monk（鎮民）
- 7號: Chef（鎮民）
- 8號: Spy（爪牙）
- 9號: Imp（惡魔）

說書人選擇：
- 選擇外來者角色：Butler（管家）
- 選擇玩家：3號（Butler）和 5號（Empath）

展示：「3號 或 5號 是【管家】」
mustFollow: true（能力正常）
canLie: false
```

---

### 情境 2：場上無外來者

**條件**：
- 場上沒有任何外來者（例如 7 人局、10 人局無男爵）
- 沒有間諜、沒有酒鬼相信自己是外來者

**處理**：
- 直接告知圖書管理員：「場上沒有任何外來者角色」
- `mustFollow: true`（必須遵守）
- `canLie: false`（不可說謊）

**UI 顯示**：
```
圖書管理員（2號）資訊：
場上沒有任何外來者角色。

[確認]
```

---

### 情境 3：間諜影響

#### 情境 3.1：只有間諜（能力正常）

**條件**：
- 場上唯一的"外來者"是間諜（能力正常）
- 間諜未中毒、未醉酒

**處理**：
- 說書人可以選擇：
  - **選項 A（推薦）**：告知「場上沒有外來者」（不讓圖書管理員看到間諜）
  - **選項 B**：給予假外來者資訊（選擇任何外來者角色 + 兩名玩家）
- 原因：間諜的能力是"可能"被視為外來者，說書人可以選擇是否讓圖書管理員看到間諜
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可給予假資訊）

**範例**：
```
場上角色：
- 1號: Washerwoman
- 2號: Librarian ← 圖書管理員
- 3號: Chef
- 4號: Empath
- 5號: Monk
- 6號: Spy（爪牙，能力正常）
- 7號: Imp

→ 只有間諜在場

說書人選項：
選項 A（推薦）：告知「場上沒有外來者」
選項 B：選擇假外來者角色（如 Butler），指向 6號(Spy) 和其他玩家

mustFollow: false
canLie: true
```

#### 情境 3.2：間諜 + 其他外來者

**條件**：
- 場上有真實外來者（Butler、Drunk、Recluse、Saint）
- 同時有間諜（能力正常）

**處理**：
- 說書人可以選擇：
  - **選項 A（推薦）**：選擇真實外來者
  - **選項 B**：選擇間諜（讓間諜被視為外來者）
  - **選項 C**：給予完全錯誤的資訊（選擇不在場的外來者角色）
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可選擇間諜或給假資訊）

**範例**：
```
場上角色：
- 1號: Librarian ← 圖書管理員
- 2號: Butler（外來者）
- 3號: Spy（爪牙，能力正常）
- ...其他玩家

說書人選項：
選項 A（推薦）：選擇 Butler，指向 2號 和 其他玩家
選項 B：選擇 Spy（視為外來者），指向 3號 和 其他玩家
選項 C：選擇不在場的角色（如 Drunk），指向任意兩名玩家

mustFollow: false
canLie: true
```

#### 情境 3.3：間諜中毒或醉酒

**條件**：
- 間諜中毒或醉酒，能力失效

**處理**：
- 間諜失去能力，**不再**被視為外來者
- 只考慮真實外來者
- 如果場上只有中毒/醉酒的間諜，視為「無外來者」

---

### 情境 4：陌客（Recluse）影響

**重要**：陌客能力是「可能被視為邪惡/爪牙/惡魔」，因此**可能不被視為外來者**。

#### 情境 4.1：陌客能力正常

**條件**：
- 場上有陌客（能力正常）
- 陌客未中毒、未醉酒

**處理**：
- 說書人可以選擇：
  - 選項 A：陌客被視為外來者（推薦，除非想混淆善良陣營）
  - 選項 B：陌客不被視為外來者（被視為爪牙/惡魔）
- 如果選擇選項 B，陌客不會出現在外來者列表中
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可選擇不顯示陌客）

**範例**（只有陌客）：
```
場上角色：
- 1號: Librarian ← 圖書管理員
- 2號: Recluse（外來者，能力正常）
- ...其他玩家（鎮民、爪牙、惡魔）

說書人選項：
選項 A（推薦）：陌客被視為外來者
  → 外來者列表：[Recluse]
  → 告知：「2號 或 X號 是【陌客】」

選項 B：陌客不被視為外來者（被視為爪牙/惡魔）
  → 外來者列表：[]
  → 告知：「場上沒有外來者」

mustFollow: false
canLie: true
```

**範例**（陌客 + 其他外來者）：
```
場上角色：
- 1號: Librarian
- 2號: Butler（外來者）
- 3號: Recluse（外來者，能力正常）
- ...

說書人選項：
選項 A：陌客被視為外來者
  → 可選擇 Butler 或 Recluse

選項 B：陌客不被視為外來者
  → 只能選擇 Butler

推薦：選項 A（避免混淆）
```

#### 情境 4.2：陌客中毒或醉酒

**條件**：
- 陌客中毒或醉酒，能力失效

**處理**：
- 陌客失去能力，**必須**被視為外來者
- 陌客會出現在外來者列表中
- `mustFollow: true`（能力失效時）

---

### 情境 5：酒鬼（Drunk）影響

#### 情境 5.1：酒鬼相信自己是外來者

**條件**：
- 場上有酒鬼（Drunk）
- 酒鬼的 `believesRole` 是外來者角色（例如 Butler）

**處理**：
- 酒鬼本身就是外來者角色
- 可以選擇酒鬼，告知其 `role`（真實角色 = 'drunk'）
- **注意**：告知的是真實角色 'drunk'，不是 believesRole

**範例**：
```
場上角色：
- 3號: Drunk（外來者，believesRole = 'butler'，以為自己是管家）

說書人選擇：
- 選擇外來者角色：Drunk（酒鬼）
- 選擇玩家：3號（Drunk）和 其他玩家

展示：「3號 或 5號 是【酒鬼】」
注意：告知的是 Drunk（真實角色），不是 Butler（believesRole）
```

#### 情境 5.2：酒鬼相信自己是鎮民

**條件**：
- 酒鬼的 `believesRole` 是鎮民（例如 Washerwoman）

**處理**：
- 酒鬼仍然是外來者
- 可以選擇酒鬼，告知 'drunk'
- believesRole 不影響圖書管理員的判斷

---

### 情境 6：圖書管理員中毒/醉酒

**條件**：
- 圖書管理員自己中毒（被投毒者下毒）
- 或圖書管理員自己是酒鬼（believesRole = 'librarian'）

**處理**：
- 能力不可靠（`infoReliable = false`）
- 說書人可以給錯誤資訊：
  - 選項 A：給正確資訊（推薦，避免暴露投毒者）
  - 選項 B：給錯誤的外來者角色
  - 選項 C：給錯誤的玩家組合
  - 選項 D：在無外來者時說有外來者，或反之
- `mustFollow: false`（說書人可自由選擇）
- `canLie: true`（可以給錯誤資訊）

**UI 提示**：
```
⚠️ 圖書管理員中毒/醉酒，能力不可靠
說書人可以選擇給予錯誤資訊。

推薦：給予正確資訊，避免暴露投毒者。
```

---

## Handler 實作規格

### LibrarianHandler.process()

```typescript
process(context: HandlerContext): NightResult {
  const { player, gameState, stateManager } = context;

  // 步驟 1: 檢查圖書管理員狀態
  const isPoisoned = player.isPoisoned;
  const isDrunk = player.isDrunk;
  const infoReliable = !isPoisoned && !isDrunk;

  // 步驟 2: 取得所有存活玩家（排除圖書管理員自己）
  const allPlayers = stateManager.getAlivePlayers().filter(p => p.seat !== player.seat);

  // 步驟 3: 篩選外來者玩家
  const outsiders = allPlayers.filter(p => {
    // 真實外來者（排除陌客，稍後特別處理）
    if (p.team === 'outsider' && p.role !== 'recluse') return true;

    // 間諜（能力正常時可能被視為外來者）
    if (p.role === 'spy' && !p.isPoisoned && !p.isDrunk) {
      return true; // 間諜可能被視為外來者（說書人可選擇）
    }

    return false;
  });

  // 步驟 3.5: 處理陌客（能力正常時可以選擇不視為外來者）
  const recluses = allPlayers.filter(p =>
    p.role === 'recluse' && !p.isPoisoned && !p.isDrunk
  );

  // 陌客中毒/醉酒時必須被視為外來者
  const poisonedOrDrunkRecluses = allPlayers.filter(p =>
    p.role === 'recluse' && (p.isPoisoned || p.isDrunk)
  );

  // 將中毒/醉酒的陌客加入外來者列表
  outsiders.push(...poisonedOrDrunkRecluses);

  // 步驟 4: 無外來者且無陌客情況
  if (outsiders.length === 0 && recluses.length === 0) {
    return {
      action: 'show_info',
      display: '場上沒有任何外來者角色',
      info: {
        noOutsiderInGame: true,
      },
      mustFollow: false,
      canLie: true,
    };
  }

  // 步驟 5: 只有間諜的特殊情況（僅在間諜能力正常且無陌客時適用）
  // 與調查員不同：這裡不強制告知「無外來者」，而是提供選項給 UI
  if (outsiders.length === 1 && outsiders[0].role === 'spy' &&
      !outsiders[0].isPoisoned && !outsiders[0].isDrunk &&
      recluses.length === 0) {
    return {
      action: 'show_info',
      display: '場上只有間諜（能力正常），可給予假外來者資訊',
      info: {
        onlySpyInGame: true,
        spy: {
          seat: outsiders[0].seat,
          name: outsiders[0].name,
          role: outsiders[0].role,
          roleName: this.getPlayerRoleName(outsiders[0]),
        },
      },
      mustFollow: false, // 說書人可選擇給假資訊或「無外來者」
      canLie: true,
    };
  }

  // 步驟 6: 準備外來者列表
  const outsiderList = outsiders.map(o => ({
    seat: o.seat,
    name: o.name,
    role: o.role,
    roleName: this.getPlayerRoleName(o),
  }));

  // 步驟 7: 檢查特殊角色（供 UI 層參考）
  const hasSpy = outsiders.some(o =>
    o.role === 'spy' && !o.isPoisoned && !o.isDrunk
  );
  const hasRecluse = recluses.length > 0;

  // 準備陌客列表（能力正常，可選擇不視為外來者）
  const recluseList = recluses.map(r => ({
    seat: r.seat,
    name: r.name,
    role: r.role,
    roleName: this.getPlayerRoleName(r),
  }));

  // 步驟 8: 返回資訊，讓說書人在 UI 中選擇
  const statusReason = isPoisoned ? '中毒' : isDrunk ? '醉酒' : '';

  return {
    action: 'show_info',
    display: `圖書管理員資訊獲取\n場上外來者角色：${outsiderList.map(o => `${o.seat}號 ${o.name}(${o.roleName})`).join('、')}${hasRecluse ? `\n陌客（可選擇不視為外來者）：${recluseList.map(r => `${r.seat}號 ${r.name}`).join('、')}` : ''}`,
    info: {
      // 在場外來者列表（供 UI 選擇）
      outsiders: outsiderList,
      // 陌客列表（能力正常，可選擇性加入）
      recluses: recluseList,
      hasSpy,
      hasRecluse,
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

## UI 規格（LibrarianProcessor）

### UI 流程

1. **無外來者及無間諜情況**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：✅ 正常

   提示場上沒有任何外來者角色。

   [確認]
   ```

2. **只有間諜情況**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：✅ 正常

   場上外來者：
   - 6號 Eve（間諜）[可視為外來者]

   選擇外來者角色：
   [下拉選單: 所有外來者角色，包括不在場的，不預選]

   選擇第一位玩家（該外來者）：
   [下拉選單: 玩家列表，預選 Eve]

   選擇第二位玩家（非該外來者）：
   [下拉選單: 玩家列表，從非外來者名單隨機預選]

   選擇的第一位跟第二位玩家不能重複

   ℹ️ 提示：
   - 只有間諜在場，可給予假外來者資訊

   [確認] [給予「無外來者」資訊]
   ```

3. **有外來者但只有陌客情況**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：✅ 正常

   場上外來者：
   - 5號 Bob（陌客）[可視為非外來者]

   選擇外來者角色：
   [下拉選單: 所有外來者角色，預選陌客]

   選擇第一位玩家（該外來者）：
   [下拉選單: 玩家列表，預選 Bob]

   選擇第二位玩家（非該外來者）：
   [下拉選單: 玩家列表，從非外來者名單隨機預選]

   選擇的第一位跟第二位玩家不能重複

   ℹ️ 提示：
   - 只有陌客在場，可給予無外來者資訊

   [確認] [給予「無外來者」資訊]
   ```

4. **標準情況（有其他外來者）**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：✅ 正常

   場上外來者：
   - 3號 Bob（管家）
   - 6號 Eve（間諜）[可視為外來者]
   - 4號 Charlie（陌客）[能力正常，可選擇不視為外來者]

   選擇外來者角色：
   [下拉選單: 所有外來者角色，包括不在場的，優先預選其他在場外來者 > 陌客]

   選擇第一位玩家（該外來者）：
   [下拉選單: 所有玩家列表，優先預選其他在場外來者 > 間諜 > 陌客]

   選擇第二位玩家（非該外來者）：
   [下拉選單: 所有玩家列表，從在場非外來者名單隨機預選，包含陌客]

   選擇的第一位跟第二位玩家不能重複

   ℹ️ 提示：
   - 間諜在場，可選擇間諜作為外來者
   - 陌客能力正常，可選擇不視為外來者

   [確認]
   ```

5. **中毒/醉酒情況**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：⚠️ 中毒/醉酒（能力不可靠）

   說書人可以選擇給予錯誤資訊。
   推薦：給予正確資訊，避免暴露投毒者。

   場上外來者：
   - 3號 Bob（管家）
   - 4號 Charlie（陌客）

   選擇外來者角色：
   [下拉選單: 所有外來者角色，包括不在場的，不預選]

   選擇第一位玩家：
   [下拉選單: 所有玩家列表，不預選]

   選擇第二位玩家：
   [下拉選單: 所有玩家列表，不預選]

   選擇的第一位跟第二位玩家不能重複

   [確認] [給予「無外來者」資訊]
   ```

6. **自己是酒鬼情況**：
   ```
   圖書管理員（2號 Alice）
   能力狀態：角色實際上是酒鬼（無能力）

   說書人可以選擇給予錯誤資訊。
   推薦：給予假外來者角色，挑選兩個反差大的玩家。

   選擇外來者角色：
   [下拉選單: 所有外來者角色，包括不在場的，不預選]

   選擇第一位玩家：
   [下拉選單: 所有玩家列表，不預選]

   選擇第二位玩家：
   [下拉選單: 所有玩家列表，不預選]

   選擇的第一位跟第二位玩家不能重複

   [確認] [給予「無外來者」資訊]
   ```   

---

## 測試用例

### T1：標準情況（有外來者，能力正常）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'washerwoman', isAlive: true },
    { seat: 2, role: 'librarian', isAlive: true }, // 圖書管理員
    { seat: 3, role: 'butler', isAlive: true },    // 外來者
    { seat: 4, role: 'chef', isAlive: true },
    { seat: 5, role: 'empath', isAlive: true },
    { seat: 6, role: 'recluse', isAlive: true },   // 外來者
    { seat: 7, role: 'poisoner', isAlive: true },
    { seat: 8, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(2),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.action === 'show_info');
assert(result.info.outsiders.length === 2);
assert(result.info.outsiders.some(o => o.role === 'butler'));
assert(result.info.outsiders.some(o => o.role === 'recluse'));
assert(result.info.reliable === true);
assert(result.mustFollow === false); // 說書人可選擇
assert(result.canLie === true);
```

### T2：無外來者（7人局）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'washerwoman', isAlive: true },
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'spy', isAlive: true, isPoisoned: true }, // 間諜中毒
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.noOutsiderInGame === true);
assert(result.mustFollow === true); // 必須告知無外來者
assert(result.canLie === false);
```

### T3：只有間諜（能力正常）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'washerwoman', isAlive: true },
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'spy', isAlive: true }, // 間諜能力正常
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證：間諜特殊規則
assert(result.info.onlySpyInGame === true);
assert(result.info.noOutsiderToShow === true);
assert(result.mustFollow === true); // 必須遵守間諜規則
assert(result.canLie === false);
```

### T4：間諜 + 真實外來者

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'butler', isAlive: true },   // 外來者
    { seat: 3, role: 'spy', isAlive: true },      // 間諜
    { seat: 4, role: 'chef', isAlive: true },
    { seat: 5, role: 'empath', isAlive: true },
    { seat: 6, role: 'monk', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.outsiders.length === 2); // Butler + Spy
assert(result.info.outsiders.some(o => o.role === 'butler'));
assert(result.info.outsiders.some(o => o.role === 'spy'));
assert(result.info.hasSpy === true);
assert(result.mustFollow === false); // 說書人可選擇
assert(result.canLie === true); // 可選擇間諜
```

### T5：圖書管理員中毒

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true, isPoisoned: true }, // 中毒
    { seat: 2, role: 'butler', isAlive: true },
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
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

### T6：酒鬼（相信自己是管家）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'drunk', believesRole: 'butler', isAlive: true }, // 酒鬼
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.outsiders.length === 1);
assert(result.info.outsiders[0].role === 'drunk'); // 真實角色
// 注意：不是 'butler'（believesRole）
```

### T7：陌客（能力正常）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'recluse', isAlive: true }, // 陌客，能力正常
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.outsiders.length === 0); // 陌客不在主列表
assert(result.info.recluses.length === 1); // 陌客在特殊列表
assert(result.info.recluses[0].role === 'recluse');
assert(result.info.hasRecluse === true);
assert(result.mustFollow === false); // 說書人可選擇
assert(result.canLie === true); // 可選擇不顯示陌客
```

### T8：陌客 + 其他外來者

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'butler', isAlive: true },   // 真實外來者
    { seat: 3, role: 'recluse', isAlive: true },  // 陌客
    { seat: 4, role: 'chef', isAlive: true },
    { seat: 5, role: 'empath', isAlive: true },
    { seat: 6, role: 'monk', isAlive: true },
    { seat: 7, role: 'spy', isAlive: true },      // 間諜
    { seat: 8, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.outsiders.length === 2); // Butler + Spy
assert(result.info.recluses.length === 1);  // Recluse 在特殊列表
assert(result.info.hasSpy === true);
assert(result.info.hasRecluse === true);
// 說書人可選擇：Butler、Spy，或將 Recluse 加入選項
```

### T9：陌客中毒（必須視為外來者）

```typescript
const gameState = createTestGame({
  players: [
    { seat: 1, role: 'librarian', isAlive: true },
    { seat: 2, role: 'recluse', isAlive: true, isPoisoned: true }, // 陌客中毒
    { seat: 3, role: 'chef', isAlive: true },
    { seat: 4, role: 'empath', isAlive: true },
    { seat: 5, role: 'monk', isAlive: true },
    { seat: 6, role: 'poisoner', isAlive: true },
    { seat: 7, role: 'imp', isAlive: true },
  ],
});

const result = librarianHandler.process({
  player: gameState.getPlayer(1),
  gameState: gameState.getState(),
  stateManager: gameState,
});

// 驗證
assert(result.info.outsiders.length === 1); // 陌客在主列表（中毒）
assert(result.info.outsiders[0].role === 'recluse');
assert(result.info.recluses.length === 0); // 不在特殊列表
// 陌客中毒時失去能力，必須被視為外來者
```

---

## 與調查員的差異

| 特性 | 調查員（Investigator） | 圖書管理員（Librarian） |
|------|------------------------|-------------------------|
| 目標陣營 | 爪牙（Minion） | 外來者（Outsider） |
| 無目標情況 | 可能無爪牙 | 可能無外來者 |
| 間諜影響 | 只有間諜時必須告知「無爪牙」 | 只有間諜時可選擇給假資訊或告知「無外來者」 |
| 間諜 + 真實目標 | 可選擇間諜（視為爪牙） | 可選擇間諜（視為外來者） |
| 陌客影響 | 可能被視為爪牙（不出現在爪牙列表） | 可能不被視為外來者（獨立列表供選擇） |
| 酒鬼影響 | 不影響（酒鬼不是爪牙） | 可能被選中（酒鬼是外來者） |
| firstNight | 38（在圖書管理員之後） | 37（在調查員之前） |
| UI 靈活度 | 較嚴格（間諜規則強制） | 較靈活（更多說書人選項） |

**重要差異說明**：

### 1. 間諜處理差異
- **調查員**：只有間諜時，`mustFollow: true, canLie: false`，必須告知「無爪牙」
- **圖書管理員**：只有間諜時，`mustFollow: false, canLie: true`，可選擇給假資訊或告知「無外來者」
- **原因**：圖書管理員提供更靈活的說書人體驗，允許更多策略選擇

### 2. 陌客處理差異
- **調查員**：陌客能力正常時，可能被視為爪牙 → 調查員**看不到**陌客（因為陌客不在爪牙列表）
- **圖書管理員**：陌客能力正常時，可能不被視為外來者 → 單獨列表供 UI 選擇

兩者本質相同，但實作方式不同：
- 調查員：陌客可能被"加入"爪牙列表（實際上陌客不是爪牙）
- 圖書管理員：陌客被放在**獨立列表**（`recluses`），UI 可選擇是否顯示

### 3. UI 實作差異
**調查員**：
- 間諜規則強制執行
- 較少的說書人選項

**圖書管理員**：
- 更多說書人選項
- 陌客獨立列表（`outsiders` vs `recluses`）
- 間諜情況下可選擇給假資訊

---

## 實作優先級

### Phase 1：Handler 實作 ✅
- [x] 建立 `LibrarianHandler.ts`
- [x] 實作基本邏輯流程
- [x] 處理無外來者情況
- [x] 處理間諜情況（提供選項給 UI）
- [x] 處理陌客獨立列表（`outsiders` vs `recluses`）
- [x] 處理酒鬼（告知真實角色）
- [x] 處理中毒/醉酒情況
- [x] 單元測試

### Phase 2：UI 實作
- [ ] 建立 `LibrarianProcessor.tsx`
- [ ] 實作外來者角色選擇介面（下拉選單，包含不在場的角色）
- [ ] 實作雙玩家選擇介面（第一位、第二位）
- [ ] 顯示能力狀態（✅ 正常 / ⚠️ 中毒/醉酒）
- [ ] 顯示陌客獨立列表（可選擇不視為外來者）
- [ ] 顯示間諜提示（可視為外來者）
- [ ] 實作「給予無外來者資訊」按鈕（間諜/陌客情況）
- [ ] 預選邏輯：
  - 能力正常時：優先預選真實外來者 > 間諜 > 陌客
  - 中毒/醉酒時：不預選任何項目

### Phase 3：整合測試
- [ ] 測試各種情境組合（9 種核心情境）
- [ ] 測試 UI 流程（6 種 UI 情境）
- [ ] 驗證陌客獨立列表正確性
- [ ] 驗證間諜選項靈活性
- [ ] 驗證酒鬼顯示真實角色

---

## 注意事項

### 1. 間諜處理（與調查員不同）

**關鍵差異**：圖書管理員對間諜的處理比調查員更靈活

- 間諜能力正常時，**可能**被視為外來者（說書人選擇）
- **只有間諜時**：
  - ❌ **不是**強制告知「無外來者」（與調查員不同）
  - ✅ 說書人可選擇：
    - 選項 A（推薦）：告知「無外來者」
    - 選項 B：給予假外來者資訊
  - `mustFollow: false, canLie: true`
- **間諜 + 真實外來者時**：
  - 可選擇間諜（視為外來者）
  - 可選擇真實外來者
  - 可給完全錯誤的資訊

### 2. 陌客處理（獨立列表）

**關鍵機制**：陌客使用獨立列表，不是簡單的包含/排除

- **陌客能力正常時**：
  - 放入 `recluses` 列表（不在 `outsiders` 列表）
  - UI 可選擇是否將陌客視為外來者
  - 說書人選項：
    - 顯示陌客（告知陌客資訊）
    - 不顯示陌客（視為爪牙/惡魔，告知無外來者或其他外來者）
- **陌客中毒/醉酒時**：
  - 必須放入 `outsiders` 列表（不在 `recluses` 列表）
  - 失去能力，必須被視為外來者

**實作要點**：
```typescript
// 正確做法：分開處理
const recluses = allPlayers.filter(p =>
  p.role === 'recluse' && !p.isPoisoned && !p.isDrunk
);

const poisonedOrDrunkRecluses = allPlayers.filter(p =>
  p.role === 'recluse' && (p.isPoisoned || p.isDrunk)
);

outsiders.push(...poisonedOrDrunkRecluses);
```

### 3. 酒鬼處理（真實角色）

- 酒鬼本身就是外來者角色
- **告知的是真實角色 `'drunk'`，不是 `believesRole`**
- `believesRole` 僅用於顯示名稱，不影響檢測邏輯

**錯誤範例**：
```typescript
// ❌ 錯誤：不應該使用 believesRole
if (player.believesRole === 'butler') { ... }
```

**正確範例**：
```typescript
// ✅ 正確：使用真實角色
if (player.role === 'drunk') { ... }
```

### 4. 中毒/醉酒

- 圖書管理員中毒/醉酒時，`reliable: false`
- 說書人可以給任何資訊（包括不存在的外來者）
- **推薦做法**：給正確資訊，避免暴露投毒者
- UI 不預選任何項目，讓說書人自由選擇

### 5. UI 設計要點

**必須實作的功能**：
1. 外來者角色下拉選單（**包括不在場的角色**）
2. 兩個玩家選擇下拉選單（不能重複）
3. 「給予無外來者資訊」按鈕（間諜/陌客情況）
4. 能力狀態顯示（✅ 正常 / ⚠️ 中毒/醉酒）
5. 提示訊息：
   - 間諜在場：「可選擇間諜作為外來者」
   - 陌客在場：「能力正常，可選擇不視為外來者」
   - 中毒/醉酒：「可以選擇給予錯誤資訊」

**預選邏輯**：
- **能力正常**：
  - 角色：優先預選在場外來者（排除陌客）
  - 第一位玩家：優先預選在場外來者 > 間諜 > 陌客
  - 第二位玩家：從非外來者隨機預選（可包含陌客）
- **中毒/醉酒**：
  - 所有下拉選單都不預選
  - 讓說書人完全自由選擇

### 6. 與調查員的實作差異

| 項目 | 調查員 | 圖書管理員 |
|------|--------|------------|
| 只有間諜 | 強制告知「無爪牙」 | 可選擇給假資訊或「無外來者」 |
| 陌客處理 | 簡單的包含/排除 | 獨立列表（`recluses`） |
| UI 靈活度 | 較嚴格 | 較靈活，更多選項 |
| mustFollow | true（間諜情況） | false（所有情況） |

**重要**：不要直接複製調查員的實作，兩者有明顯差異！
