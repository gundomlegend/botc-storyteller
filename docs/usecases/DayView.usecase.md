# DayView 使用場景文檔

本文檔提供白天階段各種流程的具體使用方法。

---

## 提名流程

### 場景 1: 發起提名

**規則**：
- 兩步選擇：提名者 → 被提名者
- 提名者必須是存活玩家（BotC：死亡玩家不能提名）
- 被提名者可以是任何玩家（BotC：死亡玩家也可以被提名）
- 不能提名自己

**實作**：
```typescript
// DayView 提名區域使用 PlayerSelector
<div className="nomination-group">
  <p>提名者：</p>
  <PlayerSelector
    mode="single"
    onlyAlive={true}
    label="選擇提名者"
    onSelect={(ps: Player[]) => setNominatorSeat(ps[0]?.seat ?? null)}
  />
</div>
<div className="nomination-group">
  <p>被提名者：</p>
  <PlayerSelector
    mode="single"
    onlyAlive={false}
    excludePlayers={nominatorSeat != null ? [nominatorSeat] : []}
    label="選擇被提名者"
    onSelect={(ps: Player[]) => setNomineeSeat(ps[0]?.seat ?? null)}
  />
</div>
```

---

### 場景 2: 處女被提名觸發

**角色**：處女 (Virgin)

**規則**：
- 處女被鎮民提名時，提名者立即死亡
- 能力只觸發一次（`abilityUsed` 標記）
- 觸發後不進入投票

**實作**：
```typescript
function checkVirginTrigger(nominator: Player, target: Player): boolean {
  const { killPlayer, stateManager } = useGameStore.getState();

  if (target.role === 'virgin' && !target.abilityUsed) {
    if (nominator.team === 'townsfolk') {
      killPlayer(nominator.seat, 'virgin_ability');
      stateManager.markAbilityUsed(target.seat);
      return true; // 不進入投票
    }
  }
  return false;
}
```

> **TODO**：尚未在 DayView 中實作，需在 `handleNominate` 加入此檢查。

---

## 投票流程

### 場景 3: 一般投票

**規則**：
- 存活玩家可自由投票
- 通過門檻 = `ceil(存活玩家數 / 2)`
- 點擊玩家按鈕 toggle 投票狀態
- 達到門檻可處決，否則只能取消

**實作**：
```typescript
const voteThreshold = Math.ceil(alivePlayers.length / 2);

// toggle 投票
const toggleVote = (seat: number) => {
  setVotes((prev) => {
    const next = new Set(prev);
    if (next.has(seat)) next.delete(seat);
    else next.add(seat);
    return next;
  });
};
```

---

### 場景 4: 管家投票警告

**角色**：管家 (Butler)

**規則**：
- BotC 規則：管家只能在主人投票時跟著投票
- 系統**不阻擋**管家投票，票數照算
- 管家投票時顯示警告，提醒說書人確認主人是否也已投票
- 投票是否有效由**說書人裁量**

**實作**：
```typescript
// 偵測管家是否投票
const butler = players.find((p) => p.role === 'butler' && p.isAlive);
const butlerVoted = butler != null && votes.has(butler.seat);

// 投票區域顯示警告
{butlerVoted && (
  <div className="voting-warning">
    注意：管家（{butler!.name}）已投票，請確認其主人是否也已投票，否則此票可能無效
  </div>
)}
```

> **TODO**：等 Butler handler 實作後，從 `GameStateManager` 取得主人座位，精確判斷主人是否投票。

---

### 場景 5: 鬼魂票

**規則**：
- 死亡玩家整場遊戲僅有一次鬼魂投票機會
- 使用後不可再投票

> **TODO**：目前投票區僅顯示存活玩家，尚未實作鬼魂票追蹤與 UI。

---

## 注意事項

1. **狀態存取原則**
   - 一律透過 `useGameStore()` 存取狀態與操作
   - 處決使用 `killPlayer(seat, 'execution')`

2. **角色特殊規則為提醒性質**
   - 管家投票限制、處女觸發等屬於「說書人輔助提醒」
   - 系統不強制執行，由說書人最終裁量

3. **BotC 規則提醒**
   - 死亡玩家不能提名，但可以被提名
   - 死亡玩家有一次鬼魂投票機會（整場遊戲僅一次）
   - 每天每位玩家只能被提名一次（TODO: 尚未追蹤）
