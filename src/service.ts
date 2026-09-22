/**
 * On-demand startup for the Sidebar's code-server.
 *
 * Autostarting it at logon costs a couple of seconds of login activity and holds
 * ~164 MB all day even when nothing opens the panel. Starting it on demand costs
 * a one-off ~2 s the first time the agent writes a file in a session, and nothing
 * at all on a session where it never does.
 *
 * The service is created through the Windows WMI provider host, never as a child
 * of this process: a child sits inside DSH's process tree and is killed with it on
 * the next restart, which is exactly the failure this replaces. Parent chain of a
 * WMI-created process, verified: node -> cmd -> WmiPrvSE -> svchost -> services.
 *
 * @module dsh-booster/service
 */
import { spawn } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import net from 'node:net'

/** The port the Sidebar's code-server listens on. Keep in step with tools/*.ps1. */
export const SERVICE_PORT = 8443

/** The launch arguments. Keep in step with tools/start-code-server.ps1. */
const SERVICE_ARGS: readonly string[] = [
  '--auth', 'none',
  '--bind-addr', `127.0.0.1:${SERVICE_PORT}`,
  '--locale', 'zh-cn',
  '--disable-telemetry',
  '--disable-update-check',
  '--disable-workspace-trust',
]

/** Minimum gap between launch attempts, so a broken install is not hammered. */
const RETRY_MS = 60_000

/** When the last launch was attempted. */
let lastAttempt = 0

/**
 * Probe whether something is already listening on the port.
 *
 * @param port - the port to probe.
 * @param timeoutMs - how long to wait for a connection.
 * @returns whether a connection was established.
 */
export function isListening(port: number, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    let settled = false
    const finish = (value: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

/**
 * Locate the code-server launcher for this machine.
 *
 * @param env - the environment to read, defaulting to the process environment.
 * @returns the absolute path to `code-server.cmd`, or `undefined` when absent.
 */
export async function findLauncher(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const root = join(env.LOCALAPPDATA ?? env.HOME ?? '', 'code-server')
  try {
    for (const entry of await readdir(root)) {
      if (!entry.startsWith('code-server-')) continue
      const candidate = join(root, entry, 'bin', 'code-server.cmd')
      try {
        await stat(candidate)
        return candidate
      } catch {
        // Not this one; keep looking.
      }
    }
  } catch {
    // Not installed here.
  }
  return undefined
}

/** @param value - a PowerShell single-quoted string body. @returns it escaped. */
function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Make sure the service is up, starting it if it is not.
 *
 * Never throws and never blocks: the caller has already written its request, and
 * the bridge extension honours a request that is waiting when its window opens.
 *
 * @param env - the environment to read, defaulting to the process environment.
 * @param port - the port to probe, defaulting to the shipped one.
 * @param force - start even inside the retry window, for a user-initiated request.
 */
export async function ensureService(
  env: NodeJS.ProcessEnv = process.env,
  port = SERVICE_PORT,
  force = false,
): Promise<void> {
  try {
    if (await isListening(port)) return

    const now = Date.now()
    if (!force && now - lastAttempt < RETRY_MS) return

    const launcher = await findLauncher(env)
    if (launcher === undefined) return

    // The launcher is a Windows batch file and WMI is what starts it, so anywhere
    // else there is nothing to start. Skipping here is not just tidiness: `spawn`
    // reports a missing binary **asynchronously**, and an 'error' event nobody
    // listens for takes the whole host process down with it. That was a real bug —
    // on macOS and Linux a single file write was enough to kill the GUI.
    if (process.platform !== 'win32') return

    // Only a real launch consumes the retry window. "Not installed here" is not a
    // broken install to throttle, and treating it as one blocked the next valid
    // start for a full minute.
    lastAttempt = now

    // Quote the launcher only when its path actually needs it. Measured by hand:
    // WMI's CommandLine is unreliable when its FIRST token is a quoted path — the
    // call returns 0 and nothing starts — while the same command with a bare path
    // works. `%LOCALAPPDATA%\code-server\...` has no spaces on a normal install,
    // so the quoted branch is the rare case rather than the default.
    const quoted = launcher.includes(' ') ? `"${launcher}"` : launcher
    const commandLine = `${quoted} ${SERVICE_ARGS.join(' ')}`
    const command = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePowerShell(commandLine)} } | Out-Null`

    // -EncodedCommand, never -Command. Node escapes an argument's inner double
    // quotes as \" for the C runtime, and PowerShell does not parse that the same
    // way — the quotes around the launcher path arrived mangled, WMI still
    // reported success, and the launch silently did nothing. Base64 sidesteps
    // argv quoting entirely.
    const encoded = Buffer.from(command, 'utf16le').toString('base64')
    // Not `detached: true`. A detached process has no console, and WMI's
    // Win32_Process.Create silently does nothing from there — the call still
    // returns 0. This PowerShell is short-lived and only exists to ask WMI for the
    // process, so it does not need detaching: the thing that has to escape DSH's
    // process tree is code-server, and WMI is what puts it there.
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      stdio: 'ignore',
    })
    // Even on Windows this can fail (a locked-down PATH, a policy blocking
    // PowerShell). Without this listener that failure is an unhandled 'error'
    // event, i.e. a dead host process.
    child.on('error', (error) => {
      console.error('[dsh-booster] starting the Sidebar service failed:', error)
    })
    child.unref()
  } catch (error) {
    console.error('[dsh-booster] starting the Sidebar service failed:', error)
  }
}
