import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface MinionDemonRecognitionProps {
  onComplete: () => void;
}

type Step = 'wake_minions' | 'reveal_demon' | 'reveal_minions';

export default function MinionDemonRecognition({ onComplete }: MinionDemonRecognitionProps) {
  const { stateManager, ruleEngine, roleRegistry, setSpecialNightPhase } = useGameStore();
  const [step, setStep] = useState<Step>('wake_minions');

  const result = ruleEngine.processMinionDemonRecognition(stateManager);
  const minions = stateManager.getMinionPlayers();
  const demon = stateManager.getDemonPlayer();
  const hasMinions = minions.length > 0;

  // 初始化投影；unmount 時 cleanup（含中途跳離）
  useEffect(() => {
    if (hasMinions) {
      setSpecialNightPhase({ type: 'recognition_title', message: '爪牙與惡魔互認' });
    }
    return () => setSpecialNightPhase(null);
  }, [hasMinions, setSpecialNightPhase]);

  const handleRevealDemon = () => {
    const demonLabel = demon
      ? `${demon.seat}號 ${demon.name}`
      : '（無惡魔）';
    setSpecialNightPhase({ type: 'reveal_demon', message: demonLabel });
    setStep('reveal_demon');
  };

  const handleRevealMinions = () => {
    const minionLabels = minions.map((m) => `${m.seat}號 ${m.name}`);
    setSpecialNightPhase({
      type: 'reveal_minions',
      message: '爪牙',
      data: { minions: minionLabels },
    });
    setStep('reveal_minions');
  };

  // 無爪牙：直接顯示跳過確認
  if (!hasMinions) {
    return (
      <div className="first-night-special">
        <h3>爪牙與惡魔互認</h3>
        <div className="special-instruction">
          <p className="special-note">此局無爪牙，跳過互認階段。</p>
        </div>
        <div className="special-actions">
          <button className="btn-primary" onClick={onComplete}>
            確認跳過 →
          </button>
        </div>
      </div>
    );
  }

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

        {step === 'wake_minions' && (
          <p className="special-step">讓爪牙們睜眼，並投影提示惡魔身份。</p>
        )}
        {step === 'reveal_demon' && (
          <p className="special-step">請爪牙們閉眼，接著喚醒惡魔，投影顯示爪牙名單。</p>
        )}
        {step === 'reveal_minions' && (
          <p className="special-step">惡魔確認爪牙身份後閉眼。</p>
        )}
      </div>

      {result.display && (
        <div className="special-summary">{result.display}</div>
      )}

      <div className="special-actions">
        {step === 'wake_minions' && (
          <button className="btn-primary" onClick={handleRevealDemon}>
            提示惡魔 →
          </button>
        )}
        {step === 'reveal_demon' && (
          <button className="btn-primary" onClick={handleRevealMinions}>
            提示爪牙 →
          </button>
        )}
        {step === 'reveal_minions' && (
          <button className="btn-primary" onClick={onComplete}>
            下一步 →
          </button>
        )}
      </div>
    </div>
  );
}
