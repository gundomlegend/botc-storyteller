import type { Player, GameState, GameEvent, NightOrderItem, StatusEffect, StatusEffectType } from './types';
import { t } from './locale';
import { RoleRegistry } from './RoleRegistry';

let eventCounter = 0;

export class GameStateManager {
  private state: GameState;
  private poisonExpiresAtNight: Map<number, number> = new Map();
  private statusSources: StatusEffect[] = [];
  private roleRegistry: RoleRegistry;

  constructor(roleRegistry: RoleRegistry) {
    this.roleRegistry = roleRegistry;
    this.state = {
      night: 0,
      day: 0,
      phase: 'setup',
      players: new Map(),
      playerCount: 0,
      history: [],
      setupComplete: false,
      selectedRoles: [],
      demonBluffs: [],
      redHerringSeat: null,
      executedToday: null,
    };
  }

  initializePlayers(
    players: Array<{ seat: number; name: string; role: string; }>
  ): void {
    this.state.players.clear();

    for (const p of players) {
      console.log(`[InitPlayers] 處理玩家 ${p.seat}號 ${p.name} - 角色: ${p.role}`);
      const roleData = this.roleRegistry.getRoleData(p.role);
      if (!roleData) {
        throw new Error(`Unknown role: ${p.role}`);
      }

      const player: Player = {
        seat: p.seat,
        name: p.name,
        role: p.role,
        team: roleData.team,
        isAlive: true,
        isPoisoned: false,
        isDrunk: false, // 初始狀態為無醉酒（即使是酒鬼角色）
        isProtected: false,
        believesRole: null, // 酒鬼的假角色會在 initializeDrunkPlayers() 中設定
        masterSeat: null,
        abilityUsed: false,
        deathCause: null,
        deathNight: null,
        deathDay: null,
      };

      this.state.players.set(p.seat, player);
    }

    this.state.playerCount = players.length;
    this.state.selectedRoles = players.map((p) => p.role);
    this.state.setupComplete = true;
    this.state.demonBluffs = []; // 清空之前的惡魔虛張聲勢

    // 記錄初始化事件，包含酒鬼的假角色資訊
    const playerDetails = Array.from(this.state.players.values()).map(p => ({
      seat: p.seat,
      name: p.name,
      role: p.role,
      ...(p.role === 'drunk' && p.believesRole ? { believesRole: p.believesRole } : {})
    }));

    // 生成惡魔虛張聲勢清單（必須在酒鬼初始化之前）
    this.generateDemonBluffs();

    // 初始化酒鬼的假角色
    this.initializeDrunkPlayers();

    this.logEvent({
      type: 'init',
      description: `遊戲初始化完成，${players.length} 位玩家`,
      details: { players: playerDetails },
    });
  }

  /**
   * 初始化酒鬼玩家的假角色
   *
   * 規則：
   * 1. 從所有鎮民角色中選擇
   * 2. 排除場上已使用的鎮民角色
   * 3. 排除惡魔的虛張聲勢清單
   * 4. 隨機分配給每個酒鬼玩家
   */
  private initializeDrunkPlayers(): void {
    const drunkPlayers = this.getAllPlayers().filter(p => p.role === 'drunk');

    if (drunkPlayers.length === 0) {
      return; // 沒有酒鬼玩家，直接返回
    }

    // 取得所有鎮民角色
    const allTownfolkRoles = this.roleRegistry.getAllRoles()
      .filter(r => r.team === 'townsfolk')
      .map(r => r.id);

    // 收集場上已使用的鎮民角色
    const usedTownfolkRoles = new Set<string>();
    for (const player of this.state.players.values()) {
      if (player.team === 'townsfolk') {
        usedTownfolkRoles.add(player.role);
      }
    }

    // 取得惡魔虛張聲勢清單
    const demonBluffs = this.state.demonBluffs;

    // 計算可用角色：排除已使用的和虛張聲勢的
    const availableRoles = allTownfolkRoles.filter(role => {
      return !usedTownfolkRoles.has(role) && !demonBluffs.includes(role);
    });

    if (availableRoles.length < drunkPlayers.length) {
      console.warn(`可用鎮民角色不足以分配給所有酒鬼！可用: ${availableRoles.length}, 需要: ${drunkPlayers.length}`);
    }

    // 為每個酒鬼隨機分配假角色
    for (const drunkPlayer of drunkPlayers) {
      if (availableRoles.length === 0) {
        console.error(`沒有可用的鎮民角色供酒鬼 ${drunkPlayer.seat}號 假冒！`);
        break;
      }

      // 隨機選擇一個角色
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const selectedRole = availableRoles[randomIndex];

      // 分配給酒鬼
      drunkPlayer.believesRole = selectedRole;

      // 從可用清單中移除，避免多個酒鬼假冒同一角色
      availableRoles.splice(randomIndex, 1);

      const roleData = this.roleRegistry.getRoleData(selectedRole);
      const roleName = roleData ? t(roleData, 'name') : selectedRole;

      this.logEvent({
        type: 'ability_use',
        description: `酒鬼初始化：${drunkPlayer.seat}號 ${drunkPlayer.name} 以為自己是 ${roleName}`,
        details: {
          drunkSeat: drunkPlayer.seat,
          drunkName: drunkPlayer.name,
          believesRole: selectedRole,
        },
      });
    }
  }

  getPlayer(seat: number): Player | undefined {
    return this.state.players.get(seat);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.state.players.values());
  }

  getAlivePlayers(): Player[] {
    return this.getAllPlayers().filter((p) => p.isAlive);
  }

  getPlayersByRole(role: string): Player[] {
    return this.getAllPlayers().filter((p) => p.role === role);
  }

  hasAliveRole(role: string): boolean {
    return this.getAllPlayers().some((p) => p.role === role && p.isAlive);
  }

  getAlignment(player: Player): 'good' | 'evil' {
    return player.team === 'minion' || player.team === 'demon' ? 'evil' : 'good';
  }

  addStatus(seat: number, type: StatusEffectType, sourceSeat: number, data?: { believesRole?: string }): void {
    const player = this.state.players.get(seat);
    if (!player) return;

    // 已死亡玩家不可再獲得狀態
    if (!player.isAlive) return;

    switch (type) {
      case 'poisoned':
        player.isPoisoned = true;
        // 毒：持續到「下一個夜晚開始」才解除
        // 例如：N1 下毒 => expiresAtNight = 2 => N2 startNight() 一開始清掉
        this.poisonExpiresAtNight.set(seat, this.state.night + 1);
        this.statusSources.push({ targetSeat: seat, type: 'poisoned', sourceSeat });
        this.logEvent({
          type: 'poison',
          description: `${player.seat}號 ${player.name} 被中毒`,
          details: { seat, role: player.role, sourceSeat },
        });
        break;
      case 'protected':
        player.isProtected = true;
        this.statusSources.push({ targetSeat: seat, type: 'protected', sourceSeat });
        this.logEvent({
          type: 'protection',
          description: `${player.seat}號 ${player.name} 受到保護`,
          details: { seat, role: player.role, sourceSeat },
        });
        break;
      case 'drunk':
        player.isDrunk = true;
        if (data?.believesRole) {
          player.believesRole = data.believesRole;
        }
        this.logEvent({
          type: 'role_change',
          description: `${player.seat}號 ${player.name} 是酒鬼`,
          details: { seat, believesRole: data?.believesRole },
        });
        break;
    }
  }

  removeStatus(seat: number, type: StatusEffectType): void {
    const player = this.state.players.get(seat);
    if (!player) return;

    switch (type) {
      case 'poisoned':
        player.isPoisoned = false;
        break;
      case 'protected':
        player.isProtected = false;
        break;
    }
  }

  hasStatus(seat: number, type: StatusEffectType): boolean {
    const player = this.state.players.get(seat);
    if (!player) return false;

    switch (type) {
      case 'poisoned':
        return player.isPoisoned;
      case 'protected':
        return player.isProtected;
      case 'drunk':
        return player.isDrunk;
    }
  }

  killPlayer(seat: number, cause: 'demon_kill' | 'execution' | 'virgin_ability' | 'other'): void {
    const player = this.state.players.get(seat);
    if (!player) return;

    player.isAlive = false;
    player.deathCause = cause;

    if (this.state.phase === 'night') {
      player.deathNight = this.state.night;
    } else {
      player.deathDay = this.state.day;
    }

    if (cause === 'execution' || cause === 'virgin_ability') {
      this.state.executedToday = seat;
    }

    this.logEvent({
      type: 'death',
      description: `${player.seat}號 ${player.name} 死亡（${cause}）`,
      details: { seat, role: player.role, cause },
    });

    // AC2：死亡當下撤銷該玩家施加的所有持續性狀態
    this.revokeEffectsFrom(seat, 'death');
  }

  revokeEffectsFrom(sourceSeat: number, reason: 'death' | 'role_change'): void {
    const toRevoke = this.statusSources.filter((s) => s.sourceSeat === sourceSeat);
    if (toRevoke.length === 0) return;

    for (const record of toRevoke) {
      const target = this.state.players.get(record.targetSeat);
      if (!target) continue;

      if (record.type === 'poisoned') {
        target.isPoisoned = false;
        this.poisonExpiresAtNight.delete(record.targetSeat);
      } else if (record.type === 'protected') {
        target.isProtected = false;
      }
    }

    this.statusSources = this.statusSources.filter((s) => s.sourceSeat !== sourceSeat);

    this.logEvent({
      type: 'revoke',
      description: `撤銷 ${sourceSeat}號 施加的所有持續狀態（原因：${reason}）`,
      details: { sourceSeat, reason, revokedCount: toRevoke.length },
    });
  }

  replaceRole(seat: number, newRole: string): void {
    const player = this.state.players.get(seat);
    if (!player) return;

    const roleData = this.roleRegistry.getRoleData(newRole);
    if (!roleData) {
      throw new Error(`Unknown role: ${newRole}`);
    }

    const oldRole = player.role;

    // AC3：角色替換當下撤銷舊角色施加的持續性狀態
    this.revokeEffectsFrom(seat, 'role_change');

    player.role = newRole;
    player.team = roleData.team;

    this.logEvent({
      type: 'role_change',
      description: `${player.seat}號 ${player.name} 角色從 ${oldRole} 變更為 ${newRole}`,
      details: { seat, oldRole, newRole, team: roleData.team },
    });
  }

  markAbilityUsed(seat: number): void {
    const player = this.state.players.get(seat);
    if (!player) return;
    player.abilityUsed = true;

    this.logEvent({
      type: 'ability_use',
      description: `${player.seat}號 ${player.name} 已使用能力`,
      details: { seat, role: player.role },
    });
  }

  setButlerMaster(masterSeat: number): void {
    const butler = this.getAllPlayers().find((p) => p.role === 'butler' && p.isAlive);
    if (!butler) return;

    if (masterSeat === butler.seat) return;

    const master = this.state.players.get(masterSeat);
    if (!master || !master.isAlive) return;

    butler.masterSeat = masterSeat;

    this.logEvent({
      type: 'butler_master',
      description: `管家（${butler.seat}號 ${butler.name}）選擇 ${master.seat}號 ${master.name} 作為主人`,
      details: { butlerSeat: butler.seat, masterSeat },
    });
  }

  getButlerMaster(): number | null {
    const butler = this.getAllPlayers().find((p) => p.role === 'butler');
    if (!butler) return null;
    return butler.masterSeat;
  }

  setRedHerring(seat: number): void {
    const player = this.state.players.get(seat);
    if (!player) return;
    if (this.getAlignment(player) !== 'good') return;
    this.state.redHerringSeat = seat;
    this.logEvent({
      type: 'init',
      description: `${seat}號 ${player.name} 被設為占卜師的干擾項`,
      details: { seat, role: player.role },
    });
  }

  getRedHerring(): number | null {
    return this.state.redHerringSeat;
  }

  startNight(): void {
    this.state.night += 1;
    this.state.phase = 'night';

    // 清除所有保護狀態（保護只持續一晚）
    for (const player of this.state.players.values()) {
      player.isProtected = false;
    }

    // 清除「到期的中毒」：毒在下一個夜晚開始時失效
    for (const [seat, expiresAt] of this.poisonExpiresAtNight.entries()) {
      if (expiresAt === this.state.night) {
        const p = this.state.players.get(seat);
        if (p) p.isPoisoned = false;
        this.poisonExpiresAtNight.delete(seat);
      }
    }

    this.logEvent({
      type: 'phase_change',
      description: `第 ${this.state.night} 夜開始`,
      details: { night: this.state.night },
    });
  }

  startDay(): void {
    this.state.day += 1;
    this.state.phase = 'day';

    // 重置今天的處決記錄
    this.state.executedToday = null;

    this.logEvent({
      type: 'phase_change',
      description: `第 ${this.state.day} 天開始`,
      details: { day: this.state.day },
    });
  }

  /**
   * 記錄今天被處決的玩家
   */
  executePlayer(seat: number): void {
    const player = this.getPlayer(seat);
    if (!player) {
      console.error(`executePlayer: 玩家 ${seat} 不存在`);
      return;
    }

    this.state.executedToday = seat;

    this.logEvent({
      type: 'death',
      description: `${player.seat}號 ${player.name}（${this.roleRegistry.getRoleName(player.role)}）被處決`,
      details: {
        seat,
        name: player.name,
        role: player.role,
        cause: 'execution',
      },
    });
  }

  /**
   * 取得今天被處決的玩家
   */
  getExecutedPlayerToday(): Player | null {
    if (this.state.executedToday === null) {
      return null;
    }
    return this.getPlayer(this.state.executedToday) || null;
  }

  getMinionPlayers(): Player[] {
    return this.getAllPlayers().filter((p) => p.team === 'minion');
  }

  getDemonPlayer(): Player | undefined {
    return this.getAllPlayers().find((p) => p.team === 'demon');
  }

  generateDemonBluffs(): string[] {
    const assignedRoles = new Set(this.state.selectedRoles);

    console.log('[DemonBluffs] Initial assignedRoles:', Array.from(assignedRoles));
    console.log('[DemonBluffs] selectedRoles length:', this.state.selectedRoles.length);
    console.log('[DemonBluffs] playerCount:', this.state.playerCount);

    // 驗證 selectedRoles 不為空
    if (this.state.selectedRoles.length === 0) {
      console.error('[DemonBluffs] ERROR: selectedRoles is empty! Players may not be initialized.');
    }

    // 永久排除酒鬼標記（無論是否在場）
    // 原因：酒鬼標記只有說書人可見，不應被惡魔看到
    assignedRoles.add('drunk');

    // 排除酒鬼的假角色（believesRole）
    // 注意：酒鬼的假角色實際上不在場，但必須從虛張聲勢中排除
    // 原因：如果假角色出現在虛張聲勢中，惡魔會知道跳出該角色的玩家是酒鬼
    // 這違反了遊戲平衡，酒鬼應該被保護不被輕易識別
    for (const player of this.state.players.values()) {
      if (player.role === 'drunk' && player.believesRole) {
        console.log('[DemonBluffs] Found drunk with believesRole:', player.believesRole);
        assignedRoles.add(player.believesRole);
      }
    }

    console.log('[DemonBluffs] After drunk handling:', Array.from(assignedRoles));

    const goodRoles = this.roleRegistry.getAllRoles().filter(
      (r) => (r.team === 'townsfolk' || r.team === 'outsider') &&
             !assignedRoles.has(r.id) &&
             r.id !== 'drunk'  // 排除酒鬼：惡魔不會宣稱自己是酒鬼
    );

    console.log('[DemonBluffs] Available good roles:', goodRoles.map(r => r.id));

    // 驗證酒鬼是否被正確排除
    const drunkInGoodRoles = goodRoles.some(r => r.id === 'drunk');
    const drunkInAssignedRoles = assignedRoles.has('drunk');
    console.log('[DemonBluffs] Is drunk in assignedRoles?', drunkInAssignedRoles);
    console.log('[DemonBluffs] Is drunk in available goodRoles?', drunkInGoodRoles);
    if (drunkInAssignedRoles && drunkInGoodRoles) {
      console.error('[DemonBluffs] ERROR: drunk is in assignedRoles but still in goodRoles!');
    }

    // Shuffle and pick 3
    const shuffled = [...goodRoles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const bluffs = shuffled.slice(0, 3).map((r) => r.id);
    console.log('[DemonBluffs] Final bluffs:', bluffs);

    // 最終驗證：檢查生成的虛張聲勢中是否包含任何在場角色
    const invalidBluffs = bluffs.filter(bluff => assignedRoles.has(bluff));
    if (invalidBluffs.length > 0) {
      console.error('[DemonBluffs] ERROR: Generated bluffs contain assigned roles:', invalidBluffs);
    }

    this.state.demonBluffs = bluffs;
    return bluffs;
  }

  getDemonBluffs(): string[] {
    return this.state.demonBluffs;
  }

  generateNightOrder(isFirstNight: boolean): NightOrderItem[] {
    const items: NightOrderItem[] = [];

    for (const player of this.state.players.values()) {
      // 酒鬼使用假角色的夜間順序和提示
      const effectiveRole = player.role === 'drunk' && player.believesRole
        ? player.believesRole
        : player.role;

      const roleData = this.roleRegistry.getRoleData(effectiveRole);
      if (!roleData) continue;

      const priority = isFirstNight ? roleData.firstNight : roleData.otherNight;
      if (priority <= 0) continue;

      const reminder = isFirstNight
        ? t(roleData, 'firstNightReminder')
        : t(roleData, 'otherNightReminder');

      // 酒鬼的角色名稱加上標記
      const displayName = t(roleData, 'name');
      const roleName = player.role === 'drunk'
        ? `${displayName} (酒鬼)`
        : displayName;

      items.push({
        seat: player.seat,
        role: player.role, // 保留真實角色
        roleName, // 酒鬼會顯示為「假角色 (酒鬼)」
        priority,
        isDead: !player.isAlive,
        isPoisoned: player.isPoisoned,
        isDrunk: player.isDrunk,
        isProtected: player.isProtected,
        reminder,
      });
    }

    items.sort((a, b) => a.priority - b.priority);

    // 第一夜：在最前面加入特殊階段
    if (isFirstNight) {
      const specialItems: NightOrderItem[] = [];

      // 爪牙惡魔互認 (priority 1)
      specialItems.push({
        seat: 0,
        role: '__minion_demon_recognition__',
        roleName: '爪牙與惡魔互認',
        priority: 1,
        isDead: false,
        isPoisoned: false,
        isDrunk: false,
        isProtected: false,
        reminder: '讓所有爪牙和惡魔睜眼，互相確認身份。',
      });

      // 惡魔虛張聲勢 (priority 2) - 7人以上才需要
      if (this.state.playerCount >= 7) {
        specialItems.push({
          seat: 0,
          role: '__demon_bluffs__',
          roleName: '惡魔虛張聲勢',
          priority: 2,
          isDead: false,
          isPoisoned: false,
          isDrunk: false,
          isProtected: false,
          reminder: '讓惡魔睜眼，展示三個未分配的善良角色標記。',
        });
      }

      return [...specialItems, ...items];
    }

    return items;
  }

  logEvent(event: Omit<GameEvent, 'id' | 'timestamp' | 'night' | 'day'>): void {
    eventCounter += 1;
    this.state.history.push({
      ...event,
      id: `evt_${eventCounter}`,
      timestamp: Date.now(),
      night: this.state.night,
      day: this.state.day,
    });
  }

  getHistory(): GameEvent[] {
    return this.state.history;
  }

  getState(): GameState {
    return this.state;
  }
}
