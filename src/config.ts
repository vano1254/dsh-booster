/**
 * The plugin's configuration, in the shape DSH 0.1.7 actually reads.
 *
 * 0.1.5 offered a client-side `settingsScope` service; 0.1.7 removed it and replaced
 * the whole channel with two halves:
 *
 * - a plugin declares **`Config`** (this file's schema) in its host entry, and the
 *   product's plugin manager renders a form for it — a plugin no longer ships a
 *   settings page of its own;
 * - the client half reads the live values through `ctx.configForms.get(entryId)`,
 *   whose face exposes `getSnapshot()`, `subscribe(fn)` and `set(field, value)`.
 *
 * Fields are flat inside the entry's namespace, which is why this is one level deep.
 *
 * @module dsh-booster/config
 */
import Schema from '@deepseek-ai/schemastery'

/** What happens to a file the agent writes or edits. */
export type FileOpenTarget = 'vscode' | 'off'

/** The plugin's options. */
export interface BoosterConfig {
  /**
   * `vscode` hands a settled `write` / `edit` to the Sidebar's code-server bridge.
   *
   * `off` leaves the file to the product, which previews file references by itself.
   */
  fileOpen: FileOpenTarget
  /**
   * Play a chime when a turn finishes.
   *
   * Defaults to on: the chime exists so you can look away while a long turn runs, and a
   * notification that ships switched off is one nobody turns on. The switch is in the
   * product's plugin settings for this plugin.
   */
  chime: boolean
  /** Only chime when the turn ran at least this many seconds. */
  chimeMinSeconds: number
  /** Use the falling sound when a turn ends in an error. */
  chimeOnError: boolean
}

/** Every default, in one place. */
export const DEFAULT_CONFIG: BoosterConfig = {
  fileOpen: 'vscode',
  chime: true,
  chimeMinSeconds: 3,
  chimeOnError: true,
}

/** Every selectable file-open target. */
export const FILE_OPEN_TARGETS: readonly FileOpenTarget[] = ['vscode', 'off']

/** Every selectable minimum turn length, in seconds. */
export const CHIME_MIN_SECONDS: readonly number[] = [0, 3, 5, 10]

/**
 * The durable schema the product's plugin manager renders and validates.
 *
 * Every field carries a default, so a fresh install has no required answers.
 */
export const BoosterConfigSchema = Schema.object({
  fileOpen: Schema.union(FILE_OPEN_TARGETS.map((target) => Schema.const(target))).default(DEFAULT_CONFIG.fileOpen),
  chime: Schema.boolean().default(DEFAULT_CONFIG.chime),
  chimeMinSeconds: Schema.union(CHIME_MIN_SECONDS.map((seconds) => Schema.const(seconds))).default(
    DEFAULT_CONFIG.chimeMinSeconds,
  ),
  chimeOnError: Schema.boolean().default(DEFAULT_CONFIG.chimeOnError),
})

/**
 * Coerce whatever the loader hands over into a complete configuration.
 *
 * The narrow code paths inside this plugin should never have to ask whether a field is
 * there, and a hand-edited profile should degrade to the defaults rather than throw.
 *
 * @param value - the raw config from the loader or the client's config face.
 * @returns a complete configuration.
 */
export function normalizeConfig(value: unknown): BoosterConfig {
  const raw = (value !== null && typeof value === 'object' ? value : {}) as Partial<BoosterConfig>
  const fileOpen: FileOpenTarget = raw.fileOpen === 'off' ? 'off' : 'vscode'
  const minSeconds =
    typeof raw.chimeMinSeconds === 'number' && CHIME_MIN_SECONDS.includes(raw.chimeMinSeconds)
      ? raw.chimeMinSeconds
      : DEFAULT_CONFIG.chimeMinSeconds
  return {
    fileOpen,
    chime: raw.chime !== false,
    chimeMinSeconds: minSeconds,
    chimeOnError: raw.chimeOnError !== false,
  }
}
