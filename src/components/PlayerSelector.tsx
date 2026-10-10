import { useState, useMemo } from 'react';
import type { Player } from '../engine/types';
import { useGameStore } from '../store/gameStore';

const CARD_BASE = 'flex items-center gap-2 py-2 px-3 border rounded-md text-xs transition-all';

/** 可點選玩家卡片的靜止樣式（供自訂卡片清單重用，例如占卜師干擾項） */
export const SELECTABLE_CARD = `${CARD_BASE} border-border bg-transparent text-fg-muted cursor-pointer hover:border-primary hover:text-fg`;

interface PlayerSelectorProps {
  mode?: 'single' | 'double' | 'multiple' | 'display';
  canSelectSelf?: boolean;
  onlyAlive?: boolean;
  showDeadPlayers?: boolean;
  currentPlayerSeat?: number;
  excludePlayers?: number[];
  highlightPlayers?: number[];
  showRoles?: boolean;
  showStatus?: boolean;
  showVoteCount?: boolean;
  showUsers?: boolean;
  layout?: 'grid' | 'list';
  label?: string;
  readOnly?: boolean;
  onSelect: (players: Player[]) => void;
  onError?: (message: string) => void;
}

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
  showUsers = true,
  layout = 'grid',
  label,
  readOnly = false,
  onSelect,
  onError,
}: PlayerSelectorProps) {
  const { players, roleRegistry } = useGameStore();
  const [selected, setSelected] = useState<number[]>([]);

  const selectablePlayers = useMemo(() => {
    return players.filter((player) => {
      if (onlyAlive && !player.isAlive) return false;
      if (!canSelectSelf && currentPlayerSeat === player.seat) return false;
      if (excludePlayers.includes(player.seat)) return false;
      return true;
    });
  }, [players, onlyAlive, canSelectSelf, currentPlayerSeat, excludePlayers]);

  const isSelectable = (player: Player) => {
    return selectablePlayers.some((p) => p.seat === player.seat);
  };

  const isSelected = (player: Player) => {
    return selected.includes(player.seat);
  };

  const isHighlighted = (player: Player) => {
    return highlightPlayers.includes(player.seat);
  };

  const handleClick = (player: Player) => {
    if (mode === 'display') return;
    if (readOnly) return;

    if (!isSelectable(player)) {
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

    if (mode === 'single') {
      setSelected([player.seat]);
      onSelect([player]);
      return;
    }

    if (mode === 'double') {
      const newSelected = [...selected, player.seat];
      if (newSelected.length === 2) {
        const selectedPlayers = newSelected.map(
          (seat) => players.find((p) => p.seat === seat)!
        );
        onSelect(selectedPlayers);
        setSelected([]);
      } else {
        setSelected(newSelected);
      }
      return;
    }

    if (mode === 'multiple') {
      const newSelected = selected.includes(player.seat)
        ? selected.filter((s) => s !== player.seat)
        : [...selected, player.seat];
      setSelected(newSelected);

      const selectedPlayers = newSelected.map(
        (seat) => players.find((p) => p.seat === seat)!
      );
      onSelect(selectedPlayers);
      return;
    }
  };

  const displayPlayers = showDeadPlayers
    ? players
    : players.filter((p) => p.isAlive);

  return (
    <div className="flex flex-col gap-2">
      {/* 標籤只在 DayView / SlayerPanel 內使用，沿用其 h3 樣式 */}
      {label && <h3 className="text-lg font-bold text-fg mb-2.5">{label}</h3>}

      {mode === 'double' && selected.length === 1 && (
        <div className="py-2 px-3 bg-warning/15 border border-warning rounded-sm text-warning text-xs">
          已選擇 {selected[0]}號，請選擇第二位玩家
        </div>
      )}

      {showVoteCount && (
        <div className="text-sm font-bold text-fg">已投票：{selected.length} 人</div>
      )}

      <div className={layout === 'grid' ? 'flex flex-wrap gap-1.5' : 'flex flex-col gap-1'}>
        {displayPlayers.map((player) => {
          const selectable = isSelectable(player);
          const selectedState = isSelected(player);
          const highlighted = isHighlighted(player);
          const dead = !player.isAlive;

          // Resting colors resolved here (highlighted border beats selected); hover:* utilities still win on hover.
          const cardClass = [
            CARD_BASE,
            highlighted ? 'border-warning shadow-glow-warning' : selectedState ? 'border-primary' : 'border-border',
            selectedState ? 'bg-primary text-white' : 'bg-transparent text-fg-muted',
            selectable ? 'cursor-pointer hover:border-primary hover:text-fg' : 'cursor-not-allowed',
            !selectable || dead ? 'opacity-40' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={player.seat}
              className={cardClass}
              data-player-card=""
              data-selectable={selectable || undefined}
              data-selected={selectedState || undefined}
              data-highlighted={highlighted || undefined}
              data-dead={dead || undefined}
              onClick={() => handleClick(player)}
            >
              {showUsers && <div className="font-bold min-w-8">{player.seat}號</div>}
              {showUsers && <div className={dead ? 'flex-1 line-through' : 'flex-1'}>{player.name}</div>}

              {showRoles && (
                <div className={`text-2xs ${selectedState ? 'text-white/80' : 'text-fg-muted'}`}>
                  {roleRegistry.getPlayerRoleName(player)}
                </div>
              )}

              {showStatus && (
                <div className="flex gap-0.5 text-sm">
                  {dead && <span>💀</span>}
                  {player.isPoisoned && <span>🧪</span>}
                  {player.isProtected && <span>🛡️</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerSelector;
