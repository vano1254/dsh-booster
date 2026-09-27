/**
 * The right Sidebar's real VS Code.
 *
 * This is the whole client half now. It registers one tab type, frames the workbench,
 * and — when the service is not up — says what is actually wrong and how to start it.
 *
 * Settings used to live here (a page, a store, a module manager); in 0.1.7 the product's
 * plugin manager owns plugin configuration, so the only thing a page of our own could do
 * was duplicate it.
 *
 * @module dsh-booster/client/vscode
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Identity of the tab type this plugin owns. */
export const VSCODE_TYPE_ID = 'dsh-booster/vscode'

/** The kind the tab is opened by. */
export const VSCODE_KIND = 'booster-vscode'

/** Port of the Sidebar service. Must match `SERVICE_PORT` in `src/service.ts`. */
const SERVICE_PORT = 8443

/**
 * The workbench URL the tab frames.
 *
 * Deliberately carries **no** `?folder=` parameter: code-server persists it, so a stale or
 * malformed value outlives the page and greets the next window with "Workspace does not
 * exist". Without it, code-server opens the folder it is configured with.
 */
const SERVICE_HOME = `http://127.0.0.1:${SERVICE_PORT}/`

/**
 * Ask whether anything is listening on the service's port.

/** Strings this panel needs, in both shipped locales. */
export const DICT = {
  zh: {
    tab: 'VS Code',
    note: '这是插件按需拉起的真 VS Code（code-server）。空白的话：服务还没起来 —— 写一个文件它就会自己启动，或者用下面那条命令手动起。',
    fullscreen: '全屏',
    label: '右侧 VS Code（code-server）',
    'state.unknown': '正在检测…',
    'state.have': '已检测到，可以用了',
    'state.none': '服务没在运行（插件不会开机自启）',
    'hint.manual': '写一个文件它就会自己启动；或者用下面第一条命令手动起。还没装就第二条（约 675 MB 独立程序，仅 Windows）。',
    'recheck': '重新检测',
    'start.label': '启动（已安装）',
    'install.label': '安装（还没装）',
    'showCommand': '查看命令',
    'hideCommand': '收起命令',
  },
  en: {
    tab: 'VS Code',
    note: 'The real VS Code (code-server) that this plugin starts on demand. Blank pane? The service is not up — writing a file starts it, or use the command below.',
    fullscreen: 'Fullscreen',
    label: 'VS Code in the right Sidebar (code-server)',
    'state.unknown': 'Checking…',
    'state.have': 'Found it — ready to use',
    'state.none': 'The service is not running (the plugin never autostarts it)',
    'hint.manual': 'Writing a file starts it, or use the first command below. Not installed yet? The second one installs it (~675 MB, Windows only).',
    'recheck': 'Check again',
    'start.label': 'Start it (already installed)',
    'install.label': 'Install it (not yet installed)',
    'showCommand': 'Show the commands',
    'hideCommand': 'Hide the command',
  },
} as const

/** The two commands the empty state hands over. */
const START_COMMAND = [
  '$d = Get-ChildItem "$env:USERPROFILE\\.dsh\\profiles\\*\\node_modules\\dsh-booster" -Directory | Select-Object -First 1',
  'powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName \'tools\\start-code-server.ps1\')',
].join('\n')

/** The install command, for a machine that does not have code-server yet. */
const INSTALL_COMMAND = [
  '$d = Get-ChildItem "$env:USERPROFILE\\.dsh\\profiles\\*\\node_modules\\dsh-booster" -Directory | Select-Object -First 1',
  'powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName \'tools\\setup-code-server.ps1\')',
].join('\n')

/** A translator; the fallback returns the key's Chinese text. */
export type Translate = (key: string) => string

/**
 * Ask whether anything is listening on the service's port.
 *
 * `no-cors` is the whole trick: the response is opaque and never read, but the promise
 * still rejects when nothing answers — exactly the distinction that matters ("running" vs
 * "not there"). It is a plain GET to our own loopback port; nothing leaves the machine.
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
 * One framed surface: the workbench, a fullscreen escape, and a note.
 *
 * A ~300px Sidebar column is narrower than any embedded UI's comfortable tier, and
 * code-server is the one that needs the pixels most.
 *
 * @param props - the translator and the note.
 * @returns the framed surface.
 */
function FramePane({ t }: { t: Translate }): ReactNode {
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
        <span className="booster-preview__url" title={SERVICE_HOME}>
          {SERVICE_HOME}
        </span>
        <button
          type="button"
          className="booster-preview__action"
          data-booster-fullscreen="true"
          onClick={goFullscreen}
          title={t('fullscreen')}
          aria-label={t('fullscreen')}
        >
          {t('fullscreen')}
        </button>
      </header>

      <div className="booster-preview__frame" ref={frame}>
        <iframe
          className="booster-preview__iframe"
          src={SERVICE_HOME}
          title={t('tab')}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <p className="booster-preview__note">{t('note')}</p>
    </div>
  )
}

/**
 * Build the tab body element.
 *
 * The entry file is plain `.ts` (no JSX), so the element is created here and handed over
 * as an ordinary function value.
 *
 * @param t - the translator.
 * @param ctx - the client context the config face is read from.
 * @returns the tab body element.
 */
export function vscodePanelElement(t: Translate): ReactNode {
  return <VSCodePanel t={t} />
}

/**
 * The tab body: the workbench, or the reason there is none yet.
 *
 * There is deliberately no "ask the host to start it" path here. The 0.1.7 client can
 * write a value through `configForms`, but the host event that would carry it
 * (`settings/updated`) does not exist in this version's event catalog, so a start request
 * written from the page reaches nobody. Claiming otherwise in the UI would be a lie; the
 * honest answer is the one below — a settled file write starts the service, and the
 * commands are here for everything else.
 *
 * @param props - the translator.
 * @returns the tab body.
 */
function VSCodePanel({ t }: { t: Translate }): ReactNode {
  const [state, setState] = useState<'unknown' | 'have' | 'none'>('unknown')
  const [showCommand, setShowCommand] = useState(false)

  useEffect(() => {
    let live = true
    // One probe whenever the tab body mounts: the answer rarely changes, but a service
    // that was down when the page loaded may be up by the time the tab is opened.
    void probeService().then((up) => {
      if (live) setState(up ? 'have' : 'none')
    })
    return () => {
      live = false
    }
  }, [])

  if (state === 'have') return <FramePane t={t} />

  return (
    <div className="booster-preview__empty">
      <div className="booster-codeserver" data-booster-code-server={state}>
        <div className="booster-row__label">{t('label')}</div>
        <div className="booster-row__hint">{state === 'unknown' ? t('state.unknown') : t('state.none')}</div>
        <div className="booster-row__hint">{t('hint.manual')}</div>
        <div className="booster-codeserver__actions">
          <button type="button" className="booster-button" onClick={() => setShowCommand((open) => !open)}>
            {t(showCommand ? 'hideCommand' : 'showCommand')}
          </button>
          <button
            type="button"
            className="booster-button"
            onClick={() => {
              setState('unknown')
              void probeService().then((up) => setState(up ? 'have' : 'none'))
            }}
          >
            {t('recheck')}
          </button>
        </div>
        {showCommand && (
          <>
            <div className="booster-row__hint">{t('start.label')}</div>
            <pre className="booster-codeserver__command">{START_COMMAND}</pre>
            <div className="booster-row__hint">{t('install.label')}</div>
            <pre className="booster-codeserver__command">{INSTALL_COMMAND}</pre>
          </>
        )}
      </div>
    </div>
  )
}
