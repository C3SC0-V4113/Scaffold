import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKFLOW_DIR = path.join(process.cwd(), '.github', 'workflows');

/** Actions published by GitHub itself. */
const FIRST_PARTY = /^actions\//;

function workflowUses() {
  return readdirSync(WORKFLOW_DIR)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .flatMap((file) => {
      const content = readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
      return [...content.matchAll(/^\s*uses:\s*(\S+)/gm)].map((match) => ({ file, ref: match[1] }));
    });
}

describe('workflow action pinning', () => {
  it('pins every third-party action to a commit SHA', () => {
    const thirdParty = workflowUses().filter((entry) => !FIRST_PARTY.test(entry.ref));

    // A tag or branch can be repointed by its owner after any review. A SHA
    // cannot. This matters most for changesets/action, the only third-party
    // action in the job holding id-token: write — and whose `v1` ref was a
    // branch, not even a tag.
    expect(thirdParty.length).toBeGreaterThan(0);
    for (const { file, ref } of thirdParty) {
      expect(ref, `${file} uses ${ref}`).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it('keeps a readable version comment beside each pinned SHA', () => {
    const files = readdirSync(WORKFLOW_DIR).filter((file) => file.endsWith('.yml'));

    for (const file of files) {
      const content = readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = /^\s*uses:\s*(\S+@[0-9a-f]{40})\s*(.*)$/.exec(line);
        if (!match) continue;
        // Dependabot maintains this comment; without it a reviewer sees only a
        // hash and cannot tell which version is running.
        expect(match[2], `${file}: ${match[1]} has no version comment`).toMatch(/^#\s*v\d+\.\d+\.\d+/);
      }
    }
  });

  it('leaves GitHub-owned actions on tags', () => {
    const firstParty = workflowUses().filter((entry) => FIRST_PARTY.test(entry.ref));

    // Deliberate scope limit. A repository that already trusts GitHub with its
    // OIDC identity gains nothing by pinning GitHub's own actions, and SHA pins
    // there cost readability for no reduction in exposure.
    expect(firstParty.length).toBeGreaterThan(0);
    for (const { file, ref } of firstParty) {
      expect(ref, `${file} uses ${ref}`).toMatch(/@v\d/);
    }
  });
});
