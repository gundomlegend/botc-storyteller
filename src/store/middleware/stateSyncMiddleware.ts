/**
 * State Sync Middleware - Middleware Pattern
 * 集中化狀態同步邏輯，避免散落各處
 */

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type { IPCService } from '../../services/IPCService';
import { selectDisplayState } from '../selectors/displayStateSelectors';

type StateSyncMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>;

/**
 * Create state sync middleware
 * @param ipcService - IPC service for communication
 * @returns Zustand middleware
 */
export const createStateSyncMiddleware = (ipcService: IPCService): StateSyncMiddleware => {
  return (config) => (set, get, api) => {
    // Subscribe to all state changes
    api.subscribe((state) => {
      try {
        // Use selector to filter state (Strategy Pattern)
        const syncData = selectDisplayState(state as any);

        // Send via IPC
        ipcService.send('state-sync', syncData);
      } catch (error) {
        // Don't crash the app if IPC fails
        console.error('State sync failed:', error);
      }
    });

    return config(set, get, api);
  };
};
