import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerSelector } from '../PlayerSelector';
import type { Player } from '../../engine/types';

// ============================================================
// Mock useGameStore
// ============================================================

const mockPlayers: Player[] = [];

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (s: { players: Player[] }) => Player[]) =>
    selector({ players: mockPlayers }),
}));

// ============================================================
// Helper
// ============================================================

function makeTestPlayer(overrides: Partial<Player> & { seat: number }): Player {
  return {
    name: `Player${overrides.seat}`,
    role: 'townsfolk_stub',
    team: 'townsfolk',
    isAlive: true,
    isPoisoned: false,
    isDrunk: false,
    isProtected: false,
    believesRole: null,
    abilityUsed: false,
    deathCause: null,
    deathNight: null,
    deathDay: null,
    ...overrides,
  };
}

// ============================================================
// Setup: 5 players, player 2 is dead
// ============================================================

beforeEach(() => {
  mockPlayers.length = 0;
  mockPlayers.push(
    makeTestPlayer({ seat: 1, name: 'Alice' }),
    makeTestPlayer({ seat: 2, name: 'Bob', isAlive: false, deathNight: 1 }),
    makeTestPlayer({ seat: 3, name: 'Carol' }),
    makeTestPlayer({ seat: 4, name: 'Dave', team: 'minion', role: 'poisoner' }),
    makeTestPlayer({ seat: 5, name: 'Eve', team: 'demon', role: 'imp' }),
  );
});

// ============================================================
// Tests
// ============================================================

describe('PlayerSelector', () => {
  // ----- single mode -----

  describe('single mode', () => {
    it('should call onSelect with Player[] of length 1 on click', () => {
      const onSelect = vi.fn();
      render(<PlayerSelector mode="single" onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0]).toHaveLength(1);
      expect(onSelect.mock.calls[0][0][0]).toMatchObject({ seat: 1, name: 'Alice' });
    });

    it('should not allow selecting self when canSelectSelf=false', () => {
      const onSelect = vi.fn();
      const onError = vi.fn();
      render(
        <PlayerSelector
          mode="single"
          canSelectSelf={false}
          currentPlayerSeat={1}
          onSelect={onSelect}
          onError={onError}
        />
      );

      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('不能選擇自己');
    });

    it('should disable dead players when onlyAlive=true', () => {
      const onSelect = vi.fn();
      const onError = vi.fn();
      render(
        <PlayerSelector
          mode="single"
          onlyAlive={true}
          onSelect={onSelect}
          onError={onError}
        />
      );

      fireEvent.click(screen.getByText('Bob'));
      expect(onSelect).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('不能選擇死亡玩家');
    });
  });

  // ----- double mode -----

  describe('double mode', () => {
    it('should call onSelect with Player[] of length 2 after two clicks', () => {
      const onSelect = vi.fn();
      render(<PlayerSelector mode="double" onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Carol'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0]).toHaveLength(2);
      expect(onSelect.mock.calls[0][0][0]).toMatchObject({ seat: 1 });
      expect(onSelect.mock.calls[0][0][1]).toMatchObject({ seat: 3 });
    });

    it('should show hint after first selection', () => {
      const onSelect = vi.fn();
      render(<PlayerSelector mode="double" onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(screen.getByText(/已選擇 1號/)).toBeInTheDocument();
    });
  });

  // ----- multiple mode -----

  describe('multiple mode', () => {
    it('should toggle selection and call onSelect each time', () => {
      const onSelect = vi.fn();
      render(<PlayerSelector mode="multiple" onSelect={onSelect} />);

      // Select Alice
      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0]).toHaveLength(1);

      // Select Carol
      fireEvent.click(screen.getByText('Carol'));
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect.mock.calls[1][0]).toHaveLength(2);

      // Deselect Alice
      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).toHaveBeenCalledTimes(3);
      expect(onSelect.mock.calls[2][0]).toHaveLength(1);
      expect(onSelect.mock.calls[2][0][0]).toMatchObject({ seat: 3 });
    });
  });

  // ----- display mode -----

  describe('display mode', () => {
    it('should not call onSelect on click (readOnly)', () => {
      const onSelect = vi.fn();
      render(<PlayerSelector mode="display" onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should apply highlighted class to highlightPlayers', () => {
      const onSelect = vi.fn();
      render(
        <PlayerSelector
          mode="display"
          highlightPlayers={[1, 3]}
          onSelect={onSelect}
        />
      );

      const aliceCard = screen.getByText('Alice').closest('.player-card');
      const bobCard = screen.getByText('Bob').closest('.player-card');
      expect(aliceCard?.className).toContain('highlighted');
      expect(bobCard?.className).not.toContain('highlighted');
    });
  });

  // ----- filtering -----

  describe('filtering', () => {
    it('should exclude players in excludePlayers', () => {
      const onSelect = vi.fn();
      const onError = vi.fn();
      render(
        <PlayerSelector
          mode="single"
          excludePlayers={[3]}
          onSelect={onSelect}
          onError={onError}
        />
      );

      fireEvent.click(screen.getByText('Carol'));
      expect(onSelect).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('不能選擇此玩家');
    });

    it('should hide dead players when showDeadPlayers=false', () => {
      const onSelect = vi.fn();
      render(
        <PlayerSelector
          mode="single"
          showDeadPlayers={false}
          onSelect={onSelect}
        />
      );

      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  // ----- error handling -----

  describe('error handling', () => {
    it('should call onError when clicking a non-selectable player', () => {
      const onSelect = vi.fn();
      const onError = vi.fn();
      render(
        <PlayerSelector
          mode="single"
          onlyAlive={true}
          onSelect={onSelect}
          onError={onError}
        />
      );

      // Bob is dead
      fireEvent.click(screen.getByText('Bob'));
      expect(onError).toHaveBeenCalledWith('不能選擇死亡玩家');
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
