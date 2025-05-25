import { DateTime } from 'luxon';
import { CalendarDebugUtils } from './calendarDebugUtils';

/**
 * Interface for cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration options
 */
interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries in the cache
  namespace: string; // Namespace for logging and identification
}

/**
 * A generic caching utility to reduce redundant API calls and improve performance
 * Implements LRU (Least Recently Used) eviction policy
 */
export class CacheUtils<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[] = []; // Track access order for LRU eviction
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default TTL
      maxSize: 100, // Default max size
      namespace: 'AppCache',
      ...config
    };
    this.cache = new Map<string, CacheEntry<T>>();
    
    CalendarDebugUtils.log('CacheUtils', `Cache initialized for ${this.config.namespace}`, {
      defaultTTL: this.config.defaultTTL,
      maxSize: this.config.maxSize
    });
  }

  /**
   * Set a value in the cache with optional custom TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);
    
    // If cache is at max size, evict least recently used item
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Update the cache
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
    
    // Update access order
    this.updateAccessOrder(key);
    
    CalendarDebugUtils.trace('CacheUtils', `Cache set: ${this.config.namespace}:${key}`, {
      expiresAt: new Date(expiresAt).toISOString(),
      ttl: ttl || this.config.defaultTTL
    });
  }

  /**
   * Get a value from the cache
   * Returns undefined if the key doesn't exist or has expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // If entry doesn't exist or has expired
    if (!entry || entry.expiresAt < now) {
      if (entry && entry.expiresAt < now) {
        // Entry exists but has expired
        this.cache.delete(key);
        CalendarDebugUtils.trace('CacheUtils', `Cache expired: ${this.config.namespace}:${key}`);
      }
      
      this.misses++;
      return undefined;
    }
    
    // Update access order for LRU
    this.updateAccessOrder(key);
    
    this.hits++;
    CalendarDebugUtils.trace('CacheUtils', `Cache hit: ${this.config.namespace}:${key}`, {
      age: now - entry.timestamp,
      expiresIn: entry.expiresAt - now
    });
    
    return entry.data;
  }

  /**
   * Check if a key exists in the cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!entry && entry.expiresAt > Date.now();
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index !== -1) {
        this.accessOrder.splice(index, 1);
      }
      
      CalendarDebugUtils.trace('CacheUtils', `Cache delete: ${this.config.namespace}:${key}`);
    }
    return result;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    CalendarDebugUtils.log('CacheUtils', `Cache cleared: ${this.config.namespace}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }

  /**
   * Evict all expired entries
   * @returns Number of entries evicted
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        
        // Remove from access order
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
          this.accessOrder.splice(index, 1);
        }
        
        evicted++;
      }
    }
    
    if (evicted > 0) {
      CalendarDebugUtils.log('CacheUtils', `Evicted ${evicted} expired entries from ${this.config.namespace}`);
    }
    
    return evicted;
  }

  /**
   * Create a cache key from multiple parts
   * Useful for creating keys based on multiple parameters
   */
  static createKey(...parts: any[]): string {
    return parts.map(part => {
      if (part instanceof Date) {
        return part.toISOString();
      } else if (part instanceof DateTime) {
        return part.toISO();
      } else if (typeof part === 'object') {
        return JSON.stringify(part);
      } else {
        return String(part);
      }
    }).join(':');
  }

  /**
   * Update the access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add key to the end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    // Get the least recently used key
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
      CalendarDebugUtils.trace('CacheUtils', `LRU eviction: ${this.config.namespace}:${lruKey}`);
    }
  }
}

// Create and export singleton instances for common use cases
export const appointmentsCache = new CacheUtils<any[]>({
  namespace: 'Appointments',
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  maxSize: 50
});

export const availabilityCache = new CacheUtils<any[]>({
  namespace: 'Availability',
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50
});

export const clientsCache = new CacheUtils<any[]>({
  namespace: 'Clients',
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxSize: 20
});

export const cliniciansCache = new CacheUtils<any[]>({
  namespace: 'Clinicians',
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxSize: 20
});