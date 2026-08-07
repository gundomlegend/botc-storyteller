import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';
import { mayRegisterAsTeam, isRegistrationAbilityActive } from '../Registration';

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

    // 步驟 3: 篩選必然被視為外來者的玩家
    //
    // 委派給 Registration，一併涵蓋：真實外來者、能力正常的間諜（可被視為外來者），
    // 以及能力失效的陌客（只能以真實身分登記，故必為外來者）。
    const outsiders = allPlayers.filter(p => mayRegisterAsTeam(p, 'outsider'));

    // 步驟 3.5: 能力正常的陌客另立一份清單。
    //
    // 陌客預設被視為爪牙/惡魔，故不在上方清單中；但它真實身分仍是外來者，
    // 說書人可選擇以外來者身分呈現 —— 兩種登記皆合法，因此需要說書人決定。
    const recluses = allPlayers.filter(p =>
      p.role === 'recluse' && isRegistrationAbilityActive(p)
    );

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
        isRegistrationAbilityActive(outsiders[0]) &&
        recluses.length === 0) {
      const spyPlayer = outsiders[0];
      return {
        action: 'show_info',
        display: '場上只有間諜（能力正常），可給予假外來者資訊',
        info: {
          onlySpyInGame: true,
          outsiders: [{  // 間諜列入外來者列表供 UI 顯示
            seat: spyPlayer.seat,
            name: spyPlayer.name,
            role: spyPlayer.role,
            roleName: this.getPlayerRoleName(spyPlayer),
            isPoisoned: spyPlayer.isPoisoned,
            isDrunk: spyPlayer.isDrunk,
          }],
          recluses: [],
          hasSpy: true,
          hasRecluse: false,
          reliable: this.infoReliable,
          statusReason: this.statusReason,
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
      o.role === 'spy' && isRegistrationAbilityActive(o)
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
