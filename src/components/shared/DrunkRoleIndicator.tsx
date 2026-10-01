import type { RoleData } from '../../engine/types';

interface DrunkRoleIndicatorProps {
  isDrunkRole: boolean;
  roleData?: RoleData;
}

/**
 * 酒鬼角色標記組件
 * 當玩家實際上是酒鬼但以為自己是其他角色時顯示警告
 */
export default function DrunkRoleIndicator({ isDrunkRole, roleData }: DrunkRoleIndicatorProps) {
  if (!isDrunkRole || !roleData) {
    return null;
  }

  return (
    <div className="drunk-indicator bg-drunk-alert-surface border-2 border-drunk-alert rounded-lg p-4 mb-4">
      <strong className="text-drunk-alert">🍺 酒鬼角色</strong>
      <p className="mt-2 text-white">
        此玩家實際上是酒鬼，以為自己是 <strong>{roleData.name_cn}</strong>。
        他們會執行假角色的行為，但能力不會生效。說書人可給予任意假資訊。
      </p>
    </div>
  );
}
