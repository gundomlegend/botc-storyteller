import type { RoleHandler, HandlerContext, NightResult } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';
import { buildGrimoireSnapshot } from '../Grimoire';

/**
 * 間諜 Handler
 *
 * 每夜能力：查看魔典
 *
 * 特殊處理：
 * - 死亡後仍然工作（worksWhenDead: true）—— 死亡不阻止查看魔典
 * - 中毒/醉酒時資訊不可靠：說書人展示的魔典內容**可能是錯的**
 *   （「查看魔典也屬於獲取訊息」），故走既有的 infoReliable / canLie 機制
 * - 魔典內容有可見性邊界，見 src/engine/Grimoire.ts
 *
 * 註：間諜的另一半能力「可能被視為好人/鎮民/外來者」屬於**註冊**，
 * 不在本 handler 處理 —— 見 src/engine/Registration.ts 與其 contract。
 *
 * @see docs/PLAN_Registration_and_Spy.md
 */
export class SpyHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    this.context = context;

    const grimoire = buildGrimoireSnapshot(context.gameState, this.ruleRegistry);

    return {
      action: 'show_info',
      display: this.buildDisplayMessage(),
      info: {
        grimoire,
        reliable: this.infoReliable,
        statusReason: this.statusReason,
      },
      gesture: 'none',
      // 魔典內容為事實，正常情況下說書人應如實展示
      mustFollow: this.infoReliable,
      // 中毒/醉酒時說書人可展示錯誤的魔典內容
      canLie: !this.infoReliable,
    };
  }

  private buildDisplayMessage(): string {
    let message = '間諜查看魔典\n';
    message += `讓 ${this.player.seat}號 ${this.player.name} 依自己意願的時長查看魔典，看完後閉眼。`;

    if (!this.player.isAlive) {
      message += '\n注意：間諜死亡後仍可查看魔典。';
    }

    if (!this.infoReliable) {
      message += `\n能力不可靠（${this.statusReason}），說書人展示的魔典內容可以是錯誤的。`;
    }

    return message;
  }
}
