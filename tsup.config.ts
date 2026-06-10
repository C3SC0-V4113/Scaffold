import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: false,
  // tsup preserves the `#!/usr/bin/env node` shebang from src/index.ts and marks
  // the output executable. Runtime `dependencies` are externalized automatically,
  // so only our own source is bundled into a single dist/index.js.
});
