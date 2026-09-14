/**
 * Reading-size bridge.
 *
 * dsh-booster never stores the conversation font size itself: `ui-theme` owns
 * that preference and `ctx.theme.setFontSize` is its only write entry. Reading
 * and writing through the service keeps one source of truth and means our
 * controls and the shipped Appearance row can never drift apart.
 *
 * @module dsh-booster/client/theme
 */
import { service, type ClientContext, type ThemeService } from './types.ts'

/** Lowest accepted conversation content font size, in px. */
export const FONT_SIZE_MIN = 12

/** Highest accepted conversation content font size, in px. */
export const FONT_SIZE_MAX = 17

/**
 * Read the live conversation content font size.
 *
 * @param ctx - the client root context.
 * @returns the current size in px, or the shipped default when unavailable.
 */
export function readFontSize(ctx: ClientContext): number {
  const theme = service<ThemeService>(ctx, 'theme')
  if (theme === undefined) return 14
  try {
    const size = theme.getTheme().fontSize
    return typeof size === 'number' && Number.isFinite(size) ? size : 14
  } catch {
    return 14
  }
}

/**
 * Write the conversation content font size, clamped to the accepted range.
 *
 * Out-of-range and fractional values throw inside the service, so the clamp
 * happens here rather than surfacing an exception to the caller.
 *
 * @param ctx - the client root context.
 * @param px - the requested size in px.
 * @returns the size actually applied.
 */
export function writeFontSize(ctx: ClientContext, px: number): number {
  const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(px)))
  const theme = service<ThemeService>(ctx, 'theme')
  if (theme === undefined) return clamped
  try {
    theme.setFontSize(clamped)
  } catch (error) {
    console.error('[dsh-booster] setFontSize failed:', error)
  }
  return clamped
}

/**
 * Observe theme changes, which is the only continuous-sync channel the service
 * offers.
 *
 * @param ctx - the client root context.
 * @param listener - called after every emitted theme snapshot.
 * @returns a disposer that removes the listener.
 */
export function subscribeTheme(ctx: ClientContext, listener: () => void): () => void {
  try {
    const dispose = ctx.on('theme/change', () => {
      listener()
    })
    return typeof dispose === 'function' ? dispose : () => {}
  } catch (error) {
    console.error('[dsh-booster] theme/change subscription failed:', error)
    return () => {}
  }
}
