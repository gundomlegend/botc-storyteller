import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibrarianProcessor from '../LibrarianProcessor';
import type { NightOrderItem, Player, RoleData } from '../../../engine/types';

// ============================================================
// Mock dependencies
// ============================================================

const mockProcessAbility = vi.fn();
const mockLogEvent = vi.fn();
const mockGetPlayer = vi.fn();
const mockGetPlayerRoleName = vi.fn();
const mockGetRoleData = vi.fn();
const mockGetRoleName = vi.fn();
const mockGetAlivePlayers = vi.fn();

vi.mock('../../../store/gameStore', () => ({
  useGameStore: () => ({
    processAbility: mockProcessAbility,
    stateManager: {
      logEvent: mockLogEvent,
      getPlayer: mockGetPlayer,
      getAlivePlayers: mockGetAlivePlayers,
    },
    roleRegistry: {
      getPlayerRoleName: mockGetPlayerRoleName,
      getRoleData: mockGetRoleData,
      getRoleName: mockGetRoleName,
    },
  }),
}));

vi.mock('../../../hooks/usePlayerRealTimeStatus', () => ({
  usePlayerRealTimeStatus: () => ({
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    isDead: false,
  }),
}));

// ============================================================
// Helper functions
// ============================================================

function makePlayer(overrides: Partial<Player> & { seat: number }): Player {
  return {
    name: `Player${overrides.seat}`,
    role: 'townsfolk_stub',
    team: 'townsfolk',
    isAlive: true,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    believesRole: null,
    masterSeat: null,
    abilityUsed: false,
    deathCause: null,
    deathNight: null,
    deathDay: null,
    ...overrides,
  };
}

const LIBRARIAN_ROLE_DATA: RoleData = {
  id: 'librarian',
  name: 'Librarian',
  name_cn: '圖書管理員',
  team: 'townsfolk',
  ability: 'First night ability',
  ability_cn: '第一晚能力',
  firstNight: 13,
  firstNightReminder: 'Show the Librarian two players',
  firstNightReminder_cn: '展示兩名玩家給圖書管理員',
  otherNight: 0,
  otherNightReminder: '',
  otherNightReminder_cn: '',
  reminders: [],
  setup: false,
  affectedByPoison: true,
  affectedByDrunk: true,
  worksWhenDead: false,
};

// ============================================================
// Setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRoleData.mockReturnValue(LIBRARIAN_ROLE_DATA);
  mockGetRoleName.mockImplementation((roleId: string) => {
    if (roleId === 'butler') return '管家';
    if (roleId === 'recluse') return '陌客';
    if (roleId === 'drunk') return '酒鬼';
    if (roleId === 'saint') return '聖女';
    return roleId;
  });
  mockGetPlayerRoleName.mockImplementation((player: Player) => {
    if (player.role === 'butler') return '管家';
    if (player.role === 'recluse') return '陌客';
    if (player.role === 'drunk') return '酒鬼';
    return player.role;
  });
});

// ============================================================
// Tests
// ============================================================

describe('LibrarianProcessor', () => {
  const item: NightOrderItem = {
    seat: 1,
    role: 'librarian',
    roleName: '圖書管理員',
    priority: 13,
    isDead: false,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    reminder: '展示兩名玩家給圖書管理員',
  };

  const onDone = vi.fn();

  describe('無外來者情況', () => {
    it('應顯示「場上沒有任何外來者角色」並提供確認按鈕', () => {
      mockGetPlayer.mockReturnValue(makePlayer({ seat: 1, role: 'librarian' }));
      mockProcessAbility.mockReturnValue({
        action: 'show_info',
        info: {
          noOutsiderInGame: true,
        },
        mustFollow: false,
        canLie: true,
      });

      render(<LibrarianProcessor item={item} onDone={onDone} />);

      expect(screen.getByText('場上沒有任何外來者角色')).toBeInTheDocument();
      expect(screen.getByText('確認')).toBeInTheDocument();

      fireEvent.click(screen.getByText('確認'));
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('標準情況（有外來者）', () => {
    it('應顯示外來者列表和選擇界面', () => {
      const butler = makePlayer({ seat: 2, name: 'Bob', role: 'butler', team: 'outsider' });

      mockGetPlayer.mockReturnValue(makePlayer({ seat: 1, role: 'librarian' }));
      mockGetAlivePlayers.mockReturnValue([
        makePlayer({ seat: 1, role: 'librarian' }),
        butler,
        makePlayer({ seat: 3, name: 'Carol', role: 'monk', team: 'townsfolk' }),
      ]);

      mockProcessAbility.mockReturnValue({
        action: 'show_info',
        info: {
          outsiders: [{
            seat: 2,
            name: 'Bob',
            role: 'butler',
            roleName: '管家',
          }],
          recluses: [],
          hasSpy: false,
          hasRecluse: false,
          reliable: true,
          statusReason: '',
        },
        mustFollow: false,
        canLie: true,
      });

      render(<LibrarianProcessor item={item} onDone={onDone} />);

      // 應該顯示外來者列表
      expect(screen.getByText(/場上外來者/)).toBeInTheDocument();
      expect(screen.getByText(/2號 Bob（管家）/)).toBeInTheDocument();

      // 應該有選擇下拉選單
      expect(screen.getByLabelText(/選擇展示的外來者角色/)).toBeInTheDocument();
      expect(screen.getByLabelText(/選擇第一位玩家/)).toBeInTheDocument();
      expect(screen.getByLabelText(/選擇第二位玩家/)).toBeInTheDocument();
    });

    it('選擇完整後應能確認並記錄事件', () => {
      const butler = makePlayer({ seat: 2, name: 'Bob', role: 'butler', team: 'outsider' });

      mockGetPlayer.mockReturnValue(makePlayer({ seat: 1, role: 'librarian' }));
      mockGetAlivePlayers.mockReturnValue([
        makePlayer({ seat: 1, role: 'librarian' }),
        butler,
        makePlayer({ seat: 3, name: 'Carol', role: 'monk', team: 'townsfolk' }),
      ]);

      mockProcessAbility.mockReturnValue({
        action: 'show_info',
        info: {
          outsiders: [{
            seat: 2,
            name: 'Bob',
            role: 'butler',
            roleName: '管家',
          }],
          recluses: [],
          hasSpy: false,
          hasRecluse: false,
          reliable: true,
          statusReason: '',
        },
        mustFollow: false,
        canLie: true,
      });

      render(<LibrarianProcessor item={item} onDone={onDone} />);

      // 選擇外來者角色
      const roleSelect = screen.getByLabelText(/選擇展示的外來者角色/);
      fireEvent.change(roleSelect, { target: { value: 'butler' } });

      // 選擇第一位玩家
      const player1Select = screen.getByLabelText(/選擇第一位玩家/);
      fireEvent.change(player1Select, { target: { value: '2' } });

      // 選擇第二位玩家
      const player2Select = screen.getByLabelText(/選擇第二位玩家/);
      fireEvent.change(player2Select, { target: { value: '3' } });

      // 確認按鈕應該啟用
      const confirmButton = screen.getByText('確認');
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);

      // 應該記錄事件
      expect(mockLogEvent).toHaveBeenCalledWith({
        type: 'ability_use',
        description: expect.stringContaining('圖書管理員資訊'),
        details: {
          outsiderRole: 'butler',
          player1: 2,
          player2: 3,
        },
      });

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('只有間諜情況', () => {
    it('應顯示特殊提示並提供「給予無外來者資訊」按鈕', () => {
      mockGetPlayer.mockReturnValue(makePlayer({ seat: 1, role: 'librarian' }));
      mockGetAlivePlayers.mockReturnValue([
        makePlayer({ seat: 1, role: 'librarian' }),
        makePlayer({ seat: 2, name: 'Bob', role: 'spy', team: 'minion' }),
      ]);

      mockProcessAbility.mockReturnValue({
        action: 'show_info',
        info: {
          onlySpyInGame: true,
          spy: {
            seat: 2,
            name: 'Bob',
            role: 'spy',
            roleName: '間諜',
          },
          outsiders: [],
          recluses: [],
          hasSpy: false,
          hasRecluse: false,
        },
        mustFollow: false,
        canLie: true,
      });

      render(<LibrarianProcessor item={item} onDone={onDone} />);

      // 應該顯示特殊提示
      expect(screen.getByText(/只有間諜在場/)).toBeInTheDocument();
      expect(screen.getByText(/給予「無外來者」資訊/)).toBeInTheDocument();

      // 點擊「給予無外來者資訊」按鈕
      fireEvent.click(screen.getByText(/給予「無外來者」資訊/));

      expect(mockLogEvent).toHaveBeenCalledWith({
        type: 'ability_use',
        description: '圖書管理員資訊：告知場上沒有外來者',
        details: {
          noOutsider: true,
        },
      });

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('陌客情況', () => {
    it('應將陌客顯示在獨立列表中', () => {
      mockGetPlayer.mockReturnValue(makePlayer({ seat: 1, role: 'librarian' }));
      mockGetAlivePlayers.mockReturnValue([
        makePlayer({ seat: 1, role: 'librarian' }),
        makePlayer({ seat: 2, name: 'Bob', role: 'butler', team: 'outsider' }),
        makePlayer({ seat: 3, name: 'Carol', role: 'recluse', team: 'outsider' }),
      ]);

      mockProcessAbility.mockReturnValue({
        action: 'show_info',
        info: {
          outsiders: [{
            seat: 2,
            name: 'Bob',
            role: 'butler',
            roleName: '管家',
          }],
          recluses: [{
            seat: 3,
            name: 'Carol',
            role: 'recluse',
          }],
          hasSpy: false,
          hasRecluse: true,
          reliable: true,
          statusReason: '',
        },
        mustFollow: false,
        canLie: true,
      });

      render(<LibrarianProcessor item={item} onDone={onDone} />);

      // 應該顯示外來者列表
      expect(screen.getByText(/場上外來者/)).toBeInTheDocument();
      expect(screen.getByText(/2號 Bob（管家）/)).toBeInTheDocument();

      // 應該顯示陌客獨立列表
      expect(screen.getByText(/陌客（可選擇不視為外來者）/)).toBeInTheDocument();
      expect(screen.getByText(/3號 Carol/)).toBeInTheDocument();

      // 應該顯示提示
      expect(screen.getByText(/陌客能力正常，可選擇不視為外來者/)).toBeInTheDocument();
    });
  });
});
