# 快速開始指南

本文件提供最快速的專案啟動方式，適合直接交給 Claude Code 使用。

---

## 給 Claude Code 的指令

### 方式 1: 一次性完整建置
```
請按照以下步驟建立血染鐘樓說書人助手專案：

1. 閱讀 SETUP.md 並執行所有初始化步驟
2. 閱讀 docs/contracts/GameState.contract.md
3. 閱讀 docs/specs/GameState.spec.md 並實作 GameStateManager
4. 閱讀 docs/SPEC_RuleEngine.md 並實作 RuleEngine
5. 閱讀 docs/SPEC_Handlers.md 並實作所有處理器
6. 執行測試驗證所有功能

完成後告訴我結果。
```

### 方式 2: 逐步建置
```
我要開發血染鐘樓說書人助手。

今天的任務：完成專案初始化和規則引擎。

請：
1. 執行 SETUP.md 中的步驟 1-5
2. 實作 GameStateManager（參考 docs/SPEC_GameState.md）
3. 實作 RuleEngine（參考 docs/SPEC_RuleEngine.md）

每完成一步告訴我，我會確認後再繼續下一步。
```

---

## 第一天：專案初始化

### 對話範本
```
你：請幫我建立專案，參考 SETUP.md

Claude Code：[執行步驟 1-4]
完成：
✓ React + TypeScript + Vite 專案已建立
✓ Electron 已安裝和配置
✓ 目錄結構已建立
✓ 執行 npm run dev 可開啟兩個視窗

你：好的，請繼續準備角色資料

Claude Code：[建立 JSON 檔案]
✓ trouble-brewing.json 已建立（22 個角色）
✓ jinxes.json 已建立
✓ 資料驗證通過

你：現在開始實作 GameStateManager

Claude Code：[讀取 SPEC_GameState.md 並實作]
✓ types.ts 類型定義完成
✓ GameState.ts 實作完成
✓ 單元測試已撰寫
✓ 所有測試通過

下一步要做什麼？
```

---

## 第二天：規則引擎

### 對話範本
```
你：實作 RuleEngine，參考 SPEC_RuleEngine.md

Claude Code：[實作 RuleEngine]
✓ RuleEngine.ts 完成
✓ 預設處理器完成
✓ Jinx 檢測完成
✓ 測試通過

你：實作 5 個角色處理器，參考 SPEC_Handlers.md

Claude Code：[逐一實作]
✓ FortunetellerHandler 完成
✓ MonkHandler 完成
✓ PoisonerHandler 完成
✓ ImpHandler 完成
✓ DrunkHandler 完成
✓ 處理器註冊完成
✓ 所有測試通過

規則引擎完成！
```

---

## 驗證檢查清單

每個階段完成後，使用此清單驗證：

### 階段 1: 專案初始化
```bash
# 檢查項目
□ npm run dev 可啟動
□ 開啟兩個視窗（說書人控制台 + 公共顯示）
□ DevTools 可以打開
□ 無編譯錯誤
```

### 階段 2: 資料準備
```bash
# 檢查項目
□ trouble-brewing.json 有 22 個角色
□ jinxes.json 有 Jinx 規則
□ 可以 import 資料
□ TypeScript 無錯誤
```

### 階段 3: GameStateManager
```bash
# 執行測試
npm test GameState

# 檢查項目
□ 所有測試通過
□ 可以初始化玩家
□ 可以管理狀態
□ 可以生成夜間順序
```

### 階段 4: RuleEngine
```bash
# 執行測試
npm test RuleEngine

# 檢查項目
□ 所有測試通過
□ 可以處理簡單角色
□ 可以檢測狀態影響
□ 可以檢測 Jinx
```

### 階段 5: 角色處理器
```bash
# 執行測試
npm test handlers

# 檢查項目
□ 5 個處理器測試全部通過
□ 占卜師正確處理中毒
□ 僧侶不能保護自己
□ 小惡魔正確檢測保護
```

---

## 常見指令

### 開發
```bash
# 啟動開發環境（Vite + Electron 雙視窗）
npm run dev

# 只啟動 React（Vite dev server，http://localhost:5173）
npm run dev:renderer

# 只啟動 Electron（需先建置 main process）
npm run dev:electron

# 執行測試
npm test

# 執行測試（監聽模式）
npm test -- --watch
```

### 建置
```bash
# 建置 Renderer + Main process
npm run build

# 打包為可執行檔
npm run package
```

### 除錯
```bash
# 執行類型檢查（Renderer）
npx tsc --noEmit

# 執行類型檢查（Main process）
npx tsc -p tsconfig.main.json --noEmit

# 格式化程式碼
npx prettier --write "src/**/*.{ts,tsx}"
```

---

## 問題排查

### 問題 1: Electron 無法啟動
```bash
# 清理並重裝
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 問題 2: TypeScript 錯誤
```bash
# 檢查 tsconfig.json
# 確保包含 "resolveJsonModule": true

# 重新啟動 TypeScript 服務
# VS Code: Cmd+Shift+P -> TypeScript: Restart TS Server
```

### 問題 3: 測試失敗
```bash
# 清除測試快取
npm test -- --clearCache

# 重新執行測試
npm test
```

---

## 下一步

完成以上步驟後，請查看：

1. [TASKS.md](TASKS.md) - 詳細開發任務
2. [DEVELOPMENT.md](DEVELOPMENT.md) - 開發規範
3. [docs/](docs/) - 完整規格文件

開始開發 UI 介面！
