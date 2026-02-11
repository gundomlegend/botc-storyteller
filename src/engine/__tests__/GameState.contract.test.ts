/**
 * GameState Contract Tests
 *
 * 對應文件：
 * - docs/contracts/GameState.contract.md（State Contract 1-8 + 測試 1-11）
 * - docs/contracts/AbilityInvalidation.contract.md（T3, T4, T6）
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../GameState';

// ============================================================
// 輔助：建立常用測試場景
// ============================================================

function createMinimalManager() {
  const m = new GameStateManager();
  m.initializePlayers([
    { seat: 1, name: 'A', role: 'fortuneteller' },
    { seat: 2, name: 'B', role: 'imp' },
  ]);
  return m;
}

function createFullManager() {
  const m = new GameStateManager();
  m.initializePlayers([
    { seat: 1, name: 'A', role: 'poisoner' },
    { seat: 2, name: 'B', role: 'monk' },
    { seat: 3, name: 'C', role: 'fortuneteller' },
    { seat: 4, name: 'D', role: 'imp' },
    { seat: 5, name: 'E', role: 'empath' },
  ]);
  return m;
}

// ============================================================
// State Contract（GameState.contract.md）
// ============================================================

describe('State Contract', () => {
  // Contract 1: 玩家 seat 唯一且不可重複
  describe('Contract 1: seat 唯一性', () => {
    it('初始化後每個 seat 都可查詢到', () => {
      const m = createMinimalManager();
      expect(m.getPlayer(1)?.role).toBe('fortuneteller');
      expect(m.getPlayer(2)?.role).toBe('imp');
    });

    it('相同 seat 後者覆蓋前者（Map 語義）', () => {
      const m = new GameStateManager();
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'imp' },
        { seat: 1, name: 'B', role: 'monk' },
      ]);
      // Map.set 會覆蓋，最終只有一位
      expect(m.getAllPlayers()).toHaveLength(1);
      expect(m.getPlayer(1)?.name).toBe('B');
    });
  });

  // Contract 3: 同一狀態不可重複加入（幂等）
  describe('Contract 3: 狀態不可重複加入', () => {
    it('重複 addStatus poisoned 不產生額外效果', () => {
      const m = createMinimalManager();
      m.startNight();
      m.addStatus(1, 'poisoned', 2);
      m.addStatus(1, 'poisoned', 2);
      expect(m.hasStatus(1, 'poisoned')).toBe(true);
      // isPoisoned 仍為 true，沒有副作用
    });
  });

  // Contract 4: history 只能 append
  describe('Contract 4: history 只能 append', () => {
    it('logEvent 只增不減', () => {
      const m = createMinimalManager();
      const before = m.getHistory().length;
      m.logEvent({ type: 'init', description: 'test', details: {} });
      expect(m.getHistory().length).toBe(before + 1);
    });

    it('多次 logEvent 持續增長', () => {
      const m = createMinimalManager();
      const before = m.getHistory().length;
      m.logEvent({ type: 'init', description: '1', details: {} });
      m.logEvent({ type: 'init', description: '2', details: {} });
      m.logEvent({ type: 'init', description: '3', details: {} });
      expect(m.getHistory().length).toBe(before + 3);
    });
  });

  // Contract 5: startNight 清除 protected
  describe('Contract 5: startNight 清除 protected', () => {
    it('保護狀態在新夜晚開始時被清除', () => {
      const m = createMinimalManager();
      m.startNight();
      m.addStatus(1, 'protected', 2);
      expect(m.hasStatus(1, 'protected')).toBe(true);

      m.startDay();
      m.startNight(); // 第二夜
      expect(m.hasStatus(1, 'protected')).toBe(false);
    });
  });

  // Contract 6: startNight 清除 poisoned（中毒持續到隔日白天）
  describe('Contract 6: startNight 清除 poisoned', () => {
    it('N1 下毒 → D1 仍中毒 → N2 失效', () => {
      const m = new GameStateManager();
      m.initializePlayers([
        { seat: 1, name: 'A', role: 'poisoner' },
        { seat: 2, name: 'B', role: 'monk' },
      ]);

      // N1
      m.startNight();
      m.addStatus(2, 'poisoned', 1);

      // D1 — 仍中毒
      m.startDay();
      expect(m.hasStatus(2, 'poisoned')).toBe(true);

      // N2 — 失效
      m.startNight();
      expect(m.hasStatus(2, 'poisoned')).toBe(false);
    });
  });

  // Contract 7: 已死亡玩家不可再獲得狀態
  describe('Contract 7: 死亡後不可加狀態', () => {
    it('addStatus 對已死亡玩家靜默忽略', () => {
      const m = createMinimalManager();
      m.startNight();
      m.killPlayer(1, 'demon_kill');
      m.addStatus(1, 'poisoned', 2);
      expect(m.hasStatus(1, 'poisoned')).toBe(false);
    });

    it('addStatus protected 對死亡玩家也靜默忽略', () => {
      const m = createMinimalManager();
      m.startNight();
      m.killPlayer(1, 'demon_kill');
      m.addStatus(1, 'protected', 2);
      expect(m.hasStatus(1, 'protected')).toBe(false);
    });
  });
});

// ============================================================
// 合約測試 1-11（GameState.contract.md 測試用例）
// ============================================================

describe('Contract Tests (GameState.contract.md 測試用例)', () => {
  // 測試 1: 基本初始化
  it('測試 1: 基本初始化', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: '測試1', role: 'fortuneteller' },
      { seat: 2, name: '測試2', role: 'imp' },
    ]);

    expect(m.getAllPlayers().length).toBe(2);
    expect(m.getPlayer(1)?.role).toBe('fortuneteller');
    expect(m.getPlayer(1)?.isAlive).toBe(true);
  });

  // 測試 2: 狀態管理
  it('測試 2: 狀態管理', () => {
    const m = createMinimalManager();
    m.startNight();

    m.addStatus(1, 'poisoned', 99);
    expect(m.hasStatus(1, 'poisoned')).toBe(true);

    m.addStatus(2, 'protected', 99);
    expect(m.hasStatus(2, 'protected')).toBe(true);

    // 開始下一夜 → 清除 protected
    m.startDay();
    m.startNight();
    expect(m.hasStatus(2, 'protected')).toBe(false);
  });

  // 測試 3: 夜間順序生成
  it('測試 3: 夜間順序生成', () => {
    const m = createMinimalManager();
    m.startNight();
    const order = m.generateNightOrder(true);

    expect(order.length).toBeGreaterThan(0);
    // 排序正確（跳過 seat=0 的特殊階段）
    const roleItems = order.filter(i => i.seat !== 0);
    for (let i = 1; i < roleItems.length; i++) {
      expect(roleItems[i].priority).toBeGreaterThanOrEqual(roleItems[i - 1].priority);
    }

    const ftItem = order.find(i => i.role === 'fortuneteller');
    expect(ftItem).toBeDefined();
    expect(ftItem!.reminder.length).toBeGreaterThan(0);
  });

  // 測試 4: 死亡處理
  it('測試 4: 死亡處理', () => {
    const m = createMinimalManager();
    m.startNight();
    m.killPlayer(1, 'demon_kill');

    const player = m.getPlayer(1);
    expect(player?.isAlive).toBe(false);
    expect(player?.deathCause).toBe('demon_kill');

    const alive = m.getAlivePlayers();
    expect(alive.length).toBe(1);
    expect(alive[0].seat).toBe(2);
  });

  // 測試 5: Seat 唯一性（重複 seat 覆蓋）
  it('測試 5: Seat 唯一性', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'imp' },
      { seat: 1, name: 'B', role: 'monk' },
    ]);
    // Map 語義：後者覆蓋前者
    expect(m.getAllPlayers()).toHaveLength(1);
  });

  // 測試 6: 死亡後不可加狀態（=== AbilityInvalidation T6）
  it('測試 6: 死亡後不可加狀態', () => {
    const m = createMinimalManager();
    m.startNight();
    m.killPlayer(1, 'demon_kill');
    m.addStatus(1, 'poisoned', 99);
    expect(m.hasStatus(1, 'poisoned')).toBe(false);
  });

  // 測試 7: 保護清除
  it('測試 7: 保護清除', () => {
    const m = createMinimalManager();
    m.startNight();
    m.addStatus(2, 'protected', 99);
    m.startDay();
    m.startNight();
    expect(m.hasStatus(2, 'protected')).toBe(false);
  });

  // 測試 8: 歷史不可修改
  it('測試 8: 歷史不可修改', () => {
    const m = createMinimalManager();
    const old = m.getHistory().length;
    m.logEvent({ type: 'init', description: 'x', details: {} });
    expect(m.getHistory().length).toBe(old + 1);
  });

  // 測試 9: addStatus 記錄 sourceSeat 並支援 revokeEffectsFrom（=== AbilityInvalidation T3）
  it('測試 9: killPlayer 自動撤銷該玩家施加的持續性狀態', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'poisoner' },
      { seat: 2, name: 'B', role: 'monk' },
      { seat: 3, name: 'C', role: 'fortuneteller' },
    ]);
    m.startNight();

    // Poisoner(1) 對 FortuneTeller(3) 下毒
    m.addStatus(3, 'poisoned', 1);
    expect(m.hasStatus(3, 'poisoned')).toBe(true);

    // Poisoner(1) 死亡 → 自動 revokeEffectsFrom(1, 'death')
    m.killPlayer(1, 'execution');

    // FortuneTeller(3) 的中毒應已被撤銷
    expect(m.hasStatus(3, 'poisoned')).toBe(false);
  });

  // 測試 10: replaceRole 撤銷舊角色持續狀態（=== AbilityInvalidation T4）
  it('測試 10: replaceRole 自動撤銷舊角色持續狀態', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'monk' },
      { seat: 2, name: 'B', role: 'imp' },
      { seat: 3, name: 'C', role: 'fortuneteller' },
    ]);
    m.startNight();

    // Monk(1) 保護 FortuneTeller(3)
    m.addStatus(3, 'protected', 1);
    expect(m.hasStatus(3, 'protected')).toBe(true);

    // Monk(1) 角色被替換 → 自動 revokeEffectsFrom(1, 'role_change')
    m.replaceRole(1, 'imp');

    // FortuneTeller(3) 的保護應已被撤銷
    expect(m.hasStatus(3, 'protected')).toBe(false);
    // Monk(1) 角色已變更
    expect(m.getPlayer(1)?.role).toBe('imp');
  });

  // 測試 11: 中毒直到下一晚失效
  it('測試 11: 中毒持續到隔日白天，進入下一夜失效', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'poisoner' },
      { seat: 2, name: 'B', role: 'monk' },
    ]);

    // N1
    m.startNight();
    m.addStatus(2, 'poisoned', 1);

    // D1 — 仍應中毒
    m.startDay();
    expect(m.hasStatus(2, 'poisoned')).toBe(true);

    // N2 — 中毒必須失效
    m.startNight();
    expect(m.hasStatus(2, 'poisoned')).toBe(false);
  });
});

// ============================================================
// Ability Invalidation Contract Tests（AbilityInvalidation.contract.md）
// T3, T4, T6 已在上方測試 9, 10, 6 覆蓋
// ============================================================

describe('Ability Invalidation — GameState 層（AC2, AC3）', () => {
  let m: GameStateManager;

  beforeEach(() => {
    m = createFullManager();
    m.startNight();
  });

  // AC2: 死亡類失效 — 即時撤銷持續狀態
  describe('AC2: 死亡類失效', () => {
    it('Poisoner 死亡後，其下毒目標立即解毒', () => {
      m.addStatus(3, 'poisoned', 1); // Poisoner(1) → FT(3)
      expect(m.hasStatus(3, 'poisoned')).toBe(true);

      m.killPlayer(1, 'execution');
      expect(m.hasStatus(3, 'poisoned')).toBe(false);
    });

    it('Monk 死亡後，其保護目標立即失去保護', () => {
      m.addStatus(5, 'protected', 2); // Monk(2) → Empath(5)
      expect(m.hasStatus(5, 'protected')).toBe(true);

      m.killPlayer(2, 'demon_kill');
      expect(m.hasStatus(5, 'protected')).toBe(false);
    });

    it('同一來源施加多個效果，死亡時全部撤銷', () => {
      m.addStatus(3, 'poisoned', 1); // Poisoner(1) → FT(3)
      m.addStatus(5, 'poisoned', 1); // Poisoner(1) → Empath(5)（假設可以）

      m.killPlayer(1, 'execution');
      expect(m.hasStatus(3, 'poisoned')).toBe(false);
      expect(m.hasStatus(5, 'poisoned')).toBe(false);
    });
  });

  // AC3: 角色轉變類失效
  describe('AC3: 角色轉變類失效', () => {
    it('replaceRole 撤銷舊角色施加的所有持續狀態', () => {
      m.addStatus(3, 'protected', 2); // Monk(2) → FT(3)
      m.replaceRole(2, 'imp');

      expect(m.hasStatus(3, 'protected')).toBe(false);
      expect(m.getPlayer(2)?.role).toBe('imp');
      expect(m.getPlayer(2)?.team).toBe('demon');
    });

    it('replaceRole 不影響其他玩家施加的狀態', () => {
      m.addStatus(3, 'poisoned', 1); // Poisoner(1) → FT(3)
      m.addStatus(3, 'protected', 2); // Monk(2) → FT(3)

      // 替換 Monk(2) 的角色
      m.replaceRole(2, 'imp');

      // Poisoner(1) 施加的毒仍在
      expect(m.hasStatus(3, 'poisoned')).toBe(true);
      // Monk(2) 施加的保護已撤銷
      expect(m.hasStatus(3, 'protected')).toBe(false);
    });
  });
});

// ============================================================
// 額外邊界情境
// ============================================================

describe('邊界情境', () => {
  it('不存在的玩家 — getPlayer 回傳 undefined', () => {
    const m = createMinimalManager();
    expect(m.getPlayer(999)).toBeUndefined();
  });

  it('不存在的玩家 — hasStatus 回傳 false', () => {
    const m = createMinimalManager();
    expect(m.hasStatus(999, 'poisoned')).toBe(false);
  });

  it('不存在的角色 — initializePlayers 拋錯', () => {
    const m = new GameStateManager();
    expect(() => {
      m.initializePlayers([{ seat: 1, name: 'X', role: 'nonexistent_role' }]);
    }).toThrow('Unknown role');
  });

  it('replaceRole 用不存在的角色 — 拋錯', () => {
    const m = createMinimalManager();
    expect(() => m.replaceRole(1, 'nonexistent_role')).toThrow('Unknown role');
  });

  it('killPlayer 記錄正確的 deathNight / deathDay', () => {
    const m = createMinimalManager();
    m.startNight(); // night=1
    m.killPlayer(1, 'demon_kill');
    expect(m.getPlayer(1)?.deathNight).toBe(1);
    expect(m.getPlayer(1)?.deathDay).toBeNull();

    m.startDay(); // day=1
    m.killPlayer(2, 'execution');
    expect(m.getPlayer(2)?.deathDay).toBe(1);
    expect(m.getPlayer(2)?.deathNight).toBeNull();
  });

  it('generateDemonBluffs 不包含已分配角色', () => {
    const m = createFullManager();
    const assignedRoles = new Set(m.getState().selectedRoles);
    const bluffs = m.generateDemonBluffs();

    expect(bluffs).toHaveLength(3);
    for (const b of bluffs) {
      expect(assignedRoles.has(b)).toBe(false);
    }
  });

  it('getMinionPlayers / getDemonPlayer 回傳正確', () => {
    const m = createFullManager();
    const minions = m.getMinionPlayers();
    const demon = m.getDemonPlayer();

    expect(minions.length).toBeGreaterThanOrEqual(1);
    expect(minions.every(p => p.team === 'minion')).toBe(true);
    expect(demon).toBeDefined();
    expect(demon!.team).toBe('demon');
  });

  it('getAlignment 善良 / 邪惡判定正確', () => {
    const m = createFullManager();
    const ft = m.getPlayer(3)!; // fortuneteller = townsfolk
    const imp = m.getPlayer(4)!; // imp = demon

    expect(m.getAlignment(ft)).toBe('good');
    expect(m.getAlignment(imp)).toBe('evil');
  });
});

// ============================================================
// Butler Master 管理
// ============================================================

describe('Butler Master 管理', () => {
  function createButlerManager() {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'butler' },
      { seat: 2, name: 'B', role: 'monk' },
      { seat: 3, name: 'C', role: 'fortuneteller' },
    ]);
    return m;
  }

  it('setButlerMaster 記錄主人', () => {
    const m = createButlerManager();
    m.startNight();
    m.setButlerMaster(2);
    expect(m.getButlerMaster()).toBe(2);
  });

  it('getButlerMaster 初始為 null', () => {
    const m = createButlerManager();
    expect(m.getButlerMaster()).toBeNull();
  });

  it('setButlerMaster 可更換主人', () => {
    const m = createButlerManager();
    m.startNight();
    m.setButlerMaster(2);
    expect(m.getButlerMaster()).toBe(2);

    m.setButlerMaster(3);
    expect(m.getButlerMaster()).toBe(3);
  });

  it('不能選自己為主人', () => {
    const m = createButlerManager();
    m.startNight();
    m.setButlerMaster(1); // butler 自己的座位
    expect(m.getButlerMaster()).toBeNull();
  });

  it('不能選死亡玩家為主人', () => {
    const m = createButlerManager();
    m.startNight();
    m.killPlayer(2, 'demon_kill');
    m.setButlerMaster(2);
    expect(m.getButlerMaster()).toBeNull();
  });

  it('無管家時 getButlerMaster 回傳 null', () => {
    const m = new GameStateManager();
    m.initializePlayers([
      { seat: 1, name: 'A', role: 'monk' },
      { seat: 2, name: 'B', role: 'imp' },
    ]);
    expect(m.getButlerMaster()).toBeNull();
  });

  it('setButlerMaster 記錄事件', () => {
    const m = createButlerManager();
    m.startNight();
    const before = m.getHistory().length;
    m.setButlerMaster(2);
    expect(m.getHistory().length).toBe(before + 1);
    expect(m.getHistory()[m.getHistory().length - 1].type).toBe('butler_master');
  });
});
