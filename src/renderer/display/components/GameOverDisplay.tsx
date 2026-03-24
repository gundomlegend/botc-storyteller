/**
 * Game Over Display - 遊戲結束顯示
 */

import { BaseDisplay } from '../BaseDisplay';

interface Player {
  seat: number;
  name: string;
  role: string;
  roleName: string;
  team: 'good' | 'evil';
  isAlive: boolean;
}

interface GameOverDisplayProps {
  winner: 'good' | 'evil' | null;
  gameOverReason: string | null;
  players: Player[];
}

export function GameOverDisplay({ winner, gameOverReason, players }: GameOverDisplayProps) {
  const getWinnerText = () => {
    if (winner === 'good') return '🎉 善良陣營獲勝！';
    if (winner === 'evil') return '😈 邪惡陣營獲勝！';
    return '遊戲結束';
  };

  return (
    <BaseDisplay title="遊戲結束" className="game-over-display">
      <div className="game-over-content">
        <div className="winner-section">
          <h2>{getWinnerText()}</h2>
          {gameOverReason && <p className="reason">原因：{gameOverReason}</p>}
        </div>

        <div className="role-reveal-section">
          <h3>角色揭示</h3>
          <div className="player-list">
            {players.map((player) => (
              <div key={player.seat} className={`player-reveal ${player.team}`}>
                <span className="seat">{player.seat}號</span>
                <span className="name">{player.name}</span>
                <span className="role">
                  {player.roleName} ({player.team === 'good' ? '善良' : '邪惡'})
                </span>
                {!player.isAlive && <span className="dead">☠</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseDisplay>
  );
}
