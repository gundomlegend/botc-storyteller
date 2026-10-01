import { t } from '../../engine/locale';
import type { RoleData } from '../../engine/types';

interface DrunkIndicatorProps {
  roleData: RoleData;
}

/**
 * 酒鬼角色指示器
 * 顯示黃色警告框，提醒說書人此玩家是酒鬼
 */
export function DrunkIndicator({ roleData }: DrunkIndicatorProps) {
  return (
    <div className="drunk-indicator py-2 px-3 mx-0 my-2 bg-alert-warning-surface border-2 border-alert-warning-border rounded-sm">
      <strong className="text-drunk-alert">🍺 酒鬼角色</strong>
      <p className="m-0 mt-1 text-sm text-drunk-alert">
        此玩家實際上是酒鬼，以為自己是{' '}
        <strong className="text-drunk-alert">{t(roleData, 'name')}</strong>。
        他們會執行假角色的行為，但能力不會生效。說書人可給予任意假資訊。
      </p>
    </div>
  );
}
