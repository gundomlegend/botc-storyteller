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
  setupAbility?: string; // Setup Ability 類型 (如 'add_outsiders')
  minPlayers?: number;   // 最小玩家數量限制
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

// ===== Setup Ability 相關 =====

/** 角色分配數量 */
export interface RoleDistribution {
  townsfolk: number;
  outsiders: number;
  minions: number;
  demons: number;
}

/** 按陣營分類的角色 ID 列表 */
export interface CategorizedRoles {
  townsfolk: string[];
  outsiders: string[];
  minions: string[];
  demons: string[];
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

/**
 * 夜晚行動結果（泛型版本）
 *
 * @template TInfo - Handler 返回的 info 資料型別
 */
export interface NightResult<TInfo = unknown> {
  action?: 'show_info' | 'tell_alignment' | 'tell_number' | 'add_protection' | 'add_poison' | 'kill' | 'set_master' | 'mayor_bounce';
  skip?: boolean;
  skipReason?: string;
  needInput?: boolean;
  inputType?: 'select_player' | 'select_two_players';
  inputPrompt?: string;
  info?: TInfo; // 使用泛型，預設為 unknown
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
}

export interface RoleHandler {
  process(context: HandlerContext): NightResult;
}
