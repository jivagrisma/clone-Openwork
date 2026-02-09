#!/usr/bin/env node

/**
 * WaIA Universal Build Script
 * Builds installers for all platforms: Linux (deb, rpm, AppImage, tar.gz), Windows, macOS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  productName: 'WaIA',
  version: '1.0.0',
  platforms: ['linux', 'win', 'mac'],
  linuxTargets: ['deb', 'rpm', 'AppImage', 'tar.gz'],
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(step, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function exec(command, description) {
  try {
    log(`Executing: ${description}`, colors.blue);
    execSync(command, { stdio: 'inherit' });
    logSuccess(description);
    return true;
  } catch (error) {
    logError(`Failed: ${description}`);
    logError(error.message);
    return false;
  }
}

function checkEnvironment() {
  logStep('Checking Environment');

  // Check if pnpm is available
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    logSuccess('pnpm is available');
  } catch {
    logError('pnpm is not installed. Please install it first.');
    process.exit(1);
  }

  // Check if Node.js binaries are downloaded
  const nodejsPath = path.join(__dirname, '../resources/nodejs/linux-x64/node-v20.18.1-linux-x64');
  if (!fs.existsSync(nodejsPath)) {
    logWarning('Node.js binaries not found. Downloading...');
    exec('pnpm download:nodejs', 'Downloading Node.js binaries');
  } else {
    logSuccess('Node.js binaries are present');
  }
}

function buildApp() {
  logStep('Building Application');

  const success = exec(
    'ACCOMPLISH_BUNDLED_MCP=1 pnpm build',
    'Building application'
  );

  if (!success) {
    logError('Build failed. Exiting.');
    process.exit(1);
  }
}

function buildLinux() {
  logStep('Building Linux Installers');

  const targets = CONFIG.linuxTargets;
  let successCount = 0;

  for (const target of targets) {
    const success = exec(
      `ACCOMPLISH_BUNDLED_MCP=1 node scripts/package.cjs --linux ${target} --publish never`,
      `Building Linux ${target}`
    );
    if (success) successCount++;
  }

  // Create installation summary
  const releaseDir = path.join(__dirname, '../release');
  const installScript = path.join(__dirname, '../build/linux/install.sh');

  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir)
      .filter(f => f.includes('WaIA') && (f.endsWith('.deb') || f.endsWith('.rpm') || f.endsWith('.AppImage') || f.endsWith('.tar.gz')));

    log(`\nGenerated ${files.length} Linux package(s):`, colors.green);
    files.forEach(f => log(`  • ${f}`));
  }

  logSuccess(`Linux build complete: ${successCount}/${targets.length} targets built`);
}

function buildWindows() {
  logStep('Building Windows Installer');

  const success = exec(
    'ACCOMPLISH_BUNDLED_MCP=1 node scripts/package.cjs --win --x64 --publish never',
    'Building Windows NSIS installer'
  );

  if (success) {
    const releaseDir = path.join(__dirname, '../release');
    if (fs.existsSync(releaseDir)) {
      const files = fs.readdirSync(releaseDir)
        .filter(f => f.includes('WaIA') && (f.endsWith('.exe') || f.endsWith('.zip')));

      log(`\nGenerated ${files.length} Windows package(s):`, colors.green);
      files.forEach(f => log(`  • ${f}`));
    }
  }

  logSuccess('Windows build complete');
}

function buildMacOS() {
  logStep('Building macOS Installers');

  const success = exec(
    'ACCOMPLISH_BUNDLED_MCP=1 node scripts/package.cjs --mac --publish never',
    'Building macOS DMG and ZIP'
  );

  if (success) {
    const releaseDir = path.join(__dirname, '../release');
    if (fs.existsSync(releaseDir)) {
      const files = fs.readdirSync(releaseDir)
        .filter(f => f.includes('WaIA') && (f.endsWith('.dmg') || f.endsWith('.zip')));

      log(`\nGenerated ${files.length} macOS package(s):`, colors.green);
      files.forEach(f => log(`  • ${f}`));
    }
  }

  logSuccess('macOS build complete');
}

function createInstallationSummary() {
  logStep('Creating Installation Summary');

  const summaryPath = path.join(__dirname, '../release/INSTALLATION.txt');
  const installScriptPath = path.join(__dirname, '../build/linux/install.sh');

  let summary = `
═══════════════════════════════════════════════════════════════════════════════
                          WaIA v${CONFIG.version}
                     Installation Instructions
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ WINDOWS (11+)                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Double-click: WaIA-Setup-x.x.x.exe                                    │
│ 2. Follow the installation wizard                                          │
│ 3. Launch from Start Menu or desktop shortcut                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ macOS (Apple Silicon)                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Double-click: WaIA-x.x.x-arm64.dmg                                    │
│ 2. Drag WaIA to Applications folder                                       │
│ 3. Launch from Applications or Launchpad                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LINUX (Ubuntu, Debian, Fedora, etc.)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ OPTION 1 - Ubuntu/Debian (Recommended):                                   │
│   Double-click: WaIA-x.x.x-linux-x64.deb                                  │
│   Or terminal: sudo dpkg -i WaIA-x.x.x-linux-x64.deb                       │
│                                                                             │
│ OPTION 2 - Fedora/RHEL/openSUSE:                                          │
│   Terminal: sudo dnf install WaIA-x.x.x-linux-x64.rpm                      │
│   Or: sudo yum localinstall WaIA-x.x.x-linux-x64.rpm                      │
│                                                                             │
│ OPTION 3 - Universal (Any Distro):                                        │
│   Run: sudo bash build/linux/install.sh                                    │
│   Or extract tar.gz and run the executable                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                        First Time Setup
═══════════════════════════════════════════════════════════════════════════════

1. Launch WaIA from your applications menu
2. Click "Settings" (gear icon)
3. Add your AI provider (OpenAI, Anthropic, Google, etc.)
4. Enter your API key
5. Start using WaIA!

═══════════════════════════════════════════════════════════════════════════════
                        Language Settings
═══════════════════════════════════════════════════════════════════════════════

Default Language: Spanish (Latin America)
Fallback Language: English

To change language:
• Settings → Language → Select your preferred language

═══════════════════════════════════════════════════════════════════════════════
                        Support & Updates
═══════════════════════════════════════════════════════════════════════════════

GitHub: https://github.com/jivagrisma/clone-Openwork
Issues: https://github.com/jivagrisma/clone-Openwork/issues

═══════════════════════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(summaryPath, summary);
  logSuccess('Installation summary created: release/INSTALLATION.txt');
}

function main() {
  log('\n╔════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                                                                          ║', colors.cyan);
  log('║                    WaIA Universal Build Script                          ║', colors.cyan);
  log('║                                                                          ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  log('', colors.cyan);

  const args = process.argv.slice(2);
  const targetPlatform = args[0];

  // Check environment
  checkEnvironment();

  // Build the application
  buildApp();

  // Build based on target platform
  if (targetPlatform === 'linux' || !targetPlatform) {
    buildLinux();
  }

  if (targetPlatform === 'win' || !targetPlatform) {
    if (process.platform !== 'win32') {
      logWarning('Skipping Windows build (not on Windows)');
    } else {
      buildWindows();
    }
  }

  if (targetPlatform === 'mac' || !targetPlatform) {
    if (process.platform !== 'darwin') {
      logWarning('Skipping macOS build (not on macOS)');
    } else {
      buildMacOS();
    }
  }

  // Create installation summary
  createInstallationSummary();

  // Final summary
  logStep('Build Complete');
  log('', colors.green);
  log('All installers have been built successfully!', colors.green);
  log('', colors.green);
  log('Generated files are located in: apps/desktop/release/', colors.blue);
  log('', colors.green);
  log('To test the installers:', colors.yellow);
  log('  • Linux: sudo dpkg -i release/WaIA-*.deb', colors.blue);
  log('  • Windows: Double-click release/WaIA-Setup-*.exe', colors.blue);
  log('  • macOS: Open release/WaIA-*.dmg', colors.blue);
  log('', colors.green);
}

// Run main function
main();
