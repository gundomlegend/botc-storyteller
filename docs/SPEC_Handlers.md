# 角色處理器規格文件

本文件詳細說明所有特殊角色處理器的實作規格。

---

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
每個夜晚，選擇兩位玩家：你得知他們其中是否有惡魔。有一位善良玩家會對你顯示為惡魔。

### 實作規格

#### 處理流程
```
1. 檢查是否選擇目標
   ├─ 未選擇 → 返回需要輸入
   └─ 已選擇 → 繼續
   ↓
2. 獲取目標真實陣營
   └─ isEvil = (target.team === 'minion' || target.team === 'demon')
   ↓
3. 檢查資訊可靠性
   ├─ 不可靠（中毒/醉酒/Jinx） → 反轉資訊，強制遵守
   └─ 可靠 → 給真實資訊，說書人可選擇撒謊
   ↓
4. 返回結果
```

#### 程式碼實作
```typescript
export class FortunetellerHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, infoReliable, statusReason } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '占卜師選擇要查驗的玩家',
        display: '等待占卜師選擇目標...'
      };
    }
    
    // 步驟 2: 獲取真實陣營
    const isEvil = target.team === 'minion' || target.team === 'demon';
    
    // 步驟 3: 根據可靠性決定資訊
    let finalInfo: boolean;
    let reasoning: string;
    let mustFollow: boolean;
    
    if (!infoReliable) {
      // 中毒/醉酒/Jinx - 給錯誤資訊
      finalInfo = !isEvil;
      reasoning = `占卜師${statusReason}，必須給錯誤資訊`;
      mustFollow = true;
    } else {
      // 正常狀態 - 給真實資訊
      finalInfo = isEvil;
      reasoning = '占卜師狀態正常，建議給真實資訊（說書人可選擇撒謊）';
      mustFollow = false;
    }
    
    // 步驟 4: 返回結果
    return {
      action: 'tell_alignment',
      info: finalInfo ? 'evil' : 'good',
      gesture: finalInfo ? 'shake' : 'nod',
      mustFollow: mustFollow,
      canLie: !mustFollow,
      reasoning: reasoning,
      display: this.formatDisplay(target, isEvil, finalInfo, reasoning)
    };
  }
  
  private formatDisplay(
    target: Player,
    actualAlignment: boolean,
    suggestedInfo: boolean,
    reasoning: string
  ): string {
    return `查驗 ${target.seat}號 (${target.name})
真實身份：${target.role} (${actualAlignment ? '邪惡' : '善良'})

${reasoning}

建議手勢：${suggestedInfo ? '搖頭（邪惡）' : '點頭（善良）'}`;
  }
}
```

#### 測試案例
```typescript
describe('FortunetellerHandler', () => {
  test('正常狀態查驗惡魔', () => {
    const result = handler.process({
      player: fortuneteller,
      target: imp,
      infoReliable: true,
      statusReason: ''
    });
    
    expect(result.info).toBe('evil');
    expect(result.gesture).toBe('shake');
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });
  
  test('中毒狀態查驗惡魔', () => {
    const result = handler.process({
      player: fortuneteller,
      target: imp,
      infoReliable: false,
      statusReason: '中毒'
    });
    
    expect(result.info).toBe('good'); // 反轉
    expect(result.mustFollow).toBe(true);
    expect(result.reasoning).toContain('中毒');
  });
  
  test('查驗善良玩家', () => {
    const result = handler.process({
      player: fortuneteller,
      target: washerwoman,
      infoReliable: true,
      statusReason: ''
    });
    
    expect(result.info).toBe('good');
    expect(result.gesture).toBe('nod');
  });
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
        display: '⚠️ 僧侶不能保護自己，請重新選擇'
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
2. 檢查保護狀態
   ├─ 受保護 → 擊殺失敗
   └─ 未保護 → 繼續
   ↓
3. 檢查士兵免疫
   ├─ 是士兵 → 擊殺失敗
   └─ 非士兵 → 繼續
   ↓
4. 擊殺成功
   └─ 外部會調用 gameState.killPlayer(target, 'demon_kill')
```

#### 程式碼實作
```typescript
export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target } = context;
    
    // 步驟 1: 檢查目標
    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '小惡魔選擇擊殺目標',
        display: '等待小惡魔選擇擊殺目標...'
      };
    }
    
    // 步驟 2: 檢查保護
    if (target.isProtected) {
      return {
        action: 'kill',
        info: {
          targetSeat: target.seat,
          targetName: target.name,
          blocked: true,
          reason: '目標受到僧侶保護'
        },
        display: `小惡魔選擇擊殺 ${target.seat}號 (${target.name})
⚠️ 該玩家受到僧侶保護，擊殺失敗！`,
        gesture: 'none'
      };
    }
    
    // 步驟 3: 檢查士兵
    if (target.role === 'soldier' && !target.isPoisoned && !target.isDrunk) {
      return {
        action: 'kill',
        info: {
          targetSeat: target.seat,
          targetName: target.name,
          blocked: true,
          reason: '目標是士兵'
        },
        display: `小惡魔選擇擊殺 ${target.seat}號 (${target.name})
⚠️ 該玩家是士兵，免疫惡魔擊殺！`,
        gesture: 'none'
      };
    }
    
    // 步驟 4: 擊殺成功
    return {
      action: 'kill',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
        blocked: false
      },
      display: `小惡魔擊殺 ${target.seat}號 (${target.name})
該玩家將在黎明時死亡`,
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

### 模式 2: 檢查狀態影響
```typescript
if (!infoReliable) {
  // 給錯誤資訊
  return { mustFollow: true, ... };
} else {
  // 給真實資訊
  return { canLie: true, ... };
}
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