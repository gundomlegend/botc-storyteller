import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

/**
 * 圖書管理員 Handler
 *
 * 第一夜能力：得知兩名玩家中有一個特定的外來者角色
 *
 * 特殊處理：
 * - 間諜（能力正常時）可能被視為外來者
 * - 陌客（能力正常時）可能不被視為外來者
 * - 陌客（中毒/醉酒時）必須被視為外來者
 * - 酒鬼告知真實角色（'drunk'），不是 believesRole
 *
 * See: docs/specs/Librarian.spec.md
 */
export class LibrarianHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;
    const { gameState } = context;

    // 步驟 1: 僅第一晚執行
    if (gameState.night > 1) {
      return {
        skip: true,
        skipReason: '圖書管理員僅在第一晚獲得資訊',
        display: '圖書管理員僅在第一晚行動',
      };
    }

    // 步驟 2: 取得所有存活玩家（排除圖書管理員自己）
    const allPlayers = Array.from(gameState.players.values()).filter(
      p => p.isAlive && p.seat !== this.player.seat
    );

    // 步驟 3: 篩選外來者玩家（排除陌客，稍後特別處理）
    const outsiders = allPlayers.filter(p => {
      // 真實外來者（排除陌客）
      if (p.team === 'outsider' && p.role !== 'recluse') return true;

      // 間諜（能力正常時可能被視為外來者）
      if (p.role === 'spy' && !p.isPoisoned && !p.isDrunk) {
        return true; // 間諜可能被視為外來者（說書人可選擇）
      }

      return false;
    });

    // 步驟 3.5: 處理陌客（能力正常時可以選擇不視為外來者）
    const recluses = allPlayers.filter(p =>
      p.role === 'recluse' && !p.isPoisoned && !p.isDrunk
    );

    // 陌客中毒/醉酒時必須被視為外來者
    const poisonedOrDrunkRecluses = allPlayers.filter(p =>
      p.role === 'recluse' && (p.isPoisoned || p.isDrunk)
    );

    // 將中毒/醉酒的陌客加入外來者列表
    outsiders.push(...poisonedOrDrunkRecluses);

    // 步驟 4: 無外來者情況
    if (outsiders.length === 0 && recluses.length === 0) {
      return {
        action: 'show_info',
        display: '場上沒有任何外來者角色',
        info: {
          noOutsiderInGame: true,
        },
        mustFollow: false,
        canLie: true,
      };
    }

    // 步驟 5: 只有間諜的特殊情況（間諜能力正常且無其他外來者）
    // 根據規則：只有間諜時，可給予假外來者資訊或告知「無外來者」
    if (outsiders.length === 1 && outsiders[0].role === 'spy' &&
        !outsiders[0].isPoisoned && !outsiders[0].isDrunk &&
        recluses.length === 0) {
      return {
        action: 'show_info',
        display: '場上只有間諜（能力正常），可給予假外來者資訊',
        info: {
          onlySpyInGame: true,
          spy: {
            seat: outsiders[0].seat,
            name: outsiders[0].name,
            role: outsiders[0].role,
            roleName: this.getPlayerRoleName(outsiders[0]),
          },
        },
        mustFollow: false, // 說書人可選擇給假資訊
        canLie: true,
      };
    }

    // 步驟 6: 準備外來者列表
    const outsiderList = outsiders.map(o => ({
      seat: o.seat,
      name: o.name,
      role: o.role,
      roleName: this.getPlayerRoleName(o),
      isPoisoned: o.isPoisoned,
      isDrunk: o.isDrunk,
    }));

    // 步驟 7: 檢查特殊角色（供 UI 層參考）
    const hasSpy = outsiders.some(o =>
      o.role === 'spy' && !o.isPoisoned && !o.isDrunk
    );
    const hasRecluse = recluses.length > 0;

    // 準備陌客列表（能力正常，可選擇不視為外來者）
    const recluseList = recluses.map(r => ({
      seat: r.seat,
      name: r.name,
      role: r.role,
      roleName: this.getPlayerRoleName(r),
    }));

    // 步驟 8: 返回資訊，讓說書人在 UI 中選擇
    return {
      action: 'show_info',
      display: this.buildDisplayMessage(outsiderList, recluseList),
      info: {
        // 在場外來者列表（供 UI 選擇）
        outsiders: outsiderList,
        // 陌客列表（能力正常，可選擇性加入）
        recluses: recluseList,
        hasSpy,
        hasRecluse,
        reliable: this.infoReliable,
        statusReason: this.statusReason,
      },
      gesture: 'none',
      mustFollow: false, // 中毒/醉酒時說書人可自行決定
      canLie: true,      // 說書人可給不同答案
    };
  }

  /**
   * 建立顯示訊息
   */
  private buildDisplayMessage(
    outsiderList: Array<{ seat: number; name: string; roleName: string }>,
    recluseList: Array<{ seat: number; name: string }>,
  ): string {
    let message = '圖書管理員資訊獲取\n';

    if (outsiderList.length > 0) {
      message += `場上外來者角色：${outsiderList.map(o =>
        `${o.seat}號 ${o.name}(${o.roleName})`
      ).join('、')}`;
    }

    if (recluseList.length > 0) {
      if (outsiderList.length > 0) {
        message += '\n';
      }
      message += `陌客（可選擇不視為外來者）：${recluseList.map(r =>
        `${r.seat}號 ${r.name}`
      ).join('、')}`;
    }

    return message;
  }
}
