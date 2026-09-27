/**
 * Deterministic smoke test for both halves of dsh-booster.
 *
 * It runs the real build output against stub services, so it verifies behaviour
 * rather than shape: the host registers the namespace and its schema resolves
 * defaults, a settled file edit reaches the bridge only when the user asked for
 * VS Code, the module manager really tears contributions down when a switch
 * flips, and the VS Code tab is a tab type of its own whose frame address carries
 * no `?folder=`. No GUI restart, no browser.
 *
 * Run with: node scripts/smoke.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

/**
 * Assert one expectation.
 * @param {string} label - what is being checked.
 * @param {unknown} condition - truthy when the expectation holds.
 */
function check(label, condition) {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    console.log(`  FAIL ${label}`)
    failures.push(label)
  }
}

/**
 * Record something that depends on this host's capabilities rather than on the code.
 *
 * Never fails the run, and says why: a managed desktop or a CI runner can refuse WMI
 * process creation, which tells us nothing about the plugin. Capabilities the plugin
 * itself must guarantee are still asserted with `check`.
 *
 * @param {string} label - what is being observed.
 * @param {unknown} condition - truthy when the observation held on this host.
 */
function observe(label, condition) {
  console.log(`  ${condition ? 'ok  ' : 'skip'} ${label}${condition ? '' : '  (this host did not allow it)'}`)
}

// ---------------------------------------------------------------- host half

console.log('\nhost half')

const host = await import(new URL('../lib/index.js', import.meta.url).href)
check('exports name "dsh-booster"', host.name === 'dsh-booster')
check('exports apply()', typeof host.apply === 'function')

const registrations = []
let toolResultListener
host.apply({
  inject(names, callback) {
    check('injects the optional settings service', Array.isArray(names) && names.includes('settings'))
    callback({ settings: { register: (ns, schema) => registrations.push({ ns, schema }) } })
  },
  get: () => undefined,
  on(event, listener) {
    if (event === 'tools/result') toolResultListener = listener
    return () => {}
  },
})
check('host subscribes to settled tool results', typeof toolResultListener === 'function')

check('registers exactly one namespace', registrations.length === 1)
check('namespace is "booster"', registrations[0]?.ns === 'booster')

const resolved = registrations[0]?.schema({})
check(
  'schema resolves module defaults',
  resolved?.modules?.vscode === true && resolved?.modules?.appearance === true && resolved?.modules?.headerTools === true,
)
check('schema resolves appearance defaults', resolved?.appearance?.accent === 'default' && resolved?.appearance?.fontFamily === 'default')
check('schema resolves header-tools defaults', resolved?.headerTools?.sidebarToggle === true && resolved?.headerTools?.readingSize === true)
check(
  'schema resolves the vscode section defaults',
  resolved?.vscode?.fileOpen === 'vscode' && resolved?.vscode?.codeServer === 'unknown' && resolved?.vscode?.startRequest === 0,
)
check('schema resolves the chime defaults', resolved?.chime?.minSeconds === 3 && resolved?.chime?.onError === true)

// ------------------------------------------------------------- host bridge

console.log('\nhost bridge')

const nodeOs = await import('node:os')
const nodeFs = await import('node:fs')
const nodePath = await import('node:path')

// The marker path is resolved per call, so pointing LOCALAPPDATA at a temp root
// keeps this test off the real machine.
const bridgeRoot = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'booster-bridge-'))
const savedLocalAppData = process.env.LOCALAPPDATA
process.env.LOCALAPPDATA = bridgeRoot
const marker = nodePath.join(bridgeRoot, 'code-server', 'bridge', 'open-request.json')

// A fresh install with no stored section at all: the normalizer fills in
// `fileOpen: 'vscode'`, which is the target the bridge serves.
const config = { vscode: { fileOpen: 'vscode' } }
let settle
let settingsUpdated
let statusListener
let errorListener
const answerWrites = []
host.apply({
  inject: (_names, callback) => callback({ settings: { register: () => {} } }),
  get: (name) =>
    name === 'settings'
      ? {
          get: () => config,
          // The host answers a start request by replacing the section.
          replace: (ns, section) => {
            answerWrites.push({ ns, section })
            return Promise.resolve()
          },
        }
      : undefined,
  on: (event, listener) => {
    if (event === 'tools/result') settle = listener
    if (event === 'settings/updated') settingsUpdated = listener
    if (event === 'agent/status') statusListener = listener
    if (event === 'agent/error') errorListener = listener
    return () => {}
  },
})
check('the bridge subscribes to settled results', typeof settle === 'function')

/**
 * Wait until a condition holds, or give up.
 *
 * Fixed sleeps flake: a 60 ms wait for an asynchronous file write held on an idle
 * desktop and failed on a cold CI runner, which is a red build that says nothing about
 * the code. Polling the condition is both faster and steadier.
 *
 * @param {() => boolean} predicate - the condition to wait for; it may throw while not ready.
 * @param {number} [timeoutMs] - how long to wait before giving up.
 * @returns {Promise<boolean>} whether the condition held.
 */
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      if (predicate()) return true
    } catch {
      // Not ready yet.
    }
    if (Date.now() > deadline) return false
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

const readMarker = () => JSON.parse(nodeFs.readFileSync(marker, 'utf8'))
const writeAndSettle = async (name, args, isError = false) => {
  settle({ name, arguments: args }, { isError })
  // Negative assertions ("no request was dropped") need a window in which the request
  // could have appeared; positive ones poll below.
  await new Promise((resolve) => setTimeout(resolve, 200))
}

await writeAndSettle('write', { file_path: 'C:/work/a.ts' })
check('a settled write drops a bridge request', await waitFor(() => nodeFs.existsSync(marker)))
check('the request names the written file', await waitFor(() => readMarker().path === 'C:/work/a.ts'))
check('the request is stamped for ordering', typeof readMarker().at === 'number')
check('no temp file is left behind', !nodeFs.existsSync(`${marker}.tmp`))

await writeAndSettle('write', { file_path: 'C:/work/b.ts' }, true)
check('a failed write drops no request', readMarker().path === 'C:/work/a.ts')

await writeAndSettle('bash', { command: 'ls' })
check('a non-file tool drops no request', readMarker().path === 'C:/work/a.ts')

await writeAndSettle('edit', { file_path: 'C:/work/c.ts' })
check('a settled edit does drop one', await waitFor(() => readMarker().path === 'C:/work/c.ts'))

// Only `vscode` routes a file anywhere now, and the `off` target has to leave the
// bridge alone: it is the user saying "do not open anything".
config.vscode.fileOpen = 'off'
await writeAndSettle('write', { file_path: 'C:/work/e.ts' })
check('the off target leaves the bridge silent', readMarker().path === 'C:/work/c.ts')

config.vscode.fileOpen = 'vscode'
await writeAndSettle('write', { file_path: 'C:/work/f.ts' })
check('choosing VS Code again drops the next request', await waitFor(() => readMarker().path === 'C:/work/f.ts'))

process.env.LOCALAPPDATA = savedLocalAppData
nodeFs.rmSync(bridgeRoot, { recursive: true, force: true })

// ------------------------------------------------------------ completion chime

console.log('\ncompletion chime')

const doneWav = host.renderChime('done')
const errorWav = host.renderChime('error')
check(
  'the completion chime renders a RIFF/WAVE file',
  doneWav.subarray(0, 4).toString() === 'RIFF' && doneWav.subarray(8, 12).toString() === 'WAVE',
)
check('its declared length matches its bytes', doneWav.readUInt32LE(4) === doneWav.length - 8 && doneWav.readUInt32LE(40) === doneWav.length - 44)
check('it is mono 16-bit at 44.1 kHz', doneWav.readUInt16LE(22) === 1 && doneWav.readUInt16LE(34) === 16 && doneWav.readUInt32LE(24) === 44100)
check('rendering is deterministic', host.renderChime('done').equals(doneWav))
check('the falling chime is its own sound', !doneWav.equals(errorWav))
check('the rendered file is cached under the temp directory', host.chimeCachePath('done').startsWith(nodeOs.tmpdir()))
check('the cache path carries a version', /chime-v\d+-done\.wav$/.test(host.chimeCachePath('done')))
check('a short turn stays silent', host.shouldChime({ enabled: true, elapsedMs: 1200, minSeconds: 3, erroredAgoMs: Infinity }) === false)
check('a long turn chimes', host.shouldChime({ enabled: true, elapsedMs: 9000, minSeconds: 3, erroredAgoMs: Infinity }) === true)
check('a switched-off chime never fires', host.shouldChime({ enabled: false, elapsedMs: 60000, minSeconds: 0, erroredAgoMs: Infinity }) === false)
check('a failure does not chime twice on the way out', host.shouldChime({ enabled: true, elapsedMs: 9000, minSeconds: 3, erroredAgoMs: 800 }) === false)
check('the host listens for a turn ending', typeof statusListener === 'function' && typeof errorListener === 'function')

// --------------------------------------------------------- on-demand service

console.log('\non-demand service')

const nodeNet = await import('node:net')
const hostEntry = await import(new URL('../lib/index.js', import.meta.url).href)
check(
  'the host entry exposes the service helpers',
  typeof hostEntry.findLauncher === 'function' && typeof hostEntry.ensureService === 'function',
)

// A fake install layout: proves discovery without touching the real service. The
// fake launcher records that it ran, which is how the spawn path is verified.
const fakeRoot = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'booster-svc-'))
const fakeBin = nodePath.join(fakeRoot, 'code-server', 'code-server-9.9.9-windows-amd64', 'bin')
nodeFs.mkdirSync(fakeBin, { recursive: true })
const ranFile = nodePath.join(fakeRoot, 'launcher-ran.txt')
const fakeLauncher = nodePath.join(fakeBin, 'code-server.cmd')
nodeFs.writeFileSync(fakeLauncher, `@echo off\r\necho ran > "${ranFile}"\r\n`)

check(
  'a code-server-* install is discovered',
  (await hostEntry.findLauncher({ LOCALAPPDATA: fakeRoot })) === fakeLauncher,
)
check(
  'a machine without the install reports no launcher',
  (await hostEntry.findLauncher({ LOCALAPPDATA: nodePath.join(fakeRoot, 'nowhere') })) === undefined,
)

// Nothing listening, no launcher: it must resolve quietly and spawn nothing.
let threw = false
try {
  await hostEntry.ensureService({ LOCALAPPDATA: nodePath.join(fakeRoot, 'nowhere') }, 59999)
} catch {
  threw = true
}
check('it resolves quietly when it can do nothing', threw === false)

// Something already listening: it must short-circuit instead of starting a second.
const probe = nodeNet.createServer()
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
const probePort = probe.address().port
check('a listening port is detected', (await hostEntry.isListening(probePort)) === true)
await hostEntry.ensureService({ LOCALAPPDATA: fakeRoot }, probePort)
check('an already-running service is not started again', nodeFs.existsSync(ranFile) === false)
await new Promise((resolve) => probe.close(resolve))

// Nothing listening but a launcher present: on Windows the WMI command should run it.
// Whether this host permits WMI process creation is the host's business — GitHub's
// Windows runners refuse it — so in CI this is reported rather than asserted, and it
// stays a hard assertion everywhere else. Everywhere off Windows the start must be
// skipped, which is the part the plugin itself guarantees.
if (process.platform === 'win32') {
  await hostEntry.ensureService({ LOCALAPPDATA: fakeRoot }, 59998)
  let launched = false
  for (let attempt = 0; attempt < 80 && !launched; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    launched = nodeFs.existsSync(ranFile)
  }
  if (process.env.CI) {
    observe('the WMI start path runs the launcher on this host', launched)
  } else {
    check('a missing service is started through the WMI command', launched)
  }
} else {
  await hostEntry.ensureService({ LOCALAPPDATA: fakeRoot }, 59998)
  await new Promise((resolve) => setTimeout(resolve, 600))
  check('off Windows the start is skipped instead of spawning a missing binary', nodeFs.existsSync(ranFile) === false)
}

// A browser page cannot start a program, so the VS Code tab bumps
// `vscode.startRequest` and the host answers in `vscode.codeServer`. A throwaway
// listener on the port makes that answer deterministic; LOCALAPPDATA stays pointed at
// the fake install so that even a real spawn attempt can only run the fake launcher.
check('the host listens for a start request', typeof settingsUpdated === 'function')
process.env.LOCALAPPDATA = fakeRoot
config.vscode.fileOpen = 'vscode'
answerWrites.length = 0
const fakeService = nodeNet.createServer()
try {
  await new Promise((resolve, reject) => {
    fakeService.once('error', reject)
    fakeService.listen(8443, '127.0.0.1', resolve)
  })
} catch {
  // The port is already owned (a real code-server is running); the host reads that as
  // "up" as well, so the expectation does not change.
}
settingsUpdated('booster', { vscode: { fileOpen: 'vscode', startRequest: Date.now() + 1 } })
await waitFor(() => answerWrites.length > 0, 9000)
const startAnswer = answerWrites.at(-1)?.section?.vscode
check('a start request is answered where the browser can see it', startAnswer?.codeServer === 'have')
check('and the request is cleared so the tab stops waiting', startAnswer?.startRequest === 0)
check('and the rest of the section survives the answer', startAnswer?.fileOpen === 'vscode')
await new Promise((resolve) => fakeService.close(resolve))
process.env.LOCALAPPDATA = savedLocalAppData

nodeFs.rmSync(fakeRoot, { recursive: true, force: true })
// ------------------------------------------------------- mini React harness

/** Persistent hook cells per component identity, so refs survive re-renders. */
const hookCells = new Map()
let activeCells = null
let cursor = 0

/**
 * Render one function component with its own persistent hook cells.
 * @param {Function} type - the component.
 * @param {object} props - its props.
 * @returns {unknown} the rendered element tree.
 */
function renderComponent(type, props) {
  const previousCells = activeCells
  const previousCursor = cursor
  let cells = hookCells.get(type)
  if (cells === undefined) {
    cells = []
    hookCells.set(type, cells)
  }
  activeCells = cells
  cursor = 0
  try {
    return type(props)
  } finally {
    activeCells = previousCells
    cursor = previousCursor
  }
}

const element = (type, props) => ({ type, props, __el: true })

/** Fallback cells for a component invoked outside the harness. */
const scratchCells = []

const reactStub = {
  useState(initial) {
    const cells = activeCells ?? scratchCells
    const index = cursor++
    if (cells[index] === undefined) {
      cells[index] = { value: typeof initial === 'function' ? initial() : initial }
    }
    const cell = cells[index]
    return [
      cell.value,
      (next) => {
        cell.value = typeof next === 'function' ? next(cell.value) : next
      },
    ]
  },
  useRef(initial) {
    const cells = activeCells ?? scratchCells
    const index = cursor++
    if (cells[index] === undefined) cells[index] = { current: initial }
    return cells[index]
  },
  useEffect(effect) {
    // Effects run on every render; the persistent cells above keep them idempotent.
    cursor++
    return effect()
  },
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  createElement: (type, props, ...children) => ({ ...element(type, props), children }),
  Fragment: 'Fragment',
}

const jsxStub = { jsx: element, jsxs: element, Fragment: 'Fragment' }
const requireStub = (name) => {
  if (name === 'react') return reactStub
  if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return jsxStub
  throw new Error(`unexpected external require: ${name}`)
}

/**
 * Expand a stub element tree the way React would: invoke function components
 * (through the hook harness) and descend into children.
 * @param {unknown} node - the element tree.
 * @param {number} depth - recursion guard.
 * @returns {unknown} the expanded tree.
 */
function expand(node, depth = 0) {
  if (depth > 30 || node === null || node === undefined) return node
  if (typeof node === 'function') return expand(renderComponent(node, {}), depth + 1)
  if (Array.isArray(node)) return node.map((child) => expand(child, depth + 1))
  if (typeof node !== 'object') return node
  if (typeof node.type === 'function') return expand(renderComponent(node.type, node.props ?? {}), depth + 1)
  const props = node.props
  if (props !== undefined && props !== null && props.children !== undefined) {
    return { ...node, props: { ...props, children: expand(props.children, depth + 1) } }
  }
  return node
}

/**
 * Mount one slot component with props and expand the result.
 *
 * @param {Function} component - the registered component.
 * @param {object} [props] - the props its seat supplies.
 * @returns {unknown} the expanded element tree.
 */
function mount(component, props = {}) {
  return expand(renderComponent(component, props))
}

/**
 * Collect props from an expanded element tree.
 * @param {unknown} node - the expanded tree.
 * @param {string} key - the prop name to collect.
 * @returns {unknown[]} every value found for that prop.
 */
function collectProp(node, key) {
  const found = []
  const walk = (current) => {
    if (current === null || typeof current !== 'object') return
    if (Array.isArray(current)) {
      for (const child of current) walk(child)
      return
    }
    if (current.props !== undefined && current.props !== null) {
      if (typeof current.props[key] === 'function') found.push(current.props[key])
      walk(current.props.children)
    }
    if (current.children !== undefined) walk(current.children)
  }
  walk(node)
  return found
}

/**
 * Collect every rendered string from an expanded element tree.
 * @param {unknown} node - the expanded tree.
 * @returns {string} the concatenated text.
 */
function collectText(node) {
  let text = ''
  const walk = (current) => {
    if (current === null || current === undefined || typeof current === 'boolean') return
    if (typeof current === 'string' || typeof current === 'number') {
      text += String(current)
      return
    }
    if (Array.isArray(current)) {
      for (const child of current) walk(child)
      return
    }
    if (typeof current !== 'object') return
    if (current.children !== undefined) walk(current.children)
    if (current.props !== undefined && current.props !== null) walk(current.props.children)
  }
  walk(node)
  return text
}

/**
 * Collect any prop value (not only functions) from an expanded element tree.
 * @param {unknown} node - the expanded tree.
 * @param {string} key - the prop name to collect.
 * @returns {unknown[]} every value found for that prop.
 */
function collectValue(node, key) {
  const found = []
  const walk = (current) => {
    if (current === null || typeof current !== 'object') return
    if (Array.isArray(current)) {
      for (const child of current) walk(child)
      return
    }
    if (current.props !== undefined && current.props !== null) {
      if (current.props[key] !== undefined) found.push(current.props[key])
      walk(current.props.children)
    }
    if (current.children !== undefined) walk(current.children)
  }
  walk(node)
  return found
}

// -------------------------------------------------------------- client half

console.log('\nclient half')

let factory
const sandbox = {
  window: { __ModuleLoader__: { load: (spec) => { factory = spec.factory } } },
  console,
  document: undefined,
  setTimeout,
  clearTimeout,
  queueMicrotask,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(readFileSync(join(root, 'lib', 'client.js'), 'utf8'), sandbox, { filename: 'client.js' })
check('bundle registers a ModuleLoader factory', typeof factory === 'function')

const client = factory(requireStub)
check('exports apply()', typeof client.apply === 'function')
check('injects slots + settingsScope', Array.isArray(client.inject) && client.inject.includes('slots') && client.inject.includes('settingsScope'))
// The workbench entry point and the probe are re-exported from the bundle that
// actually ships, so they can be exercised without the page.
check(
  're-exports the workbench entry point and the code-server probe',
  typeof client.openVSCodeTab === 'function' && typeof client.resolveCodeServer === 'function',
)

const slotRegistrations = []
const disposedSlots = []
const themeWrites = []
const accentLayers = []
const sidebarToggles = []
const scopeWrites = []
const tabsRegistered = []
const openTabCalls = []
const scopeListeners = new Set()
let scopeValue

const scope = {
  getSnapshot: () => ({ value: scopeValue, revision: 1, writable: true, mode: 'host' }),
  subscribe(listener) {
    scopeListeners.add(listener)
    return () => scopeListeners.delete(listener)
  },
  set(field, value) {
    scopeWrites.push({ field, value })
    scopeValue = { ...(scopeValue ?? {}), [field]: value }
    for (const listener of [...scopeListeners]) listener()
  },
}

const optionalServices = {
  theme: {
    getTheme: () => ({ fontSize: 14, preference: 'system', active: { id: 'light' } }),
    setFontSize: (px) => themeWrites.push(px),
    setTheme: () => {},
    register: () => () => {},
    overrideTokens: (source, tokens) => {
      accentLayers.push({ source, tokens })
      return () => {}
    },
  },
  layout: { toggleSidebar: () => sidebarToggles.push(true) },
  // `locale` is deliberately absent: the fallback translator must take over.
}

// The right Sidebar publishes these through `ctx.reflect.provide`, not as
// Cordis services, so the module resolves them through the reflect face. Only a
// tab-type registry and the open-by-kind entry point remain.
const reflectServices = {
  sidebarRightTabs: {
    register: (definition) => {
      tabsRegistered.push(definition)
      return () => {}
    },
  },
  sidebarRight: {
    openTab: (kind, options) => openTabCalls.push({ kind, options }),
  },
}

const ctx = {
  get: (name) => optionalServices[name],
  reflect: { get: (name) => reflectServices[name] },
  on: () => () => {},
  effect: (callback) => callback(),
  slots: {
    inject: (_key, callback) => callback(),
    register: (options, component) => {
      const record = { options, component, disposed: false }
      slotRegistrations.push(record)
      return () => {
        record.disposed = true
        disposedSlots.push(options.name)
      }
    },
  },
  settingsScope: { bind: () => scope },
}

// The VS Code tab only frames the workbench when the service is known to answer,
// so this start point is the one where the frame is on screen.
scopeValue = {
  modules: { vscode: true, appearance: true, headerTools: true },
  vscode: { fileOpen: 'vscode', codeServer: 'have', startRequest: 0 },
}
client.apply(ctx)

const liveNames = () => slotRegistrations.filter((r) => !r.disposed).map((r) => r.options.name)
const findRegistration = (predicate) => slotRegistrations.find(predicate)
const liveRegistration = (predicate) => slotRegistrations.filter(predicate).at(-1)
const scopeTo = (vscode) => {
  scopeValue = {
    modules: { vscode: true, appearance: true, headerTools: true },
    vscode: { fileOpen: 'vscode', codeServer: 'have', startRequest: 0, ...vscode },
  }
  for (const listener of [...scopeListeners]) listener()
}

check('registers the settings page', liveNames().includes('settings.section'))
check('applies every default module', liveNames().includes('conversation.session.header.utilities'))
check('no accent layer for the default accent', accentLayers.length === 0)
check('registers the tab type the workbench needs', tabsRegistered.length === 1)
check('tab type is the plugin-owned VS Code page type', tabsRegistered[0]?.kind === 'booster-vscode')
check('tab type declares an extension-band priority', tabsRegistered[0]?.priority === 'extension')
check('tab type title is localized lazily', typeof tabsRegistered[0]?.title === 'function')

const VSCODE_TYPE = tabsRegistered[0]

const header = findRegistration((r) => r.options.name === 'conversation.session.header.utilities')
check('header component renders without throwing', (() => {
  try {
    return mount(header.component) !== null
  } catch (error) {
    console.error('   ', error.message)
    return false
  }
})())

for (const handler of collectProp(mount(header.component), 'onClick')) handler()
check('sidebar toggle reaches the layout service', sidebarToggles.length === 1)
check('reading-size stepper writes through the theme service', themeWrites.length >= 1)
check('every written size stays in 12..17', themeWrites.length > 0 && themeWrites.every((px) => Number.isInteger(px) && px >= 12 && px <= 17))

const page = findRegistration((r) => r.options.name === 'settings.section')
check('settings page renders without throwing', (() => {
  try {
    return mount(page.component) !== null
  } catch (error) {
    console.error('   ', error.message)
    return false
  }
})())

// Re-seed this component's hook cells before asserting on interactive state. The
// harness persists cells per component identity, so a later mount would otherwise
// reuse the checked value a previous run flipped inside a switch — unlike React,
// which re-reads it from props on every render.
hookCells.delete(page.component)
scopeTo({})

const switches = collectProp(mount(page.component), 'onChange')
check('settings page renders a switch per module', switches.length >= 4)

// `native` used to sit between these two, and it went away with the file router:
// "leave it to DSH" and "do nothing" were the same thing once the product took
// over previewing. Read this before the switch below turns the first module off:
// a disabled module renders no body, by design.
const optionValues = collectValue(mount(page.component), 'value')
check(
  'settings page offers every file-open target',
  ['vscode', 'off'].every((target) => optionValues.includes(target)) && !optionValues.includes('native'),
)
check(
  'every offered target has a label in the dictionary',
  ['右侧 VS Code（按需启动）', '只让 DSH 自己处理'].every((label) => collectText(mount(page.component)).includes(label)),
)

for (const handler of switches.slice(0, 1)) handler({ target: { checked: false } })
check(
  'a switch writes a modules section through the store',
  scopeWrites.some((w) => w.field === 'modules' && typeof w.value === 'object' && w.value !== null && w.value.vscode === false),
)

// Asking about code-server: the single probe a fresh install gets, and the fallback
// that keeps file writes from pointing at a service that is not there.
console.log('\ncode-server choice')

scopeTo({ codeServer: 'have' })
const controlsWithService = collectProp(mount(page.component), 'onClick').length
scopeTo({ codeServer: 'none' })
const controlsWithoutService = collectProp(mount(page.component), 'onClick').length

check(
  'the settings page states what it knows about code-server',
  collectValue(mount(page.component), 'data-booster-code-server').includes('none'),
)
check('a machine without code-server gets more controls, not fewer', controlsWithoutService > controlsWithService)

const asked = []
const answer = await client.resolveCodeServer({
  settings: { fileOpen: 'vscode', codeServer: 'unknown', startRequest: 0 },
  set: (value) => asked.push(value),
  probe: async () => false,
})
check('a fresh install without the service is answered, not guessed', answer === 'none' && asked[0]?.codeServer === 'none')
check('the probe never rewrites the target the user chose', asked[0]?.fileOpen === 'vscode')

const kept = []
const found = await client.resolveCodeServer({
  settings: { fileOpen: 'vscode', codeServer: 'unknown', startRequest: 0 },
  set: (value) => kept.push(value),
  probe: async () => true,
})
check('a machine that has the service keeps opening files in it', found === 'have' && kept[0]?.fileOpen === 'vscode')

const explicit = []
await client.resolveCodeServer({
  settings: { fileOpen: 'off', codeServer: 'unknown', startRequest: 0 },
  set: (value) => explicit.push(value),
  probe: async () => false,
})
check('an explicit target survives an absent service too', explicit[0]?.fileOpen === 'off')

// ------------------------------------------------------------ vscode module

console.log('\nvscode module')

// The settings-page block above flipped the first module switch off; restore the
// full configuration so this block exercises a live module.
scopeTo({})

const vscodeBody = liveRegistration((r) => r.options.key === VSCODE_TYPE?.id)
check('VS Code tab body is mounted in the tab seat', vscodeBody?.options.name === 'sidebar.right.pane.tab')

const vscodeFrames = collectValue(mount(vscodeBody.component, {}), 'src')
check('the VS Code tab frames the service address', vscodeFrames.includes('http://127.0.0.1:8443/'))
check('the VS Code tab address carries no folder parameter', !vscodeFrames.some((src) => String(src).includes('folder=')))

// The settings page's button is the second way in, and it must reach the Sidebar's
// open-by-kind entry point rather than hope a reply mentions a URL.
const openCallsBefore = openTabCalls.length
scopeTo({})
for (const handler of collectProp(mount(page.component), 'onClick')) handler()
check('the settings entry opens the VS Code tab by kind', openTabCalls.length > openCallsBefore && openTabCalls.at(-1)?.kind === 'booster-vscode')

// The workbench entry point is also reachable on its own, resolving the Sidebar
// service the way the module does.
const directTabs = []
client.openVSCodeTab({ get: (name) => (name === 'sidebarRight' ? { openTab: (kind) => directTabs.push(kind) } : undefined) })
check('the entry point opens the VS Code tab by kind', directTabs[0] === 'booster-vscode')

// The VS Code tab asks the host to start the service. Asking is a settings write, and
// every write re-applies this module, so it must happen once per page load — otherwise
// the tab would ask, re-apply, ask again, forever.
scopeTo({ codeServer: 'none' })
const askingTab = liveRegistration((r) => r.options.key === VSCODE_TYPE?.id)
const asksMade = () => scopeWrites.filter((w) => w.field === 'vscode' && w.value?.startRequest > 0).length
const asksBefore = asksMade()
mount(askingTab.component, {})
await waitFor(() => asksMade() > asksBefore, 2000)
check('the VS Code tab asks the host to start the service', asksMade() > asksBefore)
const writesAfterAsk = scopeWrites.length
mount(askingTab.component, {})
await new Promise((resolve) => setTimeout(resolve, 150))
check('and it asks only once per page load', scopeWrites.length === writesAfterAsk)

// The module must be disposable through its enable switch, without taking the
// other modules with it.
const disposedBefore = disposedSlots.length
scopeValue = { modules: { vscode: false, appearance: true, headerTools: true } }
for (const listener of [...scopeListeners]) listener()
check('disabling the module disposes its tab body and tab type', disposedSlots.length > disposedBefore)
check('and the other modules stay live', liveNames().includes('conversation.session.header.utilities'))

scopeValue = {
  modules: { vscode: true, appearance: true, headerTools: true },
  appearance: { accent: 'ocean', fontFamily: 'default' },
}
for (const listener of [...scopeListeners]) listener()
check('selecting an accent stacks one override layer', accentLayers.length === 1)
check('accent layer carries light+dark brand tokens', (() => {
  const brand = accentLayers[0]?.tokens?.['--dsw-alias-brand-primary']
  return typeof brand?.light === 'string' && typeof brand?.dark === 'string'
})())
check('re-enabling the module registers the tab type again', tabsRegistered.length >= 2)

// ------------------------------------------- service-acquisition regression
console.log('\nservice acquisition')

/**
 * Build a mock client context whose service surface is configurable, so the
 * acquisition paths can be exercised independently of the happy path above.
 *
 * This exists because of a real failure: `sidebarRightTabs` is published from the
 * same boot batch as this bundle, and the graph only orders a consumer after its
 * declared providers -- this package declares none, so a plain `ctx.get` can
 * legitimately return `undefined` at apply time even though the service appears
 * moments later.
 *
 * @param {{ syncTabs?: boolean, hasInject?: boolean, injectProvides?: boolean }} options
 * @returns {{ ctx: object, records: object }}
 */
function acquisitionScenario(options) {
  const records = { slots: [], tabs: [], injected: [] }
  const tabsFace = {
    register: (definition) => {
      records.tabs.push(definition)
      return () => {}
    },
  }
  const readTabs = (name) => (name === 'sidebarRightTabs' && options.syncTabs === true ? tabsFace : undefined)
  const ctx = {
    get: readTabs,
    reflect: { get: () => undefined },
    on: () => () => {},
    effect: (callback) => callback(),
    slots: {
      inject: (_key, callback) => callback(),
      register: (registration) => {
        records.slots.push(registration)
        return () => {}
      },
    },
    settingsScope: {
      bind: () => ({
        getSnapshot: () => ({ value: undefined, revision: 1, writable: true, mode: 'host' }),
        subscribe: () => () => {},
        set: () => {},
      }),
    },
  }
  if (options.hasInject !== false) {
    ctx.inject = (names, callback) => {
      records.injected.push(...names)
      if (options.injectProvides === true) {
        // The injected context declares the name, so the service is readable now
        // however the provider published it.
        callback({ sidebarRightTabs: tabsFace, get: () => undefined, reflect: { get: () => undefined } })
      }
      return () => {}
    }
  }
  return { ctx, records }
}

const late = acquisitionScenario({ syncTabs: false, hasInject: true, injectProvides: true })
client.apply(late.ctx)
check('waits for sidebarRightTabs when it is not published yet', late.records.injected.includes('sidebarRightTabs') === true)
check('registers the tab type once the service arrives', late.records.tabs.length === 1)
check(
  'registers the tab body once the service arrives',
  late.records.slots.some((r) => r.name === 'sidebar.right.pane.tab' && r.key === 'dsh-booster/vscode'),
)

const unreachable = acquisitionScenario({ syncTabs: false, hasInject: false })
client.apply(unreachable.ctx)
check(
  'reports an inspectable reason when the service is unreachable',
  unreachable.records.slots.some((r) => String(r.id).startsWith('dsh-booster-diag-')),
)
check('contributes nothing else when the service is unreachable', unreachable.records.tabs.length === 0)

const immediate = acquisitionScenario({ syncTabs: true })
client.apply(immediate.ctx)
check('still starts synchronously when the service is already up', immediate.records.tabs.length === 1)
check('does not wait when the synchronous read succeeds', immediate.records.injected.includes('sidebarRightTabs') === false)

// ------------------------------------------------------------------ verdict

console.log('')
if (failures.length > 0) {
  // Listed at the end as well as at the point of failure: the tail of a CI log is the
  // part anyone actually reads, and "1 check(s) failed" on its own answers nothing.
  console.log(`smoke: ${failures.length} check(s) failed:`)
  for (const label of failures) console.log(`  - ${label}`)
  process.exit(1)
}
console.log('smoke: all checks passed')
