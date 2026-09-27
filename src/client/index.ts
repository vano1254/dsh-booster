/**
 * dsh-booster client entry.
 *
 * One contribution: the right Sidebar's real VS Code tab.
 *
 * The 0.1.7 rework removed three things from this file — a settings page, a module manager
 * and a settings store — because the product took each of them over (plugin configuration
 * is a form the plugin manager renders, and file previews are native).
 *
 * `slots` is the only hard dependency, and it is declared because the live 0.1.7 client
 * service catalog lists it. Everything else is fetched through optional access: a client
 * entry whose declared services never arrive stays **pending**, and a pending entry stops
 * the whole app from booting. That is how the previous version broke this machine, so no
 * other name is allowed in `inject`.
 *
 * @module dsh-booster/client
 */
import { PANEL_CSS } from './styles.ts'
import { DICT, vscodePanelElement, VSCODE_KIND, VSCODE_TYPE_ID, type Translate } from './vscode.tsx'

/** Cordis plugin name; the loader entry and the client bundle id. */
export const name = 'dsh-booster'

/** The one service this plugin cannot work without, present in every 0.1.7 composition. */
export const inject = ['slots']

/** The pane slot the tab body is registered into. */
const PANE_SLOT = 'sidebar.right.pane.tab'

/** The locale namespace this plugin's strings live under. */
const LOCALE_NS = 'dsh-booster'

/** The client context, narrowed to what this file actually calls. */
interface ClientContext {
  slots: {
    register(registration: Record<string, unknown>, component: unknown): () => void
    inject(key: string, callback: () => unknown): () => void
  }
  effect(callback: () => unknown, label?: string): unknown
  get?(name: string): unknown
  inject?(names: string[], callback: (scoped: unknown) => void): unknown
  locale?: {
    register(ns: string, dicts: Record<string, Record<string, string>>): unknown
    bind(ns: string): Translate
  }
  sidebarRightTabs?: { register(definition: unknown): () => void }
}

/**
 * Install the strings and return a translator bound to this plugin's namespace.
 *
 * `locale` is reached optionally: without it the Chinese dictionary is returned verbatim,
 * which is a worse translation but never a broken boot.
 *
 * @param ctx - the client root context.
 * @returns a translator for this plugin's keys.
 */
function installLocale(ctx: ClientContext): Translate {
  try {
    const locale = ctx.locale
    if (locale !== undefined && typeof locale.register === 'function' && typeof locale.bind === 'function') {
      locale.register(LOCALE_NS, { zh: DICT.zh, en: DICT.en })
      return locale.bind(LOCALE_NS)
    }
  } catch (error) {
    console.error('[dsh-booster] registering the locale dictionaries failed:', error)
  }
  return (key) => (DICT.zh as Record<string, string>)[key] ?? key
}

/** Inject the panel stylesheet once, if there is a document to put it in. */
function injectStylesheet(): void {
  try {
    if (typeof document === 'undefined') return
    const id = 'dsh-booster-panel-css'
    if (document.getElementById(id) !== null) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = PANEL_CSS
    document.head.appendChild(style)
  } catch (error) {
    console.error('[dsh-booster] injecting the stylesheet failed:', error)
  }
}

/**
 * Read the tab-type registry the right Sidebar publishes.
 *
 * It is reflect-published, so it is read defensively: property access first (a context
 * that does not declare the name throws otherwise), then the service table.
 *
 * @param source - the context to read from.
 * @returns the registry, or `undefined`.
 */
function readTabsFace(source: unknown): { register(definition: unknown): () => void } | undefined {
  try {
    const viaProperty = (source as { sidebarRightTabs?: { register(definition: unknown): () => void } }).sidebarRightTabs
    if (viaProperty !== undefined && viaProperty !== null) return viaProperty
  } catch {
    // A context that does not declare the name throws on property access.
  }
  try {
    const get = (source as { get?(name: string): unknown }).get
    const viaGet = typeof get === 'function' ? get.call(source, 'sidebarRightTabs') : undefined
    if (viaGet !== undefined && viaGet !== null) return viaGet as { register(definition: unknown): () => void }
  } catch {
    // Same story through the service table.
  }
  return undefined
}

/**
 * Client plugin body.
 *
 * @param ctx - the client root context.
 */
export function apply(ctx: ClientContext): void {
  try {
    const t = installLocale(ctx)
    injectStylesheet()

    /**
     * Contribute the tab type and its body.
     *
     * @param tabs - the acquired tab-type registry.
     */
    const start = (tabs: { register(definition: unknown): () => void }): void => {
      ctx.effect(
        () =>
          tabs.register({
            id: VSCODE_TYPE_ID,
            kind: VSCODE_KIND,
            // `extension` is the band for a type from outside the product, and the
            // documented default; it also lets this type take over a builtin kind.
            priority: 'extension',
            title: () => t('tab'),
            // Without this the type exists but is **invisible**: the right Sidebar's
            // user-facing surface is its guide page, and a type appears there only by
            // contributing an entry capsule. Registering `guide` is what puts "VS Code"
            // in front of the user — a bare type can only be opened programmatically,
            // which is exactly how the previous version lost its only way in.
            guide: [
              {
                id: 'vscode',
                order: 10,
                title: () => t('tab'),
                description: () => t('guide.desc'),
              },
            ],
          }),
        'dsh-booster: VS Code tab type',
      )

      ctx.effect(
        () =>
          ctx.slots.inject(PANE_SLOT, () =>
            ctx.slots.register(
              { name: PANE_SLOT, key: VSCODE_TYPE_ID },
              (() => vscodePanelElement(t)) as never,
            ),
          ),
        'dsh-booster: VS Code tab body',
      )
    }

    // The registry is published from the same boot batch as this bundle, so a plain read
    // can be too early; try it, then wait for the service the way the shipped right-Sidebar
    // consumers do.
    const immediate = readTabsFace(ctx)
    if (immediate !== undefined) {
      start(immediate)
      return
    }

    if (typeof ctx.inject === 'function') {
      try {
        ctx.inject(['sidebarRightTabs'], (scoped) => {
          const tabs = readTabsFace(scoped) ?? readTabsFace(ctx)
          if (tabs !== undefined) start(tabs)
        })
      } catch (error) {
        console.error('[dsh-booster] waiting for sidebarRightTabs failed:', error)
      }
    }
  } catch (error) {
    // A failed client half must never take the app's boot with it.
    console.error('[dsh-booster] client apply failed:', error)
  }
}
