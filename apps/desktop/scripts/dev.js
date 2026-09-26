const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const desktopDir = path.resolve(__dirname, '..');
const DEV_SERVER = 'http://localhost:5173';
const children = [];

function run(command, args, options) {
  const child = spawn(command, args, { shell: true, stdio: 'inherit', ...options });
  children.push(child);
  return child;
}

function cleanup(code) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code ?? 0);
}

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let left = attempts;
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (left-- <= 0) reject(new Error('vite dev server never came up'));
        else setTimeout(probe, 500);
      });
    };
    probe();
  });
}

async function main() {
  console.log('[cutepad] compiling electron main…');
  await new Promise((resolve, reject) => {
    const tsc = run('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: desktopDir });
    tsc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('tsc failed'))));
  });

  console.log('[cutepad] starting vite…');
  run('npm', ['run', 'dev', '-w', '@cutepad/web'], { cwd: root });

  await waitForServer(DEV_SERVER);
  console.log('[cutepad] launching electron…');

  const electron = run('npx', ['electron', '.'], {
    cwd: desktopDir,
    env: { ...process.env, CUTEPAD_DEV_SERVER: DEV_SERVER },
  });
  electron.on('exit', (code) => cleanup(code));
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

main().catch((err) => {
  console.error('[cutepad]', err.message);
  cleanup(1);
});
