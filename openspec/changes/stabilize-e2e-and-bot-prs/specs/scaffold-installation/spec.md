# Scaffold Installation Specification

## Purpose

Define the install sequencing purrfold uses when scaffolding a new app with npm, specifically the boundary between third-party initialization (`create-next-app` / `create-astro-app`, `shadcn init`) and purrfold's own quality-layer dependency install. The goal is to avoid the npm 10 arborist crash `Cannot read properties of null (reading 'edgesOut')` that occurs when the quality-layer dev dependencies are added after third-party initialization.

## Requirements

### Requirement: npm installs use legacy peer dependency resolution

When the selected package manager is npm, purrfold's own dependency-install commands (`npm install --save-dev <quality deps>` and `npm install <runtime deps>`) MUST pass `--legacy-peer-deps`. This bypasses the npm 10 peer-dependency resolution path that crashes with `edgesOut` when adding packages to the lockfile created by `create-next-app` and `shadcn init`. pnpm and bun SHALL remain unchanged.

#### Scenario: npm quality-layer install succeeds

- GIVEN a scaffold invocation with `--pm npm` (or npm detected) and `--no-skip-install`
- WHEN `shadcn init` completes and purrfold installs the quality-layer dev dependencies
- THEN the command is `npm install --legacy-peer-deps --save-dev <quality deps>`
- AND the install exits 0 on npm 10

#### Scenario: pnpm path is unchanged

- GIVEN a scaffold invocation with `--pm pnpm`
- WHEN the install sequence is traced through the Executor
- THEN the quality-layer command remains `pnpm add -D <quality deps>`
- AND no `--legacy-peer-deps` flag appears

#### Scenario: bun path is unchanged

- GIVEN a scaffold invocation with `--pm bun`
- WHEN the install sequence is traced through the Executor
- THEN the quality-layer command remains `bun add -d <quality deps>`
- AND no `--legacy-peer-deps` flag appears

#### Scenario: skip-install short-circuits quality install

- GIVEN a scaffold invocation with `--skip-install`
- WHEN the install sequence is traced through the Executor
- THEN neither the npm quality-layer install nor any runtime-dep install is executed

### Requirement: dry-run command is regression-locked

The dry-run Executor trace for an npm scaffold MUST emit `npm install --legacy-peer-deps --save-dev <quality deps>` after the shadcn initialization command. A regression test MUST assert this command is present and that pnpm/bun traces contain no such npm command.

#### Scenario: npm trace asserts legacy peer deps

- GIVEN a dry-run npm scaffold trace captured by the test Executor
- WHEN the trace is inspected
- THEN it contains `run npm install --legacy-peer-deps --save-dev`
- AND it appears after the shadcn init command

#### Scenario: pnpm and bun traces assert no npm legacy-peer-deps command

- GIVEN dry-run pnpm and bun scaffold traces captured by the test Executor
- WHEN each trace is inspected
- THEN neither trace contains `npm install --legacy-peer-deps --save-dev`
