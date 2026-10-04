import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectDirectory = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = new URL('../dist/', import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await build({
  absWorkingDir: projectDirectory,
  entryPoints: ['src/background.ts'],
  outfile: 'dist/background.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'firefox142',
  logLevel: 'info',
});
await copyFile(
  new URL('../extension/manifest.json', import.meta.url),
  new URL('manifest.json', outputDirectory),
);
