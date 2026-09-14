/**
 * Minimal, self-owned declarations for the client services dsh-booster uses.
 *
 * This plugin deliberately does NOT import `@deepseek-ai/dsh-client-runtime` or
 * `@deepseek-ai/dsh-client-ui-slots`: those type packages are not shipped with
 * every DSH build, and depending on them is the main version-fragility trap for
 * external plugin authors. We declare only the members we actually call, so a
 * type-only break can never block this package from building or loading.
 *
 * Every shape below was read off the live runtime (Cordis Inspect) rather than
 * guessed.
 *
 * @module dsh-booster/client/types
 */

/** One value published by a bound settings namespace. */
export interface SettingsSnapshot<T> {
  /** The resolved section, or `undefined` when the namespace has no value yet. */
  value: T | undefined
  /** Namespace revision used to fence concurrent writes. */
  revision?: number
  /** Whether writes reach durable Host storage (false on non-loopback pages). */
  writable?: boolean
  /** Persistence mode reported by the transport. */
  mode?: string
}

/** A per-namespace settings scope derived from the shared browser mirror. */
export interface SettingsScope<T> {
  /** Read the current snapshot. */
  getSnapshot(): SettingsSnapshot<T>
  /** Observe mirror changes; the returned disposer belongs to the caller. */
  subscribe(listener: () => void): () => void
  /** Submit one top-level field write, fenced by the namespace revision. */
  set(field: string, value: unknown): void
  /** Submit several ordered path operations atomically. */
  mutate?(operations: readonly unknown[]): void
  /** Release this binding early. */
  dispose?(): void
}

/** The client settings-scope service (`ctx.settingsScope`). */
export interface SettingsScopeService {
  bind<T>(spec: { namespace: string }): SettingsScope<T>
}

/** A slot contribution: a React component rendered in a registered seat. */
export type SlotComponent = (props: Record<string, unknown>) => unknown

/** Registration options for a slot contribution. */
export interface SlotRegistration {
  /** Cell key for list/keyed seats; required by list and keyed slots. */
  id?: string
  /** The exact slot name being filled. */
  name: string
  /** Key for keyed slots. */
  key?: string
  /** Display text where the owner projects one. */
  label?: string | (() => string)
  /** Position among the entries, ascending. */
  order?: number
}

/** The client slot registry (`ctx.slots`). */
export interface SlotsService {
  /** Wait for a slot declaration, then contribute to it. */
  inject(key: string, callback: () => void | (() => void)): () => void
  /** Register one contribution; the returned disposer removes it. */
  register(options: SlotRegistration, component: SlotComponent): () => void
}

/** The client theme registry (`ctx.theme`). */
export interface ThemeService {
  getTheme(): { fontSize: number; preference: string; active: { id: string } }
  setFontSize(px: number): void
  setTheme(id: string): void
  register(definition: { id: string; colorScheme: string; tokens: Record<string, string> }): () => void
  overrideTokens(source: string, tokens: Record<string, { light: string; dark: string }>): () => void
}

/** The client layout controller (`ctx.layout`). */
export interface LayoutService {
  toggleSidebar(): void
  selectPanel(panelId: string | null): void
  openRightbar(track: boolean, fullscreen: boolean): void
  closeRightbar(): void
}

/** The client locale registry (`ctx.locale`). */
export interface LocaleService {
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void
  bind(ns: string): (key: string, params?: Record<string, string | number>) => string
}

/** The client root context, narrowed to the members this plugin uses. */
export interface ClientContext {
  /** Read an optional service; always check for `undefined`. */
  get(name: string): unknown
  /** Listen to a client event; the returned disposer removes the listener. */
  on(event: string, listener: (...args: unknown[]) => void): () => void
  /** Own a side effect on this plugin's fiber. */
  effect(callback: () => void | (() => void), label?: string): () => void
  slots: SlotsService
  settingsScope: SettingsScopeService
}

/**
 * Read an optional service with the null-safety every optional dependency needs.
 *
 * @param ctx - the client root context.
 * @param name - the exact service key.
 * @returns the service, or `undefined` when it is not composed.
 */
export function service<T>(ctx: ClientContext, name: string): T | undefined {
  const value = ctx.get(name)
  return value === undefined || value === null ? undefined : (value as T)
}

/**
 * Resolve a service that may have been published through the reflect face.
 *
 * The right Sidebar publishes `sidebarRight` and `sidebarRightTabs` with
 * `ctx.reflect.provide`, so a consumer outside that package reaches them either
 * through `ctx.get` or through `ctx.reflect.get`, depending on the runtime. We
 * try both instead of hard-injecting them: a deployment without the right
 * Sidebar should cost this plugin one module, not the whole plugin.
 *
 * @param ctx - the client root context.
 * @param name - the exact service key.
 * @returns the service, or `undefined` when it is absent.
 */
export function resolveService<T>(ctx: ClientContext, name: string): T | undefined {
  const direct = service<T>(ctx, name)
  if (direct !== undefined) return direct
  const reflect = (ctx as unknown as { reflect?: { get?: (key: string) => unknown } }).reflect
  if (reflect === undefined || typeof reflect.get !== 'function') return undefined
  try {
    const value = reflect.get(name)
    return value === undefined || value === null ? undefined : (value as T)
  } catch {
    return undefined
  }
}

/**
 * Read a reflect-published service, preferring plain property access.
 *
 * An injected context declares the name, so property access is the pattern the
 * shipped consumers use; the reflective read covers a context that has not
 * declared it.
 *
 * @param source - the context to read from.
 * @param name - the exact service key.
 * @returns the service, or `undefined` when it is not there yet.
 */
export function readServiceFace<T>(source: unknown, name: string): T | undefined {
  try {
    const viaProperty = (source as Record<string, unknown>)[name]
    if (viaProperty !== undefined && viaProperty !== null) return viaProperty as T
  } catch {
    // A context that does not declare the name throws on property access.
  }
  return resolveService<T>(source as ClientContext, name)
}
