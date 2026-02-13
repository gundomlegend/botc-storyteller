/**
 * Handler 單元測試
 *
 * 每個 handler 直接傳入 HandlerContext 測試，不經 RuleEngine。
 * 對應 TASKS.md：「每個 handler 至少 1-2 個核心情境」
 */
import { describe, it, expect } from 'vitest';
import type { HandlerContext, Player, GameState, RoleData } from '../../types';
import { FortunetellerHandler } from '../FortunetellerHandler';
import { ChefHandler } from '../ChefHandler';
import { MonkHandler } from '../MonkHandler';
import { PoisonerHandler } from '../PoisonerHandler';
import { ImpHandler } from '../ImpHandler';
import { DrunkHandler } from '../DrunkHandler';
import { ButlerHandler } from '../ButlerHandler';
import { InvestigatorHandler } from '../InvestigatorHandler';

// ============================================================
// 輔助
// ============================================================

const STUB_ROLE_DATA: RoleData = {
  id: 'stub',
  name: 'Stub',
  name_cn: '測試',
  team: 'townsfolk',
  ability: '',
  ability_cn: '',
  firstNight: 0,
  firstNightReminder: '',
  firstNightReminder_cn: '',
  otherNight: 0,
  otherNightReminder: '',
  otherNightReminder_cn: '',
  reminders: [],
  setup: false,
  affectedByPoison: true,
  affectedByDrunk: true,
  worksWhenDead: false,
};

function makePlayer(overrides: Partial<Player> & { seat: number }): Player {
  return {
    name: `Player${overrides.seat}`,
    role: 'townsfolk_stub',
    team: 'townsfolk',
    isAlive: true,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    believesRole: null,
    masterSeat: null,
    abilityUsed: false,
    deathCause: null,
    deathNight: null,
    deathDay: null,
    ...overrides,
  };
}

function makeGameState(players: Player[], redHerringSeat: number | null = null): GameState {
  const map = new Map<number, Player>();
  for (const p of players) map.set(p.seat, p);
  return {
    night: 1,
    day: 0,
    phase: 'night',
    players: map,
    playerCount: players.length,
    history: [],
    setupComplete: true,
    selectedRoles: players.map(p => p.role),
    demonBluffs: [],
    redHerringSeat,
  };
}

function makeContext(overrides: Partial<HandlerContext>): HandlerContext {
  return {
    roleData: STUB_ROLE_DATA,
    player: makePlayer({ seat: 1 }),
    target: null,
    gameState: makeGameState([]),
    infoReliable: true,
    statusReason: '',
    getRoleName: (id: string) => id,
    ...overrides,
  };
}

// ============================================================
// FortunetellerHandler
// ============================================================

describe('FortunetellerHandler', () => {
  const handler = new FortunetellerHandler();

  it('無目標時要求輸入 (select_two_players)', () => {
    const result = handler.process(makeContext({ target: null }));
    expect(result.needInput).toBe(true);
    expect(result.inputType).toBe('select_two_players');
  });

  it('只有一個目標時仍要求輸入', () => {
    const target = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const result = handler.process(makeContext({ target, secondTarget: undefined }));
    expect(result.needInput).toBe(true);
    expect(result.inputType).toBe('select_two_players');
  });

  it('雙善良、無干擾項 → rawDetection: false', () => {
    const target = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const secondTarget = makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect(result.action).toBe('tell_alignment');
    expect((result.info as any).rawDetection).toBe(false);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('其中一個是惡魔 → rawDetection: true', () => {
    const target = makePlayer({ seat: 2, role: 'imp', team: 'demon' });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect(result.action).toBe('tell_alignment');
    expect((result.info as any).rawDetection).toBe(true);
    expect((result.info as any).target1.isDemon).toBe(true);
  });

  it('爪牙不觸發偵測 → rawDetection: false', () => {
    const target = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(false);
  });

  it('干擾項玩家被選中 → rawDetection: true', () => {
    const target = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const secondTarget = makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], 2); // seat 2 = 干擾項
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(true);
    expect((result.info as any).target1.isRedHerring).toBe(true);
  });

  it('陌客正常狀態被選中 → rawDetection: true', () => {
    const target = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(true);
    expect((result.info as any).target1.isRecluse).toBe(true);
  });

  it('陌客中毒被選中 → rawDetection: false (能力失效)', () => {
    const target = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(false);
    expect((result.info as any).target1.isRecluse).toBe(false);
  });

  it('陌客醉酒被選中 → rawDetection: false (能力失效)', () => {
    const target = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isDrunk: true });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(false);
    expect((result.info as any).target1.isRecluse).toBe(false);
  });

  it('陌客帶干擾項（冗餘） → rawDetection: true', () => {
    const target = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], 2); // 陌客同時是干擾項
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: true, gameState: gs,
    }));

    expect((result.info as any).rawDetection).toBe(true);
    expect((result.info as any).target1.isRecluse).toBe(true);
    expect((result.info as any).target1.isRedHerring).toBe(true);
  });

  it('中毒時仍回傳實際偵測結果，mustFollow: false', () => {
    const target = makePlayer({ seat: 2, role: 'imp', team: 'demon' });
    const secondTarget = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const gs = makeGameState([target, secondTarget], null);
    const result = handler.process(makeContext({
      target, secondTarget, infoReliable: false, statusReason: '中毒', gameState: gs,
    }));

    // 中毒不反轉，回傳實際結果
    expect((result.info as any).rawDetection).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });
});

// ============================================================
// ChefHandler
// ============================================================

describe('ChefHandler', () => {
  const handler = new ChefHandler();

  it('第一晚之後跳過', () => {
    const players = [makePlayer({ seat: 1, role: 'chef', team: 'townsfolk' })];
    const gs = makeGameState(players);
    gs.night = 2;
    const result = handler.process(makeContext({ gameState: gs }));
    expect(result.skip).toBe(true);
  });

  it('沒有邪惡玩家 → actualPairCount: 0', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'chef', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(0);
  });

  it('單獨邪惡玩家不形成配對 → actualPairCount: 0', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 4, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(0);
  });

  it('兩個相鄰邪惡玩家 → actualPairCount: 1', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(1);
    expect((result.info as any).pairDetails).toEqual(['2-3']);
  });

  it('三個相鄰邪惡玩家 → actualPairCount: 2', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'baron', team: 'minion' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(2);
    expect((result.info as any).pairDetails).toEqual(['2-3', '3-4']);
  });

  it('環形相鄰：首尾相接 → 正確計算', () => {
    const players = [
      makePlayer({ seat: 1, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 3, role: 'empath', team: 'townsfolk' }),
      makePlayer({ seat: 4, role: 'poisoner', team: 'minion' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(1); // [4-1] 環形
    expect((result.info as any).segments).toEqual([[4, 1]]);
  });

  it('間諜不被視為邪惡 → 不計入配對', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(0);
    expect((result.info as any).spySeats).toEqual([2]);
    expect((result.info as any).evilSeats).toEqual([3]);
  });

  it('間諜打斷連續區塊', () => {
    const players = [
      makePlayer({ seat: 1, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'baron', team: 'minion' }),
      makePlayer({ seat: 5, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(1);
    expect((result.info as any).segments).toEqual([[1], [3, 4]]);
    expect((result.info as any).pairDetails).toEqual(['3-4']);
  });

  it('陌客被視為邪惡 → 計入配對', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'recluse', team: 'outsider' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(1);
    expect((result.info as any).recluseSeats).toEqual([2]);
    expect((result.info as any).evilSeats).toEqual([2, 3]);
    expect((result.info as any).pairDetails).toEqual(['2-3']);
  });

  it('間諜中毒 → 被視為邪惡', () => {
    const players = [
      makePlayer({ seat: 1, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 2, role: 'spy', team: 'minion', isPoisoned: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(2);
    expect((result.info as any).evilSeats).toEqual([1, 2, 3]);
    expect((result.info as any).pairDetails).toEqual(['1-2', '2-3']);
  });

  it('陌客中毒 → 不被視為邪惡', () => {
    const players = [
      makePlayer({ seat: 1, role: 'monk', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
      makePlayer({ seat: 4, role: 'chef', team: 'townsfolk' }),
    ];
    const result = handler.process(makeContext({ gameState: makeGameState(players) }));
    expect((result.info as any).actualPairCount).toBe(0);
    expect((result.info as any).evilSeats).toEqual([3]);
  });

  it('廚師中毒時仍回傳實際計算結果', () => {
    const players = [
      makePlayer({ seat: 1, role: 'chef', team: 'townsfolk', isPoisoned: true }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
      makePlayer({ seat: 3, role: 'imp', team: 'demon' }),
    ];
    const result = handler.process(makeContext({
      gameState: makeGameState(players),
      infoReliable: false,
      statusReason: '中毒',
    }));
    expect((result.info as any).actualPairCount).toBe(1);
    expect((result.info as any).toldPairCount).toBeUndefined();
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });
});

// ============================================================
// MonkHandler
// ============================================================

describe('MonkHandler', () => {
  const handler = new MonkHandler();

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ target: null }));
    expect(result.needInput).toBe(true);
  });

  it('保護其他玩家 → add_protection', () => {
    const player = makePlayer({ seat: 1, role: 'monk' });
    const target = makePlayer({ seat: 3, role: 'fortuneteller' });
    const result = handler.process(makeContext({ player, target }));

    expect(result.action).toBe('add_protection');
    expect((result.info as any).targetSeat).toBe(3);
  });

  it('不能保護自己 → skip', () => {
    const player = makePlayer({ seat: 1, role: 'monk' });
    const target = makePlayer({ seat: 1, role: 'monk' }); // same seat
    const result = handler.process(makeContext({ player, target }));

    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不能保護自己');
  });
});

// ============================================================
// PoisonerHandler
// ============================================================

describe('PoisonerHandler', () => {
  const handler = new PoisonerHandler();

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ target: null }));
    expect(result.needInput).toBe(true);
  });

  it('選擇目標 → add_poison', () => {
    const target = makePlayer({ seat: 3, role: 'fortuneteller' });
    const result = handler.process(makeContext({ target, getRoleName: (id) => id }));

    expect(result.action).toBe('add_poison');
    expect((result.info as any).targetSeat).toBe(3);
    expect((result.info as any).targetRole).toBe('fortuneteller');
  });
});

// ============================================================
// ImpHandler
// ============================================================

describe('ImpHandler', () => {
  const handler = new ImpHandler();

  const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ player: imp, target: null }));
    expect(result.needInput).toBe(true);
  });

  it('一般擊殺 → action=kill, blocked=false', () => {
    const target = makePlayer({ seat: 2, role: 'fortuneteller' });
    const result = handler.process(makeContext({ player: imp, target }));

    expect(result.action).toBe('kill');
    expect((result.info as any).blocked).toBe(false);
    expect((result.info as any).targetSeat).toBe(2);
  });

  it('目標受保護 → blocked=true', () => {
    const target = makePlayer({ seat: 2, role: 'fortuneteller', isProtected: true });
    const result = handler.process(makeContext({ player: imp, target }));

    expect(result.action).toBe('kill');
    expect((result.info as any).blocked).toBe(true);
    expect((result.info as any).reason).toContain('保護');
  });

  it('目標是健康士兵 → blocked=true', () => {
    const target = makePlayer({ seat: 2, role: 'soldier' });
    const result = handler.process(makeContext({ player: imp, target }));

    expect(result.action).toBe('kill');
    expect((result.info as any).blocked).toBe(true);
    expect((result.info as any).reason).toContain('士兵');
  });

  it('目標是中毒士兵 → 不被阻擋', () => {
    const target = makePlayer({ seat: 2, role: 'soldier', isPoisoned: true });
    const result = handler.process(makeContext({ player: imp, target }));

    expect(result.action).toBe('kill');
    expect((result.info as any).blocked).toBe(false);
  });

  it('目標是醉酒士兵 → 不被阻擋', () => {
    const target = makePlayer({ seat: 2, role: 'soldier', isDrunk: true });
    const result = handler.process(makeContext({ player: imp, target }));

    expect(result.action).toBe('kill');
    expect((result.info as any).blocked).toBe(false);
  });

  describe('Star Pass（自殺繼承）', () => {
    it('自殺且有存活爪牙 → starPass=true', () => {
      const minion = makePlayer({ seat: 3, role: 'poisoner', team: 'minion' });
      const gs = makeGameState([imp, minion]);
      const result = handler.process(makeContext({
        player: imp,
        target: imp, // 自殺
        gameState: gs,
      }));

      expect(result.action).toBe('kill');
      expect((result.info as any).starPass).toBe(true);
      expect((result.info as any).newDemonSeat).toBe(3);
    });

    it('紅唇女郎優先繼承', () => {
      const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
      const scarlet = makePlayer({ seat: 3, role: 'scarletwoman', team: 'minion' });
      const gs = makeGameState([imp, poisoner, scarlet]);
      const result = handler.process(makeContext({
        player: imp,
        target: imp,
        gameState: gs,
      }));

      expect((result.info as any).starPass).toBe(true);
      expect((result.info as any).newDemonSeat).toBe(3); // scarlet woman
      expect((result.info as any).newDemonOldRole).toBe('scarletwoman');
    });

    it('自殺但無存活爪牙 → starPass=false', () => {
      const deadMinion = makePlayer({ seat: 3, role: 'poisoner', team: 'minion', isAlive: false });
      const gs = makeGameState([imp, deadMinion]);
      const result = handler.process(makeContext({
        player: imp,
        target: imp,
        gameState: gs,
      }));

      expect(result.action).toBe('kill');
      expect((result.info as any).starPass).toBe(false);
    });
  });
});

// ============================================================
// DrunkHandler
// ============================================================

describe('DrunkHandler', () => {
  const handler = new DrunkHandler();

  it('永遠跳過（無夜間行動）', () => {
    const result = handler.process(makeContext({}));
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('酒鬼');
  });
});

// ============================================================
// ButlerHandler
// ============================================================

describe('ButlerHandler', () => {
  const handler = new ButlerHandler();

  const butler = makePlayer({ seat: 4, role: 'butler', team: 'outsider' });

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ player: butler, target: null }));
    expect(result.needInput).toBe(true);
    expect(result.inputType).toBe('select_player');
  });

  it('選擇其他玩家作為主人 → set_master', () => {
    const master = makePlayer({ seat: 2, role: 'monk' });
    const result = handler.process(makeContext({ player: butler, target: master }));

    expect(result.action).toBe('set_master');
    expect((result.info as any).masterSeat).toBe(2);
    expect((result.info as any).masterName).toBe('Player2');
  });

  it('不能選擇自己作為主人 → skip', () => {
    const target = makePlayer({ seat: 4, role: 'butler', team: 'outsider' });
    const result = handler.process(makeContext({ player: butler, target }));

    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('不能選擇自己');
  });
});

// ============================================================
// InvestigatorHandler
// ============================================================

describe('InvestigatorHandler', () => {
  const handler = new InvestigatorHandler();

  it('第一晚之後跳過', () => {
    const players = [
      makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'poisoner', team: 'minion' }),
    ];
    const gs = makeGameState(players);
    gs.night = 2;
    const result = handler.process(makeContext({ gameState: gs }));
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('第一晚');
  });

  it('正常情況：返回爪牙列表供 UI 選擇', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' });
    const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [investigator, poisoner, monk, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
      getRoleName: (id) => id,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).minions).toHaveLength(1);
    expect((result.info as any).minions[0].seat).toBe(2);
    expect((result.info as any).minions[0].role).toBe('poisoner');
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('只有間諜情況：告知無爪牙', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [investigator, spy, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).onlySpyInGame).toBe(true);
    expect((result.info as any).noMinionToShow).toBe(true);
    expect(result.mustFollow).toBe(true);
    expect(result.canLie).toBe(false);
  });

  it('無爪牙情況：返回特殊處理', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' });
    const monk = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [investigator, monk, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).noMinionInGame).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('有陌客情況：返回陌客資訊', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' });
    const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const recluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider' });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [investigator, poisoner, recluse, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
      getRoleName: (id) => id,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).hasRecluse).toBe(true);
    expect((result.info as any).recluseSeat).toBe(3);
    expect((result.info as any).minions).toHaveLength(1);
    expect((result.info as any).minions[0].role).toBe('poisoner');
  });

  it('調查員中毒時仍回傳實際爪牙列表', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk', isPoisoned: true });
    const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [investigator, poisoner, monk, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
      infoReliable: false,
      statusReason: '中毒',
      getRoleName: (id) => id,
    }));

    // 中毒不反轉，回傳實際爪牙列表
    expect((result.info as any).minions).toHaveLength(1);
    expect((result.info as any).minions[0].role).toBe('poisoner');
    expect((result.info as any).reliable).toBe(false);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('多個爪牙：返回所有爪牙列表', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator', team: 'townsfolk' });
    const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const baron = makePlayer({ seat: 3, role: 'baron', team: 'minion' });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [investigator, poisoner, baron, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: investigator,
      gameState: gs,
      getRoleName: (id) => id,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).minions).toHaveLength(2);
    const minionRoles = (result.info as any).minions.map((m: any) => m.role);
    expect(minionRoles).toContain('poisoner');
    expect(minionRoles).toContain('baron');
  });
});
