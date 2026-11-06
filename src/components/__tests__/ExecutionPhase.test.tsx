import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionPhase } from '../ExecutionPhase';
import type { Player } from '../../engine/types';

// ============================================================
// Fixtures
// ============================================================

function makePlayer(seat: number, name: string): Player {
  return {
    seat,
    name,
    role: 'villager',
    team: 'townsfolk',
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
}

const players: Player[] = [
  makePlayer(1, '甲'),
  makePlayer(2, '乙'),
  makePlayer(3, '丙'),
  makePlayer(4, '丁'),
];

const roleRegistry = {
  getRoleName: (id: string) => `中_${id}`,
  getPlayerRoleName: (p: Player) => p.role,
};

function renderPhase(
  nominationHistory: Array<{ nominatorSeat: number; nomineeSeat: number; voteCount: number; passed: boolean }>,
  overrides: Partial<{ onExecute: (seat: number) => void; onNoExecution: () => void }> = {}
) {
  const onExecute = overrides.onExecute ?? vi.fn();
  const onNoExecution = overrides.onNoExecution ?? vi.fn();
  render(
    <ExecutionPhase
      nominationHistory={nominationHistory}
      players={players}
      roleRegistry={roleRegistry}
      onExecute={onExecute}
      onNoExecution={onNoExecution}
    />
  );
  return { onExecute, onNoExecution };
}

// ============================================================
// Tests
// ============================================================

describe('ExecutionPhase — 處決門檻', () => {
  it('未達門檻的最高票不得被處決（核心 bug）', () => {
    // 乙拿 3 票但未過門檻；甲拿 2 票且過門檻 → 應處決甲，而非票數較高的乙
    const { onExecute } = renderPhase([
      { nominatorSeat: 1, nomineeSeat: 2, voteCount: 3, passed: false },
      { nominatorSeat: 3, nomineeSeat: 1, voteCount: 2, passed: true },
    ]);

    // 處決對象應為甲（座位 1），不是票數更高但未過門檻的乙
    const executeBtn = screen.getByRole('button', { name: /處決 甲/ });
    fireEvent.click(executeBtn);
    expect(onExecute).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('button', { name: /處決 乙/ })).not.toBeInTheDocument();
  });

  it('所有提名都未過門檻時，沒有處決', () => {
    const { onExecute } = renderPhase([
      { nominatorSeat: 1, nomineeSeat: 2, voteCount: 1, passed: false },
      { nominatorSeat: 3, nomineeSeat: 4, voteCount: 1, passed: false },
    ]);

    expect(screen.getByText('今天沒有有效票數，無需處決。')).toBeInTheDocument();
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('只有一個過門檻的提名時，處決該對象', () => {
    const { onExecute } = renderPhase([
      { nominatorSeat: 1, nomineeSeat: 3, voteCount: 2, passed: true },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /處決 丙/ }));
    expect(onExecute).toHaveBeenCalledWith(3);
  });

  it('兩個過門檻的提名平票時，沒有處決', () => {
    renderPhase([
      { nominatorSeat: 1, nomineeSeat: 2, voteCount: 2, passed: true },
      { nominatorSeat: 3, nomineeSeat: 4, voteCount: 2, passed: true },
    ]);

    expect(screen.getByText(/最高票平手/)).toBeInTheDocument();
  });

  it('沒有任何提名時，顯示無需處決', () => {
    renderPhase([]);
    expect(screen.getByText('今天沒有提名')).toBeInTheDocument();
  });
});
