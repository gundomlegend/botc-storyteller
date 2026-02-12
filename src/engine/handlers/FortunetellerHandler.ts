import type { RoleHandler, HandlerContext, NightResult, Player } from '../types';

export class FortunetellerHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { target, secondTarget, gameState, getRoleName } = context;

    if (!target || !secondTarget) {
      return {
        needInput: true,
        inputType: 'select_two_players',
        inputPrompt: '占卜師選擇兩位玩家查驗',
        display: '等待占卜師選擇兩位目標...',
      };
    }

    const redHerringSeat = gameState.redHerringSeat;

    const t1 = this.analyzeTarget(target, redHerringSeat);
    const t2 = this.analyzeTarget(secondTarget, redHerringSeat);
    const rawDetection = t1.triggers || t2.triggers;

    const reasoning = this.buildReasoning(target, secondTarget, t1, t2, getRoleName);

    return {
      action: 'tell_alignment',
      info: {
        rawDetection,
        target1: { seat: target.seat, isDemon: t1.isDemon, isRecluse: t1.isRecluse, isRedHerring: t1.isRedHerring },
        target2: { seat: secondTarget.seat, isDemon: t2.isDemon, isRecluse: t2.isRecluse, isRedHerring: t2.isRedHerring },
      },
      mustFollow: false,
      canLie: true,
      reasoning,
      display: this.formatDisplay(target, secondTarget, t1, t2, rawDetection, reasoning, getRoleName),
    };
  }

  private analyzeTarget(
    target: Player,
    redHerringSeat: number | null
  ): { triggers: boolean; isDemon: boolean; isRecluse: boolean; isRedHerring: boolean } {
    const isDemon = target.team === 'demon';
    // 陌客中毒/醉酒時能力失效，不觸發偵測（與廚師邏輯一致）
    const isRecluse = target.role === 'recluse' && !target.isPoisoned && !target.isDrunk;
    const isRedHerring = target.seat === redHerringSeat;
    return {
      triggers: isDemon || isRecluse || isRedHerring,
      isDemon,
      isRecluse,
      isRedHerring,
    };
  }

  private buildReasoning(
    target: Player,
    secondTarget: Player,
    t1: { isDemon: boolean; isRecluse: boolean; isRedHerring: boolean },
    t2: { isDemon: boolean; isRecluse: boolean; isRedHerring: boolean },
    getRoleName: (roleId: string) => string
  ): string {
    const parts: string[] = [];

    if (t1.isDemon) parts.push(`${target.seat}號是惡魔（${getRoleName(target.role)}）`);
    if (t2.isDemon) parts.push(`${secondTarget.seat}號是惡魔（${getRoleName(secondTarget.role)}）`);
    if (t1.isRecluse) parts.push(`${target.seat}號是陌客（正常狀態觸發偵測）`);
    if (t2.isRecluse) parts.push(`${secondTarget.seat}號是陌客（正常狀態觸發偵測）`);
    if (t1.isRedHerring && !t1.isRecluse) parts.push(`${target.seat}號是干擾項`);
    if (t2.isRedHerring && !t2.isRecluse) parts.push(`${secondTarget.seat}號是干擾項`);

    if (parts.length > 0) {
      return parts.join('；');
    }
    return '兩位目標皆非惡魔、陌客或干擾項';
  }

  private formatDisplay(
    target: Player,
    secondTarget: Player,
    t1: { triggers: boolean; isDemon: boolean; isRecluse: boolean; isRedHerring: boolean },
    t2: { triggers: boolean; isDemon: boolean; isRecluse: boolean; isRedHerring: boolean },
    rawDetection: boolean,
    reasoning: string,
    getRoleName: (roleId: string) => string
  ): string {
    const tag = (a: { isDemon: boolean; isRecluse: boolean; isRedHerring: boolean }) => {
      const tags: string[] = [];
      if (a.isDemon) tags.push('惡魔');
      if (a.isRecluse) tags.push('陌客');
      if (a.isRedHerring && !a.isRecluse) tags.push('干擾項');
      return tags.length > 0 ? ` [${tags.join(', ')}]` : '';
    };

    return `查驗目標：
  1. ${target.seat}號 (${target.name}) — ${getRoleName(target.role)}${tag(t1)}
  2. ${secondTarget.seat}號 (${secondTarget.name}) — ${getRoleName(secondTarget.role)}${tag(t2)}

偵測結果：${rawDetection ? '偵測到惡魔' : '未偵測到惡魔'}

${reasoning}`;
  }
}
