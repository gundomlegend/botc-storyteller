import type { RoleHandler, HandlerContext, NightResult, Player, GameState } from '../types';

export class ChefHandler implements RoleHandler {
  process(context: HandlerContext): NightResult {
    const { gameState, getPlayerRoleName } = context;

    // 步驟 1: 僅第一晚執行
    if (gameState.night > 1) {
      return {
        skip: true,
        skipReason: '廚師僅在第一晚獲得資訊',
        display: '廚師僅在第一晚行動',
      };
    }

    // 步驟 2-3: 計算相鄰配對
    const result = this.findAdjacentPairs(gameState);
    const { actualPairCount, segments, pairDetails, evilSeats, recluseSeats, spySeats } = result;

    // 步驟 4: 回傳結果
    const reasoning = this.buildReasoning(
      actualPairCount,
      segments,
      recluseSeats,
      spySeats,
      gameState,
      getPlayerRoleName
    );

    return {
      action: 'tell_number',
      info: {
        actualPairCount,
        toldPairCount: undefined, // UI 層填入
        evilSeats,
        segments,
        pairDetails,
        recluseSeats,
        spySeats,
      },
      mustFollow: false,
      canLie: true,
      reasoning,
      display: this.formatDisplay(
        actualPairCount,
        segments,
        pairDetails,
        recluseSeats,
        spySeats,
        gameState,
        getPlayerRoleName
      ),
    };
  }

  private isEvilForChef(player: Player): boolean {
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

    // 一般規則：爪牙和惡魔
    return player.team === 'minion' || player.team === 'demon';
  }

  private findAdjacentPairs(gameState: GameState): {
    actualPairCount: number;
    segments: number[][];
    pairDetails: string[];
    evilSeats: number[];
    recluseSeats: number[];
    spySeats: number[];
  } {
    const players = Array.from(gameState.players.values())
      .filter(p => p.isAlive)
      .sort((a, b) => a.seat - b.seat);

    // 篩選被視為邪惡的玩家
    const evilSeats = players
      .filter(p => this.isEvilForChef(p))
      .map(p => p.seat);

    // 記錄特殊角色
    const recluseSeats = players
      .filter(p => p.role === 'recluse')
      .map(p => p.seat);

    const spySeats = players
      .filter(p => p.role === 'spy')
      .map(p => p.seat);

    if (evilSeats.length === 0) {
      return {
        actualPairCount: 0,
        segments: [],
        pairDetails: [],
        evilSeats: [],
        recluseSeats,
        spySeats,
      };
    }

    // 找連續區塊（考慮環形）
    const segments: number[][] = [];
    const visited = new Set<number>();

    for (const seat of evilSeats) {
      if (visited.has(seat)) continue;

      const segment: number[] = [seat];
      visited.add(seat);

      // 向右擴展
      let next = this.getNextSeat(seat, gameState.playerCount);
      while (evilSeats.includes(next) && !visited.has(next)) {
        segment.push(next);
        visited.add(next);
        next = this.getNextSeat(next, gameState.playerCount);
      }

      // 向左擴展
      let prev = this.getPrevSeat(seat, gameState.playerCount);
      while (evilSeats.includes(prev) && !visited.has(prev)) {
        segment.unshift(prev);
        visited.add(prev);
        prev = this.getPrevSeat(prev, gameState.playerCount);
      }

      segments.push(segment);
    }

    // 計算配對
    let actualPairCount = 0;
    const pairDetails: string[] = [];

    for (const segment of segments) {
      const pairs = segment.length - 1;
      actualPairCount += pairs;

      for (let i = 0; i < segment.length - 1; i++) {
        pairDetails.push(`${segment[i]}-${segment[i + 1]}`);
      }
    }

    return {
      actualPairCount,
      segments,
      pairDetails,
      evilSeats,
      recluseSeats,
      spySeats,
    };
  }

  private getNextSeat(seat: number, totalPlayers: number): number {
    return seat === totalPlayers ? 1 : seat + 1;
  }

  private getPrevSeat(seat: number, totalPlayers: number): number {
    return seat === 1 ? totalPlayers : seat - 1;
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
    actualPairCount: number,
    segments: number[][],
    recluseSeats: number[],
    spySeats: number[],
    gameState: GameState,
    getPlayerRoleName: (player: Player) => string
  ): string {
    const notes = this.buildSpecialRoleNotes(recluseSeats, spySeats, false);

    if (actualPairCount === 0) {
      const noteStr = notes.length > 0 ? `（${notes.join('；')}）` : '';
      return `沒有相鄰的邪惡玩家${noteStr}`;
    }

    const parts: string[] = [];
    for (const segment of segments) {
      const roles = segment.map(seat => {
        const player = gameState.players.get(seat)!;
        return `${seat}號(${getPlayerRoleName(player)})`;
      }).join('、');

      const pairs = segment.length - 1;
      parts.push(`${roles} 形成 ${pairs} 組配對`);
    }

    if (notes.length > 0) {
      parts.push(`註：${notes.join('；')}`);
    }

    return parts.join('；');
  }

  private formatDisplay(
    actualPairCount: number,
    segments: number[][],
    pairDetails: string[],
    recluseSeats: number[],
    spySeats: number[],
    gameState: GameState,
    getPlayerRoleName: (player: Player) => string
  ): string {
    const specialNotes = this.buildSpecialRoleNotes(recluseSeats, spySeats, true);
    const specialNotesStr = specialNotes.length > 0
      ? `\n\n${specialNotes.join('\n')}`
      : '';

    if (actualPairCount === 0) {
      return `廚師資訊：0 組相鄰邪惡玩家配對

沒有邪惡玩家相鄰而坐${specialNotesStr}`;
    }

    const segmentInfo = segments.map(seg => {
      const players = seg.map(seat => {
        const player = gameState.players.get(seat)!;
        const role = getPlayerRoleName(player);
        return `${seat}號 ${player.name}(${role})`;
      }).join(' - ');
      return `  • ${players}`;
    }).join('\n');

    return `廚師資訊：${actualPairCount} 組相鄰邪惡玩家配對

連續邪惡玩家區塊：
${segmentInfo}

配對明細：${pairDetails.join(', ')}${specialNotesStr}`;
  }
}
