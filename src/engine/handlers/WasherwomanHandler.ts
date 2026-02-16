import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

/**
 * 洗衣婦 Handler
 *
 * 第一夜能力：得知兩名玩家中有一個特定的鎮民角色
 *
 * 特殊處理：
 * - 間諜（能力正常時）可能被視為鎮民
 * - 陌客不會被視為鎮民（與圖書管理員不同）
 * - 酒鬼不會被視為鎮民（即使 believesRole 是鎮民）
 * - 鎮民列表應排除洗衣婦自己
 *
 * See: docs/specs/Washerwoman.spec.md
 */
export class WasherwomanHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;
    const { gameState } = context;

    // 步驟 1: 僅第一晚執行
    if (gameState.night > 1) {
      return {
        skip: true,
        skipReason: '洗衣婦僅在第一晚獲得資訊',
        display: '洗衣婦僅在第一晚行動',
      };
    }

    // 步驟 2: 取得所有存活玩家（排除洗衣婦自己）
    const allPlayers = Array.from(gameState.players.values()).filter(
      p => p.isAlive && p.seat !== this.player.seat
    );

    // 步驟 3: 篩選鎮民玩家
    const townsfolk = allPlayers.filter(p => {
      // 真實鎮民
      if (p.team === 'townsfolk') return true;

      // 間諜（能力正常時可能被視為鎮民）
      if (p.role === 'spy' && !p.isPoisoned && !p.isDrunk) {
        return true; // 間諜可能被視為鎮民（說書人可選擇）
      }

      return false;
    });

    // 步驟 4: 只有間諜的特殊情況（間諜能力正常且無其他鎮民）
    const onlySpy = townsfolk.length === 1 && townsfolk[0].role === 'spy' &&
                    !townsfolk[0].isPoisoned && !townsfolk[0].isDrunk;

    if (onlySpy) {
      return {
        action: 'show_info',
        display: '場上只有間諜（能力正常），可給予間諜資訊或給予自己資訊',
        info: {
          townsfolk: [{
            seat: townsfolk[0].seat,
            name: townsfolk[0].name,
            role: townsfolk[0].role,
            roleName: this.getPlayerRoleName(townsfolk[0]),
            isPoisoned: townsfolk[0].isPoisoned,
            isDrunk: townsfolk[0].isDrunk,
          }],
          hasSpy: true,
          onlySpyInGame: true,
          reliable: this.infoReliable,
          statusReason: this.statusReason,
        },
        mustFollow: false, // 說書人可選擇給間諜資訊或自己資訊
        canLie: true,
      };
    }

    // 步驟 5: 準備鎮民列表
    const townsfolkList = townsfolk.map(t => ({
      seat: t.seat,
      name: t.name,
      role: t.role,
      roleName: this.getPlayerRoleName(t),
      isPoisoned: t.isPoisoned,
      isDrunk: t.isDrunk,
    }));

    // 步驟 6: 檢查是否有間諜（供 UI 層參考）
    const hasSpy = townsfolk.some(t =>
      t.role === 'spy' && !t.isPoisoned && !t.isDrunk
    );

    // 步驟 7: 返回資訊，讓說書人在 UI 中選擇
    return {
      action: 'show_info',
      display: this.buildDisplayMessage(townsfolkList, hasSpy),
      info: {
        // 在場鎮民列表（供 UI 選擇）
        townsfolk: townsfolkList,
        hasSpy,
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
    townsfolkList: Array<{ seat: number; name: string; roleName: string }>,
    hasSpy: boolean,
  ): string {
    let message = '洗衣婦資訊獲取\n';

    if (townsfolkList.length === 0) {
      message += '場上鎮民角色：（無其他鎮民，僅洗衣婦自己）';
    } else {
      message += `場上鎮民角色：${townsfolkList.map(t =>
        `${t.seat}號 ${t.name}(${t.roleName})`
      ).join('、')}`;
    }

    if (hasSpy) {
      message += '\n注意：間諜在場，可選擇間諜作為鎮民';
    }

    return message;
  }
}
