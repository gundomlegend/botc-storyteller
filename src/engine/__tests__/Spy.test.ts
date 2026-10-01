/**
 * 間諜 Handler 與魔典快照測試
 *
 * @see docs/PLAN_Registration_and_Spy.md
 */
import { describe, it, expect } from 'vitest';
import type { HandlerContext, Player, GameState, RoleData } from '../types';
import { SpyHandler } from '../handlers/SpyHandler';
import { buildGrimoireSnapshot } from '../Grimoire';
import type { GrimoireSnapshot } from '../Grimoire';
import { RoleRegistry } from '../RoleRegistry';
import { RuleEngine } from '../RuleEngine';
import { GameStateManager } from '../GameState';
import troubleBrewingRolesData from '../../data/roles/trouble-brewing.json';

const roleRegistry = RoleRegistry.getInstance();
roleRegistry.init(troubleBrewingRolesData as RoleData[]);

const SPY_ROLE_DATA = (troubleBrewingRolesData as RoleData[]).find(r => r.id === 'spy')!;

function makePlayer(o: Partial<Player> & { seat: number }): Player {
  return {
    name: `P${o.seat}`, role: 'monk', team: 'townsfolk', isAlive: true,
    isPoisoned: false, isDrunk: false, isProtected: false, believesRole: null,
    masterSeat: null, abilityUsed: false, hasDeathVote: false,
    hasMadeSlayerClaim: false, deathCause: null, deathNight: null, deathDay: null,
    ...o,
  };
}

function makeGameState(players: Player[], overrides: Partial<GameState> = {}): GameState {
  const map = new Map<number, Player>();
  for (const p of players) map.set(p.seat, p);
  return {
    night: 1, day: 0, phase: 'night', players: map, playerCount: players.length,
    history: [], setupComplete: true, selectedRoles: players.map(p => p.role),
    demonBluffs: [], redHerringSeat: null, executedToday: null,
    gameOver: false, winner: null, gameOverReason: null,
    ...overrides,
  } as GameState;
}

function makeContext(o: Partial<HandlerContext>): HandlerContext {
  return {
    roleData: SPY_ROLE_DATA, player: makePlayer({ seat: 1 }), target: null,
    gameState: makeGameState([]), infoReliable: true, statusReason: '', ...o,
  } as HandlerContext;
}

const grimoireOf = (result: any): GrimoireSnapshot => result.info.grimoire;

describe('SpyHandler', () => {
  const handler = new SpyHandler(roleRegistry);

  it('取得完整魔典快照', () => {
    const spy = makePlayer({ seat: 1, role: 'spy', team: 'minion' });
    const monk = makePlayer({ seat: 2, role: 'monk' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [spy, monk, imp];

    const result = handler.process(makeContext({ player: spy, gameState: makeGameState(players) }));
    const g = grimoireOf(result);

    expect(g.entries).toHaveLength(3);
    expect(g.entries.map(e => e.role)).toEqual(['spy', 'monk', 'imp']);
    expect(g.entries.map(e => e.alignment)).toEqual(['evil', 'good', 'evil']);
  });

  it('死亡的間諜仍取得魔典（worksWhenDead）', () => {
    const spy = makePlayer({ seat: 1, role: 'spy', team: 'minion', isAlive: false });
    const monk = makePlayer({ seat: 2, role: 'monk' });

    const result = handler.process(makeContext({
      player: spy, gameState: makeGameState([spy, monk]),
    }));

    expect(result.skip).toBeUndefined();
    expect(grimoireOf(result).entries).toHaveLength(2);
    expect(result.display).toContain('死亡後仍可查看魔典');
  });

  it('中毒間諜：資訊不可靠且說書人可給假魔典', () => {
    const spy = makePlayer({ seat: 1, role: 'spy', team: 'minion', isPoisoned: true });
    const monk = makePlayer({ seat: 2, role: 'monk' });

    const result = handler.process(makeContext({
      player: spy, gameState: makeGameState([spy, monk]),
      infoReliable: false, statusReason: '中毒',
    }));

    expect((result.info as any).reliable).toBe(false);
    expect(result.canLie).toBe(true);
    expect(result.mustFollow).toBe(false);
    expect(result.display).toContain('魔典內容可以是錯誤的');
  });

  it('能力正常時說書人應如實展示', () => {
    const spy = makePlayer({ seat: 1, role: 'spy', team: 'minion' });
    const result = handler.process(makeContext({
      player: spy, gameState: makeGameState([spy]),
    }));

    expect(result.mustFollow).toBe(true);
    expect(result.canLie).toBe(false);
  });

  it('角色資料：間諜受中毒/醉酒影響（規則：查看魔典也屬於獲取訊息）', () => {
    expect(SPY_ROLE_DATA.affectedByPoison).toBe(true);
    expect(SPY_ROLE_DATA.affectedByDrunk).toBe(true);
    expect(SPY_ROLE_DATA.worksWhenDead).toBe(true);
  });
});

describe('魔典快照', () => {
  it('酒鬼顯示真實角色 drunk，而非 believesRole', () => {
    const drunk = makePlayer({ seat: 1, role: 'drunk', team: 'outsider', believesRole: 'monk' });
    const g = buildGrimoireSnapshot(makeGameState([drunk]), roleRegistry);

    const entry = g.entries[0];
    expect(entry.role).toBe('drunk');
    expect(entry.roleName).not.toContain('僧侶');
    // 但仍需讓間諜知道酒鬼以為自己是誰
    expect(entry.believesRole).toBe('monk');
    expect(entry.reminders).toContain('is_the_drunk');
  });

  it('提示標記：中毒/保護/主人/干擾項/死亡', () => {
    const poisoned = makePlayer({ seat: 1, isPoisoned: true });
    const protectedPlayer = makePlayer({ seat: 2, isProtected: true });
    const butler = makePlayer({ seat: 3, role: 'butler', team: 'outsider', masterSeat: 1 });
    const herring = makePlayer({ seat: 4 });
    const dead = makePlayer({ seat: 5, isAlive: false });
    const state = makeGameState([poisoned, protectedPlayer, butler, herring, dead], {
      redHerringSeat: 4,
    });

    const g = buildGrimoireSnapshot(state, roleRegistry);

    expect(g.entries[0].reminders).toContain('poisoned');
    expect(g.entries[1].reminders).toContain('protected');
    expect(g.entries[2].reminders).toContain('master');
    expect(g.entries[2].masterSeat).toBe(1);
    expect(g.entries[3].reminders).toContain('red_herring');
    expect(g.entries[4].reminders).toContain('dead');
  });

  it('醉酒狀態與酒鬼角色是不同的標記', () => {
    const drunkStatus = makePlayer({ seat: 1, role: 'monk', isDrunk: true });
    const drunkRole = makePlayer({ seat: 2, role: 'drunk', team: 'outsider', believesRole: 'chef' });
    const g = buildGrimoireSnapshot(makeGameState([drunkStatus, drunkRole]), roleRegistry);

    expect(g.entries[0].reminders).toContain('drunk');
    expect(g.entries[0].reminders).not.toContain('is_the_drunk');
    expect(g.entries[1].reminders).toContain('is_the_drunk');
    expect(g.entries[1].reminders).not.toContain('drunk');
  });

  it('依座位排序', () => {
    const players = [makePlayer({ seat: 3 }), makePlayer({ seat: 1 }), makePlayer({ seat: 2 })];
    const g = buildGrimoireSnapshot(makeGameState(players), roleRegistry);
    expect(g.entries.map(e => e.seat)).toEqual([1, 2, 3]);
  });

  it('包含惡魔偽裝（由 UI 決定是否向間諜展示）', () => {
    const state = makeGameState([makePlayer({ seat: 1 })], {
      demonBluffs: ['washerwoman', 'librarian', 'chef'],
    });
    const g = buildGrimoireSnapshot(state, roleRegistry);
    expect(g.demonBluffs).toEqual(['washerwoman', 'librarian', 'chef']);
  });

  it('快照為複本，修改不影響原始狀態', () => {
    const state = makeGameState([makePlayer({ seat: 1 })], { demonBluffs: ['chef'] });
    const g = buildGrimoireSnapshot(state, roleRegistry);
    g.demonBluffs.push('monk');
    expect(state.demonBluffs).toEqual(['chef']);
  });

  // ----------------------------------------------------------
  // 可見性邊界：白名單建構
  //
  // 這條斷言的用意是：日後在 Player 新增任何說書人私有欄位時，
  // 若不慎被帶進魔典，這裡會立刻失敗。
  // ----------------------------------------------------------
  it('魔典欄位為明確白名單，不得夾帶未預期資料', () => {
    const player = makePlayer({
      seat: 1, role: 'imp', team: 'demon',
      // 以下皆為說書人私有、不屬於魔典的欄位
      abilityUsed: true,
      hasDeathVote: true,
      hasMadeSlayerClaim: true,
      deathCause: 'execution',
      deathNight: 2,
      deathDay: 3,
    });
    const g = buildGrimoireSnapshot(makeGameState([player]), roleRegistry);

    expect(Object.keys(g.entries[0]).sort()).toEqual([
      'alignment', 'believesRole', 'isAlive', 'masterSeat',
      'name', 'reminders', 'role', 'roleName', 'seat', 'team',
    ]);
    expect(Object.keys(g).sort()).toEqual(['demonBluffs', 'entries']);
  });
});

// ============================================================
// 整合：確認 handler 真的被 RuleEngine 掛上、且進入夜晚順序
// ============================================================

describe('間諜整合（RuleEngine）', () => {
  function setup() {
    const r = RoleRegistry.getInstance();
    r.init(troubleBrewingRolesData as RoleData[]);
    const m = new GameStateManager(r);
    const engine = new RuleEngine(r);
    return { r, m, engine };
  }

  it('間諜出現在第一夜順序中', () => {
    const { m } = setup();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'spy' },
      { seat: 2, name: 'B', role: 'imp' },
      { seat: 3, name: 'C', role: 'monk' },
    ]);

    const order = m.generateNightOrder(true);
    expect(order.some(i => i.role === 'spy')).toBe(true);
  });

  it('RuleEngine 分派至 SpyHandler 並回傳魔典', () => {
    const { m, engine } = setup();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'spy' },
      { seat: 2, name: 'B', role: 'imp' },
      { seat: 3, name: 'C', role: 'monk' },
    ]);
    m.startNight();

    const spy = m.getPlayer(1)!;
    const result = engine.processNightAbility(spy, null, m.getState(), m);

    expect(result.skip).toBeUndefined();
    expect((result.info as any).grimoire.entries).toHaveLength(3);
  });

  it('死亡的間諜不被 RuleEngine 跳過', () => {
    const { m, engine } = setup();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'spy' },
      { seat: 2, name: 'B', role: 'imp' },
      { seat: 3, name: 'C', role: 'monk' },
    ]);
    m.startNight();
    m.killPlayer(1, 'execution');

    const spy = m.getPlayer(1)!;
    const result = engine.processNightAbility(spy, null, m.getState(), m);

    expect(result.skip).toBeUndefined();
    expect((result.info as any).grimoire.entries).toHaveLength(3);
  });

  it('中毒的間諜由 RuleEngine 標記為資訊不可靠', () => {
    const { m, engine } = setup();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'spy' },
      { seat: 2, name: 'B', role: 'poisoner' },
      { seat: 3, name: 'C', role: 'imp' },
    ]);
    m.startNight();
    m.addStatus(1, 'poisoned', 2);

    const spy = m.getPlayer(1)!;
    const result = engine.processNightAbility(spy, null, m.getState(), m);

    // affectedByPoison 已改為 true，故中毒會使資訊不可靠
    expect((result.info as any).reliable).toBe(false);
    expect(result.canLie).toBe(true);
  });
});
