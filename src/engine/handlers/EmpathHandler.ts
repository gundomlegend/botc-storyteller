import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';
import { BaseRoleHandler } from './BaseRoleHandler';
import {
  registersAsEvil,
  hasRegistrationAbility,
  describeAlignmentRegistration,
} from '../Registration';

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
    const leftIsEvil = registersAsEvil(left);
    const rightIsEvil = registersAsEvil(right);
    const actualEvilCount = (leftIsEvil ? 1 : 0) + (rightIsEvil ? 1 : 0);

    // 具登記彈性的鄰居（陌客/間諜）；註記文字稍後由同一個 resolver 產生
    const specialPlayers = [left, right].filter(hasRegistrationAbility);
    const recluseSeats = specialPlayers.filter(p => p.role === 'recluse').map(p => p.seat);
    const spySeats = specialPlayers.filter(p => p.role === 'spy').map(p => p.seat);

    // 步驟 3: 回傳結果
    const reasoning = this.buildReasoning(
      left, right, leftIsEvil, rightIsEvil,
      specialPlayers
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
        actualEvilCount, specialPlayers
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

  /**
   * 生成特殊角色說明文字（陌客/間諜）。
   *
   * 委派給 Registration —— 文字與邪惡判定同源，故不可能矛盾。
   * 見 docs/contracts/Registration.contract.md AC6。
   */
  private buildSpecialRoleNotes(specialPlayers: Player[], withEmoji = false): string[] {
    const prefix = withEmoji ? 'ℹ️ ' : '';
    return specialPlayers
      .map(p => describeAlignmentRegistration(p, { prefix }))
      .filter((note): note is string => note !== null);
  }

  private buildReasoning(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    specialPlayers: Player[]
  ): string {
    const parts: string[] = [];

    if (leftIsEvil) {
      parts.push(`左邊鄰居 ${left.seat}號 ${this.getPlayerRoleName(left)} 是邪惡`);
    }
    if (rightIsEvil) {
      parts.push(`右邊鄰居 ${right.seat}號 ${this.getPlayerRoleName(right)} 是邪惡`);
    }

    // 添加特殊角色說明（無 emoji）
    parts.push(...this.buildSpecialRoleNotes(specialPlayers, false));

    return parts.length > 0 ? parts.join('；') : '左右兩側鄰居都是好人';
  }

  private formatDisplay(
    left: Player,
    right: Player,
    leftIsEvil: boolean,
    rightIsEvil: boolean,
    actualEvilCount: number,
    specialPlayers: Player[]
  ): string {
    const leftTag = leftIsEvil ? ' [邪惡]' : '';
    const rightTag = rightIsEvil ? ' [邪惡]' : '';

    // 生成特殊角色說明（有 emoji）
    const specialNotes = this.buildSpecialRoleNotes(specialPlayers, true);
    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    return `共情者資訊：${actualEvilCount} 位相鄰邪惡玩家

左邊鄰居：${left.seat}號 - ${left.name} - ${this.getRoleName(left.role)} - ${leftTag}
右邊鄰居：${right.seat}號 - ${right.name} - ${this.getRoleName(right.role)} - ${rightTag}${specialNotesStr}`;
  }
}
