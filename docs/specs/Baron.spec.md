# Baron 男爵規格文件

## 概述

男爵是爪牙（Minion）陣營的 **Setup Ability**（設置時能力）角色。與大多數角色不同，男爵的能力在遊戲初始化時生效，而非夜間行動時。男爵的存在會改變遊戲的角色分配：**增加 2 個外來者，減少 2 個鎮民**。

**關鍵特性**：
- 男爵的能力在角色分配階段生效（Setup Phase）
- 不是夜間能力，沒有任何夜間行動（firstNight: 0, otherNight: 0）
- 影響角色池的組成，不影響玩家數量
- 必須在角色分配前就確定是否有男爵
- **僅在 10 人及以上的局才會出現**（遊戲平衡限制）

---

## 角色資料

```json
{
  "id": "baron",
  "name": "Baron",
  "name_cn": "男爵",
  "team": "minion",
  "ability": "There are extra Outsiders in play. [+2 Outsiders]",
  "ability_cn": "場上會有額外的外來者。[+2 外來者]",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": [],
  "setup": true,
  "setupAbility": "add_outsiders",
  "minPlayers": 10
}
```

**中文能力描述**：場上會有額外的外來者。遊戲開始時，外來者數量 +2，鎮民數量 -2。

**重要屬性**：
- `setup: true` - 標記此角色具有設置時能力
- `setupAbility: "add_outsiders"` - 具體的設置能力類型
- `minPlayers: 10` - 最小玩家數量限制（10人及以上才能使用）

---

## 核心機制

### Setup Ability 系統

Baron 引入了全新的 **Setup Ability** 系統，用於處理在遊戲初始化階段就生效的角色能力。

**設計原則**：
1. **時機先於分配**：Setup Ability 必須在角色完全分配給玩家之前就確定
2. **影響分配比例**：Setup Ability 可以改變角色分配的數量比例
3. **不可逆轉**：一旦 Setup Ability 生效，無法在遊戲中途改變
4. **對玩家透明**：玩家只看到最終的角色分配，不知道是否有 Setup Ability 生效
5. **玩家數量限制**：某些 Setup Ability 角色有最小玩家數量要求

### Baron 的具體效果

**玩家數量限制**：
- **Baron 僅在 10 人及以上的局才會出現**
- 原因：9 人局只有 5 個鎮民，若 Baron 生效（-2 鎮民）會導致只剩 3 個鎮民，遊戲平衡性過差
- 實作：
  - UI 層：人數 < 10 時，Baron 在角色選擇列表中禁用或隱藏
  - 邏輯層：若意外選中 Baron 但人數 < 10，跳過 Baron 效果並記錄警告

**基礎分配規則**（無男爵）：
```
10人局：
- 鎮民：6
- 外來者：1
- 爪牙：2
- 惡魔：1

13人局：
- 鎮民：7
- 外來者：2
- 爪牙：3
- 惡魔：1
```

**男爵生效後**（10人及以上）：
```
10人局（有男爵）：
- 鎮民：6 - 2 = 4
- 外來者：1 + 2 = 3
- 爪牙：2（含男爵）
- 惡魔：1

13人局（有男爵）：
- 鎮民：7 - 2 = 5
- 外來者：2 + 2 = 4
- 爪牙：3（含男爵）
- 惡魔：1
```

**特殊情況處理**：
- 若人數 < 10：跳過 Baron 效果，記錄警告日誌
- 若鎮民數量 < 2：只減少現有數量，外來者增加相同數量（理論上不會發生，因為 10 人以上必有足夠鎮民）

---

## 處理流程

### Phased Initialization 架構

為了支援 Baron 的 Setup Ability，遊戲初始化流程需要改為**分階段選擇**（Phased Selection）：

```
Phase 1: 角色池分類
  ↓
Phase 2: 抽選爪牙和惡魔（固定數量）
  ├─ 隨機抽選爪牙
  └─ 隨機抽選惡魔
  ↓
Phase 3: 檢查 Setup Abilities
  └─ 檢查抽中的爪牙/惡魔中是否有 setup 角色
  └─ 若有男爵 → 調整分配比例（鎮民 -2，外來者 +2）
  ↓
Phase 4: 抽選鎮民和外來者（使用調整後的數量）
  ├─ 根據調整後的數量隨機抽選鎮民
  └─ 根據調整後的數量隨機抽選外來者
  ↓
Phase 5: 組合並分配角色給玩家
  ↓
Phase 6: 後處理（惡魔虛張聲勢、酒鬼設置）
```

### 詳細演算法

```typescript
// 新的初始化流程（在 GameState.ts 或新的 GameInitializer 類別中）

static initializeGame(
  playerNames: string[],
  selectedRoles: string[]
): GameState {
  const roleRegistry = RoleRegistry.getInstance();
  const playerCount = playerNames.length;

  // ═════════════════════════════════════════
  // Phase 1: 角色池分類
  // ═════════════════════════════════════════
  const rolesByTeam = roleRegistry.categorizeRoles(selectedRoles);
  // 結果：{ townsfolk: [...], outsiders: [...], minions: [...], demons: [...] }

  // ═════════════════════════════════════════
  // Phase 2: 抽選爪牙和惡魔
  // ═════════════════════════════════════════
  const baseDistribution = this.getBaseDistribution(playerCount);
  // baseDistribution = { townsfolk: 7, outsiders: 2, minions: 3, demons: 1 }

  const selectedMinions = roleRegistry.randomPick(
    rolesByTeam.minions,
    baseDistribution.minions,
    false  // 不允許重複
  );

  const selectedDemons = roleRegistry.randomPick(
    rolesByTeam.demons,
    baseDistribution.demons,
    false
  );

  // ═════════════════════════════════════════
  // Phase 3: 應用 Setup Abilities
  // ═════════════════════════════════════════
  const finalDistribution = roleRegistry.applySetupAbilities(
    [...selectedMinions, ...selectedDemons],
    baseDistribution,
    playerCount  // 傳入玩家數量，用於檢查 minPlayers 限制
  );
  // 若有男爵且人數 >= 10：finalDistribution = { townsfolk: 5, outsiders: 4, minions: 3, demons: 1 }
  // 若有男爵但人數 < 10：跳過男爵效果，記錄警告
  // 若無男爵：finalDistribution = baseDistribution（不變）

  // ═════════════════════════════════════════
  // Phase 4: 抽選鎮民和外來者
  // ═════════════════════════════════════════
  const selectedTownsfolk = roleRegistry.randomPick(
    rolesByTeam.townsfolk,
    finalDistribution.townsfolk,
    false
  );

  const selectedOutsiders = roleRegistry.randomPick(
    rolesByTeam.outsiders,
    finalDistribution.outsiders,
    false
  );

  // ═════════════════════════════════════════
  // Phase 5: 組合並分配
  // ═════════════════════════════════════════
  const allRoles = [
    ...selectedTownsfolk,
    ...selectedOutsiders,
    ...selectedMinions,
    ...selectedDemons
  ];

  // Shuffle 所有角色
  const shuffledRoles = this.shuffleArray(allRoles);

  // 建立玩家資料
  const playerData = playerNames.map((name, index) => ({
    seat: index + 1,
    name,
    role: shuffledRoles[index]
  }));

  // 建立 GameState
  const gameState = new GameStateManager(roleRegistry);
  gameState.initializePlayers(playerData);

  // ═════════════════════════════════════════
  // Phase 6: 後處理
  // ═════════════════════════════════════════
  // 這部分在 initializePlayers 內部執行：
  // - generateDemonBluffs()
  // - initializeDrunkPlayers()

  return gameState;
}
```

---

## RoleRegistry 擴展需求

為了支援 Baron 的 Setup Ability，需要在 `RoleRegistry` 中新增以下方法：

### 新增介面定義

```typescript
// src/engine/types.ts

export interface RoleDistribution {
  townsfolk: number;
  outsiders: number;
  minions: number;
  demons: number;
}

export interface CategorizedRoles {
  townsfolk: string[];
  outsiders: string[];
  minions: string[];
  demons: string[];
}
```

### RoleRegistry 新增方法

```typescript
// src/engine/RoleRegistry.ts

export class RoleRegistry {
  // ═══════════════════════════════════════════════════
  // 角色分類方法
  // ═══════════════════════════════════════════════════

  /**
   * 根據陣營分類角色
   */
  categorizeRoles(roleIds: string[]): CategorizedRoles {
    const result: CategorizedRoles = {
      townsfolk: [],
      outsiders: [],
      minions: [],
      demons: []
    };

    for (const roleId of roleIds) {
      const roleData = this.getRoleData(roleId);
      if (!roleData) continue;

      switch (roleData.team) {
        case 'townsfolk':
          result.townsfolk.push(roleId);
          break;
        case 'outsider':
          result.outsiders.push(roleId);
          break;
        case 'minion':
          result.minions.push(roleId);
          break;
        case 'demon':
          result.demons.push(roleId);
          break;
      }
    }

    return result;
  }

  /**
   * 從角色池中隨機選擇指定數量的角色
   */
  randomPick(
    pool: string[],
    count: number,
    allowDuplicates = false
  ): string[] {
    if (pool.length === 0) return [];

    const result: string[] = [];
    const available = [...pool];

    for (let i = 0; i < count; i++) {
      if (available.length === 0) {
        console.warn(`角色池耗盡，需要 ${count} 個角色，但只能提供 ${i} 個`);
        break;
      }

      const randomIndex = Math.floor(Math.random() * available.length);
      const selected = available[randomIndex];
      result.push(selected);

      if (!allowDuplicates) {
        available.splice(randomIndex, 1);
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════
  // Setup Ability 方法
  // ═══════════════════════════════════════════════════

  /**
   * 檢查角色是否具有 Setup Ability
   */
  hasSetupAbility(roleId: string): boolean {
    const roleData = this.getRoleData(roleId);
    return roleData?.setup === true;
  }

  /**
   * 從角色列表中篩選出具有 Setup Ability 的角色
   */
  getSetupRoles(roleIds: string[]): string[] {
    return roleIds.filter(roleId => this.hasSetupAbility(roleId));
  }

  /**
   * 應用所有 Setup Abilities，調整角色分配
   *
   * @param selectedRoles - 已選中的爪牙和惡魔角色
   * @param baseDistribution - 基礎角色分配
   * @param playerCount - 玩家數量（用於檢查角色的 minPlayers 限制）
   * @returns 調整後的角色分配
   */
  applySetupAbilities(
    selectedRoles: string[],
    baseDistribution: RoleDistribution,
    playerCount: number
  ): RoleDistribution {
    const finalDistribution = { ...baseDistribution };

    // 檢查是否有男爵
    if (selectedRoles.includes('baron')) {
      const baronData = this.getRoleData('baron');
      const minPlayers = baronData?.minPlayers ?? 0;

      // 檢查玩家數量是否滿足男爵的最小要求（10人）
      if (playerCount < minPlayers) {
        console.warn(`[Baron] 玩家數量不足（${playerCount} < ${minPlayers}），跳過男爵效果`);
        // 不應用男爵效果，但男爵仍然在場
      } else {
        // 男爵效果：外來者 +2，鎮民 -2
        const townfolkReduction = Math.min(2, finalDistribution.townsfolk);

        finalDistribution.townsfolk -= townfolkReduction;
        finalDistribution.outsiders += townfolkReduction;

        console.log(`[Baron] 男爵生效：鎮民 ${baseDistribution.townsfolk} → ${finalDistribution.townsfolk}，外來者 ${baseDistribution.outsiders} → ${finalDistribution.outsiders}`);
      }
    }

    // 未來可擴展：檢查其他 Setup Ability 角色
    // if (selectedRoles.includes('godfather')) { ... }
    // if (selectedRoles.includes('fang_gu')) { ... }

    return finalDistribution;
  }
}
```

---

## GameState 修改需求

### 選項 A：靜態方法（推薦）

在 `GameStateManager` 類別中新增靜態初始化方法：

```typescript
// src/engine/GameState.ts

export class GameStateManager {
  // ... 現有方法 ...

  /**
   * 使用 Phased Initialization 建立新遊戲
   *
   * @param roleRegistry - 角色註冊表
   * @param playerNames - 玩家名稱列表
   * @param selectedRoles - 選中的角色池
   * @returns 初始化完成的遊戲狀態管理器
   */
  static createGame(
    roleRegistry: RoleRegistry,
    playerNames: string[],
    selectedRoles: string[]
  ): GameStateManager {
    const playerCount = playerNames.length;

    // Phase 1-4: Phased role selection（如上述演算法）
    // ...

    // Phase 5: 建立 GameState 並分配角色
    const gameState = new GameStateManager(roleRegistry);
    gameState.initializePlayers(playerData);

    return gameState;
  }
}
```

### 選項 B：獨立初始化器（更靈活）

創建新的 `GameInitializer` 類別：

```typescript
// src/engine/GameInitializer.ts

export class GameInitializer {
  constructor(private roleRegistry: RoleRegistry) {}

  /**
   * 取得基礎角色分配
   */
  private getBaseDistribution(playerCount: number): RoleDistribution {
    // 根據玩家數量計算標準分配
    // 參考官方規則
  }

  /**
   * Phased initialization
   */
  initializeGame(
    playerNames: string[],
    selectedRoles: string[]
  ): GameStateManager {
    // Phase 1-4 實作
    // ...
  }
}
```

**推薦使用選項 A**（靜態方法），因為：
- 保持代碼集中在 GameState 模組
- 不需要額外的類別
- 更符合現有架構

---

## 與現有系統的整合

### 1. UI 層修改

在遊戲設置 UI 中，不需要特別處理 Baron：

```typescript
// src/components/GameSetup.tsx

const handleStartGame = () => {
  // 使用新的 phased initialization
  const gameState = GameStateManager.createGame(
    roleRegistry,
    playerNames,
    selectedRoles  // 包含 Baron 的角色池
  );

  // Baron 的效果會自動在內部處理
};
```

### 2. 說書人提示

在第一夜開始前，應該告知說書人角色分配情況：

```typescript
// 在 FirstNightView 或類似組件中
if (selectedRoles.includes('baron')) {
  return (
    <div className="setup-info">
      <p>⚠️ 本局有男爵</p>
      <p>角色分配已調整：外來者 +2，鎮民 -2</p>
    </div>
  );
}
```

### 3. 遊戲歷史記錄

在 `initializePlayers` 或 `createGame` 中記錄 Baron 生效：

```typescript
if (selectedMinions.includes('baron')) {
  gameState.logEvent({
    type: 'init',
    description: '男爵生效：外來者 +2，鎮民 -2',
    details: {
      originalDistribution: baseDistribution,
      finalDistribution: finalDistribution
    }
  });
}
```

---

## 測試用例

### T1：10人局有男爵（正常情況）

```typescript
const playerNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const selectedRoles = [
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath',  // 6 townsfolk (足夠供選擇)
  'fortuneteller', 'undertaker', 'monk', 'ravenkeeper',
  'butler', 'drunk', 'recluse',  // 3 outsiders (for baron effect)
  'poisoner', 'baron',  // 2 minions (baron included)
  'imp'  // 1 demon
];

const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

// 驗證
const players = gameState.getAllPlayers();
const townsfolk = players.filter(p => p.team === 'townsfolk');
const outsiders = players.filter(p => p.team === 'outsider');
const minions = players.filter(p => p.team === 'minion');
const demons = players.filter(p => p.team === 'demon');

// 10人局有男爵：4鎮民、3外來者、2爪牙、1惡魔
assert(townsfolk.length === 4);
assert(outsiders.length === 3);
assert(minions.length === 2);
assert(demons.length === 1);

// 驗證男爵確實被選中
assert(minions.some(m => m.role === 'baron'));
```

### T2：9人局有男爵（人數不足，男爵效果不生效）

```typescript
const playerNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy'];
const selectedRoles = [
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath',  // 5 townsfolk
  'fortuneteller', 'undertaker', 'monk',
  'butler',  // 1 outsider
  'poisoner', 'baron',  // 2 minions (baron included, but won't take effect)
  'imp'  // 1 demon
];

const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

const players = gameState.getAllPlayers();
const townsfolk = players.filter(p => p.team === 'townsfolk');
const outsiders = players.filter(p => p.team === 'outsider');
const minions = players.filter(p => p.team === 'minion');

// 9人局人數不足（< 10），男爵在場但效果不生效：5鎮民、1外來者、2爪牙、1惡魔
assert(townsfolk.length === 5);
assert(outsiders.length === 1);
assert(minions.length === 2);

// 驗證男爵仍然在場（但效果未生效）
assert(minions.some(m => m.role === 'baron'));
```

### T3：7人局無男爵（標準情況）

```typescript
const playerNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace'];
const selectedRoles = [
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath',  // 5 townsfolk
  'poisoner',  // 1 minion (no baron)
  'imp'  // 1 demon
];

const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

const players = gameState.getAllPlayers();
const townsfolk = players.filter(p => p.team === 'townsfolk');
const outsiders = players.filter(p => p.team === 'outsider');

// 7人局無男爵：5鎮民、0外來者、1爪牙、1惡魔
assert(townsfolk.length === 5);
assert(outsiders.length === 0);
```

### T4：13人局有男爵

```typescript
const playerNames = Array.from({ length: 13 }, (_, i) => `Player${i + 1}`);
const selectedRoles = [
  // 足夠的鎮民和外來者供選擇
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath',
  'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin',
  'slayer', 'soldier', 'mayor',
  'butler', 'drunk', 'recluse', 'saint',
  'poisoner', 'spy', 'baron',  // 3 minions
  'imp'
];

const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

const players = gameState.getAllPlayers();
const townsfolk = players.filter(p => p.team === 'townsfolk');
const outsiders = players.filter(p => p.team === 'outsider');
const minions = players.filter(p => p.team === 'minion');

// 13人局有男爵：5鎮民、4外來者、3爪牙、1惡魔
assert(townsfolk.length === 5);
assert(outsiders.length === 4);
assert(minions.length === 3);
assert(minions.some(m => m.role === 'baron'));
```

### T5：角色池不足的情況

```typescript
const selectedRoles = [
  'washerwoman', 'librarian',  // 只有 2 個鎮民
  'butler', 'drunk', 'recluse',  // 3 個外來者
  'baron',  // 1 個爪牙（男爵）
  'imp'  // 1 個惡魔
];

const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

// 應該優雅地處理：選擇所有可用的鎮民（2個），並記錄警告
const townsfolk = gameState.getAllPlayers().filter(p => p.team === 'townsfolk');
assert(townsfolk.length === 2);  // 只能選 2 個，因為池中只有 2 個
```

### T6：與酒鬼和惡魔虛張聲勢的整合

```typescript
const gameState = GameStateManager.createGame(roleRegistry, playerNames, selectedRoles);

// 驗證 Phase 6 仍然正常執行
const demonBluffs = gameState.getDemonBluffs();
assert(demonBluffs.length === 3);

const drunkPlayer = gameState.getAllPlayers().find(p => p.role === 'drunk');
if (drunkPlayer) {
  assert(drunkPlayer.believesRole !== null);
  assert(!demonBluffs.includes(drunkPlayer.believesRole!));  // 酒鬼假角色不在虛張聲勢中
}
```

---

## 與其他角色互動

### Drunk 酒鬼

**互動**：
- Baron 改變角色分配，可能導致場上外來者數量增加
- 酒鬼的 `believesRole` 只能是鎮民角色，不受 Baron 影響
- Baron 的存在不影響酒鬼初始化邏輯

**測試**：
```typescript
// 有男爵的局，酒鬼仍然正常初始化
assert(drunkPlayer.believesRole !== null);
assert(roleRegistry.getRoleTeam(drunkPlayer.believesRole) === 'townsfolk');
```

### Spy 間諜

**互動**：
- 若同時有 Baron 和 Spy，兩者都是爪牙
- Baron 的 Setup Ability 不影響 Spy 的能力
- Spy 的「登記為善良」能力與 Baron 無關

### Recluse 陌客

**互動**：
- Baron 增加外來者數量，可能讓 Recluse 更容易出現
- Recluse 的「可能登記為爪牙」能力與 Baron 無關
- 調查員看到的爪牙仍然可以是 Recluse

### 惡魔虛張聲勢

**互動**：
- Baron 增加外來者數量，減少鎮民數量
- 這會影響可用於虛張聲勢的鎮民角色池大小
- `generateDemonBluffs()` 邏輯不需要修改，因為它是基於 `selectedRoles` 計算

---

## 實作優先順序

### Phase 1：RoleRegistry 擴展（基礎設施）
- [x] 設計 `RoleDistribution` 和 `CategorizedRoles` 介面
- [ ] 實作 `categorizeRoles()` 方法
- [ ] 實作 `randomPick()` 方法
- [ ] 實作 `hasSetupAbility()` 方法
- [ ] 實作 `applySetupAbilities()` 方法
- [ ] 單元測試

### Phase 2：GameState 重構（核心邏輯）
- [ ] 在 `GameStateManager` 中新增 `createGame()` 靜態方法
- [ ] 實作 Phased Initialization 流程
- [ ] 實作 `getBaseDistribution()` 方法
- [ ] 確保 `initializePlayers()` 仍然正常運作
- [ ] 整合測試

### Phase 3：Baron 角色資料
- [ ] 在 `roles/trouble-brewing.json` 中新增 Baron 資料
- [ ] 確保 `setup: true` 和 `setupAbility: "add_outsiders"` 正確設置
- [ ] 驗證角色載入

### Phase 4：UI 整合
- [ ] 修改遊戲設置 UI，使用新的 `createGame()` 方法
- [ ] 在第一夜前顯示 Baron 提示（如有）
- [ ] 記錄 Baron 生效事件到遊戲歷史

### Phase 5：測試與驗證
- [ ] 7人局有/無男爵測試
- [ ] 13人局有/無男爵測試
- [ ] 角色池不足測試
- [ ] 與酒鬼、惡魔虛張聲勢的整合測試
- [ ] 邊緣情況測試

---

## 未來擴展

### 其他 Setup Ability 角色

Baron 的實作為未來其他 Setup Ability 角色鋪平道路：

**Trouble Brewing**：
- ✅ Baron：外來者 +2，鎮民 -2

**Bad Moon Rising**：
- Godfather：外來者 -1，陌生人 +1（需要陌生人陣營支援）

**Sects & Violets**：
- Fang Gu：外來者 +1，鎮民 -1

**設計模式**：
```typescript
// 擴展 setupAbility 類型
type SetupAbilityType =
  | 'add_outsiders'      // Baron
  | 'add_stranger'       // Godfather
  | 'fang_gu_effect';    // Fang Gu

// 在 applySetupAbilities 中處理
switch (roleData.setupAbility) {
  case 'add_outsiders':
    // Baron logic
    break;
  case 'add_stranger':
    // Godfather logic
    break;
  case 'fang_gu_effect':
    // Fang Gu logic
    break;
}
```

---

## 參考資料

- 官方 Wiki：https://wiki.bloodontheclocktower.com/Baron
- 官方規則書（Setup Phase）
- 類似角色：Godfather (BMR), Fang Gu (S&V)

---

## 設計決策記錄

### 為什麼選擇 Phased Initialization？

**問題**：
- 原本的隨機分配無法知道是否有 Baron
- 若先隨機分配再調整，會導致重複洗牌和複雜的角色替換邏輯

**解決方案**：
- Phase 2 先抽爪牙/惡魔（固定數量）
- Phase 3 檢查是否有 Baron，調整分配比例
- Phase 4 根據調整後的比例抽鎮民/外來者

**優點**：
- ✅ 邏輯清晰，易於理解和維護
- ✅ 只需要一次洗牌和分配
- ✅ 容易擴展到其他 Setup Ability 角色
- ✅ 不影響現有的 Phase 6（惡魔虛張聲勢、酒鬼設置）

### 為什麼在 RoleRegistry 實作？

**原因**：
- RoleRegistry 是角色資料的單一真相來源
- Setup Ability 是角色的固有屬性
- 集中管理所有角色相關邏輯

**替代方案（已否決）**：
- ❌ 在 GameState 中硬編碼 Baron 邏輯（不可擴展）
- ❌ 建立獨立的 SetupAbilityManager（過度工程化）

