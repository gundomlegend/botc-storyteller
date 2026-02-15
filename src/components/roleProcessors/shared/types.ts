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
