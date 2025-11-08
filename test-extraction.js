"use strict";
/**
 * Test script to verify extraction methods work correctly
 * Run with: npx ts-node test-extraction.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chatTracker_1 = require("./src/chatTracker");
const vscode = __importStar(require("vscode"));
// Mock VS Code context
const mockContext = {
    subscriptions: [],
    extensionPath: __dirname,
    workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
    },
    globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
    },
    extensionUri: vscode.Uri.file(__dirname),
    storagePath: __dirname,
    globalStoragePath: __dirname,
    logPath: __dirname,
    extensionMode: vscode.ExtensionMode.Test,
    secrets: {},
    environmentVariableCollection: {}
};
// Mock config manager
class MockConfigManager {
    getConfig() {
        return {
            CURSOR_CONNECTION_CODE: 'test-code',
            EASYITI_API_URL: 'http://test-api.com',
            autoSend: false,
            autoTrack: false
        };
    }
}
// Mock API client
class MockApiClient {
    async sendSummary(summary) {
        console.log('📤 Would send summary:', JSON.stringify(summary, null, 2));
        return Promise.resolve();
    }
}
// Test cases
const testCases = [
    {
        name: 'Test 1: Simple prompt with clear objective',
        userPrompt: 'Create a new React component called Button that accepts onClick and children props.',
        aiResponse: 'I\'ll create a new React component for you. Here\'s the implementation:\n\n```tsx\nimport React from \'react\';\n\nexport const Button = ({ onClick, children }) => {\n  return <button onClick={onClick}>{children}</button>;\n};\n```\n\nI\'ve created the Button component in src/components/Button.tsx.'
    },
    {
        name: 'Test 2: Multiple objectives with bullet points',
        userPrompt: 'I need to:\n- Fix the login bug\n- Add user authentication\n- Update the database schema',
        aiResponse: 'I\'ve fixed the login bug by correcting the authentication logic. Added JWT token validation. Updated the database schema to include a new users table with proper indexes.'
    },
    {
        name: 'Test 3: Question-based prompt',
        userPrompt: 'How do I implement error handling in my API?',
        aiResponse: 'To implement error handling, you should use try-catch blocks and create a centralized error handler. I\'ve created an error middleware that catches all errors and returns appropriate status codes.'
    },
    {
        name: 'Test 4: Complex prompt with code',
        userPrompt: 'Refactor the authentication service to use async/await instead of promises, and add logging for all authentication attempts.',
        aiResponse: 'I\'ve refactored the authentication service:\n\n1. Converted all promise chains to async/await\n2. Added comprehensive logging using Winston\n3. Created a new AuthLogger class\n4. Updated error handling\n\nThe main changes are in src/services/auth.ts and src/utils/logger.ts'
    },
    {
        name: 'Test 5: Simple sentence prompt',
        userPrompt: 'Add a dark mode toggle to the settings page.',
        aiResponse: 'I\'ve added a dark mode toggle to the settings page. The toggle switches between light and dark themes using CSS variables. The preference is saved to localStorage.'
    }
];
async function runTests() {
    console.log('🧪 Starting extraction tests...\n');
    const configManager = new MockConfigManager();
    const apiClient = new MockApiClient();
    const chatTracker = new chatTracker_1.ChatTracker(mockContext, apiClient);
    let passed = 0;
    let failed = 0;
    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📝 ${testCase.name}`);
        console.log(`${'='.repeat(60)}`);
        // Start new chat
        chatTracker.startNewChat(testCase.userPrompt);
        console.log(`\n📤 User Prompt:\n${testCase.userPrompt}\n`);
        // Update AI response
        chatTracker.updateAIResponse(testCase.aiResponse);
        console.log(`\n🤖 AI Response:\n${testCase.aiResponse.substring(0, 200)}...\n`);
        // Get summary
        const summary = chatTracker.getCurrentSummary();
        if (!summary) {
            console.log('❌ FAILED: No summary returned');
            failed++;
            continue;
        }
        // Check results
        console.log('\n📊 Extracted Data:');
        console.log(`\n✅ User Objectives (${summary.userObjectives.length}):`);
        summary.userObjectives.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj}`);
        });
        console.log(`\n✅ AI Response Summary:`);
        console.log(`   ${summary.aiResponseSummary}`);
        console.log(`\n✅ Main Actions (${summary.mainActions.length}):`);
        summary.mainActions.forEach((action, i) => {
            console.log(`   ${i + 1}. ${action}`);
        });
        // Validate
        const hasObjectives = summary.userObjectives && summary.userObjectives.length > 0 &&
            summary.userObjectives[0] !== 'No objectives specified';
        const hasSummary = summary.aiResponseSummary && summary.aiResponseSummary.trim().length > 0 &&
            summary.aiResponseSummary !== 'No response available';
        const hasActions = summary.mainActions && summary.mainActions.length > 0;
        if (hasObjectives && hasSummary && hasActions) {
            console.log('\n✅ PASSED: All fields populated correctly');
            passed++;
        }
        else {
            console.log('\n❌ FAILED: Some fields are empty');
            console.log(`   Objectives: ${hasObjectives ? '✓' : '✗'}`);
            console.log(`   Summary: ${hasSummary ? '✓' : '✗'}`);
            console.log(`   Actions: ${hasActions ? '✓' : '✗'}`);
            failed++;
        }
    }
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Total: ${testCases.length}`);
    console.log(`\n${'='.repeat(60)}\n`);
}
// Run tests
runTests().catch(console.error);
//# sourceMappingURL=test-extraction.js.map