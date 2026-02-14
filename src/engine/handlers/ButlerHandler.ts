import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

export class ButlerHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '管家選擇主人（不能選擇自己）',
        display: '等待管家選擇主人...',
      };
    }

    if (target.seat === player.seat) {
      return {
        skip: true,
        skipReason: '管家不能選擇自己作為主人',
        display: '管家不能選擇自己作為主人，請重新選擇',
      };
    }

    return {
      action: 'set_master',
      info: {
        masterSeat: target.seat,
        masterName: target.name,
      },
      display: `管家選擇 ${target.seat}號 (${target.name}) 作為主人\n明天管家只能在主人投票時跟著投票`,
      gesture: 'none',
    };
  }
}
