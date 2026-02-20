/**
 * IPC Service - Adapter Pattern
 * 抽象 Electron IPC 通訊，提供可測試的介面
 */

export interface IPCService {
  send(channel: string, data: unknown): void;
  on(channel: string, callback: (data: unknown) => void): void;
  removeListener(channel: string, callback: (data: unknown) => void): void;
}

/**
 * Electron IPC Service Implementation
 * 用於 renderer process，透過 window.electronAPI 與 main process 通訊
 */
export class ElectronIPCService implements IPCService {
  send(channel: string, data: unknown): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.send(channel, data);
    }
  }

  on(channel: string, callback: (data: unknown) => void): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.on(channel, callback);
    }
  }

  removeListener(_channel: string, _callback: (data: unknown) => void): void {
    // Electron IPC 的 removeListener 需要透過 ipcRenderer
    // 目前 preload.ts 沒有暴露 removeListener，暫時留空
    // TODO: Phase 2 - 如需要可在 preload.ts 新增 removeListener
    console.warn('ElectronIPCService.removeListener not implemented yet');
  }
}

/**
 * Mock IPC Service Implementation
 * 用於測試環境，模擬 IPC 通訊
 */
export class MockIPCService implements IPCService {
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  send(channel: string, data: unknown): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((callback) => callback(data));
    }
  }

  on(channel: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);
  }

  removeListener(channel: string, callback: (data: unknown) => void): void {
    this.listeners.get(channel)?.delete(callback);
  }

  /**
   * 測試用：清空所有 listeners
   */
  clearAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * 測試用：取得指定 channel 的 listener 數量
   */
  getListenerCount(channel: string): number {
    return this.listeners.get(channel)?.size ?? 0;
  }
}

// TypeScript 全域宣告
declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: unknown) => void;
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      invoke: (channel: string, data: unknown) => Promise<unknown>;
    };
  }
}
