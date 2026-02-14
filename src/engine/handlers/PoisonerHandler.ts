import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

export class PoisonerHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '投毒者選擇要下毒的玩家',
        display: '等待投毒者選擇下毒目標...',
      };
    }

    return {
      action: 'add_poison',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
        targetRole: target.role,
      },
      display: `投毒者下毒 ${target.seat}號 (${target.name})\n角色：${this.getPlayerRoleName(target)}\n該玩家今晚和明天早上的能力將失效`,
      gesture: 'none',
    };
  }
}
