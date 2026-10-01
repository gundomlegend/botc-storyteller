/**
 * Setup Display - 等待遊戲開始
 */

import { BaseDisplay } from '../BaseDisplay';

interface SetupDisplayProps {
  playerCount: number;
}

export function SetupDisplay({ playerCount }: SetupDisplayProps) {
  return (
    <BaseDisplay title="等待遊戲開始">
      <div className="text-center">
        <p className="text-7xl mb-4">請稍候...</p>
        {playerCount > 0 && <p className="text-4xl text-info">{playerCount} 位玩家</p>}
      </div>
    </BaseDisplay>
  );
}
