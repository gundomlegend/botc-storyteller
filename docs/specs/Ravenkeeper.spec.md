# Ravenkeeper（守鴉人）規格書

## 概述

守鴉人是鎮民（Townsfolk）陣營的資訊型角色。若守鴉人**在夜晚死亡**，會被喚醒並選擇一名玩家，得知該玩家的角色。

**關鍵特性**：
- 其他夜晚能力（otherNight: 41）
- 第一夜不執行（firstNight: 0）
- **觸發條件**：今晚死亡（通常被惡魔殺死）
- 死後仍然工作（worksWhenDead: true）— 因為觸發條件本身就是死亡
- 一次性能力 — 觸發後不再執行
- 需要選擇一名目標玩家
- 提供角色資訊（不是陣營資訊）
- 受中毒/醉酒影響，能力可能失效

---

## 角色資料

```json
{
  "id": "ravenkeeper",
  "name": "Ravenkeeper",
  "name_cn": "守鴉人",
  "team": "townsfolk",
  "ability": "If you die at night, you are woken to choose a player: you learn their character.",
  "ability_cn": "若你在夜晚死亡，你會被喚醒並選擇一名玩家：你會得知其角色。",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 41,
  "otherNightReminder": "If the Ravenkeeper died tonight, the Ravenkeeper points to a player. Show that character token.",
  "otherNightReminder_cn": "若守鴉人今晚死亡，喚醒守鴉人使其指向一名玩家，並提示該玩家的角色。",
  "reminders": [],
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": true
}
```

**中文能力描述**：若你在夜晚死亡，你會被喚醒並選擇一名玩家：你會得知其角色。

---

## 核心機制

### 與送葬者的關鍵差異

| 項目 | 守鴉人 | 送葬者 |
|------|--------|--------|
| 觸發條件 | 自己在夜晚死亡 | 白天有人被處決 |
| 目標選擇 | **需要選擇**一名玩家 | 不需要選擇（自動取得處決者） |
| 執行次數 | **一次性**（死亡後觸發一次） | 每晚（只要活著且有處決） |
| 死後工作 | ✅ 是（觸發條件就是死亡） | ❌ 否 |
| 需要 UI 互動 | ✅ 需要 PlayerSelector | ❌ 只需確認 |

### 基本邏輯流程

```
守鴉人每晚流程：
├─ 步驟 1: 檢查是否為第一夜
│  └─ 是第一夜？ → 跳過（守鴉人不在第一夜執行）
│
├─ 步驟 2: 檢查守鴉人是否今晚死亡
│  ├─ 今晚未死亡？ → 跳過（能力未觸發）
│  └─ 今晚死亡？ → 繼續
│
├─ 步驟 3: 檢查守鴉人狀態
│  ├─ 中毒？ → 資訊不可靠，說書人可給錯誤資訊
│  └─ 醉酒/酒鬼？ → 資訊不可靠，說書人可給錯誤資訊
│
├─ 步驟 4: 守鴉人選擇一名玩家
│  └─ 可選擇任何玩家（包括存活和已死亡玩家，也可選自己）
│
├─ 步驟 5: 取得被選玩家的角色資訊
│  ├─ 被選玩家的真實角色
│  └─ 被選玩家的狀態（中毒/醉酒/酒鬼）
│
├─ 步驟 6: 檢查被選玩家的特殊角色
│  ├─ 陌客（能力正常）？ → 說書人可選擇在場邪惡角色
│  ├─ 間諜（能力正常）？ → 說書人可選擇在場善良角色
│  └─ 其他角色 → 繼續正常流程
│
└─ 步驟 7: 顯示資訊
   ├─ 能力正常 + 標準角色 → 顯示真實角色
   ├─ 能力正常 + 陌客 → 說書人可選擇在場邪惡角色
   ├─ 能力正常 + 間諜 → 說書人可選擇在場善良角色
   ├─ 中毒/醉酒 → 說書人可選擇給任意在場角色
   └─ 自己是酒鬼 → 說書人可選擇給任意在場角色
```

---

## 情境處理

### 情境 1：標準情況（今晚死亡，能力正常）

**條件**：
- 守鴉人今晚被惡魔殺死
- 能力正常（未中毒、未醉酒、非酒鬼）

**處理**：
1. 喚醒守鴉人
2. 守鴉人選擇一名玩家
3. 顯示該玩家的真實角色
4. 記錄事件

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（Ravenkeeper）
- 守鴉人被喚醒，選擇 5號玩家
- 5號玩家是 Poisoner

守鴉人（3號）獲得資訊：
→ 「5號玩家的角色是【下毒者 Poisoner】」
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：今晚被惡魔殺死

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

選擇結果：5號 Bob
→ 角色：下毒者 Poisoner

[確認]
```

---

### 情境 2：今晚未死亡

**條件**：
- 守鴉人今晚未死亡（可能被僧侶保護、惡魔選了別人等）

**處理**：
1. 跳過守鴉人行動
2. 顯示「守鴉人今晚未死亡，能力未觸發」

**範例**：
```
第 2 夜：
- 惡魔殺死 5號玩家（不是守鴉人）
- 守鴉人（3號）今晚未死亡 → 跳過
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：✅ 正常

守鴉人今晚未死亡，能力未觸發。

[跳過]
```

---

### 情境 3：中毒/醉酒時被殺（能力不可靠）

**條件**：
- 守鴉人今晚死亡
- 守鴉人中毒或醉酒

**處理**：
1. 仍然喚醒守鴉人（中毒/醉酒的玩家不知道自己受影響）
2. 守鴉人選擇一名玩家
3. 說書人可選擇給**正確**或**錯誤**的角色資訊
4. UI 提示說書人能力不可靠

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（Ravenkeeper，中毒）
- 守鴉人被喚醒，選擇 5號玩家
- 5號玩家是 Poisoner

守鴉人（3號，中毒）獲得資訊：
→ 說書人可選擇：
   - 正確資訊：「5號是投毒者 Poisoner」
   - 錯誤資訊：「5號是僧侶 Monk」
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：⚠️ 中毒/醉酒（能力不可靠）
觸發原因：今晚被惡魔殺死

⚠️ 守鴉人中毒/醉酒，能力不可靠
推薦：給予在場但錯誤的角色，避免暴露投毒者

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

選擇結果：5號 Bob
→ 真實角色：下毒者 Poisoner

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

[確認]
```

---

### 情境 4：自己是酒鬼

**條件**：
- 守鴉人實際上是酒鬼（believesRole = 'ravenkeeper', role = 'drunk'）
- 今晚死亡

**處理**：
1. 仍然喚醒（玩家以為自己是守鴉人）
2. 守鴉人選擇一名玩家
3. 說書人可選擇給**任意**角色資訊
4. 推薦：給與真相無關的角色

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（以為自己是 Ravenkeeper，實際是 Drunk）
- 被喚醒，選擇 5號玩家
- 5號玩家是 Poisoner

守鴉人（3號，實際是酒鬼）獲得資訊：
→ 說書人可選擇任意角色
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：🍺 實際上是酒鬼（無能力）
觸發原因：今晚被惡魔殺死

⚠️ 此玩家實際上是酒鬼，能力無效
推薦：給予在場但錯誤的角色，避免暴露投毒者

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

選擇結果：5號 Bob
→ 真實角色：下毒者 Poisoner

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

[確認]
```

---

### 情境 5：選擇的目標是陌客（能力正常）

**條件**：
- 守鴉人能力正常
- 選擇的目標玩家是陌客（Recluse）且陌客能力正常

**處理**：
1. 陌客能力正常時，可以被視為邪惡角色
2. 說書人可選擇在場的任一邪惡角色顯示給守鴉人
3. UI 提供在場邪惡角色列表供選擇

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（Ravenkeeper）
- 守鴉人選擇 6號玩家（Recluse，能力正常）

守鴉人（3號）獲得資訊：
→ 說書人可選擇：
   - 顯示陌客本身「Recluse」
   - 顯示在場邪惡角色「Poisoner」
   - 顯示在場邪惡角色「Imp」
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：今晚被惡魔殺死

選擇結果：6號 Kevin（陌客 Recluse，能力正常）

選擇顯示角色：
[下拉選單: 陌客本身 + 所有在場邪惡角色，隨機預選]

ℹ️ 提示：陌客能力正常，可以被認定為邪惡角色

[確認]
```

---

### 情境 6：選擇的目標是間諜（能力正常）

**條件**：
- 守鴉人能力正常
- 選擇的目標玩家是間諜（Spy）且間諜能力正常

**處理**：
1. 間諜能力正常時，可以被視為善良角色
2. 說書人可選擇在場的任一善良角色顯示給守鴉人
3. UI 提供在場善良角色列表供選擇

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（Ravenkeeper）
- 守鴉人選擇 6號玩家（Spy，能力正常）

守鴉人（3號）獲得資訊：
→ 說書人可選擇：
   - 顯示間諜本身「Spy」
   - 顯示在場善良角色「Monk」
   - 顯示在場善良角色「Empath」
```

---

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：今晚被惡魔殺死

選擇結果：6號 Kevin（間諜 Spy，能力正常）

選擇顯示角色：
[下拉選單: 間諜本身 + 所有在場善良角色，隨機預選]

ℹ️ 提示：間諜能力正常，可以被認定為善良角色

[確認]
```

---

### 情境 7：選擇的目標是酒鬼

**條件**：
- 守鴉人能力正常
- 選擇的目標玩家實際上是酒鬼（believesRole ≠ role）

**處理**：
1. 能力正常時，守鴉人看到的是目標玩家的**真實角色**（酒鬼 Drunk）
2. 能力不可靠時，說書人可選擇給 believesRole 或 Drunk

**範例**：
```
第 2 夜：
- 惡魔殺死 3號玩家（Ravenkeeper）
- 守鴉人選擇 5號玩家
  - believesRole: 'monk'（以為自己是僧侶）
  - role: 'drunk'（實際是酒鬼）

守鴉人（3號，能力正常）獲得資訊：
→ 「5號玩家的角色是【酒鬼 Drunk】」（真實角色）
```

**UI 顯示**：
```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：今晚被惡魔殺死

選擇結果：5號 Bob
  - 真實角色：酒鬼 Drunk
  - 以為自己是：僧侶 Monk

ℹ️ 提示：目標玩家是酒鬼，守鴉人會看到「酒鬼」

[確認]
```

```
守鴉人（3號 Alice）
能力狀態：⚠️ 中毒/醉酒（能力不可靠）
觸發原因：今晚被惡魔殺死

選擇結果：5號 Bob
  - 真實角色：酒鬼 Drunk
  - 以為自己是：僧侶 Monk

⚠️ 守鴉人中毒/醉酒，能力不可靠
推薦：給予在場但錯誤的角色，避免暴露投毒者

選擇顯示角色：
[下拉選單: 所有在場角色，預選僧侶]

ℹ️ 提示：目標玩家是酒鬼，守鴉人會看到「自以為的角色」

[確認]
```

---

### 情境 8：被僧侶保護（未死亡）

**條件**：
- 惡魔選擇攻擊守鴉人
- 但僧侶保護了守鴉人
- 守鴉人未死亡

**處理**：
1. 守鴉人未死亡 → 能力未觸發 → 跳過

**注意**：守鴉人不知道自己被保護了

---

### 情境 9：第一夜

**條件**：
- 第一夜

**處理**：
1. 跳過（守鴉人不在第一夜執行）
2. 即使被特殊能力殺死（極罕見），也不觸發

---

## 特殊規則

### 1. 死亡判定

**何時算作「在夜晚死亡」**：
- 被惡魔殺死（最常見情況）
- 被其他夜間能力殺死（罕見，特定劇本）

**不算作夜晚死亡的情況**：
- 白天被處決（這是白天死亡）
- 白天被貞潔者能力殺死

### 2. 時機順序

**夜晚順序**（otherNight: 41）：
- 守鴉人在惡魔行動（otherNight: 32）**之後**執行
- 確保死亡事件已經發生
- 與送葬者（otherNight: 40）相近

### 3. 一次性能力

- 守鴉人的能力只觸發**一次**
- 觸發後，在後續夜晚不再執行
- 實作上：檢查 `player.deathNight === gameState.night` 即可（死亡後不會再死第二次）

### 4. 目標選擇範圍

- 可以選擇**任何**玩家（包括已死亡玩家）
- 可以選擇**自己**
- 不需要排除任何玩家

### 5. 與間諜的互動

**選擇的目標是間諜（能力正常）**：
- 守鴉人能力正常 + 間諜能力正常 → 說書人可選擇：
  - 顯示「間諜 Spy」本身
  - 顯示任一在場善良角色（鎮民/外來者）
- 守鴉人中毒/醉酒 → 說書人可給任意在場角色
- 間諜中毒/醉酒 → 只能顯示「間諜 Spy」（失去偽裝能力）

### 6. 與陌客的互動

**選擇的目標是陌客（能力正常）**：
- 守鴉人能力正常 + 陌客能力正常 → 說書人可選擇：
  - 顯示「陌客 Recluse」本身
  - 顯示任一在場邪惡角色（爪牙/惡魔）
- 守鴉人中毒/醉酒 → 說書人可給任意在場角色
- 陌客中毒/醉酒 → 只能顯示「陌客 Recluse」（失去偽裝能力）

---

## Handler 實作規格

### 實作要點

```typescript
export class RavenkeeperHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 步驟 1: 只在其他夜晚執行（非第一夜）
    if (gameState.night === 1) {
      return { skip: true, skipReason: '守鴉人不在第一夜行動' };
    }

    // 步驟 2: 檢查守鴉人是否今晚死亡
    const diedTonight = !this.player.isAlive && this.player.deathNight === gameState.night;
    if (!diedTonight) {
      return {
        skip: true,
        skipReason: '守鴉人今晚未死亡，能力未觸發',
      };
    }

    // 步驟 3: 需要選擇一名目標玩家
    // → 由 UI 層處理（PlayerSelector），此處返回需要互動的結果
    return {
      action: 'select_player',
      display: '守鴉人今晚死亡，請選擇一名玩家查看角色',
      selectionConfig: {
        count: 1,                      // 選擇 1 名玩家
        includeAll: true,              // 包含所有玩家（存活+死亡）
        includeSelf: true,             // 可以選自己
      },
      onPlayerSelected: (targetPlayer) => {
        // 步驟 4: 取得目標玩家的真實角色
        const targetRole = targetPlayer.role;
        const targetRoleName = this.roleRegistry.getRoleName(targetRole);

        // 步驟 5: 檢查陌客/間諜特殊情況
        const isRecluse = targetRole === 'recluse'
          && !targetPlayer.isPoisoned && !targetPlayer.isDrunk;
        const isSpy = targetRole === 'spy'
          && !targetPlayer.isPoisoned && !targetPlayer.isDrunk;

        // 取得可選角色列表
        let selectableRoles: string[] = [];
        if (this.infoReliable) {
          if (isRecluse) {
            selectableRoles = Array.from(gameState.players.values())
              .filter(p => p.team === 'minion' || p.team === 'demon')
              .map(p => p.role);
          } else if (isSpy) {
            selectableRoles = Array.from(gameState.players.values())
              .filter(p => p.team === 'townsfolk' || p.team === 'outsider')
              .map(p => p.role);
          }
        } else {
          selectableRoles = Array.from(gameState.players.values())
            .map(p => p.role);
        }

        // 步驟 6: 返回資訊
        return {
          action: 'show_info',
          display: `守鴉人查看 ${targetPlayer.seat}號 ${targetPlayer.name}：${targetRoleName}`,
          info: {
            targetPlayer: {
              seat: targetPlayer.seat,
              name: targetPlayer.name,
              role: targetRole,
              roleName: targetRoleName,
              believesRole: targetPlayer.believesRole,
              isDrunk: targetPlayer.role === 'drunk',
            },
            isRecluse,
            isSpy,
            selectableRoles,
            reliable: this.infoReliable,
            statusReason: this.statusReason,
          },
          mustFollow: this.infoReliable && !isRecluse && !isSpy,
          canLie: !this.infoReliable || isRecluse || isSpy,
        };
      },
    };
  }
}
```

### Handler Info 型別

```typescript
export interface RavenkeeperHandlerInfo {
  targetPlayer: {
    seat: number;
    name: string;
    role: string;           // 真實角色
    roleName: string;
    believesRole?: string;  // 以為自己是（酒鬼情況）
    isDrunk: boolean;       // 是否為酒鬼
  };
  isRecluse: boolean;       // 目標是否為能力正常的陌客
  isSpy: boolean;           // 目標是否為能力正常的間諜
  selectableRoles: string[]; // 可選擇的角色列表（陌客/間諜/不可靠時）
  reliable: boolean;
  statusReason: string;
}
```

---

## UI 規格

### UI 流程

守鴉人的 UI 需要**兩步驟**互動（與送葬者不同）：
1. **選擇目標玩家**（PlayerSelector）
2. **確認/選擇角色**（顯示結果或提供選擇）

#### 1. 標準情況（今晚死亡，能力正常）

```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：💀 今晚被惡魔殺死

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

--- 選擇 5號 Bob 後 ---

查看結果：
→ 5號 Bob 的角色是【下毒者 Poisoner】

[確認]
```

#### 2. 中毒/醉酒（能力不可靠）

```
守鴉人（3號 Alice）
能力狀態：⚠️ 中毒/醉酒（能力不可靠）
觸發原因：💀 今晚被惡魔殺死

⚠️ 守鴉人中毒/醉酒，能力不可靠
推薦：給予在場但錯誤的角色，避免暴露投毒者

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

--- 選擇 5號 Bob 後 ---

5號 Bob 的真實角色：下毒者 Poisoner

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

[確認]
```

#### 3. 自己是酒鬼

```
守鴉人（3號 Alice）
能力狀態：🍺 實際上是酒鬼（無能力）
觸發原因：💀 今晚被惡魔殺死

⚠️ 此玩家實際上是酒鬼，能力無效
推薦：給予與真相無關的角色，增加混淆

選擇一名玩家查看角色：
[PlayerSelector: 所有玩家]

--- 選擇 5號 Bob 後 ---

5號 Bob 的真實角色：下毒者 Poisoner

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

[確認]
```

#### 4. 今晚未死亡

```
守鴉人（3號 Alice）
能力狀態：✅ 正常

守鴉人今晚未死亡，能力未觸發。

[跳過]
```

#### 5. 選擇目標是陌客（能力正常）

```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：💀 今晚被惡魔殺死

--- 選擇 6號 Kevin 後 ---

6號 Kevin 的真實角色：陌客 Recluse（能力正常）

選擇顯示角色：
[下拉選單: 陌客本身 + 所有在場邪惡角色，隨機預選]

ℹ️ 提示：陌客能力正常，可以被認定為邪惡角色

[確認]
```

#### 6. 選擇目標是間諜（能力正常）

```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：💀 今晚被惡魔殺死

--- 選擇 6號 Lee 後 ---

6號 Lee 的真實角色：間諜 Spy（能力正常）

選擇顯示角色：
[下拉選單: 間諜本身 + 所有在場善良角色，隨機預選]

ℹ️ 提示：間諜能力正常，可以被認定為善良角色

[確認]
```

#### 7. 選擇目標是酒鬼

```
守鴉人（3號 Alice）
能力狀態：✅ 正常
觸發原因：💀 今晚被惡魔殺死

--- 選擇 5號 Bob 後 ---

查看結果：
→ 5號 Bob 的角色是【酒鬼 Drunk】
  （以為自己是：僧侶 Monk）

ℹ️ 提示：目標玩家是酒鬼，守鴉人會看到「酒鬼」

[確認]
```

---

## Processor 實作規格

### 與現有 Processor 的對比

守鴉人需要**新的 Processor 模式**，因為：
- 需要先選擇目標玩家（PlayerSelector）
- 選擇後再根據結果顯示角色資訊
- 兩步驟互動（選擇 → 確認）

### 建議實作方式

```typescript
export default function RavenkeeperProcessor({ item, onDone }: RoleProcessorProps) {
  const { result } = item;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // 未觸發時直接顯示跳過
  if (result.skip) {
    return (
      <div>
        <p>{result.skipReason}</p>
        <button onClick={onDone}>跳過</button>
      </div>
    );
  }

  // 步驟 1: 選擇目標玩家
  if (!selectedPlayer) {
    return (
      <PlayerSelector
        players={allPlayers}
        mode="single"
        onSelect={(player) => setSelectedPlayer(player)}
      />
    );
  }

  // 步驟 2: 顯示結果
  const info = result.onPlayerSelected(selectedPlayer) as RavenkeeperHandlerInfo;
  const needRoleSelection = info.isRecluse || info.isSpy || !info.reliable;

  return (
    <div>
      {/* 顯示目標玩家資訊 */}
      <p>查看結果：{selectedPlayer.seat}號 {selectedPlayer.name}</p>
      <p>角色：{info.targetPlayer.roleName}</p>

      {/* 需要角色選擇時 */}
      {needRoleSelection && (
        <RoleSelect
          roles={info.selectableRoles}
          onChange={setSelectedRole}
        />
      )}

      <button onClick={() => onDone({ role: selectedRole || info.targetPlayer.role })}>
        確認
      </button>
    </div>
  );
}
```

---

## 測試用例

### T1：標準情況（今晚死亡，能力正常）

```typescript
describe('Ravenkeeper - 標準情況', () => {
  it('今晚死亡時應該觸發能力，顯示目標玩家角色', () => {
    // Given: 第2夜，3號守鴉人今晚被殺，選擇5號玩家（Poisoner）
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: false, deathNight: 2 },
        { seat: 5, role: 'poisoner', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力（選擇5號玩家）
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(5));

    // Then: 看到 Poisoner
    expect(result.skip).toBeUndefined();
    expect(info.targetPlayer.role).toBe('poisoner');
    expect(info.reliable).toBe(true);
    expect(info.mustFollow).toBe(true);
  });
});
```

### T2：今晚未死亡

```typescript
describe('Ravenkeeper - 未死亡', () => {
  it('今晚未死亡時應該跳過', () => {
    // Given: 第2夜，守鴉人今晚未死亡
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: true, deathNight: null },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });

    // Then: 跳過
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('未死亡');
  });
});
```

### T3：中毒時被殺

```typescript
describe('Ravenkeeper - 中毒', () => {
  it('中毒時能力不可靠，可給錯誤資訊', () => {
    // Given: 第2夜，守鴉人中毒且今晚被殺
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: false, deathNight: 2, isPoisoned: true },
        { seat: 5, role: 'poisoner', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(5));

    // Then: 能力不可靠
    expect(info.reliable).toBe(false);
    expect(info.canLie).toBe(true);
  });
});
```

### T4：自己是酒鬼

```typescript
describe('Ravenkeeper - 酒鬼', () => {
  it('酒鬼守鴉人的能力無效', () => {
    // Given: 第2夜，守鴉人實際是酒鬼，今晚被殺
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'drunk', believesRole: 'ravenkeeper', isAlive: false, deathNight: 2 },
        { seat: 5, role: 'poisoner', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(5));

    // Then: 能力不可靠
    expect(info.reliable).toBe(false);
  });
});
```

### T5：選擇目標是酒鬼

```typescript
describe('Ravenkeeper - 目標是酒鬼', () => {
  it('應該顯示目標的真實角色（酒鬼）', () => {
    // Given: 第2夜，守鴉人今晚被殺，選擇5號（酒鬼，以為是僧侶）
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: false, deathNight: 2 },
        { seat: 5, role: 'drunk', believesRole: 'monk', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(5));

    // Then: 看到酒鬼
    expect(info.targetPlayer.role).toBe('drunk');
    expect(info.targetPlayer.believesRole).toBe('monk');
    expect(info.targetPlayer.isDrunk).toBe(true);
  });
});
```

### T6：選擇目標是陌客（能力正常）

```typescript
describe('Ravenkeeper - 目標是陌客', () => {
  it('能力正常時，可選擇在場邪惡角色', () => {
    // Given: 第2夜，守鴉人今晚被殺，選擇6號（Recluse，能力正常）
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: false, deathNight: 2 },
        { seat: 5, role: 'poisoner', isAlive: true },
        { seat: 6, role: 'recluse', isAlive: true },
        { seat: 7, role: 'imp', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(6));

    // Then: 可選擇邪惡角色
    expect(info.isRecluse).toBe(true);
    expect(info.selectableRoles).toContain('poisoner');
    expect(info.selectableRoles).toContain('imp');
    expect(info.canLie).toBe(true);
  });
});
```

### T7：選擇目標是間諜（能力正常）

```typescript
describe('Ravenkeeper - 目標是間諜', () => {
  it('能力正常時，可選擇在場善良角色', () => {
    // Given: 第2夜，守鴉人今晚被殺，選擇6號（Spy，能力正常）
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 3, role: 'ravenkeeper', isAlive: false, deathNight: 2 },
        { seat: 2, role: 'monk', isAlive: true },
        { seat: 4, role: 'empath', isAlive: true },
        { seat: 6, role: 'spy', isAlive: true },
      ],
    });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });
    const info = result.onPlayerSelected(gameState.players.get(6));

    // Then: 可選擇善良角色
    expect(info.isSpy).toBe(true);
    expect(info.selectableRoles).toContain('monk');
    expect(info.selectableRoles).toContain('empath');
    expect(info.canLie).toBe(true);
  });
});
```

### T8：第一夜

```typescript
describe('Ravenkeeper - 第一夜', () => {
  it('第一夜不執行', () => {
    // Given: 第1夜
    const gameState = createGameState({ night: 1 });

    // When: 處理守鴉人能力
    const result = handler.process({ gameState, player: gameState.players.get(3) });

    // Then: 跳過
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不在第一夜');
  });
});
```

---

## 實作檢查清單

### Handler 層

- [ ] 實作 `RavenkeeperHandler.ts`
  - [ ] 檢查是否為第一夜（跳過）
  - [ ] 檢查守鴉人是否今晚死亡（`deathNight === gameState.night`）
  - [ ] 返回 `select_player` action（需要 UI 互動）
  - [ ] 處理 `onPlayerSelected` 回調
  - [ ] 取得目標玩家角色資訊
  - [ ] 檢查陌客特殊情況
  - [ ] 檢查間諜特殊情況
  - [ ] 處理酒鬼情況（目標和守鴉人本人）
  - [ ] 返回可選角色列表
  - [ ] 返回適當的 NightResult

- [ ] 註冊到 `RuleEngine`
  - [ ] 添加到 handlers Map

### UI 層

- [ ] 實作 `RavenkeeperProcessor.tsx`
  - [ ] 步驟 1：PlayerSelector（選擇目標玩家）
  - [ ] 步驟 2：顯示角色結果
  - [ ] 陌客情況提供邪惡角色選擇
  - [ ] 間諜情況提供善良角色選擇
  - [ ] 能力不可靠時提供所有在場角色選擇
  - [ ] 兩步驟互動流程

- [ ] 註冊到 `ROLE_PROCESSORS`

### 測試

- [ ] Handler 測試
  - [ ] 標準情況（今晚死亡，能力正常）
  - [ ] 今晚未死亡
  - [ ] 中毒/醉酒
  - [ ] 酒鬼
  - [ ] 目標是酒鬼
  - [ ] 目標是陌客（能力正常/中毒醉酒）
  - [ ] 目標是間諜（能力正常/中毒醉酒）
  - [ ] 第一夜

---

## 注意事項

1. **死亡時機判定**：
   - 使用 `player.deathNight === gameState.night` 來判斷「今晚死亡」
   - 不需要額外的 `diedTonight` 欄位，由現有的 `deathNight` 推導即可
   - `GameState.killPlayer()` 已會在夜間設置 `player.deathNight = gameState.night`

2. **與送葬者的執行順序**：
   - 送葬者 otherNight: 40
   - 守鴉人 otherNight: 41
   - 守鴉人在送葬者之後執行

3. **一次性能力**：
   - 守鴉人死亡後能力自然結束（不需要額外追蹤「已使用」狀態）

4. **UI 互動需求**：
   - 守鴉人需要 PlayerSelector（與送葬者不同）
   - 這是**主動選擇**型能力（像占卜師），不是**被動接收**型能力（像送葬者）

5. **與間諜/陌客互動**：
   - 規則與送葬者完全相同
   - 只有目標角色的能力正常時才能偽裝
   - 中毒/醉酒的間諜/陌客只能顯示真實角色
