/**
 * 魔典快照 —— 間諜所能看到的內容
 *
 * ## 可見性邊界（規則依據）
 *
 * | 內容 | 間諜可見 |
 * |------|---------|
 * | 角色標記 | ✅ |
 * | 提示標記（中毒/保護/主人/干擾項…） | ✅ |
 * | 玩家陣營（實體版以標記正反面表示） | ✅ |
 * | 說書人自訂筆記 | ❌ **絕對不可** |
 * | 惡魔的三張偽裝 | ⚠️ 說書人決定是否留在魔典中 |
 *
 * ## 為何採白名單建構
 *
 * `buildGrimoireSnapshot` **逐欄位挑選**，絕不展開整個 `Player` 物件。
 * 如此日後在 `Player` 或 `GameState` 新增任何說書人私有欄位時，
 * 不會因為忘記排除而洩漏給間諜 —— 預設是不可見，要可見得明確加上去。
 *
 * 新增欄位前請先確認：這個資訊在實體遊戲中是否真的擺在魔典上？
 *
 * @see docs/PLAN_Registration_and_Spy.md
 */

import type { GameState, Player } from './types';
import type { RoleRegistry } from './RoleRegistry';

/** 提示標記種類 */
export type ReminderToken =
  | 'poisoned'      // 中毒（投毒者）
  | 'protected'     // 被保護（僧侶）
  | 'drunk'         // 醉酒狀態
  | 'is_the_drunk'  // 此玩家是酒鬼（實體版：真實角色標記旁的提示）
  | 'master'        // 管家的主人
  | 'red_herring'   // 占卜師的干擾項
  | 'dead';         // 死亡

export interface GrimoireEntry {
  seat: number;
  name: string;
  /** 真實角色 id —— 酒鬼為 'drunk'，不是 believesRole */
  role: string;
  roleName: string;
  team: Player['team'];
  /** 陣營；實體版以角色標記正放/倒轉表示 */
  alignment: 'good' | 'evil';
  isAlive: boolean;
  reminders: ReminderToken[];
  /** 酒鬼以為自己是的角色；非酒鬼為 null */
  believesRole: string | null;
  /** 管家指定的主人座位；無則為 null */
  masterSeat: number | null;
}

export interface GrimoireSnapshot {
  entries: GrimoireEntry[];
  /**
   * 惡魔的偽裝角色。
   *
   * 規則：是否留在魔典中由說書人決定（展示給惡魔後可放回劇本盒）。
   * 引擎一律提供資料，**由 UI 負責讓說書人決定是否展示**。
   */
  demonBluffs: string[];
}

const EVIL_TEAMS = new Set(['minion', 'demon']);

function collectReminders(player: Player, state: GameState): ReminderToken[] {
  const reminders: ReminderToken[] = [];

  if (player.isPoisoned) reminders.push('poisoned');
  if (player.isProtected) reminders.push('protected');
  if (player.isDrunk) reminders.push('drunk');
  // 酒鬼本質（角色）不同於醉酒狀態標記
  if (player.role === 'drunk') reminders.push('is_the_drunk');
  if (player.masterSeat !== null) reminders.push('master');
  if (state.redHerringSeat === player.seat) reminders.push('red_herring');
  if (!player.isAlive) reminders.push('dead');

  return reminders;
}

/**
 * 建立魔典快照。
 *
 * 逐欄位挑選，不展開 Player —— 見檔頭「為何採白名單建構」。
 */
export function buildGrimoireSnapshot(
  state: GameState,
  roleRegistry: RoleRegistry
): GrimoireSnapshot {
  const entries = Array.from(state.players.values())
    .sort((a, b) => a.seat - b.seat)
    .map<GrimoireEntry>(player => ({
      seat: player.seat,
      name: player.name,
      // 真實角色，不是 believesRole —— 間諜看到的是事實
      role: player.role,
      roleName: roleRegistry.getRoleName(player.role),
      team: player.team,
      alignment: EVIL_TEAMS.has(player.team) ? 'evil' : 'good',
      isAlive: player.isAlive,
      reminders: collectReminders(player, state),
      believesRole: player.believesRole,
      masterSeat: player.masterSeat,
    }));

  return { entries, demonBluffs: [...state.demonBluffs] };
}
