import * as path from 'node:path';
import type { Config } from 'jest';

const packageRoot = path.resolve(__dirname, '..', '..');

/**
 * Builds the Jest configuration of a library tagged cs-type:lib,
 * deriving the display name and coverage directory from the project.
 */
export function createConfig(
  projectName: string,
  projectRoot: string,
  workspaceRoot: string,
  presetPath = path.join(packageRoot, 'src', 'jest.preset.js'),
): Config {
  return {
    displayName: projectName,
    roots: [path.join(workspaceRoot, projectRoot)],
    preset: presetPath,
    testEnvironment: 'node',
    transform: {
      '^.+\\.[tj]s$': [
        'ts-jest',
        {
          tsconfig: path.join(workspaceRoot, projectRoot, 'tsconfig.spec.json'),
        },
      ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: path.join(workspaceRoot, 'coverage', projectRoot),
  };
}
