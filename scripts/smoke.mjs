/**
 * Deterministic smoke test for both halves of dsh-booster.
 *
 * It runs the real build output against stub services, so it verifies behaviour
 * rather than shape: the host registers the namespace and its schema resolves
 * defaults, the client applies its modules, the module manager really tears
 * contributions down when a switch flips, and the preview watcher turns a
 * running write/edit call into a paged review tab. No GUI restart, no browser.
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
  resolved?.modules?.appearance === true && resolved?.modules?.headerTools === true && resolved?.modules?.preview === true,
)
check('schema resolves appearance defaults', resolved?.appearance?.accent === 'default' && resolved?.appearance?.fontFamily === 'default')
check('schema resolves header-tools defaults', resolved?.headerTools?.sidebarToggle === true && resolved?.headerTools?.readingSize === true)

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

const config = { preview: { linkMode: 'all', fileOpen: 'vscode' } }
let settle
host.apply({
  inject: (_names, callback) => callback({ settings: { register: () => {} } }),
  get: (name) => (name === 'settings' ? { get: () => config } : undefined),
  on: (event, listener) => {
    if (event === 'tools/result') settle = listener
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

// With the built-in preview owning file opening, the bridge stays silent.
config.preview.fileOpen = 'preview'
await writeAndSettle('write', { file_path: 'C:/work/d.ts' })
check('the preview target leaves the bridge silent', readMarker().path === 'C:/work/c.ts')

process.env.LOCALAPPDATA = savedLocalAppData
nodeFs.rmSync(bridgeRoot, { recursive: true, force: true })

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

const slotRegistrations = []
const disposedSlots = []
const themeWrites = []
const accentLayers = []
const sidebarToggles = []
const scopeWrites = []
const tabsRegistered = []
const openTabCalls = []
const openedResources = []
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
// Cordis services, so the module resolves them through the reflect face.
const reflectServices = {

  sidebarRightTabs: {
    register: (definition) => {
      tabsRegistered.push(definition)
      return () => {}
    },
  },
  sidebarRight: {
    openTab: (kind, options) => openTabCalls.push({ kind, options }),
    openResource: (address) => openedResources.push(address),
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

// These tests exercise the built-in preview path, which the ileOpen switch
// only selects when it is not scode.
scopeValue = { preview: { linkMode: 'all', fileOpen: 'preview', codeServer: 'have' } }
client.apply(ctx)

const liveNames = () => slotRegistrations.filter((r) => !r.disposed).map((r) => r.options.name)
const findRegistration = (predicate) => slotRegistrations.find(predicate)

check('registers the settings page', liveNames().includes('settings.section'))
check('applies every default module', liveNames().includes('conversation.session.header.utilities'))
check('no accent layer for the default accent', accentLayers.length === 0)
check('registers one right-Sidebar tab type per panel', tabsRegistered.length === 2)
check('tab type is a page type with a fresh kind', tabsRegistered[0]?.kind === 'booster-preview-web')
check('tab type declares an extension-band priority', tabsRegistered[0]?.priority === 'extension')
check('tab type title is localized lazily', typeof tabsRegistered[0]?.title === 'function')

const PREVIEW_KIND = tabsRegistered[0]?.kind
const PREVIEW_ID = tabsRegistered[0]?.id

// The workbench has a tab type of its own. That is what replaced "hope a reply
// mentions the URL", and the address it frames carries no `?folder=` on purpose:
// code-server persists that parameter past the page it was opened from.
const VSCODE_TYPE = tabsRegistered.find((r) => r.kind === 'booster-vscode')
check('registers a tab type for the VS Code workbench', VSCODE_TYPE !== undefined)
check('the VS Code tab title is localized lazily', typeof VSCODE_TYPE?.title === 'function')

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

const switches = collectProp(mount(page.component), 'onChange')
check('settings page renders a switch per module', switches.length >= 3)

// The three file-open behaviours and both link modes exist in the host half, so
// the page has to keep offering all of them. Read this before the switch below
// turns the first module off: a disabled module renders no body, by design.
const optionValues = collectValue(mount(page.component), 'value')
check('settings page offers every file-open target', ['vscode', 'preview', 'off'].every((target) => optionValues.includes(target)))
check('settings page offers every link mode', ['all', 'video'].every((mode) => optionValues.includes(mode)))

for (const handler of switches.slice(0, 1)) handler({ target: { checked: false } })
check('a switch writes a modules section through the store', scopeWrites.some((w) => w.field === 'modules' && typeof w.value === 'object' && w.value !== null))

// Asking about code-server: the single probe a fresh install gets, and the fallback
// that keeps file writes from pointing at a service that is not there.
console.log('\ncode-server choice')

const scopeTo = (preview) => {
  scopeValue = { modules: { preview: true, appearance: true, headerTools: true }, preview: { linkMode: 'all', ...preview } }
  for (const listener of [...scopeListeners]) listener()
}

scopeTo({ fileOpen: 'preview', codeServer: 'have' })
const controlsWithService = collectProp(mount(page.component), 'onClick').length
scopeTo({ fileOpen: 'preview', codeServer: 'none' })
const controlsWithoutService = collectProp(mount(page.component), 'onClick').length

check(
  'the settings page states what it knows about code-server',
  collectValue(mount(page.component), 'data-booster-code-server').includes('none'),
)
check('a machine without code-server gets more controls, not fewer', controlsWithoutService > controlsWithService)

const asked = []
const answer = await client.resolveCodeServer({
  settings: { linkMode: 'all', fileOpen: 'vscode', codeServer: 'unknown' },
  set: (value) => asked.push(value),
  probe: async () => false,
})
check('a fresh install without the service is answered, not guessed', answer === 'none' && asked[0]?.codeServer === 'none')
check('the probe never rewrites the target the user chose', asked[0]?.fileOpen === 'vscode')

const kept = []
const found = await client.resolveCodeServer({
  settings: { linkMode: 'all', fileOpen: 'vscode', codeServer: 'unknown' },
  set: (value) => kept.push(value),
  probe: async () => true,
})
check('a machine that has the service keeps opening files in it', found === 'have' && kept[0]?.fileOpen === 'vscode')

const explicit = []
await client.resolveCodeServer({
  settings: { linkMode: 'all', fileOpen: 'off', codeServer: 'unknown' },
  set: (value) => explicit.push(value),
  probe: async () => false,
})
check('an explicit target survives an absent service too', explicit[0]?.fileOpen === 'off')

// ----------------------------------------------------------- preview module

console.log('\npreview module')

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

/**
 * Collect the element type names present in an expanded tree.
 * @param {unknown} node - the expanded tree.
 * @returns {Set<string>} the type names.
 */
function collectTypes(node) {
  const types = new Set()
  const walk = (current) => {
    if (current === null || typeof current !== 'object') return
    if (Array.isArray(current)) {
      for (const child of current) walk(child)
      return
    }
    if (typeof current.type === 'string') types.add(current.type)
    if (current.props !== undefined && current.props !== null) walk(current.props.children)
    if (current.children !== undefined) walk(current.children)
  }
  walk(node)
  return types
}

// The settings-page block above flipped the first module switch off; restore the
// full configuration so this block exercises a live module.
scopeValue = { modules: { preview: true, appearance: true, headerTools: true }, preview: { linkMode: 'all', fileOpen: 'preview', codeServer: 'have' } }
for (const listener of [...scopeListeners]) listener()

const liveRegistration = (predicate) => slotRegistrations.filter(predicate).at(-1)
const watcher = liveRegistration((r) => r.options.id === 'dsh-booster-preview-watch')
const panelBody = liveRegistration((r) => r.options.key === PREVIEW_ID)

check('watcher is mounted in an additive session seat', watcher?.options.name === 'conversation.input.dock')
check('web panel body is mounted in the tab seat', panelBody?.options.name === 'sidebar.right.pane.tab')

const vscodeBody = liveRegistration((r) => r.options.key === VSCODE_TYPE?.id)
check('VS Code tab body is mounted in the tab seat', vscodeBody?.options.name === 'sidebar.right.pane.tab')
const vscodeFrames = collectValue(mount(vscodeBody.component, {}), 'src')
check('the VS Code tab frames the service address', vscodeFrames.includes('http://127.0.0.1:8443/'))
check('the VS Code tab address carries no folder parameter', !vscodeFrames.some((src) => String(src).includes('folder=')))

// The settings-page button and the watcher share one entry point; without it the
// workbench was reachable only through a reply that happened to mention its URL.
// `ctx.get` is the read the plugin's own service helper uses.
const vscodeTabs = []
const sidebarStub = { openTab: (kind) => vscodeTabs.push(kind), openResource: () => {} }
client.openVSCodeTab({ get: (name) => (name === 'sidebarRight' ? sidebarStub : undefined) })
check('the entry point opens the VS Code tab by kind', vscodeTabs[0] === 'booster-vscode')

/** One running write call. */
const writeCall = (callId, path, content) => ({
  callId,
  name: 'write',
  argsRaw: JSON.stringify({ file_path: path, content }),
})
/** One assistant reply carrying text that may contain links. */
const replyWith = (seq, text) => ({ kind: 'assistant', seq, blocks: [{ kind: 'text', text }] })

let chatValue = { legacy: { runningCalls: [], nodes: [] } }
const useChatStub = (selector) => selector(chatValue)
const renderWatcher = () => mount(watcher.component, { useChat: useChatStub, sessionId: 'sess-1' })
const renderBody = () => mount(panelBody.component, { sessionId: 'sess-1' })

// 1. Coding: the product's own preview is asked for the file, so this module
//    never reimplements a code view.
chatValue = { legacy: { runningCalls: [writeCall('c1', 'src/a.ts', 'const a = 1')], nodes: [] } }
renderWatcher()
check('writing a file opens the product preview for it', openedResources.length === 1)
check('the switch selects the built-in preview rather than the bridge', scopeValue.preview.fileOpen === 'preview')
check('the file address follows the session grammar', openedResources[0] === 'dsh-resource://file/session/sess-1/src/a.ts')
check('writing a file does not open the web panel', openTabCalls.length === 0)

renderWatcher()
check('re-rendering the same call does not reopen the file', openedResources.length === 1)

// A file is only complete once its call settles, so the preview is asked again.
chatValue = { legacy: { runningCalls: [], nodes: [] } }
renderWatcher()
check('a settled call reopens the file so the preview can refresh', openedResources.length === 2)

// A Windows absolute path keeps its drive segment as one encoded segment.
chatValue = { legacy: { runningCalls: [writeCall('c2', 'C:\\work\\b.ts', 'x')], nodes: [] } }
renderWatcher()
check('an absolute path encodes each segment once', openedResources[2] === 'dsh-resource://file/session/sess-1/C%3A/work/b.ts')

chatValue = { legacy: { runningCalls: [{ callId: 'c3', name: 'bash', argsRaw: '{"command":"ls"}' }], nodes: [] } }
renderWatcher()
// The settled `c2` is asked for again here, which is expected; what must not
// happen is a third target appearing for the non-file tool.
const distinctTargets = new Set(openedResources.map((address) => address.split('/').pop()))
check(
  'only files the session actually touched are ever previewed',
  distinctTargets.size === 2 && distinctTargets.has('a.ts') && distinctTargets.has('b.ts'),
)

// 2. Links: the newest link in the agent's reply opens in the web panel.
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(1, 'see https://example.com/a then https://example.com/b')] } }
renderWatcher()
check('a link in a reply opens the web panel', openTabCalls.length === 1 && openTabCalls[0]?.kind === PREVIEW_KIND)
check('the panel shows the newest link, not the first', collectValue(renderBody(), 'value').includes('https://example.com/b'))
check('the panel frames the page', collectValue(renderBody(), 'src').includes('https://example.com/b'))
check('the panel offers an outside-browser escape hatch', collectTypes(renderBody()).has('a'))

// The Sidebar service's own address is not content. It used to be followed like any
// other link, and because code-server persists the `?folder=` it was opened with, one
// documentation example turned into a permanent "Workspace does not exist" dialog.
const beforeServiceLink = openTabCalls.length
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(2, 'open http://127.0.0.1:8443/?folder=/C:/nope to get VS Code')] } }
renderWatcher()
check('the Sidebar service address is not followed as a link', openTabCalls.length === beforeServiceLink)
check('the panel keeps showing the last real link', collectValue(renderBody(), 'value').includes('https://example.com/b'))

// Regression: a frame that hides its referrer from the site gets refused by
// embedded players (YouTube reports it as error 153), and an over-tight sandbox
// breaks ordinary pages. Both were real bugs in the first version.
check(
  'the frame does not hide its referrer from the site',
  collectValue(renderBody(), 'referrerPolicy').every((value) => value !== 'no-referrer'),
)
check(
  'the frame sandbox still lets an ordinary page work',
  String(collectValue(renderBody(), 'sandbox')[0] ?? '').includes('allow-forms'),
)

// A video host is rewritten to its player URL, because its watch page refuses framing.
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(2, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')] } }
renderWatcher()
check(
  'a youtube watch link is rewritten to its embed URL',
  collectValue(renderBody(), 'src').includes('https://www.youtube.com/embed/dQw4w9WgXcQ'),
)
// Bilibili gets the same treatment, through its official embed player.
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(4, 'https://www.bilibili.com/video/BV1j8JE6PEDa/')] } }
renderWatcher()
const bilibiliFrame = String(collectValue(renderBody(), 'src')[0] ?? '')
check(
  'a bilibili watch link goes to the embed player',
  bilibiliFrame.startsWith('https://player.bilibili.com/player.html?bvid=BV1j8JE6PEDa'),
)
check('the bilibili embed pins page 1 and turns danmaku off', bilibiliFrame.includes('page=1') && bilibiliFrame.includes('danmaku=0'))
// A ~300px column is narrower than any player's lowest comfortable tier, so the
// panel needs a way to give the frame the whole screen.
check(
  'the panel header offers a fullscreen control',
  collectValue(renderBody(), 'data-booster-fullscreen').includes('true'),
)

// A direct media file plays in a media element instead of a frame.
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(3, 'https://cdn.example.com/clip.mp4')] } }
renderWatcher()
check('a direct media link renders a video element', collectTypes(renderBody()).has('video'))
check('a direct media link is not framed', !collectTypes(renderBody()).has('iframe'))

// The same link must not reopen on every re-render.
const openedBefore = openTabCalls.length
renderWatcher()
check('re-rendering does not reopen the same link', openTabCalls.length === openedBefore)

// The module must be disposable through its enable switch.
const disposedBefore = disposedSlots.length
scopeValue = { modules: { preview: false, appearance: true, headerTools: true } }
for (const listener of [...scopeListeners]) listener()
check('disabling the module disposes its tab body and watcher', disposedSlots.length > disposedBefore)

scopeValue = { modules: { preview: true, appearance: true, headerTools: true }, appearance: { accent: 'ocean' } }
for (const listener of [...scopeListeners]) listener()
check('selecting an accent stacks one override layer', accentLayers.length === 1)
check('accent layer carries light+dark brand tokens', (() => {
  const brand = accentLayers[0]?.tokens?.['--dsw-alias-brand-primary']
  return typeof brand?.light === 'string' && typeof brand?.dark === 'string'
})())
check('re-enabling the module registers the tab type again', tabsRegistered.length >= 2)

// The address field: a typed address is what the panel shows, and it is not replaced
// by whatever link happens to come next.
scopeValue = {
  modules: { preview: true, appearance: true, headerTools: true },
  preview: { linkMode: 'all', fileOpen: 'preview', codeServer: 'have', url: 'https://example.com/typed' },
}
for (const listener of [...scopeListeners]) listener()

const typedBody = liveRegistration((r) => r.options.key === PREVIEW_ID)
const typedTree = mount(typedBody.component, { sessionId: 'sess-1' })
check('a hand-typed address is what the panel loads', collectValue(typedTree, 'src').includes('https://example.com/typed'))
check('the panel offers an editable address field', collectTypes(typedTree).has('input'))

const typedWatcher = liveRegistration((r) => r.options.id === 'dsh-booster-preview-watch')
const openedBeforeTyped = openTabCalls.length
chatValue = { legacy: { runningCalls: [], nodes: [replyWith(9, 'https://example.com/ignored')] } }
mount(typedWatcher.component, { useChat: useChatStub, sessionId: 'sess-1' })
check('a typed address is not replaced by a later link', openTabCalls.length === openedBeforeTyped)

// The bridge is chosen but no service answered: a written file still has to appear
// somewhere. Re-apply with exactly that configuration and watch where it opens.
scopeValue = {
  modules: { preview: true, appearance: true, headerTools: true },
  preview: { linkMode: 'all', fileOpen: 'vscode', codeServer: 'none' },
}
for (const listener of [...scopeListeners]) listener()

const fallbackWatcher = liveRegistration((r) => r.options.id === 'dsh-booster-preview-watch')
const fallbackBefore = openedResources.length
chatValue = { legacy: { runningCalls: [{ callId: 'fb1', name: 'write', argsRaw: '{"file_path":"src/fb.ts"}' }], nodes: [] } }
mount(fallbackWatcher.component, { useChat: useChatStub, sessionId: 'sess-fb' })
check('a write still opens somewhere when the service is absent', openedResources.length === fallbackBefore + 1)
check('and it is the built-in previewer that opened it', String(openedResources.at(-1)).includes('sess-fb'))
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
check('registers the tab type once the service arrives', late.records.tabs.length === 2)
check(
  'registers the tab body once the service arrives',
  late.records.slots.some((r) => r.name === 'sidebar.right.pane.tab' && r.key === 'dsh-booster/preview-web'),
)
check(
  'registers the VS Code body once the service arrives',
  late.records.slots.some((r) => r.name === 'sidebar.right.pane.tab' && r.key === 'dsh-booster/vscode'),
)
check('registers the watcher once the service arrives', late.records.slots.some((r) => r.id === 'dsh-booster-preview-watch'))

const unreachable = acquisitionScenario({ syncTabs: false, hasInject: false })
client.apply(unreachable.ctx)
check(
  'reports an inspectable reason when the service is unreachable',
  unreachable.records.slots.some((r) => String(r.id).startsWith('dsh-booster-diag-')),
)
check('contributes nothing else when the service is unreachable', unreachable.records.tabs.length === 0)

const immediate = acquisitionScenario({ syncTabs: true })
client.apply(immediate.ctx)
check('still starts synchronously when the service is already up', immediate.records.tabs.length === 2)
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
