import { t } from "./locale";
import { Player, RoleData } from "./types";

// DATA_FORMAT.md 人數配置表
const PLAYER_DISTRIBUTION: Record<number, { townsfolk: number; outsider: number; minion: number; demon: number }> = {
    5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
    6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
    7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
    8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
    9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
    10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
    11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
    12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
    13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
    14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
    15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

export function getPlayerDestribution(count: number) {
    return PLAYER_DISTRIBUTION[count];
}

export class RoleRegistry {
    private static instance: RoleRegistry;
    private roleDataMap: Map<string, RoleData> = new Map();
    private rolesByTeams: Record<string, RoleData[]> = {};

    private constructor() { }

    static getInstance(): RoleRegistry {
        if (!this.instance) {
            this.instance = new RoleRegistry();
        }
        return this.instance;
    }

    init(roles: RoleData[]) {
        roles.forEach((role) => {
            this.roleDataMap.set(role.id, role);
        });
        this.rolesByTeams = {
            townsfolk: roles.filter((r) => r.team === 'townsfolk'),
            outsider: roles.filter((r) => r.team === 'outsider'),
            minion: roles.filter((r) => r.team === 'minion'),
            demon: roles.filter((r) => r.team === 'demon'),
        };
    }

    getAllRoles(): RoleData[] {
        return Array.from(this.roleDataMap.values());
    }

    private shuffle<T>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }


    randomizeRoles(count: number): string[] {
        const dist = PLAYER_DISTRIBUTION[count];
        if (!dist) return [];
        const picked: string[] = [];
        picked.push(...this.shuffle(this.rolesByTeams.townsfolk).slice(0, dist.townsfolk).map((r) => r.id));
        picked.push(...this.shuffle(this.rolesByTeams.outsider).slice(0, dist.outsider).map((r) => r.id));
        picked.push(...this.shuffle(this.rolesByTeams.minion).slice(0, dist.minion).map((r) => r.id));
        picked.push(...this.shuffle(this.rolesByTeams.demon).slice(0, dist.demon).map((r) => r.id));

        return this.shuffle(picked);
    }

    getRoleData(roleId: string): RoleData | undefined {
        return this.roleDataMap.get(roleId);
    }

    /** 根據當前語系取得角色顯示名稱 */
    getRoleName(roleId: string): string {
        const rd = this.roleDataMap.get(roleId);
        return rd ? t(rd, 'name') : roleId;
    }

    /**
   * 取得玩家的角色顯示名稱（考慮 believesRole）
   * 如果玩家有 believesRole（如酒鬼），顯示為「假角色名(真實角色名)」
   */
    getPlayerRoleName(player: Player): string {
        if (player.believesRole) {
            const believesRoleName = this.getRoleName(player.believesRole);
            const actualRoleName = this.getRoleName(player.role);
            return `${believesRoleName}(${actualRoleName})`;
        }
        return this.getRoleName(player.role);
    }
}


