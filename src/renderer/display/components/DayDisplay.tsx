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
    <BaseDisplay title={`第 ${day} 天`} background="bg-linear-135/srgb from-day-from to-day-to">
      <div className="max-w-175 w-full">

        {/* 黎明公告 */}
        <div>
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
            <p>昨夜平安</p>
          )}
        </div>

        {/* 玩家列表 */}
        {/* TODO(tailwind): off-grid spacing (0.8rem) — see Phase 3 batch 3 report */}
        <div className="flex flex-col" style={{ gap: '0.8rem' }}>
          <h3>玩家（{aliveCount} / {totalCount} 存活）</h3>
          <ul>
            {alivePlayers.map((p) => (
              <li key={p.seat} className={p.isAlive ? undefined : 'opacity-50 text-neutral-500'}>
                {p.seat}號 {p.name}{!p.isAlive && ' †'}
              </li>
            ))}
          </ul>
        </div>

        {/* 公開事件（最後 5 筆，從舊到新） */}
        {recentEvents.length > 0 && (
          <div>
            <h3>公開事件</h3>
            <ul>
              {recentEvents.map((e, i) => (
                <li key={i}>{e.description}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 提名 / 投票 */}
        <div className="text-center mb-8">
          <p className="text-6xl text-info">
            存活玩家：{aliveCount} / {totalCount}
          </p>
        </div>

        {nomination && !voting && (
          <div className="bg-black/30 p-8 rounded-2xl mt-4">
            <h3 className="mt-0 text-4xl font-bold text-highlight">提名階段</h3>
            <p className="text-2xl" style={{ margin: '0.8rem 0' }}>提名者：{nomination.nominatorName}</p>
            <p className="text-2xl" style={{ margin: '0.8rem 0' }}>被提名者：{nomination.nomineeName}</p>
          </div>
        )}

        {voting && (
          <div className="bg-black/30 p-8 rounded-2xl mt-4">
            <h3 className="mt-0 text-4xl font-bold text-highlight">投票中 - {voting.nomineeName}</h3>
            <p className="text-2xl font-bold text-fg" style={{ margin: '0.8rem 0' }}>
              票數：{voting.voteCount} / {voting.threshold}
              {voting.voteCount >= voting.threshold && '（通過）'}
            </p>
            {voting.voters.length > 0 && (
              <p className="text-2xl text-fg-subtle" style={{ margin: '0.8rem 0' }}>已投票：{voting.voters.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </BaseDisplay>
  );
}
