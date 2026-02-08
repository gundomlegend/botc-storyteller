import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';

export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, gameState, getRoleName } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '小惡魔選擇擊殺目標',
        display: '等待小惡魔選擇擊殺目標...',
      };
    }

    // Star Pass：自殺時爪牙繼承
    if (target.seat === player.seat) {
      return this.handleStarPass(player, gameState, getRoleName);
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

  private handleStarPass(
    player: Player,
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): NightResult {
    const aliveMinions = Array.from(gameState.players.values()).filter(
      (p) => p.team === 'minion' && p.isAlive
    );

    if (aliveMinions.length === 0) {
      return {
        action: 'kill',
        info: {
          targetSeat: player.seat,
          targetName: player.name,
          blocked: false,
          starPass: false,
        },
        display: `小惡魔自殺！\n無存活爪牙可繼承，惡魔陣營失去惡魔`,
        gesture: 'none',
      };
    }

    // 紅唇女郎優先，否則隨機
    const scarletWoman = aliveMinions.find((p) => p.role === 'scarletwoman');
    const newDemon =
      scarletWoman ?? aliveMinions[Math.floor(Math.random() * aliveMinions.length)];

    return {
      action: 'kill',
      info: {
        targetSeat: player.seat,
        targetName: player.name,
        blocked: false,
        starPass: true,
        newDemonSeat: newDemon.seat,
        newDemonName: newDemon.name,
        newDemonOldRole: newDemon.role,
      },
      display: `小惡魔自殺！\n${newDemon.seat}號 ${newDemon.name}（${getRoleName(newDemon.role)}）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔`,
      gesture: 'none',
    };
  }
}
