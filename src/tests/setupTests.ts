// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the window.matchMedia function which is not implemented in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the ResizeObserver which is not implemented in JSDOM
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Luxon's DateTime for consistent timezone behavior in tests
jest.mock('luxon', () => {
  const actual = jest.requireActual('luxon');
  return {
    ...actual,
    DateTime: {
      ...actual.DateTime,
      now: jest.fn().mockImplementation(() => {
        return actual.DateTime.fromISO('2025-06-13T10:00:00.000-05:00', { zone: 'America/Chicago' });
      }),
      local: jest.fn().mockImplementation(() => {
        return actual.DateTime.fromISO('2025-06-13T10:00:00.000-05:00', { zone: 'America/Chicago' });
      }),
    },
  };
});

// Mock the fetch API
global.fetch = jest.fn();