# PlayerSelector 使用場景文檔

本文檔提供各種角色和場景下 PlayerSelector 的具體使用方法。

---

## 夜間能力場景

### 場景 1: 占卜師查驗

**角色**：占卜師 (Fortune Teller)

**規則**：
- 選擇 2 位玩家
- 可以選擇任何玩家（包括自己、死者）

**實作**：
```typescript
function FortunetellerAbility({ player }: Props) {
  const { processAbility } = useGameStore();

  const handleSelect = (players: Player[]) => {
    // processAbility 內部透過 HandlerContext 傳遞 target/secondTarget
    // TODO: 擴展 store.processAbility 支援雙目標
    const result = processAbility(player.seat, players[0].seat);
    // 處理結果...
  };

  return (
    <div>
      <h3>占卜師 - {player.name}</h3>
      <p>選擇兩位玩家查驗</p>

      <PlayerSelector
        mode="double"
        canSelectSelf={true}
        onlyAlive={false}
        showDeadPlayers={true}
        currentPlayerSeat={player.seat}
        onSelect={handleSelect}
      />
    </div>
  );
}
```

---

### 場景 2: 僧侶保護

**角色**：僧侶 (Monk)

**規則**：
- 選擇 1 位玩家
- 不能選擇自己
- 只能選擇存活玩家

**實作**：
```typescript
function MonkAbility({ player }: Props) {
  const { processAbility, addStatus } = useGameStore();

  const handleSelect = (players: Player[]) => {
    const target = players[0];
    const result = processAbility(player.seat, target.seat);

    if (result.action === 'add_protection' && !result.effectNullified) {
      addStatus(target.seat, 'protected', player.seat);
    }
  };

  const handleError = (message: string) => {
    alert(message);
  };

  return (
    <div>
      <h3>僧侶 - {player.name}</h3>
      <p>選擇要保護的玩家（不能是自己）</p>

      <PlayerSelector
        mode="single"
        canSelectSelf={false}
        onlyAlive={true}
        currentPlayerSeat={player.seat}
        onSelect={handleSelect}
        onError={handleError}
      />
    </div>
  );
}
```

---

### 場景 3: 投毒者下毒

**角色**：投毒者 (Poisoner)

**規則**：
- 選擇 1 位玩家
- 可以選擇任何存活玩家（包括自己）

**實作**：
```typescript
function PoisonerAbility({ player }: Props) {
  const { processAbility, addStatus } = useGameStore();

  const handleSelect = (players: Player[]) => {
    const target = players[0];
    const result = processAbility(player.seat, target.seat);

    if (result.action === 'add_poison' && !result.effectNullified) {
      addStatus(target.seat, 'poisoned', player.seat);
    }
  };

  return (
    <div>
      <h3>投毒者 - {player.name}</h3>
      <p>選擇要下毒的玩家</p>

      <PlayerSelector
        mode="single"
        canSelectSelf={true}
        onlyAlive={true}
        currentPlayerSeat={player.seat}
        onSelect={handleSelect}
      />
    </div>
  );
}
```

---

### 場景 4: 小惡魔擊殺

**角色**：小惡魔 (Imp)

**規則**：
- 選擇 1 位玩家
- 可以選擇自己（自殺機制）
- 只能選擇存活玩家

**實作**：
```typescript
function ImpAbility({ player }: Props) {
  const { processAbility, killPlayer } = useGameStore();

  const handleSelect = (players: Player[]) => {
    const target = players[0];
    const result = processAbility(player.seat, target.seat);

    // 狀態變更由 AbilityProcessor 統一處理（kill / star pass）
    // 此處僅展示 PlayerSelector 的用法
  };

  return (
    <div>
      <h3>小惡魔 - {player.name}</h3>
      <p>選擇擊殺目標</p>

      <PlayerSelector
        mode="single"
        canSelectSelf={true}
        onlyAlive={true}
        currentPlayerSeat={player.seat}
        onSelect={handleSelect}
      />

      <p className="hint">
        提示：你可以選擇自己（自殺），這會讓一位爪牙變成小惡魔
      </p>
    </div>
  );
}
```

---

### 場景 5: 共情者查看鄰居

**角色**：共情者 (Empath)

**規則**：
- 自動顯示左右鄰居
- 不需要玩家選擇
- 只計算存活鄰居

**實作**：
```typescript
function EmpathAbility({ player, onComplete }: Props) {
  const [result, setResult] = useState('');

  const handleNeighborsCalculated = (neighbors: Player[]) => {
    // 自動計算邪惡鄰居數量（中毒/醉酒時由 RuleEngine 處理資訊可靠性）
    const evilCount = neighbors.filter(n =>
      n.team === 'minion' || n.team === 'demon'
    ).length;

    setResult(`你的鄰居中有 ${evilCount} 位邪惡玩家`);
  };

  return (
    <div>
      <h3>共情者 - {player.name}</h3>
      <p>你的左右鄰居：</p>

      {/* 純顯示鄰居，自動計算 */}
      <PlayerSelector
        mode="neighbors"
        currentPlayerSeat={player.seat}
        onSelect={handleNeighborsCalculated}
      />

      {result && (
        <div className="result">
          <p>結果：</p>
          <p>{result}</p>
        </div>
      )}

      <button onClick={onComplete}>確認</button>
    </div>
  );
}
```

---

### 場景 6: 守鴉人查驗（死後能力）

**角色**：守鴉人 (Ravenkeeper)

**規則**：
- 死亡當晚才能使用
- 選擇 1 位玩家
- 可以選擇任何玩家（包括死者）

**實作**：
```typescript
function RavenkeeperAbility({ player }: Props) {
  const { night, stateManager } = useGameStore();

  // Player.deathNight 記錄死亡的夜晚編號
  if (player.deathNight !== night) {
    return null; // 不是死亡當晚，不顯示
  }

  const handleSelect = (players: Player[]) => {
    const target = players[0];
    const roleData = stateManager.getRoleData(target.role);
    const roleName = roleData?.name_cn ?? target.role;
    showResult(`${target.name} 的角色是：${roleName}`);
  };

  return (
    <div>
      <h3>守鴉人 - {player.name}</h3>
      <p>你今晚死亡了，可以查看一位玩家的角色</p>

      <PlayerSelector
        mode="single"
        canSelectSelf={false}
        onlyAlive={false}
        showDeadPlayers={true}
        currentPlayerSeat={player.seat}
        onSelect={handleSelect}
      />
    </div>
  );
}
```

---

## 白天流程場景

### 場景 7: 發起提名

**規則**：
- 兩步選擇：提名者 → 被提名者
- 提名者必須是存活玩家（BotC：死亡玩家不能提名）
- 被提名者可以是任何玩家（BotC：死亡玩家也可以被提名）
- 不能提名自己

**實作**：
```typescript
function NominationForm() {
  const [step, setStep] = useState<'nominator' | 'target'>('nominator');
  const [nominator, setNominator] = useState<Player | null>(null);

  const handleNominatorSelect = (players: Player[]) => {
    setNominator(players[0]);
    setStep('target');
  };

  const handleTargetSelect = (players: Player[]) => {
    createNomination(nominator!, players[0]);
  };

  if (step === 'nominator') {
    return (
      <div>
        <h3>發起提名</h3>
        <p>誰要發起提名？</p>

        <PlayerSelector
          mode="single"
          onlyAlive={true}
          label="選擇提名者"
          onSelect={handleNominatorSelect}
        />
      </div>
    );
  }

  return (
    <div>
      <h3>發起提名</h3>
      <p>{nominator!.name} 要提名誰？</p>

      <PlayerSelector
        mode="single"
        onlyAlive={false}
        excludePlayers={[nominator!.seat]}
        label="選擇被提名者"
        onSelect={handleTargetSelect}
      />

      <button onClick={() => {
        setStep('nominator');
        setNominator(null);
      }}>
        重新選擇提名者
      </button>
    </div>
  );
}
```

---

### 場景 8: 投票階段

**規則**：
- 多選模式
- 存活玩家可自由投票
- 死亡玩家有一次鬼魂票（BotC 規則：整場遊戲只能投一次）
- 實時顯示票數

**實作**：
```typescript
function VotingPhase({ nomination }: Props) {
  const { alivePlayers } = useGameStore();
  const [voters, setVoters] = useState<Player[]>([]);

  const handleVote = (selectedPlayers: Player[]) => {
    setVoters(selectedPlayers);
  };

  const handleConfirm = () => {
    const voteResult = calculateVotes(voters);
    processVoteResult(nomination, voteResult);
  };

  // 通過門檻 = ceil(存活玩家數 / 2)
  const threshold = Math.ceil(alivePlayers.length / 2);

  return (
    <div>
      <h3>投票</h3>
      <p>{nomination.nominator.name} 提名 {nomination.target.name}</p>
      <p>需要 {threshold} 票通過</p>

      <PlayerSelector
        mode="multiple"
        onlyAlive={false}
        showDeadPlayers={true}
        showVoteCount={true}
        label="請舉手投票（死亡玩家可使用鬼魂票）"
        onSelect={handleVote}
      />

      <div className="vote-summary">
        <p>當前票數：{voters.length}</p>
        <button onClick={handleConfirm}>確認投票結果</button>
      </div>
    </div>
  );
}
```

---

## 第一夜特殊場景

### 場景 9: 爪牙惡魔互認

**規則**：
- 只顯示，不可選擇
- 高亮所有邪惡玩家
- 顯示角色名稱

**實作**：
```typescript
function MinionDemonRecognition({ onComplete }: Props) {
  const { stateManager } = useGameStore();
  const minions = stateManager.getMinionPlayers();
  const demon = stateManager.getDemonPlayer();

  if (minions.length === 0) {
    return <div>沒有爪牙，跳過此階段</div>;
  }

  const evilSeats = [
    ...minions.map(m => m.seat),
    ...(demon ? [demon.seat] : [])
  ];

  return (
    <div>
      <h3>爪牙與惡魔互認</h3>
      <p>請讓以下玩家睜眼互相確認：</p>

      <PlayerSelector
        mode="display"
        highlightPlayers={evilSeats}
        showRoles={true}
        readOnly={true}
        layout="list"
      />

      <div className="instructions">
        <p>1. 讓高亮的玩家睜眼</p>
        <p>2. 他們互相確認身份</p>
        <p>3. 讓他們閉眼</p>
      </div>

      <button onClick={onComplete}>完成</button>
    </div>
  );
}
```

---

### 場景 10: 惡魔虛張聲勢

**規則**：
- 只顯示惡魔
- 顯示三個未分配的角色

**實作**：
```typescript
function DemonBluffs({ onComplete }: Props) {
  const { stateManager } = useGameStore();
  const demon = stateManager.getDemonPlayer();
  const bluffs = stateManager.generateDemonBluffs();

  if (!demon) return null;

  return (
    <div>
      <h3>惡魔虛張聲勢</h3>
      <p>讓惡魔睜眼：</p>

      <PlayerSelector
        mode="display"
        highlightPlayers={[demon.seat]}
        showRoles={true}
        readOnly={true}
        layout="list"
      />

      <div className="bluffs">
        <h4>展示以下三個角色標記：</h4>
        {bluffs.map(roleId => {
          const roleData = stateManager.getRoleData(roleId);
          return (
            <div key={roleId} className="bluff-role">
              {roleData?.name_cn} ({roleData?.name})
            </div>
          );
        })}
        <p>這些角色未被分配，惡魔可以宣稱是這些角色</p>
      </div>

      <button onClick={onComplete}>完成</button>
    </div>
  );
}
```

---

## 進階使用場景

### 場景 11: 條件式過濾

**範例**：處女被提名檢測
```typescript
function handleNomination(nominator: Player, target: Player) {
  const { killPlayer, stateManager } = useGameStore.getState();

  // 檢查目標是否為處女
  if (target.role === 'virgin' && !target.abilityUsed) {
    // 檢查提名者是否為鎮民
    if (nominator.team === 'townsfolk') {
      // 處女能力觸發
      showAlert('處女能力觸發！提名者立即死亡！');
      killPlayer(nominator.seat, 'virgin_ability');
      stateManager.markAbilityUsed(target.seat);
      return; // 不進入投票
    }
  }

  // 正常進入投票
  startVoting(nominator, target);
}
```

---

### 場景 12: 動態排除玩家

**範例**：管家投票限制
```typescript
function ButlerVoteRestriction({ butler }: Props) {
  const { stateManager } = useGameStore();
  const master = stateManager.getPlayer(butler.masterSeat);

  // BotC 規則：管家只能在主人投票時跟著投票
  const [canVote, setCanVote] = useState(false);

  useEffect(() => {
    const masterVoted = checkIfPlayerVoted(master);
    setCanVote(masterVoted);
  }, [master]);

  if (!canVote) {
    return (
      <div>
        <p>管家 {butler.name}</p>
        <p>你的主人 {master?.name} 還沒投票，你不能投票</p>
      </div>
    );
  }

  // 主人投票了，管家可以投
  return (
    <PlayerSelector
      mode="single"
      onlyAlive={true}
      currentPlayerSeat={butler.seat}
      onSelect={handleVote}
    />
  );
}
```

---

## 組合使用範例

### 場景 13: 完整的夜間流程
```typescript
function NightProcessor({ nightOrder, currentIndex }: Props) {
  const currentItem = nightOrder[currentIndex];
  
  // 根據角色類型渲染不同的 PlayerSelector
  const renderSelector = () => {
    switch (currentItem.role) {
      case 'fortuneteller':
        return (
          <PlayerSelector
            mode="double"
            canSelectSelf={true}
            onlyAlive={false}
          />
        );
      
      case 'monk':
        return (
          <PlayerSelector
            mode="single"
            canSelectSelf={false}
            onlyAlive={true}
            currentPlayerSeat={currentItem.seat}
          />
        );

      case 'poisoner':
        return (
          <PlayerSelector
            mode="single"
            canSelectSelf={true}
            onlyAlive={true}
            currentPlayerSeat={currentItem.seat}
          />
        );
      
      case 'imp':
        return (
          <PlayerSelector
            mode="single"
            canSelectSelf={true}
            onlyAlive={true}
          />
        );
      
      default:
        // 簡單角色，不需要選擇
        return null;
    }
  };
  
  return (
    <div>
      <h3>{currentItem.roleName}</h3>
      {renderSelector()}
    </div>
  );
}
```

---

## 注意事項

1. **狀態存取原則**
   - 一律透過 `useGameStore()` 存取狀態與操作
   - 禁止直接呼叫 `gameState.*` 或 `ruleEngine.*`
   - 狀態變更（kill、addStatus 等）由 AbilityProcessor 統一處理

2. **錯誤處理**
   - 始終提供 `onError` 回調
   - 給用戶清楚的錯誤提示

3. **用戶體驗**
   - 雙選模式顯示進度提示
   - 多選模式實時顯示票數
   - 禁用狀態要有視覺反饋

4. **BotC 規則提醒**
   - 死亡玩家不能提名，但可以被提名
   - 死亡玩家有一次鬼魂投票機會（整場遊戲僅一次）
   - `onSelect` 統一回傳 `Player[]`（single 模式為長度 1 的陣列）

5. **特殊情況**
   - 沒有可選玩家時顯示提示
   - 自動選擇時要有反饋