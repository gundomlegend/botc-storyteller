/**
 * Day Display - 白天階段顯示
 */

import React from 'react';
import { BaseDisplay } from '../BaseDisplay';

interface Nomination {
  nominatorName: string;
  nomineeName: string;
}

interface Voting {
  nomineeName: string;
  voteCount: number;
  threshold: number;
  voters: string[];
}

interface DayDisplayProps {
  day: number;
  alivePlayers: Array<{ seat: number; name: string; isAlive: boolean }>;
  nomination: Nomination | null;
  voting: Voting | null;
}

export function DayDisplay({ day, alivePlayers, nomination, voting }: DayDisplayProps) {
  const aliveCount = alivePlayers.filter((p) => p.isAlive).length;
  const totalCount = alivePlayers.length;

  return (
    <BaseDisplay title={`第 ${day} 天`} className="day-display">
      <div className="day-content">
        <div className="day-info">
          <p className="alive-count">
            存活玩家：{aliveCount} / {totalCount}
          </p>
        </div>

        {nomination && !voting && (
          <div className="nomination-section">
            <h3>提名階段</h3>
            <p>提名者：{nomination.nominatorName}</p>
            <p>被提名者：{nomination.nomineeName}</p>
          </div>
        )}

        {voting && (
          <div className="voting-section">
            <h3>投票中 - {voting.nomineeName}</h3>
            <p className="vote-count">
              票數：{voting.voteCount} / {voting.threshold}
              {voting.voteCount >= voting.threshold && '（通過）'}
            </p>
            {voting.voters.length > 0 && (
              <p className="voters">已投票：{voting.voters.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </BaseDisplay>
  );
}
