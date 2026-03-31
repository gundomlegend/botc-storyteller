import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DemonBluffs from '../DemonBluffs';
import type { Player } from '../../engine/types';

// ============================================================
// Mocks
// ============================================================

const mockSetSpecialNightPhase = vi.fn();
const mockGetDemonBluffs = vi.fn().mockReturnValue(['washerwoman', 'librarian', 'investigator']);

const mockDemon: Player = {
  seat: 3,
  name: '大惡魔',
  role: 'imp',
  team: 'demon',
  isAlive: true,
  isPoisoned: false,
  isDrunk: false,
  isProtected: false,
  believesRole: null,
  masterSeat: null,
  abilityUsed: false,
  hasDeathVote: false,
  hasMadeSlayerClaim: false,
  deathCause: null,
  deathNight: null,
  deathDay: null,
};

const mockRoleRegistry = {
  getPlayerRoleName: (player: Player) => player.role,
  // 中文名 vs 英文名不同，避免 getByText 多重命中
  getRoleName: (id: string) => `中_${id}`,
  getRoleData: (id: string) => ({ name: id }),
};

let mockPlayerCount = 7;

vi.mock('../../store/gameStore', () => ({
  useGameStore: () => ({
    stateManager: {
      getDemonPlayer: () => mockDemon,
      getState: () => ({ playerCount: mockPlayerCount }),
      getDemonBluffs: mockGetDemonBluffs,
    },
    roleRegistry: mockRoleRegistry,
    setSpecialNightPhase: mockSetSpecialNightPhase,
  }),
}));

// ============================================================
// Tests
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockPlayerCount = 7;
  mockGetDemonBluffs.mockReturnValue(['washerwoman', 'librarian', 'investigator']);
});

describe('DemonBluffs', () => {
  describe('人數不足時（< 7 人）', () => {
    it('顯示跳過提示和確認按鈕', () => {
      mockPlayerCount = 6;
      render(<DemonBluffs onComplete={vi.fn()} />);

      expect(screen.getByText('人數未達 7 人，跳過惡魔虛張聲勢。')).toBeInTheDocument();
      expect(screen.getByText('確認跳過 →')).toBeInTheDocument();
    });

    it('點確認跳過後呼叫 onComplete', () => {
      mockPlayerCount = 6;
      const onComplete = vi.fn();
      render(<DemonBluffs onComplete={onComplete} />);

      fireEvent.click(screen.getByText('確認跳過 →'));
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('人數足夠時的 step-based 流程', () => {
    it('初始顯示「展示偽裝」按鈕（wake_demon step）', () => {
      render(<DemonBluffs onComplete={vi.fn()} />);
      expect(screen.getByText('展示偽裝 →')).toBeInTheDocument();
    });

    it('mount 時呼叫 getDemonBluffs 讀取已生成的偽裝，不重新生成', () => {
      render(<DemonBluffs onComplete={vi.fn()} />);
      expect(mockGetDemonBluffs).toHaveBeenCalled();
    });

    it('顯示3個 bluff 的中文名稱', () => {
      render(<DemonBluffs onComplete={vi.fn()} />);
      // getRoleName 返回 '中_washerwoman' 等，確保可唯一定位
      expect(screen.getByText('中_washerwoman')).toBeInTheDocument();
      expect(screen.getByText('中_librarian')).toBeInTheDocument();
      expect(screen.getByText('中_investigator')).toBeInTheDocument();
    });

    it('點「展示偽裝」後呼叫 setSpecialNightPhase(show_bluffs) 並顯示「完成」按鈕', () => {
      render(<DemonBluffs onComplete={vi.fn()} />);

      fireEvent.click(screen.getByText('展示偽裝 →'));

      expect(mockSetSpecialNightPhase).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'show_bluffs' })
      );
      expect(screen.getByText('完成 →')).toBeInTheDocument();
    });

    it('點「完成」後呼叫 onComplete', () => {
      const onComplete = vi.fn();
      render(<DemonBluffs onComplete={onComplete} />);

      fireEvent.click(screen.getByText('展示偽裝 →'));
      fireEvent.click(screen.getByText('完成 →'));

      expect(onComplete).toHaveBeenCalledOnce();
    });
  });
});
