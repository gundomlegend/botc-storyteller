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
    <div
      className="drunk-indicator"
      style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#fff3cd',
        border: '2px solid #ffc107',
        borderRadius: '4px',
      }}
    >
      <strong style={{ color: '#e01111' }}>🍺 酒鬼角色</strong>
      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#e01111' }}>
        此玩家實際上是酒鬼，以為自己是{' '}
        <strong style={{ color: '#e01111' }}>{t(roleData, 'name')}</strong>。
        他們會執行假角色的行為，但能力不會生效。說書人可給予任意假資訊。
      </p>
    </div>
  );
}
