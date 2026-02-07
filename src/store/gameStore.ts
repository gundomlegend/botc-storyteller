import { create } from 'zustand';
import { GameStateManager } from '../engine/GameState';
import { RuleEngine } from '../engine/RuleEngine';
import type { Player, NightOrderItem, NightResult, GameEvent } from '../engine/types';

interface GameStore {
  stateManager: GameStateManager;
  ruleEngine: RuleEngine;

  // 衍生狀態
  phase: 'setup' | 'night' | 'day';
  night: number;
  day: number;
  players: Player[];
  alivePlayers: Player[];
  nightOrder: NightOrderItem[];
  history: GameEvent[];

  // 動作
  initGame: (players: Array<{ seat: number; name: string; role: string }>) => void;
  startNight: () => void;
  startDay: () => void;
  processAbility: (playerSeat: number, targetSeat: number | null) => NightResult;
  addStatus: (seat: number, type: 'poisoned' | 'protected' | 'drunk') => void;
  removeStatus: (seat: number, type: 'poisoned' | 'protected') => void;
  killPlayer: (seat: number, cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other') => void;

  // 內部刷新
  _refresh: () => void;
}

export const useGameStore = create<GameStore>((set) => {
  const stateManager = new GameStateManager();
  const ruleEngine = new RuleEngine();

  const refresh = () => {
    const state = stateManager.getState();
    set({
      phase: state.phase,
      night: state.night,
      day: state.day,
      players: stateManager.getAllPlayers(),
      alivePlayers: stateManager.getAlivePlayers(),
      history: stateManager.getHistory(),
    });
  };

  return {
    stateManager,
    ruleEngine,

    phase: 'setup',
    night: 0,
    day: 0,
    players: [],
    alivePlayers: [],
    nightOrder: [],
    history: [],

    initGame: (players) => {
      stateManager.initializePlayers(players);
      refresh();
    },

    startNight: () => {
      const state = stateManager.getState();
      const isFirstNight = state.night === 0;
      stateManager.startNight();
      const nightOrder = stateManager.generateNightOrder(isFirstNight);
      set({ nightOrder });
      refresh();
    },

    startDay: () => {
      stateManager.startDay();
      set({ nightOrder: [] });
      refresh();
    },

    processAbility: (playerSeat, targetSeat) => {
      const player = stateManager.getPlayer(playerSeat);
      const target = targetSeat != null ? stateManager.getPlayer(targetSeat) ?? null : null;

      if (!player) {
        return {
          skip: true,
          skipReason: `找不到玩家：座位 ${playerSeat}`,
          display: `找不到玩家：座位 ${playerSeat}`,
        };
      }

      const result = ruleEngine.processNightAbility(
        player,
        target,
        stateManager.getState(),
        stateManager
      );

      refresh();
      return result;
    },

    addStatus: (seat, type) => {
      stateManager.addStatus(seat, type);
      refresh();
    },

    removeStatus: (seat, type) => {
      stateManager.removeStatus(seat, type);
      refresh();
    },

    killPlayer: (seat, cause) => {
      stateManager.killPlayer(seat, cause);
      refresh();
    },

    _refresh: refresh,
  };
});
