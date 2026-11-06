# CLAUDE.md

血染鐘樓說書人助手（Electron + React + TypeScript + Zustand）。私人使用，不商用。

## 目前目標（v1）

用這個工具主持一場 7–15 人的「暗流湧動」，從開局到分出勝負都不必離開工具。

v1 之前**不做**：其他劇本、旅行者、傳奇角色、音樂、投影視窗視覺風格、AI 建議。
想到了就寫進 `TODOS.md` 的「v1 之後」，不要動手。

## 工作節奏：實作 → 測試驗收 → 試玩回饋

1. **一次只做一件事**。開工前先確認：這件事讓 v1 更接近完成嗎？
2. **直接實作，不先寫規格文件**。需要說明設計理由時，寫在程式碼註解或 commit 訊息，最多一頁。
3. **用測試驗收**。修 bug 先寫一個會失敗的測試，再修到通過。每次改動後跑 `npm test`，全數通過才算完成。
4. **試玩回饋**。使用者試玩後回報的問題寫進 `TODOS.md`，那份清單就是下一輪的工作。
5. **規則不確定時，停下來問**。不要自行發明規則；請使用者確認，或附上官方 wiki 連結供核對。

完成的定義：測試通過、`npx tsc -p tsconfig.json --noEmit` 無錯誤、`TODOS.md` 已更新。
不需要同步 `docs/` 裡的舊規格；那些文件已停止維護，僅供參考。

## 程式碼地圖

| 位置 | 內容 |
|---|---|
| `src/engine/GameState.ts` | `GameStateManager`，所有遊戲狀態與變更 |
| `src/engine/RuleEngine.ts` | 夜晚能力分派，handler 在建構子裡註冊 |
| `src/engine/handlers/` | 各角色夜晚能力（繼承 `BaseRoleHandler`） |
| `src/engine/Registration.ts` | 間諜／隱士「被當作什麼」，只用於資訊路徑 |
| `src/engine/{Virgin,Saint}Ability.ts` | 白天被動能力 |
| `src/store/gameStore.ts` | Zustand store，包裝 `GameStateManager` |
| `src/components/` | 說書人端 UI（`NightView`、`DayView`、`roleProcessors/`） |
| `src/renderer/display/` | 投影視窗，透過 IPC 接收 `selectDisplayState` 的資料 |
| `src/data/roles/trouble-brewing.json` | 22 個角色，id 為小寫無分隔（`fortuneteller`、`scarletwoman`） |

## 必須知道的陷阱

- **引擎狀態是原地修改的**：`getAllPlayers()`、`getHistory()` 回傳內部物件參考。store 的 `refresh()` 必須產生新的陣列與新的 player 物件，否則 React 不會更新畫面。
- **元件要用 selector 訂閱 store**：寫 `useGameStore((s) => s.players)`，不要寫 `const { ... } = useGameStore()`，後者會讓任何變動都重新渲染整個畫面。
- **酒鬼**：`role` 是 `drunk`，`believesRole` 是他以為的角色；用假角色的 handler 行動，效果失效。
- **登記不是能力**：被當作某角色不會獲得該角色的能力，`Registration.ts` 不可在能力結算路徑使用。

## 指令

```bash
npm run dev     # 開發（Vite + Electron 雙視窗）
npm test        # 跑全部測試
```

## 樣式規範

所有樣式一律使用 Tailwind CSS v4 utility + 設計 token，**不要新增任何 `.css` 檔案**，也不要寫 inline `style={{…}}` 或寫死的色碼。

### 檔案位置

- `src/renderer/styles/app.css`：唯一的樣式檔。內容依序為 `@import "tailwindcss"`、`@source`、`dark` variant、`@theme`（所有 token）、`transition-background` utility、`@layer base`（Preflight 之上的基礎樣式）。
- `src/components/shared/Button.tsx`：所有按鈕都用 `<Button variant="primary | secondary | danger">`，不要直接寫 `<button>` 的按鈕樣式。
- `src/components/shared/AbilityPanel.tsx`：角色能力處理器的共用版面（`AbilityPanel`、`AbilityTarget`/`TargetLabel`、`AbilityActions`、`AbilityResult`、`ResultDisplay`、`ResultNote`、`ProcessorTitle`、`StatusLine`、`StatusReason`、`WarningBox`、`HintList`）。新的處理器先用這些元件，不要重寫一樣的版面。

### Token

- Tailwind 預設的顏色、字級、圓角、陰影都已關閉，**只能用 `@theme` 裡定義的 token**（例如 `bg-surface-raised`、`text-fg-muted`、`text-alert-danger-text`、`rounded-lg`、`text-xl`）。間距沿用 Tailwind 預設的 4px 刻度（`p-3`、`gap-1.5`、`mt-4`）。
- 不要用任意值（`p-[13px]`、`text-[#123456]`）。設計稿的值不在刻度上時，先對齊最接近的 token；真的需要新值，就在 `@theme` 對應分組加一個 token。
- Token 依「用途」命名，不依顏色命名：`--color-<用途>`（例：`--color-danger-soft`、`--color-alert-warning-surface`）、`--text-<尺寸>`、`--radius-<尺寸>`、`--shadow-<用途>`。新增前先看分組註解（surfaces/text、feedback、player status、teams、day/night、alert panels…），放進最接近的那一組。
- 半透明色用 opacity modifier（`bg-warning/15`、`bg-black/30`），不要另開 rgba token。

### 寫法

- 依狀態切換樣式時，在元件裡算出「一組」class（參考 `PlayerSelector` 的 `cardClass`、`NightView` 的 `orderItemClass`），不要同時套兩個會衝突的 utility（例如 `mt-3` 和 `mt-4`）再期待後者勝出——Tailwind 不保證順序。共用元件需要覆寫外距時，用它提供的 `margin` prop（`ResultNote`、`AbilityActions`）。
- 狀態要讓測試讀取時，用 `data-*` 屬性（例：`data-selected`、`data-highlighted`），不要讓測試依賴樣式 class。
- `@layer base` 裡的規則讓 app 保留瀏覽器預設的行高、表單元件外觀、標題與清單樣式（拿掉會讓約 4,900 個元素外觀改變）。不帶 class 的 `<h3>`、`<ul>`、`<select>`、`<input>` 會用到這些預設，屬於刻意設計，不要刪。

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.
