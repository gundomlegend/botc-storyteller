import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface DemonBluffsProps {
  onComplete: () => void;
}

export default function DemonBluffs({ onComplete }: DemonBluffsProps) {
  const { stateManager, ruleEngine } = useGameStore();
  const [bluffs, setBluffs] = useState<string[]>([]);

  const demon = stateManager.getDemonPlayer();

  useEffect(() => {
    const generated = stateManager.generateDemonBluffs();
    setBluffs(generated);
  }, [stateManager]);

  return (
    <div className="first-night-special">
      <h3>惡魔虛張聲勢</h3>

      <div className="special-instruction">
        {demon && (
          <p className="special-step">
            讓 {demon.seat}號 {demon.name}（
            {ruleEngine.getRoleName(demon.role)}）睜眼
          </p>
        )}

        <p className="special-step">展示以下三個角色標記：</p>

        <div className="bluff-tokens">
          {bluffs.map((roleId) => {
            const roleData = ruleEngine.getRoleData(roleId);
            return (
              <div key={roleId} className="bluff-token">
                <div className="bluff-name-cn">{ruleEngine.getRoleName(roleId)}</div>
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
        <button className="btn-primary" onClick={onComplete}>
          完成 — 下一步
        </button>
      </div>
    </div>
  );
}
