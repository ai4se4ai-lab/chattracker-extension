import * as vscode from 'vscode';
import { ChatTracker } from './chatTracker';
import { ApiClient } from './apiClient';
import { Logger } from './logger';

/**
 * Test to verify that all user prompts are captured correctly
 */
export async function testUserPromptCapture(context: vscode.ExtensionContext, apiClient: ApiClient) {
    Logger.initialize();
    Logger.log('\n🧪 ========== Testing User Prompt Capture ==========\n');

    const chatTracker = new ChatTracker(context, apiClient);

    const testCases = [
        {
            name: 'Simple prompt',
            prompt: 'Create a login page',
            shouldCapture: true
        },
        {
            name: 'Multi-line prompt',
            prompt: 'Create a login page\nAdd email validation\nImplement password strength checker',
            shouldCapture: true
        },
        {
            name: 'Long prompt',
            prompt: 'I need to create a comprehensive authentication system that includes user registration, login, password reset, email verification, and social media login integration. The system should also have role-based access control and session management.',
            shouldCapture: true
        },
        {
            name: 'Prompt with special characters',
            prompt: 'Fix the bug in src/utils.ts (line 42) - the function returns null instead of an empty array',
            shouldCapture: true
        },
        {
            name: 'Prompt with code snippets',
            prompt: 'Update the API endpoint to handle POST requests:\n```\napp.post("/api/users", handler);\n```',
            shouldCapture: true
        },
        {
            name: 'Question prompt',
            prompt: 'How do I implement OAuth2 authentication in my Node.js application?',
            shouldCapture: true
        },
        {
            name: 'Prompt with numbers and symbols',
            prompt: 'Add support for version 2.0 of the API and handle errors with status codes 400, 401, and 403',
            shouldCapture: true
        },
        {
            name: 'Very short prompt (3 chars)',
            prompt: 'Fix',
            shouldCapture: true
        },
        {
            name: 'Empty prompt',
            prompt: '',
            shouldCapture: false
        },
        {
            name: 'Only whitespace',
            prompt: '   ',
            shouldCapture: false
        },
        {
            name: 'Too short (2 chars)',
            prompt: 'Hi',
            shouldCapture: false
        }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of testCases) {
        Logger.log(`\n📝 Test: ${testCase.name}`);
        Logger.log(`   Prompt: "${testCase.prompt.substring(0, 100)}${testCase.prompt.length > 100 ? '...' : ''}"`);
        
        try {
            await chatTracker.startNewChat(testCase.prompt);
            const summary = await chatTracker.getCurrentSummary();
            
            if (testCase.shouldCapture) {
                if (summary && summary.userObjectives && summary.userObjectives.length > 0) {
                    const capturedPrompt = summary.userObjectives[0];
                    
                    // Verify the prompt was captured correctly
                    if (capturedPrompt === testCase.prompt.trim()) {
                        Logger.log(`   ✅ PASSED: Prompt captured correctly`);
                        Logger.log(`      Captured: "${capturedPrompt.substring(0, 80)}${capturedPrompt.length > 80 ? '...' : ''}"`);
                        passedTests++;
                    } else {
                        Logger.log(`   ❌ FAILED: Prompt mismatch`);
                        Logger.log(`      Expected: "${testCase.prompt.trim().substring(0, 80)}${testCase.prompt.trim().length > 80 ? '...' : ''}"`);
                        Logger.log(`      Captured: "${capturedPrompt.substring(0, 80)}${capturedPrompt.length > 80 ? '...' : ''}"`);
                        failedTests++;
                    }
                } else {
                    Logger.log(`   ❌ FAILED: Prompt not captured (summary is null or objectives empty)`);
                    failedTests++;
                }
            } else {
                // Should not capture
                if (!summary || !summary.userObjectives || summary.userObjectives.length === 0 || 
                    summary.userObjectives[0] === 'No user prompt captured') {
                    Logger.log(`   ✅ PASSED: Correctly rejected invalid prompt`);
                    passedTests++;
                } else {
                    Logger.log(`   ❌ FAILED: Should have rejected but captured: "${summary.userObjectives[0]}"`);
                    failedTests++;
                }
            }
        } catch (error) {
            Logger.log(`   ❌ FAILED: Exception thrown: ${error}`);
            failedTests++;
        }
    }

    // Test multiple prompts in sequence
    Logger.log(`\n\n📝 Test: Multiple prompts in sequence`);
    try {
        const prompts = [
            'First prompt: Create login page',
            'Second prompt: Add validation',
            'Third prompt: Implement logout'
        ];

        for (const prompt of prompts) {
            await chatTracker.startNewChat(prompt);
            const summary = await chatTracker.getCurrentSummary();
            
            if (summary && summary.userObjectives && summary.userObjectives.length > 0) {
                const captured = summary.userObjectives[0];
                if (captured === prompt.trim()) {
                    Logger.log(`   ✅ Captured: "${captured.substring(0, 60)}..."`);
                } else {
                    Logger.log(`   ❌ Mismatch for: "${prompt}"`);
                    failedTests++;
                }
            } else {
                Logger.log(`   ❌ Failed to capture: "${prompt}"`);
                failedTests++;
            }
        }
        
        // Check final state
        const finalSummary = await chatTracker.getCurrentSummary();
        if (finalSummary && finalSummary.userObjectives && finalSummary.userObjectives.length > 0) {
            const lastPrompt = finalSummary.userObjectives[0];
            if (lastPrompt === prompts[prompts.length - 1].trim()) {
                Logger.log(`   ✅ PASSED: Last prompt correctly stored`);
                passedTests++;
            } else {
                Logger.log(`   ❌ FAILED: Last prompt mismatch`);
                failedTests++;
            }
        } else {
            Logger.log(`   ❌ FAILED: No prompt in final summary`);
            failedTests++;
        }
    } catch (error) {
        Logger.log(`   ❌ FAILED: Exception: ${error}`);
        failedTests++;
    }

    // Test that prompts are not filtered out incorrectly
    Logger.log(`\n\n📝 Test: Prompts that might be incorrectly filtered`);
    const potentiallyFilteredPrompts = [
        'Show me the chat summary',
        'What are the user objectives?',
        'Check the main actions',
        'List modified files',
        'The task is in-progress'
    ];

    for (const prompt of potentiallyFilteredPrompts) {
        try {
            await chatTracker.startNewChat(prompt);
            const summary = await chatTracker.getCurrentSummary();
            
            if (summary && summary.userObjectives && summary.userObjectives.length > 0) {
                const captured = summary.userObjectives[0];
                if (captured === prompt.trim()) {
                    Logger.log(`   ✅ Captured: "${prompt}"`);
                    passedTests++;
                } else {
                    Logger.log(`   ❌ Filtered out: "${prompt}"`);
                    Logger.log(`      Got: "${captured}"`);
                    failedTests++;
                }
            } else {
                Logger.log(`   ❌ Not captured: "${prompt}"`);
                failedTests++;
            }
        } catch (error) {
            Logger.log(`   ❌ Exception for "${prompt}": ${error}`);
            failedTests++;
        }
    }

    // Summary
    Logger.log(`\n\n📊 ========== Test Summary ==========`);
    Logger.log(`   ✅ Passed: ${passedTests}`);
    Logger.log(`   ❌ Failed: ${failedTests}`);
    Logger.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
        Logger.log(`\n   🎉 All tests passed! All user prompts are being captured correctly.`);
    } else {
        Logger.log(`\n   ⚠️  Some tests failed. Review the output above for details.`);
    }
    
    Logger.log('\n');
}

