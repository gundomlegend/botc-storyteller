/**
 * RoleRegistry Setup Ability System Tests
 *
 * Tests for Baron and the phased initialization system.
 * See docs/specs/Baron.spec.md for full specification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleRegistry } from '../RoleRegistry';
import type { RoleData } from '../types';
import rolesData from '../../data/roles/trouble-brewing.json';

describe('RoleRegistry - Setup Ability System', () => {
  let registry: RoleRegistry;

  beforeEach(() => {
    // Get a fresh instance for each test
    registry = RoleRegistry.getInstance();
    registry.init(rolesData as RoleData[]);
  });

  describe('filterRolesByPlayerCount', () => {
    it('should filter out Baron in 9-player game', () => {
      const minions = ['poisoner', 'spy', 'baron', 'scarlet_woman'];
      const filtered = registry.filterRolesByPlayerCount(minions, 9);

      expect(filtered).toContain('poisoner');
      expect(filtered).toContain('spy');
      expect(filtered).toContain('scarlet_woman');
      expect(filtered).not.toContain('baron'); // Baron requires 10+ players
    });

    it('should include Baron in 10-player game', () => {
      const minions = ['poisoner', 'spy', 'baron', 'scarlet_woman'];
      const filtered = registry.filterRolesByPlayerCount(minions, 10);

      expect(filtered).toContain('baron'); // Baron allowed in 10+ player games
    });

    it('should include Baron in 15-player game', () => {
      const minions = ['poisoner', 'spy', 'baron', 'scarlet_woman'];
      const filtered = registry.filterRolesByPlayerCount(minions, 15);

      expect(filtered).toContain('baron');
    });

    it('should handle empty role pool', () => {
      const filtered = registry.filterRolesByPlayerCount([], 10);
      expect(filtered).toEqual([]);
    });

    it('should handle roles without minPlayers restriction', () => {
      const roles = ['washerwoman', 'librarian', 'investigator'];
      const filtered = registry.filterRolesByPlayerCount(roles, 5);

      expect(filtered).toEqual(roles); // All should pass (no minPlayers set)
    });
  });

  describe('getBaseDistribution', () => {
    it('should return correct distribution for 10 players', () => {
      const dist = registry.getBaseDistribution(10);

      expect(dist).toEqual({
        townsfolk: 7,
        outsiders: 0,
        minions: 2,
        demons: 1,
      });
    });

    it('should return correct distribution for 7 players', () => {
      const dist = registry.getBaseDistribution(7);

      expect(dist).toEqual({
        townsfolk: 5,
        outsiders: 0,
        minions: 1,
        demons: 1,
      });
    });

    it('should throw error for unsupported player count', () => {
      expect(() => registry.getBaseDistribution(3)).toThrow('不支援的玩家數量：3');
      expect(() => registry.getBaseDistribution(20)).toThrow('不支援的玩家數量：20');
    });
  });

  describe('categorizeRoles', () => {
    it('should categorize roles by team', () => {
      const roleIds = ['washerwoman', 'butler', 'spy', 'imp'];
      const categorized = registry.categorizeRoles(roleIds);

      expect(categorized.townsfolk).toContain('washerwoman');
      expect(categorized.outsiders).toContain('butler');
      expect(categorized.minions).toContain('spy');
      expect(categorized.demons).toContain('imp');
    });

    it('should handle empty role list', () => {
      const categorized = registry.categorizeRoles([]);

      expect(categorized).toEqual({
        townsfolk: [],
        outsiders: [],
        minions: [],
        demons: [],
      });
    });

    it('should warn about unknown roles', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const roleIds = ['washerwoman', 'unknown_role'];
      const categorized = registry.categorizeRoles(roleIds);

      expect(consoleSpy).toHaveBeenCalledWith('[RoleRegistry] 未知角色: unknown_role');
      expect(categorized.townsfolk).toContain('washerwoman');

      consoleSpy.mockRestore();
    });
  });

  describe('randomPick', () => {
    it('should select correct number of roles', () => {
      const pool = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath'];
      const selected = registry.randomPick(pool, 3, false);

      expect(selected).toHaveLength(3);
      expect(pool).toContain(selected[0]);
      expect(pool).toContain(selected[1]);
      expect(pool).toContain(selected[2]);
    });

    it('should not allow duplicates when allowDuplicates=false', () => {
      const pool = ['washerwoman', 'librarian', 'investigator'];
      const selected = registry.randomPick(pool, 3, false);

      expect(selected).toHaveLength(3);
      expect(new Set(selected).size).toBe(3); // All unique
    });

    it('should handle empty pool', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const selected = registry.randomPick([], 3, false);

      expect(selected).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[RoleRegistry] 角色池為空');

      consoleSpy.mockRestore();
    });

    it('should warn when pool is exhausted', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const pool = ['washerwoman', 'librarian'];
      const selected = registry.randomPick(pool, 5, false);

      expect(selected).toHaveLength(2); // Only 2 roles available
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('角色池耗盡')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hasSetupAbility', () => {
    it('should return true for Baron', () => {
      expect(registry.hasSetupAbility('baron')).toBe(true);
    });

    it('should return false for Washerwoman', () => {
      expect(registry.hasSetupAbility('washerwoman')).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(registry.hasSetupAbility('unknown_role')).toBe(false);
    });
  });

  describe('getSetupRoles', () => {
    it('should filter roles with Setup Ability', () => {
      const roleIds = ['washerwoman', 'baron', 'spy', 'imp'];
      const setupRoles = registry.getSetupRoles(roleIds);

      expect(setupRoles).toEqual(['baron']);
    });

    it('should return empty array when no Setup Ability roles', () => {
      const roleIds = ['washerwoman', 'spy', 'imp'];
      const setupRoles = registry.getSetupRoles(roleIds);

      expect(setupRoles).toEqual([]);
    });
  });

  describe('applySetupAbilities', () => {
    it('should apply Baron effect in 10-player game', () => {
      const baseDistribution = {
        townsfolk: 7,
        outsiders: 0,
        minions: 2,
        demons: 1,
      };

      const selectedRoles = ['baron', 'spy'];
      const finalDistribution = registry.applySetupAbilities(
        selectedRoles,
        baseDistribution,
        10
      );

      expect(finalDistribution).toEqual({
        townsfolk: 5, // -2
        outsiders: 2, // +2
        minions: 2,
        demons: 1,
      });
    });

    it('should NOT apply Baron effect in 9-player game (insufficient)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const baseDistribution = {
        townsfolk: 5,
        outsiders: 2,
        minions: 1,
        demons: 1,
      };

      // This scenario shouldn't happen (Baron filtered out), but test defensive behavior
      const selectedRoles = ['baron'];
      const finalDistribution = registry.applySetupAbilities(
        selectedRoles,
        baseDistribution,
        9
      );

      // Distribution unchanged
      expect(finalDistribution).toEqual(baseDistribution);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Baron] 玩家數量不足')
      );

      consoleSpy.mockRestore();
    });

    it('should handle Baron with limited townsfolk', () => {
      const baseDistribution = {
        townsfolk: 1,
        outsiders: 0,
        minions: 2,
        demons: 1,
      };

      const selectedRoles = ['baron', 'spy'];
      const finalDistribution = registry.applySetupAbilities(
        selectedRoles,
        baseDistribution,
        10
      );

      // Only 1 townsfolk available, so only -1, +1
      expect(finalDistribution.townsfolk).toBe(0);
      expect(finalDistribution.outsiders).toBe(1);
    });

    it('should not modify distribution when no Setup Ability roles', () => {
      const baseDistribution = {
        townsfolk: 7,
        outsiders: 0,
        minions: 2,
        demons: 1,
      };

      const selectedRoles = ['spy', 'poisoner'];
      const finalDistribution = registry.applySetupAbilities(
        selectedRoles,
        baseDistribution,
        10
      );

      expect(finalDistribution).toEqual(baseDistribution);
    });
  });

  describe('randomizeRolesWithSetup - Integration Tests', () => {
    it('should generate correct total role count for 10 players', () => {
      const roleIds = registry.randomizeRolesWithSetup(10);

      expect(roleIds).toHaveLength(10);
    });

    it('should generate correct total role count for 7 players', () => {
      const roleIds = registry.randomizeRolesWithSetup(7);

      expect(roleIds).toHaveLength(7);
    });

    it('should respect team distribution in 10-player game', () => {
      const roleIds = registry.randomizeRolesWithSetup(10);
      const categorized = registry.categorizeRoles(roleIds);

      // Base distribution: 7 townsfolk, 0 outsiders, 2 minions, 1 demon
      // If Baron selected: 5 townsfolk, 2 outsiders, 2 minions, 1 demon

      expect(categorized.demons).toHaveLength(1);
      expect(categorized.minions).toHaveLength(2);

      const hasBaron = categorized.minions.includes('baron');
      if (hasBaron) {
        // Baron effect applied
        expect(categorized.townsfolk).toHaveLength(5);
        expect(categorized.outsiders).toHaveLength(2);
      } else {
        // No Baron
        expect(categorized.townsfolk).toHaveLength(7);
        expect(categorized.outsiders).toHaveLength(0);
      }
    });

    it('should NOT include Baron in 9-player game', () => {
      // Run multiple times to ensure Baron never appears
      for (let i = 0; i < 10; i++) {
        const roleIds = registry.randomizeRolesWithSetup(9);

        expect(roleIds).not.toContain('baron');
      }
    });

    it('should respect team distribution in 7-player game', () => {
      const roleIds = registry.randomizeRolesWithSetup(7);
      const categorized = registry.categorizeRoles(roleIds);

      // 7-player base: 5 townsfolk, 0 outsiders, 1 minion, 1 demon
      expect(categorized.townsfolk).toHaveLength(5);
      expect(categorized.outsiders).toHaveLength(0);
      expect(categorized.minions).toHaveLength(1);
      expect(categorized.demons).toHaveLength(1);

      // Baron should never appear in 7-player game
      expect(categorized.minions).not.toContain('baron');
    });

    it('should produce unique roles (no duplicates)', () => {
      const roleIds = registry.randomizeRolesWithSetup(10);

      expect(new Set(roleIds).size).toBe(roleIds.length);
    });

    it('should shuffle the final role list', () => {
      // Get two role lists and verify they're in different orders
      const roleIds1 = registry.randomizeRolesWithSetup(10);
      const roleIds2 = registry.randomizeRolesWithSetup(10);

      // Very unlikely to be in same order (though theoretically possible)
      // If they're different, shuffling is working
      const isDifferentOrder = roleIds1.some((role, i) => role !== roleIds2[i]);

      // This test might rarely fail due to randomness, but extremely unlikely
      expect(isDifferentOrder).toBe(true);
    });
  });

  describe('Baron - End-to-End Scenarios', () => {
    it('Scenario: 10-player game with Baron', () => {
      // Force Baron selection by running until we get Baron
      let roleIds: string[] = [];
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        roleIds = registry.randomizeRolesWithSetup(10);
        if (roleIds.includes('baron')) break;
        attempts++;
      }

      expect(roleIds).toContain('baron');

      const categorized = registry.categorizeRoles(roleIds);

      // Verify Baron effect: -2 townsfolk, +2 outsiders
      expect(categorized.townsfolk).toHaveLength(5); // 7 - 2
      expect(categorized.outsiders).toHaveLength(2); // 0 + 2
      expect(categorized.minions).toHaveLength(2);
      expect(categorized.demons).toHaveLength(1);

      // Total should still be 10
      const total = categorized.townsfolk.length + categorized.outsiders.length +
                   categorized.minions.length + categorized.demons.length;
      expect(total).toBe(10);
    });

    it('Scenario: 7-player game without Baron', () => {
      const roleIds = registry.randomizeRolesWithSetup(7);
      const categorized = registry.categorizeRoles(roleIds);

      // Baron should never appear
      expect(roleIds).not.toContain('baron');

      // Distribution unchanged
      expect(categorized.townsfolk).toHaveLength(5);
      expect(categorized.outsiders).toHaveLength(0);
      expect(categorized.minions).toHaveLength(1);
      expect(categorized.demons).toHaveLength(1);
    });

    it('Scenario: 15-player game with Baron (edge case)', () => {
      // Force Baron selection
      let roleIds: string[] = [];
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        roleIds = registry.randomizeRolesWithSetup(15);
        if (roleIds.includes('baron')) break;
        attempts++;
      }

      expect(roleIds).toContain('baron');

      const categorized = registry.categorizeRoles(roleIds);

      // Base: 9 townsfolk, 2 outsiders, 3 minions, 1 demon
      // With Baron: 7 townsfolk, 4 outsiders, 3 minions, 1 demon
      expect(categorized.townsfolk).toHaveLength(7); // 9 - 2
      expect(categorized.outsiders).toHaveLength(4); // 2 + 2
      expect(categorized.minions).toHaveLength(3);
      expect(categorized.demons).toHaveLength(1);

      const total = categorized.townsfolk.length + categorized.outsiders.length +
                   categorized.minions.length + categorized.demons.length;
      expect(total).toBe(15);
    });
  });
});
