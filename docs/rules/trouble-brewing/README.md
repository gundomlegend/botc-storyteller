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
「待確認」列出 wiki 沒有明文規定、需要使用者裁定的地方；實作到這些情況時先問，不要自行決定。

## 角色一覽

| 類型 | 角色 |
|---|---|
| 鎮民 | [washerwoman](roles/washerwoman.md) 洗衣婦、[librarian](roles/librarian.md) 圖書管理員、[investigator](roles/investigator.md) 調查員、[chef](roles/chef.md) 廚師、[empath](roles/empath.md) 共情者、[fortuneteller](roles/fortuneteller.md) 占卜師、[undertaker](roles/undertaker.md) 送葬者、[monk](roles/monk.md) 僧侶、[ravenkeeper](roles/ravenkeeper.md) 守鴉人、[virgin](roles/virgin.md) 貞潔者、[slayer](roles/slayer.md) 獵手、[soldier](roles/soldier.md) 士兵、[mayor](roles/mayor.md) 鎮長 |
| 外來者 | [butler](roles/butler.md) 管家、[drunk](roles/drunk.md) 酒鬼、[recluse](roles/recluse.md) 陌客、[saint](roles/saint.md) 聖徒 |
| 爪牙 | [poisoner](roles/poisoner.md) 投毒者、[spy](roles/spy.md) 間諜、[scarletwoman](roles/scarletwoman.md) 紅唇女郎、[baron](roles/baron.md) 男爵 |
| 惡魔 | [imp](roles/imp.md) 小惡魔 |

## 待確認總表

- 占卜師：干擾項死亡後是否仍有效
- 鎮長：「處決但無人死亡」是否算當天有處決（依核心規則「處決與死亡不同」，推定算有處決）
- 投毒者：能否毒自己、能否毒死者（依「未禁止即可做」，推定可以）
- 紅唇女郎：中毒時惡魔死亡是否接任（依毒醉通用規則，推定不接任）
- 小惡魔：自殺時有多名存活爪牙且無紅唇女郎，由誰接任（推定由說書人選）；無存活爪牙時自殺（推定無人接任，善良獲勝）
- 聖徒：已死亡的聖徒再次被處決（處決已死者不會再死，推定不觸發）
