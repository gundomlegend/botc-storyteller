/**
 * Night Display - 夜間階段顯示
 */

import { BaseDisplay } from '../BaseDisplay';
import type { SpecialNightPhase } from '../../../engine/types';

interface NightAction {
  index: number;
  seat: number;
  roleName: string;
  phase: 'waking' | 'awake' | 'closing';
}

interface NightDisplayProps {
  night: number;
  nightAction: NightAction | null;
  specialPhase: SpecialNightPhase | null;
}

export function NightDisplay({ night, nightAction, specialPhase }: NightDisplayProps) {
  const title = `第 ${night} 夜 - 夜晚降臨`;

  const getMessage = () => {
    const { seat, roleName, phase } = nightAction!;
    switch (phase) {
      case 'waking':
        return `${seat}號 ${roleName} 請睜眼`;
      case 'awake':
        return `${seat}號 ${roleName}\n請執行你的能力`;
      case 'closing':
        return `${seat}號 請閉眼`;
      default:
        return '所有人保持閉眼';
    }
  };

  // 一般角色行動
  if (nightAction) {
    return (
      <BaseDisplay title={title} className="night-display">
        <div className="night-content">
          <p className="night-message">{getMessage()}</p>
        </div>
      </BaseDisplay>
    );
  }

  // 特殊階段（爪牙惡魔互認、虛張聲勢）
  if (specialPhase) {
    if (specialPhase.type === 'show_bluffs') {
      return (
        <BaseDisplay title={title} className="night-display">
          <div className="night-content">
            <p className="night-message">{specialPhase.message}</p>
            <div className="display-bluff-cards">
              {(specialPhase.data?.bluffs ?? []).map((name) => (
                <div key={name} className="display-bluff-card">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </BaseDisplay>
      );
    }

    if (specialPhase.type === 'reveal_minions') {
      return (
        <BaseDisplay title={title} className="night-display">
          <div className="night-content">
            <p className="night-message">{specialPhase.message}</p>
            <div className="display-minion-cards">
              {(specialPhase.data?.minions ?? []).map((label) => (
                <div key={label} className="display-minion-card">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </BaseDisplay>
      );
    }

    return (
      <BaseDisplay title={title} className="night-display">
        <div className="night-content">
          <p className="night-message">{specialPhase.message}</p>
        </div>
      </BaseDisplay>
    );
  }

  // 預設：所有人閉眼
  return (
    <BaseDisplay title={title} className="night-display">
      <div className="night-content">
        <p className="night-message">所有人保持閉眼</p>
      </div>
    </BaseDisplay>
  );
}
