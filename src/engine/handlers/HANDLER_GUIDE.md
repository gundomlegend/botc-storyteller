# Handler 開發指南

## BaseHandler 架構

所有 handler 都應繼承 `BaseHandler` 以獲得統一的輔助方法。

## 基本使用模式

```typescript
import { BaseHandler } from './BaseHandler';
import type { HandlerContext, NightResult } from '../types';

export class YourHandler extends BaseHandler {
  process(context: HandlerContext): NightResult {
    // 1. 首先設置 context
    this.context = context;

    // 2. 使用 protected 屬性訪問常用資料
    if (!this.target) {
      return { needInput: true, ... };
    }

    // 3. 使用輔助方法
    const roleName = this.getPlayerRoleName(this.target);

    return {
      display: `處理 ${this.target.seat}號 (${roleName})`,
      ...
    };
  }
}
```

## 可用的 Protected 屬性

### 玩家相關
- `this.player` - 當前玩家
- `this.target` - 目標玩家
- `this.secondTarget` - 第二目標玩家（如占卜師）

### 遊戲狀態
- `this.gameState` - 遊戲狀態
- `this.roleData` - 當前角色資料
- `this.infoReliable` - 資訊是否可靠
- `this.statusReason` - 狀態原因（中毒、醉酒等）

## 可用的 Protected 方法

### ✅ getPlayerRoleName(player: Player): string
**推薦使用** - 取得玩家的角色顯示名稱

- 自動處理 believesRole（酒鬼機制）
- 顯示格式：「假角色名 (真實角色名)」或「真實角色名」

```typescript
// ✅ 正確用法
const name = this.getPlayerRoleName(this.target);
// 結果可能是：「占卜師 (酒鬼)」或「占卜師」
```

### ⚠️ getRoleName(roleId: string): string
**特殊情況使用** - 取得角色 ID 的顯示名稱

- 僅用於不涉及具體玩家的場景
- 例如：顯示虛張聲勢的角色列表、所有可用角色等

```typescript
// ⚠️ 僅在特殊情況下使用
const bluffNames = bluffs.map(roleId => this.getRoleName(roleId));
```

## 遷移指南

### 從舊模式遷移

**舊模式：**
```typescript
export class OldHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target, gameState, getPlayerRoleName } = context;

    if (!target) { ... }

    return {
      display: `${target.name} - ${getPlayerRoleName(target)}`
    };
  }
}
```

**新模式：**
```typescript
export class NewHandler extends BaseHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;

    if (!this.target) { ... }

    return {
      display: `${this.target.name} - ${this.getPlayerRoleName(this.target)}`
    };
  }
}
```

### Helper 方法遷移

**舊模式：**
```typescript
private buildMessage(
  player: Player,
  gameState: GameState,
  getPlayerRoleName: (player: Player) => string
): string {
  return `${player.name} - ${getPlayerRoleName(player)}`;
}
```

**新模式：**
```typescript
private buildMessage(
  player: Player,
  gameState: GameState
): string {
  return `${player.name} - ${this.getPlayerRoleName(player)}`;
}
```

## 設計原則

1. **優先使用 `getPlayerRoleName`**
   - 處理 Player 對象時必須使用此方法
   - 確保酒鬼機制正確顯示

2. **謹慎使用 `getRoleName`**
   - 僅用於處理 roleId 字串的場景
   - 例如：角色列表、虛張聲勢、遊戲設置等

3. **保持一致性**
   - 所有 handler 都應繼承 BaseHandler
   - 使用統一的訪問模式
   - Helper 方法不再需要接收方法參數

## 優勢

✅ 減少樣板代碼
✅ 統一訪問模式
✅ 更好的封裝
✅ 易於維護和擴展
✅ 自動處理 believesRole 機制
