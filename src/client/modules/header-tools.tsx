/**
 * Header-tools module: a sidebar toggle and a reading-size stepper registered
 * into the session header's utilities list.
 *
 * This seat is additive (`replaceRisk: none`), and the reading size goes through
 * `ctx.theme.setFontSize`, so the header control and the shipped Appearance row
 * always show the same number.
 *
 * @module dsh-booster/client/modules/header-tools
 */
import { useEffect, useState } from 'react'
import { FONT_SIZE_MAX, FONT_SIZE_MIN, readFontSize, subscribeTheme, writeFontSize } from '../theme.ts'
import { HEADER_TOOLS_CSS, injectStylesheet } from '../styles.ts'
import { service, type ClientContext, type LayoutService } from '../types.ts'
import type { Translate } from '../locale.ts'
import type { BoosterModule } from '../runtime.ts'
import type { HeaderToolsSettings } from '../../settings.ts'

/** The exact seat this module fills. */
const SLOT = 'conversation.session.header.utilities'

/** Props the module hands its component through the registration closure. */
interface HeaderToolsProps {
  ctx: ClientContext
  config: HeaderToolsSettings
  t: Translate
}

/**
 * The header control cluster.
 *
 * @param props - the plugin-owned props captured at registration time.
 */
function HeaderTools({ ctx, config, t }: HeaderToolsProps) {
  const [size, setSize] = useState<number>(() => readFontSize(ctx))

  useEffect(() => subscribeTheme(ctx, () => setSize(readFontSize(ctx))), [ctx])

  const layout = service<LayoutService>(ctx, 'layout')

  const toggleSidebar = (): void => {
    if (layout === undefined) return
    try {
      layout.toggleSidebar()
    } catch (error) {
      console.error('[dsh-booster] toggleSidebar failed:', error)
    }
  }

  return (
    <span className="booster-tools">
      {config.sidebarToggle && layout !== undefined && (
        <button
          type="button"
          className="booster-tools__btn"
          title={t('tools.sidebar')}
          aria-label={t('tools.sidebar')}
          onClick={toggleSidebar}
        >
          {'⇤'}
        </button>
      )}
      {config.readingSize && (
        <>
          <button
            type="button"
            className="booster-tools__btn"
            title={t('tools.smaller')}
            aria-label={t('tools.smaller')}
            disabled={size <= FONT_SIZE_MIN}
            onClick={() => setSize(writeFontSize(ctx, size - 1))}
          >
            {'−'}
          </button>
          <span className="booster-tools__size">{`${size}${t('unit.px')}`}</span>
          <button
            type="button"
            className="booster-tools__btn"
            title={t('tools.larger')}
            aria-label={t('tools.larger')}
            disabled={size >= FONT_SIZE_MAX}
            onClick={() => setSize(writeFontSize(ctx, size + 1))}
          >
            {'+'}
          </button>
        </>
      )}
    </span>
  )
}

/** The header-tools module. */
export const headerToolsModule: BoosterModule = {
  id: 'headerTools',
  titleKey: 'headerTools.title',
  descKey: 'headerTools.desc',
  defaultEnabled: true,
  configOf: (settings) => settings.headerTools,

  apply({ ctx, settings, t }) {
    const disposeCss = injectStylesheet('header-tools', HEADER_TOOLS_CSS)

    const disposeSlot = ctx.slots.inject(SLOT, () =>
      ctx.slots.register(
        { id: 'dsh-booster-tools', name: SLOT, order: 40, label: () => t('headerTools.title') },
        () => <HeaderTools ctx={ctx} config={settings.headerTools} t={t} />,
      ),
    )

    return () => {
      try {
        disposeSlot()
      } catch (error) {
        console.error('[dsh-booster] header-tools slot teardown failed:', error)
      }
      disposeCss()
    }
  },
}
