/**
 * verify-env-vars.js
 * Tests whether NG_BUILD_* env vars work on @angular/build 21.2.8
 */
const { execSync } = require('child_process');
const fs = require('fs');

function runBuild(label, env = {}) {
  console.log(`\n========================================`);
  console.log(`${label}`);
  console.log(`========================================`);
  const fullEnv = { ...process.env, NG_BUILD_DEBUG_PERF: '1', ...env };
  try {
    const output = execSync('npx ng build --configuration production', {
      encoding: 'utf8',
      env: fullEnv,
      timeout: 120000
    });
    console.log(output);
    console.log(`${label}: SUCCESS`);
    return true;
  } catch (e) {
    console.log(e.stdout || '');
    console.log(e.stderr || '');
    console.log(`${label}: FAILED (exit ${e.status}, signal ${e.signal || 'none'})`);
    return false;
  }
}

// TEST 1: Normal build
runBuild('TEST 1: Normal build (baseline)');

// TEST 2: NG_BUILD_MAX_WORKERS=1
runBuild('TEST 2: NG_BUILD_MAX_WORKERS=1', { NG_BUILD_MAX_WORKERS: '1' });

// TEST 3: NG_BUILD_PARALLEL_TS=0
runBuild('TEST 3: NG_BUILD_PARALLEL_TS=false', { NG_BUILD_PARALLEL_TS: 'false' });

// TEST 4: Build with styles removed
console.log(`\n========================================`);
console.log(`TEST 4: Build with styles:[] (no CSS)`);
console.log(`========================================`);
const angularJson = JSON.parse(fs.readFileSync('angular.json', 'utf8'));
const originalStyles = angularJson.projects['repro-app'].architect.build.options.styles;
angularJson.projects['repro-app'].architect.build.options.styles = [];
fs.writeFileSync('angular.json', JSON.stringify(angularJson, null, 2));
const test4 = runBuild('TEST 4: styles=[]');
// Restore
angularJson.projects['repro-app'].architect.build.options.styles = originalStyles;
fs.writeFileSync('angular.json', JSON.stringify(angularJson, null, 2));

console.log(`\n========================================`);
console.log(`ALL TESTS COMPLETE`);
console.log(`========================================`);
