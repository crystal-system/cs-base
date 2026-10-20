import { parseListedSkills } from './sync-skills';

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
  '\u001b[38;5;145m✓ cs-commit-msg\u001b[0m  done',
].join('\n');

it('extracts the skill names from the skills CLI listing', () => {
  expect(parseListedSkills(LIST_OUTPUT)).toEqual([
    'cs-commit-msg',
    'cs-other-skill',
  ]);
});

it('returns an empty list when the output has no section', () => {
  expect(parseListedSkills('some unrelated output')).toEqual([]);
});
