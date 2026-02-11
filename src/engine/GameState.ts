import type { RoleData, Player, GameState, GameEvent, NightOrderItem, StatusEffect, StatusEffectType } from './types';
import { t } from './locale';
import rolesData from '../data/roles/trouble-brewing.json';

let eventCounter = 0;

export class GameStateManager {
  private state: GameState;
  private roleRegistry: Map<string, RoleData>;
  private poisonExpiresAtNight: Map<number, number> = new Map();
  private statusSources: StatusEffect[] = [];

  constructor() {
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
    };

    this.roleRegistry = new Map();
    (rolesData as RoleData[]).forEach((role) => {
      this.roleRegistry.set(role.id, role);
    });
  }

  initializePlayers(
    players: Array<{ seat: number; name: string; role: string }>
  ): void {
    this.state.players.clear();

    for (const p of players) {
      const roleData = this.roleRegistry.get(p.role);
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
        isDrunk: p.role === 'drunk',
        isProtected: false,
        believesRole: null,
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

    this.logEvent({
      type: 'init',
      description: `遊戲初始化完成，${players.length} 位玩家`,
      details: { players: players.map((p) => ({ seat: p.seat, name: p.name, role: p.role })) },
    });
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

  getRoleData(roleId: string): RoleData | undefined {
    return this.roleRegistry.get(roleId);
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

    const roleData = this.roleRegistry.get(newRole);
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

    this.logEvent({
      type: 'phase_change',
      description: `第 ${this.state.day} 天開始`,
      details: { day: this.state.day },
    });
  }

  getMinionPlayers(): Player[] {
    return this.getAllPlayers().filter((p) => p.team === 'minion');
  }

  getDemonPlayer(): Player | undefined {
    return this.getAllPlayers().find((p) => p.team === 'demon');
  }

  generateDemonBluffs(): string[] {
    const assignedRoles = new Set(this.state.selectedRoles);
    const goodRoles = (rolesData as RoleData[]).filter(
      (r) => (r.team === 'townsfolk' || r.team === 'outsider') && !assignedRoles.has(r.id)
    );

    // Shuffle and pick 3
    const shuffled = [...goodRoles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const bluffs = shuffled.slice(0, 3).map((r) => r.id);
    this.state.demonBluffs = bluffs;
    return bluffs;
  }

  getDemonBluffs(): string[] {
    return this.state.demonBluffs;
  }

  generateNightOrder(isFirstNight: boolean): NightOrderItem[] {
    const items: NightOrderItem[] = [];

    for (const player of this.state.players.values()) {
      const roleData = this.roleRegistry.get(player.role);
      if (!roleData) continue;

      const priority = isFirstNight ? roleData.firstNight : roleData.otherNight;
      if (priority <= 0) continue;

      const reminder = isFirstNight
        ? t(roleData, 'firstNightReminder')
        : t(roleData, 'otherNightReminder');

      items.push({
        seat: player.seat,
        role: player.role,
        roleName: t(roleData, 'name'),
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
