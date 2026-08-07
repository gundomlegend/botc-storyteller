# 註冊機制收斂 與 間諜實作 — 執行計畫

> 狀態：規劃完成，尚未動工
> 涵蓋：陌客（Recluse）/ 間諜（Spy）的「被視為」機制收斂，以及間諜角色的完整實作

---

## 📌 一句話總結

把散落在 7 個 handler、有 4 種寫法的「註冊（registration）」判斷，收斂成單一無狀態模組；
在其上加一層「預設偽裝人格」降低說書人決策負擔；最後補上唯一未實作的角色：間諜。

---

## 🐛 起因：一個已確認的 bug

Chef / Empath 給說書人看的註記文字，與引擎實際的計算結果**互相矛盾**。

實測結果（臨時測試，已刪除）：

| 情境 | 引擎實際計算 | 畫面顯示的註記 |
|------|-------------|---------------|
| 中毒陌客（2號） | `evilSeats: [3]` — 2號**不**算邪惡 ✅ | 「陌客 2號 **被視為邪惡**」❌ |
| 中毒間諜（2號） | `evilSeats: [2,3]` — 2號**算**邪惡 ✅ | 「間諜 2號 **不被視為邪惡**」❌ |
| 中毒陌客鄰居（Empath） | `actualEvilCount: 0` ✅ | 「陌客 1號 被視為邪惡」❌ |

**根因**：[ChefHandler.ts:94-100](../src/engine/handlers/ChefHandler.ts#L94) 的 `isEvilForChef()` 有檢查中毒/醉酒，
但 `recluseSeats` / `spySeats` 的收集**完全沒檢查** —— 同一件事算了兩次、規則不同。
`EmpathHandler` 一模一樣（程式碼是複製的）。

**為什麼測試沒抓到**：現有測試只斷言 `evilSeats` / `actualPairCount`，從未斷言 `display` 文字。
而**說書人是照著註記文字唸的**，所以引擎算對了也沒用 —— 這是會實際給錯資訊的 bug。

**影響評估**：`recluseSeats` / `spySeats` 在 UI 只被寫進事件紀錄的 `details`
（[ChefProcessor.tsx:59](../src/components/roleProcessors/ChefProcessor.tsx#L59)、EmpathProcessor 同），
沒有參與任何渲染判斷，因此修改其語意風險低。

---

## 📖 規則依據

角色資料（`trouble-brewing.json`）的能力原文：

```
Recluse: 你可能被視為邪惡，且被視為爪牙或惡魔，即使你已死亡亦然。
Spy:     每晚，你可以查看魔典。你可能被視為好人，
         且被視為鎮民或外來者，即使你已死亡亦然。
```

由此確立的規則要點：

| # | 規則 | 對實作的意義 |
|---|------|-------------|
| 1 | 登記身分由說書人**逐次**決定，同一夜可被當作不同角色 | 註冊是**每次查驗的服務**，不是可預先設定的狀態 |
| 2 | **陣營與角色獨立判斷**（可為「善良的間諜」或「邪惡的鎮民」） | 資料模型必須雙軸，不可由 team 推導 alignment |
| 3 | 被當作某角色時**不獲得該角色能力** | resolver 只能進「產生資訊」路徑，禁止進入能力結算 |
| 4 | 間諜只能被當作鎮民/外來者 → **永遠不可能是惡魔** | 間諜永不觸發占卜師；現有 FT 只檢查陌客是**正確的** |
| 5 | 兩者皆「即使你已死亡亦然」 | 任何 `isAlive` 過濾都是錯的 |
| 6 | 中毒/醉酒的間諜看到的魔典**可能是錯的** | 走既有 `infoReliable` / `canLie` 機制 |
| 7 | 說書人自訂筆記**間諜看不到**；惡魔偽裝是否可見由說書人決定 | 魔典需要「可見性邊界」，不是全部倒出 |
| 8 | 官方建議：「可以但不建議」，應提供良好體驗而非尋求創意 | 工具應**預設一致**，變動需刻意 |

### ⚠️ 命名陷阱

`recluse` 與 `spy` 的資料都是 `affectedByPoison: false` / `affectedByDrunk: false`，
但所有 handler 都檢查 `!isPoisoned && !isDrunk` 才套用註冊。**兩者並不矛盾，是同名不同義**：

- 那兩個旗標在 [RuleEngine.ts:114](../src/engine/RuleEngine.ts#L114) 只用來算「該角色**自己拿到的資訊**可不可靠」
- 「註冊會不會被中毒關掉」是另一回事，由 handler 各自處理

handler 現行行為（中毒陌客不登記為邪惡）是**正確的**，但這個命名衝突是地雷：
日後有人讀到 `affectedByPoison: false` 極可能推論成「中毒陌客照樣算邪惡」然後改壞。
**必須寫進 contract 文件**。

---

## 🔍 現況盤點

「註冊判斷」散落 7 個 handler，共 4 種寫法：

| Handler | 寫法 | 問題 |
|---------|------|------|
| Chef / Empath | 私有 `isEvilForXxx()` + **另外**算註記 | 上述 bug |
| Fortuneteller | inline 判斷，只處理陌客 | ✅ 規則上正確，不需改 |
| Undertaker / Ravenkeeper | inline，拆 `isRecluse` / `isSpy` 兩旗標 | 寫法一致但重複 |
| Investigator | inline，**且多檢查 `p.isAlive`** | ❌ 違反「即使已死亡」 |
| Librarian / Washerwoman | 只處理間諜，陌客拉成獨立清單 | 又是另一套 |

### 參考實作與其缺陷

[UndertakerHandler.ts:62-80](../src/engine/handlers/UndertakerHandler.ts#L62) 的 `selectableRoles`
**方向正確** —— 判斷出「能力正常的陌客」後，列出可選的**具體角色清單**讓說書人挑，
而非只給一個 good/evil 布林值。這是全專案最接近規則的實作，收斂時以它為範本。

但它的**範圍太窄**：

```ts
.filter(p => p.isAlive && (p.team === 'minion' || p.team === 'demon'))
```

規則是「被當作是一個特定的鎮民或外來者角色」—— **劇本內任一該類型角色**，
既不限定在場、也不限定存活。推廣時需一併修正。

---

## 🏗 架構設計

### 一、`Registration` — 無狀態的每次呼叫服務

```ts
// 說書人可選的範圍（由 resolver 計算）
interface RegistrationOptions {
  seat: number;
  trueTeam: Team;
  trueRole: string;
  abilityActive: boolean;          // 中毒/醉酒 → false，只能以真實身分登記
  registrableTeams: Team[];        // 陌客 → [minion, demon]；間諜 → [townsfolk, outsider]
  registrableCharacters: string[]; // 劇本內該類型全部角色（不在場者優先排序）
  requiresChoice: boolean;
}

// 說書人選定後的結果 —— 下游 handler 只認這個
interface ResolvedRegistration {
  alignment: 'good' | 'evil';                      // 獨立軸
  character: { team: Team; role: string } | null;  // 獨立軸；null = 以真實角色登記
}
```

**設計要點**

- **雙軸互不推導**。暗流湧動裡沒有同時查陣營＋角色的能力，現在看不出差別；
  但模型若先綁死，日後擴充劇本要整包重寫。
- **無狀態**。不持有任何遊戲狀態，每次結算時呼叫。
- **只進資訊路徑**。禁止被 `processAbility` 的狀態變更路徑呼叫（規則要點 #3）。
- **註記文字由結果產生**，不可獨立計算 —— 這是根治起因 bug 的關鍵。

### 二、`RegistrationPersona` — 降低決策負擔的預設人格

完全照規則（每次查驗都問）會讓說書人疲於決策，且缺乏上下文。
官方規則本身即建議「預設一致、變動要刻意」（規則要點 #8），故採三層結構：

| 層 | 內容 | 說書人負擔 |
|----|------|-----------|
| **陣營軸** | 用預設值：間諜→善良、陌客→邪惡（即現行行為） | 整局幾乎不用管 |
| **角色軸** | 一個「預設偽裝角色」，整局沿用 | **只決定 1 次** |
| **覆寫** | 每個查驗點可改，但不動預設（除非勾選） | 僅特殊情況 |

```ts
// 持久化於 GameState，可隨時修改
interface RegistrationPersona {
  seat: number;
  alignment: 'good' | 'evil' | null;  // null = 以真實陣營登記
  character: string | null;            // null = 尚未設定，首次查驗時詢問
}
```

覆寫時**不寫回** persona，除非說書人勾選「設為之後的預設」。

### 三、時機點：機械判定，不是判斷題

「何時該問說書人」不應由任何人（或 AI）挑，而是結構性算出來的：

```ts
requiresChoice = isSpecialRole(player) && abilityActive && persona.character === null
```

因此拆成兩件事：

- **「什麼時候要決定」→ 機械判定**，由 Registration 模組算，零判斷
- **「要決定成什麼」→ 人的判斷**，且因有預設人格，整局只需判斷一次

這也是 Registration 必須無狀態、每次呼叫的原因：時機點才會自動浮現，
而不需要有人記得去觸發。

### 四、一致性提示（提醒，不強制）

每次實際登記結果寫入事件紀錄。當說書人覆寫預設人格時，顯示軟提示：

> 間諜本局先前登記為「洗衣婦」（第 1 夜、第 2 夜），這次改為「廚師」。玩家可能察覺矛盾。

只提醒、不阻擋 —— 正好對應規則的「可以但不建議」。

### 五、魔典可見性邊界

| 內容 | 間諜可見 |
|------|---------|
| 角色標記 | ✅ |
| 提示標記 | ✅ |
| 玩家陣營 | ✅ |
| 說書人自訂筆記 | ❌ **絕對不可** |
| 惡魔的三張偽裝 | ⚠️ 說書人決定 |

專案目前**沒有**「間諜可見 vs 說書人私有」的區分。
日後新增任何說書人備註功能都須標記可見性，否則會漏。此界線需在 PR 5 立起來。

---

## 📦 PR 切分

| PR | 範圍 | 依賴 |
|----|------|------|
| 1 🔴 | 修 Chef/Empath 註記矛盾 | 無 |
| 2 | `Registration.ts` + contract 文件 | PR 1 |
| 3 | 全 handler 接上 resolver | PR 2 |
| 4 | 預設人格 + 覆寫 UI | PR 3 |
| 5 | `SpyHandler` + 魔典可見性模型 | PR 2 |
| 6 | `SpyProcessor` UI | PR 5 |

---

### PR 1 🔴 — 修 Chef/Empath 註記矛盾

**性質**：純 bug fix，不重構。現在就在給錯資訊，優先度最高。

**檔案**：`src/engine/handlers/ChefHandler.ts`、`src/engine/handlers/EmpathHandler.ts`

**作法**：`buildSpecialRoleNotes()` 改為接收**已解析的判斷結果**而非原始座位清單，
註記文字由 `isEvilForChef()` 的實際回傳值產生，從構造上杜絕矛盾。

**驗測方法**

先寫**會失敗的測試**證明 bug 存在，再修：

```bash
npx vitest run src/engine/handlers/__tests__/handlers.test.ts -t 陌客
```

新增斷言（目前 display 文字**零覆蓋**）：

- 中毒陌客 → `display` 不得出現「被視為邪惡」
- 中毒間諜 → `display` 不得出現「不被視為邪惡」
- Empath 對應兩項

**關鍵不變式測試**（防復發的核心，比逐一列舉情境有效）：

```ts
// 對每個 recluse/spy：註記說「被視為邪惡」⇔ 該座位必須在 evilSeats 裡
expect(noteSaysEvil(seat)).toBe(evilSeats.includes(seat));
```

---

### PR 2 — `Registration` 模組 + contract 文件

**檔案**：
- 新增 `src/engine/Registration.ts`
- 新增 `docs/contracts/Registration.contract.md`（含「命名陷阱」一節）
- 改：`ChefHandler` / `EmpathHandler` / `FortunetellerHandler` 接上

**驗測方法**

這是**純重構、行為不變**，驗收標準即：

> PR 1 之後的測試**一個都不用改**，全部保持綠燈。
> 若需要改測試，代表重構改到行為了，必須停下檢查。

```bash
npx vitest run
```

外加 `Registration.contract.test.ts` 矩陣表，鎖死 resolver 本身：

`(陌客 / 間諜) × (正常 / 中毒 / 醉酒) × (存活 / 死亡)` = 12 組

---

### PR 3 — 全 handler 接上 resolver

**性質**：含**行為變更**，故獨立於 PR 2 的純重構之外。

**檔案**：`Undertaker` / `Ravenkeeper` / `Investigator` / `Librarian` / `Washerwoman`

**行為變更**（兩項，皆為修正既有錯誤）：
1. 拿掉 Investigator 多餘的 `p.isAlive` —— 違反「即使已死亡亦然」
2. 修正 `selectableRoles` 範圍 —— 應為劇本內該類型全部角色，非僅存活在場者

**驗測方法**

跨 handler 一致性矩陣：同一玩家餵進全部 7 個 handler，斷言登記判斷一致。
此表會直接暴露「某個 handler 忘了接上 resolver」。

```ts
// 中毒陌客在 Chef/Empath/FT/Undertaker/Ravenkeeper/Investigator/Librarian
// 眼中都必須「不被視為邪惡 / 不可註冊為邪惡角色」
```

---

### PR 4 — 預設人格 + 覆寫 UI

**檔案**：`RegistrationPersona` 狀態（`gameStore` / `GameState`）、共用選擇器元件、軟提示

**驗測方法**

1. 未設定 persona 時，首次查驗跳詢問；**第二次不跳**
2. 勾選「設為預設」後 persona 更新
3. **不**勾選則 persona 不變（覆寫僅影響當次）
4. 覆寫時出現一致性軟提示
5. 同一夜連續兩次查驗可給不同答案（規則允許）

---

### PR 5 — `SpyHandler` + 魔典可見性模型

**檔案**：
- 新增 `src/engine/handlers/SpyHandler.ts`
- 註冊至 `RuleEngine` handlers map
- 改 `trouble-brewing.json`：`spy` 的 `affectedByPoison` / `affectedByDrunk` → `true`
  （現值 `false` 與規則要點 #6 相反）

**注意**：`worksWhenDead: true` 已由 [RuleEngine.ts:102](../src/engine/RuleEngine.ts#L102) 支援，引擎不需改。

**驗測方法**

- 死亡間諜仍取得魔典（`worksWhenDead`）
- 中毒間諜 → `infoReliable: false` 且 `canLie: true`
- 魔典快照含全員真實角色 / 狀態 / `believesRole`
- **酒鬼玩家在魔典顯示真實角色而非 `believesRole`**（易寫錯）
- **說書人自訂筆記不得出現在輸出**

---

### PR 6 — `SpyProcessor` UI

**檔案**：新增 `src/components/roleProcessors/SpyProcessor.tsx`、註冊至 `ROLE_PROCESSORS`

**注意**：專案目前**沒有**任何魔典檢視元件（「說書人魔典」僅為視窗標題），
此元件為本項工作主要成本。

**投影視窗不需修改** —— 走既有 `nightAction: 'waking'` 流程，
自動顯示「X號 間諜 請睜眼」。

**驗測方法**

```bash
npm run dev
```

手動 smoke 檢查清單：
1. 起一局含間諜的遊戲
2. 夜晚走到間諜 → 說書人端顯示完整魔典
3. **公共投影視窗顯示「X號 間諜 請睜眼」而非魔典內容** ← 最重要，魔典絕不可外洩

---

## ✅ 已解決的決策記錄

| 問題 | 結論 | 依據 |
|------|------|------|
| Investigator 的 `isAlive` 該留嗎？ | 拿掉 | 兩角色均明寫「即使你已死亡亦然」 |
| 占卜師要不要處理間諜？ | 不用，現行正確 | 間諜只能被當作鎮民/外來者，永不為惡魔 |
| 中毒間諜看到什麼魔典？ | 假魔典（走 `canLie`） | 「查看魔典也屬於獲取訊息」 |
| 魔典顯示到什麼程度？ | 角色＋提示標記＋陣營；排除說書人筆記 | 規則要點 #7 |
| 每次查驗都問說書人？ | 否，改預設人格 + 覆寫 | 規則要點 #8 |

---

## 📎 附記：夜晚順序

實體版暗流湧動將間諜置於投毒者（首夜）/ 僧侶（非首夜）之後，
以避免新手接觸過多資訊；線上魔典則置於接近黎明處。

本專案資料採線上順序（`firstNight: 48` / `otherNight: 68`），
即官方建議熟練玩家使用的順序，**維持現狀不改**。
