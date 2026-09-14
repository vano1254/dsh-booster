/**
 * DSH open bridge — a code-server extension.
 *
 * dsh-booster's host half watches the agent's `write` / `edit` tool results and
 * drops a request file; this extension watches that file and opens the named
 * file in whatever window is running. It is the only way to do this: the web
 * workbench has no URL parameter for "open this file", only for "open this
 * folder".
 *
 * Scope note: this runs inside code-server only. It reads and writes nothing
 * belonging to a desktop VS Code install, and the two never share state.
 *
 * The request file defaults to
 *   %LOCALAPPDATA%\code-server\bridge\open-request.json
 * and holds `{ "path": string, "line"?: number, "at": number }`.
 *
 * The marker is one-shot: once a window has opened the file, the marker is
 * removed. It therefore survives exactly the case it exists for — a request
 * made while no window was watching — without replaying the last file every
 * time the panel is reopened.
 */
const fs = require('node:fs')
const path = require('node:path')
const vscode = require('vscode')

/** Where the host half drops requests. Must match the host's constant. */
const MARKER = path.join(process.env.LOCALAPPDATA || '', 'code-server', 'bridge', 'open-request.json')

/**
 * Where this extension records what it did.
 *
 * Without it the last link in the chain — "did the window actually open the
 * file?" — is only observable by a human looking at the screen. One appended
 * line turns that into something checkable from outside the browser.
 */
const LOG = path.join(path.dirname(MARKER), 'bridge.log')

/** Requests arriving inside this window collapse into the newest one. */
const COALESCE_MS = 200

/** The last request id already acted on. */
let lastAt = 0
/** The pending request, if a burst is being coalesced. */
let pending = null
/** The coalescing timer. */
let timer = null

/**
 * Append one line to the bridge log.
 * @param {string} line - what happened.
 * @returns {void}
 */
function log(line) {
  try {
    fs.appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`)
  } catch {
    // Logging must never break the bridge.
  }
}

/**
 * Resolve a requested path against the workspace when it is relative.
 * @param {string} requested - the path from the request file.
 * @returns {string | undefined} an absolute path, or undefined when it cannot be resolved.
 */
function resolveTarget(requested) {
  if (!requested || typeof requested !== 'string') return undefined
  if (path.isAbsolute(requested)) return requested
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
  if (!folder) return undefined
  return path.join(folder.uri.fsPath, requested)
}

/**
 * Drop the marker so this request is never honoured twice.
 *
 * Called only after a successful open: a request that failed or could not be
 * resolved stays on disk for the next window. `fs.watchFile` reports the file
 * reappearing, so the next request is still picked up immediately.
 *
 * @param {number} at - the request id that was honoured.
 * @returns {void}
 */
function consume(at) {
  lastAt = at
  try {
    fs.rmSync(MARKER, { force: true })
  } catch {
    // A marker that cannot be removed only risks one redundant open.
  }
}

/**
 * Open one request in the editor area.
 * @param {{ path: string, line?: number }} request - the request to honour.
 * @returns {Promise<boolean>} true once the editor has been opened, false when the request was skipped.
 */
async function open(request) {
  const absolute = resolveTarget(request.path)
  if (!absolute) {
    log(`skipped, path unresolved: ${String(request.path)}`)
    return false
  }
  if (!fs.existsSync(absolute)) {
    log(`skipped, file missing: ${absolute}`)
    return false
  }

  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(absolute))
  const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: false })
  log(`opened ${absolute}`)

  if (typeof request.line === 'number' && request.line > 0) {
    const position = new vscode.Position(Math.min(request.line - 1, document.lineCount - 1), 0)
    editor.selection = new vscode.Selection(position, position)
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
  }

  return true
}

/**
 * Drain the marker file, honouring at most one request per coalescing window.
 * @returns {void}
 */
function drain() {
  timer = null
  const request = pending
  pending = null
  if (!request) return
  open(request)
    .then((opened) => {
      if (opened) consume(request.at)
    })
    .catch((error) => {
      log(`failed: ${error && error.message ? error.message : String(error)}`)
      console.error('[dsh-open-bridge] opening the requested file failed:', error)
    })
}

/**
 * Read the marker and schedule the newest request.
 * @returns {void}
 */
function readMarker() {
  let request
  try {
    request = JSON.parse(fs.readFileSync(MARKER, 'utf8'))
  } catch {
    // A missing or half-written marker is the normal case between requests.
    return
  }
  if (!request || typeof request.at !== 'number' || request.at <= lastAt) return
  lastAt = request.at
  pending = request
  if (timer === null) timer = setTimeout(drain, COALESCE_MS)
}

/**
 * Extension entry point.
 * @param {vscode.ExtensionContext} context - the extension context.
 * @returns {void}
 */
function activate(context) {
  try {
    fs.mkdirSync(path.dirname(MARKER), { recursive: true })
  } catch {
    // A read-only data dir only costs the bridge, never the window.
  }

  const listener = () => readMarker()
  fs.watchFile(MARKER, { interval: 300 }, listener)
  context.subscriptions.push({
    dispose() {
      fs.unwatchFile(MARKER, listener)
      if (timer !== null) clearTimeout(timer)
    },
  })

  log('activated')
  // A request may already be waiting from before this window opened.
  readMarker()
}

/** @returns {void} */
function deactivate() {}

module.exports = { activate, deactivate }
