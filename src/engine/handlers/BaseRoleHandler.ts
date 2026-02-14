import { RoleRegistry } from '../RoleRegistry';
import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';

/**
 * Handler 基礎類別
 * 提供常用的輔助方法，避免每個 handler 都要從 context 解構
 */
export abstract class BaseRoleHandler implements RoleHandler {
  protected ruleRegistry: RoleRegistry;  
  protected context!: HandlerContext;

  constructor(ruleRegistry: RoleRegistry) {
    this.ruleRegistry = ruleRegistry;
  }

  /**
   * 處理角色能力的主方法
   * 子類必須實作此方法
   */
  abstract process(context: HandlerContext): NightResult;

  /**
   * 取得玩家的角色顯示名稱（考慮 believesRole）
   * 如果玩家有 believesRole（如酒鬼），顯示為「假角色名(真實角色名)」
   *
   * 這是推薦的方法，應優先使用此方法而非 getRoleName
   */
  protected getPlayerRoleName(player: Player): string {
    return this.ruleRegistry.getPlayerRoleName(player);
  }

  /**
   * 根據當前語系取得角色 ID 的顯示名稱
   *
   * 注意：此方法僅用於特殊情況（如顯示不在場的角色列表）
   * 一般情況下應使用 getPlayerRoleName(player) 以正確處理 believesRole
   */
  protected getRoleName(roleId: string): string {
    return this.ruleRegistry.getRoleName(roleId);
  }

  /**
   * 取得遊戲狀態
   */
  protected get gameState(): GameState {
    return this.context.gameState;
  }

  /**
   * 取得當前玩家
   */
  protected get player(): Player {
    return this.context.player;
  }

  /**
   * 取得目標玩家
   */
  protected get target(): Player | null {
    return this.context.target;
  }

  /**
   * 取得第二目標玩家
   */
  protected get secondTarget(): Player | undefined {
    return this.context.secondTarget;
  }

  /**
   * 資訊是否可靠（未中毒且未醉酒）
   */
  protected get infoReliable(): boolean {
    return this.context.infoReliable;
  }

  /**
   * 狀態原因（中毒、醉酒等）
   */
  protected get statusReason(): string {
    return this.context.statusReason;
  }

  /**
   * 取得角色資料
   */
  protected get roleData() {
    return this.context.roleData;
  }
}
