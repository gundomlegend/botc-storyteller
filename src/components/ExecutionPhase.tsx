/**
 * ExecutionPhase — 強制處決階段
 * 在以下情況觸發：連續 2 次投票失敗、提名達 4 次、說書人手動結束白天
 *
 * 規則：所有提名中取得最高票者被處決；平票則宣告無處決。
 */

import type { Player } from '../engine/types';

interface NominationRecord {
  nominatorSeat: number;
  nomineeSeat: number;
  voteCount: number;
  passed: boolean;
}

interface ExecutionPhaseProps {
  nominationHistory: NominationRecord[];
  players: Player[];
  roleRegistry: { getRoleName: (roleId: string) => string; getPlayerRoleName: (p: Player) => string };
  onExecute: (seat: number) => void;
  onNoExecution: () => void;
}

export function ExecutionPhase({
  nominationHistory,
  players,
  roleRegistry,
  onExecute,
  onNoExecution,
}: ExecutionPhaseProps) {
  const getPlayer = (seat: number) => players.find((p) => p.seat === seat);

  // Find highest vote-getter
  const maxVotes = Math.max(...nominationHistory.map((r) => r.voteCount), 0);
  const topCandidates = nominationHistory.filter((r) => r.voteCount === maxVotes && maxVotes > 0);
  const isTie = topCandidates.length > 1;
  const winner = !isTie && topCandidates.length === 1 ? getPlayer(topCandidates[0].nomineeSeat) : null;

  return (
    <div className="bg-alert-warning-surface border-2 border-alert-warning-border p-4 rounded-lg mb-4">
      <h3 className="text-lg font-bold text-alert-warning-text mb-2.5">強制處決階段</h3>

      <div className="mb-3">
        <strong>今日提名記錄：</strong>
        {nominationHistory.length === 0 ? (
          <p className="text-neutral-700">今天沒有提名</p>
        ) : (
          <ul className="list-disc my-2 mx-0 pl-5">
            {nominationHistory.map((r, i) => {
              const nominator = getPlayer(r.nominatorSeat);
              const nominee = getPlayer(r.nomineeSeat);
              return (
                <li key={i}>
                  {nominator?.name ?? r.nominatorSeat}號 提名 {nominee?.name ?? r.nomineeSeat}號 —{' '}
                  {r.voteCount} 票 {r.passed ? '（通過）' : '（未通過）'}
                  {r.voteCount === maxVotes && !isTie && maxVotes > 0 && (
                    <span className="text-alert-warning-text font-bold"> ← 最高票</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {nominationHistory.length === 0 ? (
        <div>
          <p>今天沒有提名，無需處決。</p>
          <button className="btn-primary" onClick={onNoExecution}>
            今天沒有處決，進入夜晚
          </button>
        </div>
      ) : isTie ? (
        <div>
          <p className="font-bold text-alert-warning-text">
            最高票平手（{maxVotes} 票），今天沒有處決。
          </p>
          <button className="btn-secondary" onClick={onNoExecution}>
            確認：今天沒有處決，進入夜晚
          </button>
        </div>
      ) : winner ? (
        <div>
          <p className="font-bold text-alert-danger-text">
            最高票：{winner.seat}號 {winner.name}（{roleRegistry.getPlayerRoleName(winner)}）— {maxVotes} 票
          </p>
          <div className="flex gap-2 mt-2">
            <button className="btn-danger" onClick={() => onExecute(winner.seat)}>
              處決 {winner.name}，進入夜晚
            </button>
            <button className="btn-secondary" onClick={onNoExecution}>
              說書人裁決：今天沒有處決
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p>今天沒有有效票數，無需處決。</p>
          <button className="btn-secondary" onClick={onNoExecution}>
            今天沒有處決，進入夜晚
          </button>
        </div>
      )}
    </div>
  );
}
