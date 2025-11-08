/**
 * Test extraction methods directly
 * This can be called from a command to test extraction logic
 */

import { ChatTracker } from './chatTracker';
import { ApiClient } from './apiClient';
import { Logger } from './logger';
import * as vscode from 'vscode';

export async function testExtraction(context: vscode.ExtensionContext, apiClient: ApiClient) {
    Logger.log('\n🧪 Starting extraction test...\n');

    const chatTracker = new ChatTracker(context, apiClient);

    // Test Case 1: Simple prompt
    const testPrompt1 = 'Create a new React component called Button that accepts onClick and children props.';
    const testResponse1 = 'I\'ll create a new React component for you. Here\'s the implementation:\n\n```tsx\nimport React from \'react\';\n\nexport const Button = ({ onClick, children }) => {\n  return <button onClick={onClick}>{children}</button>;\n};\n```\n\nI\'ve created the Button component in src/components/Button.tsx.';

    Logger.log('📝 Test 1: Simple prompt');
    Logger.log(`   Prompt: ${testPrompt1}`);
    
    await chatTracker.startNewChat(testPrompt1);
    await chatTracker.updateAIResponse(testResponse1);
    
    // Simulate file modification
    chatTracker.startTracking();
    
    const summary1 = await chatTracker.getCurrentSummary();
    if (summary1) {
        Logger.log(`\n   ✅ Objectives: ${summary1.userObjectives.length}`);
        summary1.userObjectives.forEach((obj, i) => {
            Logger.log(`      ${i + 1}. ${obj.substring(0, 80)}${obj.length > 80 ? '...' : ''}`);
        });
        
        Logger.log(`\n   ✅ AI Summary: ${summary1.aiResponseSummary.substring(0, 100)}${summary1.aiResponseSummary.length > 100 ? '...' : ''}`);
        
        Logger.log(`\n   ✅ Actions: ${summary1.mainActions.length}`);
        summary1.mainActions.forEach((action, i) => {
            Logger.log(`      ${i + 1}. ${action.substring(0, 80)}${action.length > 80 ? '...' : ''}`);
        });
        
        const allFieldsPopulated = 
            summary1.userObjectives.length > 0 && 
            summary1.userObjectives[0] !== 'No objectives specified' &&
            summary1.aiResponseSummary.length > 0 &&
            summary1.aiResponseSummary !== 'No response available' &&
            summary1.mainActions.length > 0;
        
        if (allFieldsPopulated) {
            Logger.log('\n   ✅ Test 1 PASSED: All fields populated');
        } else {
            Logger.log('\n   ❌ Test 1 FAILED: Some fields empty');
        }
    }

    // Test Case 2: Multiple objectives
    const testPrompt2 = 'I need to:\n- Fix the login bug\n- Add user authentication\n- Update the database schema';
    const testResponse2 = 'I\'ve fixed the login bug by correcting the authentication logic. Added JWT token validation. Updated the database schema to include a new users table with proper indexes.';

    Logger.log('\n📝 Test 2: Multiple objectives');
    Logger.log(`   Prompt: ${testPrompt2.substring(0, 100)}...`);
    
    await chatTracker.startNewChat(testPrompt2);
    await chatTracker.updateAIResponse(testResponse2);
    
    const summary2 = await chatTracker.getCurrentSummary();
    if (summary2) {
        Logger.log(`\n   ✅ Objectives: ${summary2.userObjectives.length}`);
        Logger.log(`\n   ✅ AI Summary: ${summary2.aiResponseSummary.substring(0, 100)}${summary2.aiResponseSummary.length > 100 ? '...' : ''}`);
        Logger.log(`\n   ✅ Actions: ${summary2.mainActions.length}`);
        
        const allFieldsPopulated = 
            summary2.userObjectives.length > 0 && 
            summary2.userObjectives[0] !== 'No objectives specified' &&
            summary2.aiResponseSummary.length > 0 &&
            summary2.aiResponseSummary !== 'No response available' &&
            summary2.mainActions.length > 0;
        
        if (allFieldsPopulated) {
            Logger.log('\n   ✅ Test 2 PASSED: All fields populated');
        } else {
            Logger.log('\n   ❌ Test 2 FAILED: Some fields empty');
        }
    }

    // Test Case 3: Question-based prompt
    const testPrompt3 = 'How do I implement error handling in my API?';
    const testResponse3 = 'To implement error handling, you should use try-catch blocks and create a centralized error handler. I\'ve created an error middleware that catches all errors and returns appropriate status codes.';

    Logger.log('\n📝 Test 3: Question-based prompt');
    Logger.log(`   Prompt: ${testPrompt3}`);
    
    await chatTracker.startNewChat(testPrompt3);
    await chatTracker.updateAIResponse(testResponse3);
    
    const summary3 = await chatTracker.getCurrentSummary();
    if (summary3) {
        Logger.log(`\n   ✅ Objectives: ${summary3.userObjectives.length}`);
        Logger.log(`\n   ✅ AI Summary: ${summary3.aiResponseSummary.substring(0, 100)}${summary3.aiResponseSummary.length > 100 ? '...' : ''}`);
        Logger.log(`\n   ✅ Actions: ${summary3.mainActions.length}`);
        
        const allFieldsPopulated = 
            summary3.userObjectives.length > 0 && 
            summary3.userObjectives[0] !== 'No objectives specified' &&
            summary3.aiResponseSummary.length > 0 &&
            summary3.aiResponseSummary !== 'No response available' &&
            summary3.mainActions.length > 0;
        
        if (allFieldsPopulated) {
            Logger.log('\n   ✅ Test 3 PASSED: All fields populated');
        } else {
            Logger.log('\n   ❌ Test 3 FAILED: Some fields empty');
        }
    }

    Logger.log('\n✅ Extraction test completed!\n');
    vscode.window.showInformationMessage('Extraction test completed! Check the TrackChat output channel for results.');
}

