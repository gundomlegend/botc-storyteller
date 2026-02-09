## State Contract（狀態核心約束）
GameStateManager 必須永久保證以下規則：

1. 玩家 seat 唯一且不可重複
2. players 依 seat 排序
3. 同一狀態不可重複加入
4. history 只能 append，不可修改
5. startNight() 必須清除 protected
6. startNight() 必須清除 poisoned（中毒持續到隔日白天，進入下一夜失效）
7. 已死亡玩家不可再獲得狀態
8. initializePlayers 只能呼叫一次（除非 reset）

違反以上任一規則，視為重大錯誤。

## Ability Invalidation（引用）

能力失效規則請以 `docs/contracts/AbilityInvalidation.contract.md` 為準。

GameStateManager 必須提供以下 API 支援能力失效：

### addStatus(seat, type, sourceSeat, data?)

簽名變更：新增 `sourceSeat` 參數，記錄「誰施加了這個狀態」。

```typescript
addStatus(
  seat: number,
  type: 'poisoned' | 'protected' | 'drunk',
  sourceSeat: number,
  data?: { believesRole?: string }
): void
```

規則：
- 必須記錄 `sourceSeat`，供 `revokeEffectsFrom()` 反查
- 若目標玩家已死亡（`!isAlive`），靜默忽略（不加狀態、不拋錯）

### revokeEffectsFrom(sourceSeat, reason)

撤銷指定玩家施加的所有持續性狀態（poisoned、protected）。

```typescript
revokeEffectsFrom(
  sourceSeat: number,
  reason: 'death' | 'role_change'
): void
```

行為：
- 遍歷所有玩家，移除 `sourceSeat` 所施加的 poisoned / protected 狀態
- 記錄歷史事件

呼叫時機（由以下方法內部自動呼叫）：
- `killPlayer(seat, cause)` → 呼叫 `revokeEffectsFrom(seat, 'death')`
- `replaceRole(seat, newRole)` → 呼叫 `revokeEffectsFrom(seat, 'role_change')`

### replaceRole(seat, newRole)

角色替換（Imp star-pass 等）。

```typescript
replaceRole(seat: number, newRole: string): void
```

行為：
1. 呼叫 `revokeEffectsFrom(seat, 'role_change')`
2. 更新玩家的 `role` 和 `team`
3. 記錄歷史事件

## 測試用例
## Contract Tests（必須通過）
以下測試為強制合約測試，未通過不可合併：

### 測試 1: 基本初始化
```typescript
const manager = new GameStateManager();

manager.initializePlayers([
  { seat: 1, name: '測試1', role: 'fortuneteller' },
  { seat: 2, name: '測試2', role: 'imp' }
]);

// 驗證
assert(manager.getAllPlayers().length === 2);
assert(manager.getPlayer(1)?.role === 'fortuneteller');
assert(manager.getPlayer(1)?.isAlive === true);
```

### 測試 2: 狀態管理
```typescript
// 添加中毒（sourceSeat = 99 表示測試用）
manager.addStatus(1, 'poisoned', 99);
assert(manager.hasStatus(1, 'poisoned') === true);

// 添加保護
manager.addStatus(2, 'protected', 99);
assert(manager.hasStatus(2, 'protected') === true);

// 開始夜晚（清除保護）
manager.startNight();
assert(manager.hasStatus(2, 'protected') === false);
```

### 測試 3: 夜間順序生成
```typescript
manager.startNight();
const order = manager.generateNightOrder(true);

// 驗證
assert(order.length > 0);
assert(order[0].priority <= order[1].priority); // 排序正確

// 驗證包含正確資訊
const ftItem = order.find(i => i.role === 'fortuneteller');
assert(ftItem !== undefined);
assert(ftItem.reminder.length > 0);
```

### 測試 4: 死亡處理
```typescript
manager.killPlayer(1, 'demon_kill');

const player = manager.getPlayer(1);
assert(player?.isAlive === false);
assert(player?.deathCause === 'demon_kill');

// 驗證存活玩家列表
const alive = manager.getAlivePlayers();
assert(alive.length === 1);
assert(alive[0].seat === 2);
```

### 測試 5: Seat 唯一性
```typescript
expect(() => {
  manager.initializePlayers([
    { seat: 1, name: 'A', role: 'imp' },
    { seat: 1, name: 'B', role: 'monk' }
  ]);
}).toThrow();
```

### 測試 6: 死亡後不可加狀態
```typescript
manager.killPlayer(1, 'demon_kill');
manager.addStatus(1, 'poisoned', 99);

expect(manager.hasStatus(1, 'poisoned')).toBe(false);
```

### 測試 7: 保護清除
```typescript
manager.addStatus(2, 'protected', 99);
manager.startNight();

expect(manager.hasStatus(2, 'protected')).toBe(false);
```

### 測試 8: 歷史不可修改
```typescript
const history = manager.getHistory();
const old = history.length;

manager.logEvent({ type:'test', description:'x', details:{} });

expect(manager.getHistory().length).toBe(old + 1);
```

### 測試 9: addStatus 記錄 sourceSeat 並支援 revokeEffectsFrom
```typescript
const manager = new GameStateManager();
manager.initializePlayers([
  { seat: 1, name: 'A', role: 'poisoner' },
  { seat: 2, name: 'B', role: 'monk' },
  { seat: 3, name: 'C', role: 'fortuneteller' },
]);

manager.startNight();

// Poisoner(1) 對 FortuneTeller(3) 下毒
manager.addStatus(3, 'poisoned', 1);
expect(manager.hasStatus(3, 'poisoned')).toBe(true);

// Poisoner(1) 死亡 → 自動 revokeEffectsFrom(1, 'death')
manager.killPlayer(1, 'execution');

// FortuneTeller(3) 的中毒應已被撤銷
expect(manager.hasStatus(3, 'poisoned')).toBe(false);
```

### 測試 10: replaceRole 撤銷舊角色持續狀態
```typescript
const manager = new GameStateManager();
manager.initializePlayers([
  { seat: 1, name: 'A', role: 'monk' },
  { seat: 2, name: 'B', role: 'imp' },
  { seat: 3, name: 'C', role: 'fortuneteller' },
]);

manager.startNight();

// Monk(1) 保護 FortuneTeller(3)
manager.addStatus(3, 'protected', 1);
expect(manager.hasStatus(3, 'protected')).toBe(true);

// Monk(1) 角色被替換 → 自動 revokeEffectsFrom(1, 'role_change')
manager.replaceRole(1, 'imp');

// FortuneTeller(3) 的保護應已被撤銷
expect(manager.hasStatus(3, 'protected')).toBe(false);
// Monk(1) 角色已變更
expect(manager.getPlayer(1)?.role).toBe('imp');
```

### 測試 11: 中毒直到下一晚失效
```typescript
const manager = new GameStateManager();

// 準備最小玩家集合（只要 seat 存在即可）
manager.initializePlayers([
  { seat: 1, name: 'A', role: 'poisoner' },
  { seat: 2, name: 'B', role: 'monk' },
]);

// 進入第一夜（N1）
manager.startNight();

// N1 下毒：2 號玩家中毒（由 1 號投毒者施加）
manager.addStatus(2, 'poisoned', 1);

// 進入白天（D1）— 仍應中毒
manager.startDay();
expect(manager.hasStatus(2, 'poisoned')).toBe(true);

// 進入第二夜（N2）— 中毒必須失效
manager.startNight();
expect(manager.hasStatus(2, 'poisoned')).toBe(false);
```
