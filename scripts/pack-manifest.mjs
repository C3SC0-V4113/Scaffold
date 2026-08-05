// Normalizes `npm pack --json` output across npm majors.
//
// npm 11 and earlier return an array of pack results:
//   [ { "name": "purrfold", "files": [ { "path": "dist/index.js" } ] } ]
//
// npm 12 returns an object keyed by package name:
//   { "purrfold": { "files": [ { "path": "dist/index.js" } ] } }
//
// Both shapes are in play at once: CI runs pack-smoke on the runner's bundled
// npm while the release workflow installs a newer one. Assuming either shape
// broke the first automated release, so the parsing stays shape-agnostic rather
// than tracking whichever npm the job happens to have.

export function packResults(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    return Object.values(parsed);
  }
  return [];
}

export function packedFilePaths(parsed) {
  const [result] = packResults(parsed);
  if (!result) {
    throw new Error(`npm pack --json reported no packed package: ${JSON.stringify(parsed)}`);
  }
  if (!Array.isArray(result.files)) {
    throw new Error(`npm pack --json reported no file list: ${JSON.stringify(result)}`);
  }
  return result.files.map((file) => file.path);
}
