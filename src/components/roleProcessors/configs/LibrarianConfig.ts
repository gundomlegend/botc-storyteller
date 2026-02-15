/**
 * 圖書管理員處理器配置
 *
 * Strategy Pattern：定義圖書管理員特定的行為策略
 */

import type { Player } from '../../../engine/types';
import type {
  RoleProcessorConfig,
  ProcessorContext,
  PreselectionResult,
  UnreliableWarning,
  TargetPlayerInfo,
  SpecialPlayerInfo,
  LibrarianHandlerInfo,
} from '../shared/types';

export const librarianConfig: RoleProcessorConfig<LibrarianHandlerInfo> = {
  roleId: 'librarian',
  targetTeam: 'outsider',

  /**
   * 圖書管理員目標列表：真實外來者（排除間諜）+ 陌客
   */
  getTargets: (context: ProcessorContext<LibrarianHandlerInfo>): TargetPlayerInfo[] => {
    const { outsiders, recluses } = context.result.info!;

    // 主列表：真實外來者（排除間諜）+ 陌客
    const realOutsiders = outsiders.filter(o => o.role !== 'spy');
    const reclusesAsTargets: TargetPlayerInfo[] = recluses.map(r => ({
      seat: r.seat,
      name: r.name,
      role: r.role,
      roleName: r.roleName || '',
    }));

    return [...realOutsiders, ...reclusesAsTargets];
  },

  /**
   * 圖書管理員特殊列表：間諜
   */
  getSpecialPlayers: (context: ProcessorContext<LibrarianHandlerInfo>): SpecialPlayerInfo[] => {
    const { outsiders } = context.result.info!;
    return outsiders.filter(o => o.role === 'spy');
  },

  /**
   * 圖書管理員預選邏輯：
   * 1. 無外來者 → 不預選
   * 2. 只有間諜 → 不預選（給說書人完全自由）
   * 3. 能力不可靠 → 不預選（不清空用戶選擇）
   * 4. 可靠時 → 優先選擇真實外來者 > 間諜 > 陌客
   */
  getPreselection: (context: ProcessorContext<LibrarianHandlerInfo>): PreselectionResult => {
    const { result, isReliable, stateManager, currentPlayerSeat } = context;
    const info = result.info!;

    // 無外來者情況：不預選
    if (info.noOutsiderInGame) {
      return { role: null, player1: null, player2: null };
    }

    // 只有間諜的特殊情況：不預選（與調查員不同，這裡給說書人完全自由）
    if (info.onlySpyInGame) {
      return { role: null, player1: null, player2: null };
    }

    // 不可靠時不預選（但不清空用戶選擇）
    if (!isReliable) {
      return { role: null, player1: null, player2: null };
    }

    const outsiders = info.outsiders || [];
    const recluses = info.recluses || [];

    // 可靠時預選邏輯：優先預選真實外來者 > 間諜 > 陌客
    if (outsiders.length > 0) {
      // 找第一個非間諜的外來者
      const firstOutsider = outsiders.find(o => o.role !== 'spy') || outsiders[0];

      // 選擇兩位玩家：第一位是該外來者，第二位是其他玩家
      const allPlayers = stateManager.getAlivePlayers();

      // 第二位玩家：從非外來者中隨機選擇（可包含陌客）
      const nonOutsiderPlayers = allPlayers.filter((p: Player) =>
        p.seat !== firstOutsider.seat &&
        p.seat !== currentPlayerSeat &&
        !outsiders.some(o => o.seat === p.seat)
      );

      // 陌客可以作為第二位玩家的候選
      const decoyPlayer = nonOutsiderPlayers[0] ||
        (recluses[0] && stateManager.getPlayer(recluses[0].seat));

      if (decoyPlayer) {
        return {
          role: firstOutsider.role,
          player1: firstOutsider.seat,
          player2: decoyPlayer.seat,
        };
      }
    } else if (recluses.length > 0) {
      // 只有陌客的情況：預選陌客
      const firstRecluse = recluses[0];
      const allPlayers = stateManager.getAlivePlayers();
      const decoyPlayer = allPlayers.find(
        (p: Player) => p.seat !== firstRecluse.seat && p.seat !== currentPlayerSeat
      );

      if (decoyPlayer) {
        return {
          role: 'recluse',
          player1: firstRecluse.seat,
          player2: decoyPlayer.seat,
        };
      }
    }

    return { role: null, player1: null, player2: null };
  },

  /**
   * 圖書管理員不可靠警告：
   * 區分酒鬼和中毒/醉酒，給予不同建議
   */
  getUnreliableWarning: (context: ProcessorContext<LibrarianHandlerInfo>): UnreliableWarning | null => {
    const { isReliable, isDrunkRole } = context;

    if (isReliable) return null;

    if (isDrunkRole) {
      return {
        message: '圖書管理員實際上是酒鬼（無能力），說書人可給予任意資訊',
        recommendation: '推薦：給予假外來者角色，挑選兩個反差大的玩家',
      };
    }

    return {
      message: '圖書管理員中毒/醉酒（能力不可靠），說書人可給予任意資訊',
      recommendation: '推薦：給予正確資訊，避免暴露投毒者',
    };
  },

  /**
   * 圖書管理員提示訊息：
   * 根據遊戲狀態動態產生提示
   */
  getHints: (context: ProcessorContext<LibrarianHandlerInfo>): string[] => {
    const { result } = context;
    const info = result.info!;
    const hints: string[] = [];

    if (info.onlySpyInGame) {
      hints.push('只有間諜在場，可給予假外來者資訊或告知「無外來者」');
    }

    if (info.hasSpy && !info.onlySpyInGame) {
      hints.push('可以將間諜視為外來者，和一般鎮民做搭配');
    }

    if (info.hasRecluse) {
      hints.push('可以不將陌客視為外來者，和其他外來者或間諜做搭配');
    }

    return hints;
  },

  /**
   * 圖書管理員是否顯示「無外來者」按鈕：
   * 只有間諜、只有陌客、或能力不可靠時
   */
  shouldShowNoTargetButton: (context: ProcessorContext<LibrarianHandlerInfo>): boolean => {
    const { result, isReliable } = context;
    const info = result.info!;
    const outsiders = info.outsiders || [];
    const recluses = info.recluses || [];

    return !!(
      info.onlySpyInGame ||
      (outsiders.length === 0 && recluses.length > 0) ||
      !isReliable
    );
  },

  getTargetListLabel: () => '場上外來者',

  getNoTargetButtonText: () => '給予「無外來者」資訊',

  getSuspectedListLabel: () => '疑似外來者',

  getConfirmEventDescription: (context, selectedRole, player1, player2) => {
    const selectedRoleData = context.roleRegistry.getRoleData(selectedRole);
    const roleName = selectedRoleData?.name_cn || selectedRole;
    return `圖書管理員資訊：展示${roleName}，指向${player1}號和${player2}號`;
  },

  getNoTargetEventDescription: () => '圖書管理員資訊：告知場上沒有外來者',
};
