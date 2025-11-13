# Test Suite for Cursor Chat Tracker Extension

This directory contains comprehensive test cases for the extension.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual modules
│   ├── chatExtractor.test.ts
│   ├── markdownFormatter.test.ts
│   ├── fileManager.test.ts
│   └── hashGenerator.test.ts
├── integration/       # Integration tests
│   └── exportFlow.test.ts
├── testcases/         # Test case data files
│   ├── formats/       # Different chat formats
│   ├── edge-cases/    # Edge case scenarios
│   └── samples/       # Sample chat exports
└── fixtures/          # Test fixtures and mock data
```

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Test Categories

1. **Parsing Tests**: Test chat message extraction from various formats
2. **Formatting Tests**: Test Markdown generation
3. **File Management Tests**: Test file writing and directory creation
4. **Hash Generation Tests**: Test unique ID generation
5. **Edge Cases**: Test error handling and boundary conditions
6. **Integration Tests**: Test end-to-end export flow

