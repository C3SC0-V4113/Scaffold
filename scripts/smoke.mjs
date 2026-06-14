#!/usr/bin/env node
// End-to-end smoke scenarios for purrfold.
//
// Builds the local CLI, then generates real apps across package managers,
// shadcn presets, testing, and commitlint combinations. Each generated app
// runs its own `check` after generation.
//
// Usage:
//   node scripts/smoke.mjs
//   node scripts/smoke.mjs --work-dir E:\Repositorios\smoke
//   node scripts/smoke.mjs --keep

import { buildCli, cleanupContext, createRunContext, runScenario } from './e2e/harness.mjs';
import { cliE2eScenarios } from './e2e/scenarios.mjs';

const context = createRunContext(process.argv, 'purrfold-smoke-');
const cliPath = buildCli();
const scenarios = cliE2eScenarios.filter((scenario) => scenario.kind === 'real');
const results = [];

for (const scenario of scenarios) {
  console.log(`\n=== ${scenario.name} ===`);
  try {
    const result = await runScenario(scenario, context, cliPath, { prefix: 'sm' });
    results.push({ name: result.name, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    results.push({ name: scenario.name, ok: false });
  }
}

console.log('\n=== Smoke results ===');
for (const { name, ok } of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

const hasFailures = results.some((result) => !result.ok);
if (!hasFailures) {
  cleanupContext(context);
} else {
  console.error(`\nPreserved smoke work directory for debugging: ${context.workDir}`);
}

process.exit(hasFailures ? 1 : 0);
