/**
 * The `booster` settings schema.
 *
 * Host-only: the client bundle never imports this module, so schemastery never
 * reaches the browser. Keeping the schema here and the plain types in
 * `src/settings.ts` is what lets both halves share one contract without the
 * client taking a schema dependency.
 *
 * @module dsh-booster/schema
 */
import Schema from '@deepseek-ai/schemastery'
import {
  ACCENT_CHOICES,
  DEFAULT_APPEARANCE,
  DEFAULT_HEADER_TOOLS,
  DEFAULT_MODULES,
  DEFAULT_PREVIEW,
  FILE_OPEN_TARGETS,
  FONT_FAMILY_CHOICES,
  LINK_MODES,
} from './settings.ts'

/** The durable shape of the `booster` section. */
export const BoosterSchema = Schema.object({
  modules: Schema.object({
    preview: Schema.boolean().default(DEFAULT_MODULES.preview === true),
    appearance: Schema.boolean().default(DEFAULT_MODULES.appearance === true),
    headerTools: Schema.boolean().default(DEFAULT_MODULES.headerTools === true),
  }).default({ ...DEFAULT_MODULES }),

  appearance: Schema.object({
    accent: Schema.union(ACCENT_CHOICES.map((choice) => Schema.const(choice))).default(DEFAULT_APPEARANCE.accent),
    fontFamily: Schema.union(FONT_FAMILY_CHOICES.map((choice) => Schema.const(choice))).default(
      DEFAULT_APPEARANCE.fontFamily,
    ),
  }).default({ ...DEFAULT_APPEARANCE }),

  headerTools: Schema.object({
    sidebarToggle: Schema.boolean().default(DEFAULT_HEADER_TOOLS.sidebarToggle),
    readingSize: Schema.boolean().default(DEFAULT_HEADER_TOOLS.readingSize),
  }).default({ ...DEFAULT_HEADER_TOOLS }),

  preview: Schema.object({
    linkMode: Schema.union(LINK_MODES.map((mode) => Schema.const(mode))).default(DEFAULT_PREVIEW.linkMode),
    fileOpen: Schema.union(FILE_OPEN_TARGETS.map((target) => Schema.const(target))).default(DEFAULT_PREVIEW.fileOpen),
  }).default({ ...DEFAULT_PREVIEW }),
})
