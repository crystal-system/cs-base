const fs = require('node:fs');
const path = require('node:path');

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node patch-published-package.js <output-dir>');
  process.exit(1);
}

const manifestPath = path.join(outDir, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.main = './index.cjs.js';
manifest.types = './index.d.ts';
delete manifest.exports;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const jestConfigPath = path.join(outDir, 'src', 'jest.config.js');
let jestConfig = fs.readFileSync(jestConfigPath, 'utf8');
jestConfig = jestConfig.replace(
  /require\('\.\/lib\/workspace-jest-config(\.ts)?'\)/,
  "require('../index.cjs.js')",
);
fs.writeFileSync(jestConfigPath, jestConfig);
