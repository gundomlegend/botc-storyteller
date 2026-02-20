import { MockIPCService, ElectronIPCService } from '../IPCService';

describe('MockIPCService', () => {
  let mockIPC: MockIPCService;

  beforeEach(() => {
    mockIPC = new MockIPCService();
  });

  describe('send and receive', () => {
    it('should send and receive messages', () => {
      const callback = jest.fn();

      mockIPC.on('test-channel', callback);
      mockIPC.send('test-channel', { foo: 'bar' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should handle string data', () => {
      const callback = jest.fn();

      mockIPC.on('string-channel', callback);
      mockIPC.send('string-channel', 'hello world');

      expect(callback).toHaveBeenCalledWith('hello world');
    });

    it('should handle number data', () => {
      const callback = jest.fn();

      mockIPC.on('number-channel', callback);
      mockIPC.send('number-channel', 42);

      expect(callback).toHaveBeenCalledWith(42);
    });

    it('should not call callback for different channel', () => {
      const callback = jest.fn();

      mockIPC.on('channel-a', callback);
      mockIPC.send('channel-b', 'data');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('multiple listeners', () => {
    it('should support multiple listeners on same channel', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      mockIPC.on('test-channel', callback1);
      mockIPC.on('test-channel', callback2);
      mockIPC.on('test-channel', callback3);

      mockIPC.send('test-channel', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
      expect(callback3).toHaveBeenCalledWith('data');
    });

    it('should call all listeners in order of registration', () => {
      const callOrder: number[] = [];
      const callback1 = jest.fn(() => callOrder.push(1));
      const callback2 = jest.fn(() => callOrder.push(2));
      const callback3 = jest.fn(() => callOrder.push(3));

      mockIPC.on('test-channel', callback1);
      mockIPC.on('test-channel', callback2);
      mockIPC.on('test-channel', callback3);

      mockIPC.send('test-channel', 'data');

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  describe('removeListener', () => {
    it('should remove listener correctly', () => {
      const callback = jest.fn();

      mockIPC.on('test-channel', callback);
      mockIPC.removeListener('test-channel', callback);
      mockIPC.send('test-channel', 'data');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove specified listener', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      mockIPC.on('test-channel', callback1);
      mockIPC.on('test-channel', callback2);
      mockIPC.removeListener('test-channel', callback1);
      mockIPC.send('test-channel', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should not throw if removing non-existent listener', () => {
      const callback = jest.fn();

      expect(() => {
        mockIPC.removeListener('test-channel', callback);
      }).not.toThrow();
    });

    it('should not throw if removing from non-existent channel', () => {
      const callback = jest.fn();

      expect(() => {
        mockIPC.removeListener('non-existent-channel', callback);
      }).not.toThrow();
    });
  });

  describe('helper methods', () => {
    it('should clear all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      mockIPC.on('channel-a', callback1);
      mockIPC.on('channel-b', callback2);

      mockIPC.clearAllListeners();

      mockIPC.send('channel-a', 'data');
      mockIPC.send('channel-b', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should return correct listener count', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      expect(mockIPC.getListenerCount('test-channel')).toBe(0);

      mockIPC.on('test-channel', callback1);
      expect(mockIPC.getListenerCount('test-channel')).toBe(1);

      mockIPC.on('test-channel', callback2);
      expect(mockIPC.getListenerCount('test-channel')).toBe(2);

      mockIPC.on('test-channel', callback3);
      expect(mockIPC.getListenerCount('test-channel')).toBe(3);

      mockIPC.removeListener('test-channel', callback2);
      expect(mockIPC.getListenerCount('test-channel')).toBe(2);
    });

    it('should return 0 for non-existent channel', () => {
      expect(mockIPC.getListenerCount('non-existent')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null data', () => {
      const callback = jest.fn();

      mockIPC.on('test-channel', callback);
      mockIPC.send('test-channel', null);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should handle undefined data', () => {
      const callback = jest.fn();

      mockIPC.on('test-channel', callback);
      mockIPC.send('test-channel', undefined);

      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('should handle complex nested objects', () => {
      const callback = jest.fn();
      const complexData = {
        nested: {
          deep: {
            value: 42,
            array: [1, 2, 3],
          },
        },
        array: [{ id: 1 }, { id: 2 }],
      };

      mockIPC.on('test-channel', callback);
      mockIPC.send('test-channel', complexData);

      expect(callback).toHaveBeenCalledWith(complexData);
    });

    it('should not prevent duplicate listener registration', () => {
      const callback = jest.fn();

      mockIPC.on('test-channel', callback);
      mockIPC.on('test-channel', callback);

      // Set can't have duplicates, so callback should be called once
      mockIPC.send('test-channel', 'data');

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ElectronIPCService', () => {
  let electronIPC: ElectronIPCService;
  let mockElectronAPI: {
    send: jest.Mock;
    on: jest.Mock;
  };

  beforeEach(() => {
    // Mock window.electronAPI
    mockElectronAPI = {
      send: jest.fn(),
      on: jest.fn(),
    };

    // @ts-expect-error - Mocking global window
    global.window = {
      electronAPI: mockElectronAPI,
    };

    electronIPC = new ElectronIPCService();
  });

  afterEach(() => {
    // @ts-expect-error - Cleanup
    delete global.window;
  });

  describe('send', () => {
    it('should call window.electronAPI.send with correct arguments', () => {
      electronIPC.send('test-channel', { foo: 'bar' });

      expect(mockElectronAPI.send).toHaveBeenCalledTimes(1);
      expect(mockElectronAPI.send).toHaveBeenCalledWith('test-channel', { foo: 'bar' });
    });

    it('should not throw if window.electronAPI is undefined', () => {
      // @ts-expect-error - Testing undefined case
      global.window = {};

      const ipc = new ElectronIPCService();

      expect(() => {
        ipc.send('test-channel', 'data');
      }).not.toThrow();
    });
  });

  describe('on', () => {
    it('should call window.electronAPI.on with correct arguments', () => {
      const callback = jest.fn();

      electronIPC.on('test-channel', callback);

      expect(mockElectronAPI.on).toHaveBeenCalledTimes(1);
      expect(mockElectronAPI.on).toHaveBeenCalledWith('test-channel', callback);
    });

    it('should not throw if window.electronAPI is undefined', () => {
      // @ts-expect-error - Testing undefined case
      global.window = {};

      const ipc = new ElectronIPCService();
      const callback = jest.fn();

      expect(() => {
        ipc.on('test-channel', callback);
      }).not.toThrow();
    });
  });

  describe('removeListener', () => {
    it('should log warning (not implemented)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();

      electronIPC.removeListener('test-channel', callback);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'ElectronIPCService.removeListener not implemented yet'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Adapter Pattern verification', () => {
    it('should implement IPCService interface', () => {
      // Verify all interface methods exist
      expect(typeof electronIPC.send).toBe('function');
      expect(typeof electronIPC.on).toBe('function');
      expect(typeof electronIPC.removeListener).toBe('function');
    });

    it('should have same interface as MockIPCService', () => {
      const mockIPC = new MockIPCService();

      // Both should have the same methods
      expect(typeof electronIPC.send).toBe(typeof mockIPC.send);
      expect(typeof electronIPC.on).toBe(typeof mockIPC.on);
      expect(typeof electronIPC.removeListener).toBe(typeof mockIPC.removeListener);
    });
  });
});
