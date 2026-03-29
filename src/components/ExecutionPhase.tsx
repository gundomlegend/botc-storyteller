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
    <div
      className="execution-phase"
      style={{
        backgroundColor: '#fff3cd',
        border: '2px solid #ffc107',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    >
      <h3 style={{ color: '#856404' }}>強制處決階段</h3>

      <div style={{ marginBottom: '0.75rem' }}>
        <strong>今日提名記錄：</strong>
        {nominationHistory.length === 0 ? (
          <p style={{ color: '#555' }}>今天沒有提名</p>
        ) : (
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
            {nominationHistory.map((r, i) => {
              const nominator = getPlayer(r.nominatorSeat);
              const nominee = getPlayer(r.nomineeSeat);
              return (
                <li key={i}>
                  {nominator?.name ?? r.nominatorSeat}號 提名 {nominee?.name ?? r.nomineeSeat}號 —{' '}
                  {r.voteCount} 票 {r.passed ? '（通過）' : '（未通過）'}
                  {r.voteCount === maxVotes && !isTie && maxVotes > 0 && (
                    <span style={{ color: '#856404', fontWeight: 'bold' }}> ← 最高票</span>
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
          <p style={{ fontWeight: 'bold', color: '#856404' }}>
            最高票平手（{maxVotes} 票），今天沒有處決。
          </p>
          <button className="btn-secondary" onClick={onNoExecution}>
            確認：今天沒有處決，進入夜晚
          </button>
        </div>
      ) : winner ? (
        <div>
          <p style={{ fontWeight: 'bold', color: '#721c24' }}>
            最高票：{winner.seat}號 {winner.name}（{roleRegistry.getPlayerRoleName(winner)}）— {maxVotes} 票
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
