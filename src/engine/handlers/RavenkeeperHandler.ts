import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

/**
 * 守鴉人 Handler
 *
 * 其他夜晚能力：若今晚死亡，選擇一名玩家並得知其角色
 *
 * 特殊處理：
 * - 只在其他夜晚執行（第一夜不執行）
 * - 觸發條件：今晚死亡（deathNight === gameState.night）
 * - 死後仍然工作（worksWhenDead: true）
 * - 一次性能力
 * - 需要選擇一名目標玩家（PlayerSelector）
 * - 陌客（能力正常）可被視為邪惡角色
 * - 間諜（能力正常）可被視為善良角色
 *
 * See: docs/specs/Ravenkeeper.spec.md
 */
export class RavenkeeperHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;
    const { gameState } = context;

    // 步驟 1: 只在其他夜晚執行（非第一夜）
    if (gameState.night === 1) {
      return {
        skip: true,
        skipReason: '守鴉人不在第一夜行動',
        display: '守鴉人僅在其他夜晚行動',
      };
    }

    // 步驟 2: 檢查守鴉人是否今晚死亡
    const diedTonight = !this.player.isAlive && this.player.deathNight === gameState.night;
    if (!diedTonight) {
      return {
        skip: true,
        skipReason: '守鴉人今晚未死亡，能力未觸發',
        display: `${this.player.seat}號 ${this.player.name}（守鴉人）今晚未死亡，跳過`,
      };
    }

    // 步驟 3: 需要選擇一名目標玩家
    if (!this.target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '守鴉人今晚死亡，請選擇一名玩家查看角色',
        display: '等待守鴉人選擇目標...',
      };
    }

    // 步驟 4: 取得被選玩家的真實角色
    const targetRole = this.target.role;
    const targetRoleName = this.getPlayerRoleName(this.target);

    // 步驟 5: 檢查陌客/間諜特殊情況
    const isRecluse = targetRole === 'recluse' && !this.target.isPoisoned && !this.target.isDrunk;
    const isSpy = targetRole === 'spy' && !this.target.isPoisoned && !this.target.isDrunk;

    // 取得可選角色列表
    const selectableRoles = this.buildSelectableRoles(isRecluse, isSpy);

    // 步驟 6: 返回資訊
    return {
      action: 'show_info',
      display: this.buildDisplayMessage(targetRoleName, isRecluse, isSpy),
      info: {
        targetPlayer: {
          seat: this.target.seat,
          name: this.target.name,
          role: targetRole,
          roleName: targetRoleName,
          believesRole: this.target.believesRole,
          isDrunk: this.target.role === 'drunk',
        },
        isRecluse,
        isSpy,
        selectableRoles,
        reliable: this.infoReliable,
        statusReason: this.statusReason,
      },
      gesture: 'none',
      mustFollow: this.infoReliable && !isRecluse && !isSpy,
      canLie: !this.infoReliable || isRecluse || isSpy,
    };
  }

  /**
   * 建立可選角色列表
   */
  private buildSelectableRoles(isRecluse: boolean, isSpy: boolean): string[] {
    if (this.infoReliable) {
      if (isRecluse) {
        // 陌客：可選擇在場邪惡角色
        return Array.from(this.gameState.players.values())
          .filter(p => p.team === 'minion' || p.team === 'demon')
          .map(p => p.role);
      } else if (isSpy) {
        // 間諜：可選擇在場善良角色
        return Array.from(this.gameState.players.values())
          .filter(p => p.team === 'townsfolk' || p.team === 'outsider')
          .map(p => p.role);
      }
      // 正常情況：不需要選擇，直接給真實角色
      return [];
    }

    // 能力不可靠：可選擇所有在場角色
    return Array.from(this.gameState.players.values())
      .map(p => p.role);
  }

  /**
   * 建立顯示訊息
   */
  private buildDisplayMessage(
    targetRoleName: string,
    isRecluse: boolean,
    isSpy: boolean,
  ): string {
    let message = '守鴉人資訊獲取\n';
    message += `查看目標：${this.target!.seat}號 ${this.target!.name}（${targetRoleName}）`;

    if (isRecluse) {
      message += '\n注意：陌客能力正常，可選擇在場邪惡角色';
    } else if (isSpy) {
      message += '\n注意：間諜能力正常，可選擇在場善良角色';
    }

    if (!this.infoReliable) {
      message += '\n能力不可靠，說書人可給錯誤資訊';
    }

    return message;
  }
}
