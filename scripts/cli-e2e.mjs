#!/usr/bin/env node
import {
  buildCli,
  cleanupContext,
  createRunContext,
  readFlag,
  readListFlag,
  runScenario,
} from './e2e/harness.mjs';
import { scenarioMetadata, selectScenarios } from './e2e/scenarios.mjs';

const quick = process.argv.includes('--quick');
const heavy = process.argv.includes('--heavy');
const list = process.argv.includes('--list');
const failOnTtyMissing = process.argv.includes('--require-tty');
const names = readListFlag(process.argv, '--scenario');
const framework = readFlag(process.argv, '--framework');
if (framework !== undefined && framework !== 'next' && framework !== 'astro') {
  throw new Error(`Unsupported E2E framework filter: ${framework}`);
}
const scenarios = selectScenarios({ quick, heavy, names, framework });
if (list) {
  console.log(JSON.stringify(scenarioMetadata(scenarios)));
  process.exit(0);
}
if (scenarios.length === 0) {
  throw new Error('No CLI E2E scenarios matched the requested filters.');
}
const prefix = quick ? 'purrfold-e2e-quick-' : heavy ? 'purrfold-e2e-heavy-' : 'purrfold-e2e-';
const context = createRunContext(process.argv, prefix);
const results = [];
let hasFailures = true;

try {
  const cliPath = buildCli();

  for (const scenario of scenarios) {
    console.log(`\n=== ${scenario.name} ===`);
    try {
      const result = await runScenario(scenario, context, cliPath, {
        prefix: quick ? 'quick' : heavy ? 'heavy' : 'e2e',
      });
      results.push({ name: result?.name ?? scenario.name, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (scenario.requiresTty && !failOnTtyMissing) {
        console.warn(`SKIP ${scenario.name}: ${message}`);
        results.push({ name: scenario.name, ok: true, skipped: true });
        continue;
      }
      console.error(message);
      results.push({ name: scenario.name, ok: false });
    }
  }

  console.log('\n=== CLI E2E results ===');
  for (const result of results) {
    console.log(`${result.skipped ? 'SKIP' : result.ok ? 'PASS' : 'FAIL'}  ${result.name}`);
  }

  hasFailures = results.some((result) => !result.ok);
} finally {
  if (context.keep) {
    console.log(`\nPreserved CLI E2E work directory by request: ${context.workDir}`);
  } else {
    cleanupContext(context);
  }
}

process.exit(hasFailures ? 1 : 0);
