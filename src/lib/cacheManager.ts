import { Spell } from '@/hooks/useSpells';
import { FavoritePreset } from '@/hooks/useFavoritePresets';

// IndexedDB Configuration
const DB_NAME = 'GrimoireCache';
const DB_VERSION = 1;

export interface CachedData<T> {
  data: T;
  cached_at: number;
  ttl?: number; // Time to live in milliseconds
}

export interface PendingOperation {
  id: string;
  type: 'CREATE_PRESET' | 'UPDATE_PRESET' | 'DELETE_PRESET' | 'ADD_SPELL' | 'REMOVE_SPELL';
  data: any;
  timestamp: number;
  user_id: string;
}

export interface MagiaLink {
  magia: string;
  classe: string;
  cached_at: number;
}

class CacheManager {
  private db: IDBDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('spells')) {
          const spellsStore = db.createObjectStore('spells', { keyPath: 'id' });
          spellsStore.createIndex('cached_at', 'cached_at');
        }

        if (!db.objectStoreNames.contains('favorite_presets')) {
          const presetsStore = db.createObjectStore('favorite_presets', { keyPath: 'id' });
          presetsStore.createIndex('user_id', 'user_id');
          presetsStore.createIndex('cached_at', 'cached_at');
        }

        if (!db.objectStoreNames.contains('magia_links')) {
          const linksStore = db.createObjectStore('magia_links', { keyPath: ['magia', 'classe'] });
          linksStore.createIndex('cached_at', 'cached_at');
        }

        if (!db.objectStoreNames.contains('pending_operations')) {
          const operationsStore = db.createObjectStore('pending_operations', { keyPath: 'id' });
          operationsStore.createIndex('timestamp', 'timestamp');
          operationsStore.createIndex('user_id', 'user_id');
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Spells Cache
  async cacheSpells(spells: Spell[]): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const transaction = this.db.transaction(['spells'], 'readwrite');
    const store = transaction.objectStore('spells');
    const cached_at = Date.now();

    for (const spell of spells) {
      const cachedSpell: CachedData<Spell> = {
        data: spell,
        cached_at,
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };
      await store.put({ ...cachedSpell, id: spell.id });
    }

    // Cache metadata
    await this.setMetadata('spells_last_sync', cached_at);
  }

  async getCachedSpells(): Promise<Spell[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const transaction = this.db.transaction(['spells'], 'readonly');
    const store = transaction.objectStore('spells');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const cachedSpells = request.result as Array<CachedData<Spell> & { id: string }>;
        const now = Date.now();
        
        const validSpells = cachedSpells
          .filter(cached => !cached.ttl || (now - cached.cached_at) < cached.ttl)
          .map(cached => cached.data);
          
        resolve(validSpells);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Favorite Presets Cache
  async cacheFavoritePresets(presets: FavoritePreset[], userId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      // Clear existing presets for this user first
      await this.clearUserPresets(userId);

      // Then cache new presets in a separate transaction
      const transaction = this.db.transaction(['favorite_presets'], 'readwrite');
      const store = transaction.objectStore('favorite_presets');
      const cached_at = Date.now();

      // Use Promise.all to handle multiple puts efficiently
      const putPromises = presets.map(preset => {
        const cachedPreset: CachedData<FavoritePreset> = {
          data: preset,
          cached_at
        };
        return new Promise<void>((resolve, reject) => {
          const request = store.put({ ...cachedPreset, id: preset.id, user_id: userId });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      await Promise.all(putPromises);

      // Wait for transaction to complete
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      await this.setMetadata(`presets_last_sync_${userId}`, cached_at);
    } catch (error) {
      console.warn('Cache operation failed, but continuing:', error);
      // Don't throw error to prevent blocking the main operation
    }
  }

  async getCachedFavoritePresets(userId: string): Promise<FavoritePreset[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const transaction = this.db.transaction(['favorite_presets'], 'readonly');
    const store = transaction.objectStore('favorite_presets');
    const index = store.index('user_id');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const cachedPresets = request.result as Array<CachedData<FavoritePreset> & { id: string }>;
        const presets = cachedPresets.map(cached => cached.data);
        resolve(presets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async clearUserPresets(userId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['favorite_presets'], 'readwrite');
      const store = transaction.objectStore('favorite_presets');
      const index = store.index('user_id');
      
      const request = index.openCursor(userId);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Magia Links Cache
  async cacheMagiaLinks(links: Array<{ magia: string; classe: string }>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const transaction = this.db.transaction(['magia_links'], 'readwrite');
    const store = transaction.objectStore('magia_links');
    const cached_at = Date.now();

    for (const link of links) {
      const cachedLink: MagiaLink = {
        ...link,
        cached_at
      };
      await store.put(cachedLink);
    }

    await this.setMetadata('magia_links_last_sync', cached_at);
  }

  async getCachedMagiaLinks(): Promise<Array<{ magia: string; classe: string }>> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const transaction = this.db.transaction(['magia_links'], 'readonly');
    const store = transaction.objectStore('magia_links');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const cachedLinks = request.result as MagiaLink[];
        const links = cachedLinks.map(({ magia, classe }) => ({ magia, classe }));
        resolve(links);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pending Operations Queue
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) return '';

    const id = `${operation.type}_${Date.now()}_${Math.random()}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now()
    };

    const transaction = this.db.transaction(['pending_operations'], 'readwrite');
    const store = transaction.objectStore('pending_operations');
    await store.put(pendingOp);

    return id;
  }

  async getPendingOperations(userId: string): Promise<PendingOperation[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const transaction = this.db.transaction(['pending_operations'], 'readonly');
    const store = transaction.objectStore('pending_operations');
    const index = store.index('user_id');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const transaction = this.db.transaction(['pending_operations'], 'readwrite');
    const store = transaction.objectStore('pending_operations');
    await store.delete(id);
  }

  // Metadata
  async setMetadata(key: string, value: any): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    await store.put({ key, value, updated_at: Date.now() });
  }

  async getMetadata(key: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.db) return null;

    const transaction = this.db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cache Management
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const stores = ['spells', 'favorite_presets', 'magia_links', 'pending_operations', 'metadata'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
  }

  async getCacheSize(): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) return 0;

    const stores = ['spells', 'favorite_presets', 'magia_links', 'pending_operations'];
    let totalSize = 0;

    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      totalSize += count;
    }

    return totalSize;
  }
}

export const cacheManager = new CacheManager();