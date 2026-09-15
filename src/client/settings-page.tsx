/**
 * The booster settings page registered into `settings.section`.
 *
 * One page owns every module's switch and its controls, so the Plugins/General
 * sections stay uncrowded. Module-specific bodies live in the `BODIES` map keyed
 * by module id: adding a module means adding its file, its roster entry, and one
 * body here.
 *
 * @module dsh-booster/client/settings-page
 */
import { useEffect, useState, type ReactNode } from 'react'
import {
  ACCENT_CHOICES,
  FILE_OPEN_TARGETS,
  FONT_FAMILY_CHOICES,
  LINK_MODES,
  type AccentChoice,
  type BoosterSettings,
  type FileOpenTarget,
  type FontFamilyChoice,
  type LinkMode,
} from '../settings.ts'
import { CodeServerRow, openVSCodeTab, resolveCodeServer } from './modules/preview.tsx'
import { FONT_SIZE_MAX, FONT_SIZE_MIN, readFontSize, subscribeTheme, writeFontSize } from './theme.ts'
import type { Translate } from './locale.ts'
import type { BoosterModule, BoosterStore } from './runtime.ts'
import type { ClientContext } from './types.ts'

/** Everything the page needs, captured in the registration closure. */
export interface SettingsPageOptions {
  /** The client root context. */
  ctx: ClientContext
  /** The configuration store. */
  store: BoosterStore
  /** Translator bound to this plugin's locale namespace. */
  t: Translate
  /** Every module, in roster order. */
  modules: readonly BoosterModule[]
}

/** Props handed to a module-specific settings body. */
interface BodyProps {
  /** Current configuration snapshot. */
  settings: BoosterSettings
  /** The configuration store. */
  store: BoosterStore
  /** Translator bound to this plugin's locale namespace. */
  t: Translate
  /** Live conversation reading size, in px. */
  size: number
  /** Write a new reading size. */
  setSize: (px: number) => void
  /** Focus the pinned VS Code tab in the right Sidebar. */
  openVSCode: () => void
}

/** The reading-size stepper, shared by the page and the header module. */
function ReadingSizeRow({ size, setSize, t }: Pick<BodyProps, 'size' | 'setSize' | 't'>): ReactNode {
  return (
    <div className="booster-row">
      <div>
        <div className="booster-row__label">{t('appearance.readingSize')}</div>
        <div className="booster-row__hint">{t('appearance.readingSizeHint')}</div>
      </div>
      <div className="booster-row__control">
        <span className="booster-stepper">
          <button type="button" disabled={size <= FONT_SIZE_MIN} onClick={() => setSize(size - 1)} aria-label={t('tools.smaller')}>
            {'−'}
          </button>
          <span className="booster-stepper__value">{`${size}${t('unit.px')}`}</span>
          <button type="button" disabled={size >= FONT_SIZE_MAX} onClick={() => setSize(size + 1)} aria-label={t('tools.larger')}>
            {'+'}
          </button>
        </span>
      </div>
    </div>
  )
}

/** A labelled checkbox row. */
function CheckRow(props: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; t: Translate }): ReactNode {
  return (
    <div className="booster-row">
      <div>
        <div className="booster-row__label">{props.label}</div>
        {props.hint !== undefined && <div className="booster-row__hint">{props.hint}</div>}
      </div>
      <div className="booster-row__control">
        <label className="booster-switch">
          <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
          <span className="booster-row__label">{props.t('module.enable')}</span>
        </label>
      </div>
    </div>
  )
}

/** Module-specific settings bodies, keyed by module id. */
const BODIES: Record<string, (props: BodyProps) => ReactNode> = {
  appearance: ({ settings, store, t, size, setSize }) => (
    <>
      <div className="booster-row">
        <div className="booster-row__label">{t('appearance.accent')}</div>
        <div className="booster-row__control">
          <select
            className="booster-select"
            value={settings.appearance.accent}
            onChange={(event) =>
              store.set('appearance', { ...settings.appearance, accent: event.target.value as AccentChoice })
            }
          >
            {ACCENT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`accent.${choice}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="booster-row">
        <div className="booster-row__label">{t('appearance.fontFamily')}</div>
        <div className="booster-row__control">
          <select
            className="booster-select"
            value={settings.appearance.fontFamily}
            onChange={(event) =>
              store.set('appearance', { ...settings.appearance, fontFamily: event.target.value as FontFamilyChoice })
            }
          >
            {FONT_FAMILY_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`font.${choice}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReadingSizeRow size={size} setSize={setSize} t={t} />
    </>
  ),

  headerTools: ({ settings, store, t }) => (
    <>
      <CheckRow
        t={t}
        label={t('headerTools.sidebarToggle')}
        hint={t('headerTools.sidebarToggleHint')}
        checked={settings.headerTools.sidebarToggle}
        onChange={(next) => store.set('headerTools', { ...settings.headerTools, sidebarToggle: next })}
      />
      <CheckRow
        t={t}
        label={t('headerTools.readingSize')}
        hint={t('headerTools.readingSizeHint')}
        checked={settings.headerTools.readingSize}
        onChange={(next) => store.set('headerTools', { ...settings.headerTools, readingSize: next })}
      />
    </>
  ),

  preview: ({ settings, store, t, openVSCode }) => (
    <>
      <CodeServerRow
        preview={settings.preview}
        set={(value) => store.set('preview', value)}
        t={t}
        recheck={() => {
          void resolveCodeServer({ settings: store.get().preview, set: (value) => store.set('preview', value) })
        }}
      />

      <div className="booster-row">
        <div>
          <div className="booster-row__label">{t('preview.openVSCode')}</div>
          <div className="booster-row__hint">{t('preview.openVSCodeHint')}</div>
        </div>
        <div className="booster-row__control">
          <button type="button" className="booster-button" onClick={openVSCode}>
            {t('preview.openVSCodeAction')}
          </button>
        </div>
      </div>

      <div className="booster-row">
        <div>
          <div className="booster-row__label">{t('preview.fileOpen')}</div>
          <div className="booster-row__hint">{t('preview.fileOpenHint')}</div>
        </div>
        <div className="booster-row__control">
          <select
            className="booster-select"
            value={settings.preview.fileOpen}
            onChange={(event) =>
              store.set('preview', { ...settings.preview, fileOpen: event.target.value as FileOpenTarget })
            }
          >
            {FILE_OPEN_TARGETS.map((target) => (
              <option key={target} value={target}>
                {t(`preview.fileOpen.${target}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="booster-row">
        <div>
          <div className="booster-row__label">{t('preview.links')}</div>
          <div className="booster-row__hint">{t('preview.hint')}</div>
        </div>
        <div className="booster-row__control">
          <select
            className="booster-select"
            value={settings.preview.linkMode}
            onChange={(event) => store.set('preview', { ...settings.preview, linkMode: event.target.value as LinkMode })}
          >
            {LINK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`preview.linkMode.${mode}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  ),
}

/**
 * Build the settings page component.
 *
 * @param options - the context, store, translator and roster.
 * @returns a React component suitable for a `settings.section` list slot.
 */
export function createSettingsPage(options: SettingsPageOptions): () => ReactNode {
  const { ctx, store, t, modules } = options

  return function BoosterSettingsPage(): ReactNode {
    const [settings, setSettings] = useState<BoosterSettings>(() => store.get())
    const [size, setSize] = useState<number>(() => readFontSize(ctx))

    useEffect(() => store.subscribe(() => setSettings(store.get())), [])
    useEffect(() => subscribeTheme(ctx, () => setSize(readFontSize(ctx))), [])

    return (
      <div className="booster-page">
        <p className="booster-page__intro">{t('section.desc')}</p>

        {modules.map((module) => {
          const enabled = settings.modules[module.id] ?? module.defaultEnabled
          const body = BODIES[module.id]

          return (
            <section className="booster-card" key={module.id}>
              <div className="booster-card__head">
                <div className="booster-card__titles">
                  <span className="booster-card__title">{t(module.titleKey)}</span>
                  <span className="booster-card__desc">{t(module.descKey)}</span>
                </div>
                <label className="booster-switch">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => store.set('modules', { ...settings.modules, [module.id]: event.target.checked })}
                  />
                  <span className="booster-row__label">{t('module.enable')}</span>
                </label>
              </div>

              {enabled && body !== undefined && (
                <div className="booster-card__body">
                  {body({
                    settings,
                    store,
                    t,
                    size,
                    setSize: (px) => setSize(writeFontSize(ctx, px)),
                    openVSCode: () => openVSCodeTab(ctx),
                  })}
                </div>
              )}
            </section>
          )
        })}

        <p className="booster-note">{t('note.storage')}</p>
      </div>
    )
  }
}
