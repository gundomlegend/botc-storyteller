import type { RoleHandler, HandlerContext, NightResult } from '../types';

export class MonkHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '僧侶選擇要保護的玩家（不能選擇自己）',
        display: '等待僧侶選擇保護目標...',
      };
    }

    if (target.seat === player.seat) {
      return {
        skip: true,
        skipReason: '僧侶不能保護自己',
        display: '🚫 僧侶不能保護自己，請重新選擇',
      };
    }

    return {
      action: 'add_protection',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
      },
      display: `僧侶保護 ${target.seat}號 (${target.name})\n今晚該玩家不會被惡魔擊殺`,
      gesture: 'none',
    };
  }
}
