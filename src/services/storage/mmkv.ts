/**
 * HINCH MART — MMKV Storage Service
 * High-performance synchronous key-value storage
 * 
 * NOTE: react-native-mmkv requires expo-dev-client / native builds.
 * This module gracefully falls back to a Map-based in-memory store
 * when running in Expo Go.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let storageInstance: any;
let isNativeMMKVAvailable = false;

try {
  const mmkvModule = require('react-native-mmkv');
  // Attempt initialization check for native module availability
  const testInstance = new mmkvModule.MMKV({ id: 'hinchmart-test' });
  testInstance.set('test_key', 'test_val');
  testInstance.delete('test_key');
  storageInstance = new mmkvModule.MMKV({ id: 'hinchmart-storage' });
  isNativeMMKVAvailable = true;
} catch {
  // Fallback for Expo Go or environments where MMKV native C++ binary isn't present
  const inMemory = new Map<string, string>();

  // Asynchronously hydrate inMemory from AsyncStorage on startup
  AsyncStorage.getAllKeys().then((keys) => {
    if (keys && keys.length > 0) {
      AsyncStorage.multiGet(keys).then((pairs) => {
        pairs.forEach(([k, v]) => {
          if (v != null) inMemory.set(k, v);
        });
      }).catch(() => {});
    }
  }).catch(() => {});

  storageInstance = {
    getString: (key: string) => inMemory.get(key) ?? null,
    set: (key: string, value: string | number | boolean) => {
      inMemory.set(key, String(value));
      AsyncStorage.setItem(key, String(value)).catch(() => {});
    },
    getNumber: (key: string) => {
      const v = inMemory.get(key);
      return v !== undefined && v !== null ? Number(v) : undefined;
    },
    getBoolean: (key: string) => {
      const v = inMemory.get(key);
      return v !== undefined && v !== null ? v === 'true' : undefined;
    },
    delete: (key: string) => {
      inMemory.delete(key);
      AsyncStorage.removeItem(key).catch(() => {});
    },
    contains: (key: string) => inMemory.has(key),
    clearAll: () => {
      inMemory.clear();
      AsyncStorage.clear().catch(() => {});
    },
    getAllKeys: () => Array.from(inMemory.keys()),
  };
}

export const storage = storageInstance;

/**
 * Typed storage helpers
 */
export const mmkvStorage = {
  getString: (key: string): string | null => {
    try {
      return storage.getString(key) ?? null;
    } catch {
      return null;
    }
  },

  setString: (key: string, value: string): void => {
    try {
      storage.set(key, value);
    } catch {}
  },

  getNumber: (key: string): number | undefined => {
    try {
      return storage.getNumber(key);
    } catch {
      return undefined;
    }
  },

  setNumber: (key: string, value: number): void => {
    try {
      storage.set(key, value);
    } catch {}
  },

  getBoolean: (key: string): boolean | undefined => {
    try {
      return storage.getBoolean(key);
    } catch {
      return undefined;
    }
  },

  setBoolean: (key: string, value: boolean): void => {
    try {
      storage.set(key, value);
    } catch {}
  },

  getObject: <T>(key: string): T | undefined => {
    try {
      const json = storage.getString(key);
      if (!json) return undefined;
      return JSON.parse(json) as T;
    } catch {
      return undefined;
    }
  },

  setObject: <T>(key: string, value: T): void => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch {}
  },

  remove: (key: string): void => {
    try {
      storage.delete(key);
    } catch {}
  },

  has: (key: string): boolean => {
    try {
      return storage.contains(key);
    } catch {
      return false;
    }
  },

  clearAll: (): void => {
    try {
      storage.clearAll();
    } catch {}
  },

  getAllKeys: (): string[] => {
    try {
      return storage.getAllKeys() ?? [];
    } catch {
      return [];
    }
  },
};

/**
 * Redux persist-compatible storage adapter for permanent storage on Expo Go & native builds
 */
export const mmkvReduxStorage = {
  setItem: async (key: string, value: string): Promise<boolean> => {
    try {
      if (isNativeMMKVAvailable) {
        storage.set(key, value);
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
    return true;
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isNativeMMKVAvailable) {
        const val = storage.getString(key);
        if (val != null) return val;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isNativeMMKVAvailable) {
        storage.delete(key);
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
