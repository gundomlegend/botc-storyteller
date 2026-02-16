import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

/**
 * 送葬者 Handler
 *
 * 其他夜晚能力：得知今天被處決玩家的角色
 *
 * 特殊處理：
 * - 只在其他夜晚執行（第一夜不執行）
 * - 依賴白天的處決事件
 * - 陌客（能力正常）可被視為邪惡角色
 * - 間諜（能力正常）可被視為善良角色
 * - 死亡後不工作
 *
 * See: docs/specs/Undertaker.spec.md
 */
export class UndertakerHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;
    const { gameState } = context;

    // 步驟 1: 只在其他夜晚執行（非第一夜）
    if (gameState.night === 1) {
      return {
        skip: true,
        skipReason: '送葬者不在第一夜行動',
        display: '送葬者僅在其他夜晚行動',
      };
    }

    // 步驟 2: 檢查送葬者是否存活
    if (!this.player.isAlive) {
      return {
        skip: true,
        skipReason: '送葬者已死亡，能力失效',
        display: '送葬者死亡後不工作',
      };
    }

    // 步驟 3: 檢查今天是否有處決
    const executedPlayer = gameState.getExecutedPlayerToday();
    if (!executedPlayer) {
      return {
        skip: true,
        skipReason: '今天沒有處決',
        display: '今天沒有處決，送葬者不獲得資訊',
      };
    }

    // 步驟 4: 取得被處決玩家的真實角色
    const executedRole = executedPlayer.role;
    const executedRoleName = this.roleRegistry.getRoleName(executedRole);

    // 步驟 5: 檢查陌客/間諜特殊情況
    const isRecluse = executedRole === 'recluse' && !executedPlayer.isPoisoned && !executedPlayer.isDrunk;
    const isSpy = executedRole === 'spy' && !executedPlayer.isPoisoned && !executedPlayer.isDrunk;

    // 取得可選角色列表
    let selectableRoles: string[] = [];
    if (this.infoReliable) {
      if (isRecluse) {
        // 陌客：可選擇在場邪惡角色
        selectableRoles = Array.from(gameState.players.values())
          .filter(p => p.isAlive && (p.team === 'minion' || p.team === 'demon'))
          .map(p => p.role);
      } else if (isSpy) {
        // 間諜：可選擇在場善良角色
        selectableRoles = Array.from(gameState.players.values())
          .filter(p => p.isAlive && (p.team === 'townsfolk' || p.team === 'outsider'))
          .map(p => p.role);
      }
    } else {
      // 能力不可靠：可選擇所有在場角色
      selectableRoles = Array.from(gameState.players.values())
        .filter(p => p.isAlive)
        .map(p => p.role);
    }

    // 步驟 6: 返回資訊
    return {
      action: 'show_info',
      display: this.buildDisplayMessage(executedPlayer, executedRoleName, isRecluse, isSpy),
      info: {
        executedPlayer: {
          seat: executedPlayer.seat,
          name: executedPlayer.name,
          role: executedRole,
          roleName: executedRoleName,
          believesRole: executedPlayer.believesRole,
          isDrunk: executedPlayer.role === 'drunk',
          isPoisoned: executedPlayer.isPoisoned,
        },
        isRecluse,        // 是否為能力正常的陌客
        isSpy,            // 是否為能力正常的間諜
        selectableRoles,  // 可選擇的角色列表
        reliable: this.infoReliable,
        statusReason: this.statusReason,
      },
      gesture: 'none',
      mustFollow: this.infoReliable && !isRecluse && !isSpy, // 標準情況下必須給真實角色
      canLie: !this.infoReliable || isRecluse || isSpy,      // 不可靠或特殊角色時可給假資訊
    };
  }

  /**
   * 建立顯示訊息
   */
  private buildDisplayMessage(
    executedPlayer: any,
    executedRoleName: string,
    isRecluse: boolean,
    isSpy: boolean,
  ): string {
    let message = '送葬者資訊獲取\n';
    message += `今日處決：${executedPlayer.seat}號 ${executedPlayer.name}（${executedRoleName}）`;

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
