# App Router and Motion Linting Specification

## Purpose

Define the generated ESLint configuration behavior for Next.js App Router and Astro projects scaffolded by purrfold. Required Next.js metadata exports (`metadata`, `viewport`, `revalidate`) in `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}` must not trigger `react-doctor/only-export-components` warnings, and the generated Motion wrapper in both frameworks must not trigger `react-doctor/jsx-no-new-object-as-prop` warnings, while strict linting (`--max-warnings 0`) is retained for all other files and rules.

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

### Requirement: Next Motion wrapper exempted from jsx-no-new-object-as-prop

When Motion is enabled for a Next.js project, the generated `components/common/motion-main.tsx` file MUST be exempted from `react-doctor/jsx-no-new-object-as-prop` only. The override SHALL NOT apply to Astro projects, to non-Motion Next projects, or to any other rule.

#### Scenario: generated Next Motion wrapper lints cleanly with inline animation props

- GIVEN a scaffolded Next App Router project with Motion enabled
- WHEN the generated `lint` script runs with `--max-warnings 0`
- THEN `react-doctor/jsx-no-new-object-as-prop` produces zero warnings for `components/common/motion-main.tsx`
- AND the lint command exits 0

#### Scenario: Next Motion override is absent when Motion is not selected

- GIVEN a scaffolded Next project without Motion
- WHEN its generated ESLint config is inspected
- THEN no `components/common/motion-main.tsx` override is present

### Requirement: Astro Motion wrapper exempted from jsx-no-new-object-as-prop

When Motion is enabled for an Astro project, the generated `src/components/common/motion-main.tsx` file MUST be exempted from `react-doctor/jsx-no-new-object-as-prop` only. The override SHALL NOT apply to Next projects, to non-Motion Astro projects, or to any other rule.

#### Scenario: generated Astro Motion wrapper lints cleanly with inline animation props

- GIVEN a scaffolded Astro project with Motion enabled
- WHEN the generated `lint` script runs with `--max-warnings 0`
- THEN `react-doctor/jsx-no-new-object-as-prop` produces zero warnings for `src/components/common/motion-main.tsx`
- AND the lint command exits 0

#### Scenario: Astro Motion override is absent when Motion is not selected

- GIVEN a scaffolded Astro project without Motion
- WHEN its generated ESLint config is inspected
- THEN no `src/components/common/motion-main.tsx` override is present

### Requirement: strict linting retained

The generated `lint` script MUST continue to use `--max-warnings 0`. Overrides MUST be narrowly scoped to the named paths and rules; they SHALL NOT relax `--max-warnings 0` or disable any rule other than the one named for each glob.

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

A template test MUST assert the rendered Next ESLint config contains the App Router override scoped to the named paths and rule, the Motion wrapper override scoped to `components/common/motion-main.tsx` and `react-doctor/jsx-no-new-object-as-prop` when Motion is enabled, the rendered Astro ESLint config contains the Motion wrapper override scoped to `src/components/common/motion-main.tsx` and `react-doctor/jsx-no-new-object-as-prop` when Motion is enabled, and MUST assert the Astro config does not contain either Next-only override and the Next config does not contain the Astro Motion path.

#### Scenario: snapshot asserts override presence in Next config

- GIVEN the rendered Next ESLint config produced by the template module
- WHEN the config string is inspected by the test
- THEN it contains an override entry for `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}` with `react-doctor/only-export-components` off

#### Scenario: snapshot asserts override absence in Astro config

- GIVEN the rendered Astro ESLint config produced by the template module
- WHEN the config string is inspected by the test
- THEN it does not contain an `app/**` override
