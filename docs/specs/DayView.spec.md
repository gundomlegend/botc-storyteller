# DayView 組件規格文件

## 概述

`DayView` 是白天階段的主控台介面，負責提名、投票、處決流程，以及角色特殊規則的提醒。

檔案：`src/components/DayView.tsx`

---

## 白天流程

```
顯示玩家狀態 → 提名（提名者 → 被提名者）→ 投票 → 處決/取消 → 進入夜晚
```

---

## 區域結構

### 1. 玩家狀態列表

- 顯示所有玩家：座位、名字、角色（說書人可見）、存活狀態
- 死亡玩家以降低透明度標示

### 2. 提名區域

**規則**（BotC）：
- 提名者必須是存活玩家（死亡玩家不能提名）
- 被提名者可以是任何玩家（死亡玩家也可以被提名）
- 不能提名自己（`excludePlayers` 排除提名者）

**流程**：
1. 選擇提名者（`PlayerSelector mode="single" onlyAlive={true}`）
2. 選擇被提名者（`PlayerSelector mode="single" onlyAlive={false}`）
3. 點擊「發起投票」進入投票階段

### 3. 投票區域

**規則**（BotC）：
- 存活玩家可自由投票
- 死亡玩家整場遊戲僅有一次鬼魂票（TODO: 追蹤已使用鬼魂票）
- 通過門檻 = `ceil(存活玩家數 / 2)`

**流程**：
1. 點擊玩家按鈕 toggle 投票
2. 即時顯示票數 / 門檻
3. 票數達門檻 → 可處決；否則只能取消

---

## 角色特殊規則

### 管家 (Butler) 投票警告

**BotC 規則**：管家只能在主人投票時跟著投票。

**設計決策**：
- 系統**不阻擋**管家投票，票數照算
- 當管家已投票時，自動偵測主人是否也已投票
- 若主人未投票，顯示警告提醒說書人
- **管家中毒時，能力失效，可自由投票，不顯示警告**
- 投票是否有效由**說書人裁量**

**實作**：
```typescript
const { stateManager } = useGameStore();

// 偵測管家投票與主人狀態
const butler = players.find((p) => p.role === 'butler' && p.isAlive);
const butlerVoted = butler != null && votes.has(butler.seat);
const butlerPoisoned = butler != null && butler.isPoisoned;
const masterSeat = stateManager.getButlerMaster();
const masterVoted = masterSeat != null && votes.has(masterSeat);
```

在投票結果下方顯示警告（中毒時不顯示）：
```tsx
{butlerVoted && !masterVoted && !butlerPoisoned && (
  <div className="voting-warning">
    注意：管家（{butler!.name}）已投票，但主人（{masterSeat}號）尚未投票，此票可能無效
  </div>
)}
```

### 處女 (Virgin) 被提名觸發

**BotC 規則**：處女被鎮民提名時，提名者立即死亡，不進入投票。

**設計決策**：
- 在提名確認時檢查處女能力
- 能力觸發後標記 `abilityUsed`，只觸發一次

**實作邏輯**：
```typescript
function checkVirginTrigger(nominator: Player, target: Player): boolean {
  if (target.role === 'virgin' && !target.abilityUsed && nominator.team === 'townsfolk') {
    killPlayer(nominator.seat, 'virgin_ability');
    stateManager.markAbilityUsed(target.seat);
    return true; // 不進入投票
  }
  return false;
}
```

**TODO**：目前尚未在 DayView 中實作，需在 `handleNominate` 加入此檢查。

---

## 狀態管理

DayView 使用的 store 方法：
- `useGameStore().day` — 當前天數
- `useGameStore().players` — 所有玩家
- `useGameStore().alivePlayers` — 存活玩家
- `useGameStore().killPlayer(seat, 'execution')` — 處決
- `useGameStore().startNight()` — 進入夜晚
- `useGameStore().ruleEngine.getRoleName(roleId)` — 角色顯示名稱

---

## 樣式

| Class | 用途 |
|-------|------|
| `.day-view` | 容器 |
| `.day-players` | 玩家狀態列表區 |
| `.player-status-row` / `.player-status-row.dead` | 玩家行 |
| `.day-nomination` | 提名區 |
| `.nomination-selectors` / `.nomination-group` | 提名選擇器布局 |
| `.day-voting` | 投票區 |
| `.vote-btn` / `.vote-btn.voted` | 投票按鈕 |
| `.voting-result` / `.vote-passed` | 票數顯示 |
| `.voting-warning` | 管家等角色警告（黃色提示框） |
| `.voting-actions` | 處決/取消按鈕 |
| `.day-footer` | 進入夜晚按鈕 |
