/**
 * dsh-booster client entry.
 *
 * Binds the `booster` settings namespace, starts the module manager, and
 * registers the settings page. Every contribution is owned by this plugin's
 * fiber and every registration is contained, so a booster failure degrades to a
 * console error instead of breaking the GUI boot.
 *
 * @module dsh-booster/client
 */
import { BOOSTER_NAMESPACE, type BoosterSettings } from '../settings.ts'
import { installLocale } from './locale.ts'
import { MODULES } from './modules/index.ts'
import { createModuleManager, createStore } from './runtime.ts'
import { createSettingsPage } from './settings-page.tsx'
import { SETTINGS_PAGE_CSS, injectStylesheet } from './styles.ts'
import type { ClientContext } from './types.ts'

// Re-exported so the smoke test can exercise the workbench entry point through the
// bundle that actually ships, the way the host half re-exports `ensureService`.
export { openVSCodeTab } from './modules/preview.tsx'

/** Cordis plugin name; the loader entry and the client bundle id. */
export const name = 'dsh-booster'

/** Hard dependencies: the slot registry and the settings transport. */
export const inject = ['slots', 'settingsScope']

/**
 * Client plugin body.
 *
 * @param ctx - the client root context.
 */
export function apply(ctx: ClientContext): void {
  try {
    const t = installLocale(ctx)
    const scope = ctx.settingsScope.bind<BoosterSettings>({ namespace: BOOSTER_NAMESPACE })
    const store = createStore(ctx, scope)
    const manager = createModuleManager(ctx, store, MODULES, t)

    // Apply the current configuration now, then reconcile on every mirror change
    // (the first mirror read lands asynchronously, after this pass).
    ctx.effect(() => store.subscribe(() => manager.sync()), 'dsh-booster: module sync')
    manager.sync()
    ctx.effect(() => () => manager.disposeAll(), 'dsh-booster: module teardown')

    ctx.effect(() => injectStylesheet('settings-page', SETTINGS_PAGE_CSS), 'dsh-booster: settings page stylesheet')

    const SettingsPage = createSettingsPage({ ctx, store, t, modules: MODULES })
    ctx.effect(
      () =>
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { id: 'dsh-booster', name: 'settings.section', order: 40, label: () => t('section.title') },
            SettingsPage as never,
          ),
        ),
      'dsh-booster: settings section',
    )
  } catch (error) {
    console.error('[dsh-booster] client apply failed:', error)
  }
}
