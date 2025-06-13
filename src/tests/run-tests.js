#!/usr/bin/env node

/**
 * Valorwell Clinician Portal Test Runner
 * 
 * This script runs all tests and generates a coverage report.
 * It can be used to run specific test suites or all tests.
 * 
 * Usage:
 *   node run-tests.js [suite]
 * 
 * Where [suite] is one of:
 *   - auth: Run authentication tests
 *   - nylas: Run Nylas integration tests
 *   - calendar: Run calendar integration tests
 *   - error: Run error handling tests
 *   - all: Run all tests (default)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define test suites
const TEST_SUITES = {
  auth: 'src/tests/auth',
  nylas: 'src/tests/nylas',
  calendar: 'src/tests/calendar',
  error: 'src/tests/error-handling',
  all: 'src/tests'
};

// Get command line arguments
const args = process.argv.slice(2);
const suite = args[0] || 'all';

if (!TEST_SUITES[suite]) {
  console.error(`Unknown test suite: ${suite}`);
  console.error(`Available suites: ${Object.keys(TEST_SUITES).join(', ')}`);
  process.exit(1);
}

// Create coverage directory if it doesn't exist
const coverageDir = path.join(__dirname, '..', '..', 'coverage');
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

// Run tests
console.log(`Running ${suite} tests...`);

try {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  
  // Build the Jest command
  const jestCommand = [
    'npx jest',
    `--testMatch="**/${TEST_SUITES[suite]}/**/*.{ts,tsx}"`,
    '--coverage',
    '--coverageDirectory="./coverage"',
    '--verbose'
  ].join(' ');
  
  // Execute the command
  execSync(jestCommand, { stdio: 'inherit' });
  
  console.log('\nTests completed successfully!');
  console.log(`Coverage report available at: ${path.join(coverageDir, 'lcov-report', 'index.html')}`);
  
  // Generate test summary
  const summaryPath = path.join(__dirname, 'TEST_SUMMARY.md');
  const testReport = fs.readFileSync(path.join(__dirname, 'TEST_REPORT.md'), 'utf8');
  
  // Extract summary from test report
  const summarySection = testReport.split('## Test Results Summary')[1].split('##')[0];
  
  const summary = `# Valorwell Clinician Portal Test Summary

${summarySection}

Test run completed on: ${new Date().toLocaleString()}

For full details, see the [Test Report](./TEST_REPORT.md).
`;
  
  fs.writeFileSync(summaryPath, summary);
  console.log(`Test summary written to: ${summaryPath}`);
  
} catch (error) {
  console.error('Tests failed with error:');
  console.error(error.message);
  process.exit(1);
}