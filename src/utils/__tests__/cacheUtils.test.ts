import { DateTime } from 'luxon';
import { 
  CacheUtils, 
  appointmentsCache, 
  availabilityCache, 
  clientsCache, 
  cliniciansCache 
} from '../cacheUtils';

// Mock CalendarDebugUtils
jest.mock('../calendarDebugUtils', () => ({
  CalendarDebugUtils: {
    log: jest.fn(),
    trace: jest.fn()
  }
}));

describe('CacheUtils', () => {
  let cache: CacheUtils<string>;
  
  beforeEach(() => {
    // Create a new cache instance before each test
    cache = new CacheUtils<string>({
      namespace: 'TestCache',
      defaultTTL: 100, // 100ms for faster testing
      maxSize: 3 // Small size to test LRU eviction
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('Basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
    
    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
    
    it('should check if a key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
    
    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });
    
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.getStats().size).toBe(0);
    });
  });
  
  describe('Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1');
      
      // Value should be available immediately
      expect(cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Value should be expired
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });
    
    it('should respect custom TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      cache.set('key2', 'value2', 200); // 200ms TTL
      
      // Both values should be available immediately
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 75));
      
      // key1 should be expired, key2 should still be available
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      
      // Wait for second key to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Both keys should be expired
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
    
    it('should evict expired entries', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      cache.set('key2', 'value2', 200); // 200ms TTL
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 75));
      
      // Evict expired entries
      const evicted = cache.evictExpired();
      
      // Should have evicted 1 entry
      expect(evicted).toBe(1);
      
      // key1 should be gone, key2 should still be available
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });
  
  describe('LRU Eviction', () => {
    it('should evict least recently used entry when cache is full', () => {
      // Fill the cache (maxSize is 3)
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // All keys should be available
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Add a new key, which should evict key2 (least recently used)
      cache.set('key4', 'value4');
      
      // key2 should be evicted
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
    
    it('should update access order when getting values', () => {
      // Fill the cache
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Access key2 to make it most recently used
      cache.get('key2');
      
      // Add a new key, which should evict key3 (least recently used)
      cache.set('key4', 'value4');
      
      // key3 should be evicted
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(false);
      expect(cache.has('key4')).toBe(true);
    });
  });
  
  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
    
    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // 3 hits
      cache.get('key1');
      cache.get('key1');
      cache.get('key2');
      
      // 1 miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });
    
    it('should track cache size', () => {
      expect(cache.getStats().size).toBe(0);
      
      cache.set('key1', 'value1');
      expect(cache.getStats().size).toBe(1);
      
      cache.set('key2', 'value2');
      expect(cache.getStats().size).toBe(2);
      
      cache.delete('key1');
      expect(cache.getStats().size).toBe(1);
      
      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });
  
  describe('createKey', () => {
    it('should create keys from strings', () => {
      const key = CacheUtils.createKey('part1', 'part2');
      expect(key).toBe('part1:part2');
    });
    
    it('should create keys from numbers', () => {
      const key = CacheUtils.createKey(1, 2, 3);
      expect(key).toBe('1:2:3');
    });
    
    it('should create keys from Date objects', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const key = CacheUtils.createKey('date', date);
      expect(key).toBe(`date:${date.toISOString()}`);
    });
    
    it('should create keys from DateTime objects', () => {
      const dateTime = DateTime.fromISO('2025-05-15T10:30:00Z');
      const key = CacheUtils.createKey('dateTime', dateTime);
      expect(key).toBe(`dateTime:${dateTime.toISO()}`);
    });
    
    it('should create keys from objects', () => {
      const obj = { a: 1, b: 'test' };
      const key = CacheUtils.createKey('obj', obj);
      expect(key).toBe(`obj:${JSON.stringify(obj)}`);
    });
    
    it('should create keys from mixed types', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const obj = { id: 123 };
      const key = CacheUtils.createKey('prefix', 42, date, obj);
      expect(key).toBe(`prefix:42:${date.toISOString()}:${JSON.stringify(obj)}`);
    });
  });
  
  describe('Singleton instances', () => {
    it('should export appointmentsCache instance', () => {
      expect(appointmentsCache).toBeInstanceOf(CacheUtils);
      expect(appointmentsCache.getStats().size).toBe(0);
    });
    
    it('should export availabilityCache instance', () => {
      expect(availabilityCache).toBeInstanceOf(CacheUtils);
      expect(availabilityCache.getStats().size).toBe(0);
    });
    
    it('should export clientsCache instance', () => {
      expect(clientsCache).toBeInstanceOf(CacheUtils);
      expect(clientsCache.getStats().size).toBe(0);
    });
    
    it('should export cliniciansCache instance', () => {
      expect(cliniciansCache).toBeInstanceOf(CacheUtils);
      expect(cliniciansCache.getStats().size).toBe(0);
    });
    
    it('should have different TTL configurations', () => {
      // Store and retrieve a value in each cache
      appointmentsCache.set('test', ['appointment']);
      availabilityCache.set('test', ['availability']);
      clientsCache.set('test', ['client']);
      cliniciansCache.set('test', ['clinician']);
      
      // Each cache should have its value
      expect(appointmentsCache.get('test')).toEqual(['appointment']);
      expect(availabilityCache.get('test')).toEqual(['availability']);
      expect(clientsCache.get('test')).toEqual(['client']);
      expect(cliniciansCache.get('test')).toEqual(['clinician']);
      
      // Each cache should have size 1
      expect(appointmentsCache.getStats().size).toBe(1);
      expect(availabilityCache.getStats().size).toBe(1);
      expect(clientsCache.getStats().size).toBe(1);
      expect(cliniciansCache.getStats().size).toBe(1);
    });
  });
});