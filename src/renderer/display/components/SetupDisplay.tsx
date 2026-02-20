/**
 * Setup Display - 等待遊戲開始
 */

import React from 'react';
import { BaseDisplay } from '../BaseDisplay';

interface SetupDisplayProps {
  playerCount: number;
}

export function SetupDisplay({ playerCount }: SetupDisplayProps) {
  return (
    <BaseDisplay title="等待遊戲開始" className="setup-display">
      <div className="setup-content">
        <p className="waiting-message">請稍候...</p>
        {playerCount > 0 && <p className="player-count">{playerCount} 位玩家</p>}
      </div>
    </BaseDisplay>
  );
}
