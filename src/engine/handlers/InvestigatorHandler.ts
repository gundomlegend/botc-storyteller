import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

export class InvestigatorHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { gameState, infoReliable, statusReason } = context;

    // 步驟 1: 僅第一晚執行
    if (gameState.night > 1) {
      return {
        skip: true,
        skipReason: '調查員僅在第一晚獲得資訊',
        display: '調查員僅在第一晚行動',
      };
    }

    // 步驟 2: 獲取所有存活爪牙
    const allPlayers = Array.from(gameState.players.values());
    const minions = allPlayers.filter(p => p.team === 'minion' && p.isAlive);

    // 步驟 3: 無爪牙情況
    if (minions.length === 0) {
      return {
        action: 'show_info',
        display: '場上無爪牙角色，調查員無法獲得資訊',
        info: {
          noMinionInGame: true,
        },
        mustFollow: false,
        canLie: true,
      };
    }

    // 步驟 4: 只有間諜的特殊情況（僅在間諜能力正常時適用）
    // 如果間諜中毒或醉酒，能力失效，不適用特殊規則
    // 說書人可選擇告知「無爪牙」或給予假資訊
    if (minions.length === 1 && minions[0].role === 'spy' &&
        !minions[0].isPoisoned && !minions[0].isDrunk) {
      const spyInfo = {
        seat: minions[0].seat,
        name: minions[0].name,
        role: minions[0].role,
        roleName: this.getPlayerRoleName(minions[0]),
      };

      return {
        action: 'show_info',
        display: '場上只有間諜（能力正常），可告知調查員：場上無任何爪牙角色',
        info: {
          onlySpyInGame: true,
          noMinionToShow: true,
          minions: [spyInfo], // 提供間諜資料供 UI 顯示
          recluses: [],
          hasSpy: true,
          hasRecluse: false,
          reliable: infoReliable,
          statusReason,
        },
        mustFollow: false, // 說書人可自行決定
        canLie: true,
      };
    }

    // 步驟 5: 收集在場爪牙資訊
    const minionList = minions.map(m => ({
      seat: m.seat,
      name: m.name,
      role: m.role,
      roleName: this.getPlayerRoleName(m),
    }));

    // 步驟 6: 收集陌客資訊（能力正常，可視為爪牙）
    // 陌客中毒或醉酒時，能力失效，不應視為可疑目標
    const recluses = allPlayers.filter(p =>
      p.role === 'recluse' && p.isAlive && !p.isPoisoned && !p.isDrunk
    );

    const recluseList = recluses.map(r => ({
      seat: r.seat,
      name: r.name,
      role: r.role,
      roleName: this.getPlayerRoleName(r),
    }));

    const hasRecluse = recluses.length > 0;

    // 步驟 7: 檢查是否有間諜（供 UI 層參考）
    const hasSpy = minions.some(m =>
      m.role === 'spy' && !m.isPoisoned && !m.isDrunk
    );

    // 步驟 8: 返回資訊，讓說書人在 UI 中選擇
    return {
      action: 'show_info',
      display: `調查員資訊獲取\n場上爪牙角色：${minionList.map(m => `${m.seat}號 ${m.name}(${m.roleName})`).join('、')}`,
      info: {
        // 在場爪牙列表（供 UI 選擇）
        minions: minionList,
        // 陌客列表（能力正常，可視為爪牙）
        recluses: recluseList,
        hasSpy,
        hasRecluse,
        // 可靠性資訊
        reliable: infoReliable,
        statusReason,
      },
      gesture: 'none',
      mustFollow: false, // 中毒/醉酒時說書人可自行決定
      canLie: true,      // 說書人可給不同答案
    };
  }
}
