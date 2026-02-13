import { useGameStore } from '../store/gameStore';
import type { NightOrderItem } from '../engine/types';

export interface PlayerRealTimeStatus {
  isPoisoned: boolean;
  isDrunk: boolean;
  isProtected: boolean;
  isDead: boolean;
}

/**
 * 讀取玩家的即時狀態（從 stateManager）
 *
 * @param item - 夜間行動項目（包含初始狀態快照）
 * @returns 玩家的即時狀態
 *
 * @remarks
 * item 是夜晚開始時的快照，不會反映夜間中毒等變化。
 * 此 hook 從 stateManager 讀取最新狀態以確保即時性。
 */
export function usePlayerRealTimeStatus(item: NightOrderItem): PlayerRealTimeStatus {
  const { stateManager } = useGameStore();

  const currentPlayer = stateManager.getPlayer(item.seat);
  const isPoisoned = currentPlayer?.isPoisoned ?? item.isPoisoned;
  const isDrunk = currentPlayer?.isDrunk ?? item.isDrunk;
  const isProtected = currentPlayer?.isProtected ?? item.isProtected;
  const isDead = currentPlayer ? !currentPlayer.isAlive : item.isDead;

  return {
    isPoisoned,
    isDrunk,
    isProtected,
    isDead,
  };
}
