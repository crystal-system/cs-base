import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Locates the shared config files of this package, working both when the
 * package is consumed from source (configs under src/) and when it is
 * consumed from its published build (configs at the package root).
 */
export interface PackageLocation {
  /** Directory containing the shared config files. */
  configRoot: string;
  /** Path of a file inside the package, resolving src/ transparently. */
  resolve(...segments: string[]): string;
  /**
   * Path of the workspace jest config, preferring the compiled
   * jest.config.js when available (published layout) and falling back
   * to the TypeScript source (workspace layout).
   */
  jestConfig(): string;
}

export function locatePackage(fromDir: string): PackageLocation {
  let current = fromDir;
  while (true) {
    for (const configRoot of [current, path.join(current, 'src')]) {
      if (fs.existsSync(path.join(configRoot, 'jest.preset.js'))) {
        return {
          configRoot,
          resolve: (...segments: string[]) =>
            path.join(configRoot, ...segments),
          jestConfig: () => {
            const js = path.join(configRoot, 'jest.config.js');
            return fs.existsSync(js)
              ? js
              : path.join(configRoot, 'jest.config.ts');
          },
        };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not locate @cs-base/nx-plugin config files above ${fromDir}`,
      );
    }
    current = parent;
  }
}
