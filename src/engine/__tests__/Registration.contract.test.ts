/**
 * Registration Contract Tests
 *
 * 對應 docs/contracts/Registration.contract.md 的每一條 AC。
 */
import { describe, it, expect } from 'vitest';
import type { Player, RoleData } from '../types';
import {
  hasRegistrationAbility,
  isRegistrationAbilityActive,
  trueAlignment,
  resolveAlignment,
  registersAsEvil,
  mayRegisterAsTeam,
  getRegistrationOptions,
  describeAlignmentRegistration,
} from '../Registration';
import troubleBrewingRolesData from '../../data/roles/trouble-brewing.json';

const SCRIPT = troubleBrewingRolesData as RoleData[];

function makePlayer(overrides: Partial<Player> & { seat: number }): Player {
  return {
    name: `Player${overrides.seat}`,
    role: 'monk',
    team: 'townsfolk',
    isAlive: true,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    believesRole: null,
    masterSeat: null,
    abilityUsed: false,
    hasDeathVote: false,
    hasMadeSlayerClaim: false,
    deathCause: null,
    deathNight: null,
    deathDay: null,
    ...overrides,
  };
}

const recluse = (o: Partial<Player> = {}) =>
  makePlayer({ seat: 1, role: 'recluse', team: 'outsider', ...o });
const spy = (o: Partial<Player> = {}) =>
  makePlayer({ seat: 2, role: 'spy', team: 'minion', ...o });

// ============================================================
// 矩陣：(陌客/間諜) × (正常/中毒/醉酒) × (存活/死亡) = 12 組
// ============================================================

interface MatrixCase {
  label: string;
  player: Player;
  abilityActive: boolean;
  alignment: 'good' | 'evil';
  mayBeDemon: boolean;
}

const MATRIX: MatrixCase[] = [];
for (const isAlive of [true, false]) {
  const life = isAlive ? '存活' : '死亡';
  for (const [state, mod] of [
    ['正常', {}],
    ['中毒', { isPoisoned: true }],
    ['醉酒', { isDrunk: true }],
  ] as const) {
    const active = state === '正常';
    MATRIX.push({
      label: `陌客/${state}/${life}`,
      player: recluse({ isAlive, ...mod }),
      abilityActive: active,
      // 能力正常 → 被視為邪惡；失效 → 真實身分（善良外來者）
      alignment: active ? 'evil' : 'good',
      // 陌客可被視為惡魔（能力正常時）
      mayBeDemon: active,
    });
    MATRIX.push({
      label: `間諜/${state}/${life}`,
      player: spy({ isAlive, ...mod }),
      abilityActive: active,
      // 能力正常 → 被視為善良；失效 → 真實身分（邪惡爪牙）
      alignment: active ? 'good' : 'evil',
      // 間諜只能被視為鎮民/外來者，永不為惡魔
      mayBeDemon: false,
    });
  }
}

describe('Registration Contract', () => {
  it('矩陣共 12 組', () => {
    expect(MATRIX).toHaveLength(12);
  });

  describe('AC2：登記能力可被中毒/醉酒關閉', () => {
    for (const c of MATRIX) {
      it(`${c.label} → abilityActive: ${c.abilityActive}`, () => {
        expect(isRegistrationAbilityActive(c.player)).toBe(c.abilityActive);
      });
    }
  });

  describe('AC1 陣營軸：resolveAlignment', () => {
    for (const c of MATRIX) {
      it(`${c.label} → ${c.alignment}`, () => {
        expect(resolveAlignment(c.player)).toBe(c.alignment);
        expect(registersAsEvil(c.player)).toBe(c.alignment === 'evil');
      });
    }
  });

  describe('AC1 角色軸：mayRegisterAsTeam(demon)', () => {
    for (const c of MATRIX) {
      it(`${c.label} → ${c.mayBeDemon}`, () => {
        expect(mayRegisterAsTeam(c.player, 'demon')).toBe(c.mayBeDemon);
      });
    }
  });

  describe('AC3：死亡不影響登記', () => {
    it('陌客死亡後仍可被視為邪惡', () => {
      expect(registersAsEvil(recluse({ isAlive: false }))).toBe(true);
      expect(mayRegisterAsTeam(recluse({ isAlive: false }), 'demon')).toBe(true);
    });

    it('間諜死亡後仍可被視為善良', () => {
      expect(registersAsEvil(spy({ isAlive: false }))).toBe(false);
    });

    it('存活與死亡的登記結果完全相同', () => {
      for (const mod of [{}, { isPoisoned: true }, { isDrunk: true }]) {
        for (const make of [recluse, spy]) {
          expect(resolveAlignment(make({ ...mod, isAlive: true })))
            .toBe(resolveAlignment(make({ ...mod, isAlive: false })));
        }
      }
    });
  });

  describe('AC1：陣營與角色不可互相推導', () => {
    it('能力正常的陌客：陣營邪惡，但真實類型仍是外來者', () => {
      const p = recluse();
      expect(resolveAlignment(p)).toBe('evil');
      expect(trueAlignment(p)).toBe('good');
      expect(p.team).toBe('outsider');
    });

    it('能力正常的間諜：陣營善良，但真實類型仍是爪牙', () => {
      const p = spy();
      expect(resolveAlignment(p)).toBe('good');
      expect(trueAlignment(p)).toBe('evil');
      expect(p.team).toBe('minion');
    });
  });

  describe('間諜永不觸發占卜師', () => {
    for (const mod of [{}, { isPoisoned: true }, { isDrunk: true }]) {
      for (const isAlive of [true, false]) {
        it(`間諜 ${JSON.stringify(mod)} isAlive=${isAlive} 不可被視為惡魔`, () => {
          expect(mayRegisterAsTeam(spy({ ...mod, isAlive }), 'demon')).toBe(false);
        });
      }
    }
  });

  describe('一般角色不受影響', () => {
    it('小惡魔被視為邪惡且為惡魔', () => {
      const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon' });
      expect(hasRegistrationAbility(imp)).toBe(false);
      expect(registersAsEvil(imp)).toBe(true);
      expect(mayRegisterAsTeam(imp, 'demon')).toBe(true);
    });

    it('僧侶被視為善良且非惡魔', () => {
      const monk = makePlayer({ seat: 4, role: 'monk', team: 'townsfolk' });
      expect(registersAsEvil(monk)).toBe(false);
      expect(mayRegisterAsTeam(monk, 'demon')).toBe(false);
    });

    it('中毒的一般角色登記結果不變', () => {
      const imp = makePlayer({ seat: 3, role: 'imp', team: 'demon', isPoisoned: true });
      expect(registersAsEvil(imp)).toBe(true);
      expect(mayRegisterAsTeam(imp, 'demon')).toBe(true);
    });
  });

  describe('AC5：登記範圍不限在場、不限存活', () => {
    it('陌客可登記為劇本內全部爪牙與惡魔角色', () => {
      const opts = getRegistrationOptions(recluse(), SCRIPT);
      const expected = SCRIPT.filter(r => r.team === 'minion' || r.team === 'demon').map(r => r.id);

      expect(opts.requiresChoice).toBe(true);
      expect(opts.registrableTeams).toEqual(['minion', 'demon']);
      expect([...opts.registrableCharacters].sort()).toEqual([...expected].sort());
    });

    it('間諜可登記為劇本內全部鎮民與外來者角色', () => {
      const opts = getRegistrationOptions(spy(), SCRIPT);
      const expected = SCRIPT.filter(r => r.team === 'townsfolk' || r.team === 'outsider').map(r => r.id);

      expect(opts.registrableTeams).toEqual(['townsfolk', 'outsider']);
      expect([...opts.registrableCharacters].sort()).toEqual([...expected].sort());
    });

    it('死亡不縮減可登記範圍', () => {
      const alive = getRegistrationOptions(recluse({ isAlive: true }), SCRIPT);
      const dead = getRegistrationOptions(recluse({ isAlive: false }), SCRIPT);
      expect(dead.registrableCharacters).toEqual(alive.registrableCharacters);
    });

    it('能力失效時無可選範圍，且不需說書人決定', () => {
      const opts = getRegistrationOptions(recluse({ isPoisoned: true }), SCRIPT);
      expect(opts.abilityActive).toBe(false);
      expect(opts.requiresChoice).toBe(false);
      expect(opts.registrableCharacters).toEqual([]);
    });

    it('不在場角色優先排序，但在場角色不被排除', () => {
      const inPlay = ['poisoner', 'imp'];
      const opts = getRegistrationOptions(recluse(), SCRIPT, inPlay);

      // 在場者被排到後面
      const poisonerIdx = opts.registrableCharacters.indexOf('poisoner');
      const baronIdx = opts.registrableCharacters.indexOf('baron');
      expect(baronIdx).toBeLessThan(poisonerIdx);

      // 但仍在可選範圍內
      expect(opts.registrableCharacters).toContain('poisoner');
      expect(opts.registrableCharacters).toContain('imp');
    });
  });

  describe('AC6：說明文字由判斷結果推導', () => {
    it('無登記彈性的角色回傳 null', () => {
      expect(describeAlignmentRegistration(makePlayer({ seat: 5, role: 'monk' }))).toBeNull();
    });

    it('能力正常時不標註失效', () => {
      expect(describeAlignmentRegistration(recluse())).toBe('陌客 1號 被視為邪惡');
      expect(describeAlignmentRegistration(spy())).toBe('間諜 2號 不被視為邪惡');
    });

    it('能力失效時說明原因', () => {
      expect(describeAlignmentRegistration(recluse({ isPoisoned: true })))
        .toBe('陌客 1號 不被視為邪惡（能力失效）');
      expect(describeAlignmentRegistration(spy({ isDrunk: true })))
        .toBe('間諜 2號 被視為邪惡（能力失效）');
    });

    it('支援前綴', () => {
      expect(describeAlignmentRegistration(recluse(), { prefix: 'ℹ️ ' }))
        .toBe('ℹ️ 陌客 1號 被視為邪惡');
    });

    // 不變式：文字宣稱的結果必須與 registersAsEvil 一致
    it('不變式：文字與 registersAsEvil 恆一致', () => {
      for (const c of MATRIX) {
        const text = describeAlignmentRegistration(c.player)!;
        const saysEvil = text.includes('不被視為邪惡') === false;
        expect(saysEvil, `${c.label}: "${text}"`).toBe(registersAsEvil(c.player));
      }
    });
  });
});
