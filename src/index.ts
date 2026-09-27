/**
 * dsh-booster host half.
 *
 * Two responsibilities, both small — and after the 0.1.7 rework, the settings channel is
 * no longer one of them: the product's plugin manager owns plugin configuration, so this
 * file only declares the schema for it.
 *
 * 1. Bridge settled file edits to the real VS Code in the right Sidebar: start
 *    code-server on demand (never at logon) and drop a request file the code-server
 *    extension polls.
 * 2. Play the completion chime, because `agent/status` — the only signal that means "this
 *    turn is over" — arrives here, not in the browser.
 *
 * @module dsh-booster
 */
import type { Context } from '@deepseek-ai/cordis'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { markerPath, type OpenRequest } from './bridge.ts'
import { ensureService } from './service.ts'
import { playChime, shouldChime } from './chime.ts'
import { BoosterConfigSchema, normalizeConfig, type BoosterConfig } from './config.ts'

/** Cordis plugin name; the loader entry and the client bundle id. */
export const name = 'dsh-booster'

/**
 * The durable options, rendered as a form by the product's plugin manager.
 *
 * This export replaces the settings namespace the plugin used to register for itself: in
 * 0.1.7 a plugin declares its configuration and the product presents it.
 */
export const Config = BoosterConfigSchema

// Re-exported for the deterministic smoke test; the loader only reads the plugin name,
// the config schema and `apply` from this entry.
export { ensureService, findLauncher, isListening } from './service.ts'
export { chimeCachePath, renderChime, shouldChime } from './chime.ts'

/** Tools whose settled result names a file worth showing. */
const FILE_TOOLS = new Set(['write', 'edit'])

/** When the current run started, for the chime's minimum-length rule. */
let runningSince: number | undefined

/** When the last error arrived, so a failure does not chime twice. */
let erroredAt = 0

/** The host context, narrowed so this file depends on no unshipped type. */
interface BoosterHostContext {
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
 * Written to a sibling temp file and renamed: the rename is atomic, so the extension's
 * poll can never read a half-written marker.
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
 * Register the bridge and the chime.
 *
 * @param ctx - the host cordis context.
 * @param rawConfig - the options the loader resolved from the plugin manager's form.
 */
export function apply(ctx: Context, rawConfig?: Partial<BoosterConfig>): void {
  const config = normalizeConfig(rawConfig)
  const host = ctx as unknown as BoosterHostContext

  // `tools/result` fires after the tool settles, so the file is complete by the time the
  // request lands — no delay, no guessing about when a write finished.
  host.on('tools/result', (execution, result) => {
    try {
      if (config.fileOpen !== 'vscode') return

      const call = execution as { name?: unknown; arguments?: unknown } | undefined
      if (call === undefined || typeof call.name !== 'string' || !FILE_TOOLS.has(call.name)) return
      if ((result as { isError?: unknown } | undefined)?.isError === true) return

      const target = filePathOf(call.arguments)
      if (target === undefined) return

      // Write the request first, then make sure something can honour it: the extension
      // reads a waiting request when its window opens, so the order matters and the ~2 s
      // start-up never delays the marker.
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

  // The completion chime. `agent/status` is the only signal that means "this turn is
  // over", and it arrives here rather than in the browser — so the machine plays the
  // sound, and it is heard even when the app is behind something else.
  host.on('agent/status', (payload) => {
    try {
      if (!config.chime) return
      const status = (payload as { status?: unknown } | undefined)?.status

      if (status === 'running') {
        runningSince = Date.now()
        return
      }
      if (status !== 'idle') return

      const startedAt = runningSince
      runningSince = undefined
      if (startedAt === undefined) return
      const now = Date.now()
      // The rule (minimum length, one chime per failure) lives in a pure function so the
      // smoke test can check it without playing anything.
      const chiming = shouldChime({
        enabled: true,
        elapsedMs: now - startedAt,
        minSeconds: config.chimeMinSeconds,
        erroredAgoMs: now - erroredAt,
      })
      if (!chiming) return
      void playChime('done')
    } catch (error) {
      console.error('[dsh-booster] handling a status change failed:', error)
    }
  })

  host.on('agent/error', () => {
    try {
      if (!config.chime || !config.chimeOnError) return
      erroredAt = Date.now()
      void playChime('error')
    } catch (error) {
      console.error('[dsh-booster] handling an agent error failed:', error)
    }
  })

  // No "start on request" listener here on purpose. The 0.1.7 client can write a value
  // through `configForms`, but the host event that would carry it — `settings/updated` —
  // is not in this version's event catalog, so such a request reaches nobody. A settled
  // file write above starts the service, and the tab hands over the manual command.
}
