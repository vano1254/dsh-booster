/**
 * Pre-publish audit: what would leave this machine, and does any of it identify it?
 *
 * Publishing is one-way. Once a commit is public, the identity baked into it and the
 * paths baked into the files are public forever, including in every fork. So this runs
 * before a push and answers three questions with evidence:
 *
 *   1. Does anything in the tree identify this machine (user name, home path, host
 *      name), or carry a credential?
 *   2. Which files would actually be published?
 *   3. Is the Git identity that will be stamped into the commit an anonymised one?
 *
 * It deliberately reads the *local* user name, home directory and host name instead of
 * a hard-coded list, so it protects whoever runs it, not just the machine it was
 * written on. Patterns for secrets are assembled from fragments so this file cannot
 * match itself.
 *
 *   npm run audit          # report, exit 1 on anything that must be fixed
 *
 * @module dsh-booster/scripts/audit
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir, hostname, userInfo } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, relative, sep } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Directories that are never part of the published source. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.cache'])

/** Extensions worth scanning as text. Everything else is treated as opaque. */
const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.jsonl', '.yml', '.yaml',
  '.md', '.txt', '.ps1', '.psm1', '.cmd', '.bat', '.sh', '.css', '.html', '.map',
])

/** Addresses that are meant to appear in public documentation. */
const ALLOWED_EMAILS = /(?:users\.noreply\.github\.com|example\.(?:com|org)|localhost)$/i

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One finding: where, what kind, and whether it blocks a push. */
const findings = []
const note = (file, line, kind, severity, sample) => findings.push({ file, line, kind, severity, sample })

const user = userInfo().username
const home = homedir()
const host = hostname()

/**
 * Every rule, with the severity that decides whether the run fails.
 *
 * `fail` = must not be published. `warn` = a human should look at it once.
 */
const rules = [
  { kind: 'machine user name', severity: 'fail', re: user.length >= 3 ? new RegExp(escape(user), 'g') : null },
  { kind: 'home directory path', severity: 'fail', re: home.length >= 6 ? new RegExp(escape(home).replace(/\\\\/g, '[\\\\/]'), 'gi') : null },
  { kind: 'host name', severity: 'fail', re: host.length >= 3 ? new RegExp(escape(host), 'gi') : null },
  { kind: 'absolute user path', severity: 'warn', re: /[A-Za-z]:[\\/]Users[\\/][^\\/\s"']+/g },
  // Fragments on purpose: a literal `api_key` here would make this file its own finding.
  { kind: 'credential-looking assignment', severity: 'warn', re: new RegExp('(?:api' + '[_\\-]?key|secret|passw|bearer|token)\\s*[:=]\\s*["\']?[A-Za-z0-9_\\-]{12,}', 'gi') },
  { kind: 'private key block', severity: 'fail', re: new RegExp('BEGIN (?:RSA |EC |OPENSSH )?' + 'PRIVATE KEY', 'g') },
  { kind: 'personal email', severity: 'warn', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
].filter((rule) => rule.re !== null)

/**
 * Walk the tree, skipping the directories that are never published.
 *
 * @param {string} dir - directory to walk.
 * @param {string[]} [out] - accumulator.
 * @returns {string[]} absolute file paths.
 */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(join(dir, entry.name), out)
    } else if (entry.isFile()) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

const files = walk(root)

// ---------------------------------------------------------------- scan contents
for (const file of files) {
  const rel = relative(root, file)
  if (rel.split(sep).includes('node_modules')) continue
  if (!TEXT_EXT.has(extname(file).toLowerCase())) continue
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  const lines = text.split(/\r?\n/)
  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      rule.re.lastIndex = 0
      const match = rule.re.exec(lines[i])
      if (match === null) continue
      if (rule.kind === 'personal email' && ALLOWED_EMAILS.test(match[0])) continue
      note(rel, i + 1, rule.kind, rule.severity, match[0])
      break // one report per rule per file is enough to act on
    }
  }
}

// ------------------------------------------------------------ what would publish
let published
try {
  published = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
} catch {
  published = files.map((f) => relative(root, f))
}

const untracked = (() => {
  try {
    return execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
})()

// ------------------------------------------------------------------- git identity
let identity
try {
  identity = {
    name: execFileSync('git', ['config', '--local', 'user.name'], { cwd: root, encoding: 'utf8' }).trim(),
    email: execFileSync('git', ['config', '--local', 'user.email'], { cwd: root, encoding: 'utf8' }).trim(),
  }
} catch {
  identity = undefined
}

const identityAnon = identity !== undefined && /noreply|no-?reply/i.test(identity.email)

// -------------------------------------------------------------------------- report
const fails = findings.filter((f) => f.severity === 'fail')
const warns = findings.filter((f) => f.severity === 'warn')

console.log(`audit: ${files.length} files scanned under ${root}`)
console.log(`audit: ${published.length} files would be published`)

if (findings.length === 0) console.log('audit: no identifying content or credentials found')
for (const f of fails) console.log(`  FAIL  ${f.file}:${f.line}  ${f.kind}  ->  ${f.sample}`)
for (const f of warns) console.log(`  warn  ${f.file}:${f.line}  ${f.kind}  ->  ${f.sample}`)

if (untracked.length > 0) {
  console.log(`audit: ${untracked.length} file(s) present but not tracked (would NOT publish): ${untracked.slice(0, 5).join(', ')}`)
}

if (identity === undefined) {
  console.log('  warn  no local git identity: a commit would be refused or use your global one')
} else if (identityAnon) {
  console.log(`audit: commit identity is anonymised (${identity.name} <${identity.email}>)`)
} else {
  console.log(`  warn  commit identity looks personal: ${identity.name} <${identity.email}>`)
  console.log('        fix with: git config --local user.email "<id>+<user>@users.noreply.github.com"')
}

console.log('audit: files that would publish include:')
for (const p of published.slice(0, 8)) console.log(`  ${p}`)
if (published.length > 8) console.log(`  ... and ${published.length - 8} more`)

if (fails.length > 0) {
  console.log(`\naudit: ${fails.length} blocking finding(s); do not publish until they are gone`)
  process.exit(1)
}
console.log('\naudit: ok — nothing blocking')
