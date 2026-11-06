import { describe, it, expect } from 'vitest';

/**
 * `const { ... } = useGameStore()` 會訂閱整個 store，任何欄位變動都讓元件重繪。
 * 一律改用 selector：useGameStore(useShallow((s) => ({ ... })))。
 * 會在渲染時讀 stateManager 的元件，selector 要額外訂閱 players，否則狀態變了畫面不會更新。
 */
const sources = import.meta.glob(['../../**/*.{ts,tsx}', '!../../**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('store 訂閱方式', () => {
  it('沒有元件訂閱整個 store', () => {
    const offenders = Object.entries(sources)
      .filter(([, code]) => /useGameStore\(\s*\)/.test(code))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
