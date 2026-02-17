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
import { LibrarianHandler } from '../LibrarianHandler';
import { RoleRegistry } from '../../RoleRegistry';
import troubleBrewingRolesData from '../../../data/roles/trouble-brewing.json';

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
    executedToday: null,
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
    ...overrides,
  };
}

// ============================================================
// FortunetellerHandler
// ============================================================
const roleRegistry = RoleRegistry.getInstance();
roleRegistry.init(troubleBrewingRolesData as RoleData[]);

describe('FortunetellerHandler', () => {
  const handler = new FortunetellerHandler(roleRegistry);

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
  const handler = new ChefHandler(roleRegistry);

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
  const handler = new MonkHandler(roleRegistry);

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
  const handler = new PoisonerHandler(roleRegistry);

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ target: null }));
    expect(result.needInput).toBe(true);
  });

  it('選擇目標 → add_poison', () => {
    const target = makePlayer({ seat: 3, role: 'fortuneteller' });
    const result = handler.process(makeContext({ target }));

    expect(result.action).toBe('add_poison');
    expect((result.info as any).targetSeat).toBe(3);
    expect((result.info as any).targetRole).toBe('fortuneteller');
  });
});

// ============================================================
// ImpHandler
// ============================================================

describe('ImpHandler', () => {
  const handler = new ImpHandler(roleRegistry);
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
  const handler = new DrunkHandler(roleRegistry);

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
  const handler = new ButlerHandler(roleRegistry);
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
  const handler = new InvestigatorHandler(roleRegistry);

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
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).minions).toHaveLength(2);
    const minionRoles = (result.info as any).minions.map((m: any) => m.role);
    expect(minionRoles).toContain('poisoner');
    expect(minionRoles).toContain('baron');
  });
});

// ============================================================
// LibrarianHandler
// ============================================================
describe('LibrarianHandler', () => {
  const handler = new LibrarianHandler(roleRegistry);

  it('第一晚之後跳過', () => {
    const players = [
      makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' }),
      makePlayer({ seat: 2, role: 'butler', team: 'outsider' }),
    ];
    const gs = makeGameState(players);
    gs.night = 2;
    const result = handler.process(makeContext({ gameState: gs, player: players[0] }));
    expect(result.skip).toBe(true);
    expect(result.skipReason).toContain('第一晚');
  });

  it('T1: 標準情況（有外來者，能力正常）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const butler = makePlayer({ seat: 2, role: 'butler', team: 'outsider' });
    const recluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider' });
    const monk = makePlayer({ seat: 4, role: 'monk', team: 'townsfolk' });
    const players = [librarian, butler, recluse, monk];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    // Butler 在主列表，Recluse 在特殊列表
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('butler');
    expect((result.info as any).recluses).toHaveLength(1);
    expect((result.info as any).recluses[0].role).toBe('recluse');
    expect((result.info as any).hasRecluse).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('T2: 無外來者（7人局）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const monk = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const chef = makePlayer({ seat: 3, role: 'chef', team: 'townsfolk' });
    const players = [librarian, monk, chef];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).noOutsiderInGame).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('T3: 只有間諜（能力正常）- 可選擇給假資訊', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [librarian, spy, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).onlySpyInGame).toBe(true);
    expect((result.info as any).spy.seat).toBe(2);
    expect((result.info as any).spy.role).toBe('spy');
    // 與調查員不同：圖書管理員可選擇給假資訊或「無外來者」
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('T4: 間諜中毒（不能視為外來者）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion', isPoisoned: true });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [librarian, spy, imp];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).noOutsiderInGame).toBe(true);
    // 間諜中毒，不能視為外來者
  });

  it('T5: 圖書管理員中毒（能力不可靠）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk', isPoisoned: true });
    const butler = makePlayer({ seat: 2, role: 'butler', team: 'outsider' });
    const recluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider' });
    const players = [librarian, butler, recluse];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
      infoReliable: false,
      statusReason: '中毒',
    }));

    // 中毒時仍回傳實際外來者列表，但 reliable: false
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('butler');
    expect((result.info as any).reliable).toBe(false);
    expect((result.info as any).statusReason).toBe('中毒');
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('T6: 酒鬼（告知真實角色 drunk）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const drunk = makePlayer({ seat: 2, role: 'drunk', team: 'outsider', believesRole: 'butler' });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const players = [librarian, drunk, monk];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('drunk');
    // 注意：告知真實角色 'drunk'，不是 believesRole 'butler'
  });

  it('T7: 陌客（能力正常）- 獨立列表', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const players = [librarian, recluse, monk];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    expect((result.info as any).outsiders).toHaveLength(0); // 陌客不在主列表
    expect((result.info as any).recluses).toHaveLength(1); // 陌客在特殊列表
    expect((result.info as any).recluses[0].role).toBe('recluse');
    expect((result.info as any).hasRecluse).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('T8: 陌客 + 其他外來者 + 間諜', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const butler = makePlayer({ seat: 2, role: 'butler', team: 'outsider' });
    const recluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider' });
    const spy = makePlayer({ seat: 4, role: 'spy', team: 'minion' });
    const players = [librarian, butler, recluse, spy];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    // Butler + Spy 在主列表
    expect((result.info as any).outsiders).toHaveLength(2);
    const outsiderRoles = (result.info as any).outsiders.map((o: any) => o.role);
    expect(outsiderRoles).toContain('butler');
    expect(outsiderRoles).toContain('spy');
    // Recluse 在特殊列表
    expect((result.info as any).recluses).toHaveLength(1);
    expect((result.info as any).hasSpy).toBe(true);
    expect((result.info as any).hasRecluse).toBe(true);
  });

  it('T9: 陌客中毒（必須視為外來者）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const players = [librarian, recluse, monk];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    // 陌客中毒，必須在主列表
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('recluse');
    // 不在特殊列表
    expect((result.info as any).recluses).toHaveLength(0);
    expect((result.info as any).hasRecluse).toBe(false);
  });

  it('陌客醉酒（必須視為外來者）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isDrunk: true });
    const monk = makePlayer({ seat: 3, role: 'monk', team: 'townsfolk' });
    const players = [librarian, recluse, monk];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    // 陌客醉酒，必須在主列表
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('recluse');
    expect((result.info as any).recluses).toHaveLength(0);
  });

  it('間諜 + 陌客（都能力正常）', () => {
    const librarian = makePlayer({ seat: 1, role: 'librarian', team: 'townsfolk' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion' });
    const recluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider' });
    const players = [librarian, spy, recluse];
    const gs = makeGameState(players);

    const result = handler.process(makeContext({
      player: librarian,
      gameState: gs,
    }));

    expect(result.action).toBe('show_info');
    // Spy 在主列表（可視為外來者）
    expect((result.info as any).outsiders).toHaveLength(1);
    expect((result.info as any).outsiders[0].role).toBe('spy');
    // Recluse 在特殊列表（可選擇不視為外來者）
    expect((result.info as any).recluses).toHaveLength(1);
    expect((result.info as any).recluses[0].role).toBe('recluse');
    expect((result.info as any).hasSpy).toBe(true);
    expect((result.info as any).hasRecluse).toBe(true);
  });
});
