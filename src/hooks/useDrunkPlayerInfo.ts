import { useGameStore } from '../store/gameStore';
import type { NightOrderItem } from '../engine/types';

/**
 * 酒鬼玩家資訊檢測 Hook
 * 處理酒鬼角色的檢測和有效角色計算
 */
export function useDrunkPlayerInfo(item: NightOrderItem) {
  const { stateManager, roleRegistry } = useGameStore();

  const player = stateManager.getPlayer(item.seat);
  const isDrunkRole = player?.role === 'drunk';
  const believesRole = isDrunkRole ? player?.believesRole : null;

  // 酒鬼使用假角色的資料
  const effectiveRole = isDrunkRole && believesRole ? believesRole : item.role;
  const roleData = roleRegistry.getRoleData(effectiveRole);

  return {
    player,
    isDrunkRole,
    believesRole,
    effectiveRole,
    roleData,
  };
}
