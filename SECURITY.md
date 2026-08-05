# Security Policy

## Supported versions

purrfold is a scaffolding CLI released from a single line. Only the latest
published minor receives fixes; there are no long-term support branches.

| Version | Supported |
|---|---|
| Latest published minor | Yes |
| Anything older | No — upgrade first |

Upgrading is not disruptive: the CLI is normally invoked as
`npx purrfold@latest`, so a new run already picks up the current release.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub Security Advisories:

1. Go to the [Security tab](https://github.com/C3SC0-V4113/Scaffold/security/advisories)
2. Click **Report a vulnerability**
3. Describe the issue, the impact, and how to reproduce it

You will get an acknowledgement within a few days. If a fix is warranted, the
advisory tracks it through to a published release, and you will be credited
unless you ask otherwise.

## Scope

purrfold generates projects; it does not run as a service and holds no user
data. The things worth reporting are:

- **Code execution during generation** — anything that lets a flag value, a
  scenario name, or a forwarded `--shadcn-args` argument run an unintended
  command on the user's machine
- **Supply-chain exposure in generated apps** — a pin in `src/versions.json`
  that resolves to a compromised or malicious package
- **Tampering with the published artifact** — anything suggesting the npm
  tarball does not match this repository

Out of scope: vulnerabilities in the upstream tools purrfold invokes
(`create-next-app`, `create-astro`, `shadcn`) or in the dependencies of a
generated app. Report those to their own maintainers. If a pinned version in
`src/versions.json` is the vector, that is in scope here.
