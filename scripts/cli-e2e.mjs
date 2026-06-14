#!/usr/bin/env node
import { buildCli, cleanupContext, createRunContext, readListFlag, runScenario } from './e2e/harness.mjs';
import { selectScenarios } from './e2e/scenarios.mjs';

const quick = process.argv.includes('--quick');
const failOnTtyMissing = process.argv.includes('--require-tty');
const names = readListFlag(process.argv, '--scenario');
const context = createRunContext(process.argv, quick ? 'purrfold-e2e-quick-' : 'purrfold-e2e-');
const scenarios = selectScenarios({ quick, names });
const cliPath = buildCli();
const results = [];

for (const scenario of scenarios) {
  console.log(`\n=== ${scenario.name} ===`);
  try {
    const result = await runScenario(scenario, context, cliPath, { prefix: quick ? 'quick' : 'e2e' });
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

const hasFailures = results.some((result) => !result.ok);
if (!hasFailures) {
  cleanupContext(context);
} else {
  console.error(`\nPreserved CLI E2E work directory for debugging: ${context.workDir}`);
}

process.exit(hasFailures ? 1 : 0);
