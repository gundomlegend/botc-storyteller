import { describe, it, expect } from 'vitest';
import { GameStateManager } from '../GameState';
import { RoleRegistry } from '../RoleRegistry';

describe('GameStateManager smoke test', () => {
  it('should instantiate without errors', () => {
    const manager = new GameStateManager(RoleRegistry.getInstance());
    expect(manager).toBeDefined();
  });
});
