import {
  shouldUseHardwareAcceleration,
  getOptimizedTransform,
  getOptimizedClassNames,
  getOptimizedAnimation,
  createDebouncedResizeHandler,
  getStableKey,
  isInViewport,
  createLazyLoadObserver
} from '../cssOptimizer';

describe('cssOptimizer', () => {
  describe('shouldUseHardwareAcceleration', () => {
    it('should return true when hasTransform is true', () => {
      expect(shouldUseHardwareAcceleration(true, false, false)).toBe(true);
    });
    
    it('should return true when both hasOpacity and hasPosition are true', () => {
      expect(shouldUseHardwareAcceleration(false, true, true)).toBe(true);
    });
    
    it('should return false when hasTransform is false and either hasOpacity or hasPosition is false', () => {
      expect(shouldUseHardwareAcceleration(false, true, false)).toBe(false);
      expect(shouldUseHardwareAcceleration(false, false, true)).toBe(false);
      expect(shouldUseHardwareAcceleration(false, false, false)).toBe(false);
    });
  });

  describe('getOptimizedTransform', () => {
    it('should generate transform with default values', () => {
      const result = getOptimizedTransform();
      expect(result).toContain('translate3d(0px, 0px, 0)');
      expect(result).toContain('scale(1)');
      expect(result).toContain('will-change: transform');
    });
    
    it('should generate transform with custom values', () => {
      const result = getOptimizedTransform(10, 20, 1.5);
      expect(result).toContain('translate3d(10px, 20px, 0)');
      expect(result).toContain('scale(1.5)');
    });
    
    it('should not include will-change when hardware acceleration is disabled', () => {
      const result = getOptimizedTransform(0, 0, 1, false);
      expect(result).not.toContain('will-change');
    });
  });

  describe('getOptimizedClassNames', () => {
    it('should include base class', () => {
      const result = getOptimizedClassNames('base-class', {});
      expect(result).toBe('base-class');
    });
    
    it('should include conditional classes when condition is true', () => {
      const result = getOptimizedClassNames('base-class', {
        'active': true,
        'disabled': false
      });
      expect(result).toBe('base-class active');
    });
    
    it('should handle multiple conditional classes', () => {
      const result = getOptimizedClassNames('base-class', {
        'active': true,
        'selected': true,
        'disabled': false
      });
      expect(result).toBe('base-class active selected');
    });
  });

  describe('getOptimizedAnimation', () => {
    it('should generate fade animation', () => {
      const result = getOptimizedAnimation('fade');
      expect(result).toContain('transition: opacity');
      expect(result).toContain('will-change: opacity');
    });
    
    it('should generate slide animation', () => {
      const result = getOptimizedAnimation('slide');
      expect(result).toContain('transition: transform');
      expect(result).toContain('will-change: transform');
    });
    
    it('should generate scale animation', () => {
      const result = getOptimizedAnimation('scale');
      expect(result).toContain('transition: transform');
      expect(result).toContain('will-change: transform');
    });
    
    it('should use custom duration', () => {
      const result = getOptimizedAnimation('fade', 500);
      expect(result).toContain('opacity 500ms');
    });
    
    it('should return empty string for invalid property', () => {
      // @ts-ignore - Testing invalid input
      const result = getOptimizedAnimation('invalid');
      expect(result).toBe('');
    });
  });

  describe('createDebouncedResizeHandler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should create a debounced function', () => {
      const callback = jest.fn();
      const debounced = createDebouncedResizeHandler(callback);
      
      // Call the debounced function
      debounced();
      
      // Callback should not be called immediately
      expect(callback).not.toHaveBeenCalled();
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      // Callback should be called after the delay
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('should reset the timer on subsequent calls', () => {
      const callback = jest.fn();
      const debounced = createDebouncedResizeHandler(callback);
      
      // Call the debounced function
      debounced();
      
      // Fast-forward time partially
      jest.advanceTimersByTime(50);
      
      // Call the debounced function again
      debounced();
      
      // Fast-forward time to the first timeout
      jest.advanceTimersByTime(50);
      
      // Callback should not be called yet
      expect(callback).not.toHaveBeenCalled();
      
      // Fast-forward time to the second timeout
      jest.advanceTimersByTime(50);
      
      // Callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('should use custom delay', () => {
      const callback = jest.fn();
      const debounced = createDebouncedResizeHandler(callback, 200);
      
      // Call the debounced function
      debounced();
      
      // Fast-forward time to just before the delay
      jest.advanceTimersByTime(199);
      
      // Callback should not be called yet
      expect(callback).not.toHaveBeenCalled();
      
      // Fast-forward time to the delay
      jest.advanceTimersByTime(1);
      
      // Callback should be called
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStableKey', () => {
    it('should generate key with string ID', () => {
      const result = getStableKey('item', 'abc123', 0);
      expect(result).toBe('item-abc123-0');
    });
    
    it('should generate key with number ID', () => {
      const result = getStableKey('item', 42, 0);
      expect(result).toBe('item-42-0');
    });
    
    it('should include index in the key', () => {
      const result = getStableKey('item', 'abc123', 5);
      expect(result).toBe('item-abc123-5');
    });
  });

  describe('isInViewport', () => {
    let element: HTMLElement;
    
    beforeEach(() => {
      // Create a mock element
      element = document.createElement('div');
      
      // Mock getBoundingClientRect
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 100,
        bottom: 200,
        left: 100,
        right: 200
      });
      
      // Mock window dimensions
      window.innerHeight = 800;
      window.innerWidth = 1200;
    });
    
    it('should return true when element is in viewport', () => {
      expect(isInViewport(element)).toBe(true);
    });
    
    it('should return false when element is null', () => {
      expect(isInViewport(null as unknown as HTMLElement)).toBe(false);
    });
    
    it('should return false when element is above viewport', () => {
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: -300,
        bottom: -100,
        left: 100,
        right: 200
      });
      
      expect(isInViewport(element)).toBe(false);
    });
    
    it('should return false when element is below viewport', () => {
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 900,
        bottom: 1000,
        left: 100,
        right: 200
      });
      
      expect(isInViewport(element)).toBe(false);
    });
    
    it('should return false when element is to the left of viewport', () => {
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 100,
        bottom: 200,
        left: -300,
        right: -100
      });
      
      expect(isInViewport(element)).toBe(false);
    });
    
    it('should return false when element is to the right of viewport', () => {
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 100,
        bottom: 200,
        left: 1300,
        right: 1500
      });
      
      expect(isInViewport(element)).toBe(false);
    });
    
    it('should consider offset when checking if element is in viewport', () => {
      // Element is just outside viewport
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 850,
        bottom: 950,
        left: 100,
        right: 200
      });
      
      // Without offset, element is not in viewport
      expect(isInViewport(element, 0)).toBe(false);
      
      // With offset, element is in viewport
      expect(isInViewport(element, 100)).toBe(true);
    });
  });

  describe('createLazyLoadObserver', () => {
    let originalIntersectionObserver: typeof IntersectionObserver;
    let mockIntersectionObserver: jest.Mock;
    let mockCallback: jest.Mock;
    
    beforeEach(() => {
      // Save original IntersectionObserver
      originalIntersectionObserver = window.IntersectionObserver;
      
      // Create mock IntersectionObserver
      mockIntersectionObserver = jest.fn().mockImplementation((callback, options) => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn(),
        root: options?.root || null,
        rootMargin: options?.rootMargin || '0px',
        thresholds: options?.threshold || [0]
      }));
      
      // Replace global IntersectionObserver with mock
      window.IntersectionObserver = mockIntersectionObserver;
      
      // Create mock callback
      mockCallback = jest.fn();
    });
    
    afterEach(() => {
      // Restore original IntersectionObserver
      window.IntersectionObserver = originalIntersectionObserver;
    });
    
    it('should create an IntersectionObserver with default rootMargin', () => {
      createLazyLoadObserver(mockCallback);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '100px' }
      );
    });
    
    it('should create an IntersectionObserver with custom rootMargin', () => {
      createLazyLoadObserver(mockCallback, '200px');
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '200px' }
      );
    });
    
    it('should call callback when entry is intersecting', () => {
      // Get the callback function passed to IntersectionObserver
      createLazyLoadObserver(mockCallback);
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Create mock entries
      const mockEntries = [
        { isIntersecting: true, target: document.createElement('div') },
        { isIntersecting: false, target: document.createElement('div') }
      ];
      
      // Call the observer callback with mock entries
      observerCallback(mockEntries);
      
      // Callback should be called only for the intersecting entry
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(mockEntries[0]);
    });
  });
});