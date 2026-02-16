/**
 * 角色處理器配置集中管理
 *
 * 使用 Configuration-driven 開發模式
 * 每個角色定義自己的行為策略，共享 UI 結構
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
  InvestigatorHandlerInfo,
  WasherwomanHandlerInfo,
} from './types';

// ============================================================
// 圖書管理員配置
// ============================================================

export const librarianConfig: RoleProcessorConfig<LibrarianHandlerInfo> = {
  roleId: 'librarian',
  targetTeam: 'outsider',
  includeSelfInPlayerList: false,

  /**
   * 圖書管理員預選邏輯：
   * 1. 無外來者 → 不預選
   * 2. 只有間諜 → 不預選（給說書人完全自由）
   * 3. 能力不可靠 → 不預選（不清空用戶選擇）
   * 4. 可靠時 → 優先選擇真實外來者 > 間諜 > 陌客
   */
  getPreselection: (context: ProcessorContext<LibrarianHandlerInfo>): PreselectionResult => {
    const { result, isReliable, stateManager, currentPlayerSeat } = context;
    const info = result.info;
    if (!info) return { role: null, player1: null, player2: null };

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

    const outsiders = info.outsiders;
    const recluses = info.recluses;

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
      recommendation: '推薦：大多數角色對，人錯，偶爾全真或是半真，避免暴露投毒者',
    };
  },

  /**
   * 圖書管理員提示訊息：
   * 根據遊戲狀態動態產生提示
   */
  getHints: (context: ProcessorContext<LibrarianHandlerInfo>): string[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

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
    const info = result.info;
    if (!info) return false;

    return !!(
      info.onlySpyInGame ||
      (info.outsiders.length === 0 && info.recluses.length > 0) ||
      !isReliable
    );
  },

  getTargetRoleLabel: () => '外來者',

  getTargetListLabel: () => '場上外來者',

  getNoTargetButtonText: () => '給予「無外來者」資訊',

  getSuspectedListLabel: () => '疑似外來者',

  getConfirmEventDescription: (context, selectedRole, player1, player2) => {
    const selectedRoleData = context.roleRegistry.getRoleData(selectedRole);
    const roleName = selectedRoleData?.name_cn || selectedRole;
    return `圖書管理員資訊：展示${roleName}，指向${player1}號和${player2}號`;
  },

  getNoTargetEventDescription: () => '圖書管理員資訊：告知場上沒有外來者',

  /**
   * 取得目標玩家列表：真實外來者（排除間諜）+ 陌客
   */
  getTargets: (context: ProcessorContext<LibrarianHandlerInfo>): TargetPlayerInfo[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    // 真實外來者（排除間諜）
    const realOutsiders = info.outsiders.filter(o => o.role !== 'spy');

    // 陌客轉換為 TargetPlayerInfo 格式
    const reclusesAsTargets: TargetPlayerInfo[] = info.recluses.map(r => ({
      seat: r.seat,
      name: r.name,
      role: r.role,
      roleName: r.roleName || '',
    }));

    return [...realOutsiders, ...reclusesAsTargets];
  },

  /**
   * 取得特殊玩家列表：間諜
   */
  getSpecialPlayers: (context: ProcessorContext<LibrarianHandlerInfo>): SpecialPlayerInfo[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    // 間諜
    return info.outsiders.filter(o => o.role === 'spy');
  },
};

// ============================================================
// 調查員配置
// ============================================================

export const investigatorConfig: RoleProcessorConfig<InvestigatorHandlerInfo> = {
  roleId: 'investigator',
  targetTeam: 'minion',
  includeSelfInPlayerList: false,

  /**
   * 調查員預選邏輯：
   * 1. 無爪牙 → 不預選
   * 2. 只有間諜 → 強制告知「無爪牙」（mustFollow），不預選
   * 3. 能力不可靠 → 不預選
   * 4. 可靠時 → 預選第一個爪牙 + 隨機第二位玩家
   */
  getPreselection: (context: ProcessorContext<InvestigatorHandlerInfo>): PreselectionResult => {
    const { result, isReliable, stateManager, currentPlayerSeat } = context;
    const info = result.info;
    if (!info) return { role: null, player1: null, player2: null };

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

    const minions = info.minions;

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
      recommendation: '推薦：大多數角色對，人錯，偶爾全真或是半真，避免暴露投毒者',
    };
  },

  /**
   * 調查員提示訊息：
   * 根據遊戲狀態動態產生提示
   */
  getHints: (context: ProcessorContext<InvestigatorHandlerInfo>): string[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

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
    const info = result.info;
    if (!info) return false;

    return !!(
      info.noMinionInGame ||
      info.onlySpyInGame ||
      !isReliable
    );
  },

  getTargetRoleLabel: () => '爪牙',

  getTargetListLabel: () => '場上爪牙',

  getNoTargetButtonText: () => '告知「無爪牙」',

  getSuspectedListLabel: () => '疑似爪牙',

  getConfirmEventDescription: (context, selectedRole, player1, player2) => {
    const selectedRoleData = context.roleRegistry.getRoleData(selectedRole);
    const roleName = selectedRoleData?.name_cn || selectedRole;
    return `調查員資訊：展示${roleName}，指向${player1}號和${player2}號`;
  },

  getNoTargetEventDescription: () => '調查員資訊：告知場上沒有爪牙',

  /**
   * 取得目標玩家列表：所有爪牙（包含間諜）
   */
  getTargets: (context: ProcessorContext<InvestigatorHandlerInfo>): TargetPlayerInfo[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    return info.minions;
  },

  /**
   * 取得特殊玩家列表：陌客
   */
  getSpecialPlayers: (context: ProcessorContext<InvestigatorHandlerInfo>): SpecialPlayerInfo[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    return info.recluses;
  },
};

// ============================================================
// 洗衣婦配置
// ============================================================

export const washerwomanConfig: RoleProcessorConfig<WasherwomanHandlerInfo> = {
  roleId: 'washerwoman',
  targetTeam: 'townsfolk',
  includeSelfInPlayerList: true,

  /**
   * 洗衣婦預選邏輯：
   * 1. 只有自己是鎮民 → 預選自己
   * 2. 只有間諜 → 不預選角色，預選間諜作為第一位玩家
   * 3. 能力不可靠 → 不預選
   * 4. 可靠時 → 優先選擇其他鎮民 > 間諜 > 自己
   */
  getPreselection: (context: ProcessorContext<WasherwomanHandlerInfo>): PreselectionResult => {
    const { result, isReliable, stateManager, currentPlayerSeat } = context;
    const info = result.info;
    if (!info) return { role: null, player1: null, player2: null };

    // 只有間諜的情況：不預選角色，預選間諜作為第一位玩家
    if (info.onlySpyInGame) {
      const spy = info.townsfolk.find(t => t.role === 'spy');
      if (spy) {
        const otherPlayers = stateManager.getAlivePlayers()
          .filter(p => p.seat !== spy.seat && p.seat !== currentPlayerSeat);
        const randomOther = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          role: null,
          player1: spy.seat,
          player2: randomOther?.seat ?? null,
        };
      }
      return { role: null, player1: null, player2: null };
    }

    // 不可靠時不預選
    if (!isReliable) {
      return { role: null, player1: null, player2: null };
    }

    const allPlayers = stateManager.getAlivePlayers();
    const townsfolk = info.townsfolk || [];

    // 只有自己是鎮民：預選自己
    if (townsfolk.length === 0) {
      const self = allPlayers.find(p => p.seat === currentPlayerSeat);
      if (self) {
        const otherPlayers = allPlayers.filter(p => p.seat !== currentPlayerSeat && p.team !== 'townsfolk');
        const randomOther = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          role: self.role,
          player1: self.seat,
          player2: randomOther?.seat ?? null,
        };
      }
      return { role: null, player1: null, player2: null };
    }

    // 優先選擇：真實鎮民（非間諜）> 間諜
    const realTownsfolk = townsfolk.filter(t => t.role !== 'spy');
    const firstTownsfolk = realTownsfolk.length > 0 ? realTownsfolk[0] : townsfolk[0];

    if (!firstTownsfolk) {
      return { role: null, player1: null, player2: null };
    }

    // 選擇第二位玩家：非該鎮民的玩家（優先選擇非鎮民）
    const otherPlayers = allPlayers.filter(p =>
      p.seat !== firstTownsfolk.seat &&
      p.seat !== currentPlayerSeat &&
      (p.team !== 'townsfolk' || p.role === 'spy')
    );

    const randomOther = otherPlayers.length > 0
      ? otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
      : allPlayers.find(p => p.seat !== firstTownsfolk.seat && p.seat !== currentPlayerSeat);

    return {
      role: firstTownsfolk.role,
      player1: firstTownsfolk.seat,
      player2: randomOther?.seat ?? null,
    };
  },

  /**
   * 洗衣婦提示訊息
   */
  getHints: (context: ProcessorContext<WasherwomanHandlerInfo>): string[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    const hints: string[] = [];

    // 只有間諜在場
    if (info.onlySpyInGame) {
      hints.push('只有間諜在場，可給予間諜資訊或給予自己資訊');
    }
    // 間諜在場
    else if (info.hasSpy) {
      hints.push('間諜在場，可選擇間諜作為鎮民');
    }

    // 只有自己是鎮民
    if (info.townsfolk.length === 0 && !info.onlySpyInGame) {
      hints.push('場上只有自己是鎮民，可給予自己的資訊');
    }

    return hints;
  },

  /**
   * 洗衣婦不可靠警告
   */
  getUnreliableWarning: (context: ProcessorContext<WasherwomanHandlerInfo>): UnreliableWarning | null => {
    const { isReliable, isDrunkRole, isPoisoned, isDrunk } = context;

    if (isDrunkRole) {
      return {
        message: '此玩家實際上是酒鬼，能力無效',
        recommendation: '給予假鎮民角色，挑選兩個反差大的玩家',
      };
    }

    if (!isReliable) {
      const reason = isPoisoned ? '中毒' : isDrunk ? '醉酒' : '能力不可靠';
      return {
        message: `洗衣婦${reason}，能力不可靠`,
        recommendation: '推薦：大多數角色對，人錯，偶爾全真或是半真，避免暴露投毒者',
      };
    }

    return null;
  },

  getTargetRoleLabel: () => '鎮民',

  /**
   * 取得目標列表標籤
   */
  getTargetListLabel: (_context: ProcessorContext<WasherwomanHandlerInfo>): string => {
    return '場上鎮民';
  },

  /**
   * 取得特殊列表標籤
   */
  getSuspectedListLabel: (_context: ProcessorContext<WasherwomanHandlerInfo>): string => {
    return '疑似鎮民';
  },

  /**
   * 取得目標玩家列表：鎮民（包含洗衣婦自己）
   */
  getTargets: (context: ProcessorContext<WasherwomanHandlerInfo>): TargetPlayerInfo[] => {
    const { result, stateManager, roleRegistry, currentPlayerSeat } = context;
    const info = result.info;
    if (!info) return [];

    // 返回真實鎮民（排除間諜）
    const otherTownsfolk = info.townsfolk.filter(t => t.role !== 'spy');

    // 加上洗衣婦自己
    const washerwoman = stateManager.getPlayer(currentPlayerSeat);
    if (washerwoman && washerwoman.team === 'townsfolk') {
      const washerwomanInfo: TargetPlayerInfo = {
        seat: washerwoman.seat,
        name: washerwoman.name,
        role: washerwoman.role,
        roleName: roleRegistry.getRoleName(washerwoman.role),
        isPoisoned: washerwoman.isPoisoned,
        isDrunk: washerwoman.isDrunk,
      };
      return [washerwomanInfo, ...otherTownsfolk];
    }

    return otherTownsfolk;
  },

  /**
   * 取得特殊玩家列表：間諜
   */
  getSpecialPlayers: (context: ProcessorContext<WasherwomanHandlerInfo>): SpecialPlayerInfo[] => {
    const { result } = context;
    const info = result.info;
    if (!info) return [];

    // 返回間諜
    return info.townsfolk.filter(t => t.role === 'spy');
  },
};

// ============================================================
// 配置註冊表
// ============================================================

export const ROLE_CONFIGS: Record<string, RoleProcessorConfig<any>> = {
  librarian: librarianConfig,
  investigator: investigatorConfig,
  washerwoman: washerwomanConfig,
};
