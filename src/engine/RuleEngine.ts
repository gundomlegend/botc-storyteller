import type { RoleData, Jinx, Player, GameState, NightResult, NightContext, RoleHandler } from './types';
import { GameStateManager } from './GameState';
import { t } from './locale';
import rolesData from '../data/roles/trouble-brewing.json';
import jinxesData from '../data/jinxes.json';
import { RoleRegistry } from './RoleRegistry';
import { FortunetellerHandler } from './handlers/FortunetellerHandler';
import { ChefHandler } from './handlers/ChefHandler';
import { EmpathHandler } from './handlers/EmpathHandler';
import { InvestigatorHandler } from './handlers/InvestigatorHandler';
import { LibrarianHandler } from './handlers/LibrarianHandler';
import { WasherwomanHandler } from './handlers/WasherwomanHandler';
import { UndertakerHandler } from './handlers/UndertakerHandler';
import { MonkHandler } from './handlers/MonkHandler';
import { PoisonerHandler } from './handlers/PoisonerHandler';
import { ImpHandler } from './handlers/ImpHandler';
import { DrunkHandler } from './handlers/DrunkHandler';
import { ButlerHandler } from './handlers/ButlerHandler';

const EFFECT_ACTIONS = new Set(['add_protection', 'add_poison', 'kill']);


export class RuleEngine {
  private jinxRegistry: Jinx[];
  private handlers: Map<string, RoleHandler>;
  private nightContext: NightContext;
  private roleRegistry: RoleRegistry;

  constructor(roleRegistry: RoleRegistry) {
    this.roleRegistry = roleRegistry;
    this.roleRegistry.init(rolesData as RoleData[]);
    this.jinxRegistry = jinxesData as Jinx[];
    this.handlers = new Map<string, RoleHandler>([
      ['fortuneteller', new FortunetellerHandler(roleRegistry)],
      ['chef', new ChefHandler(roleRegistry)],
      ['empath', new EmpathHandler(roleRegistry)],
      ['investigator', new InvestigatorHandler(roleRegistry)],
      ['librarian', new LibrarianHandler(roleRegistry)],
      ['washerwoman', new WasherwomanHandler(roleRegistry)],
      ['undertaker', new UndertakerHandler(roleRegistry)],
      ['monk', new MonkHandler(roleRegistry)],
      ['poisoner', new PoisonerHandler(roleRegistry)],
      ['imp', new ImpHandler(roleRegistry)],
      ['drunk', new DrunkHandler(roleRegistry)],
      ['butler', new ButlerHandler(roleRegistry)],
    ]);
    this.nightContext = { blockedRoles: new Set() };
  }

  startNightResolution(): void {
    this.nightContext = { blockedRoles: new Set() };
  }

  /**
   * 獲取玩家的有效角色（用於 Handler 路由）
   *
   * 對於酒鬼玩家：
   * - 如果有 believesRole，使用假角色的 Handler
   * - 讓酒鬼執行假角色的完整行為（選擇目標、使用 UI）
   * - 能力效果會在後續被無效化（因為 role='drunk'）
   *
   * 對於其他玩家：
   * - 使用實際角色
   */
  private getEffectiveRole(player: Player): string {
    if (player.role === 'drunk' && player.believesRole) {
      return player.believesRole;
    }
    return player.role;
  }

  processNightAbility(
    player: Player,
    target: Player | null,
    gameState: GameState,
    stateManager: GameStateManager,
    secondTarget?: Player | null
  ): NightResult {
    // 1. 獲取角色資料（酒鬼使用假角色資料）
    const effectiveRole = this.getEffectiveRole(player);
    const roleData = this.roleRegistry.getRoleData(effectiveRole);
    if (!roleData) {
      return {
        skip: true,
        skipReason: `未知角色：${effectiveRole}`,
        display: `未知角色：${effectiveRole}`,
      };
    }

    // 2. 檢查 NightContext 攔截（AC4）
    if (this.nightContext.blockedRoles.has(roleData.team)) {
      return {
        skip: true,
        skipReason: `${t(roleData, 'name')}被攔截，本夜無法行動`,
        display: `${player.seat}號 ${player.name}（${t(roleData, 'name')}）被攔截，跳過`,
      };
    }

    // 3. 檢查死亡狀態
    if (!player.isAlive && !roleData.worksWhenDead) {
      return {
        skip: true,
        skipReason: `${t(roleData, 'name')}已死亡，無死後能力`,
        display: `${player.seat}號 ${player.name}（${t(roleData, 'name')}）已死亡，跳過`,
      };
    }

    // 4. 檢查狀態影響
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

    // 5. 檢查 Jinx 規則
    const jinxReason = this.checkJinxes(player.role, stateManager);
    if (jinxReason) {
      infoReliable = false;
      statusReason = statusReason ? `${statusReason}，且${jinxReason}` : jinxReason;
    }

    // 6. 調用處理器（酒鬼使用假角色的 Handler）
    const handler = this.handlers.get(effectiveRole);
    let result: NightResult;

    if (handler) {
      result = handler.process({
        roleData,
        player,
        target,
        secondTarget: secondTarget ?? undefined,
        gameState,
        infoReliable,
        statusReason
      });
    } else {
      result = this.getDefaultNightResult(roleData, player, infoReliable, statusReason);
    }

    // 7. 酒鬼角色本質檢查（永久無能力）
    if (player.role === 'drunk' && player.believesRole) {
      // 酒鬼執行了假角色的行為，但效果不會生效
      result = {
        ...result,
        effectNullified: true,
        reasoning: `此玩家是酒鬼（以為自己是${this.roleRegistry.getRoleName(player.believesRole)}），能力不會生效。說書人可給予任意假資訊。`,
      };
    }

    // 8. 統一後處理（AC1：中毒/醉酒狀態）
    return this.applyInvalidation(result, infoReliable, statusReason);
  }

  private applyInvalidation(
    result: NightResult,
    infoReliable: boolean,
    statusReason: string
  ): NightResult {
    if (result.skip || result.needInput || infoReliable) {
      return result;
    }

    if (result.action && EFFECT_ACTIONS.has(result.action)) {
      return {
        ...result,
        effectNullified: true,
        reasoning: `${statusReason}，效果不落地（仍喚醒玩家）`,
      };
    }

    return result;
  }

  private getDefaultNightResult(
    roleData: RoleData,
    player: Player,
    infoReliable: boolean,
    statusReason: string
  ): NightResult {
    const reminder = t(roleData, 'firstNightReminder') || t(roleData, 'otherNightReminder');

    return {
      action: 'show_info',
      display: reminder,
      info: {
        role: this.roleRegistry.getPlayerRoleName(player),
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

  processFirstNightSpecial(
    type: string,
    stateManager: GameStateManager
  ): NightResult {
    switch (type) {
      case '__minion_demon_recognition__':
        return this.processMinionDemonRecognition(stateManager);
      case '__demon_bluffs__':
        return this.processDemonBluffs(stateManager);
      default:
        return { skip: true, skipReason: `未知特殊階段：${type}`, display: '' };
    }
  }

  processMinionDemonRecognition(stateManager: GameStateManager): NightResult {
    const minions = stateManager.getMinionPlayers();
    const demon = stateManager.getDemonPlayer();

    const lines: string[] = ['【爪牙與惡魔互認】', ''];
    if (demon) {
      const demonRoleName = this.roleRegistry.getPlayerRoleName(demon);
      lines.push(`惡魔：${demon.seat}號 ${demon.name}（${demonRoleName}）`);
    }
    for (const m of minions) {
      const minionRoleName = this.roleRegistry.getPlayerRoleName(m);
      lines.push(`爪牙：${m.seat}號 ${m.name}（${minionRoleName}）`);
    }
    lines.push('', '請讓以上玩家睜眼，互相確認身份後閉眼。');

    return {
      action: 'show_info',
      display: lines.join('\n'),
      info: { demon: demon?.seat, minions: minions.map((m) => m.seat) },
      gesture: 'none',
    };
  }

  processDemonBluffs(stateManager: GameStateManager): NightResult {
    const demon = stateManager.getDemonPlayer();
    const bluffs = stateManager.generateDemonBluffs();

    const bluffNames = bluffs.map((id) => {
      return this.roleRegistry.getRoleName(id);
    });

    const lines: string[] = ['【惡魔虛張聲勢】', ''];
    if (demon) {
      const demonRoleName = this.roleRegistry.getPlayerRoleName(demon);
      lines.push(`讓 ${demon.seat}號 ${demon.name}（${demonRoleName}）睜眼`);
    }
    lines.push('', '展示以下三個角色標記：');
    bluffNames.forEach((name, i) => lines.push(`  ${i + 1}. ${name}`));
    lines.push('', '這些是未被分配的善良角色，惡魔可宣稱是這些角色。');
    lines.push('讓惡魔閉眼。');

    return {
      action: 'show_info',
      display: lines.join('\n'),
      info: { bluffs, bluffNames },
      gesture: 'none',
    };
  }
}
