# Undertaker（送葬者）規格書

## 概述

送葬者是鎮民（Townsfolk）陣營的資訊型角色。每個其他夜晚（除了第一夜），送葬者會得知**今天被處決玩家的角色**。

**關鍵特性**：
- 其他夜晚能力（otherNight: 40）
- 第一夜不執行（firstNight: 0）
- 只在有玩家被處決時生效
- 提供角色資訊（不是陣營資訊）
- 受中毒/醉酒影響，能力可能失效
- 死亡後不工作（worksWhenDead: false）
- 依賴白天的處決事件

---

## 角色資料

```json
{
  "id": "undertaker",
  "name": "Undertaker",
  "name_cn": "送葬者",
  "team": "townsfolk",
  "ability": "Each night*, you learn which character died by execution today.",
  "ability_cn": "每晚，你會得知今天被處刑玩家的角色。",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 40,
  "otherNightReminder": "If a player was executed today, show that character token to the Undertaker.",
  "otherNightReminder_cn": "若今日有玩家被處刑，向送葬者提示該玩家的角色。",
  "reminders": ["Executed"],
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

**中文能力描述**：每晚，你會得知今天被處刑玩家的角色。

---

## 核心機制

### 基本邏輯流程

```
送葬者每晚流程：
├─ 步驟 1: 檢查是否為第一夜
│  └─ 是第一夜？ → 跳過（送葬者不在第一夜執行）
│
├─ 步驟 2: 檢查送葬者狀態
│  ├─ 死亡？ → 跳過（死亡後不工作）
│  ├─ 中毒？ → 資訊不可靠，說書人可給錯誤資訊
│  └─ 醉酒？ → 資訊不可靠，說書人可給錯誤資訊
│
├─ 步驟 3: 檢查今天是否有處決
│  ├─ 沒有處決？ → 跳過（顯示「今天沒有處決」）
│  └─ 有處決？ → 繼續
│
├─ 步驟 4: 取得被處決玩家的資訊
│  ├─ 被處決玩家的真實角色
│  ├─ 被處決玩家的狀態（中毒/醉酒/酒鬼）
│  └─ 被處決玩家的名字、座號
│
├─ 步驟 5: 檢查被處決玩家的特殊角色
│  ├─ 陌客（能力正常）？ → 說書人可選擇在場邪惡角色
│  ├─ 間諜（能力正常）？ → 說書人可選擇在場善良角色
│  └─ 其他角色 → 繼續正常流程
│
└─ 步驟 6: 顯示資訊
   ├─ 能力正常 + 標準角色 → 顯示真實角色
   ├─ 能力正常 + 陌客 → 說書人可選擇在場邪惡角色
   ├─ 能力正常 + 間諜 → 說書人可選擇在場善良角色
   ├─ 中毒/醉酒 → 說書人可選擇給任意在場角色
   └─ 自己是酒鬼 → 說書人可選擇給任意在場角色
```

---

## 情境處理

### 情境 1：標準情況（有處決，能力正常）

**條件**：
- 送葬者能力正常（未中毒、未醉酒、非酒鬼）
- 今天有玩家被處決
- 送葬者存活

**處理**：
1. 取得被處決玩家的真實角色
2. 顯示該角色給送葬者
3. 記錄事件

**範例**：
```
第 2 天白天：
- 5號玩家（Poisoner）被處決

第 2 夜：
送葬者（1號）獲得資訊：
→ 「5號玩家的角色是【投毒者 Poisoner】」
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 5號 Bob（投毒者 Poisoner）

[確認]
```

---

### 情境 2：陌客被處決（能力正常）

**條件**：
- 送葬者能力正常（未中毒、未醉酒、非酒鬼）
- 今天有玩家被處決
- 被處決玩家是陌客（Recluse）且能力正常（未中毒/醉酒）

**處理**：
1. 陌客能力正常時，可以被視為邪惡角色
2. 說書人可選擇在場的任一邪惡角色顯示給送葬者
3. UI 提供在場邪惡角色列表供選擇

**範例**：
```
第 2 天白天：
- 6號玩家（Recluse，能力正常）被處決

第 2 夜：
送葬者（1號）獲得資訊：
→ 說書人可選擇：
   - 顯示陌客本身「Recluse」
   - 顯示在場邪惡角色「Poisoner」
   - 顯示在場邪惡角色「Imp」
```

**UI 顯示**：
參見 UI 規格情況 2

---

### 情境 3：間諜被處決（能力正常）

**條件**：
- 送葬者能力正常（未中毒、未醉酒、非酒鬼）
- 今天有玩家被處決
- 被處決玩家是間諜（Spy）且能力正常（未中毒/醉酒）

**處理**：
1. 間諜能力正常時，可以被視為善良角色
2. 說書人可選擇在場的任一善良角色顯示給送葬者
3. UI 提供在場善良角色列表供選擇

**範例**：
```
第 2 天白天：
- 6號玩家（Spy，能力正常）被處決

第 2 夜：
送葬者（1號）獲得資訊：
→ 說書人可選擇：
   - 顯示間諜本身「Spy」
   - 顯示在場善良角色「Monk」
   - 顯示在場善良角色「Mayor」
```

**UI 顯示**：
參見 UI 規格情況 3

---

### 情境 4：沒有處決

**條件**：
- 今天沒有玩家被處決（投票未通過或平票）

**處理**：
1. 跳過送葬者行動
2. 顯示「今天沒有處決」訊息

**範例**：
```
第 2 天白天：
- 投票未通過，沒有玩家被處決

第 2 夜：
送葬者（1號）不獲得資訊
→ 跳過（今天沒有處決）
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日沒有處決，送葬者不獲得資訊。

[確認]
```

---

### 情境 5：中毒/醉酒（能力不可靠）

**條件**：
- 送葬者中毒或醉酒
- 今天有玩家被處決

**處理**：
1. 說書人可選擇給**正確**或**錯誤**的角色資訊
2. 推薦：大多數時候給正確資訊，避免暴露投毒者
3. UI 提示說書人能力不可靠

**範例**：
```
第 2 天白天：
- 5號玩家（Poisoner）被處決

第 2 夜：
送葬者（1號，中毒）獲得資訊：
→ 說書人可選擇：
   - 正確資訊：「5號是投毒者 Poisoner」（推薦）
   - 錯誤資訊：「5號是僧侶 Monk」
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：⚠️ 中毒/醉酒（能力不可靠）

⚠️ 送葬者中毒/醉酒，能力不可靠
推薦：給予正確資訊，避免暴露投毒者

今日處決：
- 5號 Bob（投毒者 Poisoner）← 真實角色

選擇顯示角色：
[下拉選單: 所有角色，預設選擇真實角色]

[確認]
```

---

### 情境 6：自己是酒鬼

**條件**：
- 送葬者實際上是酒鬼（believesRole = 'undertaker', role = 'drunk'）
- 今天有玩家被處決

**處理**：
1. 說書人可選擇給**任意**角色資訊
2. 推薦：給與真相完全無關的角色，增加混淆
3. UI 明確標示為酒鬼

**範例**：
```
第 2 天白天：
- 5號玩家（Poisoner）被處決

第 2 夜：
送葬者（1號，實際是酒鬼）獲得資訊：
→ 說書人可選擇任意角色：
   - 可以給真實角色「Poisoner」
   - 也可以給完全不同的角色「Mayor」
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：🍺 實際上是酒鬼（無能力）

⚠️ 此玩家實際上是酒鬼，能力無效
推薦：給予與真相無關的角色，增加混淆

今日處決：
- 5號 Bob（投毒者 Poisoner）← 真實角色

選擇顯示角色：
[下拉選單: 所有角色，不預選]

[確認]
```

---

### 情境 7：被處決玩家是酒鬼

**條件**：
- 送葬者能力正常
- 被處決玩家實際上是酒鬼（believesRole ≠ role）

**處理**：
1. 能力正常時，送葬者看到的是被處決玩家的**真實角色**（酒鬼 Drunk）
2. 能力不可靠時，說書人可選擇給 believesRole 或 Drunk

**範例**：
```
第 2 天白天：
- 5號玩家被處決
  - believesRole: 'monk'（以為自己是僧侶）
  - role: 'drunk'（實際是酒鬼）

第 2 夜：
送葬者（1號，能力正常）獲得資訊：
→ 「5號玩家的角色是【酒鬼 Drunk】」（真實角色）
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 5號 Bob
  - 真實角色：酒鬼 Drunk
  - 以為自己是：僧侶 Monk

ℹ️ 提示：被處決玩家是酒鬼，送葬者會看到「酒鬼」

[確認]
```

---

### 情境 8：送葬者死亡

**條件**：
- 送葬者已死亡（isAlive = false）

**處理**：
1. 跳過送葬者行動
2. 顯示「送葬者已死亡，能力失效」

**範例**：
```
第 2 天白天：
- 1號玩家（Undertaker）被處決

第 2 夜：
送葬者已死亡 → 跳過
```

**UI 顯示**：
```
送葬者（1號 Alice）
能力狀態：💀 已死亡

送葬者死亡後不工作。

[跳過]
```

---

## 特殊規則

### 1. 處決判定

**何時算作「被處決」**：
- 白天投票結果，某玩家得票數最多且達到處決要求
- 該玩家被正式宣布處決

**不算作處決的情況**：
- 投票未通過（沒有人得票過半）
- 平票（多人得票數相同）
- 特殊能力取消處決（如僧侶保護）

### 2. 多次處決

**同一天多次處決**（罕見情況）：
- 送葬者只看到**最後一次被處決**的玩家角色
- UI 應顯示所有處決，但明確標示「送葬者看到最後一次」

### 3. 與間諜的互動

**被處決玩家是間諜（能力正常）**：
- 送葬者能力正常 + 間諜能力正常 → 說書人可選擇：
  - 顯示「間諜 Spy」本身
  - 顯示任一在場善良角色（鎮民/外來者）
- 送葬者中毒/醉酒 → 說書人可給任意在場角色
- 間諜中毒/醉酒 → 只能顯示「間諜 Spy」（失去偽裝能力）

**間諜特殊規則**：
- 間諜能力正常時，可以被視為善良角色
- UI 提供在場善良角色列表供選擇
- 說書人可自由決定是否使用間諜的偽裝能力

### 4. 與陌客的互動

**被處決玩家是陌客（能力正常）**：
- 送葬者能力正常 + 陌客能力正常 → 說書人可選擇：
  - 顯示「陌客 Recluse」本身
  - 顯示任一在場邪惡角色（爪牙/惡魔）
- 送葬者中毒/醉酒 → 說書人可給任意在場角色
- 陌客中毒/醉酒 → 只能顯示「陌客 Recluse」（失去偽裝能力）

**陌客特殊規則**：
- 陌客能力正常時，可以被視為邪惡角色
- UI 提供在場邪惡角色列表供選擇
- 說書人可自由決定是否使用陌客的偽裝能力

### 5. 時機順序

**夜晚順序**（otherNight: 40）：
- 送葬者在大多數夜間能力**之後**執行
- 確保處決事件已經完全結算

---

## Handler 實作規格

### WasherwomanHandler 對應

送葬者的 Handler 類似於洗衣婦，但有以下差異：
- **觸發時機**：其他夜晚（而非第一夜）
- **資訊來源**：白天處決事件（而非遊戲初始狀態）
- **條件判斷**：需檢查今天是否有處決

### 實作要點

```typescript
export class UndertakerHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 步驟 1: 只在其他夜晚執行（非第一夜）
    if (gameState.night === 1) {
      return { skip: true, skipReason: '送葬者不在第一夜行動' };
    }

    // 步驟 2: 檢查送葬者是否存活
    if (!this.player.isAlive) {
      return { skip: true, skipReason: '送葬者已死亡，能力失效' };
    }

    // 步驟 3: 檢查今天是否有處決
    const executedPlayer = gameState.getExecutedPlayerToday();
    if (!executedPlayer) {
      return {
        skip: true,
        skipReason: '今天沒有處決',
        display: '今天沒有處決，送葬者不獲得資訊',
      };
    }

    // 步驟 4: 取得被處決玩家的真實角色
    const executedRole = executedPlayer.role;
    const executedRoleName = this.roleRegistry.getRoleName(executedRole);

    // 步驟 5: 檢查陌客/間諜特殊情況
    const isRecluse = executedRole === 'recluse' && !executedPlayer.isPoisoned && !executedPlayer.isDrunk;
    const isSpy = executedRole === 'spy' && !executedPlayer.isPoisoned && !executedPlayer.isDrunk;

    // 取得可選角色列表
    let selectableRoles: string[] = [];
    if (this.infoReliable) {
      if (isRecluse) {
        // 陌客：可選擇在場邪惡角色
        selectableRoles = Array.from(gameState.players.values())
          .filter(p => p.isAlive && (p.team === 'minion' || p.team === 'demon'))
          .map(p => p.role);
      } else if (isSpy) {
        // 間諜：可選擇在場善良角色
        selectableRoles = Array.from(gameState.players.values())
          .filter(p => p.isAlive && (p.team === 'townsfolk' || p.team === 'outsider'))
          .map(p => p.role);
      }
    } else {
      // 能力不可靠：可選擇所有在場角色
      selectableRoles = Array.from(gameState.players.values())
        .filter(p => p.isAlive)
        .map(p => p.role);
    }

    // 步驟 6: 返回資訊
    return {
      action: 'show_info',
      display: `送葬者資訊：${executedPlayer.seat}號 ${executedPlayer.name}（${executedRoleName}）被處決`,
      info: {
        executedPlayer: {
          seat: executedPlayer.seat,
          name: executedPlayer.name,
          role: executedRole,
          roleName: executedRoleName,
          believesRole: executedPlayer.believesRole,
          isDrunk: executedPlayer.role === 'drunk',
          isPoisoned: executedPlayer.isPoisoned,
        },
        isRecluse,        // 是否為能力正常的陌客
        isSpy,            // 是否為能力正常的間諜
        selectableRoles,  // 可選擇的角色列表
        reliable: this.infoReliable,
        statusReason: this.statusReason,
      },
      mustFollow: this.infoReliable && !isRecluse && !isSpy, // 標準情況下必須給真實角色
      canLie: !this.infoReliable || isRecluse || isSpy,      // 不可靠或特殊角色時可給假資訊
    };
  }
}
```

### Handler Info 型別

```typescript
export interface UndertakerHandlerInfo {
  executedPlayer: {
    seat: number;
    name: string;
    role: string;           // 真實角色
    roleName: string;
    believesRole?: string;  // 以為自己是（酒鬼情況）
    isDrunk: boolean;       // 是否為酒鬼
    isPoisoned: boolean;    // 是否中毒
  };
  isRecluse: boolean;       // 是否為能力正常的陌客
  isSpy: boolean;           // 是否為能力正常的間諜
  selectableRoles: string[]; // 可選擇的角色列表（陌客/間諜/不可靠時）
  reliable: boolean;
  statusReason: string;
}
```

---

## UI 規格

### UI 流程

#### 1. 標準情況（白天有處決，能力正常）

```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 5號 Bob（投毒者 Poisoner）

[確認]
```

#### 2. 特殊情況（未中毒/醉酒陌客白天被處決，能力正常）

```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 6號 Kevin（陌客 recluse，能力正常）

選擇顯示角色：
[下拉選單: 所有在場邪惡角色名單，隨機選擇]

ℹ️ 提示：
- 陌客，可以被認定為邪惡角色

[確認]
```

#### 3. 特殊情況（未中毒/醉酒間諜白天被處決，能力正常）

```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 6號 Lee（間諜 spy，能力正常）

選擇顯示角色：
[下拉選單: 所有在場善良角色名單，隨機選擇]

ℹ️ 提示：
- 間諜，可以被認定為善良角色

[確認]
```

#### 4. 沒有處決

```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日沒有處決，送葬者不獲得資訊。

[確認]
```

#### 5. 中毒/醉酒（能力不可靠）

```
送葬者（1號 Alice）
能力狀態：⚠️ 中毒/醉酒（能力不可靠）

⚠️ 送葬者中毒/醉酒，能力不可靠
推薦：給予在場但錯誤的角色，避免暴露投毒者

今日處決：
- 5號 Bob（投毒者 Poisoner）← 真實角色

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

ℹ️ 提示：
- 能力不可靠，說書人可選擇給錯誤資訊

[確認]
```

#### 6. 自己是酒鬼

```
送葬者（1號 Alice）
能力狀態：🍺 實際上是酒鬼（無能力）

⚠️ 此玩家實際上是酒鬼，能力無效
推薦：給予在場但錯誤的角色，增加混淆

今日處決：
- 5號 Bob（投毒者 Poisoner）← 真實角色

選擇顯示角色：
[下拉選單: 所有在場角色，不預選]

[確認]
```

#### 5. 被處決玩家是酒鬼

```
送葬者（1號 Alice）
能力狀態：✅ 正常

今日處決：
- 5號 Bob
  - 真實角色：酒鬼 Drunk
  - 以為自己是：僧侶 Monk

ℹ️ 提示：被處決玩家是酒鬼，送葬者會看到「酒鬼」

[確認]
```

---

## Processor 實作規格

### 與 TwoPlayerInfoProcessor 的差異

送葬者的 UI **不適合**使用 TwoPlayerInfoProcessor，因為：
- 不需要選擇兩名玩家
- 不需要選擇角色（已經由處決事件決定）
- UI 結構更簡單：只顯示資訊 + 確認

### 建議實作方式

創建 **單獨的 UndertakerProcessor**，UI 結構：
1. 顯示能力狀態
2. 顯示今日處決資訊（或「沒有處決」）
3. 根據情況提供角色選擇：
   - **陌客被處決（能力正常）**：邪惡角色下拉選單
   - **間諜被處決（能力正常）**：善良角色下拉選單
   - **能力不可靠**：所有在場角色下拉選單
   - **標準情況**：無需選擇，直接確認
4. 確認按鈕

```typescript
export default function UndertakerProcessor({ item, onDone }: RoleProcessorProps) {
  const { result } = item;
  const info = result.info as UndertakerHandlerInfo;

  // 判斷是否需要角色選擇
  const needRoleSelection = info.isRecluse || info.isSpy || !info.reliable;

  // 取得角色選項
  const roleOptions = needRoleSelection
    ? info.selectableRoles.map(roleId => ({
        value: roleId,
        label: roleRegistry.getRoleName(roleId),
      }))
    : [];

  // 顯示提示訊息
  const hint = info.isRecluse
    ? '陌客，可以被認定為邪惡角色'
    : info.isSpy
    ? '間諜，可以被認定為善良角色'
    : !info.reliable
    ? '能力不可靠，說書人可選擇給錯誤資訊'
    : '';

  return (
    // UI 實作
  );
}
```

---

## 測試用例

### T1：標準情況（有處決，能力正常）

```typescript
describe('Undertaker - 標準情況', () => {
  it('應該顯示被處決玩家的真實角色', () => {
    // Given: 第2夜，5號玩家（Poisoner）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 5, role: 'poisoner', isAlive: false },
      ],
      executedToday: 5,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 送葬者看到 Poisoner
    expect(result.info.executedPlayer.role).toBe('poisoner');
    expect(result.info.reliable).toBe(true);
    expect(result.mustFollow).toBe(true);
  });
});
```

### T2：沒有處決

```typescript
describe('Undertaker - 沒有處決', () => {
  it('應該跳過送葬者行動', () => {
    // Given: 第2夜，今天沒有處決
    const gameState = createGameState({
      night: 2,
      executedToday: null,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 跳過
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('沒有處決');
  });
});
```

### T3：中毒/醉酒

```typescript
describe('Undertaker - 中毒', () => {
  it('能力不可靠時，說書人可給錯誤資訊', () => {
    // Given: 第2夜，送葬者中毒，5號玩家被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true, isPoisoned: true },
        { seat: 5, role: 'poisoner', isAlive: false },
      ],
      executedToday: 5,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 能力不可靠
    expect(result.info.reliable).toBe(false);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });
});
```

### T4：自己是酒鬼

```typescript
describe('Undertaker - 酒鬼', () => {
  it('酒鬼送葬者的能力無效', () => {
    // Given: 第2夜，送葬者實際是酒鬼
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'drunk', believesRole: 'undertaker', isAlive: true },
        { seat: 5, role: 'poisoner', isAlive: false },
      ],
      executedToday: 5,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 能力不可靠
    expect(result.info.reliable).toBe(false);
  });
});
```

### T5：被處決玩家是酒鬼

```typescript
describe('Undertaker - 被處決玩家是酒鬼', () => {
  it('應該顯示被處決玩家的真實角色（酒鬼）', () => {
    // Given: 第2夜，5號玩家（酒鬼，以為是僧侶）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 5, role: 'drunk', believesRole: 'monk', isAlive: false },
      ],
      executedToday: 5,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 看到酒鬼
    expect(result.info.executedPlayer.role).toBe('drunk');
    expect(result.info.executedPlayer.believesRole).toBe('monk');
    expect(result.info.executedPlayer.isDrunk).toBe(true);
  });
});
```

### T6：陌客被處決（能力正常）

```typescript
describe('Undertaker - 陌客被處決', () => {
  it('能力正常時，可選擇在場邪惡角色', () => {
    // Given: 第2夜，6號玩家（Recluse，能力正常）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 5, role: 'poisoner', isAlive: true },
        { seat: 6, role: 'recluse', isAlive: false, isPoisoned: false, isDrunk: false },
        { seat: 7, role: 'imp', isAlive: true },
      ],
      executedToday: 6,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 可選擇邪惡角色
    expect(result.info.isRecluse).toBe(true);
    expect(result.info.selectableRoles).toContain('poisoner');
    expect(result.info.selectableRoles).toContain('imp');
    expect(result.info.reliable).toBe(true);
    expect(result.canLie).toBe(true); // 可以選擇給邪惡角色
  });

  it('陌客中毒/醉酒時，不能偽裝', () => {
    // Given: 第2夜，6號玩家（Recluse，中毒）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 6, role: 'recluse', isAlive: false, isPoisoned: true },
      ],
      executedToday: 6,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 只能顯示陌客本身
    expect(result.info.isRecluse).toBe(false);
    expect(result.info.executedPlayer.role).toBe('recluse');
  });
});
```

### T7：間諜被處決（能力正常）

```typescript
describe('Undertaker - 間諜被處決', () => {
  it('能力正常時，可選擇在場善良角色', () => {
    // Given: 第2夜，6號玩家（Spy，能力正常）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 2, role: 'monk', isAlive: true },
        { seat: 3, role: 'butler', isAlive: true },
        { seat: 6, role: 'spy', isAlive: false, isPoisoned: false, isDrunk: false },
      ],
      executedToday: 6,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 可選擇善良角色
    expect(result.info.isSpy).toBe(true);
    expect(result.info.selectableRoles).toContain('monk');
    expect(result.info.selectableRoles).toContain('butler');
    expect(result.info.reliable).toBe(true);
    expect(result.canLie).toBe(true); // 可以選擇給善良角色
  });

  it('間諜中毒/醉酒時，不能偽裝', () => {
    // Given: 第2夜，6號玩家（Spy，醉酒）被處決
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: true },
        { seat: 6, role: 'spy', isAlive: false, isDrunk: true },
      ],
      executedToday: 6,
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 只能顯示間諜本身
    expect(result.info.isSpy).toBe(false);
    expect(result.info.executedPlayer.role).toBe('spy');
  });
});
```

### T8：第一夜

```typescript
describe('Undertaker - 第一夜', () => {
  it('第一夜不執行', () => {
    // Given: 第1夜
    const gameState = createGameState({ night: 1 });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 跳過
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不在第一夜');
  });
});
```

### T9：送葬者死亡

```typescript
describe('Undertaker - 死亡', () => {
  it('死亡後不工作', () => {
    // Given: 第2夜，送葬者已死亡
    const gameState = createGameState({
      night: 2,
      players: [
        { seat: 1, role: 'undertaker', isAlive: false },
      ],
    });

    // When: 處理送葬者能力
    const result = handler.process({ gameState, player: gameState.players.get(1) });

    // Then: 跳過
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('死亡');
  });
});
```

---

## 實作檢查清單

### Handler 層

- [ ] 實作 `UndertakerHandler.ts`
  - [ ] 檢查是否為第一夜（跳過）
  - [ ] 檢查送葬者是否存活
  - [ ] 檢查今天是否有處決
  - [ ] 取得被處決玩家資訊
  - [ ] 檢查陌客特殊情況（能力正常時可選邪惡角色）
  - [ ] 檢查間諜特殊情況（能力正常時可選善良角色）
  - [ ] 處理酒鬼情況（被處決玩家和送葬者本人）
  - [ ] 返回可選角色列表（陌客/間諜/不可靠時）
  - [ ] 返回適當的 NightResult

- [ ] 註冊到 `RuleEngine`
  - [ ] 添加到 handlers Map

### UI 層

- [ ] 實作 `UndertakerProcessor.tsx`
  - [ ] 顯示能力狀態（正常/中毒/醉酒/酒鬼）
  - [ ] 顯示今日處決資訊或「沒有處決」
  - [ ] 陌客被處決時提供邪惡角色選擇
  - [ ] 間諜被處決時提供善良角色選擇
  - [ ] 能力不可靠時提供所有在場角色選擇
  - [ ] 實作確認邏輯

- [ ] 註冊到 `ROLE_PROCESSORS`
  - [ ] 添加到 index.ts

### 型別定義

- [ ] 定義 `UndertakerHandlerInfo` 介面
  - [ ] executedPlayer 資訊
  - [ ] isRecluse 標記
  - [ ] isSpy 標記
  - [ ] selectableRoles 列表
  - [ ] reliable 狀態
  - [ ] statusReason

### 測試

- [ ] 實作 Handler 測試
  - [ ] 標準情況測試
  - [ ] 沒有處決測試
  - [ ] 中毒/醉酒測試
  - [ ] 酒鬼測試
  - [ ] 被處決玩家是酒鬼測試
  - [ ] 陌客被處決測試（能力正常/中毒醉酒）
  - [ ] 間諜被處決測試（能力正常/中毒醉酒）
  - [ ] 第一夜測試
  - [ ] 死亡測試

- [ ] UI 整合測試
  - [ ] 資訊顯示正確
  - [ ] 能力狀態正確
  - [ ] 陌客情況角色選擇（邪惡角色列表）
  - [ ] 間諜情況角色選擇（善良角色列表）
  - [ ] 能力不可靠時角色選擇（所有在場角色）

### GameState 擴充

- [ ] 添加處決追蹤功能
  - [ ] `getExecutedPlayerToday()` 方法
  - [ ] 每天重置處決記錄
  - [ ] 記錄被處決玩家座號

---

## 注意事項

1. **處決追蹤**：
   - GameState 需要追蹤每天的處決事件
   - 每個新的白天開始時重置

2. **UI 簡化**：
   - 送葬者不需要複雜的選擇邏輯
   - 只需要顯示資訊 + 確認（或選擇角色）

3. **能力不可靠處理**：
   - 中毒/醉酒：推薦給正確資訊
   - 酒鬼：推薦給錯誤資訊

4. **酒鬼雙重情況**：
   - 送葬者是酒鬼：能力無效，可給任意資訊
   - 被處決玩家是酒鬼：顯示「Drunk」而非 believesRole

5. **死亡處理**：
   - 送葬者死亡後立即失效
   - 不像某些角色可以死後工作

6. **與間諜/陌客互動**：
   - **陌客被處決（能力正常）**：
     - 說書人可選擇顯示在場邪惡角色
     - UI 提供邪惡角色列表供選擇
     - 陌客中毒/醉酒時失去偽裝能力，只能顯示「Recluse」
   - **間諜被處決（能力正常）**：
     - 說書人可選擇顯示在場善良角色
     - UI 提供善良角色列表供選擇
     - 間諜中毒/醉酒時失去偽裝能力，只能顯示「Spy」
   - **重要**：只有當陌客/間諜**能力正常**時才能偽裝
   - 這與圖書管理員/調查員不同：送葬者看到的是**已處決**的角色
