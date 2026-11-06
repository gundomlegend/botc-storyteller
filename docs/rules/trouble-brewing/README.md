# 暗流湧動規則參考

本資料夾是實作與測試的**規則依據**，整理自集石官方 wiki。內容為重新組織的摘要，不是逐字原文；有疑義時以原頁面為準。

- 劇本頁：https://clocktower-wiki.gstonegames.com/index.php?title=%E6%9A%97%E6%B5%81%E6%B6%8C%E5%8A%A8
- 角色頁網址格式：`https://clocktower-wiki.gstonegames.com/index.php?title=<簡體角色名>`

## 檔案

| 檔案 | 內容 |
|---|---|
| `setup.md` | 人數配置、設置調整、首夜互認、推薦板子 |
| `night-order.md` | 首夜與其他夜晚順序，以及和現有資料的差異 |
| `core-rules.md` | 提名、投票、處決、勝負、毒醉、登記、能力時機 |
| `roles/<id>.md` | 22 個角色，id 與 `src/data/roles/trouble-brewing.json` 相同 |

## 角色檔格式

每個角色檔的「測試案例」由官方範例改寫而成，可直接轉成 vitest 案例。
wiki 沒有明文規定的情況，裁定結果列在下方「已裁定」表；遇到表上沒有的新情況，先問使用者，不要自行決定。

## 角色一覽

| 類型 | 角色 |
|---|---|
| 鎮民 | [washerwoman](roles/washerwoman.md) 洗衣婦、[librarian](roles/librarian.md) 圖書管理員、[investigator](roles/investigator.md) 調查員、[chef](roles/chef.md) 廚師、[empath](roles/empath.md) 共情者、[fortuneteller](roles/fortuneteller.md) 占卜師、[undertaker](roles/undertaker.md) 送葬者、[monk](roles/monk.md) 僧侶、[ravenkeeper](roles/ravenkeeper.md) 守鴉人、[virgin](roles/virgin.md) 貞潔者、[slayer](roles/slayer.md) 獵手、[soldier](roles/soldier.md) 士兵、[mayor](roles/mayor.md) 鎮長 |
| 外來者 | [butler](roles/butler.md) 管家、[drunk](roles/drunk.md) 酒鬼、[recluse](roles/recluse.md) 陌客、[saint](roles/saint.md) 聖徒 |
| 爪牙 | [poisoner](roles/poisoner.md) 投毒者、[spy](roles/spy.md) 間諜、[scarletwoman](roles/scarletwoman.md) 紅唇女郎、[baron](roles/baron.md) 男爵 |
| 惡魔 | [imp](roles/imp.md) 小惡魔 |

## 已裁定（wiki 未明文，參考 auto-dm 與 Olalall 決定）

| 情況 | 裁定 | 依據 |
|---|---|---|
| 干擾項死亡 | 仍有效 | 兩個專案都不檢查存活 |
| 處決但無人死亡 | 算有處決，鎮長不勝 | 核心規則；auto-dm 相同 |
| 投毒者毒自己／毒死者 | 可以 | 未禁止即可做；auto-dm 不限制 |
| 紅唇女郎中毒時惡魔死亡 | 不接任 | 毒醉通用規則；Olalall 要求核對 |
| 小惡魔毒醉時自殺 | 無效，不死不傳位 | 重要細節頁 |
| 自殺時多名爪牙、紅唇女郎不接任 | 說書人選，系統給隨機預設 | Olalall 交給說書人 |
| 自殺時無存活爪牙 | 無人接任，善良獲勝 | auto-dm 相同 |
| 已死的聖徒被處決 | 不觸發 | 能力條件是「死於處決」 |

參考專案中與規則不符、**不要照抄**的地方：auto-dm 對所有自殺傳位都套用 5 人門檻（門檻只屬於紅唇女郎）；auto-dm 的聖徒只檢查被處決、不檢查死亡；auto-dm 的紅唇女郎接任不檢查中毒。
