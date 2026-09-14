/**
 * Appearance module: accent palette and interface font.
 *
 * Both controls are additive rather than duplicative — the shipped Appearance
 * row offers only light/dark/system and a 12–17px reading size, so an accent
 * palette and an interface font stack are genuinely new surface.
 *
 * The accent is applied through `ctx.theme.overrideTokens`, the documented
 * token-layer API: it stacks partial `{ light, dark }` overrides on top of
 * whatever theme is active, composes in order, and restores on dispose. The
 * font is a plain `--dsw-font-family` override in a plugin-owned style tag.
 *
 * @module dsh-booster/client/modules/appearance
 */
import type { AccentChoice, BoosterSettings, FontFamilyChoice } from '../../settings.ts'
import { injectStylesheet } from '../styles.ts'
import { service, type ClientContext, type ThemeService } from '../types.ts'
import type { BoosterModule } from '../runtime.ts'

/** Light/dark brand values per selectable accent. */
const ACCENTS: Record<Exclude<AccentChoice, 'default'>, { light: string; dark: string }> = {
  ocean: { light: '#0f7bd8', dark: '#4aa8ff' },
  forest: { light: '#12855f', dark: '#3fbe92' },
  violet: { light: '#7a5cf0', dark: '#a58cff' },
}

/** Interface font stacks per selectable choice. */
const FONT_STACKS: Record<Exclude<FontFamilyChoice, 'default'>, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  yahei: '"Microsoft YaHei", "微软雅黑", "PingFang SC", system-ui, sans-serif',
  serif: 'Georgia, "Songti SC", "SimSun", "宋体", serif',
}

/** The token-layer source id; the theme service keeps one layer per source. */
const ACCENT_LAYER = 'dsh-booster/accent'

/** The appearance module. */
export const appearanceModule: BoosterModule = {
  id: 'appearance',
  titleKey: 'appearance.title',
  descKey: 'appearance.desc',
  defaultEnabled: true,
  configOf: (settings: BoosterSettings) => settings.appearance,

  apply({ ctx, settings }) {
    const disposers: Array<() => void> = []
    const { accent, fontFamily } = settings.appearance

    if (accent !== 'default') {
      const theme = service<ThemeService>(ctx, 'theme')
      const pair = ACCENTS[accent]
      if (theme !== undefined && pair !== undefined) {
        try {
          disposers.push(theme.overrideTokens(ACCENT_LAYER, {
            '--dsw-alias-brand-primary': { light: pair.light, dark: pair.dark },
          }))
        } catch (error) {
          console.error('[dsh-booster] accent override failed:', error)
        }
      }
    }

    if (fontFamily !== 'default') {
      const stack = FONT_STACKS[fontFamily]
      if (stack !== undefined) {
        disposers.push(injectStylesheet('appearance-font', `:root { --dsw-font-family: ${stack}; }`))
      }
    }

    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          console.error('[dsh-booster] appearance teardown failed:', error)
        }
      }
    }
  },
}
