/**
 * Single-file client + ESM host build for dsh-booster.
 *
 * The web server serves exactly one file per plugin, so the client half is one
 * CJS bundle wrapped in the ModuleLoader factory handshake; react and the
 * @deepseek-ai baseline stay external (the shell's PLATFORM_MODULES table
 * provides them). The host half is plain ESM for Node. `@deepseek-ai/schemastery`
 * stays external too: it resolves from the profile's node_modules at runtime,
 * exactly as the shipped settings plugins resolve it.
 *
 * lib/ is committed to the repository on purpose, so a GitHub-tarball install
 * needs no build step on the consumer's machine.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('lib', { recursive: true })

const PLUGIN_ID = 'dsh-booster'
const hostExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*', '@deepseek-ai/schemastery']
const browserExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-*',
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'scheduler',
]

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: hostExternal,
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: browserExternal,
  banner: {
    js: `window.__ModuleLoader__.load({ id: '${PLUGIN_ID}', factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})
