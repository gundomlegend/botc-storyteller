import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';

/**
 * 陌客/間諜的登記結果。
 *
 * 註記文字必須由 registersAsEvil 產生，不可另行計算 —— 否則會出現
 * 「說書人看到的註記」與「引擎實際計算」互相矛盾的情況。
 */
interface SpecialRoleEntry {
  seat: number;
  role: 'recluse' | 'spy';
  registersAsEvil: boolean;
  abilityActive: boolean;
}

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

    // 記錄特殊角色（登記結果直接取自上方判斷，確保與 actualEvilCount 一致）
    const specialRoles: SpecialRoleEntry[] = [
      { player: left, isEvil: leftIsEvil },
      { player: right, isEvil: rightIsEvil },
    ]
      .filter(({ player }) => player.role === 'recluse' || player.role === 'spy')
      .map(({ player, isEvil }) => ({
        seat: player.seat,
        role: player.role as 'recluse' | 'spy',
        registersAsEvil: isEvil,
        abilityActive: !player.isPoisoned && !player.isDrunk,
      }));

    const recluseSeats = specialRoles.filter(e => e.role === 'recluse').map(e => e.seat);
    const spySeats = specialRoles.filter(e => e.role === 'spy').map(e => e.seat);

    // 步驟 3: 回傳結果
    const reasoning = this.buildReasoning(
      left, right, leftIsEvil, rightIsEvil,
      specialRoles
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
        actualEvilCount, specialRoles
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

  /**
   * 生成特殊角色說明文字（陌客/間諜）。
   *
   * 文字一律由 entry.registersAsEvil 推導，因此不可能與鄰居的邪惡判定矛盾。
   */
  private buildSpecialRoleNotes(
    specialRoles: SpecialRoleEntry[],
    withEmoji = false
  ): string[] {
    const prefix = withEmoji ? 'ℹ️ ' : '';
    const roleName = { recluse: '陌客', spy: '間諜' };

    return specialRoles.map(e => {
      const verdict = e.registersAsEvil ? '被視為邪惡' : '不被視為邪惡';
      const cause = e.abilityActive ? '' : '（能力失效）';
      return `${prefix}${roleName[e.role]} ${e.seat}號 ${verdict}${cause}`;
    });
  }

  private buildReasoning(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    specialRoles: SpecialRoleEntry[]
  ): string {
    const parts: string[] = [];

    if (leftIsEvil) {
      parts.push(`左邊鄰居 ${left.seat}號 ${this.getPlayerRoleName(left)} 是邪惡`);
    }
    if (rightIsEvil) {
      parts.push(`右邊鄰居 ${right.seat}號 ${this.getPlayerRoleName(right)} 是邪惡`);
    }

    // 添加特殊角色說明（無 emoji）
    parts.push(...this.buildSpecialRoleNotes(specialRoles, false));

    return parts.length > 0 ? parts.join('；') : '左右兩側鄰居都是好人';
  }

  private formatDisplay(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    actualEvilCount: number,
    specialRoles: SpecialRoleEntry[]
  ): string {
    const leftTag = leftIsEvil ? ' [邪惡]' : '';
    const rightTag = rightIsEvil ? ' [邪惡]' : '';

    // 生成特殊角色說明（有 emoji）
    const specialNotes = this.buildSpecialRoleNotes(specialRoles, true);
    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    return `共情者資訊：${actualEvilCount} 位相鄰邪惡玩家

左邊鄰居：${left.seat}號 - ${left.name} - ${this.getRoleName(left.role)} - ${leftTag}
右邊鄰居：${right.seat}號 - ${right.name} - ${this.getRoleName(right.role)} - ${rightTag}${specialNotesStr}`;
  }
}
