/**
 * displayStateSelectors — Group D tests
 */

import { describe, it, expect } from 'vitest';
import { selectDisplayState } from '../displayStateSelectors';
import type { GameStore } from '../../gameStore';
import type { Player } from '../../../engine/types';

// Minimal GameStore stub — only fields used by selectors
function makeStore(overrides: Partial<GameStore>): GameStore {
  const defaults = {
    phase: 'day',
    day: 1,
    night: 1,
    players: [] as Player[],
    alivePlayers: [] as Player[],
    history: [],
    displayState: { nightAction: null, nomination: null, voting: null },
    gameOver: false,
    winner: null,
    gameOverReason: null,
    playerCount: 0,
    roleRegistry: { getRoleName: (r: string) => r } as any,
  } as unknown as GameStore;
  return { ...defaults, ...overrides } as GameStore;
}

function makePlayer(seat: number, isAlive: boolean, deathNight: number | null = null): Player {
  return {
    seat,
    name: `Player${seat}`,
    role: 'fortuneteller',
    team: 'townsfolk',
    isAlive,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    believesRole: null,
    masterSeat: null,
    abilityUsed: false,
    hasDeathVote: !isAlive,
    hasMadeSlayerClaim: false,
    deathCause: isAlive ? null : 'demon_kill',
    deathNight,
    deathDay: null,
  } as unknown as Player;
}

describe('displayStateSelectors — day phase', () => {
  it('alivePlayers includes ALL players (alive and dead)', () => {
    const players = [makePlayer(1, true), makePlayer(2, false, 1)];
    const store = makeStore({ phase: 'day', day: 1, night: 1, players });
    const result = selectDisplayState(store) as any;
    expect(result.alivePlayers).toHaveLength(2);
    expect(result.alivePlayers.find((p: any) => p.seat === 1)?.isAlive).toBe(true);
    expect(result.alivePlayers.find((p: any) => p.seat === 2)?.isAlive).toBe(false);
  });

  it('history only includes death/execution events', () => {
    const makeEvent = (type: string, desc: string) => ({
      id: 'x', timestamp: 0, night: 0, day: 0,
      type: type as any, description: desc, details: {},
    });
    const history = [
      makeEvent('death', 'killed'),
      makeEvent('execution', 'executed'),
      makeEvent('phase_change', 'day'),
      makeEvent('nomination', 'nominate'),
    ];
    const store = makeStore({ phase: 'day', history: history as any, players: [] });
    const result = selectDisplayState(store) as any;
    expect(result.history).toHaveLength(2);
    expect(result.history.every((e: any) => ['death', 'execution'].includes(e.type))).toBe(true);
  });

  it('dawnDeaths returns players who died this night', () => {
    const players = [
      makePlayer(1, true),
      makePlayer(2, false, 1),  // died night 1
      makePlayer(3, false, 2),  // died night 2
    ];
    const store = makeStore({ phase: 'day', night: 1, players });
    const result = selectDisplayState(store) as any;
    expect(result.dawnDeaths).toHaveLength(1);
    expect(result.dawnDeaths[0].seat).toBe(2);
    expect(result.dawnDeaths[0].name).toBe('Player2');
  });

  it('dawnDeaths is empty when no deaths this night (平安夜)', () => {
    const players = [makePlayer(1, true), makePlayer(2, true)];
    const store = makeStore({ phase: 'day', night: 1, players });
    const result = selectDisplayState(store) as any;
    expect(result.dawnDeaths).toHaveLength(0);
  });

  it('dawnDeaths correctly excludes prior-night deaths', () => {
    const players = [
      makePlayer(1, false, 1),  // died night 1
      makePlayer(2, false, 2),  // died night 2 (current night)
    ];
    const store = makeStore({ phase: 'day', night: 2, players });
    const result = selectDisplayState(store) as any;
    expect(result.dawnDeaths).toHaveLength(1);
    expect(result.dawnDeaths[0].seat).toBe(2);
  });

  it('alivePlayers only exposes seat, name, isAlive (no role info)', () => {
    const players = [makePlayer(1, true)];
    const store = makeStore({ phase: 'day', players });
    const result = selectDisplayState(store) as any;
    const p = result.alivePlayers[0];
    expect(p).toHaveProperty('seat');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('isAlive');
    expect(p).not.toHaveProperty('role');
    expect(p).not.toHaveProperty('team');
  });
});

describe('displayStateSelectors — fallback to setup', () => {
  it('unknown phase falls back to setup selector', () => {
    const store = makeStore({ phase: 'unknown_phase' as any, players: [makePlayer(1, true)] });
    const result = selectDisplayState(store) as any;
    expect(result.phase).toBe('unknown_phase');
    // setup selector returns playerCount, not alivePlayers
    expect(result.playerCount).toBeDefined();
    expect(result.alivePlayers).toBeUndefined();
  });
});
