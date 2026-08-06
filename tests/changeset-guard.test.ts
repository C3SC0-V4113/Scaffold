import { describe, expect, it } from 'vitest';

// @ts-expect-error -- plain ESM script module, no type declarations
import { evaluateChangesetGuard, isChangesetFile, PIN_FILE, RELEASE_BRANCH } from '../scripts/changeset-rules.mjs';

const pullRequest = (input: Record<string, unknown>) => evaluateChangesetGuard({ eventName: 'pull_request', ...input });

describe('changeset guard', () => {
  it('blocks a pin bump that ships no changeset', () => {
    const result = pullRequest({ changedFiles: [PIN_FILE], addedFiles: [] });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('missing-changeset');
    // The message has to teach the fix, not just name the rule — this fires on
    // Renovate pull requests, where the reader did not write the change.
    expect(result.message).toContain('npm run changeset');
    expect(result.message).toContain('every app purrfold generates');
  });

  it('allows a pin bump that adds one', () => {
    const result = pullRequest({
      changedFiles: [PIN_FILE, 'package.json'],
      addedFiles: ['.changeset/brave-lions-sing.md'],
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('satisfied');
  });

  it('ignores pull requests that leave the pins alone', () => {
    const result = pullRequest({
      changedFiles: ['src/installers/skills.ts', 'README.md'],
      addedFiles: [],
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('no-pin-change');
  });

  it('never blocks the release pull request', () => {
    // changesets/action's version pull request deletes changesets and bumps the
    // version. Blocking it for "not adding one" would deadlock every release.
    const result = pullRequest({
      changedFiles: [PIN_FILE, 'CHANGELOG.md', 'package.json'],
      addedFiles: [],
      headRef: RELEASE_BRANCH,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('release-pull-request');
  });

  it('does nothing outside a pull request', () => {
    const result = evaluateChangesetGuard({ eventName: 'push', changedFiles: [PIN_FILE], addedFiles: [] });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('not-a-pull-request');
  });

  it('does not accept the changeset README as a changeset', () => {
    expect(isChangesetFile('.changeset/README.md')).toBe(false);
    expect(isChangesetFile('.changeset/config.json')).toBe(false);
    expect(isChangesetFile('.changeset/brave-lions-sing.md')).toBe(true);
    expect(isChangesetFile('docs/adr/0001-node-engine-floor.md')).toBe(false);
  });

  it('requires the changeset to be added, not merely present elsewhere in the diff', () => {
    // A modified changeset is not evidence that this bump was documented; the
    // added-file list is the precise signal.
    const result = pullRequest({
      changedFiles: [PIN_FILE, '.changeset/brave-lions-sing.md'],
      addedFiles: [],
    });

    expect(result.ok).toBe(false);
  });

  it('reproduces the seven historical pin bumps that shipped without one', () => {
    // Every commit that touched src/versions.json before this guard existed was
    // authored by renovate[bot] or a human and added no changeset in the same
    // change. This is the regression the guard exists to prevent.
    const historicalRenovateBump = { changedFiles: [PIN_FILE], addedFiles: [] };

    expect(pullRequest(historicalRenovateBump).ok).toBe(false);
  });
});
