# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
It records the changes you make so versions and the `CHANGELOG.md` stay in sync.

## Workflow

1. After making a change, add a changeset describing it and the bump type:

   ```bash
   npm run changeset
   ```

2. When you are ready to release, apply the pending changesets (bumps the
   version and writes `CHANGELOG.md`), then commit:

   ```bash
   npm run changeset:version
   git commit -am "release: version packages"
   ```

3. Publish to npm (runs `npm run check` via `prepublishOnly` and tags the release):

   ```bash
   npm run release
   ```

See the [changesets docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
for more detail.
