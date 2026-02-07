import type { RoleHandler, HandlerContext, NightResult, Player } from '../types';

export class FortunetellerHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, target, infoReliable, statusReason } = context;

    if (!target) {
      return {
        needInput: true,
        inputType: 'select_player',
        inputPrompt: '占卜師選擇要查驗的玩家',
        display: '等待占卜師選擇目標...',
      };
    }

    const isEvil = target.team === 'minion' || target.team === 'demon';

    let finalInfo: boolean;
    let reasoning: string;
    let mustFollow: boolean;

    if (!infoReliable) {
      finalInfo = !isEvil;
      reasoning = `占卜師${statusReason}，必須給錯誤資訊`;
      mustFollow = true;
    } else {
      finalInfo = isEvil;
      reasoning = '占卜師狀態正常，建議給真實資訊（說書人可選擇撒謊）';
      mustFollow = false;
    }

    return {
      action: 'tell_alignment',
      info: finalInfo ? 'evil' : 'good',
      gesture: finalInfo ? 'shake' : 'nod',
      mustFollow,
      canLie: !mustFollow,
      reasoning,
      display: this.formatDisplay(player, target, isEvil, finalInfo, reasoning),
    };
  }

  private formatDisplay(
    _player: Player,
    target: Player,
    actualEvil: boolean,
    suggestedEvil: boolean,
    reasoning: string
  ): string {
    return `查驗 ${target.seat}號 (${target.name})
真實身份：${target.role} (${actualEvil ? '邪惡' : '善良'})

${reasoning}

建議手勢：${suggestedEvil ? '搖頭（邪惡）' : '點頭（善良）'}`;
  }
}
