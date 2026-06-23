/**
 * build-isolate-css.js
 * Tests Angular build with styles disabled to isolate whether the crash
 * is in CSS/PostCSS/Tailwind processing or in JS bundling.
 */
const { spawnSync } = require('child_process');

console.log('=== CSS Isolation Test ===\n');

// Test 1: Build WITHOUT styles (JS-only)
console.log('--- Test 1: Build without styles (--styles=false) ---');
const noStyles = spawnSync('npx', ['ng', 'build', '--configuration', 'production', '--styles=false'], {
  stdio: 'inherit',
  encoding: 'utf8',
  env: { ...process.env, NG_BUILD_DEBUG_PERF: '1' },
  timeout: 300000
});
console.log(`\nResult: exit=${noStyles.status}, signal=${noStyles.signal || 'none'}`);

if (noStyles.status === 0) {
  console.log('\n>>> JS bundling SUCCEEDS without styles');
  console.log('>>> This means the crash is in CSS/PostCSS/Tailwind processing');
  console.log('>>> Next step: check PostCSS plugin or Tailwind v4 interaction with Angular');
} else {
  console.log('\n>>> JS bundling ALSO FAILS without styles');
  console.log('>>> The crash is in the JavaScript bundling/optimization phase');
  console.log('>>> Next step: check esbuild worker coordination, code splitting, or tree shaking');
}

// Test 2: Build with reduced parallelism
console.log('\n\n--- Test 2: Build with NG_BUILD_PARALLEL=0 ---');
const noParallel = spawnSync('npx', ['ng', 'build', '--configuration', 'production'], {
  stdio: 'inherit',
  encoding: 'utf8',
  env: { ...process.env, NG_BUILD_PARALLEL: '0', NG_BUILD_DEBUG_PERF: '1' },
  timeout: 600000
});
console.log(`\nResult: exit=${noParallel.status}, signal=${noParallel.signal || 'none'}`);

if (noParallel.status === 0) {
  console.log('\n>>> Build SUCCEEDS with parallelism disabled');
  console.log('>>> This indicates a race condition or resource contention in multi-worker mode');
} else {
  console.log('\n>>> Build FAILS even without parallelism');
  console.log('>>> Issue is not related to worker coordination');
}

console.log('\n=== End CSS Isolation Test ===');
