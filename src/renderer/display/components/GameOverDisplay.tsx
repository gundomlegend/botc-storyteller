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
    <BaseDisplay title="遊戲結束">
      <div className="w-full max-w-225">
        <div className="text-center mb-8">
          <h2 className="text-9xl font-bold mb-4">{getWinnerText()}</h2>
          {gameOverReason && <p className="text-4xl text-highlight">原因：{gameOverReason}</p>}
        </div>

        <div>
          <h3 className="text-6xl font-bold text-center mb-6">角色揭示</h3>
          <div className="flex flex-col gap-3">
            {players.map((player) => (
              <div
                key={player.seat}
                className={`bg-black/30 p-4 rounded-lg flex gap-4 items-center text-xl border-l-4 ${player.team === 'good' ? 'border-l-good' : 'border-l-evil'}`}
              >
                <span className="font-bold text-info">{player.seat}號</span>
                <span className="flex-1">{player.name}</span>
                <span className="text-highlight">
                  {player.roleName} ({player.team === 'good' ? '善良' : '邪惡'})
                </span>
                {!player.isAlive && <span className="text-4xl">☠</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseDisplay>
  );
}
