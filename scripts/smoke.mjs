/**
 * Deterministic smoke test for dsh-booster, as the plugin stands after the 0.1.7 rework.
 *
 * It runs the real build output (`lib/index.js`, `lib/client.js`) against stub services, so
 * it checks behaviour rather than shape: the client declares only a dependency the live
 * client catalog can supply, the host bridge drops a marker only for a settled file tool
 * when the user asked for VS Code, and the chime is a real WAV.
 *
 * The first thing this suite proves is `inject`. The previous version declared the client
 * service `settingsScope`, which 0.1.7 removed: the entry then waited for a service that
 * could never arrive, stayed pending, and the whole app refused to boot. That assertion is
 * therefore first and is meant to be loud.
 *
 * `normalizeConfig` is not re-exported from the host entry, so its coercion rules are read
 * from `src/config.ts` directly (Node strips the types; the file is side-effect free). The
 * built `Config` schema is cross-checked against `DEFAULT_CONFIG` from the same file, which
 * is what catches a `lib/` that has fallen behind `src/`.
 *
 * Run with: node scripts/smoke.mjs   (or: npm run smoke)
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
let passed = 0

/**
 * Assert one expectation.
 * @param {string} label - what is being checked.
 * @param {unknown} condition - truthy when the expectation holds.
 */
function check(label, condition) {
  if (condition) {
    passed += 1
    console.log(`  ok   ${label}`)
  } else {
    console.log(`  FAIL ${label}`)
    failures.push(label)
  }
}

/**
 * Print a section banner.
 * @param {string} title - the section name.
 */
function banner(title) {
  console.log(`\n${title}`)
}

/**
 * Wait for a fixed time, using real timers.
 * @param {number} ms - how long.
 * @returns {Promise<void>} resolved after the delay.
 */
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Give every pending microtask a chance to run.
 * @returns {Promise<void>} resolved once the queue has drained.
 */
function flush() {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

/**
 * Poll until a predicate holds.
 * @param {() => unknown} predicate - the condition.
 * @param {number} [timeoutMs] - how long to keep asking.
 * @returns {Promise<boolean>} whether it held in time.
 */
async function waitFor(predicate, timeoutMs = 2500) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      if (predicate()) return true
    } catch {
      // Not readable yet; keep asking until the budget runs out.
    }
    if (Date.now() >= deadline) return false
    await delay(25)
  }
}

/**
 * Compare two values by their JSON shape.
 * @param {unknown} a - one value.
 * @param {unknown} b - the other.
 * @returns {boolean} whether they serialise identically.
 */
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// ------------------------------------------------------- mini React harness

/** Persistent hook cells per component identity, so state survives a re-render. */
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
const cleanups = []

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
    const cleanup = effect()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
    return cleanup
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
 * Expand a stub element tree the way React would: invoke function components (through the
 * hook harness) and descend into children.
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
 * Mount one component with props and expand the result.
 * @param {Function} component - the component to mount.
 * @param {object} [props] - the props its seat supplies.
 * @returns {unknown} the expanded element tree.
 */
function mount(component, props = {}) {
  return expand(renderComponent(component, props))
}

/**
 * Mount a component, let its effects settle, and mount it again — which is what a real
 * React tree would do when an effect updates state.
 * @param {Function} component - the component to mount.
 * @param {object} [props] - the props its seat supplies.
 * @returns {Promise<unknown>} the second render's expanded tree.
 */
async function mountTwice(component, props = {}) {
  mount(component, props)
  await flush()
  return mount(component, props)
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

/** Run every effect cleanup collected so far. */
function runCleanups() {
  for (const cleanup of cleanups.splice(0)) {
    try {
      cleanup()
    } catch {
      // A cleanup that throws is not what this suite is about.
    }
  }
}

// -------------------------------------------------------------- client half

/**
 * Every service the live DSH 0.1.7 client catalog lists. A client entry may only *declare*
 * a hard dependency taken from here — anything else can leave the entry pending forever,
 * which stops the whole app from booting.
 */
const CLIENT_CATALOG = new Set([
  'layout',
  'locale',
  'sessions',
  'slots',
  'theme',
  'timer',
  'uiWorkspace',
  'workspaces',
  'remote',
  'configForms',
  'sidebarRightTabs',
  'commandUi',
  'shortcuts',
])

/**
 * Evaluate the built client bundle in a fresh sandbox.
 *
 * Fresh per scenario on purpose: the bundle keeps module-level state (the once-per-page-load
 * probe and the once-per-page-load start request), and a scenario must not inherit it.
 *
 * @returns {{ id: unknown, module: object, logs: string[] }} the loader id, the module
 *   exports, and anything the bundle logged.
 */
function loadClient() {
  let registration
  const logs = []
  const sandbox = {
    console: {
      error: (...args) => logs.push(args.map(String).join(' ')),
      warn: (...args) => logs.push(args.map(String).join(' ')),
      log: (...args) => logs.push(args.map(String).join(' ')),
    },
    document: undefined,
    // Nothing is listening on the loopback port in a smoke run.
    fetch: () => Promise.reject(new Error('no service on this host')),
    setTimeout: () => 0,
    clearTimeout: () => {},
    queueMicrotask,
  }
  sandbox.window = { __ModuleLoader__: { load: (spec) => { registration = spec } } }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(readFileSync(join(root, 'lib', 'client.js'), 'utf8'), sandbox, { filename: 'lib/client.js' })
  const loaded = typeof registration?.factory === 'function' ? registration.factory(requireStub) : undefined
  return { id: registration?.id, module: loaded, logs }
}

/**
 * Build a stub client context that records what a plugin contributes.
 * @param {object} [options] - `tabs` (false to leave the registry unpublished) and
 *   `inject` (false to leave the context without a way to wait).
 * @returns {object} the context and the record of everything it saw.
 */
function makeClientContext(options = {}) {
  const withTabs = options.tabs !== false
  const withInject = options.inject !== false
  const records = {
    tabTypes: [],
    slotRegistrations: [],
    slotInjects: [],
    injected: [],
    injectCallbacks: [],
    effects: [],
    configFormGets: [],
    startRequests: [],
  }

  const ctx = {
    slots: {
      register(registration, component) {
        records.slotRegistrations.push({ registration, component })
        return () => {}
      },
      inject(key, callback) {
        records.slotInjects.push(key)
        return callback()
      },
    },
    effect(callback, label) {
      records.effects.push(label)
      return callback()
    },
  }

  if (withTabs) {
    ctx.sidebarRightTabs = {
      register(definition) {
        records.tabTypes.push(definition)
        return () => {}
      },
    }
  }
  if (withInject) {
    ctx.inject = (names, callback) => {
      records.injected.push(names)
      records.injectCallbacks.push(callback)
      return () => {}
    }
  }
  return { ctx, records }
}

banner('client half — what the entry declares (proven first, on purpose)')

console.log('  A client entry that declares a service the live catalog cannot supply stays')
console.log('  pending forever, and a pending entry stops DSH from booting. This is the exact')
console.log('  regression that took the app down after 0.1.7 removed `settingsScope`.')

const first = loadClient()
const declaredInject = first.module?.inject
const injectIsExact =
  Array.isArray(declaredInject) && declaredInject.length === 1 && declaredInject[0] === 'slots'
if (!injectIsExact) {
  console.log(`  !! declared inject: ${JSON.stringify(declaredInject)}`)
  console.log('  !! expected exactly ["slots"] — every other name must go through optional access.')
}
check("inject is exactly ['slots'], the one dependency the entry cannot work without", injectIsExact)
check(
  'every declared dependency exists in the live 0.1.7 client catalog',
  Array.isArray(declaredInject) && declaredInject.every((name) => CLIENT_CATALOG.has(name)),
)
check('the bundle hands the loader a factory for id "dsh-booster"', first.id === 'dsh-booster')
check(
  'the module exports are exactly apply, inject and name',
  first.module !== undefined && Object.keys(first.module).sort().join(',') === 'apply,inject,name',
)
runCleanups()

banner('client half — the one contribution: the right Sidebar\'s VS Code tab')

const tabbed = makeClientContext()
const tabbedClient = loadClient()
let tabbedError
try {
  tabbedClient.module.apply(tabbed.ctx)
} catch (error) {
  tabbedError = error
}

check('apply() runs without throwing', tabbedError === undefined)
check('apply() swallowed nothing on the way: it logged no error', tabbedClient.logs.length === 0)
check('registers exactly one tab type', tabbed.records.tabTypes.length === 1)
check('the tab type kind is "booster-vscode"', tabbed.records.tabTypes[0]?.kind === 'booster-vscode')
check('the tab type id is "dsh-booster/vscode"', tabbed.records.tabTypes[0]?.id === 'dsh-booster/vscode')
check('the tab type claims the extension band', tabbed.records.tabTypes[0]?.priority === 'extension')
check(
  'the tab type localises its title lazily',
  typeof tabbed.records.tabTypes[0]?.title === 'function' && tabbed.records.tabTypes[0].title() === 'VS Code',
)
check('registers exactly one slot body', tabbed.records.slotRegistrations.length === 1)
check(
  'the body lands in the sidebar.right.pane.tab slot under the tab type id',
  same(tabbed.records.slotInjects, ['sidebar.right.pane.tab']) &&
    tabbed.records.slotRegistrations[0]?.registration?.name === 'sidebar.right.pane.tab' &&
    tabbed.records.slotRegistrations[0]?.registration?.key === 'dsh-booster/vscode',
)
check('the slot body is a component', typeof tabbed.records.slotRegistrations[0]?.component === 'function')
runCleanups()

banner('client half — a composition without the tab registry must not throw')

const waiting = makeClientContext({ tabs: false })
let waitingError
try {
  loadClient().module.apply(waiting.ctx)
} catch (error) {
  waitingError = error
}
check('apply() survives a missing sidebarRightTabs registry', waitingError === undefined)
check(
  'it waits for the service through ctx.inject(["sidebarRightTabs"], …)',
  same(waiting.records.injected, [['sidebarRightTabs']]),
)
check('it contributes nothing until the service arrives', waiting.records.tabTypes.length === 0)

const lateTabs = []
waiting.records.injectCallbacks[0]?.({ sidebarRightTabs: { register: (definition) => lateTabs.push(definition) } })
check('and it registers the tab type as soon as the service is published', lateTabs.length === 1)
check('the late tab type is the same one', lateTabs[0]?.kind === 'booster-vscode' && lateTabs[0]?.id === 'dsh-booster/vscode')
runCleanups()

banner('client half — the panel renders its empty state')

// No config-face checks here on purpose: the "ask the host to start it" path was removed,
// because the host event that would carry the request (`settings/updated`) does not exist
// in 0.1.7's event catalog. The panel no longer touches `configForms` at all.
const plain = makeClientContext()
const plainClient = loadClient()
plainClient.module.apply(plain.ctx)
const plainBody = plain.records.slotRegistrations[0]?.component
const plainText = collectText(await mountTwice(plainBody))
check('the tab body renders its empty state', plainText.length > 0)
check('and it says on screen that the service is not running', plainText.includes('服务没在运行'))
check('the empty state offers the commands', plainText.includes('查看命令'))
runCleanups()

// ---------------------------------------------------------------- host half

banner('host half — the durable configuration')

const host = await import(new URL('../lib/index.js', import.meta.url).href)
check('exports name "dsh-booster"', host.name === 'dsh-booster')
check('exports apply()', typeof host.apply === 'function')
check('exports Config, the schema the plugin manager renders', typeof host.Config === 'function')

const source = await import(new URL('../src/config.ts', import.meta.url).href)
const resolved = host.Config({})
check(
  'an empty config resolves every default',
  resolved?.fileOpen === 'vscode' &&
    resolved?.chime === true &&
    resolved?.chimeMinSeconds === 3 &&
    resolved?.chimeOnError === true,
)
check('the resolved defaults are the source of truth', same(resolved, source.DEFAULT_CONFIG))

const normalize = typeof source.normalizeConfig === 'function' ? source.normalizeConfig : () => undefined
check('normalizeConfig coerces an unknown file-open target to "vscode"', normalize({ fileOpen: 'nope' })?.fileOpen === 'vscode')
check('normalizeConfig keeps "off"', normalize({ fileOpen: 'off' })?.fileOpen === 'off')
check(
  'normalizeConfig falls back when the minimum turn length is not one of the offered values',
  normalize({ chimeMinSeconds: 7 })?.chimeMinSeconds === 3 && normalize({ chimeMinSeconds: 10 })?.chimeMinSeconds === 10,
)
check('normalizeConfig keeps chime:false switched off', normalize({ chime: false })?.chime === false)
check('normalizeConfig keeps chimeOnError:false switched off', normalize({ chimeOnError: false })?.chimeOnError === false)
check(
  'normalizeConfig treats junk input as an empty config',
  same(normalize(undefined), source.DEFAULT_CONFIG) && same(normalize('not an object'), source.DEFAULT_CONFIG),
)

banner('host half — the file-open bridge')

// LOCALAPPDATA is both the bridge root and the root code-server is looked for under, so
// pointing it at a scratch directory keeps the marker inside the temp directory *and*
// makes ensureService() find no launcher: a smoke run must never start a real service.
const bridgeRoot = mkdtempSync(join(tmpdir(), 'dsh-booster-smoke-'))
const savedLocalAppData = process.env.LOCALAPPDATA
process.env.LOCALAPPDATA = bridgeRoot
const marker = join(bridgeRoot, 'code-server', 'bridge', 'open-request.json')
const temporary = `${marker}.tmp`
const readMarker = () => JSON.parse(readFileSync(marker, 'utf8'))

/**
 * Build a stub host context that records the events the plugin subscribed to.
 * @returns {{ ctx: object, fire: (event: string, ...args: unknown[]) => void, events: Set<string> }}
 *   the context, a way to fire an event, and the set of subscribed event names.
 */
function makeHostContext() {
  const listeners = new Map()
  const events = new Set()
  return {
    events,
    ctx: {
      get: () => undefined,
      on(event, listener) {
        events.add(event)
        const list = listeners.get(event) ?? []
        list.push(listener)
        listeners.set(event, list)
        return () => {}
      },
    },
    fire(event, ...args) {
      for (const listener of listeners.get(event) ?? []) listener(...args)
    },
  }
}

const bridge = makeHostContext()
host.apply(bridge.ctx, { fileOpen: 'vscode' })

check('the host subscribes to settled tool results', bridge.events.has('tools/result'))
check('the host subscribes to a turn ending and to a failure', bridge.events.has('agent/status') && bridge.events.has('agent/error'))

bridge.fire('tools/result', { name: 'write', arguments: { file_path: 'C:/work/a.ts' } }, { isError: false })
check('a settled write drops a bridge request naming that file', await waitFor(() => existsSync(marker) && readMarker().path === 'C:/work/a.ts'))
check('the request is stamped for ordering', typeof readMarker().at === 'number')
check('the marker is written atomically, with no temp file left behind', !existsSync(temporary))

rmSync(marker, { force: true })
bridge.fire('tools/result', { name: 'write', arguments: { file_path: 'C:/work/a.ts' } }, { isError: true })
await delay(250)
check('an errored result drops no request', !existsSync(marker))

bridge.fire('tools/result', { name: 'bash', arguments: { file_path: 'C:/work/b.ts' } }, { isError: false })
await delay(250)
check('a tool that does not name a file drops no request', !existsSync(marker))

bridge.fire('tools/result', { name: 'edit', arguments: { file_path: 'C:/work/c.ts' } }, { isError: false })
check('a settled edit drops one too', await waitFor(() => existsSync(marker) && readMarker().path === 'C:/work/c.ts'))

const offBridge = makeHostContext()
host.apply(offBridge.ctx, { fileOpen: 'off' })
rmSync(marker, { force: true })
offBridge.fire('tools/result', { name: 'write', arguments: { file_path: 'C:/work/d.ts' } }, { isError: false })
await delay(250)
check('fileOpen "off" leaves the bridge silent', !existsSync(marker))

const junkBridge = makeHostContext()
host.apply(junkBridge.ctx, { fileOpen: 'nonsense' })
junkBridge.fire('tools/result', { name: 'write', arguments: { file_path: 'C:/work/e.ts' } }, { isError: false })
check(
  'a junk file-open target is coerced to "vscode" at runtime, not trusted',
  await waitFor(() => existsSync(marker) && readMarker().path === 'C:/work/e.ts'),
)

process.env.LOCALAPPDATA = savedLocalAppData
rmSync(bridgeRoot, { recursive: true, force: true })

banner('chime — a real WAV, rendered deterministically')

const done = host.renderChime('done')
const error = host.renderChime('error')
check('the chime is a RIFF/WAVE file', done.subarray(0, 4).toString('latin1') === 'RIFF' && done.subarray(8, 12).toString('latin1') === 'WAVE')
check(
  'it is mono 16-bit PCM at 44.1 kHz',
  done.readUInt16LE(20) === 1 &&
    done.readUInt16LE(22) === 1 &&
    done.readUInt32LE(24) === 44100 &&
    done.readUInt16LE(34) === 16 &&
    done.subarray(36, 40).toString('latin1') === 'data',
)
check(
  'its declared lengths match its bytes',
  done.readUInt32LE(4) === done.length - 8 && done.readUInt32LE(40) === done.length - 44,
)
check('rendering is deterministic', host.renderChime('done').equals(done))
check('the falling chime is its own sound', !done.equals(error) && error.readUInt32LE(40) === error.length - 44)
check(
  'the cache path lives under the OS temp directory',
  host.chimeCachePath('done').startsWith(tmpdir() + sep),
)
check('the cache path is versioned, so a stale render is never reused', /dsh-booster-chime-v\d+-done\.wav$/.test(host.chimeCachePath('done')))
check('a short turn stays silent', host.shouldChime({ enabled: true, elapsedMs: 1200, minSeconds: 3, erroredAgoMs: Infinity }) === false)
check('a switched-off chime never fires', host.shouldChime({ enabled: false, elapsedMs: 60000, minSeconds: 0, erroredAgoMs: Infinity }) === false)
check(
  'a turn that just failed does not chime again on its way out',
  host.shouldChime({ enabled: true, elapsedMs: 9000, minSeconds: 3, erroredAgoMs: 800 }) === false,
)
check('a long clean turn chimes', host.shouldChime({ enabled: true, elapsedMs: 9000, minSeconds: 3, erroredAgoMs: Infinity }) === true)

// ------------------------------------------------------------------ verdict

banner('verdict')
const total = passed + failures.length
if (failures.length === 0) {
  console.log(`\nall ${total} checks passed`)
} else {
  console.log(`\n${failures.length} of ${total} checks FAILED:`)
  for (const label of failures) console.log(`  - ${label}`)
}
process.exitCode = failures.length === 0 ? 0 : 1
