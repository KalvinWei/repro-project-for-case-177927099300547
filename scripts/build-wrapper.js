/**
 * build-wrapper.js
 * Wraps `ng build --configuration production` to capture:
 * - Exit code and signal of the child process
 * - Process count before/during/after
 * - Memory snapshots at intervals
 * - Child process tree monitoring
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getProcessCount() {
  try {
    return execSync('ls /proc | grep -c "^[0-9]"', { encoding: 'utf8' }).trim();
  } catch { return 'N/A'; }
}

function getMemInfo() {
  try {
    return execSync('free -h | head -2', { encoding: 'utf8' }).trim();
  } catch { return 'N/A'; }
}

function getChildProcesses(pid) {
  try {
    return execSync(`ps --ppid ${pid} -o pid,comm,rss,vsz 2>/dev/null || ps -o pid,comm,rss,vsz`, { encoding: 'utf8' }).trim();
  } catch { return 'N/A'; }
}

console.log('=== Build Wrapper Started ===');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Process count before build: ${getProcessCount()}`);
console.log(`Memory before build:\n${getMemInfo()}`);
console.log('');

const buildStart = Date.now();

const child = spawn('npx', ['ng', 'build', '--configuration', 'production'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, NG_BUILD_DEBUG_PERF: '1' }
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  stdout += text;
  process.stdout.write(text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  stderr += text;
  process.stderr.write(text);
});

// Monitor process count every 30s
const monitor = setInterval(() => {
  const elapsed = Math.round((Date.now() - buildStart) / 1000);
  console.log(`\n[monitor @ ${elapsed}s] Processes: ${getProcessCount()} | ${getMemInfo().split('\n')[1] || ''}`);
  console.log(`[monitor @ ${elapsed}s] Child tree:\n${getChildProcesses(child.pid)}`);
}, 30000);

child.on('close', (code, signal) => {
  clearInterval(monitor);
  const elapsed = Math.round((Date.now() - buildStart) / 1000);

  console.log('\n=== Build Wrapper Results ===');
  console.log(`Duration: ${elapsed}s`);
  console.log(`Exit code: ${code}`);
  console.log(`Signal: ${signal || 'none'}`);
  console.log(`Process count after build: ${getProcessCount()}`);
  console.log(`Memory after build:\n${getMemInfo()}`);

  if (code !== 0 || signal) {
    console.log('\n=== FAILURE ANALYSIS ===');
    if (signal === 'SIGKILL') {
      console.log('DIAGNOSIS: Process was SIGKILL\'d — likely OOM killer');
      try {
        const dmesg = execSync('dmesg | tail -20 2>/dev/null || journalctl -k --no-pager -n 20 2>/dev/null', { encoding: 'utf8' });
        console.log(`Kernel messages:\n${dmesg}`);
      } catch { console.log('Could not read kernel messages'); }
    } else if (signal === 'SIGSEGV') {
      console.log('DIAGNOSIS: Segmentation fault — binary crash or memory corruption');
    } else if (signal === 'SIGTERM') {
      console.log('DIAGNOSIS: Process was terminated externally');
    } else if (signal === 'SIGABRT') {
      console.log('DIAGNOSIS: Process aborted — internal assertion failure');
    } else {
      console.log(`DIAGNOSIS: Exited with code ${code}, no signal — check stderr for details`);
    }

    // Check for Angular error log
    try {
      const errorLogs = execSync('cat /tmp/ng-*/angular-errors.log 2>/dev/null', { encoding: 'utf8' });
      console.log(`\n=== Angular Error Log ===\n${errorLogs}`);
    } catch { console.log('No Angular error log found'); }

    process.exit(1);
  }

  console.log('\n=== BUILD SUCCEEDED ===');
});

child.on('error', (err) => {
  clearInterval(monitor);
  console.error(`\n=== Build Wrapper Error ===\nFailed to start: ${err.message}`);
  process.exit(1);
});
