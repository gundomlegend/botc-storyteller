import { useGameStore } from '../store/gameStore';

interface MinionDemonRecognitionProps {
  onComplete: () => void;
}

export default function MinionDemonRecognition({ onComplete }: MinionDemonRecognitionProps) {
  const { stateManager, ruleEngine } = useGameStore();

  const result = ruleEngine.processMinionDemonRecognition(stateManager);
  const minions = stateManager.getMinionPlayers();
  const demon = stateManager.getDemonPlayer();

  return (
    <div className="first-night-special">
      <h3>爪牙與惡魔互認</h3>

      <div className="special-instruction">
        <p className="special-step">請讓以下玩家睜眼：</p>

        <div className="special-player-list">
          {demon && (
            <div className="special-player demon">
              <span className="special-seat">{demon.seat}號</span>
              <span className="special-name">{demon.name}</span>
              <span className="special-role">
                {ruleEngine.getPlayerRoleName(demon)}
              </span>
              <span className="special-team-tag">惡魔</span>
            </div>
          )}
          {minions.map((m) => (
            <div key={m.seat} className="special-player minion">
              <span className="special-seat">{m.seat}號</span>
              <span className="special-name">{m.name}</span>
              <span className="special-role">
                {ruleEngine.getPlayerRoleName(m)}
              </span>
              <span className="special-team-tag">爪牙</span>
            </div>
          ))}
        </div>

        <p className="special-step">讓他們互相確認身份。</p>
        <p className="special-step">確認完畢後，讓他們閉眼。</p>
      </div>

      {result.display && (
        <div className="special-summary">{result.display}</div>
      )}

      <div className="special-actions">
        <button className="btn-primary" onClick={onComplete}>
          完成 — 下一步
        </button>
      </div>
    </div>
  );
}
