import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SyncSkillsOptions {
  /** Source of the skills repository, e.g. `crystal-system/conventions`. */
  source: string;
  /** Working directory, defaults to the current one. */
  cwd?: string;
}

function runSkills(args: string[], cwd: string): Promise<string> {
  return execFileAsync('npx', ['skills', ...args], {
    cwd,
    encoding: 'utf8',
  }).then(({ stdout, stderr }) => stdout + stderr);
}

export function parseListedSkills(output: string): string[] {
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  const section = plain.split('Available Skills')[1] ?? '';
  const names: string[] = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^[|│*]\s+(cs-[a-z0-9-]+)\s*$/);
    if (match) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

async function listSourceSkills(
  source: string,
  cwd: string,
): Promise<string[] | null> {
  try {
    const output = await runSkills(['add', source, '-l'], cwd);
    return parseListedSkills(output);
  } catch (err) {
    const output = (err as { stdout?: string; stderr?: string }).stdout;
    return output ? parseListedSkills(output) : null;
  }
}

function readLockfileSkills(cwd: string): string[] {
  try {
    const lock = JSON.parse(fs.readFileSync(`${cwd}/skills-lock.json`, 'utf8'));
    return Object.keys(lock.skills ?? {});
  } catch {
    return [];
  }
}

/**
 * Installs, updates and removes the skills of a skills repository so the
 * project matches the source exactly. New skills are created, changed
 * skills are updated, and skills that disappeared from the source are
 * removed, keeping skills-lock.json and the agent skill directories in
 * sync.
 */
export async function syncSkills(
  options: SyncSkillsOptions,
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const removed: string[] = [];

  try {
    await runSkills(['add', options.source, '-y', '-a', '*'], cwd);
  } catch {
    return removed;
  }

  const available = await listSourceSkills(options.source, cwd);
  if (!available) {
    return removed;
  }

  const installed = readLockfileSkills(cwd);
  for (const name of installed.filter((n) => !available.includes(n))) {
    try {
      await runSkills(['remove', name, '-y'], cwd);
      removed.push(name);
    } catch {}
  }

  return removed;
}
