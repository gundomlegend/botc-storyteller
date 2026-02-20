/**
 * Display State Selectors - Strategy Pattern
 * 根據不同階段選擇需要同步到 Display 視窗的資料
 */

import type { GameStore } from '../gameStore';

/**
 * State selector function type
 */
type StateSelector = (state: GameStore) => unknown;

/**
 * Display state selectors for each phase
 * 每個階段定義自己需要的資料片段
 */
const displayStateSelectors: Record<string, StateSelector> = {
  setup: (state: GameStore) => ({
    phase: state.phase,
    playerCount: state.players.length,
  }),

  night: (state: GameStore) => ({
    phase: state.phase,
    night: state.night,
    displayState: state.displayState,
  }),

  day: (state: GameStore) => ({
    phase: state.phase,
    day: state.day,
    alivePlayers: state.alivePlayers.map((p) => ({
      seat: p.seat,
      name: p.name,
      isAlive: p.isAlive,
    })),
    displayState: state.displayState,
  }),

  game_over: (state: GameStore) => ({
    phase: state.phase,
    gameOver: state.gameOver,
    winner: state.winner,
    gameOverReason: state.gameOverReason,
    players: state.players.map((p) => ({
      seat: p.seat,
      name: p.name,
      role: p.role,
      roleName: state.roleRegistry.getRoleName(p.role),
      team: p.team,
      isAlive: p.isAlive,
    })),
  }),

  history: (state: GameStore) => ({
    phase: state.phase,
    history: state.history.filter((event) => {
      // 只同步玩家可見的事件
      const publicEventTypes = ['death', 'phase_change', 'game_end', 'execution'];
      return publicEventTypes.includes(event.type);
    }),
  }),
};

/**
 * Select display state based on current phase
 * 選擇性同步：根據階段返回不同的資料
 */
export function selectDisplayState(state: GameStore): unknown {
  const selector = displayStateSelectors[state.phase] || displayStateSelectors.setup;
  return selector(state);
}
