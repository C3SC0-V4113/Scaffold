import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { renderPlaywrightWorkflow, renderQualityWorkflow } from '../src/templates/files.js';
import versions from '../src/versions.json' with { type: 'json' };

const packageManagers = ['npm', 'pnpm', 'bun'] as const;

interface ParsedWorkflow {
  name: string;
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<
    string,
    {
      'runs-on': string;
      'timeout-minutes': number;
      steps: Array<{ name?: string; uses?: string; run?: string; with?: Record<string, unknown> }>;
    }
  >;
}

const renderers = {
  'quality.yml': renderQualityWorkflow,
  'playwright.yml': renderPlaywrightWorkflow,
} as const;

function parseWorkflow(yaml: string): ParsedWorkflow {
  return parse(yaml) as ParsedWorkflow;
}

function stepsOf(workflow: ParsedWorkflow) {
  return Object.values(workflow.jobs).flatMap((job) => job.steps);
}

describe('generated GitHub Actions workflows', () => {
  // Nothing used to prove the emitted string was even parseable — the previous
  // template interpolated an empty package-manager block that left two blank
  // lines in the npm output, which a snapshot happily froze in place.
  for (const [file, render] of Object.entries(renderers)) {
    for (const packageManager of packageManagers) {
      it(`emits parseable YAML for ${file} with ${packageManager}`, () => {
        const workflow = parseWorkflow(render(packageManager));

        expect(workflow.name).toBeTruthy();
        expect(Object.keys(workflow.jobs)).toHaveLength(1);

        const job = Object.values(workflow.jobs)[0];
        expect(job['runs-on']).toBe('ubuntu-latest');
        expect(job.steps.length).toBeGreaterThan(0);
      });

      it(`bounds runtime and cancels superseded runs in ${file} with ${packageManager}`, () => {
        const workflow = parseWorkflow(render(packageManager));

        // An unbounded job can burn the full 6-hour default on a hung install.
        expect(Object.values(workflow.jobs)[0]['timeout-minutes']).toBeGreaterThan(0);
        expect(workflow.concurrency['cancel-in-progress']).toBe(true);
        // Least privilege: neither workflow writes to the repo.
        expect(workflow.permissions).toEqual({ contents: 'read' });
      });

      it(`does not double-run on pushes to PR branches in ${file} with ${packageManager}`, () => {
        const workflow = parseWorkflow(render(packageManager));
        const push = workflow.on.push as { branches: string[] };

        // A `'**'` filter here fires both the push and pull_request events for
        // every push to a branch with an open PR, running the job twice with
        // byte-identical results.
        expect(push.branches).toEqual(['main']);
        expect(push.branches).not.toContain('**');
      });

      it(`pins every action from versions.json in ${file} with ${packageManager}`, () => {
        const used = stepsOf(parseWorkflow(render(packageManager)))
          .map((step) => step.uses)
          .filter((uses): uses is string => Boolean(uses));

        expect(used.length).toBeGreaterThan(0);

        for (const reference of used) {
          const [name, ref] = reference.split('@');
          // Guards the whole point of this change: a ref inlined in the
          // template is invisible to Renovate and rots into a deprecated
          // runner, which is how every app generated before this shipped ended
          // up warning about node20.
          if (name.startsWith('actions/')) {
            expect(versions.actions).toHaveProperty([name]);
            expect(ref).toBe(versions.actions[name as keyof typeof versions.actions]);
            continue;
          }

          const pin = versions.thirdPartyActions[name as keyof typeof versions.thirdPartyActions];
          expect(pin, `${name} is not registered in versions.json`).toBeDefined();
          // The trailing `# vX.Y.Z` is a real YAML comment, so the parsed value
          // is the bare SHA. The comment itself is asserted on the raw text.
          expect(ref).toBe(pin.sha);
        }
      });

      // Mirrors tests/workflow-pinning.test.ts, which enforces this on
      // purrfold's own workflows. Generating tag-referenced third-party actions
      // into other people's repositories would contradict the posture this
      // repository adopted for itself.
      it(`SHA-pins third-party actions in ${file} with ${packageManager}`, () => {
        const raw = render(packageManager);
        const references = [...raw.matchAll(/^\s*uses:\s*(\S+)(.*)$/gm)];

        expect(references.length).toBeGreaterThan(0);

        for (const [, reference, trailing] of references) {
          const name = reference.split('@')[0];
          if (name.startsWith('actions/')) {
            // A repo already trusting GitHub with its runner gains nothing from
            // hashing GitHub's own actions, and it costs readability.
            expect(reference, `${name} should stay on a tag`).toMatch(/@v\d/);
            continue;
          }

          // A tag or branch can be repointed by its owner after any review.
          expect(reference, `${name} should be SHA-pinned`).toMatch(/@[0-9a-f]{40}$/);
          // Without the comment a reviewer sees only a hash and cannot tell
          // which version is running.
          expect(trailing.trim(), `${name} has no version comment`).toMatch(/^#\s*v\d+\.\d+\.\d+/);
        }
      });

      it(`runs on the pinned Node version in ${file} with ${packageManager}`, () => {
        const setupNode = stepsOf(parseWorkflow(render(packageManager))).find((step) =>
          step.uses?.startsWith('actions/setup-node@')
        );

        expect(setupNode?.with?.['node-version']).toBe(Number(versions.toolchain.node));
      });
    }
  }

  it('lets pnpm/action-setup read the version from packageManager', () => {
    const setupPnpm = stepsOf(parseWorkflow(renderQualityWorkflow('pnpm'))).find((step) =>
      step.uses?.startsWith('pnpm/action-setup@')
    );

    expect(setupPnpm).toBeDefined();
    // The action refuses to run when `version:` and a `packageManager` field are
    // both set, and the generated package.json always carries the field. The
    // old `version: latest` also let a pnpm major land in CI with no commit to
    // point at when it broke.
    expect(setupPnpm?.with?.version).toBeUndefined();
  });

  it('caches the package manager for npm and pnpm but not bun', () => {
    const cacheInput = (packageManager: string) =>
      stepsOf(parseWorkflow(renderQualityWorkflow(packageManager))).find((step) =>
        step.uses?.startsWith('actions/setup-node@')
      )?.with?.cache;

    expect(cacheInput('npm')).toBe('npm');
    expect(cacheInput('pnpm')).toBe('pnpm');
    // setup-node has no bun cache backend; asking for one fails the step.
    expect(cacheInput('bun')).toBeUndefined();
  });

  it('only sets up a package manager when one is needed', () => {
    const setupNames = (packageManager: string) =>
      stepsOf(parseWorkflow(renderQualityWorkflow(packageManager)))
        .map((step) => step.uses ?? '')
        .filter((uses) => uses.includes('action-setup') || uses.includes('setup-bun'));

    expect(setupNames('npm')).toEqual([]);
    expect(setupNames('pnpm')).toHaveLength(1);
    expect(setupNames('bun')).toHaveLength(1);
  });

  it('runs the check script with the selected package manager', () => {
    expect(renderQualityWorkflow('npm')).toContain('run: npm run check');
    expect(renderQualityWorkflow('pnpm')).toContain('run: pnpm run check');
    expect(renderQualityWorkflow('bun')).toContain('run: bun run check');
  });

  describe('playwright.yml', () => {
    it('restricts CI to chromium', () => {
      const runs = stepsOf(parseWorkflow(renderPlaywrightWorkflow('npm')))
        .map((step) => step.run ?? '')
        .filter((run) => run.includes('playwright'));

      // The full firefox/webkit matrix stays on the local `test:e2e` script;
      // installing three browser families per run is the bulk of the minutes.
      expect(runs.some((run) => run.includes('playwright test --project=chromium'))).toBe(true);
      for (const run of runs) {
        expect(run).not.toMatch(/playwright (install|test)(?!.*chromium)/);
      }
    });

    it('caches browser binaries keyed by the installed Playwright version', () => {
      const steps = stepsOf(parseWorkflow(renderPlaywrightWorkflow('npm')));
      const cache = steps.find((step) => step.uses?.startsWith('actions/cache@'));

      expect(cache?.with?.path).toBe('~/.cache/ms-playwright');
      // A pin bump has to invalidate the cache, or CI silently keeps testing
      // against the browsers the previous version installed.
      expect(String(cache?.with?.key)).toContain('steps.playwright-version.outputs.version');

      // OS-level deps are not cacheable, so a cache hit still needs install-deps.
      const onHit = steps.find((step) => step.run?.includes('playwright install-deps'));
      expect(onHit).toBeDefined();
    });

    it('uploads the report on failure with a bounded retention', () => {
      const upload = stepsOf(parseWorkflow(renderPlaywrightWorkflow('npm'))).find((step) =>
        step.uses?.startsWith('actions/upload-artifact@')
      );

      expect(upload?.with?.['retention-days']).toBe(7);
      expect(upload?.with?.name).toBe('playwright-report');
    });

    it('uses the package manager runner to invoke playwright', () => {
      expect(renderPlaywrightWorkflow('npm')).toContain('npx playwright test');
      expect(renderPlaywrightWorkflow('pnpm')).toContain('pnpm exec playwright test');
      expect(renderPlaywrightWorkflow('bun')).toContain('bunx --bun playwright test');
    });
  });
});
