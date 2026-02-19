import type { Player } from './types';

/**
 * 聖徒處決判定結果
 */
export type SaintCheckResult =
  | { isSaint: false }
  | {
      isSaint: true;
      abilityWorks: boolean;
      reason: string;
    };

/**
 * 檢查處決聖徒時是否觸發遊戲結束
 *
 * 規則：
 * - 聖徒被投票處決時，若能力正常，善良陣營立即落敗
 * - 中毒時能力失效
 * - 酒鬼以為自己是聖徒，無能力
 *
 * 注意：此函式只應在標準投票處決（execution）流程中呼叫，
 * 不應在 virgin_ability、demon_kill 等其他死因時呼叫。
 *
 * See: docs/specs/Saint.spec.md
 */
export function checkSaintExecution(player: Player): SaintCheckResult {
  // 步驟 1: 檢查是否為聖徒（或酒鬼以為自己是聖徒）
  const isSaint = player.role === 'saint';
  const isDrunkSaint = player.role === 'drunk' && player.believesRole === 'saint';

  if (!isSaint && !isDrunkSaint) {
    return { isSaint: false };
  }

  // 步驟 2: 檢查能力狀態
  if (isDrunkSaint) {
    return {
      isSaint: true,
      abilityWorks: false,
      reason: '實際上是酒鬼',
    };
  }

  if (player.isPoisoned) {
    return {
      isSaint: true,
      abilityWorks: false,
      reason: '中毒，能力失效',
    };
  }

  // 步驟 3: 能力正常
  return {
    isSaint: true,
    abilityWorks: true,
    reason: '能力正常，善良陣營將落敗',
  };
}
