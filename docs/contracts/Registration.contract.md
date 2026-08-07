# Registration Contract（註冊合約）

本文件定義「某玩家在其他角色眼中被視為什麼」的不可違反規則。
任何 Handler / RuleEngine / UI 實作不得違背。

實作：`src/engine/Registration.ts`

---

## 名詞

**註冊（registration）**：陌客與間諜的能力不改變自身身分，只改變「別人查到自己時看到什麼」。

| 角色 | 能力原文 |
|------|---------|
| 陌客 Recluse | 你可能被視為邪惡，且被視為爪牙或惡魔，即使你已死亡亦然。 |
| 間諜 Spy | 每晚，你可以查看魔典。你可能被視為好人，且被視為鎮民或外來者，即使你已死亡亦然。 |

---

## AC1：陣營與角色是獨立兩軸

登記結果由**兩個互不推導**的軸構成：

- **陣營軸**：good / evil
- **角色軸**：具體角色（連帶其類型 townsfolk / outsider / minion / demon）

規則明訂兩者獨立判斷，可出現「善良的間諜」或「邪惡的鎮民」。

> **不得**由 team 推導 alignment，亦不得反向推導。
> 暗流湧動無同時查驗兩軸的能力，故現階段看不出差異；但模型若先綁死，
> 擴充其他劇本時需整包重寫。

---

## AC2：登記能力可被中毒 / 醉酒關閉

當陌客或間諜為 `isPoisoned` 或 `isDrunk` 時，登記能力失效，**只能以真實身分登記**。

| 狀態 | 陌客 | 間諜 |
|------|------|------|
| 正常 | 可被視為邪惡 / 爪牙 / 惡魔 | 可被視為善良 / 鎮民 / 外來者 |
| 中毒或醉酒 | 以真實身分：善良的外來者 | 以真實身分：邪惡的爪牙 |

### ⚠️ 命名陷阱（必讀）

角色資料中 `recluse` 與 `spy` 皆為 `affectedByPoison: false` / `affectedByDrunk: false`。
**這與 AC2 並不矛盾，因為兩者指的不是同一件事**：

| 項目 | 意義 | 位置 |
|------|------|------|
| `affectedByPoison` / `affectedByDrunk` | 該角色**自己拿到的資訊**可不可靠 | `RuleEngine.ts` 計算 `infoReliable` |
| 本合約 AC2 | 該角色**在別人眼中**的登記能力是否生效 | `Registration.ts` |

> 切勿因為看到 `affectedByPoison: false` 就推論「中毒陌客照樣被視為邪惡」。
> 這是相反的。登記能力**會**被中毒關閉。

---

## AC3：死亡不影響登記

兩個角色的能力皆明訂「即使你已死亡亦然」。

> 任何以 `isAlive` 過濾登記結果的實作皆違反本合約。

---

## AC4：登記不轉移能力

被當作某角色時，**不獲得該角色的能力**。
（規則範例：被當作獵手的間諜無法獵殺惡魔。）

> `Registration.ts` 只可被 Handler 的「產生資訊」路徑呼叫。
> **禁止**被 `processAbility` 的狀態變更路徑呼叫。

---

## AC5：登記範圍不限在場、不限存活

「被當作是一個特定的鎮民或外來者角色」＝**劇本內任一該類型角色**。

- ❌ 不得限定為在場角色
- ❌ 不得限定為存活角色（違反 AC3）
- ✅ 可將不在場角色**優先排序**（登記成在場角色易與真人宣稱撞角色而露餡），但不得排除在場角色

---

## AC6：說明文字必須由判斷結果推導

任何呈現給說書人的登記說明文字，必須由登記判斷的**實際結果**產生，
不得獨立計算。

> **背景**：Chef / Empath 曾各自計算註記文字與邪惡判定，兩者規則不一致，
> 導致中毒陌客的畫面顯示「被視為邪惡」但引擎實際未計入。
> 說書人照著註記唸，等同直接給錯資訊。
>
> 不變式測試：**註記宣稱「被視為邪惡」⇔ 該座位必須在 `evilSeats` 內**。

---

## AC7：無狀態

`Registration.ts` 不得持有任何遊戲狀態，每次結算時呼叫。

如此「何時需要說書人決定」可由結構自動算出：

```ts
requiresChoice = hasRegistrationAbility(p) && isRegistrationAbilityActive(p) && persona.character === null
```

而不需要任何人（或 AI）判斷時機點。

> 說書人的**預設偽裝人格**（`RegistrationPersona`）是另一層，持久化於 GameState，
> 不屬於本模組。見 PR 4。

---

## 對照表：各角色關心哪一軸

| Handler | 關心的軸 | 使用的 API |
|---------|---------|-----------|
| Chef / Empath | 陣營 | `registersAsEvil()` |
| Fortuneteller | 角色類型（是否為惡魔） | `mayRegisterAsTeam(p, 'demon')` |
| Washerwoman / Librarian / Investigator | 角色類型 + 具體角色 | `getRegistrationOptions()` |
| Undertaker / Ravenkeeper | 具體角色 | `getRegistrationOptions()` |

### 間諜永不觸發占卜師

間諜只能被視為鎮民 / 外來者，故 `mayRegisterAsTeam(spy, 'demon')` 恆為 false。
此性質由 `REGISTRATION_ABILITIES` 的資料保證，**不需呼叫端記得排除**。

---

## 測試

`src/engine/__tests__/Registration.contract.test.ts`

矩陣：`(陌客 / 間諜) × (正常 / 中毒 / 醉酒) × (存活 / 死亡)` = 12 組
