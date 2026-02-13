import { useGameStore } from '../store/gameStore';
import { t } from '../engine/locale';
import type { Player } from '../engine/types';

/**
 * 角色相關的輔助函數 Hook
 * 提供角色名稱獲取等常用功能
 */
export function useRoleHelpers() {
  const stateManager = useGameStore((s) => s.stateManager);

  /**
   * 獲取角色的 i18n 顯示名稱
   * @param roleId - 角色 ID（通常是要顯示的角色，例如酒鬼的假角色）
   * @param actualRole - 可選，實際角色 ID（用於判斷是否為酒鬼）
   * @returns 角色的中文名稱，酒鬼會加上 (酒鬼) 標記，例如「占卜師 (酒鬼)」
   */
  const getRoleDisplayName = (roleId: string, actualRole?: string): string => {
    const roleData = stateManager.getRoleData(roleId);
    const displayName = roleData ? t(roleData, 'name') : roleId;

    // 如果提供了 actualRole 且為酒鬼，加上標記
    if (actualRole === 'drunk') {
      return `${displayName} (酒鬼)`;
    }

    return displayName;
  };

  /**
   * 獲取角色的能力描述
   * @param roleId - 角色 ID
   * @returns 角色的能力描述
   */
  const getRoleAbility = (roleId: string): string => {
    const roleData = stateManager.getRoleData(roleId);
    return roleData ? t(roleData, 'ability') : '';
  };

  /**
   * 獲取角色的完整資料
   * @param roleId - 角色 ID
   * @returns RoleData 或 undefined
   */
  const getRoleData = (roleId: string) => {
    return stateManager.getRoleData(roleId);
  };

  /**
   * 獲取玩家的角色顯示名稱（自動處理酒鬼）
   * @param player - 玩家對象
   * @returns 格式化後的角色名稱，酒鬼會顯示「假角色 (酒鬼)」
   */
  const getPlayerRoleDisplay = (player: Player): string => {
    // 酒鬼使用假角色名稱
    const effectiveRole = player.role === 'drunk' && player.believesRole
      ? player.believesRole
      : player.role;

    return getRoleDisplayName(effectiveRole, player.role);
  };

  return {
    getRoleDisplayName,
    getRoleAbility,
    getRoleData,
    getPlayerRoleDisplay,
  };
}
