# Ability Invalidation Contract（能力失效合約）

本文件定義「能力何時視為失效」的不可違反規則。任何 RuleEngine / Handler / UI 實作不得違背。

---

## AC1：狀態類失效（醉酒 / 中毒）

當玩家被標記為「醉酒」或「中毒」時：

1. 主動技能：玩家仍會被喚醒，但其行動產生的效果（如保護、下毒、擊殺）不得造成實質狀態變更或擊殺結果。
2. 資訊獲取：玩家獲得的資訊必須由說書人隨意提供，不保證正確性（可提供錯誤資訊）。
3. 被動技能：角色的被動效果（如士兵、貞潔者等）在醉酒 / 中毒期間不得生效。

> 定義：此類失效以「說書人結算該動作」為準（見 AC4）。

---

## AC2：死亡類失效

當玩家狀態變更為「死亡」時：

1. 即時終止：除非技能明確標註「即使死亡仍生效」，否則其技能在死亡判定那一刻起立即失效。
2. 清理標記：該玩家先前施加的所有「持續性狀態」必須在死亡當下撤銷（例如：僧侶保護、投毒者中毒），受影響目標立即恢復有效狀態。
3. 行動權限：死亡玩家不得再出現在夜晚喚醒名單中（Night order 中跳過，不喚醒）。

---

## AC3：角色轉變與替換（Role Swap / Change）

當玩家角色發生變更時（例如：Imp 轉移給 Poisoner）：

1. 技能替換：舊角色的所有技能權限必須立即失效。
2. 連鎖反應：因舊角色技能造成的「持續性正/負狀態」必須同步撤銷，不得延續到新角色或繼續影響他人。

---

## AC4：判定優先順序（Chain of Command）

1. 行動順序：夜晚結算必須嚴格遵守 Night order。
2. 攔截判定：若「驅魔人」在惡魔行動前生效，則該夜晚惡魔的擊殺結算必須回傳 Null（不執行）。
3. 結算時機：所有能力失效以「說書人結算該動作」的時間點為準。

---

## 實作責任分層（Enforcement Layers）

本合約的規則由以下三層共同執行。**Handler 不負責 invalidation 檢查**。

### 層 1：RuleEngine 統一後處理（負責 AC1、AC4）

`processNightAbility()` 在呼叫 handler 取得結果後，統一檢查：

- 若 `!infoReliable` 且結果的 `action` 為效果型（`add_protection` / `add_poison` / `kill`），
  在結果上標記 `effectNullified: true`，保留 `display` 供說書人參考。
- 資訊型 handler（如占卜師）回傳實際偵測結果（不根據 `infoReliable` 調整），RuleEngine 不介入。UI 層根據 `item.isPoisoned / isDrunk` 提示說書人可自行決定回答。
- AC4 攔截：透過 `NightContext.blockedRoles` 追蹤已生效的攔截，後續角色結算前檢查。

### 層 2：GameState API（負責 AC2、AC3）

| API | 用途 |
|---|---|
| `addStatus(seat, type, sourceSeat)` | 記錄施加來源，拒絕對已死亡玩家加狀態 |
| `revokeEffectsFrom(sourceSeat, reason)` | 撤銷指定玩家施加的所有持續性狀態 |
| `killPlayer()` | 內部自動呼叫 `revokeEffectsFrom(seat, 'death')` |
| `replaceRole(seat, newRole)` | 內部自動呼叫 `revokeEffectsFrom(seat, 'role_change')` |

### 層 3：Handler（不負責 invalidation）

- Handler 只寫純能力邏輯（happy path）。
- Handler 接收 `infoReliable` 和 `statusReason`（供 reasoning 使用），但資訊型 handler 不根據 `infoReliable` 調整偵測結果。
- Handler **不做**中毒 / 醉酒 / 死亡 / 角色變更等 invalidation 檢查。

---

## Contract Tests（概念驗證，必須可測）

- T1：poisoned 的 Monk 保護 → RuleEngine 回傳 `effectNullified: true`，不產生狀態變更
- T2：drunk / poisoned 的資訊型技能仍回傳實際偵測結果（handler 不反轉），UI 提示說書人可自行決定
- T3：`killPlayer()` 當下自動呼叫 `revokeEffectsFrom()`，撤銷該玩家造成的持續性狀態
- T4：`replaceRole()` 當下自動呼叫 `revokeEffectsFrom()`，撤銷舊角色造成的持續性狀態
- T5：Exorcist 先於 Demon 行動時，`NightContext.blockedRoles` 阻止 Demon，kill 結果為 null
- T6：`addStatus()` 對已死亡玩家靜默忽略
