# 角色處理器規格文件

本文件詳細說明所有特殊角色處理器的實作規格。

---

## 技能驗證 (Ability Invalidation)

能力失效合約：`docs/contracts/AbilityInvalidation.contract.md`

**Handler 不負責 invalidation 檢查。** 所有 invalidation 由 RuleEngine 統一後處理：

| 情境 | 誰負責 | Handler 要做什麼 |
|---|---|---|
| 中毒/醉酒導致效果型能力不落地（AC1） | RuleEngine `applyInvalidation()` 標記 `effectNullified: true` | 不用管，照常回傳結果 |
| 中毒/醉酒導致資訊不可靠（AC1） | UI 層提示說書人可自行決定 | 回傳實際偵測結果，不反轉；UI 根據 `item.isPoisoned/isDrunk` 提示 |
| 死亡跳過（AC2） | RuleEngine 前檢查 | 不用管 |
| 角色變更撤銷持續狀態（AC3） | GameState `revokeEffectsFrom()` | 不用管 |
| NightContext 攔截（AC4） | RuleEngine 前檢查 `blockedRoles` | 不用管 |

**設計原則**：Handler 只寫純能力邏輯（happy path），不做防禦性檢查。

## 處理器介面

所有角色處理器必須實作 `RoleHandler` 介面：
```typescript
interface RoleHandler {
  process(context: HandlerContext): NightResult;
}

interface HandlerContext {
  roleData: RoleData;        // 角色資料
  player: Player;            // 執行能力的玩家
  target: Player | null;     // 目標玩家
  secondTarget?: Player;     // 第二個目標（如占卜師）
  gameState: GameState;      // 遊戲狀態
  infoReliable: boolean;     // 資訊是否可靠
  statusReason: string;      // 狀態原因
}
```

---

## 1. 占卜師處理器 (FortunetellerHandler)

### 檔案位置
`src/engine/handlers/FortunetellerHandler.ts`

### 角色能力
每個夜晚，選擇兩位玩家：你得知他們其中是否有惡魔。有一位善良玩家（干擾項）會對你顯示為惡魔。

### 設計原則
- **Handler 回傳實際偵測結果，不反轉**
- 中毒/醉酒時由 UI 層提示說書人可給任意答案
- 說書人永遠做最終決定（有惡魔/無惡魔）

### 干擾項（Red Herring）

第一晚占卜師階段開始前，說書人從善良陣營（townsfolk / outsider）選擇一位玩家標記為干擾項。

- **≤ 6 人局**：可選占卜師自己
- **> 6 人局**：不可選占卜師自己
- 干擾項設定後在整場遊戲中持續有效，存於 `gameState.redHerringSeat`

### 偵測判定邏輯

```
targetTriggersDetection(target) =
  target.team === 'demon'           // 惡魔
  || target.role === 'recluse'      // 陌客（永遠觸發偵測）
  || target.seat === redHerringSeat  // 干擾項

rawDetection = triggers(target1) || triggers(target2)
```

> 陌客帶干擾項 → 無額外效果（本來就會觸發偵測）
> 爪牙（minion）不觸發偵測

### 中毒/醉酒處理
- Handler 仍回傳實際偵測結果（`rawDetection`）
- UI 層根據 `item.isPoisoned / item.isDrunk` 顯示警告
- 中毒/醉酒時：回答選項**不預選**，說書人必須自行選擇
- 正常狀態時：回答選項**預選**實際偵測結果

### 處理流程
```
1. 檢查雙目標
   ├─ target 或 secondTarget 為空 → 返回 needInput (select_two_players)
   └─ 兩者皆有 → 繼續
   ↓
2. 偵測判定
   ├─ target1: 是惡魔 / 陌客 / 干擾項？
   └─ target2: 是惡魔 / 陌客 / 干擾項？
   ↓
3. 計算 rawDetection = t1Triggers || t2Triggers
   ↓
4. 回傳結果
   └─ info.rawDetection、各目標偵測細節、reasoning
```

### 回傳格式
```typescript
{
  action: 'tell_alignment',
  info: {
    rawDetection: boolean,
    target1: { seat: number, isDemon: boolean, isRecluse: boolean, isRedHerring: boolean },
    target2: { seat: number, isDemon: boolean, isRecluse: boolean, isRedHerring: boolean },
  },
  mustFollow: false,
  canLie: true,
  reasoning: string,   // 偵測原因說明
  display: string,      // 完整顯示文字
}
```

### UI 流程（FortunetellerProcessor）

占卜師使用專屬 UI 處理器 `FortunetellerProcessor`（`src/components/roleProcessors/FortunetellerProcessor.tsx`），
透過 `ROLE_PROCESSORS` 註冊表由 `AbilityProcessor` 自動路由。

```
第一晚：
  1. 干擾項選擇（善良陣營角色清單，≤6人可選自己，>6人排除自己）
  2. 第一位目標選擇（PlayerSelector mode=single）
  3. 第二位目標選擇（PlayerSelector mode=single，排除已選目標）
  4. 執行能力 → 顯示偵測結果
  5. 說書人選擇回答：
     ├─ 正常：預選 rawDetection 對應選項
     └─ 中毒/醉酒：不預選 + 警告提示
  6. 確認 → 記錄到歷史

第二晚起：
  跳過步驟 1，其餘相同
```

### 測試案例
```typescript
describe('FortunetellerHandler', () => {
  test('無目標 → needInput, select_two_players');
  test('只有一個目標 → needInput');
  test('雙善良、無干擾項 → rawDetection: false');
  test('其中一個是惡魔 → rawDetection: true');
  test('爪牙不觸發偵測 → rawDetection: false');
  test('干擾項玩家被選中 → rawDetection: true');
  test('陌客被選中（無干擾項） → rawDetection: true');
  test('陌客帶干擾項（冗餘） → rawDetection: true');
  test('中毒時仍回傳實際偵測結果，mustFollow: false');
});
```

---

## 2. 僧侶處理器 (MonkHandler)

### 角色能力
每個夜晚（第一夜除外），選擇一位玩家（不能是你自己）：今晚他不會死於惡魔。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 檢查是否選擇自己
   ├─ 選擇自己 → 返回錯誤
   └─ 選擇他人 → 繼續
   ↓
3. 返回保護結果
   └─ 外部會調用 gameState.addStatus(target, 'protected')
```

#### 程式碼實作
```typescript
export class MonkHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '僧侶選擇要保護的玩家（不能選擇自己）',
        display: '等待僧侶選擇保護目標...'
      };
    }
    
    // 步驟 2: 檢查不能保護自己
    if (target.seat === player.seat) {
      return {
        skip: true,
        skipReason: '僧侶不能保護自己',
        display: '🚫 僧侶不能保護自己，請重新選擇'
      };
    }
    
    // 步驟 3: 返回保護結果
    return {
      action: 'add_protection',
      info: {
        targetSeat: target.seat,
        targetName: target.name
      },
      display: `僧侶保護 ${target.seat}號 (${target.name})
今晚該玩家不會被惡魔擊殺`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('MonkHandler', () => {
  test('保護其他玩家', () => {
    const result = handler.process({
      player: monk,
      target: otherPlayer
    });
    
    expect(result.action).toBe('add_protection');
    expect(result.info.targetSeat).toBe(otherPlayer.seat);
  });
  
  test('不能保護自己', () => {
    const result = handler.process({
      player: monk,
      target: monk
    });
    
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不能保護自己');
  });
});
```

---

## 3. 投毒者處理器 (PoisonerHandler)

### 角色能力
每個夜晚，選擇一位玩家：他今晚和明天白天中毒。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 返回中毒結果
   └─ 外部會調用 gameState.addStatus(target, 'poisoned')
```

#### 程式碼實作
```typescript
export class PoisonerHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '投毒者選擇要下毒的玩家',
        display: '等待投毒者選擇下毒目標...'
      };
    }
    
    // 步驟 2: 返回中毒結果
    return {
      action: 'add_poison',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
        targetRole: target.role
      },
      display: `投毒者下毒 ${target.seat}號 (${target.name})
角色：${target.role}
該玩家今晚和明天的能力將失效`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('PoisonerHandler', () => {
  test('下毒目標玩家', () => {
    const result = handler.process({
      player: poisoner,
      target: fortuneteller
    });
    
    expect(result.action).toBe('add_poison');
    expect(result.info.targetSeat).toBe(fortuneteller.seat);
  });
});
```

---

## 4. 小惡魔處理器 (ImpHandler)

### 角色能力
每個夜晚（第一夜除外），選擇一位玩家：他死亡。如果你殺死自己，一位爪牙變成小惡魔。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 檢查是否自殺（Star Pass）
   ├─ target.seat === player.seat → 進入 Star Pass 流程
   │   ├─ 尋找存活爪牙
   │   │   ├─ 無存活爪牙 → 純自殺（無繼承）
   │   │   └─ 有存活爪牙 → 選擇繼承者
   │   │       ├─ 紅唇女郎（scarletwoman）存活 → 優先選她
   │   │       └─ 否則 → 隨機選一位存活爪牙
   │   └─ 回傳 star pass 結果（含新惡魔資訊 + 喚醒提示）
   └─ 否 → 繼續一般擊殺流程
   ↓
3. 檢查保護狀態
   ├─ 受保護 → 擊殺失敗
   └─ 未保護 → 繼續
   ↓
4. 檢查士兵免疫
   ├─ 是士兵 → 擊殺失敗
   └─ 非士兵 → 繼續
   ↓
5. 擊殺成功
   └─ 外部會調用 gameState.killPlayer(target, 'demon_kill')
```

#### Star Pass 結果格式

外部（AbilityProcessor）收到 `info.starPass === true` 時，需依序執行：
1. `killPlayer(impSeat, 'demon_kill')` — Imp 死亡（觸發 AC2 revokeEffectsFrom）
2. `replaceRole(newDemonSeat, 'imp')` — 爪牙變成 Imp（觸發 AC3 revokeEffectsFrom）

```typescript
// Star Pass 回傳範例
{
  action: 'kill',
  info: {
    targetSeat: player.seat,     // 自己
    targetName: player.name,
    blocked: false,
    starPass: true,
    newDemonSeat: 3,
    newDemonName: '某某',
    newDemonOldRole: 'poisoner',
  },
  display: '小惡魔自殺！\n3號 某某（投毒者）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔',
  gesture: 'none'
}

// 純自殺（無存活爪牙）回傳範例
{
  action: 'kill',
  info: {
    targetSeat: player.seat,
    targetName: player.name,
    blocked: false,
    starPass: false,
  },
  display: '小惡魔自殺！\n無存活爪牙可繼承，惡魔陣營失去惡魔',
  gesture: 'none'
}
```

#### 程式碼實作
```typescript
export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, gameState, getRoleName } = context;

    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '小惡魔選擇擊殺目標',
        display: '等待小惡魔選擇擊殺目標...'
      };
    }

    // 步驟 2: 檢查自殺（Star Pass）
    if (target.seat === player.seat) {
      return this.handleStarPass(player, gameState, getRoleName);
    }

    // 步驟 3: 檢查保護
    if (target.isProtected) { ... }

    // 步驟 4: 檢查士兵
    if (target.role === 'soldier' && !target.isPoisoned && !target.isDrunk) { ... }

    // 步驟 5: 擊殺成功
    return { action: 'kill', info: { ... }, ... };
  }

  private handleStarPass(
    player: Player,
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): NightResult {
    // 尋找存活爪牙
    const aliveMinions = Array.from(gameState.players.values())
      .filter(p => p.team === 'minion' && p.isAlive);

    if (aliveMinions.length === 0) {
      return {
        action: 'kill',
        info: { targetSeat: player.seat, targetName: player.name, blocked: false, starPass: false },
        display: `小惡魔自殺！\n無存活爪牙可繼承，惡魔陣營失去惡魔`,
        gesture: 'none'
      };
    }

    // 紅唇女郎優先，否則隨機
    const scarletWoman = aliveMinions.find(p => p.role === 'scarletwoman');
    const newDemon = scarletWoman ?? aliveMinions[Math.floor(Math.random() * aliveMinions.length)];

    return {
      action: 'kill',
      info: {
        targetSeat: player.seat,
        targetName: player.name,
        blocked: false,
        starPass: true,
        newDemonSeat: newDemon.seat,
        newDemonName: newDemon.name,
        newDemonOldRole: newDemon.role,
      },
      display: `小惡魔自殺！\n${newDemon.seat}號 ${newDemon.name}（${getRoleName(newDemon.role)}）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔`,
      gesture: 'none'
    };
  }
}
```

#### 測試案例
```typescript
describe('ImpHandler', () => {
  test('正常擊殺', () => {
    const result = handler.process({
      player: imp,
      target: normalPlayer
    });

    expect(result.action).toBe('kill');
    expect(result.info.blocked).toBe(false);
  });

  test('保護阻擋擊殺', () => {
    protectedPlayer.isProtected = true;

    const result = handler.process({
      player: imp,
      target: protectedPlayer
    });

    expect(result.info.blocked).toBe(true);
    expect(result.info.reason).toContain('保護');
  });

  test('士兵免疫', () => {
    const result = handler.process({
      player: imp,
      target: soldier
    });

    expect(result.info.blocked).toBe(true);
    expect(result.info.reason).toContain('士兵');
  });

  test('中毒士兵可被擊殺', () => {
    soldier.isPoisoned = true;

    const result = handler.process({
      player: imp,
      target: soldier
    });

    expect(result.info.blocked).toBe(false);
  });

  test('自殺時爪牙繼承（Star Pass）', () => {
    // gameState 中有存活爪牙
    const result = handler.process({
      player: imp,
      target: imp,   // 目標是自己
      gameState: stateWithAliveMinions
    });

    expect(result.action).toBe('kill');
    expect(result.info.starPass).toBe(true);
    expect(result.info.newDemonSeat).toBeDefined();
    expect(result.display).toContain('成為新的小惡魔');
    expect(result.display).toContain('請喚醒該玩家');
  });

  test('自殺時紅唇女郎優先繼承', () => {
    const result = handler.process({
      player: imp,
      target: imp,
      gameState: stateWithScarletWoman
    });

    expect(result.info.starPass).toBe(true);
    expect(result.info.newDemonOldRole).toBe('scarletwoman');
  });

  test('自殺時無存活爪牙', () => {
    const result = handler.process({
      player: imp,
      target: imp,
      gameState: stateWithNoAliveMinions
    });

    expect(result.info.starPass).toBe(false);
    expect(result.display).toContain('無存活爪牙');
  });
});
```

---

## 5. 酒鬼處理器 (DrunkHandler)

### 角色能力
你不知道你是酒鬼。你以為你是一個鎮民角色，但你不是。

### 實作規格

**注意**：酒鬼的狀態在遊戲設置時就已配置好，夜間無需處理。

#### 程式碼實作
```typescript
export class DrunkHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 酒鬼無夜間行動
    return {
      skip: true,
      skipReason: '酒鬼無夜間行動（狀態已在設置時配置）',
      display: '酒鬼無夜間行動'
    };
  }
}
```

#### 設置時處理

酒鬼的配置應在 `GameStateManager.initializePlayers()` 中處理：
```typescript
// 在初始化玩家時
if (player.role === 'drunk') {
  player.isDrunk = true;
  player.believesRole = selectRandomTownsfolk(); // 隨機善良角色
  player.originalRole = 'drunk';
}
```

---

## 處理器註冊

### 檔案：`src/engine/handlers/index.ts`
```typescript
import { RoleHandler } from '../types';
import { FortunetellerHandler } from './FortunetellerHandler';
import { MonkHandler } from './MonkHandler';
import { PoisonerHandler } from './PoisonerHandler';
import { ImpHandler } from './ImpHandler';
import { DrunkHandler } from './DrunkHandler';

export const handlers = new Map<string, RoleHandler>([
  ['fortuneteller', new FortunetellerHandler()],
  ['monk', new MonkHandler()],
  ['poisoner', new PoisonerHandler()],
  ['imp', new ImpHandler()],
  ['drunk', new DrunkHandler()]
]);
```

---

## UI 處理器註冊（roleProcessors）

部分角色的 UI 互動邏輯較複雜（例如占卜師需要干擾項選擇、雙目標、說書人回答），
從 `AbilityProcessor` 抽取至專屬 UI 處理器。

### 檔案：`src/components/roleProcessors/index.ts`
```typescript
import type { ComponentType } from 'react';
import type { NightOrderItem } from '../../engine/types';

export interface RoleProcessorProps {
  item: NightOrderItem;
  onDone: () => void;
}

export const ROLE_PROCESSORS: Record<string, ComponentType<RoleProcessorProps>> = {
  fortuneteller: FortunetellerProcessor,
};
```

`AbilityProcessor` 在入口處查詢 `ROLE_PROCESSORS[item.role]`：
- 有對應處理器 → 路由至該處理器
- 無對應處理器 → 走通用流程（單目標選擇 + 通用結果顯示）

### 新增 UI 處理器

1. 在 `src/components/roleProcessors/` 建立新檔案（如 `EmpathProcessor.tsx`）
2. 實作 `RoleProcessorProps` 介面
3. 在 `index.ts` 的 `ROLE_PROCESSORS` 中註冊

---

## 新增處理器指南

### 步驟 1: 建立處理器檔案

在 `src/engine/handlers/` 建立新檔案，例如 `EmpathHandler.ts`

### 步驟 2: 實作 RoleHandler 介面
```typescript
import { RoleHandler, HandlerContext, NightResult } from '../types';

export class EmpathHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    // 實作邏輯
  }
}
```

### 步驟 3: 註冊處理器

在 `handlers/index.ts` 中添加：
```typescript
import { EmpathHandler } from './EmpathHandler';

export const handlers = new Map<string, RoleHandler>([
  // ... 現有處理器
  ['empath', new EmpathHandler()]
]);
```

### 步驟 4: 撰寫測試

在 `__tests__/` 目錄下建立測試檔案。

---

## 常見模式

### 模式 1: 需要選擇目標
```typescript
if (!target) {
  return {
    needInput: true,
    inputType: 'select_player',
    inputPrompt: '選擇目標玩家',
    display: '等待選擇...'
  };
}
```

### 模式 2: 資訊型角色回傳實際結果
```typescript
// 資訊型 handler 回傳實際偵測結果，不根據 infoReliable 反轉。
// 中毒/醉酒由 UI 層提示說書人可自行決定。
return {
  action: 'tell_alignment',
  info: { rawDetection },
  mustFollow: false,
  canLie: true,
  reasoning: '...',
  display: '...',
};
```

### 模式 3: 檢查特殊條件
```typescript
if (specialCondition) {
  return {
    skip: true,
    skipReason: '條件不符',
    display: '能力無法使用'
  };
}
```

---

## 注意事項

1. **不要修改遊戲狀態**
   - 處理器只返回結果
   - 狀態修改由外部（UI 層）調用 GameStateManager

2. **錯誤處理**
   - 使用 `skip` 而非拋出異常
   - 提供清楚的 `skipReason`

3. **顯示訊息**
   - `display` 用於 UI 顯示
   - 使用清楚的繁體中文
   - 包含所有必要資訊

4. **測試覆蓋率**
   - 每個處理器至少 3 個測試案例
   - 測試正常流程和邊緣情況