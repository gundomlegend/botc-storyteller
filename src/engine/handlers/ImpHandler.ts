import type { RoleHandler, HandlerContext, NightResult } from '../types';

export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '小惡魔選擇擊殺目標',
        display: '等待小惡魔選擇擊殺目標...',
      };
    }

    if (target.isProtected) {
      return {
        action: 'kill',
        info: {
          targetSeat: target.seat,
          targetName: target.name,
          blocked: true,
          reason: '目標受到僧侶保護',
        },
        display: `小惡魔選擇擊殺 ${target.seat}號 (${target.name})\n該玩家受到僧侶保護，擊殺失敗！`,
        gesture: 'none',
      };
    }

    if (target.role === 'soldier' && !target.isPoisoned && !target.isDrunk) {
      return {
        action: 'kill',
        info: {
          targetSeat: target.seat,
          targetName: target.name,
          blocked: true,
          reason: '目標是士兵',
        },
        display: `小惡魔選擇擊殺 ${target.seat}號 (${target.name})\n該玩家是士兵，免疫惡魔擊殺！`,
        gesture: 'none',
      };
    }

    return {
      action: 'kill',
      info: {
        targetSeat: target.seat,
        targetName: target.name,
        blocked: false,
      },
      display: `小惡魔擊殺 ${target.seat}號 (${target.name})\n該玩家將在黎明時死亡`,
      gesture: 'none',
    };
  }
}
