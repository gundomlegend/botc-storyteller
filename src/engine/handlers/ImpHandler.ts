import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';

export class ImpHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, gameState, getPlayerRoleName } = context;

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
      return this.handleStarPass(player, gameState, getPlayerRoleName);
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
      return this.handleMayorBounce(target, gameState, getPlayerRoleName);
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
    getPlayerRoleName: (player: Player) => string
  ): NightResult {
    const availableTargets = Array.from(gameState.players.values()).filter(
      (p) => p.seat !== mayor.seat && p.team !== 'demon' && p.isAlive
    );

    return {
      action: 'mayor_bounce',
      info: {
        mayorSeat: mayor.seat,
        mayorName: mayor.name,
        availableTargets: availableTargets.map((p) => ({
          seat: p.seat,
          name: p.name,
          role: p.role,
          roleName: getPlayerRoleName(p),
          team: p.team,
        })),
      },
      display: `小惡魔選擇擊殺鎮長 ${mayor.seat}號 (${mayor.name})

🎭 鎮長的死亡轉移能力觸發！

📋 轉移建議參考（優先級：高 → 低）：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 早期 (D1-D2)：士兵 → 無能力鎮民 → 外來者
• 中期：可疑玩家 → 善良玩家
• 好人太順：資訊多鎮民 → 鎮長
• 邪惡太順：免疫惡魔攻擊者 → 爪牙
• 盤面混亂：外來者 ≈ 間諜 → 對跳者
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

說書人可選擇：
1. 不轉移：鎮長死亡
2. 轉移：選擇其他玩家承受死亡（不含惡魔）`,
      gesture: 'none',
    };
  }


  private handleStarPass(
    player: Player,
    gameState: GameState,
    getPlayerRoleName: (player: Player) => string
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
      display: `小惡魔自殺！\n${newDemon.seat}號 ${newDemon.name}（${getPlayerRoleName(newDemon)}）成為新的小惡魔\n\n請喚醒該玩家並告知其成為新的惡魔`,
      gesture: 'none',
    };
  }
}
