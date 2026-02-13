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
      // 檢查惡魔自己是否受保護
      if (player.isProtected) {
        return {
          action: 'kill',
          info: {
            targetSeat: player.seat,
            targetName: player.name,
            blocked: true,
            reason: '惡魔受到僧侶保護',
          },
          display: `小惡魔選擇自殺\n惡魔受到僧侶保護，自殺失敗！`,
          gesture: 'none',
        };
      }
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

    // 鎮長轉移機制
    if (target.role === 'mayor' && !target.isPoisoned && !target.isDrunk) {
      return this.handleMayorBounce(target, gameState, getRoleName);
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

  private handleMayorBounce(
    mayor: Player,
    gameState: GameState,
    getRoleName: (roleId: string) => string
  ): NightResult {
    const suggestion = this.calculateBounceSuggestion(gameState);
    const availableTargets = Array.from(gameState.players.values()).filter(
      (p) => p.seat !== mayor.seat && p.team !== 'demon' && p.isAlive
    );

    // 建構推薦目標的詳細資訊
    const recommendedTargets = suggestion.recommendedTargets?.map((p) => ({
      seat: p.seat,
      name: p.name,
      role: p.role,
      roleName: getRoleName(p.role),
      team: p.team,
      isPoisoned: p.isPoisoned,
      isDrunk: p.isDrunk,
      isProtected: p.isProtected,
    }));

    return {
      action: 'mayor_bounce',
      info: {
        mayorSeat: mayor.seat,
        mayorName: mayor.name,
        suggestion: {
          action: suggestion.action,
          reason: suggestion.reason,
        },
        availableTargets: availableTargets.map((p) => ({
          seat: p.seat,
          name: p.name,
          role: p.role,
          roleName: getRoleName(p.role),
          team: p.team,
        })),
        recommendedTargets,
      },
      display: `小惡魔選擇擊殺鎮長 ${mayor.seat}號 (${mayor.name})

🎭 鎮長的死亡轉移能力觸發！

${suggestion.reason}

說書人可選擇：
1. 不轉移：鎮長死亡
2. 轉移：選擇其他玩家承受死亡（不含惡魔）`,
      gesture: 'none',
    };
  }

  private calculateBounceSuggestion(gameState: GameState): {
    action: 'keep' | 'bounce';
    reason: string;
    recommendedTargets?: Player[];
  } {
    const alive = Array.from(gameState.players.values()).filter((p) => p.isAlive);
    const evilCount = alive.filter((p) => p.team === 'minion' || p.team === 'demon').length;
    const goodCount = alive.length - evilCount;

    // 邪惡較多：建議轉給爪牙
    if (evilCount > goodCount + 1) {
      const minions = alive.filter((p) => p.team === 'minion');
      return {
        action: 'bounce',
        recommendedTargets: minions,
        reason: `⚖️ 邪惡玩家較多（${evilCount} 邪惡 vs ${goodCount} 好人）
建議：轉移給爪牙以平衡局勢`,
      };
    }

    // 好人較多：建議保留鎮長
    if (goodCount > evilCount + 1) {
      return {
        action: 'keep',
        reason: `⚖️ 好人玩家較多（${goodCount} 好人 vs ${evilCount} 邪惡）
建議：不轉移以保持平衡`,
      };
    }

    // 勢均力敵：建議轉給次要目標
    const secondaryTargets = alive.filter(
      (p) =>
        p.role === 'soldier' || // 士兵（免疫惡魔）
        p.isProtected || // 受僧侶保護
        p.isPoisoned ||
        p.isDrunk || // 失去能力
        p.team === 'outsider' // 外來者
    );

    if (secondaryTargets.length > 0) {
      return {
        action: 'bounce',
        recommendedTargets: secondaryTargets,
        reason: `⚖️ 雙方勢均力敵（${goodCount} 好人 vs ${evilCount} 邪惡）
建議：轉移給次要目標（士兵/受保護/失能/外來者）`,
      };
    }

    // 沒有明顯的次要目標
    return {
      action: 'bounce',
      recommendedTargets: alive.filter((p) => p.role !== 'mayor' && p.team !== 'demon'),
      reason: `⚖️ 雙方勢均力敵（${goodCount} 好人 vs ${evilCount} 邪惡）
建議：轉移給任意玩家以維持懸念`,
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
