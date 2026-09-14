/**
 * The booster runtime: one settings-backed store plus the module manager that
 * turns enable switches into live contributions.
 *
 * The manager is what keeps this plugin "comprehensive without bloat": a module
 * that is switched off registers no slot, starts no timer and injects no CSS,
 * and flipping a switch tears the old contribution down before applying the new
 * one — all without restarting the GUI.
 *
 * @module dsh-booster/client/runtime
 */
import { normalizeBoosterSettings, type BoosterSettings } from '../settings.ts'
import type { ClientContext, SettingsScope } from './types.ts'
import type { Translate } from './locale.ts'

/** What a module receives when it is applied. */
export interface ModuleContext {
  /** The client root context. */
  ctx: ClientContext
  /** The configuration snapshot that triggered this application. */
  settings: BoosterSettings
  /** Translator bound to this plugin's locale namespace. */
  t: Translate
}

/** One opt-in feature of the booster. */
export interface BoosterModule {
  /** Stable id, also the key in `settings.modules`. */
  id: string
  /** Locale key for the module title. */
  titleKey: string
  /** Locale key for the module description. */
  descKey: string
  /** Enable state used before the user has ever toggled this module. */
  defaultEnabled: boolean
  /** The module's own configuration slice, used to detect a change worth re-applying. */
  configOf(settings: BoosterSettings): unknown
  /**
   * Contribute the module's live behaviour.
   *
   * @returns a disposer removing every contribution, or nothing when the module
   * owns no teardown of its own.
   */
  apply(module: ModuleContext): void | (() => void)
}

/** The settings-backed configuration store the UI reads and writes. */
export interface BoosterStore {
  /** Read the normalized configuration. */
  get(): BoosterSettings
  /** Observe configuration changes; the returned disposer removes the listener. */
  subscribe(listener: () => void): () => void
  /** Write one top-level section. */
  set<K extends keyof BoosterSettings>(field: K, value: BoosterSettings[K]): void
}

/**
 * Build the store over a bound settings namespace.
 *
 * @param ctx - the client root context, used to own the mirror subscription.
 * @param scope - the bound `booster` namespace scope.
 * @returns the store.
 */
export function createStore(ctx: ClientContext, scope: SettingsScope<BoosterSettings>): BoosterStore {
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[dsh-booster] store listener failed:', error)
      }
    }
  }

  ctx.effect(() => scope.subscribe(emit), 'dsh-booster: settings mirror')

  return {
    get: () => normalizeBoosterSettings(scope.getSnapshot().value),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(field, value) {
      try {
        scope.set(field as string, value)
      } catch (error) {
        console.error(`[dsh-booster] writing "${String(field)}" failed:`, error)
      }
    },
  }
}

/** Applies and tears down modules as their enable switches change. */
export interface ModuleManager {
  /** Reconcile every module against the current configuration. */
  sync(): void
  /** Tear down every applied module. */
  disposeAll(): void
}

/**
 * Read a module's configuration signature without letting a bad value escape.
 *
 * @param module - the module.
 * @param settings - the configuration snapshot.
 * @returns a stable string, or an empty string when the slice is unserializable.
 */
function signatureOf(module: BoosterModule, settings: BoosterSettings): string {
  try {
    return JSON.stringify(module.configOf(settings))
  } catch {
    return ''
  }
}

/**
 * Build the module manager.
 *
 * @param ctx - the client root context.
 * @param store - the configuration store.
 * @param modules - every module this build knows about.
 * @param t - translator bound to this plugin's locale namespace.
 * @returns the manager.
 */
export function createModuleManager(
  ctx: ClientContext,
  store: BoosterStore,
  modules: readonly BoosterModule[],
  t: Translate,
): ModuleManager {
  const applied = new Map<string, { signature: string; dispose: () => void }>()

  const disposeOne = (id: string): void => {
    const entry = applied.get(id)
    if (entry === undefined) return
    applied.delete(id)
    try {
      entry.dispose()
    } catch (error) {
      console.error(`[dsh-booster] module "${id}" teardown failed:`, error)
    }
  }

  const sync = (): void => {
    const settings = store.get()
    for (const module of modules) {
      const enabled = settings.modules[module.id] ?? module.defaultEnabled
      const existing = applied.get(module.id)

      if (!enabled) {
        if (existing !== undefined) disposeOne(module.id)
        continue
      }

      const signature = signatureOf(module, settings)
      if (existing !== undefined && existing.signature === signature) continue
      // Re-apply on any configuration change: a module's contributions depend on
      // its config, and disposing first keeps the result idempotent.
      if (existing !== undefined) disposeOne(module.id)

      try {
        const dispose = module.apply({ ctx, settings, t })
        applied.set(module.id, {
          signature,
          dispose: typeof dispose === 'function' ? dispose : () => {},
        })
      } catch (error) {
        // One broken module must not take the others, or the plugin, down.
        console.error(`[dsh-booster] module "${module.id}" failed to apply:`, error)
      }
    }
  }

  return {
    sync,
    disposeAll: () => {
      for (const id of [...applied.keys()]) disposeOne(id)
    },
  }
}
