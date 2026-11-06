# CLAUDE.md

血染鐘樓說書人助手（Electron + React + TS + Zustand），私人使用。

## 目標（v1）

用本工具主持一場 7–15 人「暗流湧動」，從開局到勝負不離開工具。
v1 前不做：其他劇本、旅行者、傳奇角色、音樂、視覺風格、AI 建議。想到就寫進 `TODOS.md`「v1 之後」。

## 節奏：實作 → 測試驗收 → 試玩回饋

- 一次只做 `TODOS.md` 最上面一項。
- 不寫規格文件；設計理由寫在註解或 commit，`docs/` 已停止維護。
- 修 bug 先寫會失敗的測試。完成＝`npm test` 全過、`npx tsc -p tsconfig.json --noEmit` 無錯、`TODOS.md` 已更新。
- 規則不確定就停下來問，不自行發明。

## 角色與測試

- 角色規格＝集石官方 wiki（clocktower-wiki.gstonegames.com）角色頁的「运作方式」「范例」「规则细节」。先把範例改寫成測試案例，交使用者確認，再實作。
- 自動測試：引擎能確定判斷的規則（資訊正確性、毒醉與保護的時效、死亡、提名投票、勝負）。
- 說書人裁量（假資訊內容、登記選擇）只測「提供哪些選項」，不測選了什麼。
- 規則邏輯放引擎，不放元件；UI 外觀與操作手感交給試玩，不寫測試。

## 程式碼地圖

- `src/engine/`：`GameState.ts`（狀態）、`RuleEngine.ts`（夜晚分派）、`handlers/`（各角色）、`Registration.ts`（間諜／隱士被當作什麼）
- `src/store/gameStore.ts`：包裝 `GameStateManager`
- `src/components/`：說書人端 UI；`src/renderer/display/`：投影視窗（IPC）
- `src/data/roles/trouble-brewing.json`：角色 id 小寫無分隔（`fortuneteller`）

## 陷阱

- 引擎原地修改物件；`refresh()` 必須產生新陣列與新 player 物件。
- 元件用 selector：`useGameStore((s) => s.players)`，不要整個解構。
- 酒鬼：`role` 是 `drunk`，用 `believesRole` 的 handler 行動但效果失效。
- 登記只用於資訊路徑，被當作某角色不會獲得其能力。

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
