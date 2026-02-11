import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../engine/types';
import PlayerSelector from './PlayerSelector';

export default function DayView() {
  const { day, players, alivePlayers, killPlayer, startNight, ruleEngine } = useGameStore();

  const [nominatorSeat, setNominatorSeat] = useState<number | null>(null);
  const [nomineeSeat, setNomineeSeat] = useState<number | null>(null);
  const [votes, setVotes] = useState<Set<number>>(new Set());
  const [showVoting, setShowVoting] = useState(false);

  const nominee = nomineeSeat != null ? players.find((p) => p.seat === nomineeSeat) : null;
  const voteThreshold = Math.ceil(alivePlayers.length / 2);
  const voteCount = votes.size;
  const votePassed = voteCount >= voteThreshold;

  // 管家投票警告：票數照算，但提醒說書人確認主人是否投票
  const butler = players.find((p) => p.role === 'butler' && p.isAlive);
  const butlerVoted = butler != null && votes.has(butler.seat);
  // TODO: 等 Butler handler 實作後，改從 GameStateManager 取得主人座位
  // 目前僅提醒說書人手動確認

  const handleNominate = () => {
    if (nominatorSeat != null && nomineeSeat != null) {
      setShowVoting(true);
      setVotes(new Set());
    }
  };

  const toggleVote = (seat: number) => {
    setVotes((prev) => {
      const next = new Set(prev);
      if (next.has(seat)) {
        next.delete(seat);
      } else {
        next.add(seat);
      }
      return next;
    });
  };

  const handleExecute = () => {
    if (nomineeSeat != null) {
      killPlayer(nomineeSeat, 'execution');
      resetNomination();
    }
  };

  const resetNomination = () => {
    setNominatorSeat(null);
    setNomineeSeat(null);
    setVotes(new Set());
    setShowVoting(false);
  };

  return (
    <div className="day-view">
      <h2>第 {day} 天</h2>

      {/* 玩家狀態列表 */}
      <div className="day-players">
        <h3>玩家狀態</h3>
        <div className="player-status-list">
          {players.map((p) => (
            <div
              key={p.seat}
              className={`player-status-row ${!p.isAlive ? 'dead' : ''}`}
            >
              <span className="ps-seat">{p.seat}</span>
              <span className="ps-name">{p.name}</span>
              <span className="ps-role">{ruleEngine.getRoleName(p.role)}</span>
              <span className="ps-alive">{p.isAlive ? '存活' : '死亡'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 提名區域 */}
      {!showVoting && (
        <div className="day-nomination">
          <h3>提名</h3>
          <div className="nomination-selectors">
            <div className="nomination-group">
              <p>提名者：</p>
              <PlayerSelector
                mode="single"
                onlyAlive={true}
                label="選擇提名者"
                onSelect={(ps: Player[]) => setNominatorSeat(ps[0]?.seat ?? null)}
              />
            </div>
            <div className="nomination-group">
              <p>被提名者：</p>
              <PlayerSelector
                mode="single"
                onlyAlive={false}
                excludePlayers={nominatorSeat != null ? [nominatorSeat] : []}
                label="選擇被提名者"
                onSelect={(ps: Player[]) => setNomineeSeat(ps[0]?.seat ?? null)}
              />
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={nominatorSeat == null || nomineeSeat == null}
            onClick={handleNominate}
          >
            發起投票
          </button>
        </div>
      )}

      {/* 投票區域 */}
      {showVoting && nominee && (
        <div className="day-voting">
          <h3>
            投票 — {nominee.name}（{nominee.seat}號）
          </h3>
          <p>
            需要 {voteThreshold} 票通過（存活 {alivePlayers.length} 人）
          </p>

          <div className="voting-players">
            {alivePlayers.map((p) => (
              <button
                key={p.seat}
                className={`vote-btn ${votes.has(p.seat) ? 'voted' : ''}`}
                onClick={() => toggleVote(p.seat)}
              >
                {p.seat} {p.name}
              </button>
            ))}
          </div>

          <div className="voting-result">
            <span>
              票數：{voteCount} / {voteThreshold}
            </span>
            {votePassed && <span className="vote-passed">通過</span>}
          </div>

          {butlerVoted && (
            <div className="voting-warning">
              注意：管家（{butler!.name}）已投票，請確認其主人是否也已投票，否則此票可能無效
            </div>
          )}

          <div className="voting-actions">
            {votePassed && (
              <button className="btn-danger" onClick={handleExecute}>
                處決 {nominee.name}
              </button>
            )}
            <button className="btn-secondary" onClick={resetNomination}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="day-footer">
        <button className="btn-primary" onClick={startNight}>
          進入夜晚
        </button>
      </div>
    </div>
  );
}
