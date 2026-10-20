#!/usr/bin/env node
import { syncSkills } from './lib/sync-skills';

const args = process.argv.slice(2);
const agents = args.flatMap((arg, index) =>
  arg === '-a' || arg === '--agent' ? [args[index + 1]] : [],
);

syncSkills({ agents: agents.length > 0 ? agents : undefined })
  .then((removed) => {
    if (removed.length > 0) {
      console.log(
        `Removed skills no longer in the sources: ${removed.join(', ')}`,
      );
    }
  })
  .catch(() => process.exit(0));
