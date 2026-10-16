import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CreateNodesV2,
  CreateNodesResultV2,
} from 'nx/src/project-graph/plugins/public-api';

type CreateNodesResultV2Tuple = CreateNodesResultV2[number];

export const LIB_TAGS = [
  'cs-type:cjs-lib',
  'cs-type:esm-lib',
  'cs-type:tsc-lib',
] as const;

type LibTag = (typeof LIB_TAGS)[number];

const packageRoot = path.resolve(__dirname, '..', '..');
const libraryJestConfig = path.join(packageRoot, 'src', 'jest.config.ts');

const FORMATS: Record<LibTag, string[]> = {
  'cs-type:cjs-lib': ['cjs'],
  'cs-type:esm-lib': ['esm'],
  'cs-type:tsc-lib': ['esm', 'cjs'],
};

function libTagOf(tags: string[]): LibTag | undefined {
  return LIB_TAGS.find((tag) => tags.includes(tag));
}

/**
 * Infers build, lint and test targets for every project tagged with a
 * cs-type library tag. The build target uses @nx/rollup with a format
 * list derived from the tag: cjs-lib, esm-lib or both for tsc-lib.
 */
export const createNodesV2: CreateNodesV2 = [
  '**/project.json',
  async (configFilePaths, _options, context) => {
    const tsconfigPresetsGlob = path
      .relative(context.workspaceRoot, packageRoot)
      .split(path.sep)
      .join('/');
    const results: CreateNodesResultV2Tuple[] = [];

    await Promise.all(
      configFilePaths.map(async (configFilePath) => {
        const projectRoot = path.dirname(configFilePath);
        const config = JSON.parse(
          fs.readFileSync(path.resolve(configFilePath), 'utf-8'),
        );

        if (!Array.isArray(config.tags)) {
          return;
        }

        const libTag = libTagOf(config.tags);
        if (!libTag) {
          return;
        }

        const projectJestConfig = path.join(
          context.workspaceRoot,
          projectRoot,
          'jest.config.ts',
        );
        const jestConfig = fs.existsSync(projectJestConfig)
          ? projectJestConfig
          : libraryJestConfig;

        results.push([
          configFilePath,
          {
            projects: {
              [projectRoot]: {
                namedInputs: {
                  default: ['{projectRoot}/**/*', 'sharedGlobals'],
                  production: [
                    'default',
                    '!{projectRoot}/**/*.test.ts',
                    '!{projectRoot}/tsconfig.spec.json',
                    '!{projectRoot}/test-setup.ts',
                  ],
                  sharedGlobals: [],
                },
                targets: {
                  build: {
                    executor: '@nx/rollup:rollup',
                    dependsOn: ['^build'],
                    cache: true,
                    inputs: [
                      'default',
                      '^production',
                      `{workspaceRoot}/${tsconfigPresetsGlob}/src/tsconfig/**/*`,
                    ],
                    outputs: ['{options.outputPath}'],
                    options: {
                      outputPath: `{workspaceRoot}/dist/${projectRoot}`,
                      main: `${projectRoot}/src/index.ts`,
                      tsConfig: `${projectRoot}/tsconfig.lib.json`,
                      format: FORMATS[libTag],
                      external: 'all',
                      generateExportsField: true,
                      compiler: 'swc',
                      useLegacyTypescriptPlugin: false,
                    },
                  },
                  lint: {
                    executor: 'nx:run-commands',
                    dependsOn: ['^build'],
                    cache: true,
                    inputs: ['default', '{projectRoot}/tsconfig.lib.json'],
                    options: {
                      command: `tsc --noEmit -p ${projectRoot}/tsconfig.lib.json`,
                    },
                  },
                  test: {
                    executor: '@nx/jest:jest',
                    dependsOn: ['^build'],
                    cache: true,
                    inputs: ['default', '^production'],
                    outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
                    options: {
                      jestConfig,
                      passWithNoTests: true,
                    },
                  },
                },
              },
            },
          },
        ]);
      }),
    );

    return results;
  },
];
