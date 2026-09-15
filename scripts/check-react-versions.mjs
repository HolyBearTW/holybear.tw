import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packages = ['react', 'react-dom', 'react-is'];

const packageVersion = (name) => {
  const entry = require.resolve(name);
  let directory = path.dirname(entry);
  while (directory !== path.dirname(directory)) {
    const packageJsonPath = path.join(directory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (manifest.name === name) return manifest.version;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Unable to locate ${name}/package.json`);
};

const versions = Object.fromEntries(packages.map((name) => [name, packageVersion(name)]));
const uniqueVersions = new Set(Object.values(versions));

if (uniqueVersions.size !== 1) {
  throw new Error(`React runtime packages must use one version: ${JSON.stringify(versions)}`);
}

console.log(`React runtime versions aligned: ${[...uniqueVersions][0]}`);
