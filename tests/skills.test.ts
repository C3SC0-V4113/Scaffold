import { describe, expect, it, vi } from 'vitest';

import {
  buildSkillInstallCommands,
  installSkills,
  renderSkillsScript,
  selectSkillNames,
} from '../src/installers/skills.js';
import { DryRunExecutor } from '../src/executor.js';
import type { CreateOptions, Executor } from '../src/types.js';

const ownedSkills = [
  'project-architecture',
  'shadcn-component-boundaries',
  'project-min-evaluation',
  'decision-doc-sync',
] as const;

const ownedSkillsCommand =
  'npx --yes skills@latest add C3SC0-V4113/Scaffold --skill project-architecture --skill shadcn-component-boundaries --skill project-min-evaluation --skill decision-doc-sync --agent codex --copy --yes';

const reactDoctorSkillCommand =
  'npx --yes skills@latest add millionco/react-doctor --skill react-doctor --agent codex --copy --yes';

const createOptions: CreateOptions = {
  targetDir: 'my-app',
  framework: 'next',
  packageManager: 'npm',
  ssr: false,
  unit: false,
  e2e: false,
  commitlint: false,
  ci: false,
  motion: false,
  yes: true,
  dryRun: false,
  skipInstall: false,
  shadcnArgs: [],
  mcp: false,
};

class FailingRunExecutor implements Executor {
  readonly writes = new Map<string, string>();

  async run(_command?: string, _args?: string[]): Promise<void> {
    throw new Error('network unavailable');
  }

  async capture() {
    return undefined;
  }

  async ensureDir() {}

  async pathExists() {
    return false;
  }

  async readFile() {
    return '';
  }

  async writeFile(path: string, content: string) {
    this.writes.set(path, content);
  }

  async writeJson() {}

  async remove() {}

  async symlinkOrJunction() {}
}

class SucceedingRunExecutor extends FailingRunExecutor {
  override async run() {}
}

/** Fails only the grouped command for one source, so the rest must still run. */
class SourceFailingRunExecutor extends FailingRunExecutor {
  readonly runs: string[] = [];

  constructor(private readonly failingSource: string) {
    super();
  }

  override async run(command: string, args: string[]) {
    this.runs.push([command, ...args].join(' '));
    if (args.includes(this.failingSource)) {
      throw new Error('network unavailable');
    }
  }
}

describe('skill selection', () => {
  it('selects always-on skills', () => {
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false, motion: false })).toEqual(
      expect.arrayContaining([
        'architecture-decision-records',
        'next-cache-components-adoption',
        'next-cache-components-optimizer',
        'next-dev-loop',
        'project-architecture',
        'shadcn-component-boundaries',
        'project-min-evaluation',
        'react-doctor',
        'shadcn',
        'verification-before-completion',
      ])
    );
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false, motion: false })).not.toEqual(
      expect.arrayContaining(['next-best-practices'])
    );
  });

  it.each(['next', 'astro'] as const)(
    'selects the purrfold-owned skills and React Doctor for %s',
    (framework) => {
      expect(selectSkillNames({ framework, unit: false, e2e: false, motion: false })).toEqual(
        expect.arrayContaining([...ownedSkills, 'react-doctor'])
      );
    }
  );

  it('adds Vitest and Playwright skills only when selected', () => {
    expect(selectSkillNames({ framework: 'next', unit: true, e2e: true, motion: false })).toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false, motion: false })).not.toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
  });

  it('drops Next-only workflow skills for Astro', () => {
    expect(selectSkillNames({ framework: 'astro', unit: false, e2e: false, motion: false })).not.toEqual(
      expect.arrayContaining([
        'next-cache-components-adoption',
        'next-cache-components-optimizer',
        'next-dev-loop',
      ])
    );
  });

  it('adds motion-framer only when Motion is selected', () => {
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false, motion: true })).toContain(
      'motion-framer'
    );
    expect(selectSkillNames({ framework: 'astro', unit: false, e2e: false, motion: true })).toContain(
      'motion-framer'
    );
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false, motion: false })).not.toContain(
      'motion-framer'
    );
  });
});

describe('external skill install script', () => {
  it('renders npx skills commands grouped by source', () => {
    const script = renderSkillsScript({ framework: 'next', unit: false, e2e: false, motion: false });

    expect(script).toContain(
      'npx --yes skills@latest add https://github.com/vercel-labs/agent-skills --skill vercel-composition-patterns --skill vercel-react-best-practices --agent codex --copy --yes'
    );
    expect(script).toContain(
      'npx --yes skills@latest add vercel/next.js --skill next-cache-components-adoption --skill next-cache-components-optimizer --skill next-dev-loop --agent codex --copy --yes'
    );
    expect(script).not.toContain('next-best-practices');
    expect(script).toContain('--agent codex --copy --yes');
    expect(script).not.toContain('skills-lock.json');
  });

  it.each(['next', 'astro'] as const)(
    'fetches the purrfold-owned skills and React Doctor from their published sources for %s',
    (framework) => {
      const commands = buildSkillInstallCommands({ framework, unit: false, e2e: false, motion: false }).map(
        ({ command, args }) => [command, ...args].join(' ')
      );

      expect(commands).toContain(ownedSkillsCommand);
      expect(commands).toContain(reactDoctorSkillCommand);
      expect(commands.filter((command) => command.includes('C3SC0-V4113/Scaffold'))).toHaveLength(1);
      const script = renderSkillsScript({ framework, unit: false, e2e: false, motion: false });
      expect(script).toContain(ownedSkillsCommand);
      expect(script).toContain(reactDoctorSkillCommand);
    }
  );

  it('omits Next-only skill commands for Astro', () => {
    const script = renderSkillsScript({ framework: 'astro', unit: false, e2e: false, motion: false });

    expect(script).toContain(
      'npx --yes skills@latest add https://github.com/astrolicious/agent-skills --skill astro --agent codex --copy --yes'
    );
    expect(script).not.toContain('next-cache-components-adoption');
    expect(script).not.toContain('next-cache-components-optimizer');
    expect(script).not.toContain('next-dev-loop');
  });

  it('adds Vitest and Playwright install commands only when selected', () => {
    const selectedCommands = buildSkillInstallCommands({ framework: 'next', unit: true, e2e: true, motion: false });
    const unselectedScript = renderSkillsScript({ framework: 'next', unit: false, e2e: false, motion: false });
    const selectedScript = selectedCommands
      .map(({ command, args }) => [command, ...args].join(' '))
      .join('\n');

    expect(selectedScript).toContain('pproenca/dot-skills --skill vitest');
    expect(selectedScript).toContain(
      'currents-dev/playwright-best-practices-skill --skill playwright-best-practices'
    );
    expect(selectedScript).toContain('microsoft/playwright-cli --skill playwright-cli');
    expect(unselectedScript).not.toContain('--skill vitest');
    expect(unselectedScript).not.toContain('--skill playwright-best-practices');
    expect(unselectedScript).not.toContain('--skill playwright-cli');
  });

  it('mirrors the conditional motion-framer install in skills.sh', () => {
    const selected = renderSkillsScript({
      framework: 'next',
      unit: false,
      e2e: false,
      motion: true,
    });
    const unselected = renderSkillsScript({
      framework: 'next',
      unit: false,
      e2e: false,
      motion: false,
    });

    expect(selected).toContain(
      'npx --yes skills@latest add freshtechbro/claudedesignskills --skill motion-framer --agent codex --copy --yes'
    );
    expect(unselected).not.toContain('motion-framer');
  });

});

describe('skill installation', () => {
  function warnings() {
    // mockClear matters: vi.spyOn returns the existing spy when console.warn is
    // already mocked, so without it this reads the previous test's output.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warn.mockClear();
    return warn;
  }

  function failureSummary(warn: ReturnType<typeof warnings>) {
    return warn.mock.calls
      .map((call) => String(call[0]))
      .find((message) => message.includes('could not be installed'));
  }

  it('creates .agents/skills before linking .claude/skills, then writes skills.sh and downloads', async () => {
    const executor = new DryRunExecutor();

    await installSkills('my-app', { ...createOptions, dryRun: true }, executor);

    const operations = executor.operations.map((operation) => operation.replaceAll('\\', '/'));
    const mkdir = operations.indexOf('mkdir my-app/.agents/skills');
    const link = operations.findIndex((operation) => operation.startsWith('link my-app/.claude/skills ->'));
    const script = operations.indexOf('write my-app/skills.sh');
    const firstDownload = operations.findIndex((operation) => operation.startsWith('run npx'));

    expect(mkdir).toBeGreaterThanOrEqual(0);
    expect(mkdir).toBeLessThan(link);
    expect(link).toBeLessThan(script);
    expect(script).toBeLessThan(firstDownload);
    expect(operations).toContain(`run ${ownedSkillsCommand} (cwd my-app)`);
    expect(operations).toContain(`run ${reactDoctorSkillCommand} (cwd my-app)`);
  });

  it('writes no SKILL.md files itself', async () => {
    const executor = new DryRunExecutor();

    await installSkills('my-app', { ...createOptions, dryRun: true }, executor);

    expect(executor.operations.some((operation) => operation.includes('SKILL.md'))).toBe(false);
  });

  it('keeps downloading the other sources when one source fails', async () => {
    const warn = warnings();
    const executor = new SourceFailingRunExecutor('C3SC0-V4113/Scaffold');

    await expect(installSkills('my-app', createOptions, executor)).resolves.toBeUndefined();

    expect(executor.runs).toContain(ownedSkillsCommand);
    expect(executor.runs).toContain(reactDoctorSkillCommand);
    expect(executor.runs).toHaveLength(buildSkillInstallCommands(createOptions).length);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping external skill install'));

    const summary = failureSummary(warn);
    expect(summary).toBeDefined();
    for (const skill of ownedSkills) {
      expect(summary).toContain(skill);
    }
    expect(summary).not.toContain('react-doctor');
    expect(summary).not.toContain('- shadcn\n');
    expect(summary).toContain('4 external skills could not be installed');
    expect(summary).toContain('sh skills.sh');
  });

  it('continues project setup when every external skill install fails', async () => {
    const warn = warnings();
    const executor = new FailingRunExecutor();

    await expect(
      installSkills('my-app', { ...createOptions, unit: true, motion: true }, executor)
    ).resolves.toBeUndefined();

    expect([...executor.writes.keys()]).toEqual([expect.stringContaining('skills.sh')]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping external skill install'));

    // The per-source warnings scroll away behind installer output. Without a
    // closing summary, a generation that fetched nothing looks like one that
    // fetched everything — which is how a real Windows CI failure stayed
    // undiagnosed.
    const summary = failureSummary(warn);
    expect(summary).toBeDefined();
    for (const skill of [...ownedSkills, 'react-doctor', 'shadcn', 'next-dev-loop', 'vitest', 'motion-framer']) {
      expect(summary).toContain(skill);
    }
    expect(summary).toContain('sh skills.sh');
  });

  it('stays silent when every external skill installs', async () => {
    const warn = warnings();

    await installSkills('my-app', createOptions, new SucceedingRunExecutor());

    expect(failureSummary(warn)).toBeUndefined();
  });
});
