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
// 添加中毒
manager.addStatus(1, 'poisoned');
assert(manager.hasStatus(1, 'poisoned') === true);

// 添加保護
manager.addStatus(2, 'protected');
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
manager.addStatus(1, 'poisoned');

expect(manager.hasStatus(1, 'poisoned')).toBe(false);
```

### 測試 7: 保護清除
```typescript
manager.addStatus(2, 'protected');
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

### 測試 9: 中毒直到下一晚失效
```typescript
const manager = new GameStateManager();

// 準備最小玩家集合（只要 seat 存在即可）
manager.initializePlayers([
  { seat: 1, name: 'A', role: 'poisoner' },
  { seat: 2, name: 'B', role: 'monk' },
]);

// 進入第一夜（N1）
manager.startNight();

// N1 下毒：2 號玩家中毒
manager.addStatus(2, 'poisoned');

// 進入白天（D1）— 仍應中毒
manager.startDay();
expect(manager.hasStatus(2, 'poisoned')).toBe(true);

// 進入第二夜（N2）— 中毒必須失效
manager.startNight();
expect(manager.hasStatus(2, 'poisoned')).toBe(false);
```
