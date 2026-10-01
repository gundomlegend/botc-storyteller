import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Button } from './shared/Button';

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

  // 初始化投影；unmount 時 cleanup（含中途跳離）
  useEffect(() => {
    if (hasBluffs) {
      setSpecialNightPhase({ type: 'demon_waking', message: '請惡魔保持睜眼' });
    }
    return () => setSpecialNightPhase(null);
  }, [hasBluffs, setSpecialNightPhase]);

  useEffect(() => {
    const generated = stateManager.getDemonBluffs();
    setBluffs(generated);
  }, [stateManager]);

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
      <div className="bg-surface-raised rounded-lg p-5">
        <h3 className="text-2xl font-bold text-warning mb-4">惡魔虛張聲勢</h3>
        <div className="mb-4">
          <p className="text-fg-muted text-xs my-2.5">人數未達 7 人，跳過惡魔虛張聲勢。</p>
        </div>
        <div className="mt-4">
          <Button onClick={onComplete}>
            確認跳過 →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-lg p-5">
      <h3 className="text-2xl font-bold text-warning mb-4">惡魔虛張聲勢</h3>

      <div className="mb-4">
        {step === 'wake_demon' && demon && (
          <p className="text-fg text-md mb-2.5">
            讓 {demon.seat}號 {demon.name}（
            {roleRegistry.getPlayerRoleName(demon)}）睜眼
          </p>
        )}

        <p className="text-fg text-md mb-2.5">展示以下三個角色標記：</p>

        <div className="flex gap-3 my-3">
          {bluffs.map((roleId) => {
            const roleData = roleRegistry.getRoleData(roleId);
            return (
              <div key={roleId} className="flex-1 py-4 px-3 rounded-lg bg-surface-card text-center border border-border">
                <div className="text-lg font-bold text-fg mb-1">{roleRegistry.getRoleName(roleId)}</div>
                <div className="text-2xs text-fg-muted">{roleData?.name ?? roleId}</div>
              </div>
            );
          })}
        </div>

        <p className="text-fg-muted text-xs my-2.5">
          這些是未被分配的善良角色，惡魔可以宣稱是這些角色。
        </p>

        {step === 'show_bluffs' && (
          <p className="text-fg text-md mb-2.5">讓惡魔閉眼。</p>
        )}
      </div>

      <div className="mt-4">
        {step === 'wake_demon' && (
          <Button onClick={handleShowBluffs}>
            展示偽裝 →
          </Button>
        )}
        {step === 'show_bluffs' && (
          <Button onClick={onComplete}>
            完成 →
          </Button>
        )}
      </div>
    </div>
  );
}
