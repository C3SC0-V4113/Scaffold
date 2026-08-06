---
'purrfold': patch
---

Ignore the Cloudflare adapter's local state in generated apps.

`--adapter cloudflare` is not just supported, it is the **default** adapter when
`--ssr` is enabled — so purrfold installs `@astrojs/cloudflare` and then left
every artifact that adapter produces untracked but visible. Generated Cloudflare
apps now also ignore:

- `.wrangler/` — local adapter state
- `.dev.vars` — **Cloudflare secrets**, which is the one that mattered
- `worker-configuration.d.ts` — regenerable `wrangler types` output

The entries are gated on `ssr && astroAdapter === 'cloudflare'`, because purrfold
ignores what purrfold creates. Next.js apps, Astro without SSR, and the
`node`/`vercel`/`netlify` adapters are unchanged. Existing generated apps are
untouched.

No matching `doctor.config.json` change: react-doctor already hardcodes
`.wrangler` in its own `IGNORED_DIRECTORIES` set, so adding it there would be a
no-op. Its `.gitignore` reader only feeds the dead-code rules, not the file
walker — two separate mechanisms.
