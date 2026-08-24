# Next App Router Linting Specification

## Purpose

Define the generated ESLint configuration behavior for Next.js App Router projects scaffolded by purrfold, so required Next.js metadata exports (`metadata`, `viewport`, `revalidate`) in `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}` do not trigger `react-doctor/only-export-components` warnings, while strict linting (`--max-warnings 0`) is retained for all other files and rules.

## Requirements

### Requirement: App Router metadata exports exempted from only-export-components

The generated Next.js ESLint config MUST include an override that turns `react-doctor/only-export-components` off for files matching `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}`. The override SHALL NOT apply to any other path or to Astro projects. The override SHALL NOT disable any other `react-doctor` rule.

#### Scenario: generated layout lints cleanly with metadata export

- GIVEN a scaffolded Next App Router project whose `app/layout.tsx` exports `metadata` and a default component
- WHEN the generated `lint` script runs with `--max-warnings 0`
- THEN `react-doctor/only-export-components` produces zero warnings for `app/layout.tsx`
- AND the lint command exits 0

#### Scenario: generated page lints cleanly with metadata export

- GIVEN a scaffolded Next App Router project whose `app/page.tsx` exports `metadata` and a default component
- WHEN the generated `lint` script runs with `--max-warnings 0`
- THEN no `react-doctor/only-export-components` warning is raised for `app/page.tsx`

#### Scenario: non-App-Router files keep the rule active

- GIVEN a scaffolded Next project with a component file outside `app/**/layout` and `app/**/page` that exports a non-component value
- WHEN the generated `lint` script runs
- THEN `react-doctor/only-export-components` still flags that file
- AND strict `--max-warnings 0` behavior is preserved

#### Scenario: Astro config is unaffected

- GIVEN a scaffolded Astro project
- WHEN its generated ESLint config is inspected
- THEN no `app/**` override is present
- AND the Astro lint behavior matches the pre-change configuration

### Requirement: strict linting retained

The generated `lint` script MUST continue to use `--max-warnings 0`. The override MUST be narrowly scoped to the App Router metadata-export files; it SHALL NOT relax `--max-warnings 0` or disable any rule other than `react-doctor/only-export-components` on those paths.

#### Scenario: max-warnings stays zero

- GIVEN any scaffolded Next or Astro project
- WHEN the generated `package.json` lint script is inspected
- THEN the script contains `--max-warnings 0`

#### Scenario: override scope is restricted to named rules and paths

- GIVEN the generated Next ESLint config
- WHEN the override block is inspected
- THEN only `react-doctor/only-export-components` is set to `off`
- AND the files glob is limited to `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}`

### Requirement: rendered template is regression-locked

A template test MUST assert the rendered Next ESLint config contains the App Router override scoped to the named paths and rule, and MUST assert the Astro config does not contain it.

#### Scenario: snapshot asserts override presence in Next config

- GIVEN the rendered Next ESLint config produced by the template module
- WHEN the config string is inspected by the test
- THEN it contains an override entry for `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}` with `react-doctor/only-export-components` off

#### Scenario: snapshot asserts override absence in Astro config

- GIVEN the rendered Astro ESLint config produced by the template module
- WHEN the config string is inspected by the test
- THEN it does not contain an `app/**` override
