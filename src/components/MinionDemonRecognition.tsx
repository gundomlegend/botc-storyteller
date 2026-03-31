import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface MinionDemonRecognitionProps {
  onComplete: () => void;
}

type Step = 'title' | 'reveal_demon';

export default function MinionDemonRecognition({ onComplete }: MinionDemonRecognitionProps) {
  const { stateManager, ruleEngine, roleRegistry, setSpecialNightPhase } = useGameStore();
  const [step, setStep] = useState<Step>('title');

  const result = ruleEngine.processMinionDemonRecognition(stateManager);
  const minions = stateManager.getMinionPlayers();
  const demon = stateManager.getDemonPlayer();

  // 初始化投影：顯示互認標題；unmount 時 cleanup（含中途跳離）
  useEffect(() => {
    setSpecialNightPhase({ type: 'recognition_title', message: '爪牙與惡魔互認' });
    return () => setSpecialNightPhase(null);
  }, [setSpecialNightPhase]);

  const handleRevealDemon = () => {
    const demonLabel = demon
      ? `${demon.seat}號 ${demon.name} 是惡魔`
      : '（無惡魔）';
    setSpecialNightPhase({ type: 'reveal_demon', message: demonLabel });
    setStep('reveal_demon');
  };

  const handleNext = () => {
    // useEffect cleanup 會在 onComplete 後 unmount 時執行
    onComplete();
  };

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
                {roleRegistry.getPlayerRoleName(demon)}
              </span>
              <span className="special-team-tag">惡魔</span>
            </div>
          )}
          {minions.map((m) => (
            <div key={m.seat} className="special-player minion">
              <span className="special-seat">{m.seat}號</span>
              <span className="special-name">{m.name}</span>
              <span className="special-role">
                {roleRegistry.getPlayerRoleName(m)}
              </span>
              <span className="special-team-tag">爪牙</span>
            </div>
          ))}
        </div>

        {step === 'title' && <p className="special-step">請喚醒爪牙們後，再按下提示惡魔。 </p>}
        {step === 'reveal_demon' && <p className="special-step">請爪牙們閉眼，接著喚醒惡魔。</p>}
      </div>

      {result.display && (
        <div className="special-summary">{result.display}</div>
      )}

      <div className="special-actions">
        {step === 'title' && (
          <button className="btn-primary" onClick={handleRevealDemon}>
            提示惡魔 →
          </button>
        )}
        {step === 'reveal_demon' && (
          <button className="btn-primary" onClick={handleNext}>
            下一步 →
          </button>
        )}
      </div>
    </div>
  );
}
