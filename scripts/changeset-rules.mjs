// Decides whether a pull request that touches the generated-app version pins
// also ships the changeset those pins require.
//
// Why this is enforced rather than requested: renovate.json already carries a
// prBodyNotes entry asking for a changeset after merging, and across seven
// commits touching src/versions.json not one shipped with it. Two were patched
// by hand afterwards; v0.4.3's changelog entry was written outside the flow
// entirely. A rule nothing checks is a rule that does not exist.
//
// Kept separate from the runner so the decision is unit-testable, following the
// split between scripts/e2e/catalog.mjs and scripts/cli-e2e.mjs.

/** Generated-app dependency pins. Every value here lands inside a user's app. */
export const PIN_FILE = 'src/versions.json';

/** Branch changesets/action pushes its version pull request to. */
export const RELEASE_BRANCH = 'changeset-release/main';

export function isChangesetFile(file) {
  return file.startsWith('.changeset/') && file.endsWith('.md') && !file.endsWith('/README.md');
}

/**
 * @param {{ changedFiles?: string[], addedFiles?: string[], headRef?: string, eventName?: string }} input
 * @returns {{ ok: boolean, status: string, message: string }}
 */
export function evaluateChangesetGuard(input = {}) {
  const { changedFiles = [], addedFiles = [], headRef = '', eventName = 'pull_request' } = input;

  if (eventName !== 'pull_request') {
    return { ok: true, status: 'not-a-pull-request', message: 'Nothing to compare outside a pull request.' };
  }

  // The release pull request consumes changesets — it deletes them and bumps the
  // version. Blocking it for "not adding one" would deadlock every release.
  if (headRef === RELEASE_BRANCH) {
    return { ok: true, status: 'release-pull-request', message: `Skipped on ${RELEASE_BRANCH}.` };
  }

  if (!changedFiles.includes(PIN_FILE)) {
    return { ok: true, status: 'no-pin-change', message: `No change to ${PIN_FILE}.` };
  }

  const changesets = addedFiles.filter(isChangesetFile);
  if (changesets.length > 0) {
    return {
      ok: true,
      status: 'satisfied',
      message: `${PIN_FILE} changed and ${changesets.join(', ')} was added.`,
    };
  }

  return {
    ok: false,
    status: 'missing-changeset',
    message:
      `${PIN_FILE} changed but this pull request adds no changeset.\n\n` +
      `Those versions are installed into every app purrfold generates, so the bump is\n` +
      `user-visible and has to appear in the changelog. Without a changeset it ships\n` +
      `silently.\n\n` +
      `Fix it with:\n\n` +
      `    npm run changeset\n\n` +
      `then commit the generated .changeset/*.md file.`,
  };
}
