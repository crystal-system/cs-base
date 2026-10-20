import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SkillSource {
  /** Skills repository, e.g. `crystal-system/conventions`. */
  repository: string;
  /** Skills to install; all when omitted. */
  skills?: string[];
}

export interface SkillsConfig {
  /**
   * Agents to install for, e.g. `claude-code`. Defaults to the
   * universal `.agents/skills` directory read by most agents.
   */
  agents?: string[];
  sources: SkillSource[];
}

export interface SyncSkillsOptions {
  /** Working directory, defaults to the current one. */
  cwd?: string;
  /** Agents overriding the ones from the config file. */
  agents?: string[];
}

interface LockfileEntry {
  source: string;
  sourceType?: string;
}

/**
 * The lockfile stores the resolved source of an installation, relative
 * to the project for local paths and as the input string for github
 * repositories. Normalizes both to comparable values.
 */
function lockfileSource(repository: string, cwd: string): string[] {
  if (/^([a-z-]+\/)+[a-z0-9._-]+$/i.test(repository)) {
    return [repository];
  }
  const resolved = path.resolve(cwd, repository);
  const relative = path.relative(cwd, resolved);
  return [relative, `./${relative}`];
}

export const CONFIG_PATH = '.cs/skills.json';

/**
 * Reads the skills configuration file; returns null when it does not
 * exist or is invalid, so nothing is installed.
 */
export function readSkillsConfig(cwd: string): SkillsConfig | null {
  const file = path.join(cwd, CONFIG_PATH);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(config.sources)) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
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

function runSkills(args: string[], cwd: string): Promise<string> {
  return execFileAsync('npx', ['skills', ...args], {
    cwd,
    encoding: 'utf8',
  }).then(({ stdout, stderr }) => stdout + stderr);
}

async function listSourceSkills(
  repository: string,
  cwd: string,
): Promise<string[] | null> {
  let output: string;
  try {
    output = await runSkills(['add', repository, '-l'], cwd);
  } catch {
    return null;
  }
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  if (plain.includes('No skills found')) {
    return [];
  }
  if (!plain.includes('Available Skills')) {
    return null;
  }
  return parseListedSkills(output);
}

function readLockfile(cwd: string): Record<string, LockfileEntry> {
  try {
    const lock = JSON.parse(
      fs.readFileSync(path.join(cwd, 'skills-lock.json'), 'utf8'),
    );
    return lock.skills ?? {};
  } catch {
    return {};
  }
}

/**
 * Reconciles the installed skills with the sources of the .cs/skills.json
 * configuration file. Sources can be remote repositories or local folders
 * with a skills directory. For every source, new skills are created,
 * changed skills are updated and skills that disappeared from the source
 * or from the configured selection are removed. Skills of sources no
 * longer configured are removed too. Empty sources are ignored. Nothing
 * is installed without a configuration file.
 */
export async function syncSkills(
  options: SyncSkillsOptions = {},
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const config = readSkillsConfig(cwd);
  if (!config) {
    return [];
  }

  const agents = options.agents ?? config.agents ?? ['universal'];
  const agentArgs = agents.flatMap((agent) => ['-a', agent]);
  const removed: string[] = [];

  const installedBySource = new Map<string, string[]>();
  for (const source of config.sources) {
    const skillArgs = (source.skills ?? []).flatMap((skill) => ['-s', skill]);
    try {
      await runSkills(
        ['add', source.repository, '-y', ...agentArgs, ...skillArgs],
        cwd,
      );
    } catch {
      continue;
    }

    const available = await listSourceSkills(source.repository, cwd);
    if (available === null || available.length === 0) {
      continue;
    }
    const target = source.skills ?? available;
    const lock = readLockfile(cwd);
    const keys = lockfileSource(source.repository, cwd);
    const installed = Object.entries(lock)
      .filter(([, entry]) => keys.includes(entry.source))
      .map(([name]) => name);
    installedBySource.set(source.repository, installed);

    for (const name of installed.filter((n) => !target.includes(n))) {
      try {
        await runSkills(['remove', name, '-y'], cwd);
        removed.push(name);
      } catch {}
    }
  }

  const configuredKeys = config.sources.flatMap((s) =>
    lockfileSource(s.repository, cwd),
  );
  const lock = readLockfile(cwd);
  for (const [name, entry] of Object.entries(lock)) {
    if (configuredKeys.includes(entry.source)) {
      continue;
    }
    try {
      await runSkills(['remove', name, '-y'], cwd);
      removed.push(name);
    } catch {}
  }

  return removed;
}
