import { describe, it, expect } from 'vitest';
import roles from '../roles/trouble-brewing.json';
import jinxes from '../jinxes.json';
import type { RoleData, Jinx } from '../../engine/types';

const typedRoles = roles as RoleData[];
const typedJinxes = jinxes as Jinx[];

// RoleData 必備欄位（對應 types.ts RoleData interface）
const REQUIRED_FIELDS: (keyof RoleData)[] = [
  'id', 'name', 'name_cn',
  'team', 'ability', 'ability_cn',
  'firstNight', 'firstNightReminder', 'firstNightReminder_cn',
  'otherNight', 'otherNightReminder', 'otherNightReminder_cn',
  'reminders', 'setup',
  'affectedByPoison', 'affectedByDrunk', 'worksWhenDead',
];

const VALID_TEAMS = ['townsfolk', 'outsider', 'minion', 'demon'] as const;

// Trouble Brewing 陣營分配
const EXPECTED_TEAM_COUNTS = {
  townsfolk: 13,
  outsider: 4,
  minion: 4,
  demon: 1,
};

describe('Trouble Brewing 角色資料驗證', () => {
  it('應有 22 個角色', () => {
    expect(typedRoles).toHaveLength(22);
  });

  it('每個角色都有完整必備欄位', () => {
    for (const role of typedRoles) {
      for (const field of REQUIRED_FIELDS) {
        expect(role, `角色 "${role.id}" 缺少欄位 "${field}"`).toHaveProperty(field);
      }
    }
  });

  it('所有角色 id 唯一', () => {
    const ids = typedRoles.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('team 欄位只能是 townsfolk / outsider / minion / demon', () => {
    for (const role of typedRoles) {
      expect(VALID_TEAMS, `角色 "${role.id}" 的 team "${role.team}" 無效`)
        .toContain(role.team);
    }
  });

  it('各陣營人數正確 (13T / 4O / 4M / 1D)', () => {
    const counts: Record<string, number> = {};
    for (const role of typedRoles) {
      counts[role.team] = (counts[role.team] || 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_TEAM_COUNTS);
  });

  it('id 和 name 為非空字串', () => {
    for (const role of typedRoles) {
      expect(role.id.length, `角色 id 為空`).toBeGreaterThan(0);
      expect(role.name.length, `角色 "${role.id}" name 為空`).toBeGreaterThan(0);
    }
  });

  it('firstNight / otherNight 為非負整數', () => {
    for (const role of typedRoles) {
      expect(role.firstNight, `角色 "${role.id}" firstNight 無效`)
        .toBeGreaterThanOrEqual(0);
      expect(role.otherNight, `角色 "${role.id}" otherNight 無效`)
        .toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(role.firstNight), `角色 "${role.id}" firstNight 非整數`).toBe(true);
      expect(Number.isInteger(role.otherNight), `角色 "${role.id}" otherNight 非整數`).toBe(true);
    }
  });

  it('有夜間順序的角色必須有對應提示文字', () => {
    for (const role of typedRoles) {
      if (role.firstNight > 0) {
        expect(role.firstNightReminder.length,
          `角色 "${role.id}" 有 firstNight=${role.firstNight} 但缺少 firstNightReminder`
        ).toBeGreaterThan(0);
      }
      if (role.otherNight > 0) {
        expect(role.otherNightReminder.length,
          `角色 "${role.id}" 有 otherNight=${role.otherNight} 但缺少 otherNightReminder`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('reminders 為陣列', () => {
    for (const role of typedRoles) {
      expect(Array.isArray(role.reminders), `角色 "${role.id}" reminders 非陣列`).toBe(true);
    }
  });

  it('布林欄位型別正確', () => {
    for (const role of typedRoles) {
      expect(typeof role.setup).toBe('boolean');
      expect(typeof role.affectedByPoison).toBe('boolean');
      expect(typeof role.affectedByDrunk).toBe('boolean');
      expect(typeof role.worksWhenDead).toBe('boolean');
    }
  });
});

describe('Jinxes 資料驗證', () => {
  it('jinxes 為陣列', () => {
    expect(Array.isArray(typedJinxes)).toBe(true);
  });

  it('每條 jinx 都有 id / role1 / role2 / reason', () => {
    for (const jinx of typedJinxes) {
      expect(jinx).toHaveProperty('id');
      expect(jinx).toHaveProperty('role1');
      expect(jinx).toHaveProperty('role2');
      expect(jinx).toHaveProperty('reason');
      expect(jinx.id.length).toBeGreaterThan(0);
      expect(jinx.role1.length).toBeGreaterThan(0);
      expect(jinx.role2.length).toBeGreaterThan(0);
      expect(jinx.reason.length).toBeGreaterThan(0);
    }
  });

  it('jinx 的 role1 / role2 都存在於角色資料中', () => {
    const roleIds = new Set(typedRoles.map(r => r.id));
    for (const jinx of typedJinxes) {
      expect(roleIds.has(jinx.role1),
        `jinx "${jinx.id}" 的 role1 "${jinx.role1}" 不存在於角色資料中`
      ).toBe(true);
      expect(roleIds.has(jinx.role2),
        `jinx "${jinx.id}" 的 role2 "${jinx.role2}" 不存在於角色資料中`
      ).toBe(true);
    }
  });

  it('jinx id 唯一', () => {
    const ids = typedJinxes.map(j => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
