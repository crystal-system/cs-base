#!/usr/bin/env node
import { syncSkills } from './lib/sync-skills';

const source = process.argv[2] ?? 'crystal-system/conventions';

syncSkills({ source })
  .then((removed) => {
    if (removed.length > 0) {
      console.log(
        `Removed skills no longer in the source: ${removed.join(', ')}`,
      );
    }
  })
  .catch(() => process.exit(0));
