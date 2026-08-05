import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..');

// Keep catalog construction dependency-free so CI can enumerate scenarios
// before npm installs the runtime E2E harness dependencies.
export const generatedVersions = JSON.parse(
  readFileSync(path.join(rootDir, 'src', 'versions.json'), 'utf8')
);

export function pinnedDependency(name, framework = 'next') {
  const version =
    (framework === 'astro' ? generatedVersions.astroOverrides[name] : undefined) ??
    generatedVersions.dependencies[name];
  if (!version) {
    throw new Error(`No pinned version registered for "${name}" in src/versions.json.`);
  }
  return `${name}@${version}`;
}

export function readFlag(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export function readListFlag(argv, flag) {
  const value = readFlag(argv, flag);
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
