# 資料格式說明文件

本文件說明專案中使用的所有資料格式。

---

## 角色資料格式

### 檔案位置
`src/data/roles/trouble-brewing.json`

### JSON 結構
```json
[
  {
    "id": "fortuneteller",
    "name": "Fortune Teller",
    "name_cn": "占卜師",
    "team": "townsfolk",
    "ability": "Each night, choose 2 players: you learn if either is a Demon...",
    "firstNight": 28,
    "firstNightReminder": "The Fortune Teller points to two players...",
    "otherNight": 39,
    "otherNightReminder": "The Fortune Teller points to two players...",
    "reminders": ["Red Herring"],
    "setup": false,
    "affectedByPoison": true,
    "affectedByDrunk": true,
    "worksWhenDead": false
  }
]
```

### 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✓ | 角色唯一識別碼（英文小寫） |
| `name` | string | ✓ | 角色英文名稱 |
| `name_cn` | string | ✓ | 角色中文名稱 |
| `team` | string | ✓ | 陣營：`townsfolk`、`outsider`、`minion`、`demon` |
| `ability` | string | ✓ | 能力描述（英文） |
| `firstNight` | number | ✓ | 第一夜行動順序（0 表示不行動） |
| `firstNightReminder` | string | ✓ | 第一夜說書人提示 |
| `otherNight` | number | ✓ | 其他夜晚行動順序（0 表示不行動） |
| `otherNightReminder` | string | ✓ | 其他夜晚說書人提示 |
| `reminders` | string[] | ✓ | 提示標記列表 |
| `setup` | boolean | ✓ | 是否影響遊戲設置（如男爵） |
| `affectedByPoison` | boolean | ✓ | 是否受中毒影響 |
| `affectedByDrunk` | boolean | ✓ | 是否受醉酒影響 |
| `worksWhenDead` | boolean | ✓ | 死後是否仍有能力 |

### 夜間順序數字參考
```
第一夜順序：
1-10    : 設置相關（惡魔爪牙醒來等）
11-20   : 資訊收集（侍女、圖書館員等）
21-30   : 夜間能力（占卜師、共情者等）
31-40   : 死亡檢測（守夜人等）

其他夜晚順序：
1-10    : 狀態設置（毒藥師、僧侶等）
11-20   : 惡魔行動
21-40   : 資訊收集
41-50   : 死亡後能力（守鴉人等）
```

### 完整範例

#### 占卜師
```json
{
  "id": "fortuneteller",
  "name": "Fortune Teller",
  "name_cn": "占卜師",
  "team": "townsfolk",
  "ability": "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
  "firstNight": 28,
  "firstNightReminder": "The Fortune Teller points to two players. Give the head signal (nod yes, shake no) for whether one of those players is the Demon.",
  "otherNight": 39,
  "otherNightReminder": "The Fortune Teller points to two players. Show the head signal (nod 'yes', shake 'no') for whether one of those players is the Demon.",
  "reminders": ["Red Herring"],
  "setup": false,
  "affectedByPoison": true,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

#### 小惡魔
```json
{
  "id": "imp",
  "name": "Imp",
  "name_cn": "小惡魔",
  "team": "demon",
  "ability": "Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 24,
  "otherNightReminder": "The Imp points to a player. That player dies.",
  "reminders": ["Dead"],
  "setup": false,
  "affectedByPoison": false,
  "affectedByDrunk": true,
  "worksWhenDead": false
}
```

#### 酒鬼
```json
{
  "id": "drunk",
  "name": "Drunk",
  "name_cn": "酒鬼",
  "team": "outsider",
  "ability": "You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.",
  "firstNight": 0,
  "firstNightReminder": "",
  "otherNight": 0,
  "otherNightReminder": "",
  "reminders": [],
  "setup": true,
  "affectedByPoison": false,
  "affectedByDrunk": false,
  "worksWhenDead": false
}
```

---

## Jinx 資料格式

### 檔案位置
`src/data/jinxes.json`

### JSON 結構
```json
[
  {
    "id": "fortuneteller_spy",
    "role1": "fortuneteller",
    "role2": "spy",
    "reason": "間諜對占卜師顯示為善良。"
  }
]
```

### 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✓ | Jinx 唯一識別碼（通常為 role1_role2） |
| `role1` | string | ✓ | 第一個角色 ID |
| `role2` | string | ✓ | 第二個角色 ID |
| `reason` | string | ✓ | Jinx 效果說明（繁體中文） |

### 完整範例
```json
[
  {
    "id": "fortuneteller_spy",
    "role1": "fortuneteller",
    "role2": "spy",
    "reason": "間諜對占卜師顯示為善良。"
  },
  {
    "id": "fortuneteller_recluse",
    "role1": "fortuneteller",
    "role2": "recluse",
    "reason": "隱士可以對占卜師顯示為惡魔。"
  },
  {
    "id": "monk_poisoner",
    "role1": "monk",
    "role2": "poisoner",
    "reason": "如果毒藥師中毒僧侶保護的玩家，該保護仍然有效。"
  }
]
```

---

## TypeScript 類型定義

### 從 JSON 到 TypeScript

#### 角色資料類型
```typescript
interface RoleData {
  id: string;
  name: string;
  name_cn: string;
  team: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  ability: string;
  firstNight: number;
  firstNightReminder: string;
  otherNight: number;
  otherNightReminder: string;
  reminders: string[];
  setup: boolean;
  affectedByPoison: boolean;
  affectedByDrunk: boolean;
  worksWhenDead: boolean;
}
```

#### Jinx 類型
```typescript
interface Jinx {
  id: string;
  role1: string;
  role2: string;
  reason: string;
}
```

### 載入資料
```typescript
// 載入角色資料
import rolesData from './data/roles/trouble-brewing.json';
const roles: RoleData[] = rolesData as RoleData[];

// 載入 Jinx 資料
import jinxesData from './data/jinxes.json';
const jinxes: Jinx[] = jinxesData as Jinx[];
```

---

## 資料驗證

### 驗證腳本

建立 `src/data/validate.ts`：
```typescript
import rolesData from './roles/trouble-brewing.json';
import jinxesData from './jinxes.json';

function validateRoles(): boolean {
  const errors: string[] = [];
  
  rolesData.forEach((role, index) => {
    // 檢查必填欄位
    if (!role.id) errors.push(`角色 ${index}: 缺少 id`);
    if (!role.name) errors.push(`角色 ${index}: 缺少 name`);
    if (!role.name_cn) errors.push(`角色 ${index}: 缺少 name_cn`);
    
    // 檢查陣營
    const validTeams = ['townsfolk', 'outsider', 'minion', 'demon'];
    if (!validTeams.includes(role.team)) {
      errors.push(`角色 ${role.id}: 無效的陣營 ${role.team}`);
    }
    
    // 檢查夜間順序
    if (role.firstNight < 0 || role.firstNight > 100) {
      errors.push(`角色 ${role.id}: firstNight 超出範圍`);
    }
  });
  
  if (errors.length > 0) {
    console.error('資料驗證失敗：');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }
  
  console.log(`✓ ${rolesData.length} 個角色驗證通過`);
  return true;
}

function validateJinxes(): boolean {
  const errors: string[] = [];
  const roleIds = new Set(rolesData.map(r => r.id));
  
  jinxesData.forEach((jinx, index) => {
    // 檢查角色存在
    if (!roleIds.has(jinx.role1)) {
      errors.push(`Jinx ${index}: role1 "${jinx.role1}" 不存在`);
    }
    if (!roleIds.has(jinx.role2)) {
      errors.push(`Jinx ${index}: role2 "${jinx.role2}" 不存在`);
    }
  });
  
  if (errors.length > 0) {
    console.error('Jinx 驗證失敗：');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }
  
  console.log(`✓ ${jinxesData.length} 個 Jinx 驗證通過`);
  return true;
}

// 執行驗證
validateRoles();
validateJinxes();
```

### 執行驗證
```bash
npx ts-node src/data/validate.ts
```

---

## 資料來源

### 官方來源

角色資料來自：
- [Pocket Grimoire](https://github.com/Skateside/pocket-grimoire)
- [Blood on the Clocktower 官方網站](https://bloodontheclocktower.com/)

### 資料更新流程

1. 從 Pocket Grimoire 下載最新 JSON
2. 轉換格式（如需要）
3. 添加繁體中文翻譯
4. 執行驗證腳本
5. 提交到版本控制

---

##　人數配置

###　5人
3 村民 / 0 外來者 / 1 爪牙 / 1 惡魔
###　6人
3 村民 / 1 外來者 / 1 爪牙 / 1 惡魔
###　7人
5 村民 / 0 外來者 / 1 爪牙 / 1 惡魔
###　8人
5 村民 / 1 外來者 / 1 爪牙 / 1 惡魔
###　9人
5 村民 / 2 外來者 / 1 爪牙 / 1 惡魔
###　10人
7 村民 / 0 外來者 / 2 爪牙 / 1 惡魔
###　11人
7 村民 / 1 外來者 / 2 爪牙 / 1 惡魔
###　12人
7 村民 / 2 外來者 / 2 爪牙 / 1 惡魔
###　13人
9 村民 / 0 外來者 / 3 爪牙 / 1 惡魔
###　14人
9 村民 / 1 外來者 / 3 爪牙 / 1 惡魔
###　15人
9 村民 / 2 外來者 / 3 爪牙 / 1 惡魔


## Trouble Brewing 完整角色清單

### 鎮民 (Townsfolk) - 7個

1. **侍女** (Washerwoman) - firstNight: 23
2. **圖書館員** (Librarian) - firstNight: 24
3. **調查員** (Investigator) - firstNight: 25
4. **廚師** (Chef) - firstNight: 26
5. **共情者** (Empath) - firstNight: 27, otherNight: 38
6. **占卜師** (Fortune Teller) - firstNight: 28, otherNight: 39
7. **守夜人** (Undertaker) - otherNight: 40
8. **僧侶** (Monk) - otherNight: 12
9. **守鴉人** (Ravenkeeper) - otherNight: 41
10. **聖女** (Virgin) - 白天能力
11. **獵手** (Slayer) - 白天能力
12. **士兵** (Soldier) - 被動能力
13. **市長** (Mayor) - 被動能力

### 外來者 (Outsider) - 4個

1. **管家** (Butler) - firstNight: 29, otherNight: 42
2. **酒鬼** (Drunk) - setup: true
3. **隱士** (Recluse) - 被動能力
4. **聖徒** (Saint) - 被動能力

### 爪牙 (Minion) - 4個

1. **投毒者** (Poisoner) - firstNight: 17, otherNight: 8
2. **間諜** (Spy) - firstNight: 48, otherNight: 68
3. **猩紅女郎** (Scarlet Woman) - otherNight: 19
4. **男爵** (Baron) - setup: true

### 惡魔 (Demon) - 1個

1. **小惡魔** (Imp) - otherNight: 24

---

## 注意事項

1. **JSON 格式**
   - 使用 UTF-8 編碼
   - 確保有效的 JSON 語法
   - 使用 2 空格縮排

2. **ID 命名規範**
   - 全部小寫
   - 使用英文
   - 無空格（用底線連接）

3. **繁體中文**
   - 角色名稱使用官方翻譯
   - Jinx 說明使用清楚易懂的中文

4. **版本控制**
   - JSON 檔案加入 Git
   - 重大更新時增加版本標籤