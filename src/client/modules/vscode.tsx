/**
 * The right Sidebar's real VS Code.
 *
 * This module now owns exactly one thing: the code-server workbench in the right
 * Sidebar, started on demand and reached through a tab type of its own.
 *
 * It used to own more — a web panel that followed links into the agent's replies, a
 * typed address bar, and routing of written files through the product's document
 * preview. DSH 0.1.6 moved all of that into the product itself (a Sidebar browser,
 * native file previews, a changed-file review tab), so keeping our own copy would mean
 * two mechanisms fighting over the same Sidebar. What is left is the part the product
 * does not do: a real workbench.
 *
 * @module dsh-booster/client/modules/vscode
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { injectStylesheet, PREVIEW_CSS } from '../styles.ts'
import { resolveService, type ClientContext, type SlotsService } from '../types.ts'
import type { Translate } from '../locale.ts'
import type { BoosterModule, BoosterStore } from '../runtime.ts'
import type { CodeServerState, FileOpenTarget, VscodeSettings } from '../../settings.ts'

/** Port of the Sidebar service. Must match `SERVICE_PORT` in `src/service.ts`. */
const SERVICE_PORT = 8443

/**
 * The workbench URL the tab frames.
 *
 * Deliberately carries **no** `?folder=` parameter: code-server persists it, so a stale
 * or malformed value outlives the page and greets the next window with "Workspace does
 * not exist". Without it, code-server opens the folder it is configured with.
 */
const SERVICE_HOME = `http://127.0.0.1:${SERVICE_PORT}/`

/**
 * The tab type this plugin owns.
 *
 * A type of its own, so the workbench is reached on purpose rather than by a reply that
 * happens to mention its URL.
 */
const VSCODE_TYPE_ID = 'dsh-booster/vscode'
const VSCODE_KIND = 'booster-vscode'

/**
 * The command that installs everything the tab needs.
 *
 * Shown rather than run: installing code-server downloads ~206 MB and unpacks it next
 * to the user profile, and a browser page cannot do that. Handing over the one command
 * is the honest version of "offer to install it".
 */
const CODE_SERVER_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\desktop\\node_modules\\dsh-booster"',
  'powershell -ExecutionPolicy Bypass -File tools\\setup-code-server.ps1',
].join('\n')

/**
 * The command that starts a service that is already installed.
 *
 * The plugin registers no autostart on purpose, and the tab asks the host to start it
 * when it is opened; this is the manual fallback for when that cannot work.
 */
const START_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\desktop\\node_modules\\dsh-booster"',
  'powershell -ExecutionPolicy Bypass -File tools\\start-code-server.ps1',
].join('\n')

/**
 * Ask whether anything is listening on the service's port.
 *
 * `no-cors` is the whole trick: the response is opaque and never read, but the promise
 * still rejects when nothing answers — exactly the distinction that matters ("running"
 * vs "not there"). It is a plain GET to our own loopback port; nothing leaves the
 * machine.
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
 * The probe only tells us whether the service is **reachable right now** — it is started
 * on demand and has no autostart, so "not answering" does not mean "not installed". That
 * is why this never rewrites `fileOpen`: the user's choice is theirs.
 *
 * @param input - the current settings, a writer, and an optional probe.
 * @returns the answer that was recorded.
 */
export async function resolveCodeServer(input: {
  settings: VscodeSettings
  set: (value: VscodeSettings) => void
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

/**
 * Open (or focus) the pinned VS Code tab.
 *
 * The settings page's button goes through this, so there is one place that resolves the
 * Sidebar service defensively.
 *
 * @param ctx - the client root context.
 */
export function openVSCodeTab(ctx: ClientContext): void {
  const sidebar = resolveService<{ openTab(kind: string, options?: unknown): void }>(ctx, 'sidebarRight')
  if (sidebar === undefined) return
  try {
    sidebar.openTab(VSCODE_KIND, { params: { source: 'dsh-booster' } })
  } catch (error) {
    // No mounted session surface, or the type is absent: never break the turn.
    console.error('[dsh-booster] opening the VS Code tab failed:', error)
  }
}

/**
 * One framed surface: the workbench, a fullscreen escape, and a note.
 *
 * A ~300px Sidebar column is narrower than any embedded UI's comfortable tier, and
 * code-server is the one that needs the pixels most.
 *
 * @param props - the URL, the closing note and the translator.
 * @returns the framed surface.
 */
function FramePane({ url, note, t }: { url: string; note: string; t: Translate }): ReactNode {
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
        <span className="booster-preview__url" title={url}>
          {url}
        </span>
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
      </header>

      <div className="booster-preview__frame" ref={frame}>
        <iframe
          className="booster-preview__iframe"
          src={url}
          title={t('preview.vscodeTab')}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <p className="booster-preview__note">{note}</p>
    </div>
  )
}

/** Props of the code-server status block, shared by the settings page and the tab. */
export interface CodeServerRowProps {
  /** Current settings. */
  vscode: VscodeSettings
  /** Write the section: the row records an answer, or changes where code opens. */
  set: (value: VscodeSettings) => void
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
 * A fresh install lands on `unknown`, one probe turns that into a real answer, and a
 * "no" gets an explanation plus the commands that would change it — never a blank pane.
 *
 * @param props - the state, a writer, the translator and a re-check action.
 * @returns the status block.
 */
export function CodeServerRow(props: CodeServerRowProps): ReactNode {
  const { vscode, set, t, recheck, starting = false } = props
  const [showCommand, setShowCommand] = useState(false)
  const state = vscode.codeServer

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
    </div>
  )
}

/**
 * The pinned VS Code tab: the workbench, or the reason there is none yet.
 *
 * It reads settings live instead of through a snapshot captured at registration, so a
 * change made in the settings page shows up here without a reload.
 *
 * @param props - the translator and the booster settings store.
 * @returns the framed workbench, or the code-server status block.
 */
function VSCodePanel(props: { t: Translate; store: BoosterStore }): ReactNode {
  const { t, store } = props
  const [settings, setSettings] = useState<VscodeSettings>(() => store.get().vscode)

  useEffect(() => store.subscribe(() => setSettings(store.get().vscode)), [store])

  // Re-checking is also the way to ask again: the probe writes an answer, and a fresh
  // request goes out when the answer is still "not there".
  const recheck = (): void => {
    startAsked = false
    void resolveCodeServer({ settings: store.get().vscode, set: (value) => store.set('vscode', value) })
  }

  // Opening this tab is the user asking for the workbench, and a page cannot start a
  // program — so bump `startRequest` and let the host do it. The host answers in
  // `codeServer` either way, which is why nothing here has to poll.
  const asked = settings.startRequest > 0
  useEffect(() => {
    if (settings.codeServer === 'have' || asked || startAsked) return
    startAsked = true
    store.set('vscode', { ...store.get().vscode, startRequest: Date.now() })
  }, [settings.codeServer, asked, store])

  if (settings.codeServer !== 'have') {
    return (
      <div className="booster-preview__empty">
        <CodeServerRow
          vscode={settings}
          set={(value) => store.set('vscode', value)}
          t={t}
          recheck={recheck}
          starting={asked}
        />
      </div>
    )
  }

  return <FramePane url={SERVICE_HOME} note={t('preview.vscodeNote')} t={t} />
}

/**
 * Whether this page load has already asked about code-server.
 *
 * Module scope on purpose: the probe must run once per page load, not once per settings
 * change, and a module re-apply must not ask again.
 */
let probedOnce = false

/** Whether this page load has already asked the host to start the service. */
let startAsked = false

/** The right Sidebar's VS Code. */
export const vscodeModule: BoosterModule = {
  id: 'vscode',
  titleKey: 'vscode.title',
  descKey: 'vscode.desc',
  defaultEnabled: true,
  configOf: (settings) => settings.vscode,

  apply({ ctx, settings, t, store: settingsStore }) {
    const disposers: Array<() => void> = []
    let started = false
    let disposed = false

    /**
     * Record why the module could not start.
     *
     * The browser console is not readable from outside, so a failure registers an
     * invisible overlay entry whose id carries the reason: it costs no visible UI and
     * makes the state inspectable at runtime.
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
     * Contribute the tab type and its body.
     *
     * @param tabs - the acquired tab-type registry.
     */
    const start = (tabs: { register(definition: unknown): () => void }): void => {
      if (started || disposed) return
      started = true
      const slots = ctx.slots as SlotsService

      disposers.push(injectStylesheet('preview', PREVIEW_CSS))

      try {
        disposers.push(
          tabs.register({
            id: VSCODE_TYPE_ID,
            kind: VSCODE_KIND,
            // A third-party type; the band only matters for resource claiming.
            priority: 'extension',
            title: () => t('preview.vscodeTab'),
          }),
        )
      } catch (error) {
        console.error('[dsh-booster] registering the VS Code tab type failed:', error)
        report('register-failed')
        return
      }

      disposers.push(
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register(
            { name: 'sidebar.right.pane.tab', key: VSCODE_TYPE_ID },
            (() => <VSCodePanel t={t} store={settingsStore} />) as never,
          ),
        ),
      )
    }

    // Ask once per page load, and only when the answer is not "have": the service has no
    // autostart, so today's "no" can be tomorrow's "yes" without the user hunting for a
    // button. The write is skipped when nothing changed, so a machine without
    // code-server does not churn the settings file.
    if (settings.vscode.codeServer !== 'have' && !probedOnce) {
      probedOnce = true
      void resolveCodeServer({
        settings: settingsStore.get().vscode,
        set: (value) => {
          if (value.codeServer !== settingsStore.get().vscode.codeServer) settingsStore.set('vscode', value)
        },
      })
    }

    // The right Sidebar publishes `sidebarRightTabs` from the same boot batch as this
    // bundle, and the graph only orders a consumer after its declared providers — this
    // package declares none, so a plain read can simply be too early. Try it first, then
    // wait for the service the way the shipped right-Sidebar consumers do.
    const immediate = readTabsFace(ctx)
    if (immediate !== undefined) {
      start(immediate)
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
            start(tabs)
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
          console.error('[dsh-booster] VS Code teardown failed:', error)
        }
      }
    }
  },
}

/** The file-open targets this module still honours; `native` leaves it to the product. */
export type { FileOpenTarget }
