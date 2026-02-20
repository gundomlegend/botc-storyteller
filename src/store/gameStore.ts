import { create } from 'zustand';
import { GameStateManager } from '../engine/GameState';
import { RuleEngine } from '../engine/RuleEngine';
import type { Player, NightOrderItem, NightResult, GameEvent, StatusEffectType, RoleData } from '../engine/types';
import { RoleRegistry } from '../engine/RoleRegistry';
import rolesData from '../data/roles/trouble-brewing.json';
import { ElectronIPCService } from '../services/IPCService';
import { createStateSyncMiddleware } from './middleware/stateSyncMiddleware';

export interface DisplayState {
  nightAction: {
    index: number;
    seat: number;
    roleName: string;
    phase: 'waking' | 'awake' | 'closing';
  } | null;
  nomination: {
    nominatorName: string;
    nomineeName: string;
  } | null;
  voting: {
    nomineeName: string;
    voteCount: number;
    threshold: number;
    voters: string[];
  } | null;
}

export interface GameStore {
  roleRegistry: RoleRegistry;
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
  gameOver: boolean;
  winner: 'good' | 'evil' | null;
  gameOverReason: string | null;

  // Display 控制狀態
  displayState: DisplayState;

  // 動作
  initGame: (players: Array<{ seat: number; name: string; role: string, roleName: string }>) => void;
  startNight: () => void;
  startDay: () => void;
  processAbility: (playerSeat: number, targetSeat: number | null, secondTargetSeat?: number | null) => NightResult;
  addStatus: (seat: number, type: StatusEffectType, sourceSeat: number) => void;
  removeStatus: (seat: number, type: StatusEffectType) => void;
  killPlayer: (seat: number, cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other') => void;
  setButlerMaster: (masterSeat: number) => void;
  setRedHerring: (seat: number) => void;
  endGame: (winner: 'good' | 'evil', reason: string) => void;

  // Display 控制
  setDisplayNightAction: (action: DisplayState['nightAction']) => void;
  setDisplayNomination: (nomination: DisplayState['nomination']) => void;
  setDisplayVoting: (voting: DisplayState['voting']) => void;
  clearDisplayState: () => void;

  // 內部刷新
  _refresh: () => void;
}

// Initialize IPC service for state sync
const ipcService = new ElectronIPCService();

export const useGameStore = create<GameStore>(
  createStateSyncMiddleware(ipcService)(
    (set) => {
      const roleRegistry = RoleRegistry.getInstance();
      const stateManager = new GameStateManager(roleRegistry);
      const ruleEngine = new RuleEngine(roleRegistry);

  const refresh = () => {
    const state = stateManager.getState();
    set({
      phase: state.phase,
      night: state.night,
      day: state.day,
      players: stateManager.getAllPlayers(),
      alivePlayers: stateManager.getAlivePlayers(),
      history: stateManager.getHistory(),
      gameOver: state.gameOver,
      winner: state.winner,
      gameOverReason: state.gameOverReason,
    });
  };

  return {
    stateManager,
    ruleEngine,
    roleRegistry,

    phase: 'setup',
    night: 0,
    day: 0,
    players: [],
    alivePlayers: [],
    nightOrder: [],
    history: [],
    gameOver: false,
    winner: null,
    gameOverReason: null,

    // Display 控制狀態
    displayState: {
      nightAction: null,
      nomination: null,
      voting: null,
    },

    initGame: (players) => {
      roleRegistry.init(rolesData as RoleData[]);
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

    processAbility: (playerSeat, targetSeat, secondTargetSeat) => {
      const player = stateManager.getPlayer(playerSeat);
      const target = targetSeat != null ? stateManager.getPlayer(targetSeat) ?? null : null;
      const secondTarget = secondTargetSeat != null ? stateManager.getPlayer(secondTargetSeat) ?? null : null;

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
        stateManager,
        secondTarget
      );

      refresh();
      return result;
    },

    addStatus: (seat, type, sourceSeat) => {
      stateManager.addStatus(seat, type, sourceSeat);
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

    setButlerMaster: (masterSeat) => {
      stateManager.setButlerMaster(masterSeat);
      refresh();
    },

    setRedHerring: (seat) => {
      stateManager.setRedHerring(seat);
      refresh();
    },

    endGame: (winner, reason) => {
      stateManager.endGame(winner, reason);
      refresh();
    },

    // Display 控制
    setDisplayNightAction: (action) => {
      set((state) => ({
        displayState: {
          ...state.displayState,
          nightAction: action,
        },
      }));
    },

    setDisplayNomination: (nomination) => {
      set((state) => ({
        displayState: {
          ...state.displayState,
          nomination,
        },
      }));
    },

    setDisplayVoting: (voting) => {
      set((state) => ({
        displayState: {
          ...state.displayState,
          voting,
        },
      }));
    },

    clearDisplayState: () => {
      set({
        displayState: {
          nightAction: null,
          nomination: null,
          voting: null,
        },
      });
    },

      _refresh: refresh,
    };
  })
);
