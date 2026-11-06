import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { MockIPCService } from '../../../services/IPCService';
import { createStateSyncMiddleware } from '../stateSyncMiddleware';

interface TestState {
  phase: 'setup' | 'night' | 'day';
  players: unknown[];
  unrelated: number;
  bump: () => void;
}

function setup() {
  const ipc = new MockIPCService();
  const sent: unknown[] = [];
  ipc.on('state-sync', (data) => sent.push(data));
  const store = create<TestState>()(
    createStateSyncMiddleware(ipc)((set) => ({
      phase: 'setup',
      players: [],
      unrelated: 0,
      bump: () => set((s) => ({ unrelated: s.unrelated + 1 })),
    })),
  );
  return { store, sent };
}

describe('stateSyncMiddleware', () => {
  it('投影資料沒變時不送 IPC', () => {
    const { store, sent } = setup();
    store.getState().bump();
    store.getState().bump();
    expect(sent).toHaveLength(1);
  });

  it('投影資料有變時才送出', () => {
    const { store, sent } = setup();
    store.getState().bump();
    store.setState({ players: [{ seat: 1 }] });
    store.getState().bump();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toMatchObject({ phase: 'setup', playerCount: 1 });
  });
});
