import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface DemonBluffsProps {
  onComplete: () => void;
}

type Step = 'close_minions' | 'reveal_minions' | 'show_bluffs';

export default function DemonBluffs({ onComplete }: DemonBluffsProps) {
  const { stateManager, roleRegistry, setSpecialNightPhase } = useGameStore();
  const [bluffs, setBluffs] = useState<string[]>([]);

  const demon = stateManager.getDemonPlayer();
  const minions = stateManager.getMinionPlayers();
  const hasMinions = minions.length > 0;

  const initialStep: Step = hasMinions ? 'close_minions' : 'show_bluffs';
  const [step, setStep] = useState<Step>(initialStep);

  useEffect(() => {
    const generated = stateManager.generateDemonBluffs();
    setBluffs(generated);
  }, [stateManager]);

  // 初始化投影；unmount 時 cleanup（含中途跳離）
  useEffect(() => {
    if (hasMinions) {
      setSpecialNightPhase({ type: 'close_minions', message: '請爪牙們閉上眼睛' });
    } else {
      setSpecialNightPhase({ type: 'show_bluffs', message: '偽裝角色' });
    }
    return () => setSpecialNightPhase(null);
  }, [hasMinions, setSpecialNightPhase]);

  const handleRevealMinions = () => {
    const minionList = minions.map((m) => `${m.name}(${m.seat}號)`).join('　');
    setSpecialNightPhase({ type: 'reveal_minions', message: minionList });
    setStep('reveal_minions');
  };

  const handleShowBluffs = () => {
    // 預先將 role ID 轉換為中文名稱，NightDisplay 不需要 roleRegistry
    const bluffNames = bluffs.map((id) => roleRegistry.getRoleName(id));
    setSpecialNightPhase({
      type: 'show_bluffs',
      message: '偽裝角色',
      data: { bluffs: bluffNames },
    });
    setStep('show_bluffs');
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="first-night-special">
      <h3>惡魔虛張聲勢</h3>

      <div className="special-instruction">
        {demon && (
          <p className="special-step">
            讓 {demon.seat}號 {demon.name}（
            {roleRegistry.getPlayerRoleName(demon)}）睜眼
          </p>
        )}

        <p className="special-step">展示以下三個角色標記：</p>

        <div className="bluff-tokens">
          {bluffs.map((roleId) => {
            const roleData = roleRegistry.getRoleData(roleId);
            return (
              <div key={roleId} className="bluff-token">
                <div className="bluff-name-cn">{roleRegistry.getRoleName(roleId)}</div>
                <div className="bluff-name-en">{roleData?.name ?? roleId}</div>
              </div>
            );
          })}
        </div>

        <p className="special-note">
          這些是未被分配的善良角色，惡魔可以宣稱是這些角色。
        </p>
        <p className="special-step">讓惡魔閉眼。</p>
      </div>

      <div className="special-actions">
        {step === 'close_minions' && (
          <button className="btn-primary" onClick={handleRevealMinions}>
            顯示爪牙 →
          </button>
        )}
        {step === 'reveal_minions' && (
          <button className="btn-primary" onClick={handleShowBluffs}>
            展示偽裝 →
          </button>
        )}
        {step === 'show_bluffs' && (
          <button className="btn-primary" onClick={handleComplete}>
            完成 →
          </button>
        )}
      </div>
    </div>
  );
}
