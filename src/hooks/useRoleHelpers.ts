import { useGameStore } from '../store/gameStore';
import { t } from '../engine/locale';

/**
 * 角色相關的輔助函數 Hook
 * 提供角色名稱獲取等常用功能
 */
export function useRoleHelpers() {
  const stateManager = useGameStore((s) => s.stateManager);

  /**
   * 獲取角色的 i18n 顯示名稱
   * @param roleId - 角色 ID
   * @returns 角色的中文名稱，如果找不到則返回 roleId
   */
  const getRoleDisplayName = (roleId: string): string => {
    const roleData = stateManager.getRoleData(roleId);
    return roleData ? t(roleData, 'name') : roleId;
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

  return {
    getRoleDisplayName,
    getRoleAbility,
    getRoleData,
  };
}
