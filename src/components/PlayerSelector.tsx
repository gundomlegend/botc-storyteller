import { useState, useMemo } from 'react';
import type { Player } from '../engine/types';
import { useGameStore } from '../store/gameStore';

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
  layout = 'grid',
  label,
  readOnly = false,
  onSelect,
  onError,
}: PlayerSelectorProps) {
  const players = useGameStore((s) => s.players);
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
    <div className={`player-selector player-selector-${layout}`}>
      {label && <h3 className="selector-label">{label}</h3>}

      {mode === 'double' && selected.length === 1 && (
        <div className="selection-hint">
          已選擇 {selected[0]}號，請選擇第二位玩家
        </div>
      )}

      {showVoteCount && (
        <div className="vote-count">已投票：{selected.length} 人</div>
      )}

      <div className={`player-container layout-${layout}`}>
        {displayPlayers.map((player) => {
          const selectable = isSelectable(player);
          const selectedState = isSelected(player);
          const highlighted = isHighlighted(player);

          return (
            <div
              key={player.seat}
              className={[
                'player-card',
                selectable ? 'selectable' : 'disabled',
                selectedState ? 'selected' : '',
                highlighted ? 'highlighted' : '',
                !player.isAlive ? 'dead' : '',
              ]
                .filter(Boolean)
                .join(' ')}
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
                  {player.isPoisoned && <span className="icon-poisoned">🧪</span>}
                  {player.isProtected && <span className="icon-protected">🛡️</span>}
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
