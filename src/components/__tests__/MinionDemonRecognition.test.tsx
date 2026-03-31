import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MinionDemonRecognition from '../MinionDemonRecognition';
import type { Player } from '../../engine/types';

// ============================================================
// Mocks
// ============================================================

const mockSetSpecialNightPhase = vi.fn();

const mockDemon: Player = {
  seat: 1,
  name: '惡魔玩家',
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

const mockMinion: Player = {
  seat: 2,
  name: '爪牙玩家',
  role: 'poisoner',
  team: 'minion',
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
};

const mockRuleEngine = {
  processMinionDemonRecognition: vi.fn().mockReturnValue({ display: '說書人提示文字' }),
};

let mockMinions: Player[] = [mockMinion];
let mockDemonPlayer: Player | null = mockDemon;

vi.mock('../../store/gameStore', () => ({
  useGameStore: () => ({
    stateManager: {
      getMinionPlayers: () => mockMinions,
      getDemonPlayer: () => mockDemonPlayer,
    },
    ruleEngine: mockRuleEngine,
    roleRegistry: mockRoleRegistry,
    setSpecialNightPhase: mockSetSpecialNightPhase,
  }),
}));

// ============================================================
// Tests
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockMinions = [mockMinion];
  mockDemonPlayer = mockDemon;
});

describe('MinionDemonRecognition', () => {
  describe('無爪牙時', () => {
    it('顯示跳過提示和確認按鈕', () => {
      mockMinions = [];
      const onComplete = vi.fn();
      render(<MinionDemonRecognition onComplete={onComplete} />);

      expect(screen.getByText('此局無爪牙，跳過互認階段。')).toBeInTheDocument();
      expect(screen.getByText('確認跳過 →')).toBeInTheDocument();
    });

    it('點確認跳過後呼叫 onComplete', () => {
      mockMinions = [];
      const onComplete = vi.fn();
      render(<MinionDemonRecognition onComplete={onComplete} />);

      fireEvent.click(screen.getByText('確認跳過 →'));
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('有爪牙時的 step-based 流程', () => {
    it('初始顯示「提示惡魔」按鈕（wake_minions step）', () => {
      render(<MinionDemonRecognition onComplete={vi.fn()} />);
      expect(screen.getByText('提示惡魔 →')).toBeInTheDocument();
    });

    it('顯示爪牙和惡魔的玩家列表', () => {
      render(<MinionDemonRecognition onComplete={vi.fn()} />);
      expect(screen.getByText('惡魔玩家')).toBeInTheDocument();
      expect(screen.getByText('爪牙玩家')).toBeInTheDocument();
    });

    it('點「提示惡魔」後呼叫 setSpecialNightPhase(reveal_demon) 並顯示「提示爪牙」按鈕', () => {
      render(<MinionDemonRecognition onComplete={vi.fn()} />);

      fireEvent.click(screen.getByText('提示惡魔 →'));

      expect(mockSetSpecialNightPhase).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'reveal_demon' })
      );
      expect(screen.getByText('提示爪牙 →')).toBeInTheDocument();
    });

    it('點「提示爪牙」後呼叫 setSpecialNightPhase(reveal_minions) 並顯示「下一步」按鈕', () => {
      render(<MinionDemonRecognition onComplete={vi.fn()} />);

      fireEvent.click(screen.getByText('提示惡魔 →'));
      fireEvent.click(screen.getByText('提示爪牙 →'));

      expect(mockSetSpecialNightPhase).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'reveal_minions' })
      );
      expect(screen.getByText('下一步 →')).toBeInTheDocument();
    });

    it('點「下一步」後呼叫 onComplete', () => {
      const onComplete = vi.fn();
      render(<MinionDemonRecognition onComplete={onComplete} />);

      fireEvent.click(screen.getByText('提示惡魔 →'));
      fireEvent.click(screen.getByText('提示爪牙 →'));
      fireEvent.click(screen.getByText('下一步 →'));

      expect(onComplete).toHaveBeenCalledOnce();
    });
  });
});
