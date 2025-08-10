/**
 * Jest Setup File
 * 
 * This file configures the test environment and suppresses warnings
 * that are expected during testing.
 */

// Suppress Mongoose warnings about Jest fake timers
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress Mongoose warnings about Jest fake timers
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Mongoose: looks like you\'re trying to test a Mongoose app with Jest\'s mock timers')) {
    return;
  }
  
  // Suppress other Jest-related warnings
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Jest')) {
    return;
  }
  
  // Allow other warnings to pass through
  originalWarn.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

// Suppress specific Node.js warnings
process.removeAllListeners('warning');

// Configure test environment
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup
  jest.clearAllTimers();
  jest.useRealTimers();
});
