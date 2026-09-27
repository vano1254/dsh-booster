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
  CHIME_MIN_SECONDS,
  CODE_SERVER_STATES,
  DEFAULT_APPEARANCE,
  DEFAULT_CHIME,
  DEFAULT_HEADER_TOOLS,
  DEFAULT_MODULES,
  DEFAULT_VSCODE,
  FILE_OPEN_TARGETS,
  FONT_FAMILY_CHOICES,
} from './settings.ts'

/** The durable shape of the `booster` section. */
export const BoosterSchema = Schema.object({
  modules: Schema.object({
    vscode: Schema.boolean().default(DEFAULT_MODULES.vscode === true),
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

  vscode: Schema.object({
    fileOpen: Schema.union(FILE_OPEN_TARGETS.map((target) => Schema.const(target))).default(DEFAULT_VSCODE.fileOpen),
    codeServer: Schema.union(CODE_SERVER_STATES.map((state) => Schema.const(state))).default(DEFAULT_VSCODE.codeServer),
    startRequest: Schema.number().default(DEFAULT_VSCODE.startRequest),
  }).default({ ...DEFAULT_VSCODE }),

  chime: Schema.object({
    minSeconds: Schema.union(CHIME_MIN_SECONDS.map((seconds) => Schema.const(seconds))).default(DEFAULT_CHIME.minSeconds),
    onError: Schema.boolean().default(DEFAULT_CHIME.onError),
    previewAt: Schema.number().default(DEFAULT_CHIME.previewAt),
  }).default({ ...DEFAULT_CHIME }),
})
