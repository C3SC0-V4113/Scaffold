#!/usr/bin/env node
// CI guard: a pull request that changes the generated-app version pins must ship
// the changeset those pins require. The decision itself lives in
// scripts/changeset-rules.mjs so it can be unit-tested; this file only collects
// the git facts and reports.
//
// Usage (see the changeset-guard job in .github/workflows/ci.yml):
//   BASE_SHA=<sha> HEAD_REF=<branch> node scripts/changeset-guard.mjs

import { execFileSync } from 'node:child_process';

import { evaluateChangesetGuard } from './changeset-rules.mjs';

function gitFiles(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const eventName = process.env.EVENT_NAME ?? 'pull_request';
const headRef = process.env.HEAD_REF ?? '';
const baseSha = process.env.BASE_SHA ?? '';

let changedFiles = [];
let addedFiles = [];

if (eventName === 'pull_request') {
  if (!baseSha) {
    throw new Error('BASE_SHA is required to diff a pull request.');
  }
  // HEAD is the merge commit, so diffing it against the base tip yields exactly
  // this pull request's changes — the same approach as the `changes` job in
  // .github/workflows/e2e.yml.
  changedFiles = gitFiles(['diff', '--name-only', baseSha, 'HEAD']);
  addedFiles = gitFiles(['diff', '--name-only', '--diff-filter=A', baseSha, 'HEAD']);
}

const result = evaluateChangesetGuard({ changedFiles, addedFiles, headRef, eventName });

if (!result.ok) {
  console.error(`\n✗ changeset-guard: ${result.message}\n`);
  process.exit(1);
}

console.log(`✓ changeset-guard (${result.status}): ${result.message}`);
