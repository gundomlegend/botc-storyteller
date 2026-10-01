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
      <div className="bg-surface-raised rounded-lg p-5">
        <h3 className="text-2xl font-bold text-warning mb-4">爪牙與惡魔互認</h3>
        <div className="mb-4">
          <p className="text-fg-muted text-xs my-2.5">此局無爪牙，跳過互認階段。</p>
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={onComplete}>
            確認跳過 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-lg p-5">
      <h3 className="text-2xl font-bold text-warning mb-4">爪牙與惡魔互認</h3>

      <div className="mb-4">
        <p className="text-fg text-md mb-2.5">請讓以下玩家睜眼：</p>

        <div className="flex flex-col gap-1.5 my-3">
          {demon && (
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-md bg-surface-card text-sm">
              <span className="text-primary font-bold min-w-9">{demon.seat}號</span>
              <span className="flex-1 text-fg">{demon.name}</span>
              <span className="text-fg-muted">
                {roleRegistry.getPlayerRoleName(demon)}
              </span>
              <span className="py-0.5 px-2 rounded-sm text-3xs font-bold text-white bg-demon">惡魔</span>
            </div>
          )}
          {minions.map((m) => (
            <div key={m.seat} className="flex items-center gap-2.5 py-2 px-3 rounded-md bg-surface-card text-sm">
              <span className="text-primary font-bold min-w-9">{m.seat}號</span>
              <span className="flex-1 text-fg">{m.name}</span>
              <span className="text-fg-muted">
                {roleRegistry.getPlayerRoleName(m)}
              </span>
              <span className="py-0.5 px-2 rounded-sm text-3xs font-bold text-white bg-minion">爪牙</span>
            </div>
          ))}
        </div>

        {step === 'wake_minions' && (
          <p className="text-fg text-md mb-2.5">讓爪牙們睜眼，並投影提示惡魔身份。</p>
        )}
        {step === 'reveal_demon' && (
          <p className="text-fg text-md mb-2.5">請爪牙們閉眼，接著喚醒惡魔，投影顯示爪牙名單。</p>
        )}
        {step === 'reveal_minions' && (
          <p className="text-fg text-md mb-2.5">惡魔確認爪牙身份後保持睜眼。</p>
        )}
      </div>

      {result.display && (
        <div className="hidden bg-surface-card p-3 rounded-md whitespace-pre-line text-xs text-fg-muted mb-3">{result.display}</div>
      )}

      <div className="mt-4">
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
