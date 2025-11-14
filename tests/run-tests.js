#!/usr/bin/env node

/**
 * Test runner script
 * Provides a simple way to run all tests and display results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Cursor Chat Tracker Test Suite\n');
console.log('=' .repeat(50));

try {
  // Check if jest is installed
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  if (!packageJson.devDependencies.jest) {
    console.log('❌ Jest is not installed. Run: npm install');
    process.exit(1);
  }

  // Run tests
  console.log('\n📋 Running unit tests...\n');
  execSync('npm test', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('\n✅ All tests completed!\n');
  console.log('=' .repeat(50));
  
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}

