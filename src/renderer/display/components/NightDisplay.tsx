/**
 * Night Display - 夜間階段顯示
 */

import { BaseDisplay } from '../BaseDisplay';

interface NightAction {
  index: number;
  seat: number;
  roleName: string;
  phase: 'waking' | 'awake' | 'closing';
}

interface NightDisplayProps {
  night: number;
  nightAction: NightAction | null;
}

export function NightDisplay({ night, nightAction }: NightDisplayProps) {
  const getTitle = () => {
    return `第 ${night} 夜 - 夜晚降臨`;
  };

  const getMessage = () => {
    if (!nightAction) {
      return '所有人保持閉眼';
    }

    const { seat, roleName, phase } = nightAction;

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

  return (
    <BaseDisplay title={getTitle()} className="night-display">
      <div className="night-content">
        <p className="night-message">{getMessage()}</p>
      </div>
    </BaseDisplay>
  );
}
