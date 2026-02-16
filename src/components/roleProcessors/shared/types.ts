/**
 * 統一 Role Processor 類型定義
 *
 * 使用 Strategy Pattern + Template Method Pattern
 * 讓不同角色能共享 UI 結構，同時保留各自的行為邏輯
 */

import type { NightResult } from '../../../engine/types';
import type { GameStateManager } from '../../../engine/GameState';
import type { RoleRegistry } from '../../../engine/RoleRegistry';

// ============================================================
// Handler Info 型別定義
// ============================================================

/**
 * 目標玩家資訊
 * 從 Handler 返回的目標列表項目
 */
export interface TargetPlayerInfo {
  seat: number;
  name: string;
  role: string;
  roleName: string;
  isPoisoned?: boolean;
  isDrunk?: boolean;
}

/**
 * 特殊玩家資訊（陌客、間諜等）
 */
export interface SpecialPlayerInfo {
  seat: number;
  name: string;
  role: string;
  roleName?: string;
}

/**
 * 圖書管理員 Handler 返回的 Info 型別
 */
export interface LibrarianHandlerInfo {
  outsiders: TargetPlayerInfo[];
  recluses: SpecialPlayerInfo[];
  hasSpy: boolean;
  hasRecluse: boolean;
  onlySpyInGame?: boolean;
  noOutsiderInGame?: boolean;
  reliable: boolean;
  statusReason: string;
}

/**
 * 調查員 Handler 返回的 Info 型別
 */
export interface InvestigatorHandlerInfo {
  minions: TargetPlayerInfo[];
  recluses: SpecialPlayerInfo[];
  hasSpy: boolean;
  hasRecluse: boolean;
  onlySpyInGame?: boolean;
  noMinionToShow?: boolean;
  noMinionInGame?: boolean;
  reliable: boolean;
  statusReason: string;
}

/**
 * 洗衣婦 Handler 返回的 Info 型別
 */
export interface WasherwomanHandlerInfo {
  townsfolk: TargetPlayerInfo[];
  hasSpy: boolean;
  onlySpyInGame?: boolean;
  reliable: boolean;
  statusReason: string;
}

/**
 * 送葬者 Handler 返回的 Info 型別
 */
export interface UndertakerHandlerInfo {
  executedPlayer: {
    seat: number;
    name: string;
    role: string;           // 真實角色
    roleName: string;
    believesRole?: string;  // 以為自己是（酒鬼情況）
    isDrunk: boolean;       // 是否為酒鬼
    isPoisoned: boolean;    // 是否中毒
  };
  isRecluse: boolean;       // 是否為能力正常的陌客
  isSpy: boolean;           // 是否為能力正常的間諜
  selectableRoles: string[]; // 可選擇的角色列表（陌客/間諜/不可靠時）
  reliable: boolean;
  statusReason: string;
}

// ============================================================
// Processor 通用型別定義
// ============================================================

/**
 * 預選結果
 * 定義如何預選角色和玩家
 */
export interface PreselectionResult {
  role: string | null;      // 預選的角色 ID（如 'butler', 'poisoner'）
  player1: number | null;   // 第一位玩家座號
  player2: number | null;   // 第二位玩家座號
}

/**
 * Processor 上下文（泛型版本）
 * 提供配置函數所需的所有資訊
 *
 * @template THandlerInfo - Handler 返回的 info 型別
 */
export interface ProcessorContext<THandlerInfo = unknown> {
  result: NightResult<THandlerInfo>; // Handler 返回的結果（泛型）
  isReliable: boolean;               // 能力是否可靠（非中毒/醉酒/酒鬼）
  isDrunkRole: boolean;              // 是否為酒鬼角色
  isPoisoned: boolean;               // 是否中毒
  isDrunk: boolean;                  // 是否醉酒
  stateManager: GameStateManager;    // 狀態管理器
  roleRegistry: RoleRegistry;        // 角色註冊表
  currentPlayerSeat: number;         // 當前玩家座號
}

/**
 * 不可靠警告
 * 當能力不可靠時顯示的警告訊息
 */
export interface UnreliableWarning {
  message: string;          // 主要警告訊息
  recommendation?: string;  // 建議操作（可選）
}

/**
 * 角色處理器配置（泛型版本）
 * Strategy Pattern：每個角色透過配置自訂行為
 *
 * @template THandlerInfo - Handler 返回的 info 型別，預設為 unknown
 */
export interface RoleProcessorConfig<THandlerInfo = unknown> {
  /** 角色 ID */
  roleId: string;

  /** 目標陣營（爪牙、外來者等） */
  targetTeam: 'minion' | 'outsider' | 'townsfolk';

  /**
   * 是否在玩家列表中包含自己
   * - true: 玩家可以選擇自己（如洗衣婦在「只有自己是鎮民」時）
   * - false: 玩家列表排除自己（預設行為）
   */
  includeSelfInPlayerList?: boolean;

  /**
   * 取得預選邏輯（Strategy）
   * 不同角色有不同的預選策略
   */
  getPreselection?: (context: ProcessorContext<THandlerInfo>) => PreselectionResult;

  /**
   * 取得提示訊息列表（Strategy）
   * 根據遊戲狀態動態產生提示
   */
  getHints?: (context: ProcessorContext<THandlerInfo>) => string[];

  /**
   * 取得不可靠警告（Strategy）
   * 當能力不可靠時的警告訊息
   */
  getUnreliableWarning?: (context: ProcessorContext<THandlerInfo>) => UnreliableWarning | null;

  /**
   * 是否顯示「給予無目標資訊」按鈕（Strategy）
   * 例如：只有間諜、只有陌客、或能力不可靠時
   */
  shouldShowNoTargetButton?: (context: ProcessorContext<THandlerInfo>) => boolean;

  /**
   * 取得角色列表標題（Strategy）
   * 例如：選擇展示的「爪牙」或「外來者」或「[鎮民」角色
   */
  getTargetRoleLabel?: (context: ProcessorContext<THandlerInfo>) => string;


  /**
   * 取得目標列表標籤（Strategy）
   * 例如：「場上外來者」或「場上爪牙」
   */
  getTargetListLabel?: (context: ProcessorContext<THandlerInfo>) => string;

  /**
   * 取得特殊列表標籤（Strategy）
   * 例如：「疑似外來者」或「疑似爪牙」
   */
  getSuspectedListLabel?: (context: ProcessorContext<THandlerInfo>) => string;

  /**
   * 取得「無目標」按鈕文字（Strategy）
   * 例如：「給予『無外來者』資訊」或「告知『無爪牙』」
   */
  getNoTargetButtonText?: (context: ProcessorContext<THandlerInfo>) => string;

  /**
   * 取得確認時的事件描述（Strategy）
   * 用於記錄遊戲事件
   */
  getConfirmEventDescription?: (
    context: ProcessorContext<THandlerInfo>,
    selectedRole: string,
    player1: number,
    player2: number
  ) => string;

  /**
   * 取得「無目標」確認時的事件描述（Strategy）
   */
  getNoTargetEventDescription?: (context: ProcessorContext<THandlerInfo>) => string;

  /**
   * 取得目標玩家列表（Strategy）
   * 從 Handler 資料中提取並組裝目標玩家列表
   */
  getTargets: (context: ProcessorContext<THandlerInfo>) => TargetPlayerInfo[];

  /**
   * 取得特殊玩家列表（Strategy）
   * 從 Handler 資料中提取特殊玩家（間諜、陌客等）
   */
  getSpecialPlayers: (context: ProcessorContext<THandlerInfo>) => SpecialPlayerInfo[];
}
