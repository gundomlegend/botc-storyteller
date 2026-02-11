# PlayerSelector 組件規格文件

## 概述

`PlayerSelector` 是玩家選擇的核心 UI 組件，用於夜間能力和白天行動。

---

## Props 定義
```typescript
interface PlayerSelectorProps {
  // ========== 選擇模式 ==========
  mode: 'single' | 'double' | 'multiple' | 'display';
  
  // ========== 基本規則 ==========
  canSelectSelf?: boolean;          // 是否可以選擇自己（默認：false）
  onlyAlive?: boolean;              // 只能選擇存活玩家（默認：true）
  showDeadPlayers?: boolean;        // 顯示死亡玩家（默認：true）
  
  // ========== 當前玩家 ==========
  currentPlayerSeat?: number;       // 當前執行能力的玩家座位
  
  // ========== 過濾條件 ==========
  excludePlayers?: number[];        // 排除的座位號列表
  highlightPlayers?: number[];      // 高亮的座位號列表
  
  // ========== 顯示選項 ==========
  showRoles?: boolean;              // 顯示角色名稱（默認：false）
  showStatus?: boolean;             // 顯示狀態圖標（默認：true）
  showVoteCount?: boolean;          // 顯示票數計數（默認：false）
  
  // ========== 布局 ==========
  layout?: 'grid' | 'circle' | 'list';  // 布局方式（默認：grid）
  
  // ========== 其他 ==========
  label?: string;                   // 選擇器標題
  readOnly?: boolean;               // 只顯示不可選（默認：false）
                                    // 'display' 模式自動為 true
  
  // ========== 回調 ==========
  onSelect: (players: Player[]) => void;  // 統一回傳 Player 陣列
  onError?: (message: string) => void;
}
```

**注意**：
- `canSelectSelf=false`（默認）已涵蓋「排除自己」的需求，無需額外 `excludeSelf` prop
- 資訊型角色（如共情者、廚師等）不需要選擇目標，不使用 PlayerSelector，由 AbilityProcessor 直接執行能力並顯示結果

---

## 選擇模式說明

### Mode: 'single' (單選)

**用途**：最常見的選擇模式

**行為**：
- 點擊玩家即選中
- 立即觸發 `onSelect`
- 自動取消之前的選擇

**返回值**：`Player[]` (長度 1 的陣列)

---

### Mode: 'double' (雙選)

**用途**：占卜師查驗兩位玩家

**行為**：
- 第一次點擊：選中第一位，等待第二位
- 第二次點擊：選中第二位，觸發 `onSelect`
- 自動重置選擇狀態

**返回值**：`Player[]` (兩個玩家的陣列)

---

### Mode: 'multiple' (多選)

**用途**：投票階段

**行為**：
- 點擊切換選中狀態
- 每次點擊都觸發 `onSelect`
- 保持所有選中狀態

**返回值**：`Player[]` (所有選中玩家的陣列)

---

### Mode: 'display' (顯示)

**用途**：爪牙惡魔互認

**行為**：
- 只顯示，不可點擊
- 高亮指定玩家
- 可顯示角色信息

**返回值**：無（`readOnly=true`）

---

## 組件實作
```typescript
import React, { useState, useMemo } from 'react';
import { Player } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import './PlayerSelector.css';

export function PlayerSelector({
  mode = 'single',
  canSelectSelf = false,
  onlyAlive = true,
  showDeadPlayers = true,
  currentPlayerSeat,
  excludePlayers = [],
  highlightPlayers = [],
  showRoles = false,
  showStatus = true,
  showVoteCount = false,
  layout = 'grid',
  label,
  readOnly = false,
  onSelect,
  onError
}: PlayerSelectorProps) {
  
  const players = useGameStore((s) => s.players);
  const [selected, setSelected] = useState<number[]>([]);

  // ========== 計算可選玩家 ==========

  const selectablePlayers = useMemo(() => {
    return players.filter(player => {
      // 只選存活
      if (onlyAlive && !player.isAlive) return false;
      
      // 排除自己
      if (!canSelectSelf && currentPlayerSeat === player.seat) return false;
      
      // 排除特定玩家
      if (excludePlayers.includes(player.seat)) return false;
      
      return true;
    });
  }, [players, onlyAlive, canSelectSelf, currentPlayerSeat, excludePlayers]);
  
  // ========== 處理點擊 ==========

  const handleClick = (player: Player) => {
    // display 模式不可點擊
    if (mode === 'display') return;
    if (readOnly) return;
    
    // 檢查是否可選
    const isSelectable = selectablePlayers.find(p => p.seat === player.seat);
    if (!isSelectable) {
      // 錯誤提示
      if (!player.isAlive && onlyAlive) {
        onError?.('不能選擇死亡玩家');
      } else if (player.seat === currentPlayerSeat && !canSelectSelf) {
        onError?.('不能選擇自己');
      } else if (excludePlayers.includes(player.seat)) {
        onError?.('不能選擇此玩家');
      } else {
        onError?.('此玩家不可選');
      }
      return;
    }
    
    // 單選模式
    if (mode === 'single') {
      setSelected([player.seat]);
      onSelect([player]);
      return;
    }
    
    // 雙選模式
    if (mode === 'double') {
      const newSelected = [...selected, player.seat];
      if (newSelected.length === 2) {
        const selectedPlayers = newSelected.map(seat =>
          players.find(p => p.seat === seat)!
        );
        onSelect(selectedPlayers);
        setSelected([]); // 重置
      } else {
        setSelected(newSelected);
      }
      return;
    }
    
    // 多選模式
    if (mode === 'multiple') {
      const newSelected = selected.includes(player.seat)
        ? selected.filter(s => s !== player.seat)
        : [...selected, player.seat];
      setSelected(newSelected);
      
      const selectedPlayers = newSelected.map(seat =>
        players.find(p => p.seat === seat)!
      );
      onSelect(selectedPlayers);
      return;
    }
  };
  
  // ========== 判斷狀態 ==========
  
  const isSelectable = (player: Player) => {
    return selectablePlayers.find(p => p.seat === player.seat) !== undefined;
  };
  
  const isSelected = (player: Player) => {
    return selected.includes(player.seat);
  };
  
  const isHighlighted = (player: Player) => {
    return highlightPlayers.includes(player.seat);
  };
  
  // ========== 渲染玩家卡片 ==========
  
  const renderPlayerCard = (player: Player) => {
    const selectable = isSelectable(player);
    const selectedState = isSelected(player);
    const highlighted = isHighlighted(player);
    
    return (
      <div
        key={player.seat}
        className={`
          player-card
          ${selectable ? 'selectable' : 'disabled'}
          ${selectedState ? 'selected' : ''}
          ${highlighted ? 'highlighted' : ''}
          ${!player.isAlive ? 'dead' : ''}
        `}
        onClick={() => handleClick(player)}
      >
        <div className="player-seat">{player.seat}號</div>
        <div className="player-name">{player.name}</div>
        
        {showRoles && (
          <div className="player-role">{player.role}</div>
        )}
        
        {showStatus && (
          <div className="player-status">
            {!player.isAlive && <span className="icon-dead">💀</span>}
            {player.isPoisoned && <span className="icon-poisoned">⚠️</span>}
            {player.isProtected && <span className="icon-protected">🛡️</span>}
          </div>
        )}
      </div>
    );
  };
  
  // ========== 渲染布局 ==========
  
  const displayPlayers = showDeadPlayers
    ? players
    : players.filter(p => p.isAlive);
  
  return (
    <div className={`player-selector player-selector-${layout}`}>
      {label && <h3 className="selector-label">{label}</h3>}
      
      {mode === 'double' && selected.length === 1 && (
        <div className="selection-hint">
          已選擇 {selected[0]}號，請選擇第二位玩家
        </div>
      )}
      
      {showVoteCount && (
        <div className="vote-count">
          已投票：{selected.length} 人
        </div>
      )}
      
      <div className={`player-container layout-${layout}`}>
        {displayPlayers.map(renderPlayerCard)}
      </div>
    </div>
  );
}
```

---

## 樣式指南

### 檔案：`src/components/PlayerSelector.css`
```css
/* ========== 容器 ========== */
.player-selector {
  padding: 20px;
}

.selector-label {
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
}

.selection-hint {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
}

.vote-count {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
}

/* ========== 玩家卡片 ========== */
.player-card {
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  text-align: center;
  transition: all 0.2s;
  background-color: white;
}

.player-seat {
  font-size: 14px;
  font-weight: bold;
  color: #666;
}

.player-name {
  font-size: 16px;
  margin-top: 5px;
}

.player-role {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.player-status {
  margin-top: 5px;
  font-size: 18px;
}

/* ========== 可選狀態 ========== */
.player-card.selectable {
  cursor: pointer;
}

.player-card.selectable:hover {
  border-color: #4CAF50;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* ========== 禁用狀態 ========== */
.player-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f5f5;
}

/* ========== 選中狀態 ========== */
.player-card.selected {
  border-color: #2196F3;
  background-color: #E3F2FD;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
}

/* ========== 高亮狀態 ========== */
.player-card.highlighted {
  border-color: #FF9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.8); }
}

/* ========== 死亡狀態 ========== */
.player-card.dead {
  background-color: #fafafa;
}

.player-card.dead .player-name {
  text-decoration: line-through;
  color: #999;
}

/* ========== Grid 布局 ========== */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 15px;
}

/* ========== List 布局 ========== */
.layout-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

.layout-list .player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  padding: 10px 15px;
}

/* ========== Circle 布局 ========== */
.layout-circle {
  position: relative;
  width: 500px;
  height: 500px;
  margin: 0 auto;
}

.layout-circle .player-card {
  position: absolute;
  width: 80px;
  height: 80px;
  padding: 5px;
  font-size: 12px;
}

/* Circle 布局需要 JavaScript 計算位置 */
```

---

## 基本測試用例
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerSelector } from '../PlayerSelector';

describe('PlayerSelector - 基本功能', () => {
  
  test('單選模式：點擊應觸發 onSelect 並回傳 Player[]', () => {
    const onSelect = vi.fn();
    render(
      <PlayerSelector
        mode="single"
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('1號'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ seat: 1 })
      ])
    );
    expect(onSelect.mock.calls[0][0]).toHaveLength(1);
  });
  
  test('應該禁用死亡玩家（onlyAlive=true）', () => {
    render(
      <PlayerSelector
        mode="single"
        onlyAlive={true}
        onSelect={vi.fn()}
      />
    );
    
    const deadPlayerCard = screen.getByText('2號').closest('.player-card');
    expect(deadPlayerCard).toHaveClass('disabled');
  });
  
  test('雙選模式：選擇兩位後應返回長度 2 的陣列', () => {
    const onSelect = vi.fn();
    render(
      <PlayerSelector
        mode="double"
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('1號'));
    fireEvent.click(screen.getByText('3號'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ seat: 1 }),
        expect.objectContaining({ seat: 3 })
      ])
    );
    expect(onSelect.mock.calls[0][0]).toHaveLength(2);
  });
});
```

---

## 注意事項

1. **狀態管理**
   - 組件內部管理選擇狀態
   - 通過 `onSelect` 回調通知外部

2. **錯誤處理**
   - 不可選的玩家點擊時觸發 `onError`
   - 不要拋出異常

3. **效能優化**
   - 使用 `useMemo` 快取計算結果
   - 大量玩家時考慮虛擬滾動

4. **無障礙**
   - 添加 `aria-label`
   - 鍵盤導航支持