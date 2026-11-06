import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

const PLAYERS = [
  { seat: 1, name: 'A', role: 'washerwoman', roleName: '洗衣婦' },
  { seat: 2, name: 'B', role: 'empath', roleName: '共情者' },
  { seat: 3, name: 'C', role: 'monk', roleName: '僧侶' },
  { seat: 4, name: 'D', role: 'poisoner', roleName: '投毒者' },
  { seat: 5, name: 'E', role: 'imp', roleName: '小惡魔' },
];

/**
 * 引擎（GameStateManager）是原地修改物件的。store 必須在每次 refresh 時
 * 交出新的陣列與新的 player 物件，否則用 selector 訂閱的元件不會重新渲染。
 */
describe('gameStore.refresh 產生新的參考', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(PLAYERS);
  });

  it('狀態改變後 players 是新陣列，被改到的 player 是新物件', () => {
    const before = useGameStore.getState();
    const playersBefore = before.players;
    const seat2Before = playersBefore.find((p) => p.seat === 2)!;

    before.addStatus(2, 'poisoned', 4);

    const after = useGameStore.getState();
    const seat2After = after.players.find((p) => p.seat === 2)!;
    expect(after.players).not.toBe(playersBefore);
    expect(seat2After).not.toBe(seat2Before);
    expect(seat2After.isPoisoned).toBe(true);
    expect(seat2Before.isPoisoned).toBe(false);
  });

  it('alivePlayers 與 players 使用同一批新物件', () => {
    useGameStore.getState().killPlayer(3, 'other');
    const { players, alivePlayers } = useGameStore.getState();
    expect(alivePlayers.map((p) => p.seat)).toEqual([1, 2, 4, 5]);
    for (const p of alivePlayers) expect(players).toContain(p);
  });

  it('history 在新增事件後是新陣列', () => {
    const historyBefore = useGameStore.getState().history;
    useGameStore.getState().killPlayer(3, 'other');
    const historyAfter = useGameStore.getState().history;
    expect(historyAfter).not.toBe(historyBefore);
    expect(historyAfter.length).toBeGreaterThan(historyBefore.length);
  });
});
