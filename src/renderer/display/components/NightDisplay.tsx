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
      <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
        <div className="text-center max-w-150">
          <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">{getMessage()}</p>
        </div>
      </BaseDisplay>
    );
  }

  // 特殊階段（爪牙惡魔互認、虛張聲勢）
  if (specialPhase) {
    if (specialPhase.type === 'show_bluffs') {
      return (
        <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
          <div className="text-center max-w-150">
            <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">{specialPhase.message}</p>
            <div className="flex gap-5 justify-center flex-wrap mt-4">
              {(specialPhase.data?.bluffs ?? []).map((name) => (
                <div key={name} className="bg-team-bluff/15 border-2 border-team-bluff/50 rounded-xl py-4 px-7 text-5xl font-bold text-center min-w-25 animate-fade-in-fast">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </BaseDisplay>
      );
    }

    if (specialPhase.type === 'reveal_demon') {
      return (
        <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
          <div className="text-center max-w-150">
            <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">惡魔</p>
            <div data-testid="demon-card" className="bg-team-demon/15 border-2 border-team-demon/50 rounded-xl py-4 px-7 text-5xl font-bold text-center min-w-25 mt-4 animate-fade-in-fast">
              {specialPhase.message}
            </div>
          </div>
        </BaseDisplay>
      );
    }

    if (specialPhase.type === 'reveal_minions') {
      return (
        <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
          <div className="text-center max-w-150">
            <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">{specialPhase.message}</p>
            <div className="flex gap-4 justify-center flex-wrap mt-4">
              {(specialPhase.data?.minions ?? []).map((label) => (
                <div key={label} className="bg-team-minion/15 border-2 border-team-minion/50 rounded-xl py-3 px-5 text-3xl font-bold text-center min-w-22.5 animate-fade-in-fast">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </BaseDisplay>
      );
    }

    return (
      <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
        <div className="text-center max-w-150">
          <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">{specialPhase.message}</p>
        </div>
      </BaseDisplay>
    );
  }

  // 預設：所有人閉眼
  return (
    <BaseDisplay title={title} background="bg-linear-135/srgb from-night-from to-night-to">
      <div className="text-center max-w-150">
        <p className="text-8xl leading-normal whitespace-pre-line animate-fade-in">所有人保持閉眼</p>
      </div>
    </BaseDisplay>
  );
}
