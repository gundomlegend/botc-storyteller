import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface DemonBluffsProps {
  onComplete: () => void;
}

type Step = 'wake_demon' | 'show_bluffs';

export default function DemonBluffs({ onComplete }: DemonBluffsProps) {
  const { stateManager, roleRegistry, setSpecialNightPhase } = useGameStore();
  const [bluffs, setBluffs] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('wake_demon');

  const demon = stateManager.getDemonPlayer();
  const playerCount = stateManager.getState().playerCount;
  const hasBluffs = playerCount >= 7;

  useEffect(() => {
    const generated = stateManager.getDemonBluffs();
    setBluffs(generated);
  }, [stateManager]);

  // unmount 時 cleanup（含中途跳離）
  useEffect(() => {
    return () => setSpecialNightPhase(null);
  }, [setSpecialNightPhase]);

  const handleShowBluffs = () => {
    const bluffNames = bluffs.map((id) => roleRegistry.getRoleName(id));
    setSpecialNightPhase({
      type: 'show_bluffs',
      message: '偽裝角色',
      data: { bluffs: bluffNames },
    });
    setStep('show_bluffs');
  };

  // 人數不足：跳過
  if (!hasBluffs) {
    return (
      <div className="first-night-special">
        <h3>惡魔虛張聲勢</h3>
        <div className="special-instruction">
          <p className="special-note">人數未達 7 人，跳過惡魔虛張聲勢。</p>
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
      <h3>惡魔虛張聲勢</h3>

      <div className="special-instruction">
        {step === 'wake_demon' && demon && (
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

        {step === 'show_bluffs' && (
          <p className="special-step">讓惡魔閉眼。</p>
        )}
      </div>

      <div className="special-actions">
        {step === 'wake_demon' && (
          <button className="btn-primary" onClick={handleShowBluffs}>
            展示偽裝 →
          </button>
        )}
        {step === 'show_bluffs' && (
          <button className="btn-primary" onClick={onComplete}>
            完成 →
          </button>
        )}
      </div>
    </div>
  );
}
