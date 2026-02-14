# Investigator 調查員規格文件

## 概述

調查員是鎮民（Townsfolk）陣營的第一夜資訊型角色。在遊戲開始時，調查員會得知兩位玩家，其中一位是特定的爪牙角色。

---

## 角色資料

```json
{
  "id": "investigator",
  "name": "Investigator",
  "name_cn": "調查員",
  "team": "townsfolk",
  "ability": "You start knowing that 1 of 2 players is a particular Minion.",
  "firstNight": 25,
  "firstNightReminder": "Show the character token of a Minion in play. Point to two players, one of which is that character.",
  "otherNight": 0,
  "affectedByPoison": true,
  "affectedByDrunk": true
}
```

**中文能力描述**：你在遊戲開始時得知兩位玩家，其中一位是特定的爪牙角色。

---

## 核心機制

### 第一夜資訊生成

**輸入**：
- 當前遊戲狀態（所有玩家資料）
- 調查員玩家

**輸出**：`NightResult`
```typescript
{
  action: 'show_info',
  display: '展示角色標記：投毒者\n指向兩位玩家：\n  • 2號 小紅\n  • 5號 小華\n\n其中一位是投毒者',
  info: {
    minionRole: 'poisoner',      // 展示的爪牙角色
    minionRoleName: '投毒者',     // 角色中文名
    actualMinionSeat: 2,          // 實際爪牙的座位
    decoyPlayerSeat: 5,           // 誤導玩家的座位
    reliable: true                // 資訊是否可靠
  },
  gesture: 'none',
  mustFollow: false,              // 中毒/醉酒時說書人可自行決定
  canLie: true                    // 說書人可給不同答案
}
```

---

## 處理流程

### 正常狀態

```
1. 獲取所有存活的爪牙玩家
   ├─ 若無爪牙 → 返回錯誤或特殊處理
   └─ 有爪牙 → 繼續
   ↓
2. 隨機選擇一位爪牙（作為展示目標）
   ↓
3. 選擇誤導玩家（decoy）
   ├─ 從非該爪牙的其他玩家中隨機選擇
   └─ 不可選擇調查員自己
   ↓
4. 隨機決定指向順序
   ├─ 50% 機率：先指向爪牙，後指向誤導
   └─ 50% 機率：先指向誤導，後指向爪牙
   ↓
5. 生成結果訊息
```

### 中毒/醉酒狀態

- Handler 仍回傳實際偵測結果
- `infoReliable = false`
- UI 層根據 `item.isPoisoned / item.isDrunk` 提示說書人
- 說書人可自行決定給予正確或錯誤資訊

---

## 特殊角色互動

### Recluse 陌客

**官方規則**：陌客可能登記為爪牙，調查員可能會看到陌客。

**實作**：
- 陌客算作「可疑目標」，說書人可選擇展示陌客
- 若選擇展示陌客，陌客視為「爪牙」角色之一
- UI 預選邏輯：若有陌客，預設選擇「真爪牙 + 陌客」

**範例**：
```typescript
// 場上有投毒者和陌客
{
  suggestedMinionRole: 'poisoner',    // 預選投毒者
  suggestedPlayer1: 2,                // 預選投毒者玩家
  suggestedPlayer2: 5,                // 預選陌客玩家
  showRecluseOption: true             // 告知說書人可選陌客
}
```

### Spy 間諜

**官方規則**：
- 間諜是爪牙，調查員正常可以看到間諜
- **特殊情況**：若場上**只有**間諜（無其他爪牙），告知「場上無任何爪牙角色」

**實作**：
```typescript
// 只有間諜的情況
if (minions.length === 1 && minions[0].role === 'spy') {
  return {
    action: 'show_info',
    display: '場上只有間諜，告知調查員：場上無任何爪牙角色',
    info: {
      onlySpyInGame: true,
      noMinionToShow: true
    },
    mustFollow: true,  // 必須遵守（間諜特殊規則）
    canLie: false
  };
}
```

**UI 行為**：
- 若只有間諜，**不顯示**角色選擇和玩家選擇介面
- 直接顯示「場上無任何爪牙角色」

### 無爪牙情況

**場景**：非標準設置，沒有爪牙角色（含間諜）

**處理方式**：
```typescript
{
  action: 'show_info',
  display: '場上無爪牙角色，調查員無法獲得資訊',
  info: {
    noMinionInGame: true
  },
  needInput: true  // 說書人需手動選擇給予什麼資訊
}
```

### 酒鬼以為自己是調查員

**處理方式**：
- 使用 `InvestigatorHandler` 處理
- 執行完整流程（UI 選擇、生成結果）
- RuleEngine 步驟 7 標記 `effectNullified: true`
- UI 顯示酒鬼警告，說書人可給予任意假資訊

### 能力失效（中毒/醉酒）的特殊互動

#### Spy 間諜中毒/醉酒

**規則**：
- 間諜即使中毒或醉酒，仍然是爪牙陣營
- **特殊情況**：「只有間諜」的特殊規則僅在間諜能力正常時生效
  - 間諜能力正常 → 告知「場上無爪牙」（間諜特殊規則）
  - 間諜中毒/醉酒 → 能力失效，正常顯示間諜（不適用特殊規則）

**實作**：
```typescript
// 只有間諜的情況，需檢查間諜是否中毒/醉酒
if (minions.length === 1 && minions[0].role === 'spy' &&
    !minions[0].isPoisoned && !minions[0].isDrunk) {
  return {
    action: 'show_info',
    display: '場上只有間諜，告知調查員：場上無任何爪牙角色',
    info: { onlySpyInGame: true, noMinionToShow: true },
    mustFollow: true,
    canLie: false
  };
}
```

**範例場景**：
- 場上只有間諜，且間諜**未**中毒/醉酒 → 告知「無爪牙」
- 場上只有間諜，但間諜**已**中毒/醉酒 → 正常顯示間諜選項

#### Recluse 陌客中毒/醉酒

**規則**：
- 陌客的「可能登記為爪牙」能力在中毒/醉酒時失效
- 中毒/醉酒的陌客**不應**被視為可疑目標

**實作**：
```typescript
// 檢查陌客時需同時檢查能力是否有效
const hasRecluse = allPlayers.some(p =>
  p.role === 'recluse' && p.isAlive && !p.isPoisoned && !p.isDrunk
);
```

**範例場景**：
- 陌客能力正常 → 可作為調查員的候選目標，UI 預選陌客
- 陌客中毒/醉酒 → 不應出現在候選名單中

---

## Handler 實作規格

### 檔案位置
`src/engine/handlers/InvestigatorHandler.ts`

### 介面
```typescript
export class InvestigatorHandler implements RoleHandler {
  process(context: HandlerContext): NightResult;
}
```

### 實作要點

1. **Handler 不負責 invalidation 檢查**
   - 只寫純能力邏輯（happy path）
   - 不檢查中毒/醉酒/酒鬼
   - RuleEngine 統一後處理

2. **資訊型 Handler 回傳實際結果**
   - 不根據 `infoReliable` 調整偵測結果
   - `mustFollow = false`（說書人可自行決定）
   - `canLie = true`（說書人可給不同答案）

3. **隨機性要求**
   - 爪牙選擇：隨機
   - 誤導玩家選擇：隨機
   - 指向順序：隨機（50/50）

### 演算法

```typescript
process(context: HandlerContext): NightResult {
  const { player, gameState, infoReliable, statusReason } = context;

  // 1. 獲取所有存活爪牙
  const minions = gameState.players
    .filter(p => p.team === 'minion' && p.isAlive);

  // 2. 若無爪牙，返回特殊處理（見「情況 1」）
  if (minions.length === 0) {
    return this.handleNoMinion(gameState);
  }

  // 3. 隨機選擇一位爪牙
  const selectedMinion = minions[Math.floor(Math.random() * minions.length)];

  // 4. 選擇誤導玩家
  const otherPlayers = gameState.players.filter(
    p => p.seat !== selectedMinion.seat &&
         p.seat !== player.seat &&
         p.isAlive
  );

  if (otherPlayers.length === 0) {
    // 極端情況：只有調查員和爪牙
    return this.handleOnlyMinionAndInvestigator(selectedMinion);
  }

  const decoyPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

  // 5. 隨機決定指向順序
  const showMinionFirst = Math.random() < 0.5;
  const player1 = showMinionFirst ? selectedMinion : decoyPlayer;
  const player2 = showMinionFirst ? decoyPlayer : selectedMinion;

  // 6. 生成結果
  return {
    action: 'show_info',
    display: `展示角色標記：${selectedMinion.roleName}\n` +
             `指向兩位玩家：\n` +
             `  • ${player1.seat}號 ${player1.name}\n` +
             `  • ${player2.seat}號 ${player2.name}\n\n` +
             `其中一位是${selectedMinion.roleName}`,
    info: {
      minionRole: selectedMinion.role,
      minionRoleName: selectedMinion.roleName,
      actualMinionSeat: selectedMinion.seat,
      decoyPlayerSeat: decoyPlayer.seat,
      reliable: infoReliable,
      statusReason
    },
    gesture: 'none',
    mustFollow: false,
    canLie: true
  };
}
```

---

## UI 需求（詳細規格）

### UI 狀態判定

調查員 UI 根據以下條件決定行為：

**判定條件**：
1. `isReliable` = `!item.isPoisoned && !item.isDrunk && player.role !== 'drunk'`
2. `hasRecluse` = 場上存在陌客角色
3. `onlySpyExists` = 只有間諜，無其他爪牙

### UI 流程圖

```
開始
  ↓
是否只有間諜？
  ├─ 是 → 顯示「場上無任何爪牙角色」→ 確認 → 結束
  └─ 否 → 繼續
  ↓
是否可靠（isReliable）？
  ├─ 是（正常狀態）
  │   ├─ 有陌客 → 預選爪牙角色 + 預選（爪牙玩家 + 陌客玩家）
  │   └─ 無陌客 → 預選爪牙角色 + 預選（爪牙玩家 + 誤導玩家）
  │
  └─ 否（中毒/醉酒/酒鬼）
      └─ 顯示警告 → 不預選角色 + 不預選玩家
  ↓
確認 → 記錄結果 → 結束
```

### UI 組件規格

```typescript
// src/components/roleProcessors/InvestigatorProcessor.tsx

interface InvestigatorProcessorProps {
  item: NightOrderItem;
  onDone: () => void;
}

export function InvestigatorProcessor({ item, onDone }: InvestigatorProcessorProps) {
  const { processAbility, stateManager } = useGameStore();
  const { isDrunkRole } = useDrunkPlayerInfo(item);

  // 狀態判定
  const isReliable = !item.isPoisoned && !item.isDrunk && !isDrunkRole;
  const players = stateManager.getAlivePlayers();
  const minions = players.filter(p => p.team === 'minion');
  const onlySpyExists = minions.length === 1 && minions[0].role === 'spy';
  const hasRecluse = players.some(p => p.role === 'recluse');

  // UI 狀態
  const [selectedMinionRole, setSelectedMinionRole] = useState<string>('');
  const [selectedPlayer1, setSelectedPlayer1] = useState<number | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<number | null>(null);

  // 初始化預選
  useEffect(() => {
    if (!result?.info || typeof result.info !== 'object') return;
    const info = result.info as Record<string, unknown>;

    // 只有間諜或無爪牙：不預選
    if (info.onlySpyInGame || info.noMinionInGame) return;

    const minions = (info.minions as Array<{ seat: number; role: string; name: string }>) || [];
    const hasRecluse = info.hasRecluse as boolean;
    const recluseSeat = info.recluseSeat as number | null;

    // 不可靠時清除預選
    if (!isReliable) {
      setSelectedMinionRole('');
      setSelectedPlayer1(null);
      setSelectedPlayer2(null);
      return;
    }

    // 可靠時預選
    if (minions.length > 0) {
      const firstMinion = minions[0];
      setSelectedMinionRole(firstMinion.role);

      const allPlayers = stateManager.getAlivePlayers();

      if (hasRecluse && recluseSeat !== null) {
        // 有陌客：預選爪牙玩家 + 陌客玩家
        setSelectedPlayer1(firstMinion.seat);
        setSelectedPlayer2(recluseSeat);
      } else {
        // 無陌客：預選爪牙玩家 + 外來者/善良玩家
        const decoyPlayer = allPlayers.find(
          p => p.seat !== firstMinion.seat &&
               p.seat !== item.seat &&
               (p.team === 'outsider' || p.team === 'townsfolk')
        );
        if (decoyPlayer) {
          setSelectedPlayer1(firstMinion.seat);
          setSelectedPlayer2(decoyPlayer.seat);
        }
      }
    }
  }, [result, isReliable, stateManager, item.seat]);

  const handleConfirm = () => {
    // 記錄選擇結果
    stateManager.logEvent({
      type: 'ability_use',
      description: `調查員資訊：展示${selectedMinionRole}，指向${selectedPlayer1}號和${selectedPlayer2}號`,
      details: {
        minionRole: selectedMinionRole,
        player1: selectedPlayer1,
        player2: selectedPlayer2,
      },
    });
    onDone();
  };

  // 只有間諜的情況
  if (onlySpyExists) {
    return (
      <div className="investigator-processor">
        <h3>調查員 — {item.seat}號</h3>
        <div className="info-box">
          場上只有間諜，告知調查員：<strong>場上無任何爪牙角色</strong>
        </div>
        <button onClick={onDone}>確認</button>
      </div>
    );
  }

  return (
    <div className="investigator-processor">
      <h3>調查員 — {item.seat}號</h3>

      {/* 狀態警告 */}
      {!isReliable && (
        <div className="warning-box">
          ⚠️
          {item.isPoisoned && '玩家中毒'}
          {item.isDrunk && '玩家醉酒'}
          {isDrunkRole && '玩家是酒鬼'}
          ，說書人可給予任意資訊
        </div>
      )}

      {/* 選擇爪牙角色 */}
      <div className="role-selection">
        <label>選擇展示的爪牙角色：</label>
        <select
          value={selectedMinionRole || ''}
          onChange={(e) => setSelectedMinionRole(e.target.value)}
        >
          <option value="">-- 請選擇 --</option>
          <option value="poisoner">投毒者</option>
          <option value="spy">間諜</option>
          <option value="baron">男爵</option>
          <option value="scarlet_woman">猩紅女郎</option>
        </select>
      </div>

      {/* 選擇第一位玩家 */}
      <div className="player-selection">
        <label>選擇第一位玩家：</label>
        <select
          value={selectedPlayer1 ?? ''}
          onChange={(e) => setSelectedPlayer1(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat)
            .map(p => {
              const rd = stateManager.getRoleData(p.role);
              return (
                <option key={p.seat} value={p.seat}>
                  {p.seat}號 {p.name} ({rd?.name_cn || p.role})
                </option>
              );
            })}
        </select>
      </div>

      {/* 選擇第二位玩家 */}
      <div className="player-selection">
        <label>選擇第二位玩家：</label>
        <select
          value={selectedPlayer2 ?? ''}
          onChange={(e) => setSelectedPlayer2(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- 請選擇 --</option>
          {stateManager.getAlivePlayers()
            .filter(p => p.seat !== item.seat && p.seat !== selectedPlayer1)
            .map(p => {
              const rd = stateManager.getRoleData(p.role);
              return (
                <option key={p.seat} value={p.seat}>
                  {p.seat}號 {p.name} ({rd?.name_cn || p.role})
                </option>
              );
            })}
        </select>
        {hasRecluse && isReliable && (
          <div className="hint">
            💡 場上有陌客，建議選擇爪牙玩家和陌客玩家
          </div>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selectedMinionRole || selectedPlayer1 === null || selectedPlayer2 === null}
      >
        確認
      </button>
    </div>
  );
}
```

### UI 行為總結

| 情況 | 角色選擇 | 玩家選擇 | 說明 |
|------|---------|---------|------|
| **只有間諜** | 不顯示 | 不顯示 | 告知「無爪牙」 |
| **正常 + 有陌客** | 預選在場爪牙 | 預選爪牙+陌客 | 建議選陌客 |
| **正常 + 無陌客** | 預選在場爪牙 | 預選爪牙+誤導 | 標準流程 |
| **中毒/醉酒/酒鬼** | 不預選 | 不預選 | 顯示警告 |

---

## 測試用例

### T1：正常情況
```typescript
// 設定
const players = [
  { seat: 1, role: 'investigator', team: 'townsfolk', isAlive: true },
  { seat: 2, role: 'poisoner', team: 'minion', isAlive: true },
  { seat: 3, role: 'fortuneteller', team: 'townsfolk', isAlive: true },
  { seat: 4, role: 'imp', team: 'demon', isAlive: true }
];

// 執行
const result = handler.process(context);

// 驗證
assert(result.info.minionRole === 'poisoner');
assert(result.info.actualMinionSeat === 2);
assert(result.info.decoyPlayerSeat === 3 || result.info.decoyPlayerSeat === 4);
assert(result.mustFollow === false);
assert(result.canLie === true);
```

### T2：中毒狀態
```typescript
investigator.isPoisoned = true;

const result = handler.process(context);

// Handler 仍回傳實際結果
assert(result.info.actualMinionSeat === 2);
assert(result.info.reliable === false);
// UI 層根據 item.isPoisoned 提示說書人
```

### T3：只有間諜情況
```typescript
const players = [
  { seat: 1, role: 'investigator', team: 'townsfolk', isAlive: true },
  { seat: 2, role: 'spy', team: 'minion', isAlive: true },
  { seat: 3, role: 'imp', team: 'demon', isAlive: true }
];

const result = handler.process(context);

// 應告知無爪牙
assert(result.info.onlySpyInGame === true);
assert(result.info.noMinionToShow === true);
assert(result.mustFollow === true);
```

### T4：有陌客情況
```typescript
const players = [
  { seat: 1, role: 'investigator', team: 'townsfolk', isAlive: true },
  { seat: 2, role: 'poisoner', team: 'minion', isAlive: true },
  { seat: 3, role: 'recluse', team: 'outsider', isAlive: true },
  { seat: 4, role: 'imp', team: 'demon', isAlive: true }
];

const result = handler.process(context);

// UI 應預選投毒者 + 陌客
assert(result.info.suggestedMinionRole === 'poisoner');
assert(result.info.suggestedPlayer1 === 2);
assert(result.info.suggestedPlayer2 === 3);
assert(result.info.showRecluseOption === true);
```

### T5：酒鬼以為自己是調查員
```typescript
const drunkPlayer = {
  seat: 1,
  role: 'drunk',
  believesRole: 'investigator',
  team: 'outsider',
  isAlive: true
};

// RuleEngine 會路由到 InvestigatorHandler
const effectiveRole = ruleEngine.getEffectiveRole(drunkPlayer);
assert(effectiveRole === 'investigator');

// Handler 正常執行
const result = handler.process(context);
assert(result.info.minionRole !== undefined);

// RuleEngine 步驟 7 標記無效
assert(result.effectNullified === true);
```

---

## 與其他角色互動（總結）

### Spy 間諜
- 間諜是爪牙，正常可被調查員偵測
- **特殊**：只有間諜時，告知「無爪牙」，不顯示選擇介面

### Recluse 陌客
- 陌客可能登記為爪牙
- UI 預選：若有陌客，預選「爪牙 + 陌客」

### 酒鬼
- 酒鬼以為自己是調查員，使用 InvestigatorHandler
- 效果無效化，UI 顯示警告，不預選

### Drunk 狀態（被其他角色能力醉酒）
- 不同於酒鬼角色
- `isDrunk=true` → UI 顯示警告，不預選，說書人可自行決定

---

## 實作優先順序

### Phase 1：基礎實作
- [ ] 建立 `InvestigatorHandler.ts`
- [ ] 實作基本邏輯（選擇爪牙、誤導玩家、隨機順序）
- [ ] 處理無爪牙情況
- [ ] 註冊到 handlers/index.ts

### Phase 2：UI 整合
- [ ] 決定使用預設處理器或專屬 UI
- [ ] 測試第一夜流程
- [ ] 驗證中毒/醉酒提示

### Phase 3：測試
- [ ] 正常情況測試
- [ ] 邊緣情況測試（無爪牙、少玩家）
- [ ] 酒鬼測試
- [ ] 中毒/醉酒測試

---

## 參考資料

- 官方 Wiki：https://wiki.bloodontheclocktower.com/Investigator
- 類似角色：Washerwoman（鎮民）、Librarian（外來者）
- Handler 模式：FortunetellerHandler（雙目標資訊型）
