import { describe, expect, it } from 'vitest';

// @ts-expect-error -- plain ESM script module, no type declarations
import { packedFilePaths, packResults } from '../scripts/pack-manifest.mjs';

// Shapes captured from real `npm pack --dry-run --json` output. npm 12 changed
// the payload from an array to an object keyed by package name, which broke the
// first automated release. Both stay pinned here because CI and the release
// workflow do not run the same npm major.
const npm11Output = [
  {
    id: 'purrfold@0.5.0',
    name: 'purrfold',
    filename: 'purrfold-0.5.0.tgz',
    files: [{ path: 'LICENSE' }, { path: 'README.md' }, { path: 'dist/index.js' }, { path: 'llms.txt' }, { path: 'package.json' }],
  },
];

const npm12Output = {
  purrfold: {
    id: 'purrfold@0.5.0',
    name: 'purrfold',
    filename: 'purrfold-0.5.0.tgz',
    files: [{ path: 'LICENSE' }, { path: 'README.md' }, { path: 'dist/index.js' }, { path: 'llms.txt' }, { path: 'package.json' }],
  },
};

const expectedPaths = ['LICENSE', 'README.md', 'dist/index.js', 'llms.txt', 'package.json'];

describe('npm pack manifest parsing', () => {
  it('reads the array payload npm 11 and earlier emit', () => {
    expect(packedFilePaths(npm11Output)).toEqual(expectedPaths);
  });

  it('reads the package-keyed object payload npm 12 emits', () => {
    expect(packedFilePaths(npm12Output)).toEqual(expectedPaths);
  });

  it('normalizes both shapes to the same result', () => {
    expect(packedFilePaths(npm11Output)).toEqual(packedFilePaths(npm12Output));
    expect(packResults(npm11Output)).toEqual(packResults(npm12Output));
  });

  it('fails loudly instead of returning undefined when nothing was packed', () => {
    expect(() => packedFilePaths([])).toThrow(/no packed package/);
    expect(() => packedFilePaths({})).toThrow(/no packed package/);
    expect(() => packedFilePaths(null)).toThrow(/no packed package/);
  });

  it('fails loudly when the payload carries no file list', () => {
    expect(() => packedFilePaths([{ name: 'purrfold' }])).toThrow(/no file list/);
    expect(() => packedFilePaths({ purrfold: { name: 'purrfold' } })).toThrow(/no file list/);
  });
});
