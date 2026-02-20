/**
 * Display Store - Observer Pattern
 * Display 視窗的唯讀 store，透過 IPC 接收主視窗的狀態更新
 */

import { create } from 'zustand';
import { ElectronIPCService } from '../../services/IPCService';

interface DisplayNightAction {
  index: number;
  seat: number;
  roleName: string;
  phase: 'waking' | 'awake' | 'closing';
}

interface DisplayNomination {
  nominatorName: string;
  nomineeName: string;
}

interface DisplayVoting {
  nomineeName: string;
  voteCount: number;
  threshold: number;
  voters: string[];
}

interface DisplayStateData {
  nightAction: DisplayNightAction | null;
  nomination: DisplayNomination | null;
  voting: DisplayVoting | null;
}

interface Player {
  seat: number;
  name: string;
  role: string;
  roleName: string;
  team: 'good' | 'evil';
  isAlive: boolean;
}

interface GameEvent {
  type: string;
  description: string;
}

export interface DisplayStore {
  // 階段資訊
  phase: 'setup' | 'night' | 'day' | 'game_over' | 'history';

  // Setup 階段
  playerCount: number;

  // Night 階段
  night: number;
  displayState: DisplayStateData;

  // Day 階段
  day: number;
  alivePlayers: Array<{
    seat: number;
    name: string;
    isAlive: boolean;
  }>;

  // Game Over 階段
  gameOver: boolean;
  winner: 'good' | 'evil' | null;
  gameOverReason: string | null;
  players: Player[];

  // History 階段
  history: GameEvent[];
}

// Initialize IPC service
const ipcService = new ElectronIPCService();

export const useDisplayStore = create<DisplayStore>((set) => {
  // Subscribe to IPC updates (Observer Pattern)
  ipcService.on('state-update', (data) => {
    set(data as Partial<DisplayStore>);
  });

  return {
    // 初始狀態
    phase: 'setup',

    // Setup
    playerCount: 0,

    // Night
    night: 0,
    displayState: {
      nightAction: null,
      nomination: null,
      voting: null,
    },

    // Day
    day: 0,
    alivePlayers: [],

    // Game Over
    gameOver: false,
    winner: null,
    gameOverReason: null,
    players: [],

    // History
    history: [],
  };
});
