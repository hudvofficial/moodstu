/**
 * Jest setup file
 * Runs before all tests
 */

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Note: Jest automatically sets NODE_ENV='test'

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Suppress info, log, debug
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};
