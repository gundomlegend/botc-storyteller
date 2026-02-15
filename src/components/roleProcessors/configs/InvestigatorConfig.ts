/**
 * 調查員處理器配置
 *
 * Strategy Pattern：定義調查員特定的行為策略
 */

import type { Player } from '../../../engine/types';
import type {
  RoleProcessorConfig,
  ProcessorContext,
  PreselectionResult,
  UnreliableWarning,
  TargetPlayerInfo,
  SpecialPlayerInfo,
  InvestigatorHandlerInfo,
} from '../shared/types';

export const investigatorConfig: RoleProcessorConfig<InvestigatorHandlerInfo> = {
  roleId: 'investigator',
  targetTeam: 'minion',

  /**
   * 調查員目標列表：所有爪牙（包含間諜）
   */
  getTargets: (context: ProcessorContext<InvestigatorHandlerInfo>): TargetPlayerInfo[] => {
    const { minions } = context.result.info!;
    return minions;
  },

  /**
   * 調查員特殊列表：陌客
   */
  getSpecialPlayers: (context: ProcessorContext<InvestigatorHandlerInfo>): SpecialPlayerInfo[] => {
    const { recluses } = context.result.info!;
    return recluses;
  },

  /**
   * 調查員預選邏輯：
   * 1. 無爪牙 → 不預選
   * 2. 只有間諜 → 強制告知「無爪牙」（mustFollow），不預選
   * 3. 能力不可靠 → 不預選
   * 4. 可靠時 → 預選第一個爪牙 + 隨機第二位玩家
   */
  getPreselection: (context: ProcessorContext<InvestigatorHandlerInfo>): PreselectionResult => {
    const { result, isReliable, stateManager, currentPlayerSeat } = context;
    const info = result.info!;

    // 無爪牙情況：不預選
    if (info.noMinionInGame) {
      return { role: null, player1: null, player2: null };
    }

    // 只有間諜的特殊情況：強制告知「無爪牙」，不預選
    if (info.onlySpyInGame) {
      return { role: null, player1: null, player2: null };
    }

    // 不可靠時不預選
    if (!isReliable) {
      return { role: null, player1: null, player2: null };
    }

    const minions = info.minions || [];

    // 可靠時預選邏輯：預選第一個爪牙
    if (minions.length > 0) {
      const firstMinion = minions[0];

      // 選擇兩位玩家：第一位是該爪牙，第二位是其他玩家
      const allPlayers = stateManager.getAlivePlayers();

      // 第二位玩家：從非爪牙中隨機選擇
      const nonMinionPlayers = allPlayers.filter((p: Player) =>
        p.seat !== firstMinion.seat &&
        p.seat !== currentPlayerSeat &&
        !minions.some(m => m.seat === p.seat)
      );

      const decoyPlayer = nonMinionPlayers[0];

      if (decoyPlayer) {
        return {
          role: firstMinion.role,
          player1: firstMinion.seat,
          player2: decoyPlayer.seat,
        };
      }
    }

    return { role: null, player1: null, player2: null };
  },

  /**
   * 調查員不可靠警告：
   * 區分酒鬼和中毒/醉酒，給予不同建議
   */
  getUnreliableWarning: (context: ProcessorContext<InvestigatorHandlerInfo>): UnreliableWarning | null => {
    const { isReliable, isDrunkRole } = context;

    if (isReliable) return null;

    if (isDrunkRole) {
      return {
        message: '調查員實際上是酒鬼（無能力），說書人可給予任意資訊',
        recommendation: '推薦：給予假爪牙角色，挑選兩個反差大的玩家',
      };
    }

    return {
      message: '調查員中毒/醉酒（能力不可靠），說書人可給予任意資訊',
      recommendation: '推薦：給予正確資訊，避免暴露投毒者',
    };
  },

  /**
   * 調查員提示訊息：
   * 根據遊戲狀態動態產生提示
   */
  getHints: (context: ProcessorContext<InvestigatorHandlerInfo>): string[] => {
    const { result } = context;
    const info = result.info!;
    const hints: string[] = [];

    if (info.onlySpyInGame && info.noMinionToShow) {
      hints.push('只有間諜在場，可告知「無爪牙」');
    }

    if (info.hasSpy && !info.onlySpyInGame) {
      hints.push('可以不將間諜視為爪牙，讓其他爪牙和鎮民做搭配');
    }

    if (info.hasRecluse) {
      hints.push('可以將陌客視為爪牙，和一般鎮民做搭配');
    }

    return hints;
  },

  /**
   * 調查員是否顯示「無爪牙」按鈕：
   * 無爪牙、只有間諜、或能力不可靠時
   */
  shouldShowNoTargetButton: (context: ProcessorContext<InvestigatorHandlerInfo>): boolean => {
    const { result, isReliable } = context;
    const info = result.info!;

    return !!(
      info.noMinionInGame ||
      info.onlySpyInGame ||
      !isReliable
    );
  },

  getTargetListLabel: () => '場上爪牙',

  getNoTargetButtonText: () => '告知「無爪牙」',

  getSuspectedListLabel: () => '疑似爪牙',

  getConfirmEventDescription: (context, selectedRole, player1, player2) => {
    const selectedRoleData = context.roleRegistry.getRoleData(selectedRole);
    const roleName = selectedRoleData?.name_cn || selectedRole;
    return `調查員資訊：展示${roleName}，指向${player1}號和${player2}號`;
  },

  getNoTargetEventDescription: () => '調查員資訊：告知場上沒有爪牙',
};
