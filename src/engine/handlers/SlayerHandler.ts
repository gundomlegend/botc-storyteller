/**
 * SlayerHandler — 獵手（Slayer）能力處理
 *
 * 成功條件：
 * - 宣稱者的真實角色為 slayer
 * - 能力未使用（!abilityUsed）
 * - 未中毒且非醉酒
 * - 目標角色為 imp（惡魔）
 *
 * 無論結果如何，宣稱後 hasMadeSlayerClaim = true（一整場只能宣稱一次）
 */

import type { Player } from '../types';

export interface SlayerResult {
  success: boolean;
  reason: string;
}

/**
 * Process a Slayer claim.
 *
 * Does NOT mutate players — caller is responsible for applying side effects
 * (markAbilityUsed, hasMadeSlayerClaim, killPlayer, endGame).
 */
export function processSlayerClaim(claimant: Player, target: Player): SlayerResult {
  const isRealSlayer = claimant.role === 'slayer';
  const abilityUsed = claimant.abilityUsed;
  const isMalfunctioning = claimant.isPoisoned || claimant.isDrunk;
  const targetIsDemon = target.role === 'imp';

  if (!isRealSlayer || abilityUsed || isMalfunctioning) {
    return { success: false, reason: '驅魔失敗，無事發生' };
  }

  if (!targetIsDemon) {
    return { success: false, reason: '驅魔失敗，無事發生' };
  }

  return { success: true, reason: '驅魔成功，惡魔已消滅' };
}
