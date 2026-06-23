/**
 * esbuild-diagnostics.js
 * Deep inspection of esbuild binary installation and capabilities.
 * Run this AFTER npm install to verify the esbuild setup is correct.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== esbuild Deep Diagnostics ===\n');

// 1. Find all esbuild installations
console.log('--- All esbuild installations ---');
try {
  const find = execSync('find node_modules -path "*/esbuild/package.json" -not -path "*/node_modules/*/node_modules/*" 2>/dev/null', { encoding: 'utf8' });
  find.trim().split('\n').forEach(pkgPath => {
    if (!pkgPath) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const dir = path.dirname(pkgPath);
    const binPath = path.join(dir, 'bin/esbuild');
    const exists = fs.existsSync(binPath);
    let executable = false;
    try { fs.accessSync(binPath, fs.constants.X_OK); executable = true; } catch {}

    console.log(`  ${dir}: v${pkg.version} | bin exists: ${exists} | executable: ${executable}`);

    // Check platform-specific binary
    const platformDir = path.join(dir, '..', '@esbuild');
    if (fs.existsSync(platformDir)) {
      const platforms = fs.readdirSync(platformDir);
      console.log(`    Platform packages: ${platforms.join(', ')}`);
      platforms.forEach(p => {
        const platformBin = path.join(platformDir, p, 'bin/esbuild');
        if (fs.existsSync(platformBin)) {
          const stat = fs.statSync(platformBin);
          console.log(`    ${p}/bin/esbuild: ${stat.size} bytes, mode ${stat.mode.toString(8)}`);
        }
      });
    }
  });
} catch (e) { console.log(`  Error: ${e.message}`); }

// 2. Check the esbuild install.js result
console.log('\n--- esbuild install.js status ---');
const esbuildPaths = [
  'node_modules/esbuild',
  'node_modules/@angular/build/node_modules/esbuild'
];
esbuildPaths.forEach(esbuildDir => {
  if (!fs.existsSync(esbuildDir)) {
    console.log(`  ${esbuildDir}: NOT FOUND`);
    return;
  }
  const installJs = path.join(esbuildDir, 'install.js');
  if (fs.existsSync(installJs)) {
    console.log(`  ${esbuildDir}/install.js: exists`);
    // Try running install.js to see if it would install the binary
    const result = spawnSync('node', [installJs], {
      cwd: path.resolve(esbuildDir),
      encoding: 'utf8',
      timeout: 10000
    });
    console.log(`    Exit code: ${result.status}, Signal: ${result.signal || 'none'}`);
    if (result.stdout) console.log(`    stdout: ${result.stdout.trim()}`);
    if (result.stderr) console.log(`    stderr: ${result.stderr.trim()}`);
  }
});

// 3. Verify esbuild can actually bundle something
console.log('\n--- esbuild functional test ---');
const testFile = '/tmp/esbuild-test-input.js';
fs.writeFileSync(testFile, 'export const x = 42; console.log(x);');
try {
  const result = spawnSync('node_modules/.bin/esbuild', [testFile, '--bundle', '--outfile=/tmp/esbuild-test-out.js', '--platform=node'], {
    encoding: 'utf8',
    timeout: 10000
  });
  console.log(`  Direct bundle test: exit=${result.status}, signal=${result.signal || 'none'}`);
  if (result.stderr) console.log(`  stderr: ${result.stderr.trim()}`);
  if (result.status === 0) {
    const outStat = fs.statSync('/tmp/esbuild-test-out.js');
    console.log(`  Output: ${outStat.size} bytes — OK`);
  }
} catch (e) { console.log(`  Error: ${e.message}`); }

// 4. Test esbuild with multiple workers (simulating Angular's usage)
console.log('\n--- esbuild parallel worker test ---');
try {
  const workerTest = `
    const esbuild = require('esbuild');
    const fs = require('fs');
    const path = require('path');
    async function run() {
      // Start multiple esbuild instances simultaneously (like Angular does)
      const promises = [];
      for (let i = 0; i < 4; i++) {
        const tmpFile = '/tmp/esbuild-worker-test-' + i + '.js';
        fs.writeFileSync(tmpFile, 'export const val' + i + ' = ' + i + ';');
        promises.push(
          esbuild.build({ entryPoints: [tmpFile], bundle: true, write: false, logLevel: 'error' })
            .then(() => ({ worker: i, status: 'OK' }))
            .catch(e => ({ worker: i, status: 'FAIL', error: e.message }))
        );
      }
      const results = await Promise.all(promises);
      results.forEach(r => console.log('  Worker ' + r.worker + ': ' + r.status + (r.error ? ' — ' + r.error : '')));
    }
    run();
  `;
  const result = spawnSync('node', ['-e', workerTest], { encoding: 'utf8', timeout: 30000 });
  if (result.stdout) console.log(result.stdout.trim());
  if (result.stderr) console.log(`  stderr: ${result.stderr.trim()}`);
  console.log(`  Exit: ${result.status}, Signal: ${result.signal || 'none'}`);
} catch (e) { console.log(`  Error: ${e.message}`); }

// 5. Check npm allow-scripts configuration
console.log('\n--- npm allow-scripts config ---');
try {
  const npmrc = fs.readFileSync('.npmrc', 'utf8');
  console.log(`  .npmrc contents:\n${npmrc}`);
} catch { console.log('  No .npmrc found'); }
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.scripts && pkg.scripts.preinstall) console.log(`  preinstall: ${pkg.scripts.preinstall}`);
  if (pkg.allowScripts) console.log(`  allowScripts: ${JSON.stringify(pkg.allowScripts)}`);
} catch {}

console.log('\n=== End esbuild Deep Diagnostics ===');
