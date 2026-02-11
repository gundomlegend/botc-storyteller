/**
 * Handler 單元測試
 *
 * 每個 handler 直接傳入 HandlerContext 測試，不經 RuleEngine。
 * 對應 TASKS.md：「每個 handler 至少 1-2 個核心情境」
 */
import { describe, it, expect } from 'vitest';
import type { HandlerContext, Player, GameState, RoleData } from '../../types';
import { FortunetellerHandler } from '../FortunetellerHandler';
import { MonkHandler } from '../MonkHandler';
import { PoisonerHandler } from '../PoisonerHandler';
import { ImpHandler } from '../ImpHandler';
import { DrunkHandler } from '../DrunkHandler';
import { ButlerHandler } from '../ButlerHandler';

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

function makeGameState(players: Player[]): GameState {
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

  it('無目標時要求輸入', () => {
    const result = handler.process(makeContext({ target: null }));
    expect(result.needInput).toBe(true);
    expect(result.inputType).toBe('select_player');
  });

  it('查驗邪惡目標 → info=evil, gesture=shake', () => {
    const target = makePlayer({ seat: 2, role: 'imp', team: 'demon' });
    const result = handler.process(makeContext({ target, infoReliable: true }));

    expect(result.action).toBe('tell_alignment');
    expect(result.info).toBe('evil');
    expect(result.gesture).toBe('shake');
    expect(result.mustFollow).toBe(false);
    expect(result.canLie).toBe(true);
  });

  it('查驗善良目標 → info=good, gesture=nod', () => {
    const target = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const result = handler.process(makeContext({ target, infoReliable: true }));

    expect(result.action).toBe('tell_alignment');
    expect(result.info).toBe('good');
    expect(result.gesture).toBe('nod');
  });

  it('中毒時資訊反轉 → 邪惡目標顯示 good, mustFollow=true', () => {
    const target = makePlayer({ seat: 2, role: 'imp', team: 'demon' });
    const result = handler.process(makeContext({
      target,
      infoReliable: false,
      statusReason: '中毒',
    }));

    expect(result.info).toBe('good'); // 反轉
    expect(result.gesture).toBe('nod'); // 反轉
    expect(result.mustFollow).toBe(true);
    expect(result.canLie).toBe(false);
  });

  it('中毒時善良目標顯示 evil', () => {
    const target = makePlayer({ seat: 2, role: 'monk', team: 'townsfolk' });
    const result = handler.process(makeContext({
      target,
      infoReliable: false,
      statusReason: '中毒',
    }));

    expect(result.info).toBe('evil'); // 反轉
    expect(result.gesture).toBe('shake');
    expect(result.mustFollow).toBe(true);
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
