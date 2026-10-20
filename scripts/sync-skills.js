const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const SOURCE = 'crystal-system/conventions';
const LOCKFILE = 'skills-lock.json';

function run(args) {
  execFileSync('npx', ['skills', ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}

function listSourceSkills() {
  let output = '';
  try {
    output = execFileSync('npx', ['skills', 'add', SOURCE, '-l'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
  } catch (err) {
    output = err.stdout ?? '';
    if (!output) {
      return null;
    }
  }
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  const section = plain.split('Available Skills')[1] ?? '';
  const names = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^[|│*]\s+(cs-[a-z0-9-]+)\s*$/);
    if (match) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

try {
  run(['add', SOURCE, '-y', '-a', '*']);
} catch {
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(LOCKFILE, 'utf8'));
} catch {
  process.exit(0);
}

const installed = Object.keys(lock.skills ?? {});
if (installed.length === 0) {
  process.exit(0);
}

const available = listSourceSkills();
if (!available) {
  process.exit(0);
}

for (const name of installed.filter((n) => !available.includes(n))) {
  try {
    run(['remove', name, '-y']);
  } catch {}
}
