import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

export class EmpathHandler extends BaseRoleHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { player, gameState } = context;

    // 步驟 1: 找出左右相鄰且存活的玩家
    const { left, right } = this.findAliveNeighbors(player, gameState);

    if (!left || !right) {
      return {
        skip: true,
        skipReason: '存活玩家不足，無法偵測鄰居',
        display: '存活玩家不足（至少含共情者一共3人）',
      };
    }

    // 步驟 2: 計算邪惡玩家數量
    const leftIsEvil = this.isEvilForEmpath(left);
    const rightIsEvil = this.isEvilForEmpath(right);
    const actualEvilCount = (leftIsEvil ? 1 : 0) + (rightIsEvil ? 1 : 0);

    // 記錄特殊角色
    const recluseSeats = [left, right]
      .filter(p => p.role === 'recluse')
      .map(p => p.seat);

    const spySeats = [left, right]
      .filter(p => p.role === 'spy')
      .map(p => p.seat);

    // 步驟 3: 回傳結果
    const reasoning = this.buildReasoning(
      left, right, leftIsEvil, rightIsEvil,
      recluseSeats, spySeats
    );

    return {
      action: 'tell_number',
      info: {
        actualEvilCount,
        toldEvilCount: undefined, // UI 填入用
        leftNeighbor: {
          seat: left.seat,
          name: left.name,
          role: left.role,
          isEvil: leftIsEvil,
        },
        rightNeighbor: {
          seat: right.seat,
          name: right.name,
          role: right.role,
          isEvil: rightIsEvil,
        },
        recluseSeats,
        spySeats,
      },
      mustFollow: false,
      canLie: true,
      reasoning,
      display: this.formatDisplay(
        left, right, leftIsEvil, rightIsEvil,
        actualEvilCount, recluseSeats, spySeats
      ),
      gesture: 'none',
    };
  }

  private findAliveNeighbors(
    player: Player,
    gameState: GameState
  ): { left: Player | null; right: Player | null } {
    const alivePlayers = Array.from(gameState.players.values())
      .filter(p => p.isAlive)
      .sort((a, b) => a.seat - b.seat);

    if (alivePlayers.length < 2) {
      return { left: null, right: null };
    }

    const playerIndex = alivePlayers.findIndex(p => p.seat === player.seat);
    if (playerIndex === -1) {
      return { left: null, right: null };
    }

    // 環形結構：左右鄰居
    const leftIndex = (playerIndex - 1 + alivePlayers.length) % alivePlayers.length;
    const rightIndex = (playerIndex + 1) % alivePlayers.length;

    return {
      left: alivePlayers[leftIndex],
      right: alivePlayers[rightIndex],
    };
  }

  private isEvilForEmpath(player: Player): boolean {
    // 特例 1：間諜
    if (player.role === 'spy') {
      // 間諜中毒/醉酒：能力失效，被視為邪惡
      if (player.isPoisoned || player.isDrunk) return true;
      // 間諜正常：不被視為邪惡
      return false;
    }

    // 特例 2：陌客
    if (player.role === 'recluse') {
      // 陌客中毒/醉酒：能力失效，不被視為邪惡
      if (player.isPoisoned || player.isDrunk) return false;
      // 陌客正常：被視為邪惡（說書人決定，預設為 true）
      return true;
    }

    // 一般規則：爪牙和惡魔均被視為邪惡
    return player.team === 'minion' || player.team === 'demon';
  }

  /** 生成特殊角色說明文字（陌客/間諜） */
  private buildSpecialRoleNotes(
    recluseSeats: number[],
    spySeats: number[],
    withEmoji = false
  ): string[] {
    const notes: string[] = [];
    const prefix = withEmoji ? 'ℹ️ ' : '';

    if (recluseSeats.length > 0) {
      notes.push(`${prefix}陌客 ${recluseSeats.join('、')}號 被視為邪惡`);
    }
    if (spySeats.length > 0) {
      notes.push(`${prefix}間諜 ${spySeats.join('、')}號 不被視為邪惡`);
    }

    return notes;
  }

  private buildReasoning(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    recluseSeats: number[],
    spySeats: number[]
  ): string {
    const parts: string[] = [];

    if (leftIsEvil) {
      parts.push(`左邊鄰居 ${left.seat}號 ${this.getPlayerRoleName(left)} 是邪惡`);
    }
    if (rightIsEvil) {
      parts.push(`右邊鄰居 ${right.seat}號 ${this.getPlayerRoleName(right)} 是邪惡`);
    }

    // 添加特殊角色說明（無 emoji）
    parts.push(...this.buildSpecialRoleNotes(recluseSeats, spySeats, false));

    return parts.length > 0 ? parts.join('；') : '左右兩側鄰居都是好人';
  }

  private formatDisplay(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    actualEvilCount: number,
    recluseSeats: number[],
    spySeats: number[]
  ): string {
    const leftTag = leftIsEvil ? ' [邪惡]' : '';
    const rightTag = rightIsEvil ? ' [邪惡]' : '';

    // 生成特殊角色說明（有 emoji）
    const specialNotes = this.buildSpecialRoleNotes(recluseSeats, spySeats, true);
    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    return `共情者資訊：${actualEvilCount} 位相鄰邪惡玩家

左邊鄰居：${left.seat}號 - ${left.name} - ${this.getRoleName(left.role)} - ${leftTag}
右邊鄰居：${right.seat}號 - ${right.name} - ${this.getRoleName(right.role)} - ${rightTag}${specialNotesStr}`;
  }
}
