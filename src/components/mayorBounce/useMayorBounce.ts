import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { NightResult, Player } from '../../engine/types';

/**
 * 鎮長轉移狀態管理 Hook
 * 封裝鎮長死亡轉移的業務邏輯和狀態
 */
export function useMayorBounce(result: NightResult, onDone: () => void) {
  const stateManager = useGameStore((s) => s.stateManager);

  // 轉移目標：null = 未選擇，-1 = 不轉移（鎮長死亡），其他數字 = 轉移目標座位號
  const [target, setTarget] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // 從結果中提取鎮長資訊
  const info = result.info as Record<string, unknown>;
  const mayorSeat = info.mayorSeat as number;
  const mayorName = info.mayorName as string;

  /**
   * 處理玩家目標選擇
   */
  const handleTargetSelect = (players: Player[]) => {
    setTarget(players[0]?.seat ?? null);
  };

  /**
   * 處理「不轉移」選擇
   */
  const handleNoTransfer = () => {
    setTarget(-1);
    setConfirmed(true);
  };

  /**
   * 處理「確認轉移」
   */
  const handleConfirmTransfer = () => {
    if (target !== null && target !== -1) {
      setConfirmed(true);
    }
  };

  /**
   * 重選（返回選擇階段）
   */
  const handleReset = () => {
    setTarget(null);
    setConfirmed(false);
  };

  /**
   * 執行不轉移：擊殺鎮長本人
   */
  const executeNoTransfer = () => {
    useGameStore.getState().killPlayer(mayorSeat, 'demon_kill');
    stateManager.logEvent({
      type: 'ability_use',
      description: `鎮長 ${mayorSeat}號 (${mayorName}) 被小惡魔擊殺（說書人選擇不轉移）`,
      details: { mayorSeat, mayorName, bounced: false },
    });
    onDone();
  };

  /**
   * 執行轉移：擊殺轉移目標
   */
  const executeTransfer = (targetSeat: number) => {
    const targetPlayer = stateManager.getPlayer(targetSeat);
    useGameStore.getState().killPlayer(targetSeat, 'demon_kill');
    stateManager.logEvent({
      type: 'ability_use',
      description: `鎮長轉移死亡：${targetSeat}號 ${targetPlayer?.name ?? ''} 被擊殺（原目標：鎮長 ${mayorSeat}號）`,
      details: {
        mayorSeat,
        mayorName,
        bounced: true,
        bouncedTo: targetSeat,
        bouncedToName: targetPlayer?.name,
        bouncedToRole: targetPlayer?.role,
      },
    });
    onDone();
  };

  return {
    // 狀態
    target,
    confirmed,
    mayorSeat,
    mayorName,
    // 處理函數
    handleTargetSelect,
    handleNoTransfer,
    handleConfirmTransfer,
    handleReset,
    executeNoTransfer,
    executeTransfer,
    // 輔助資訊
    stateManager,
  };
}
