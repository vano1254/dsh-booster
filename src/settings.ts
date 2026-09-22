/**
 * Shared settings contract for dsh-booster.
 *
 * This module is imported by BOTH halves, so it must stay pure data and types:
 * the host half builds the schemastery schema in `src/schema.ts`, and the client
 * bundle never pulls schemastery in.
 *
 * @module dsh-booster/settings
 */

/** The settings namespace every booster preference lives in. */
export const BOOSTER_NAMESPACE = 'booster'

/** Text scale for the interface font family control. */
export type FontFamilyChoice = 'default' | 'system' | 'yahei' | 'serif'

/** Accent palette applied as a stacked alias-token override layer. */
export type AccentChoice = 'default' | 'ocean' | 'forest' | 'violet'

/** Which links found in the agent's replies open in the right-Sidebar panel. */
export type LinkMode = 'all' | 'video'

/** Where a settled file edit is shown. */
export type FileOpenTarget = 'vscode' | 'preview' | 'off'

/**
 * What is known about the Sidebar's code-server, decided once and then remembered.
 *
 * `unknown` means nobody has looked yet — the state a fresh install starts in, and
 * the moment the plugin asks. `have` and `none` are the two answers; `none` is what
 * makes the built-in previewer the fallback instead of a silent no-op.
 */
export type CodeServerState = 'unknown' | 'have' | 'none'

/** Appearance module preferences. */
export interface AppearanceSettings {
  /** Accent palette; `default` applies no override layer at all. */
  accent: AccentChoice
  /** Interface font family; `default` leaves the shipped stack untouched. */
  fontFamily: FontFamilyChoice
}

/** Session-header quick tools preferences. */
export interface HeaderToolsSettings {
  /** Show the sidebar toggle in the session header. */
  sidebarToggle: boolean
  /** Show the reading-size stepper in the session header. */
  readingSize: boolean
}

/** Preview module preferences. */
export interface PreviewSettings {
  /** `all` follows every http(s) link in a reply; `video` only video links. */
  linkMode: LinkMode
  /** `vscode` hands the file to the Sidebar's code-server bridge. */
  fileOpen: FileOpenTarget
  /**
   * Whether the Sidebar's code-server has been looked for, and what was found.
   *
   * `unknown` is the fresh-install state: the plugin probes once, and on "not
   * there" it drops `fileOpen` back to the built-in previewer rather than leaving
   * file writes with nowhere to appear.
   */
  codeServer: CodeServerState
  /**
   * An address typed by hand into the panel, or an empty string to follow links.
   *
   * While this is set the panel shows it and stops following the agent's links, so a
   * page the user is reading is not replaced by the next URL in a reply. Submitting an
   * empty field restores following.
   */
  url: string
  /**
   * A start request from the browser, as a timestamp the client bumps.
   *
   * A page cannot start a program, so opening the VS Code tab writes a fresh value
   * here and the host half — which can — starts the service when it sees the value
   * change. That keeps the "no autostart, no idle memory" promise while still making
   * the tab work the first time it is opened.
   */
  startRequest: number
}

/** The whole `booster` settings section. */
export interface BoosterSettings {
  /** Per-module enable switches, keyed by module id. */
  modules: Record<string, boolean>
  /** Appearance module configuration. */
  appearance: AppearanceSettings
  /** Header-tools module configuration. */
  headerTools: HeaderToolsSettings
  /** Preview module configuration. */
  preview: PreviewSettings
}

/** Default enable state per module id. */
export const DEFAULT_MODULES: Record<string, boolean> = {
  preview: true,
  appearance: true,
  headerTools: true,
}

/** Default appearance configuration. */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: 'default',
  fontFamily: 'default',
}

/** Default header-tools configuration. */
export const DEFAULT_HEADER_TOOLS: HeaderToolsSettings = {
  sidebarToggle: true,
  readingSize: true,
}

/** Default preview configuration. */
export const DEFAULT_PREVIEW: PreviewSettings = {
  linkMode: 'all',
  fileOpen: 'vscode',
  codeServer: 'unknown',
  url: '',
  startRequest: 0,
}

/** Every selectable accent, in menu order; labels live in the client locale. */
export const ACCENT_CHOICES: readonly AccentChoice[] = ['default', 'ocean', 'forest', 'violet']

/** Every selectable interface font, in menu order. */
export const FONT_FAMILY_CHOICES: readonly FontFamilyChoice[] = ['default', 'system', 'yahei', 'serif']

/** Every selectable link-following mode, in menu order. */
export const LINK_MODES: readonly LinkMode[] = ['all', 'video']

/** Every selectable file-open target, in menu order. */
export const FILE_OPEN_TARGETS: readonly FileOpenTarget[] = ['vscode', 'preview', 'off']

/** Every remembered code-server answer, in the order the plugin reaches them. */
export const CODE_SERVER_STATES: readonly CodeServerState[] = ['unknown', 'have', 'none']

/**
 * Coerce a raw settings section into a complete, safe configuration.
 *
 * The mirror can hand back a partial section (a fresh install, a namespace that
 * predates a field, or a hand-edited `settings.yaml`), so every consumer reads
 * through this normalizer instead of trusting the shape.
 *
 * @param value - the raw section from the settings scope.
 * @returns a complete configuration with defaults filled in.
 */
export function normalizeBoosterSettings(value: unknown): BoosterSettings {
  const raw = (value !== null && typeof value === 'object' ? value : {}) as Partial<BoosterSettings>
  const modules = (raw.modules !== null && typeof raw.modules === 'object' ? raw.modules : {}) as Record<string, boolean>
  const appearance = (raw.appearance !== null && typeof raw.appearance === 'object' ? raw.appearance : {}) as Partial<AppearanceSettings>
  const headerTools = (raw.headerTools !== null && typeof raw.headerTools === 'object' ? raw.headerTools : {}) as Partial<HeaderToolsSettings>
  const preview = (raw.preview !== null && typeof raw.preview === 'object' ? raw.preview : {}) as Partial<PreviewSettings>

  return {
    modules: { ...DEFAULT_MODULES, ...modules },
    appearance: { ...DEFAULT_APPEARANCE, ...appearance },
    headerTools: { ...DEFAULT_HEADER_TOOLS, ...headerTools },
    preview: { ...DEFAULT_PREVIEW, ...preview },
  }
}
