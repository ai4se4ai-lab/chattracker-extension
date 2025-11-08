/**
 * Simple test script to verify extension components
 * Run with: node test-extension.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing TrackChat Extension Components...\n');

// Test 1: Check if all compiled files exist
console.log('1. Checking compiled files...');
const requiredFiles = [
    'out/extension.js',
    'out/apiClient.js',
    'out/chatTracker.js',
    'out/chatCapture.js',
    'out/chatMonitor.js',
    'out/configManager.js',
    'out/summaryPanel.js',
    'out/types.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
    console.log('\n❌ Some files are missing. Run: npm run compile');
    process.exit(1);
}

// Test 2: Check package.json structure
console.log('\n2. Checking package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [
    { name: 'Has publisher', value: !!packageJson.publisher },
    { name: 'Has main entry', value: !!packageJson.main },
    { name: 'Has commands', value: Array.isArray(packageJson.contributes?.commands) && packageJson.contributes.commands.length > 0 },
    { name: 'Has activation events', value: Array.isArray(packageJson.activationEvents) && packageJson.activationEvents.length > 0 }
];

checks.forEach(check => {
    console.log(`   ${check.value ? '✅' : '❌'} ${check.name}`);
});

// Test 3: Verify commands are registered
console.log('\n3. Checking registered commands...');
const commands = packageJson.contributes?.commands || [];
const requiredCommands = [
    'trackchat.showSummary',
    'trackchat.sendSummary',
    'trackchat.startMonitoring',
    'trackchat.stopMonitoring',
    'trackchat.captureChat'
];

requiredCommands.forEach(cmd => {
    const exists = commands.some(c => c.command === cmd);
    console.log(`   ${exists ? '✅' : '❌'} ${cmd}`);
});

// Test 4: Check config template
console.log('\n4. Checking configuration...');
if (fs.existsSync('config.json.template')) {
    const template = JSON.parse(fs.readFileSync('config.json.template', 'utf8'));
    const hasRequiredFields = template.CURSOR_CONNECTION_CODE !== undefined && 
                               template.EASYITI_API_URL !== undefined;
    console.log(`   ${hasRequiredFields ? '✅' : '❌'} Config template has required fields`);
} else {
    console.log('   ⚠️  Config template not found');
}

// Test 5: Check for common issues in compiled code
console.log('\n5. Checking compiled code for issues...');
try {
    const extensionCode = fs.readFileSync('out/extension.js', 'utf8');
    const issues = [];
    
    if (!extensionCode.includes('activate')) {
        issues.push('Missing activate function');
    }
    if (!extensionCode.includes('ChatMonitor')) {
        issues.push('ChatMonitor not found');
    }
    if (!extensionCode.includes('startMonitoring')) {
        issues.push('startMonitoring not found');
    }
    
    if (issues.length === 0) {
        console.log('   ✅ No obvious issues found');
    } else {
        issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    }
} catch (error) {
    console.log(`   ❌ Error reading extension code: ${error.message}`);
}

console.log('\n✅ Extension test completed!');
console.log('\nNext steps:');
console.log('1. Press F5 to launch Extension Development Host');
console.log('2. Check Output panel: View → Output → "Log (Extension Host)"');
console.log('3. Look for: "TrackChat extension is now active!"');
console.log('4. Try command: TrackChat: Start Automatic Chat Monitoring');

