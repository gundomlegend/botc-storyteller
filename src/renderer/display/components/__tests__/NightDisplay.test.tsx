import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NightDisplay } from '../NightDisplay';
import type { SpecialNightPhase } from '../../../../engine/types';

// ============================================================
// Mock BaseDisplay（display 視窗的容器，不影響內容測試）
// ============================================================

vi.mock('../../BaseDisplay', () => ({
  BaseDisplay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ============================================================
// Tests
// ============================================================

describe('NightDisplay', () => {
  describe('一般角色行動', () => {
    it('waking：顯示「請睜眼」', () => {
      render(
        <NightDisplay
          night={1}
          nightAction={{ index: 0, seat: 3, roleName: '占卜師', phase: 'waking' }}
          specialPhase={null}
        />
      );
      expect(screen.getByText('3號 占卜師 請睜眼')).toBeInTheDocument();
    });

    it('closing：顯示「請閉眼」', () => {
      render(
        <NightDisplay
          night={1}
          nightAction={{ index: 0, seat: 5, roleName: '廚師', phase: 'closing' }}
          specialPhase={null}
        />
      );
      expect(screen.getByText('5號 請閉眼')).toBeInTheDocument();
    });
  });

  describe('特殊階段（specialPhase）', () => {
    it('recognition_title：顯示 message', () => {
      const phase: SpecialNightPhase = { type: 'recognition_title', message: '爪牙與惡魔互認' };
      render(<NightDisplay night={1} nightAction={null} specialPhase={phase} />);
      expect(screen.getByText('爪牙與惡魔互認')).toBeInTheDocument();
    });

    it('reveal_demon：顯示「惡魔」標題和紫色卡片', () => {
      const phase: SpecialNightPhase = { type: 'reveal_demon', message: '1號 惡魔玩家' };
      render(<NightDisplay night={1} nightAction={null} specialPhase={phase} />);
      expect(screen.getByText('惡魔')).toBeInTheDocument();
      const card = screen.getByText('1號 惡魔玩家');
      expect(card).toBeInTheDocument();
      expect(card.className).toBe('display-demon-card');
    });

    it('reveal_minions：顯示爪牙卡片', () => {
      const phase: SpecialNightPhase = {
        type: 'reveal_minions',
        message: '爪牙',
        data: { minions: ['2號 爪牙甲', '3號 爪牙乙'] },
      };
      render(<NightDisplay night={1} nightAction={null} specialPhase={phase} />);
      expect(screen.getByText('爪牙')).toBeInTheDocument();
      expect(screen.getByText('2號 爪牙甲')).toBeInTheDocument();
      expect(screen.getByText('3號 爪牙乙')).toBeInTheDocument();
    });

    it('show_bluffs：顯示三張偽裝角色卡片', () => {
      const phase: SpecialNightPhase = {
        type: 'show_bluffs',
        message: '偽裝角色',
        data: { bluffs: ['洗衣婦', '圖書館員', '調查員'] },
      };
      render(<NightDisplay night={1} nightAction={null} specialPhase={phase} />);
      expect(screen.getByText('偽裝角色')).toBeInTheDocument();
      expect(screen.getByText('洗衣婦')).toBeInTheDocument();
      expect(screen.getByText('圖書館員')).toBeInTheDocument();
      expect(screen.getByText('調查員')).toBeInTheDocument();
    });
  });

  describe('預設狀態', () => {
    it('無 nightAction 也無 specialPhase 時顯示「所有人保持閉眼」', () => {
      render(<NightDisplay night={1} nightAction={null} specialPhase={null} />);
      expect(screen.getByText('所有人保持閉眼')).toBeInTheDocument();
    });
  });
});
