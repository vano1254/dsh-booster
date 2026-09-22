/**
 * Preview module: the right Sidebar as a live "what is being worked on" surface.
 *
 * Two triggers, both read from the session's chat snapshot on the client, so no
 * Host RPC of our own is involved:
 *
 * 1. A running `write` / `edit` call opens the file in the **built-in** document
 *    preview through `ctx.sidebarRight.openResource`, so the code on screen comes
 *    from the product's own renderer — syntax highlighting, line numbers, scroll
 *    and reload controls. This module does not reimplement a code view.
 * 2. A link in the agent's newest reply opens in a small web panel this module
 *    owns, because the built-in preview only claims `dsh-resource://` addresses
 *    and cannot show an `https://` page.
 *
 * Deliberately absent: diffing, paging, per-change bookkeeping. The panel shows
 * what is being worked on now, and nothing more than that.
 *
 * @module dsh-booster/client/modules/preview
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { injectStylesheet, PREVIEW_CSS } from '../styles.ts'
import { resolveService, type ClientContext, type SlotsService } from '../types.ts'
import type { Translate } from '../locale.ts'
import type { BoosterModule, BoosterStore } from '../runtime.ts'
import type { CodeServerState, FileOpenTarget, LinkMode, PreviewSettings } from '../../settings.ts'

/** Identity of the web panel's tab type in the right Sidebar's tab system. */
export const PREVIEW_TYPE_ID = 'dsh-booster/preview-web'

/** The kind the web panel is opened by. */
export const PREVIEW_KIND = 'booster-preview-web'

/** The additive session seat that hosts the headless watcher. */
const WATCH_SLOT = 'conversation.input.dock'

/** What the web panel should render. */
export interface PreviewTarget {
  /** The URL actually loaded (already converted to an embed form when needed). */
  url: string
  /** Original URL, so the header can show and link to what was referenced. */
  source: string
  /** `video` renders a media element; `iframe` renders the page. */
  render: 'video' | 'iframe'
}

/** The current preview per session, observable by the web panel's body. */
export interface PreviewStore {
  /** @param sessionId - the session. @returns its current target, when one exists. */
  get(sessionId: string): PreviewTarget | undefined
  /** @returns the most recently written session id. */
  activeSession(): string | undefined
  /** Observe changes; the returned disposer removes the listener. */
  subscribe(listener: () => void): () => void
  /** Set the target for a session. */
  set(sessionId: string, target: PreviewTarget): void
}

/**
 * Build the preview store.
 *
 * @returns the store.
 */
export function createPreviewStore(): PreviewStore {
  const targets = new Map<string, PreviewTarget>()
  const listeners = new Set<() => void>()
  let lastSession: string | undefined

  return {
    get: (sessionId) => targets.get(sessionId),
    activeSession: () => lastSession,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    set(sessionId, target) {
      targets.set(sessionId, target)
      lastSession = sessionId
      for (const listener of [...listeners]) {
        try {
          listener()
        } catch (error) {
          console.error('[dsh-booster] preview listener failed:', error)
        }
      }
    },
  }
}

/** Direct media links play in a media element instead of an iframe. */
const DIRECT_MEDIA = /\.(mp4|webm|ogv|ogg|mov|m4v|m3u8)(?:[?#]|$)/i

/** Any http(s) URL. */
const URL_PATTERN = /https?:\/\/[^\s<>()"'`\]]+/g

/**
 * The Sidebar service's own address.
 *
 * Must stay in step with `SERVICE_PORT` in `src/service.ts` — the client half is a
 * separate bundle and cannot import it. A reply that mentions this URL is naming the
 * workbench itself, not handing over something to preview. If the panel loads it,
 * code-server persists whatever `?folder=` came along with it, and a documentation
 * example once became a "Workspace does not exist" dialog in the user's own window.
 */
const SERVICE_URL = /^https?:\/\/(?:127\.0\.0\.1|localhost):8443(?:[/?#]|$)/i

/** Port of the Sidebar service. Must match `SERVICE_PORT` in `src/service.ts`. */
const SERVICE_PORT = 8443

/**
 * The workbench URL the VS Code tab frames.
 *
 * Deliberately carries **no** `?folder=` parameter: code-server persists it, so a
 * stale or malformed value outlives the page and greets the next window with
 * "Workspace does not exist". Without it, code-server opens the folder it is
 * configured with.
 */
const SERVICE_HOME = `http://127.0.0.1:${SERVICE_PORT}/`

/**
 * The pinned VS Code tab.
 *
 * A tab type of this plugin's own, so the workbench is reached on purpose rather
 * than by a reply that happens to mention its URL.
 */
const VSCODE_TYPE_ID = 'dsh-booster/vscode'
const VSCODE_KIND = 'booster-vscode'

/**
 * The command that installs everything the VS Code tab needs.
 *
 * Shown rather than run: installing code-server means downloading ~206 MB and
 * unpacking it next to your user profile, and a browser page cannot do that. So the
 * plugin explains and hands over the one command, which is the honest version of
 * "offer to install it".
 */
const CODE_SERVER_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\web\\node_modules\\dsh-booster"',
  'powershell -ExecutionPolicy Bypass -File tools\\setup-code-server.ps1',
].join('\n')

/**
 * The command that starts a service that is already installed.
 *
 * The plugin registers no autostart on purpose, and the tab asks the host to start it
 * when it is opened; this is the manual fallback for when that cannot work.
 */
const START_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\web\\node_modules\\dsh-booster"',
  'powershell -ExecutionPolicy Bypass -File tools\\start-code-server.ps1',
].join('\n')

/**
 * Ask whether anything is listening on the Sidebar service's port.
 *
 * `no-cors` is the whole trick: the response is opaque and never read, but the
 * promise still rejects when nothing answers — exactly the distinction that matters
 * ("installed and running" vs "not there"). It is a plain GET to our own loopback
 * port; nothing leaves the machine.
 *
 * @param timeoutMs - how long to wait before calling it absent.
 * @returns true when a service answered.
 */
export async function probeService(timeoutMs = 1500): Promise<boolean> {
  let timer
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined
    timer = setTimeout(() => controller?.abort(), timeoutMs)
    await fetch(SERVICE_HOME, { mode: 'no-cors', cache: 'no-store', signal: controller?.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Turn one probe into a remembered answer.
 *
 * The probe only tells us whether the service is **reachable right now** — it is
 * started on demand and has no autostart, so "not answering" does not mean "not
 * installed". That is why this never rewrites `fileOpen`: the user's chosen target
 * is theirs, and the fallback for an absent service is the watcher's job.
 *
 * @param input - the current preview settings, a writer, and an optional probe.
 * @returns the answer that was recorded.
 */
export async function resolveCodeServer(input: {
  settings: PreviewSettings
  set: (value: PreviewSettings) => void
  probe?: () => Promise<boolean>
}): Promise<CodeServerState> {
  const probe = input.probe ?? probeService
  let up = false
  try {
    up = await probe()
  } catch {
    up = false
  }
  const state: CodeServerState = up ? 'have' : 'none'
  input.set({ ...input.settings, codeServer: state })
  return state
}

/**
 * @param url - a candidate link.
 * @returns true when it addresses the Sidebar service itself rather than content.
 */
export function isServiceLink(url: string): boolean {
  return SERVICE_URL.test(url)
}

/**
 * Build the session-scoped file address the built-in preview expects.
 *
 * Grammar read from the shipped `file-address` module:
 * `dsh-resource://file/<scope>/<sessionId>/<path segments>`.
 *
 * @param sessionId - the owning session.
 * @param path - the tool's `file_path`, relative or absolute.
 * @returns the address.
 */
export function fileAddress(sessionId: string, path: string): string {
  const segments = path
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${segments}`
}

/**
 * Convert a link into the form the panel should load.
 *
 * Known video hosts get their player URL because their watch page refuses to be
 * framed; everything else is loaded as-is and may be refused by the target.
 *
 * @param url - the referenced URL.
 * @returns the panel target.
 */
export function targetOf(url: string): PreviewTarget {
  if (DIRECT_MEDIA.test(url)) return { url, source: url, render: 'video' }

  const youtube = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]{6,})/.exec(url)
  if (youtube !== null) {
    return { url: `https://www.youtube.com/embed/${youtube[1]}`, source: url, render: 'iframe' }
  }
  const bilibili = /bilibili\.com\/video\/(BV[\w]+)/.exec(url)
  if (bilibili !== null) {
    // The official embed form: the watch page refuses framing, the player exists
    // to be framed. Danmaku is off because the panel is narrow, and `page=1`
    // pins the first part of a multi-part upload.
    return {
      url: `https://player.bilibili.com/player.html?bvid=${bilibili[1]}&page=1&high_quality=1&as_wide=1&danmaku=0&autoplay=0`,
      source: url,
      render: 'iframe',
    }
  }
  return { url, source: url, render: 'iframe' }
}

/** @param url - the referenced URL. @returns whether it is a video-ish link. */
export function isVideoLink(url: string): boolean {
  return DIRECT_MEDIA.test(url) || /youtube\.com|youtu\.be|bilibili\.com|vimeo\.com/i.test(url)
}

/** The slice of the chat snapshot this module reads. */
interface ChatLike {
  legacy?: {
    runningCalls?: readonly { callId: string; name: string; argsRaw: string }[]
    nodes?: readonly {
      kind?: string
      seq?: number
      blocks?: readonly { kind?: string; text?: string }[]
    }[]
  }
}

/**
 * Read the newest link in the agent's replies.
 *
 * @param chat - the chat snapshot.
 * @param mode - which links count.
 * @returns the URL, or `undefined` when the newest reply carries none.
 */
function newestLink(chat: ChatLike, mode: LinkMode): string | undefined {
  const nodes = chat.legacy?.nodes
  if (!Array.isArray(nodes)) return undefined

  let best: { seq: number; url: string } | undefined
  for (const node of nodes) {
    if (node === null || typeof node !== 'object' || node.kind !== 'assistant') continue
    if (!Array.isArray(node.blocks)) continue
    const text = node.blocks
      .filter((block) => block?.kind === 'text' && typeof block.text === 'string')
      .map((block) => block.text ?? '')
      .join('\n')
    const urls = text.match(URL_PATTERN)
    if (urls === null || urls.length === 0) continue

    const seq = typeof node.seq === 'number' ? node.seq : 0
    for (const candidate of urls) {
      if (isServiceLink(candidate)) continue
      if (mode === 'video' && !isVideoLink(candidate)) continue
      if (best === undefined || seq >= best.seq) best = { seq, url: candidate }
    }
  }
  return best?.url
}

/** @param raw - a tool call's raw argument JSON. @returns the targeted path. */
function filePathOf(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  try {
    const args: unknown = JSON.parse(raw)
    if (args === null || typeof args !== 'object') return undefined
    const path = (args as { file_path?: unknown }).file_path
    return typeof path === 'string' && path.length > 0 ? path : undefined
  } catch {
    // Streaming calls carry partial JSON; they are picked up on a later snapshot.
    return undefined
  }
}

/** Reusable read of a reflect-published service, trying property access first. */
function readTabsFace(source: unknown): { register(definition: unknown): () => void } | undefined {
  try {
    const viaProperty = (source as { sidebarRightTabs?: { register(definition: unknown): () => void } }).sidebarRightTabs
    if (viaProperty !== undefined && viaProperty !== null) return viaProperty
  } catch {
    // A context that does not declare the name throws on property access.
  }
  return resolveService(source as ClientContext, 'sidebarRightTabs')
}

/** Props the watcher receives: framework session props plus this module's store. */
interface WatcherProps {
  ctx: ClientContext
  store: PreviewStore
  mode: LinkMode
  fileOpen: FileOpenTarget
  /** What is known about the service behind `vscode`; `none` enables the fallback. */
  codeServer: CodeServerState
  /** A hand-typed address; while set, links in replies no longer replace the panel. */
  manualUrl: string
  sessionId?: string
  useChat?: <T>(selector: (snapshot: ChatLike) => T, eq?: (a: T, b: T) => boolean) => T
}

/**
 * Reveal (or focus) a tab, which also expands the right Sidebar.
 *
 * @param ctx - the client root context.
 * @param open - how to open it: a page kind, or a resource address.
 */
function reveal(ctx: ClientContext, open: { kind: string } | { address: string }): void {
  const sidebar = resolveService<{
    openTab(kind: string, options?: unknown): void
    openResource(address: string, options?: unknown): void
  }>(ctx, 'sidebarRight')
  if (sidebar === undefined) return
  try {
    if ('kind' in open) sidebar.openTab(open.kind, { params: { source: 'dsh-booster' } })
    else sidebar.openResource(open.address)
  } catch (error) {
    // No mounted session surface, or the type is absent: never break the turn.
    console.error('[dsh-booster] revealing the preview failed:', error)
  }
}

/**
 * Open (or focus) the pinned VS Code tab.
 *
 * The settings page's button and the watcher both go through this, so there is one
 * place that resolves the Sidebar service defensively.
 *
 * @param ctx - the client root context.
 */
export function openVSCodeTab(ctx: ClientContext): void {
  reveal(ctx, { kind: VSCODE_KIND })
}

/**
 * Headless watcher: reacts to file changes and to links in the agent's replies.
 *
 * @param props - framework session props plus this module's own store.
 * @returns nothing to render.
 */
function PreviewWatcher({ ctx, store, mode, fileOpen, codeServer, manualUrl, sessionId, useChat }: WatcherProps): ReactNode {
  const chat = useChat?.((snapshot: ChatLike) => snapshot)
  const paths = useRef<Map<string, string>>(new Map())
  const settled = useRef<Set<string>>(new Set())
  const loadedLinks = useRef<Set<string>>(new Set())
  const vscodeShown = useRef(false)

  useEffect(() => {
    if (chat === undefined || sessionId === undefined) return

    // 1. A file-changing call reveals the product's own preview for that file.
    // With the bridge in charge and a live service, the host half opens it in the
    // workbench instead. Without a confirmed service the built-in previewer is the
    // fallback, so a fresh install is never silent about a file it just wrote.
    const useBuiltin = fileOpen === 'preview' || (fileOpen === 'vscode' && codeServer === 'none')
    const running = useBuiltin ? (chat.legacy?.runningCalls ?? []) : []
    const runningIds = new Set(running.map((call) => call.callId))

    for (const call of running) {
      if (call.name !== 'write' && call.name !== 'edit') continue
      if (paths.current.has(call.callId)) continue
      const path = filePathOf(call.argsRaw)
      if (path === undefined) continue
      paths.current.set(call.callId, path)
      reveal(ctx, { address: fileAddress(sessionId, path) })
    }

    // A file is only guaranteed complete once its call settles, so ask the
    // preview for it again then; re-opening focuses the same tab and delivers a
    // new navigation revision.
    for (const [callId, path] of [...paths.current]) {
      if (runningIds.has(callId) || settled.current.has(callId)) continue
      settled.current.add(callId)
      reveal(ctx, { address: fileAddress(sessionId, path) })
    }

    // 2. The VS Code tab owns file opening when the bridge is in charge: the host
    // half has already handed the file to code-server, so put the workbench on
    // screen. Once per mount — revealing focuses the tab, and a snapshot arrives
    // on every streamed token.
    if (fileOpen === 'vscode' && !vscodeShown.current) {
      const busy = (chat.legacy?.runningCalls ?? []).some((call) => call.name === 'write' || call.name === 'edit')
      if (busy) {
        vscodeShown.current = true
        reveal(ctx, { kind: VSCODE_KIND })
      }
    }

    // 3. A link in the newest reply reveals the web panel — unless an address was
    // typed by hand, which is the user saying "keep this one".
    const url = manualUrl.trim() === '' ? newestLink(chat, mode) : undefined
    if (url !== undefined && !loadedLinks.current.has(url)) {
      loadedLinks.current.add(url)
      store.set(sessionId, targetOf(url))
      reveal(ctx, { kind: PREVIEW_KIND })
    }
  }, [chat, mode, fileOpen, codeServer, manualUrl, sessionId, store, ctx])

  return null
}

/** Props the web panel body receives. */
interface PanelProps {
  store: PreviewStore
  t: Translate
  sessionId?: string
  /** The address typed by hand, or an empty string to follow the agent's links. */
  url: string
  /** Record a hand-typed address; an empty string hands the panel back to following. */
  setUrl: (value: string) => void
}

/** Props of the editable address field. */
interface AddressProps {
  /** What the field shows: the typed address, or the link the panel is following. */
  value: string
  /** True when the shown address was typed, i.e. the panel is pinned to it. */
  pinned: boolean
  /** Called with the submitted address; an empty string restores following. */
  onSubmit: (value: string) => void
  /** Placeholder text. */
  placeholder: string
  /** Accessible label. */
  label: string
  /** Submit button text. */
  action: string
  /** Text of the button that goes back to following links. */
  follow: string
}

/**
 * The address field: type any URL and load it in the panel.
 *
 * It shows the address in force either way, so a followed link is still visible and
 * can be edited in place. The draft lives in local state and is written on submit
 * only: every settings write re-applies the whole preview module, so writing per
 * keystroke would tear the panel down in the middle of a word.
 *
 * @param props - the current address, whether it is pinned, a submit handler and the labels.
 * @returns the address form.
 */
function AddressField({ value, pinned, onSubmit, placeholder, label, action, follow }: AddressProps): ReactNode {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <form
      className="booster-preview__address"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(draft.trim())
      }}
    >
      <input
        className="booster-preview__input"
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className="booster-preview__action">
        {action}
      </button>
      {pinned && (
        <button type="button" className="booster-preview__action" onClick={() => onSubmit('')}>
          {follow}
        </button>
      )}
    </form>
  )
}

/** Props of the framed surface both tabs share. */
interface FrameProps {
  target: PreviewTarget
  note: string
  t: Translate
  /** Replaces the read-only address line when the surface is user-addressable. */
  address?: ReactNode
}

/**
 * One framed surface: URL bar, fullscreen escape, the frame itself, and a note.
 *
 * A ~300px Sidebar column is narrower than any video player's lowest comfortable
 * tier, so an embedded player picks its worst quality; going fullscreen gives it the
 * pixels to pick a better one. Both tabs need exactly this, and VS Code is the one
 * that needs it most.
 *
 * @param props - the target, the closing note and the translator.
 * @returns the framed surface.
 */
function FramePane({ target, note, t, address }: FrameProps): ReactNode {
  const frame = useRef<HTMLDivElement | null>(null)

  /** Fill the screen with the frame. */
  const goFullscreen = (): void => {
    const element = frame.current
    if (element === null) return
    const request =
      element.requestFullscreen ??
      (element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen
    if (typeof request !== 'function') return
    try {
      void request.call(element)
    } catch (error) {
      console.error('[dsh-booster] fullscreen request failed:', error)
    }
  }

  return (
    <div className="booster-preview">
      <header className="booster-preview__head">
        {address === undefined ? (
          <span className="booster-preview__url" title={target.source}>
            {target.source}
          </span>
        ) : (
          address
        )}
        <button
          type="button"
          className="booster-preview__action"
          data-booster-fullscreen="true"
          onClick={goFullscreen}
          title={t('preview.fullscreen')}
          aria-label={t('preview.fullscreen')}
        >
          {t('preview.fullscreen')}
        </button>
        <a className="booster-preview__open" href={target.source} target="_blank" rel="noreferrer noopener">
          {t('preview.openExternal')}
        </a>
      </header>

      <div className="booster-preview__frame" ref={frame}>
        {target.render === 'video' ? (
          <video
            className="booster-preview__video"
            src={target.url}
            controls
            playsInline
            referrerPolicy="no-referrer"
          />
        ) : (
          <iframe
            className="booster-preview__iframe"
            src={target.url}
            title={target.source}
            // No `referrerPolicy="no-referrer"` here on purpose: an embedded
            // player that cannot see where it is framed refuses to start —
            // YouTube reports exactly that as error 153. The default policy
            // sends only the origin, never the path.
            //
            // The sandbox blocks top-level navigation (the one token we leave
            // out) while still letting an ordinary page use its own forms,
            // popups, modals and downloads inside the frame.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      <p className="booster-preview__note">{note}</p>
    </div>
  )
}

/**
 * The web panel: the referenced page, or a media element for a direct video.
 *
 * @param props - framework slot props plus this module's store.
 * @returns the panel surface.
 */
function WebPanel(props: PanelProps): ReactNode {
  const { store, t, url, setUrl } = props
  const [, bump] = useState(0)

  useEffect(() => store.subscribe(() => bump((value) => value + 1)), [store])

  const sessionId = props.sessionId ?? store.activeSession()
  // One rule decides what the panel shows: a typed address wins over the followed
  // link, and an empty one hands the panel back to following.
  const typed = url.trim()
  const followed = sessionId === undefined ? undefined : store.get(sessionId)
  const target = typed !== '' ? targetOf(typed) : followed

  const address = (
    <AddressField
      value={typed !== '' ? typed : (followed?.source ?? '')}
      pinned={typed !== ''}
      onSubmit={setUrl}
      placeholder={t('preview.addressPlaceholder')}
      label={t('preview.address')}
      action={t('preview.addressGo')}
      follow={t('preview.addressFollow')}
    />
  )

  if (target === undefined) {
    // The field has to be reachable when nothing is loaded yet — otherwise there is
    // no way to ask for a page in the first place.
    return (
      <div className="booster-preview">
        <header className="booster-preview__head">{address}</header>
        <p className="booster-preview__empty">{t('preview.empty')}</p>
      </div>
    )
  }

  return <FramePane target={target} note={t('preview.note')} t={t} address={address} />
}

/** Props of the code-server status block, shared by the settings page and the tab. */
export interface CodeServerRowProps {
  /** Current preview settings. */
  preview: PreviewSettings
  /** Write the preview section: the row records an answer, or changes the target. */
  set: (value: PreviewSettings) => void
  /** Translator bound to this plugin's locale namespace. */
  t: Translate
  /** Ask again, for someone who has just installed it. */
  recheck: () => void
  /** True while a start has been asked for and the host has not answered yet. */
  starting?: boolean
}

/**
 * What the plugin knows about code-server, and the two answers a user can act on.
 *
 * This is the "ask at install time" the README promises: a fresh install lands on
 * `unknown`, one probe turns that into a real answer, and a "no" gets an explanation
 * plus the single command that would change it — never a blank pane.
 *
 * @param props - the state, a writer, the translator and a re-check action.
 * @returns the status block.
 */
export function CodeServerRow(props: CodeServerRowProps): ReactNode {
  const { preview, set, t, recheck, starting = false } = props
  const [showCommand, setShowCommand] = useState(false)
  const state = preview.codeServer

  return (
    <div className="booster-codeserver" data-booster-code-server={state}>
      <div className="booster-row__label">{t('preview.codeServer.label')}</div>
      <div className="booster-row__hint">
        {starting ? t('preview.codeServer.state.starting') : t(`preview.codeServer.state.${state}`)}
      </div>

      {state !== 'have' && (
        <>
          <div className="booster-row__hint">
            {starting ? t('preview.codeServer.startingHint') : t('preview.codeServer.hint')}
          </div>
          <div className="booster-codeserver__actions">
            <button type="button" className="booster-button" onClick={() => setShowCommand((open) => !open)}>
              {t(showCommand ? 'preview.codeServer.hideCommand' : 'preview.codeServer.showCommand')}
            </button>
            <button type="button" className="booster-button" onClick={recheck}>
              {t('preview.codeServer.recheck')}
            </button>
            {preview.fileOpen !== 'preview' && (
              <button type="button" className="booster-button" onClick={() => set({ ...preview, fileOpen: 'preview' })}>
                {t('preview.codeServer.useBuiltin')}
              </button>
            )}
          </div>
          {showCommand && (
            <>
              <div className="booster-row__hint">{t('preview.codeServer.startLabel')}</div>
              <pre className="booster-codeserver__command">{START_COMMAND}</pre>
              <div className="booster-row__hint">{t('preview.codeServer.installLabel')}</div>
              <pre className="booster-codeserver__command">{CODE_SERVER_COMMAND}</pre>
            </>
          )}
        </>
      )}

      {state === 'have' && preview.fileOpen !== 'vscode' && (
        <div className="booster-codeserver__actions">
          <button type="button" className="booster-button" onClick={() => set({ ...preview, fileOpen: 'vscode' })}>
            {t('preview.codeServer.useVscode')}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The pinned VS Code tab: the workbench this plugin starts on demand, or the reason
 * there is none yet.
 *
 * It reads settings live instead of through a snapshot captured at registration, so a
 * change made in the settings page shows up here without a reload.
 *
 * @param props - the translator and the booster settings store.
 * @returns the framed workbench, or the code-server status block.
 */
function VSCodePanel(props: { t: Translate; store: BoosterStore }): ReactNode {
  const { t, store } = props
  const [preview, setPreview] = useState<PreviewSettings>(() => store.get().preview)

  useEffect(() => store.subscribe(() => setPreview(store.get().preview)), [store])

  // Re-checking is also the way to ask again: the probe writes an answer, and a fresh
  // request goes out when the answer is still "not there".
  const recheck = (): void => {
    startAsked = false
    void resolveCodeServer({ settings: store.get().preview, set: (value) => store.set('preview', value) })
  }

  // Opening this tab is the user asking for the workbench, and a page cannot start a
  // program — so bump `startRequest` and let the host do it. The host answers in
  // `codeServer` either way, which is why nothing here has to poll.
  const asked = preview.startRequest > 0
  useEffect(() => {
    if (preview.codeServer === 'have' || asked || startAsked) return
    startAsked = true
    store.set('preview', { ...store.get().preview, startRequest: Date.now() })
  }, [preview.codeServer, asked, store])

  if (preview.codeServer !== 'have') {
    return (
      <div className="booster-preview__empty">
        <CodeServerRow
          preview={preview}
          set={(value) => store.set('preview', value)}
          t={t}
          recheck={recheck}
          starting={asked}
        />
      </div>
    )
  }

  return (
    <FramePane
      target={{ url: SERVICE_HOME, source: SERVICE_HOME, render: 'iframe' }}
      note={t('preview.vscodeNote')}
      t={t}
    />
  )
}

/**
 * Whether this page load has already asked about code-server.
 *
 * Module scope on purpose: the probe must run once per page load, not once per
 * settings change, and a module re-apply must not ask again.
 */
let probedOnce = false

/** Whether this page load has already asked the host to start the service. */
let startAsked = false
/** The preview module. */
export const previewModule: BoosterModule = {
  id: 'preview',
  titleKey: 'preview.title',
  descKey: 'preview.desc',
  defaultEnabled: true,
  configOf: (settings) => settings.preview,

  apply({ ctx, settings, t, store: settingsStore }) {
    const store = createPreviewStore()
    const disposers: Array<() => void> = []
    let started = false
    let disposed = false

    /**
     * Record why the module could not start.
     *
     * The browser console is not readable from outside, so a failure registers an
     * invisible overlay entry whose id carries the reason: it costs no visible UI
     * and makes the state inspectable at runtime.
     *
     * @param reason - a short, stable token describing the failure.
     */
    const report = (reason: string): void => {
      try {
        const slots = ctx.slots as SlotsService
        disposers.push(
          slots.inject('shell.overlay', () =>
            slots.register({ id: `dsh-booster-diag-${reason}`, name: 'shell.overlay' }, (() => null) as never),
          ),
        )
      } catch {
        // Diagnostics must never make things worse than the failure they report.
      }
    }

    /**
     * Contribute everything this module owns.
     *
     * @param tabs - the acquired tab-type registry.
     * @param mode - which links open in the panel.
     */
    const start = (
      tabs: { register(definition: unknown): () => void },
      mode: LinkMode,
      fileOpen: FileOpenTarget,
      codeServer: CodeServerState,
    ): void => {
      if (started || disposed) return
      started = true
      const slots = ctx.slots as SlotsService

      disposers.push(injectStylesheet('preview', PREVIEW_CSS))

      try {
        disposers.push(
          tabs.register({
            id: PREVIEW_TYPE_ID,
            kind: PREVIEW_KIND,
            // A third-party type; the band only matters for resource claiming.
            priority: 'extension',
            title: () => t('preview.tabTitle'),
          }),
        )
        // The workbench gets a type of its own, so nothing has to guess at a URL.
        disposers.push(
          tabs.register({
            id: VSCODE_TYPE_ID,
            kind: VSCODE_KIND,
            priority: 'extension',
            title: () => t('preview.vscodeTab'),
          }),
        )
      } catch (error) {
        console.error('[dsh-booster] registering the preview tab type failed:', error)
        report('register-failed')
        return
      }

      disposers.push(
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register(
            { name: 'sidebar.right.pane.tab', key: PREVIEW_TYPE_ID },
            ((slotProps: Record<string, unknown>) => (
              <WebPanel
                {...(slotProps as unknown as PanelProps)}
                store={store}
                t={t}
                url={settings.preview.url}
                setUrl={(value) => settingsStore.set('preview', { ...settingsStore.get().preview, url: value })}
              />
            )) as never,
          ),
        ),
      )

      disposers.push(
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register(
            { name: 'sidebar.right.pane.tab', key: VSCODE_TYPE_ID },
            (() => <VSCodePanel t={t} store={settingsStore} />) as never,
          ),
        ),
      )

      disposers.push(
        slots.inject(WATCH_SLOT, () =>
          slots.register(
            { id: 'dsh-booster-preview-watch', name: WATCH_SLOT, order: 90 },
            ((slotProps: Record<string, unknown>) => (
              <PreviewWatcher
                {...(slotProps as unknown as WatcherProps)}
                ctx={ctx}
                store={store}
                mode={mode}
                fileOpen={fileOpen}
                codeServer={codeServer}
                manualUrl={settings.preview.url}
              />
            )) as never,
          ),
        ),
      )
    }

    // The right Sidebar publishes `sidebarRightTabs` from the same boot batch as
    // this bundle, and the graph only orders a consumer after its declared
    // providers — this package declares none, so a plain read can simply be too
    // early. Try it first, then wait for the service the way the shipped
    // right-Sidebar consumers do.
    // Ask once per page load, and keep asking while the answer is not "have": the
    // service has no autostart, so today's "no" can be tomorrow's "yes" without the
    // user hunting for a button. The write is skipped when nothing changed, so a
    // machine that simply does not have code-server does not churn settings.yaml.
    if (settings.preview.codeServer !== 'have' && !probedOnce) {
      probedOnce = true
      void resolveCodeServer({
        settings: settingsStore.get().preview,
        set: (value) => {
          if (value.codeServer !== settingsStore.get().preview.codeServer) settingsStore.set('preview', value)
        },
      })
    }

    const mode = settings.preview.linkMode
    const fileOpen = settings.preview.fileOpen
    const codeServer = settings.preview.codeServer
    const immediate = readTabsFace(ctx)
    if (immediate !== undefined) {
      start(immediate, mode, fileOpen, codeServer)
    } else {
      const inject = (ctx as unknown as { inject?: (names: string[], callback: (scoped: ClientContext) => void) => unknown }).inject
      if (typeof inject === 'function') {
        try {
          const disposeInjection = inject.call(ctx, ['sidebarRightTabs'], (scoped) => {
            const tabs = readTabsFace(scoped)
            if (tabs === undefined) {
              report('inject-no-service')
              return
            }
            start(tabs, mode, fileOpen, codeServer)
          })
          if (typeof disposeInjection === 'function') disposers.push(disposeInjection as () => void)
        } catch (error) {
          console.error('[dsh-booster] waiting for sidebarRightTabs failed:', error)
          report('inject-threw')
        }
      } else {
        report('no-inject')
      }
    }

    return () => {
      disposed = true
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          console.error('[dsh-booster] preview teardown failed:', error)
        }
      }
    }
  },
}
