/**
 * dsh-booster host plugin.
 *
 * Two responsibilities, both small:
 *
 * 1. Register the durable `booster` settings namespace so the browser's settings
 *    mirror can read and fence writes to it. There is no RPC of our own — the
 *    shipped settings transport already carries namespaced reads and
 *    revision-fenced writes.
 * 2. Bridge settled file edits to the real VS Code running in the Sidebar, starting
 *    web workbench cannot be asked to open a file by URL, so each settled
 *    that service on demand rather than at logon. Each settled write / edit drops a
 *    request file that the code-server extension polls.
 *
 * @module dsh-booster
 */
import type { Context } from '@deepseek-ai/cordis'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { markerPath, type OpenRequest } from './bridge.ts'
import { ensureService } from './service.ts'

// Re-exported for the deterministic smoke test; the loader only reads the
// plugin name and apply from this entry.
export { ensureService, findLauncher, isListening } from './service.ts'
import { BoosterSchema } from './schema.ts'
import { BOOSTER_NAMESPACE, normalizeBoosterSettings } from './settings.ts'

/** Cordis plugin name; the loader entry and the client bundle id. */
export const name = 'dsh-booster'

/** Tools whose settled result names a file worth showing. */
const FILE_TOOLS = new Set(['write', 'edit'])

/** The settings slice this plugin reads. */
interface SettingsFace {
  register(ns: string, schema: unknown): unknown
  get(ns: string): unknown
}

/** The host context, narrowed so this file depends on no unshipped type. */
interface BoosterHostContext {
  inject(names: string[], callback: (scoped: { settings: SettingsFace }) => void): unknown
  get(name: string): unknown
  on(event: string, listener: (...args: unknown[]) => void): () => void
}

/**
 * Pull the target path out of a tool call's already-parsed arguments.
 *
 * @param args - the tool call's arguments.
 * @returns the path, or `undefined` when this call names none.
 */
function filePathOf(args: unknown): string | undefined {
  if (args === null || typeof args !== 'object') return undefined
  const value = (args as { file_path?: unknown }).file_path
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Drop one open request for the code-server bridge extension.
 *
 * Written to a sibling temp file and renamed: the rename is atomic, so the
 * extension's poll can never read a half-written marker.
 *
 * @param path - the file the window should show.
 */
async function requestOpen(path: string): Promise<void> {
  const marker = markerPath()
  const request: OpenRequest = { path, at: Date.now() }
  await mkdir(dirname(marker), { recursive: true })
  const temporary = `${marker}.tmp`
  await writeFile(temporary, JSON.stringify(request), 'utf8')
  await rename(temporary, marker)
}

/**
 * Register the namespace when the optional settings service is composed, and
 * bridge settled file edits to the Sidebar's VS Code.
 *
 * `ctx.inject` is the optional-dependency form: the callback runs once the
 * service exists and never runs when a deployment composes no settings provider,
 * in which case the client falls back to the schema defaults.
 *
 * @param ctx - the host cordis context.
 */
export function apply(ctx: Context): void {
  const host = ctx as unknown as BoosterHostContext

  host.inject(['settings'], (scoped) => {
    try {
      scoped.settings.register(BOOSTER_NAMESPACE, BoosterSchema)
    } catch (error) {
      console.error('[dsh-booster] settings namespace registration failed:', error)
    }
  })

  // `tools/result` fires after the tool settles, so the file is complete by the
  // time the request lands — no delay, no guessing about when a write finished.
  host.on('tools/result', (execution, result) => {
    try {
      const settings = host.get('settings') as SettingsFace | undefined
      const config = normalizeBoosterSettings(settings?.get(BOOSTER_NAMESPACE))
      if (config.preview.fileOpen !== 'vscode') return

      const call = execution as { name?: unknown; arguments?: unknown } | undefined
      if (call === undefined || typeof call.name !== 'string' || !FILE_TOOLS.has(call.name)) return
      if ((result as { isError?: unknown } | undefined)?.isError === true) return

      const target = filePathOf(call.arguments)
      if (target === undefined) return

      // Write the request first, then make sure something can honour it: the
      // extension reads a waiting request when its window opens, so the order
      // matters and the ~2 s start-up never delays the marker.
      void requestOpen(target)
        .then(() => ensureService())
        .catch((error: unknown) => {
          console.error('[dsh-booster] writing the bridge request failed:', error)
        })
    } catch (error) {
      // The bridge must never disturb a tool result.
      console.error('[dsh-booster] bridge request failed:', error)
    }
  })
}
