/**
 * 跨 Handler 註冊一致性測試
 *
 * 把同一個陌客/間諜餵進所有相關 handler，斷言各處的登記判斷一致。
 * 若某個 handler 忘了接上 Registration，這張表會直接暴露。
 *
 * 同時鎖定 PR 3 的兩項行為修正：
 *   1. 不得以 isAlive 過濾登記（AC3：即使你已死亡亦然）
 *   2. 登記範圍為劇本內全部該類型角色，不限在場、不限存活（AC5）
 *
 * @see docs/contracts/Registration.contract.md
 */
import { describe, it, expect } from 'vitest';
import type { HandlerContext, Player, GameState, RoleData } from '../types';
import { ChefHandler } from '../handlers/ChefHandler';
import { EmpathHandler } from '../handlers/EmpathHandler';
import { FortunetellerHandler } from '../handlers/FortunetellerHandler';
import { InvestigatorHandler } from '../handlers/InvestigatorHandler';
import { LibrarianHandler } from '../handlers/LibrarianHandler';
import { WasherwomanHandler } from '../handlers/WasherwomanHandler';
import { UndertakerHandler } from '../handlers/UndertakerHandler';
import { RavenkeeperHandler } from '../handlers/RavenkeeperHandler';
import { RoleRegistry } from '../RoleRegistry';
import troubleBrewingRolesData from '../../data/roles/trouble-brewing.json';

const roleRegistry = RoleRegistry.getInstance();
roleRegistry.init(troubleBrewingRolesData as RoleData[]);
const SCRIPT = troubleBrewingRolesData as RoleData[];

const STUB_ROLE_DATA: RoleData = {
  id: 'stub', name: 'Stub', name_cn: '測試', team: 'townsfolk',
  ability: '', ability_cn: '', firstNight: 0, firstNightReminder: '',
  firstNightReminder_cn: '', otherNight: 0, otherNightReminder: '',
  otherNightReminder_cn: '', reminders: [], setup: false,
  affectedByPoison: true, affectedByDrunk: true, worksWhenDead: true,
};

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
    roleData: STUB_ROLE_DATA, player: makePlayer({ seat: 1 }), target: null,
    gameState: makeGameState([]), infoReliable: true, statusReason: '', ...o,
  } as HandlerContext;
}

const EVIL_CHARACTERS = SCRIPT
  .filter(r => r.team === 'minion' || r.team === 'demon').map(r => r.id);
const GOOD_CHARACTERS = SCRIPT
  .filter(r => r.team === 'townsfolk' || r.team === 'outsider').map(r => r.id);

// ============================================================
// 陣營軸一致性：Chef 與 Empath 必須對同一玩家給出相同判定
// ============================================================

describe('跨 Handler：陣營軸一致性（Chef / Empath）', () => {
  const cases = [
    { label: '陌客正常', mod: {}, role: 'recluse', team: 'outsider' as const, evil: true },
    { label: '陌客中毒', mod: { isPoisoned: true }, role: 'recluse', team: 'outsider' as const, evil: false },
    { label: '陌客醉酒', mod: { isDrunk: true }, role: 'recluse', team: 'outsider' as const, evil: false },
    { label: '間諜正常', mod: {}, role: 'spy', team: 'minion' as const, evil: false },
    { label: '間諜中毒', mod: { isPoisoned: true }, role: 'spy', team: 'minion' as const, evil: true },
    { label: '間諜醉酒', mod: { isDrunk: true }, role: 'spy', team: 'minion' as const, evil: true },
  ];

  for (const c of cases) {
    it(`${c.label} → Chef 與 Empath 皆判定 ${c.evil ? '邪惡' : '善良'}`, () => {
      const special = makePlayer({ seat: 1, role: c.role, team: c.team, ...c.mod });

      // Chef：座位 1 是否計入 evilSeats
      const chefPlayers = [special, makePlayer({ seat: 2, role: 'chef' }), makePlayer({ seat: 3, role: 'monk' })];
      const chefResult = new ChefHandler(roleRegistry)
        .process(makeContext({ player: chefPlayers[1], gameState: makeGameState(chefPlayers) }));
      const chefSaysEvil = (chefResult.info as any).evilSeats.includes(1);

      // Empath：座位 1 是否被算為邪惡鄰居
      const empathPlayers = [special, makePlayer({ seat: 2, role: 'empath' }), makePlayer({ seat: 3, role: 'monk' })];
      const empathResult = new EmpathHandler(roleRegistry)
        .process(makeContext({ player: empathPlayers[1], gameState: makeGameState(empathPlayers) }));
      const empathSaysEvil = (empathResult.info as any).leftNeighbor.isEvil;

      expect(chefSaysEvil).toBe(c.evil);
      expect(empathSaysEvil).toBe(c.evil);
      expect(chefSaysEvil).toBe(empathSaysEvil);
    });
  }
});

// ============================================================
// 角色軸：間諜永不觸發占卜師
// ============================================================

describe('跨 Handler：間諜永不被視為惡魔（占卜師）', () => {
  for (const [label, mod] of [
    ['正常', {}], ['中毒', { isPoisoned: true }], ['醉酒', { isDrunk: true }],
  ] as const) {
    it(`間諜${label} → 占卜師不觸發偵測`, () => {
      const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion', ...mod });
      const monk = makePlayer({ seat: 3, role: 'monk' });
      const ft = makePlayer({ seat: 1, role: 'fortuneteller' });
      const result = new FortunetellerHandler(roleRegistry).process(makeContext({
        player: ft, target: spy, secondTarget: monk,
        gameState: makeGameState([ft, spy, monk]),
      }));
      expect((result.info as any).rawDetection).toBe(false);
    });
  }

  it('陌客正常 → 占卜師觸發偵測', () => {
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const ft = makePlayer({ seat: 1, role: 'fortuneteller' });
    const result = new FortunetellerHandler(roleRegistry).process(makeContext({
      player: ft, target: recluse, secondTarget: monk,
      gameState: makeGameState([ft, recluse, monk]),
    }));
    expect((result.info as any).rawDetection).toBe(true);
  });

  it('陌客中毒 → 占卜師不觸發偵測', () => {
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const ft = makePlayer({ seat: 1, role: 'fortuneteller' });
    const result = new FortunetellerHandler(roleRegistry).process(makeContext({
      player: ft, target: recluse, secondTarget: monk,
      gameState: makeGameState([ft, recluse, monk]),
    }));
    expect((result.info as any).rawDetection).toBe(false);
  });
});

// ============================================================
// AC3：死亡不影響登記（PR 3 行為修正）
// ============================================================

describe('AC3：死亡不縮減登記（行為修正）', () => {
  it('調查員：死亡的陌客仍列入可視為爪牙的清單', () => {
    const investigator = makePlayer({ seat: 1, role: 'investigator' });
    const poisoner = makePlayer({ seat: 2, role: 'poisoner', team: 'minion' });
    const deadRecluse = makePlayer({ seat: 3, role: 'recluse', team: 'outsider', isAlive: false });
    const players = [investigator, poisoner, deadRecluse];

    const result = new InvestigatorHandler(roleRegistry)
      .process(makeContext({ player: investigator, gameState: makeGameState(players) }));

    expect((result.info as any).hasRecluse).toBe(true);
    expect((result.info as any).recluses.map((r: any) => r.seat)).toContain(3);
  });

  it('送葬者：處決的陌客可選角色不因存活狀態縮減', () => {
    const undertaker = makePlayer({ seat: 1, role: 'undertaker' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isAlive: false });
    const deadPoisoner = makePlayer({ seat: 3, role: 'poisoner', team: 'minion', isAlive: false });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [undertaker, recluse, deadPoisoner, imp];

    const result = new UndertakerHandler(roleRegistry).process(makeContext({
      player: undertaker,
      gameState: makeGameState(players, { night: 2, executedToday: 2 }),
    }));

    expect((result.info as any).isRecluse).toBe(true);
    // 死亡的投毒者先前會被 isAlive 過濾掉
    expect((result.info as any).selectableRoles).toContain('poisoner');
  });
});

// ============================================================
// AC5：登記範圍為劇本內全部該類型角色（PR 3 行為修正）
// ============================================================

describe('AC5：登記範圍不限在場（行為修正）', () => {
  it('送葬者：陌客可選劇本內全部邪惡角色，即使不在場', () => {
    const undertaker = makePlayer({ seat: 1, role: 'undertaker' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [undertaker, recluse, imp];

    const result = new UndertakerHandler(roleRegistry).process(makeContext({
      player: undertaker,
      gameState: makeGameState(players, { night: 2, executedToday: 2 }),
    }));

    const selectable: string[] = (result.info as any).selectableRoles;
    expect([...selectable].sort()).toEqual([...EVIL_CHARACTERS].sort());
    // 不在場的爪牙也可選
    expect(selectable).toContain('baron');
    expect(selectable).toContain('scarletwoman');
  });

  it('守鴉人：間諜可選劇本內全部善良角色，即使不在場', () => {
    const rk = makePlayer({ seat: 1, role: 'ravenkeeper', isAlive: false, deathNight: 2 });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [rk, spy, imp];

    const result = new RavenkeeperHandler(roleRegistry).process(makeContext({
      player: rk, target: spy,
      gameState: makeGameState(players, { night: 2 }),
    }));

    const selectable: string[] = (result.info as any).selectableRoles;
    expect((result.info as any).isSpy).toBe(true);
    expect([...selectable].sort()).toEqual([...GOOD_CHARACTERS].sort());
    expect(selectable).toContain('virgin');
  });

  it('不在場角色排序在前（避免與真人宣稱撞角色）', () => {
    const undertaker = makePlayer({ seat: 1, role: 'undertaker' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const poisoner = makePlayer({ seat: 3, role: 'poisoner', team: 'minion' });
    const imp = makePlayer({ seat: 4, role: 'imp', team: 'demon' });
    const players = [undertaker, recluse, poisoner, imp];

    const result = new UndertakerHandler(roleRegistry).process(makeContext({
      player: undertaker,
      gameState: makeGameState(players, { night: 2, executedToday: 2 }),
    }));

    const selectable: string[] = (result.info as any).selectableRoles;
    expect(selectable.indexOf('baron')).toBeLessThan(selectable.indexOf('poisoner'));
  });

  it('能力失效的陌客不需選擇角色', () => {
    const undertaker = makePlayer({ seat: 1, role: 'undertaker' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const players = [undertaker, recluse, imp];

    const result = new UndertakerHandler(roleRegistry).process(makeContext({
      player: undertaker,
      gameState: makeGameState(players, { night: 2, executedToday: 2 }),
    }));

    expect((result.info as any).isRecluse).toBe(false);
    expect((result.info as any).selectableRoles).toEqual([]);
  });
});

// ============================================================
// 角色類型軸：洗衣婦 / 圖書管理員
// ============================================================

describe('跨 Handler：角色類型軸（洗衣婦 / 圖書管理員）', () => {
  it('洗衣婦：能力正常的間諜可被視為鎮民', () => {
    const ww = makePlayer({ seat: 1, role: 'washerwoman' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion' });
    const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
    const result = new WasherwomanHandler(roleRegistry)
      .process(makeContext({ player: ww, gameState: makeGameState([ww, spy, imp]) }));

    expect((result.info as any).hasSpy).toBe(true);
  });

  it('洗衣婦：中毒間諜不可被視為鎮民', () => {
    const ww = makePlayer({ seat: 1, role: 'washerwoman' });
    const spy = makePlayer({ seat: 2, role: 'spy', team: 'minion', isPoisoned: true });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const result = new WasherwomanHandler(roleRegistry)
      .process(makeContext({ player: ww, gameState: makeGameState([ww, spy, monk]) }));

    const townsfolk: any[] = (result.info as any).townsfolk;
    expect(townsfolk.map(t => t.seat)).not.toContain(2);
  });

  it('洗衣婦：陌客不可被視為鎮民（只能被視為爪牙/惡魔）', () => {
    const ww = makePlayer({ seat: 1, role: 'washerwoman' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const result = new WasherwomanHandler(roleRegistry)
      .process(makeContext({ player: ww, gameState: makeGameState([ww, recluse, monk]) }));

    const townsfolk: any[] = (result.info as any).townsfolk;
    expect(townsfolk.map(t => t.seat)).not.toContain(2);
  });

  it('圖書管理員：中毒的陌客必為外來者（無選擇餘地）', () => {
    const lib = makePlayer({ seat: 1, role: 'librarian' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider', isPoisoned: true });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const result = new LibrarianHandler(roleRegistry)
      .process(makeContext({ player: lib, gameState: makeGameState([lib, recluse, monk]) }));

    expect((result.info as any).hasRecluse).toBe(false);
    const outsiders: any[] = (result.info as any).outsiders;
    expect(outsiders.map(o => o.seat)).toContain(2);
  });

  it('圖書管理員：能力正常的陌客另列，由說書人決定是否呈現為外來者', () => {
    const lib = makePlayer({ seat: 1, role: 'librarian' });
    const recluse = makePlayer({ seat: 2, role: 'recluse', team: 'outsider' });
    const monk = makePlayer({ seat: 3, role: 'monk' });
    const result = new LibrarianHandler(roleRegistry)
      .process(makeContext({ player: lib, gameState: makeGameState([lib, recluse, monk]) }));

    expect((result.info as any).hasRecluse).toBe(true);
    const outsiders: any[] = (result.info as any).outsiders ?? [];
    expect(outsiders.map(o => o.seat)).not.toContain(2);
  });
});
