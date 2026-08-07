/**
 * 註冊（Registration）—— 「某玩家在其他角色眼中被視為什麼」
 *
 * 陌客與間諜的能力不改變自身身分，只改變「別人查到自己時看到什麼」。
 * 本模組是這件事的唯一真相來源。
 *
 * 三條不可違反的設計約束（詳見 docs/contracts/Registration.contract.md）：
 *
 * 1. **無狀態**。每次結算時呼叫，不持有任何遊戲狀態。
 *    如此「何時該問說書人」才會由結構自動浮現，而不需有人記得去觸發。
 * 2. **陣營與角色是獨立兩軸**，不可互相推導。
 * 3. **只進資訊路徑**。禁止被能力結算路徑呼叫 —— 被當作某角色不會獲得該角色的能力。
 *
 * @see docs/contracts/Registration.contract.md
 * @see docs/PLAN_Registration_and_Spy.md
 */

import type { Player, RoleData } from './types';

export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon';
export type Alignment = 'good' | 'evil';

const EVIL_TEAMS: Team[] = ['minion', 'demon'];

/**
 * 具備「可能被視為其他身分」能力的角色。
 *
 * 資料驅動：擴充其他劇本的同類角色只需在此加一筆。
 *
 * 注意 `registersAs` 與 `teams` 是**獨立**的兩軸，不可由其中一者推導另一者
 * （規則明訂可出現「善良的間諜」或「邪惡的鎮民」）。
 */
const REGISTRATION_ABILITIES: Record<string, { registersAs: Alignment; teams: Team[] }> = {
  // 你可能被視為邪惡，且被視為爪牙或惡魔，即使你已死亡亦然。
  recluse: { registersAs: 'evil', teams: ['minion', 'demon'] },
  // 你可能被視為好人，且被視為鎮民或外來者，即使你已死亡亦然。
  spy: { registersAs: 'good', teams: ['townsfolk', 'outsider'] },
};

/** 說書人可選的登記範圍 */
export interface RegistrationOptions {
  seat: number;
  trueTeam: Team;
  trueRole: string;
  /** 能力是否生效（中毒/醉酒會關閉） */
  abilityActive: boolean;
  /** 可被登記的陣營；空陣列＝只能以真實身分登記 */
  registrableTeams: Team[];
  /** 可被登記的具體角色 id */
  registrableCharacters: string[];
  /** 說書人是否需要做選擇 */
  requiresChoice: boolean;
}

/** 該角色是否具備登記彈性（不論當下能力是否生效） */
export function hasRegistrationAbility(player: Player): boolean {
  return player.role in REGISTRATION_ABILITIES;
}

/**
 * 登記能力當下是否生效。
 *
 * 中毒/醉酒會關閉登記能力，使其以真實身分登記。
 *
 * 注意：這與角色資料的 `affectedByPoison` / `affectedByDrunk` **無關** ——
 * 那兩個旗標只用於判斷「該角色自己拿到的資訊可不可靠」。詳見 contract 文件。
 */
export function isRegistrationAbilityActive(player: Player): boolean {
  return hasRegistrationAbility(player) && !player.isPoisoned && !player.isDrunk;
}

/** 玩家的真實陣營（不考慮任何登記能力） */
export function trueAlignment(player: Player): Alignment {
  return EVIL_TEAMS.includes(player.team as Team) ? 'evil' : 'good';
}

/**
 * 該玩家在此次查驗中被視為的陣營。
 *
 * 目前回傳規則預設值；PR 4 將加入說書人覆寫層。
 */
export function resolveAlignment(player: Player): Alignment {
  if (isRegistrationAbilityActive(player)) {
    return REGISTRATION_ABILITIES[player.role].registersAs;
  }
  return trueAlignment(player);
}

/** 該玩家是否被視為邪惡（Chef / Empath 等只關心陣營的角色） */
export function registersAsEvil(player: Player): boolean {
  return resolveAlignment(player) === 'evil';
}

/**
 * 該玩家是否**可能**被視為指定陣營類型。
 *
 * 占卜師即以 `mayRegisterAsTeam(target, 'demon')` 判斷是否觸發偵測。
 * 間諜只能被視為鎮民/外來者，因此永遠不會觸發占卜師 —— 這由資料保證，
 * 而非靠呼叫端記得排除。
 */
export function mayRegisterAsTeam(player: Player, team: Team): boolean {
  if (isRegistrationAbilityActive(player)) {
    return REGISTRATION_ABILITIES[player.role].teams.includes(team);
  }
  return player.team === team;
}

/**
 * 取得說書人可選的登記範圍。
 *
 * `registrableCharacters` 為**劇本內**該類型的全部角色 —— 規則是「被當作一個
 * 特定的鎮民或外來者角色」，不限定在場、也不限定存活（兩個角色皆明訂
 * 「即使你已死亡亦然」）。
 *
 * @param inPlayRoles 在場角色 id；用於排序，不在場者優先（登記成在場角色
 *                    容易與真人宣稱撞角色而露餡）。不影響可選範圍。
 */
export function getRegistrationOptions(
  player: Player,
  script: RoleData[],
  inPlayRoles: readonly string[] = []
): RegistrationOptions {
  const base = {
    seat: player.seat,
    trueTeam: player.team as Team,
    trueRole: player.role,
    abilityActive: isRegistrationAbilityActive(player),
  };

  if (!base.abilityActive) {
    return { ...base, registrableTeams: [], registrableCharacters: [], requiresChoice: false };
  }

  const teams = REGISTRATION_ABILITIES[player.role].teams;
  const inPlay = new Set(inPlayRoles);
  const characters = script
    .filter(r => teams.includes(r.team as Team))
    .map(r => r.id)
    // 不在場者優先，其餘維持劇本順序
    .sort((a, b) => Number(inPlay.has(a)) - Number(inPlay.has(b)));

  return { ...base, registrableTeams: [...teams], registrableCharacters: characters, requiresChoice: true };
}

const ROLE_LABEL: Record<string, string> = { recluse: '陌客', spy: '間諜' };

/**
 * 產生陣營登記的說明文字（給 Chef / Empath 等只關心陣營的角色）。
 *
 * 文字一律由 {@link resolveAlignment} 推導，因此不可能與計算結果矛盾 ——
 * 這正是先前 Chef/Empath 各自計算註記所導致的 bug。
 *
 * @returns 無登記彈性的角色回傳 null
 */
export function describeAlignmentRegistration(
  player: Player,
  options: { prefix?: string } = {}
): string | null {
  if (!hasRegistrationAbility(player)) return null;

  const prefix = options.prefix ?? '';
  const verdict = registersAsEvil(player) ? '被視為邪惡' : '不被視為邪惡';
  const cause = isRegistrationAbilityActive(player) ? '' : '（能力失效）';

  return `${prefix}${ROLE_LABEL[player.role]} ${player.seat}號 ${verdict}${cause}`;
}
