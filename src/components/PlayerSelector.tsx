import { useGameStore } from '../store/gameStore';

interface PlayerSelectorProps {
  onSelect: (seat: number) => void;
  selectedSeat: number | null;
  excludeSeat?: number;
}

export default function PlayerSelector({
  onSelect,
  selectedSeat,
  excludeSeat,
}: PlayerSelectorProps) {
  const { players } = useGameStore();

  return (
    <div className="player-selector">
      {players.map((p) => {
        const isExcluded = p.seat === excludeSeat;
        const isSelected = p.seat === selectedSeat;

        return (
          <button
            key={p.seat}
            className={[
              'player-btn',
              !p.isAlive ? 'dead' : '',
              isSelected ? 'selected' : '',
              isExcluded ? 'excluded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={isExcluded}
            onClick={() => onSelect(p.seat)}
          >
            <span className="player-btn-seat">{p.seat}</span>
            <span className="player-btn-name">{p.name}</span>
            {!p.isAlive && <span className="player-btn-dead">死亡</span>}
          </button>
        );
      })}
    </div>
  );
}
