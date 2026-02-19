import type { Player } from './types';

/**
 * 貞潔者能力判定結果
 */
export interface VirginCheckResult {
  triggered: boolean;
  reason: string;
  abilityMalfunctioned?: boolean;
  spyCanRegisterAsTownsfolk?: boolean;
}

/**
 * 檢查貞潔者能力是否觸發
 *
 * 規則：
 * - 貞潔者第一次被提名時，若提名者是鎮民，提名者立即被處決
 * - 能力一次性，無論是否觸發都會消耗
 * - 中毒/醉酒時能力失效
 * - 間諜（能力正常）可被說書人視為鎮民
 *
 * 注意：此函式不會修改任何狀態，呼叫端需自行標記 abilityUsed
 *
 * See: docs/specs/Virgin.spec.md
 */
export function checkVirginAbility(
  virgin: Player,
  nominator: Player,
): VirginCheckResult {
  // 步驟 1: 檢查能力是否已使用
  if (virgin.abilityUsed) {
    return { triggered: false, reason: '能力已使用' };
  }

  // 步驟 2: 檢查貞潔者狀態
  const isVirginDrunk = virgin.role === 'drunk';
  const isVirginPoisoned = virgin.isPoisoned;
  const abilityWorks = !isVirginDrunk && !isVirginPoisoned;

  if (!abilityWorks) {
    return {
      triggered: false,
      reason: isVirginDrunk ? '實際上是酒鬼' : '中毒，能力失效',
      abilityMalfunctioned: true,
    };
  }

  // 步驟 3: 判定提名者身份
  if (nominator.team === 'townsfolk') {
    return { triggered: true, reason: '提名者是鎮民' };
  }

  // 間諜特殊處理：能力正常時可被視為鎮民
  const isSpy = nominator.role === 'spy'
    && !nominator.isPoisoned
    && !nominator.isDrunk;

  if (isSpy) {
    return {
      triggered: false,
      reason: '提名者是間諜（能力正常）',
      spyCanRegisterAsTownsfolk: true,
    };
  }

  return { triggered: false, reason: '提名者不是鎮民' };
}
