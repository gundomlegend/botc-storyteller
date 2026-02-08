# GameStateManager 規格文件

## 概述
`GameStateManager` 是遊戲狀態管理的核心類別，負責：
- 管理所有玩家資料
- 追蹤遊戲進度（夜晚/白天）
- 管理狀態（中毒、保護、死亡等）
- 生成夜間行動順序
- 記錄遊戲歷史

---

## 類別定義
```typescript
export class GameStateManager {
  private state: GameState;
  private roleRegistry: Map<string, RoleData>;
  
  constructor();
  
  // 初始化方法
  initializePlayers(players: Array<{seat: number; name: string; role: string}>): void;
  
  // 查詢方法
  getPlayer(seat: number): Player | undefined;
  getAllPlayers(): Player[];
  getAlivePlayers(): Player[];
  getPlayersByRole(role: string): Player[];
  hasAliveRole(role: string): boolean;
  getAlignment(player: Player): 'good' | 'evil';
  getRoleData(roleId: string): RoleData | undefined;
  
  // 狀態修改方法
  addStatus(seat: number, type: 'poisoned' | 'protected' | 'drunk', data?: any): void;
  removeStatus(seat: number, type: 'poisoned' | 'protected'): void;
  hasStatus(seat: number, type: 'poisoned' | 'protected' | 'drunk'): boolean;
  killPlayer(seat: number, cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other'): void;
  markAbilityUsed(seat: number): void;
  
  // 階段控制
  startNight(): void;
  startDay(): void;
  
  // 夜間順序
  generateNightOrder(isFirstNight: boolean): NightOrderItem[];

  // 邪惡方輔助（第一夜用）
  getMinionPlayers(): Player[];
  getDemonPlayer(): Player | undefined;
  generateDemonBluffs(): string[];
  getDemonBluffs(): string[];
  
  // 歷史記錄
  logEvent(event: Omit<GameEvent, 'id' | 'timestamp' | 'night' | 'day'>): void;
  getHistory(): GameEvent[];
  
  // 狀態導出
  getState(): GameState;
}
```

---

## 方法詳細規格

### constructor()

**功能**: 初始化遊戲狀態管理器

**實作細節**:
```typescript
constructor() {
  // 1. 初始化空白遊戲狀態
  this.state = {
    night: 0,
    day: 0,
    phase: 'setup',
    players: new Map(),
    playerCount: 0,
    history: [],
    setupComplete: false,
    selectedRoles: []
  };
  
  // 2. 載入角色資料到註冊表
  this.roleRegistry = new Map();
  rolesData.forEach(role => {
    this.roleRegistry.set(role.id, role);
  });
}
```

---

### initializePlayers()
**限制**
- 不可重複初始化
- seat 不可重複
- roleId 必須存在
- 初始化後自動排序

**錯誤處理**
- 發現非法資料 → throw Error

**功能**: 初始化所有玩家

**輸入**:
```typescript
players: Array<{
  seat: number;    // 座位號碼（1-15）
  name: string;    // 玩家名稱
  role: string;    // 角色 ID
}>
```

**輸出**: `void`

**行為**:
1. 清空現有玩家列表
2. 為每個玩家建立 `Player` 物件
3. 從角色註冊表獲取角色資料
4. 設定初始狀態（存活、無中毒等）
5. 更新玩家總數
6. 標記設置完成
7. 記錄初始化事件

**範例**:
```typescript
manager.initializePlayers([
  { seat: 1, name: '小明', role: 'fortuneteller' },
  { seat: 2, name: '小紅', role: 'poisoner' },
  { seat: 3, name: '小華', role: 'imp' }
]);
```

**錯誤處理**:
- 如果角色 ID 不存在，拋出錯誤：`Unknown role: ${role}`

---

### getPlayer()

**功能**: 獲取指定座位的玩家

**輸入**: `seat: number`

**輸出**: `Player | undefined`

**範例**:
```typescript
const player = manager.getPlayer(1);
if (player) {
  console.log(player.name, player.role);
}
```

---

### getAllPlayers()

**功能**: 獲取所有玩家（包含死亡）

**輸出**: `Player[]`

**範例**:
```typescript
const allPlayers = manager.getAllPlayers();
console.log(`總玩家數：${allPlayers.length}`);
```

---

### getAlivePlayers()

**功能**: 獲取所有存活玩家

**輸出**: `Player[]`

**範例**:
```typescript
const alive = manager.getAlivePlayers();
console.log(`存活玩家：${alive.length}`);
```

---

### addStatus()

**限制**
- 若玩家不存在 → 忽略
- 若玩家已死亡 → 不加入
- 若狀態已存在 → 不重複加入

**功能**: 給玩家添加狀態效果

**輸入**:
- `seat: number` - 座位號碼
- `type: 'poisoned' | 'protected' | 'drunk'` - 狀態類型
- `data?: any` - 額外資料（如酒鬼認為的角色）

**行為**
- 狀態變化必須記錄歷史事件

**中毒 (poisoned)**:
```typescript
manager.addStatus(3, 'poisoned');
// 設定 player.isPoisoned = true
// 記錄事件：玩家被中毒
```

**保護 (protected)**:
```typescript
manager.addStatus(5, 'protected');
// 設定 player.isProtected = true
// 記錄事件：玩家受到保護
```

**醉酒 (drunk)**:
```typescript
manager.addStatus(2, 'drunk', { believesRole: 'fortuneteller' });
// 設定 player.isDrunk = true
// 設定 player.believesRole = 'fortuneteller'
// 記錄事件：玩家是酒鬼
```

---

### removeStatus()
**限制**
- 不存在狀態 → 忽略

**功能**: 移除玩家的狀態效果

**輸入**:
- `seat: number`
- `type: 'poisoned' | 'protected'`

**注意**: 醉酒狀態無法移除（永久狀態）

---

### hasStatus()

**功能**: 檢查玩家是否有某狀態

**行為**
- 若玩家不存在 → 回傳 false

**輸入**:
- `seat: number`
- `type: 'poisoned' | 'protected' | 'drunk'`

**輸出**: `boolean`

**範例**:
```typescript
if (manager.hasStatus(3, 'poisoned')) {
  console.log('3號玩家中毒了');
}
```

---

### killPlayer()

**限制**
- 已死亡玩家再次 kill → 忽略
- kill 必須為冪等操作（idempotent）

**功能**: 殺死玩家

**輸入**:
- `seat: number`
- `cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other'`

**行為**:
1. 設定 `player.isAlive = false`
2. 記錄死亡時間（夜晚或白天）
3. 記錄死亡原因
4. 記錄死亡事件

**範例**:
```typescript
manager.killPlayer(5, 'demon_kill');
// 玩家 5 被惡魔殺死
```

---

### startNight()
**限制**
- 不可在 night 狀態重複呼叫

**功能**: 開始新的夜晚

**行為**:
1. 夜晚計數器 +1
2. 設定階段為 'night'
3. 清除所有保護狀態（保護只持續一晚）
4. 清除所有中毒狀態（中毒持續到隔日白天，進入下一夜時清除）
5. 記錄夜晚開始事件

**範例**:
```typescript
manager.startNight();
console.log(`第 ${manager.getState().night} 夜`);
```

---

### startDay()
**限制**
- 不可在 day 狀態重複呼叫

**功能**: 開始新的白天

**行為**:
1. 白天計數器 +1
2. 設定階段為 'day'
3. 記錄白天開始事件

---

### generateNightOrder()
**補充規則**
- 死亡角色仍列入順序（標記 isDead）
- drunk / poisoned 不影響排序
- priority 必須唯一

**功能**: 生成夜間行動順序清單

**輸入**: `isFirstNight: boolean` - 是否為第一夜

**輸出**: `NightOrderItem[]` - 排序後的夜間行動清單

**演算法**:
```
1. 遍歷所有玩家
2. 獲取角色的夜間優先級
   - 第一夜：使用 roleData.firstNight
   - 其他夜：使用 roleData.otherNight
3. 如果優先級 > 0，創建 NightOrderItem
4. 收集玩家的當前狀態（死亡、中毒、醉酒、保護）
5. 按優先級數字由小到大排序
6. 返回排序後的陣列
```

**輸出格式**:
```typescript
[
  {
    seat: 2,
    role: 'poisoner',
    roleName: '投毒者',
    priority: 17,
    isDead: false,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    reminder: '投毒者指向一位玩家。該玩家中毒。'
  },
  {
    seat: 1,
    role: 'fortuneteller',
    roleName: '占卜師',
    priority: 28,
    isDead: false,
    isPoisoned: true,
    isDrunk: false,
    isProtected: false,
    reminder: '占卜師指向兩位玩家...'
  }
]
```

**範例**:
```typescript
manager.startNight();
const order = manager.generateNightOrder(false); // 其他夜晚
order.forEach(item => {
  console.log(`${item.seat}號 - ${item.roleName}`);
  if (item.isPoisoned) console.log('  ⚠️ 中毒');
  if (item.isDead) console.log('  💀 死亡');
});
```

---

### logEvent()
**限制**
- 不可修改既有 event
- id 必須唯一
- timestamp 使用系統時間

**功能**: 記錄遊戲事件

**輸入**:
```typescript
event: {
  type: 'role_change' | 'death' | 'poison' | 'protection' | 'ability_use' | 'nomination' | 'vote';
  description: string;
  details: any;
}
```

**行為**:
1. 自動生成唯一 ID
2. 記錄時間戳
3. 記錄當前夜晚/白天
4. 加入歷史陣列

**範例**:
```typescript
manager.logEvent({
  type: 'poison',
  description: '投毒者下毒 3號玩家',
  details: { poisoner: 2, target: 3 }
});
```

---

## 使用範例

### 完整遊戲流程
```typescript
// 1. 初始化
const manager = new GameStateManager();
manager.initializePlayers([
  { seat: 1, name: '玩家1', role: 'fortuneteller' },
  { seat: 2, name: '玩家2', role: 'monk' },
  { seat: 3, name: '玩家3', role: 'poisoner' },
  { seat: 4, name: '玩家4', role: 'imp' }
]);

// 2. 第一夜
manager.startNight();
// 中毒狀態被清除
const firstNightOrder = manager.generateNightOrder(true);

// 3. 處理投毒者能力
manager.addStatus(1, 'poisoned'); // 下毒占卜師

// 4. 處理僧侶能力
manager.addStatus(2, 'protected'); // 保護2號

// 5. 處理惡魔擊殺（被保護，失敗）
// 擊殺邏輯在 RuleEngine 中處理

// 6. 第一天
manager.startDay();

// 7. 查看歷史
const history = manager.getHistory();
history.forEach(event => {
  console.log(`${event.description}`);
});
```

---

## 注意事項

1. **狀態持續時間**
   - 保護：只持續一個夜晚（`startNight()` 時清除）
   - 中毒：持續到白天結束（`startDay()` 時清除）
   - 醉酒：永久（無法移除）

2. **線程安全**
   - 此類別不是線程安全的
   - 假設在單執行緒環境中使用（Electron 主渲染程序）

3. **錯誤處理**
   - 無效的角色 ID 會拋出錯誤
   - 獲取不存在的玩家返回 `undefined`
   - 狀態操作在玩家不存在時靜默失敗

4. **效能考量**
   - 玩家數量通常 < 20，所有操作都是 O(n) 或更好
   - `generateNightOrder()` 是 O(n log n) 因為排序
   - 歷史記錄會隨遊戲進行增長，但通常 < 1000 條