import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseListedSkills, readSkillsConfig, syncSkills } from './sync-skills';

const LIST_OUTPUT = [
  '┌   skills',
  '◇  Source: crystal-system/conventions',
  '◇  Found 2 skills',
  '◇  Available Skills',
  '│',
  '│    cs-commit-msg',
  '│',
  '│      Apply the organization commit message rules.',
  '│',
  '│    cs-other-skill',
  '│',
  '│      Another skill.',
  '│',
  '└  Use --skill <name> to install specific skills',
].join('\n');

describe('parseListedSkills', () => {
  it('extracts the skill names from the skills CLI listing', () => {
    expect(parseListedSkills(LIST_OUTPUT)).toEqual([
      'cs-commit-msg',
      'cs-other-skill',
    ]);
  });

  it('returns an empty list when the output has no section', () => {
    expect(parseListedSkills('some unrelated output')).toEqual([]);
  });
});

describe('readSkillsConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-skills-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns null without a configuration file', () => {
    expect(readSkillsConfig(dir)).toBeNull();
  });

  it('reads the sources and the optional agents', () => {
    fs.mkdirSync(path.join(dir, '.cs'));
    fs.writeFileSync(
      path.join(dir, '.cs', 'skills.json'),
      JSON.stringify({
        agents: ['claude-code', 'opencode'],
        sources: [
          { repository: 'crystal-system/conventions' },
          {
            repository: 'crystal-system/other',
            skills: ['cs-one', 'cs-two'],
          },
        ],
      }),
    );
    expect(readSkillsConfig(dir)).toEqual({
      agents: ['claude-code', 'opencode'],
      sources: [
        { repository: 'crystal-system/conventions' },
        { repository: 'crystal-system/other', skills: ['cs-one', 'cs-two'] },
      ],
    });
  });

  it('returns null when the configuration is invalid', () => {
    fs.mkdirSync(path.join(dir, '.cs'));
    fs.writeFileSync(path.join(dir, '.cs', 'skills.json'), 'not json');
    expect(readSkillsConfig(dir)).toBeNull();
  });

  it('returns null when the sources are missing', () => {
    fs.mkdirSync(path.join(dir, '.cs'));
    fs.writeFileSync(path.join(dir, '.cs', 'skills.json'), '{}');
    expect(readSkillsConfig(dir)).toBeNull();
  });
});

describe('syncSkills', () => {
  it('does nothing without a configuration file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-skills-'));
    try {
      await expect(syncSkills({ cwd: dir })).resolves.toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
