import type { RoleData, Jinx, Player, GameState, NightResult, RoleHandler } from './types';
import { GameStateManager } from './GameState';
import { handlers } from './handlers';
import rolesData from '../data/roles/trouble-brewing.json';
import jinxesData from '../data/jinxes.json';

export class RuleEngine {
  private roleRegistry: Map<string, RoleData>;
  private jinxRegistry: Jinx[];
  private handlers: Map<string, RoleHandler>;

  constructor() {
    this.roleRegistry = new Map();
    (rolesData as RoleData[]).forEach((role) => {
      this.roleRegistry.set(role.id, role);
    });

    this.jinxRegistry = jinxesData as Jinx[];
    this.handlers = handlers;
  }

  processNightAbility(
    player: Player,
    target: Player | null,
    gameState: GameState,
    stateManager: GameStateManager
  ): NightResult {
    // 1. 獲取角色資料
    const roleData = this.roleRegistry.get(player.role);
    if (!roleData) {
      return {
        skip: true,
        skipReason: `未知角色：${player.role}`,
        display: `未知角色：${player.role}`,
      };
    }

    // 2. 檢查死亡狀態
    if (!player.isAlive && !roleData.worksWhenDead) {
      return {
        skip: true,
        skipReason: `${roleData.name_cn}已死亡，無死後能力`,
        display: `${player.seat}號 ${player.name}（${roleData.name_cn}）已死亡，跳過`,
      };
    }

    // 3. 檢查狀態影響
    let infoReliable = true;
    let statusReason = '';

    if (roleData.affectedByPoison && player.isPoisoned) {
      infoReliable = false;
      statusReason = '中毒';
    }

    if (roleData.affectedByDrunk && player.isDrunk) {
      infoReliable = false;
      statusReason = statusReason ? `${statusReason}且醉酒` : '醉酒';
    }

    // 4. 檢查 Jinx 規則
    const jinxReason = this.checkJinxes(player.role, stateManager);
    if (jinxReason) {
      infoReliable = false;
      statusReason = statusReason ? `${statusReason}，且${jinxReason}` : jinxReason;
    }

    // 5. 調用處理器
    const handler = this.handlers.get(player.role);
    if (handler) {
      return handler.process({
        roleData,
        player,
        target,
        gameState,
        infoReliable,
        statusReason,
      });
    }

    // 6. 使用預設處理器
    return this.defaultHandler(roleData, player, infoReliable, statusReason);
  }

  private defaultHandler(
    roleData: RoleData,
    _player: Player,
    infoReliable: boolean,
    statusReason: string
  ): NightResult {
    const reminder = roleData.firstNightReminder || roleData.otherNightReminder_cn;

    return {
      action: 'show_info',
      display: reminder,
      info: {
        role: roleData.name_cn,
        reminder,
        reliable: infoReliable,
        statusReason,
      },
      gesture: 'none',
    };
  }

  private checkJinxes(roleId: string, stateManager: GameStateManager): string | null {
    for (const jinx of this.jinxRegistry) {
      let otherRoleId: string | null = null;

      if (jinx.role1 === roleId) {
        otherRoleId = jinx.role2;
      } else if (jinx.role2 === roleId) {
        otherRoleId = jinx.role1;
      }

      if (otherRoleId && stateManager.hasAliveRole(otherRoleId)) {
        return jinx.reason;
      }
    }

    return null;
  }

  getRoleData(roleId: string): RoleData | undefined {
    return this.roleRegistry.get(roleId);
  }
}
