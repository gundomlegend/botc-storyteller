import { describe, it, expect } from 'vitest';
import { GameStateManager } from '../GameState';

describe('GameStateManager smoke test', () => {
  it('should instantiate without errors', () => {
    const manager = new GameStateManager();
    expect(manager).toBeDefined();
  });
});
