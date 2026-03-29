/**
 * Day Display - 白天階段顯示
 */

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

interface GameEvent {
  type: string;
  description: string;
}

interface DayDisplayProps {
  day: number;
  alivePlayers: Array<{ seat: number; name: string; isAlive: boolean }>;
  nomination: Nomination | null;
  voting: Voting | null;
  history?: GameEvent[];
  dawnDeaths?: Array<{ seat: number; name: string }>;
}

export function DayDisplay({ day, alivePlayers, nomination, voting, history = [], dawnDeaths = [] }: DayDisplayProps) {
  const aliveCount = alivePlayers.filter((p) => p.isAlive).length;
  const totalCount = alivePlayers.length;
  const recentEvents = history.slice(-5);

  return (
    <BaseDisplay title={`第 ${day} 天`} className="day-display">
      <div className="day-content">

        {/* 黎明公告 */}
        <div className="dawn-announcement">
          {dawnDeaths.length > 0 ? (
            <>
              <h3>昨夜死亡</h3>
              <ul>
                {dawnDeaths.map((p) => (
                  <li key={p.seat}>{p.seat}號 {p.name}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="peaceful-night">昨夜平安</p>
          )}
        </div>

        {/* 玩家列表 */}
        <div className="player-list">
          <h3>玩家（{aliveCount} / {totalCount} 存活）</h3>
          <ul>
            {alivePlayers.map((p) => (
              <li
                key={p.seat}
                style={p.isAlive ? undefined : { opacity: 0.5, color: '#888' }}
              >
                {p.seat}號 {p.name}{!p.isAlive && ' †'}
              </li>
            ))}
          </ul>
        </div>

        {/* 公開事件（最後 5 筆，從舊到新） */}
        {recentEvents.length > 0 && (
          <div className="public-events">
            <h3>公開事件</h3>
            <ul>
              {recentEvents.map((e, i) => (
                <li key={i}>{e.description}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 提名 / 投票 */}
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
