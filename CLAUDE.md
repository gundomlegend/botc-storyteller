# CLAUDE.md

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

### Available skills

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

### Troubleshooting

If gstack skills aren't working, run:

```
cd .claude/skills/gstack && ./setup
```

to build the binary and register skills.

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
