import * as path from 'node:path';
import { createProjectGraphAsync } from '@nx/devkit';
import type { Config } from 'jest';
import { createConfig as createJestConfig } from './create-jest-config';
import { LIB_TAGS } from './nx-tsc-targets-plugin';

type ProjectGraph = Awaited<ReturnType<typeof createProjectGraphAsync>>;

export interface WorkspaceJestConfigOptions {
  /** Tags identifying the library projects to run when aggregating. */
  libTags?: readonly string[];
  /** Path to the jest preset, relative to the workspace root. */
  preset?: string;
}

/**
 * Creates the workspace-level Jest configuration used by every
 * cs-type:lib project. When run through Nx (NX_TASK_TARGET_PROJECT set)
 * it returns the config of that single project, otherwise it aggregates
 * all library projects.
 */
export function createWorkspaceJestConfig(
  options: WorkspaceJestConfigOptions = {},
) {
  const libTags = options.libTags ?? LIB_TAGS;

  return async (): Promise<Config> => {
    const workspaceRoot = process.cwd();
    const graph = await createProjectGraphAsync();
    const projectName = process.env.NX_TASK_TARGET_PROJECT;

    if (projectName) {
      const node = graph.nodes[projectName];
      if (!node) {
        throw new Error(
          `Project ${projectName} not found in the project graph`,
        );
      }
      return createJestConfig(
        projectName,
        node.data.root,
        workspaceRoot,
        options.preset ? path.join(workspaceRoot, options.preset) : undefined,
      );
    }

    const projects = Object.values(graph.nodes)
      .filter((node) =>
        (node.data.tags ?? []).some((tag) => libTags.includes(tag)),
      )
      .map((node) =>
        createJestConfig(
          node.name,
          node.data.root,
          workspaceRoot,
          options.preset ? path.join(workspaceRoot, options.preset) : undefined,
        ),
      );

    return { projects } as Config;
  };
}

/** Default workspace Jest configuration for cs-type:lib projects. */
export const workspaceJestConfig = createWorkspaceJestConfig();
