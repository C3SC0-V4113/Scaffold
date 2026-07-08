# Apply Progress: Add Astro as a First-Class Framework Option

## Batch 1 — PR1 / Foundation

### Completed Tasks
- [x] 1.1 Add `Framework`/`CreateOptions.framework` and registry contracts in `src/types.ts` and `src/frameworks/registry.ts`.
- [x] 1.2 Update `src/commands/create.ts` and `src/cli.ts` so framework is the first prompt, `--framework <next|astro>` is accepted, and `--yes` defaults to Next.
- [x] 1.3 Mirror framework choices in `src/cli-metadata.ts` and any option/schema rendering.

### TDD Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/create.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.2 | `tests/create.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.3 | `tests/cli-metadata.test.ts`, `tests/cli-info.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 2 assertions | ✅ Clean |

### Notes
- Next.js remains the default framework in this batch.
- Astro scaffolding is intentionally deferred to the next slice.
