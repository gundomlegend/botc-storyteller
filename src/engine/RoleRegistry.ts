import { t } from "./locale";
import { Player, RoleData, RoleDistribution, CategorizedRoles } from "./types";

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

    // ═════════════════════════════════════════════════════
    // Setup Ability 系統方法
    // ═════════════════════════════════════════════════════

    /**
     * 取得基礎角色分配（根據玩家數量）
     */
    getBaseDistribution(playerCount: number): RoleDistribution {
        const dist = PLAYER_DISTRIBUTION[playerCount];
        if (!dist) {
            throw new Error(`不支援的玩家數量：${playerCount}`);
        }
        return {
            townsfolk: dist.townsfolk,
            outsiders: dist.outsider, // 注意：PLAYER_DISTRIBUTION 用的是單數 'outsider'
            minions: dist.minion,     // 注意：PLAYER_DISTRIBUTION 用的是單數 'minion'
            demons: dist.demon,       // 注意：PLAYER_DISTRIBUTION 用的是單數 'demon'
        };
    }

    /**
     * 根據陣營分類角色
     */
    categorizeRoles(roleIds: string[]): CategorizedRoles {
        const result: CategorizedRoles = {
            townsfolk: [],
            outsiders: [],
            minions: [],
            demons: []
        };

        for (const roleId of roleIds) {
            const roleData = this.getRoleData(roleId);
            if (!roleData) {
                console.warn(`[RoleRegistry] 未知角色: ${roleId}`);
                continue;
            }

            switch (roleData.team) {
                case 'townsfolk':
                    result.townsfolk.push(roleId);
                    break;
                case 'outsider':
                    result.outsiders.push(roleId);
                    break;
                case 'minion':
                    result.minions.push(roleId);
                    break;
                case 'demon':
                    result.demons.push(roleId);
                    break;
            }
        }

        return result;
    }

    /**
     * 根據玩家數量過濾角色池，移除不符合 minPlayers 限制的角色
     */
    filterRolesByPlayerCount(roleIds: string[], playerCount: number): string[] {
        return roleIds.filter(roleId => {
            const roleData = this.getRoleData(roleId);
            if (!roleData) return true; // 未知角色保留

            const minPlayers = roleData.minPlayers ?? 0;
            if (minPlayers > 0 && playerCount < minPlayers) {
                console.log(`[RoleFilter] 移除 ${roleId}（需要 ${minPlayers} 人，當前 ${playerCount} 人）`);
                return false; // 不符合最小玩家數量要求
            }

            return true;
        });
    }

    /**
     * 從角色池中隨機選擇指定數量的角色
     */
    randomPick(
        pool: string[],
        count: number,
        allowDuplicates = false
    ): string[] {
        if (pool.length === 0) {
            console.warn('[RoleRegistry] 角色池為空');
            return [];
        }

        const result: string[] = [];
        const available = [...pool];

        for (let i = 0; i < count; i++) {
            if (available.length === 0) {
                console.warn(`[RoleRegistry] 角色池耗盡，需要 ${count} 個角色，但只能提供 ${i} 個`);
                break;
            }

            const randomIndex = Math.floor(Math.random() * available.length);
            const selected = available[randomIndex];
            result.push(selected);

            if (!allowDuplicates) {
                available.splice(randomIndex, 1);
            }
        }

        return result;
    }

    /**
     * 檢查角色是否具有 Setup Ability
     */
    hasSetupAbility(roleId: string): boolean {
        const roleData = this.getRoleData(roleId);
        return roleData?.setup === true;
    }

    /**
     * 從角色列表中篩選出具有 Setup Ability 的角色
     */
    getSetupRoles(roleIds: string[]): string[] {
        return roleIds.filter(roleId => this.hasSetupAbility(roleId));
    }

    /**
     * 應用所有 Setup Abilities，調整角色分配
     *
     * @param selectedRoles - 已選中的爪牙和惡魔角色
     * @param baseDistribution - 基礎角色分配
     * @param playerCount - 玩家數量（用於檢查角色的 minPlayers 限制）
     * @returns 調整後的角色分配
     */
    applySetupAbilities(
        selectedRoles: string[],
        baseDistribution: RoleDistribution,
        playerCount: number
    ): RoleDistribution {
        const finalDistribution = { ...baseDistribution };

        // 檢查是否有男爵
        if (selectedRoles.includes('baron')) {
            const baronData = this.getRoleData('baron');
            const minPlayers = baronData?.minPlayers ?? 0;

            // 檢查玩家數量是否滿足男爵的最小要求（10人）
            if (playerCount < minPlayers) {
                console.warn(`[Baron] 玩家數量不足（${playerCount} < ${minPlayers}），跳過男爵效果`);
                // 不應用男爵效果，但男爵仍然在場
            } else {
                // 男爵效果：外來者 +2，鎮民 -2
                const townfolkReduction = Math.min(2, finalDistribution.townsfolk);

                finalDistribution.townsfolk -= townfolkReduction;
                finalDistribution.outsiders += townfolkReduction;

                console.log(`[Baron] 男爵生效：鎮民 ${baseDistribution.townsfolk} → ${finalDistribution.townsfolk}，外來者 ${baseDistribution.outsiders} → ${finalDistribution.outsiders}`);
            }
        }

        // 未來可擴展：檢查其他 Setup Ability 角色
        // if (selectedRoles.includes('godfather')) { ... }
        // if (selectedRoles.includes('fang_gu')) { ... }

        return finalDistribution;
    }
}


