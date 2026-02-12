// ===== 資料類型 =====

export interface RoleData {
  id: string;
  name: string;
  name_cn: string;
  team: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  ability: string;
  ability_cn: string;
  firstNight: number;
  firstNightReminder: string;
  firstNightReminder_cn: string;
  otherNight: number;
  otherNightReminder: string;
  otherNightReminder_cn: string;
  reminders: string[];
  setup: boolean;
  affectedByPoison: boolean;
  affectedByDrunk: boolean;
  worksWhenDead: boolean;
}

export interface Jinx {
  id: string;
  role1: string;
  role2: string;
  reason: string;
}

// ===== 狀態效果 =====

/** 可施加的狀態效果類型 */
export type StatusEffectType = 'poisoned' | 'protected' | 'drunk';

/** 一筆持續性狀態效果紀錄（追蹤來源與目標） */
export interface StatusEffect {
  targetSeat: number;
  type: StatusEffectType;
  sourceSeat: number;
}

// ===== 玩家與遊戲狀態 =====

export interface Player {
  seat: number;
  name: string;
  role: string;
  team: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  isAlive: boolean;
  isPoisoned: boolean;
  isDrunk: boolean;
  isProtected: boolean;
  believesRole: string | null;
  masterSeat: number | null;
  abilityUsed: boolean;
  deathCause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other' | null;
  deathNight: number | null;
  deathDay: number | null;
}

export interface GameState {
  night: number;
  day: number;
  phase: 'setup' | 'night' | 'day';
  players: Map<number, Player>;
  playerCount: number;
  history: GameEvent[];
  setupComplete: boolean;
  selectedRoles: string[];
  demonBluffs: string[];
  redHerringSeat: number | null;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  night: number;
  day: number;
  type: 'role_change' | 'death' | 'poison' | 'protection' | 'ability_use' | 'nomination' | 'vote' | 'phase_change' | 'init' | 'revoke' | 'butler_master';
  description: string;
  details: Record<string, unknown>;
}

// ===== 夜間處理 =====

export interface NightOrderItem {
  seat: number;
  role: string;
  roleName: string;
  priority: number;
  isDead: boolean;
  isPoisoned: boolean;
  isDrunk: boolean;
  isProtected: boolean;
  reminder: string;
}

export interface NightResult {
  action?: 'show_info' | 'tell_alignment' | 'tell_number' | 'add_protection' | 'add_poison' | 'kill' | 'set_master';
  skip?: boolean;
  skipReason?: string;
  needInput?: boolean;
  inputType?: 'select_player' | 'select_two_players';
  inputPrompt?: string;
  info?: string | Record<string, unknown>;
  gesture?: 'nod' | 'shake' | 'none';
  mustFollow?: boolean;
  canLie?: boolean;
  reasoning?: string;
  effectNullified?: boolean;
  display: string;
}

export interface NightContext {
  blockedRoles: Set<string>;
}

// ===== 處理器 =====

export interface HandlerContext {
  roleData: RoleData;
  player: Player;
  target: Player | null;
  secondTarget?: Player;
  gameState: GameState;
  infoReliable: boolean;
  statusReason: string;
  /** 根據當前語系將 roleId 轉為顯示名稱 */
  getRoleName: (roleId: string) => string;
}

export interface RoleHandler {
  process(context: HandlerContext): NightResult;
}
