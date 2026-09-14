/**
 * The marker-file contract shared by dsh-booster's host half and the code-server
 * bridge extension.
 *
 * The web workbench has no URL parameter for "open this file" — only for "open
 * this folder" — so the two sides meet in a file instead: the host writes a
 * request, the extension polls it and opens the file in the window.
 *
 * `vscode-extension/dsh-booster.dsh-open-bridge-0.1.0/extension.js` hard-codes
 * the same path; keep the two in step.
 *
 * @module dsh-booster/bridge
 */
import { join } from 'node:path'

/** Directory name the extension watches, relative to the local app data root. */
const BRIDGE_DIRECTORY = 'code-server/bridge'

/** File name the extension polls. */
const BRIDGE_FILE = 'open-request.json'

/**
 * Resolve the request-file path for this machine.
 *
 * Read at call time rather than at module load so a test can point it elsewhere.
 *
 * @param env - the environment to read, defaulting to the process environment.
 * @returns the absolute marker path.
 */
export function markerPath(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.LOCALAPPDATA ?? env.HOME ?? ''
  return join(root, ...BRIDGE_DIRECTORY.split('/'), BRIDGE_FILE)
}

/** One request, as the extension reads it. */
export interface OpenRequest {
  /** The file to open; absolute, or relative to the first workspace folder. */
  readonly path: string
  /** Optional 1-based line to reveal. */
  readonly line?: number
  /** Unix epoch ms; the extension ignores anything older than what it has seen. */
  readonly at: number
}
