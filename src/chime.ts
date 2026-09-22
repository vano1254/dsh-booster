/**
 * The completion chime: synthesised here, not sampled.
 *
 * Shipping a recording would mean shipping someone's asset, so the chime is computed
 * instead: a felt-piano voice (partials sit slightly above n×f0 because real strings
 * are stiff, and the higher ones fade first) over a low two-note bed. The result is
 * rendered once, cached as a WAV under the temp directory, and played by the platform's
 * own player.
 *
 * The sounds were tuned by ear against the alternative of an actual sample: everything
 * sits at or below C5, because anything higher reads as shrill next to a quiet desktop.
 *
 * @module dsh-booster/chime
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Which chime to play. */
export type ChimeSound = 'done' | 'error'

/** One partial: its frequency ratio, its level, and how much faster it decays. */
type Partial = readonly [ratio: number, level: number, decayScale: number]

/** Mono, 16-bit, and high enough that the felt-piano partials are clean. */
const SAMPLE_RATE = 44100

const TAU = Math.PI * 2

/** Bump this when the synthesis changes, so a stale cached WAV is not reused. */
const CACHE_VERSION = 'v1'

/** A struck, felt-piano-like voice. */
const MAX_PARTIAL = 7
const BRIGHTNESS = 2
const PARTIAL_SPREAD = 0.5
const INHARMONICITY = 0.0004

/**
 * Build the partial table for a piano-like voice.
 *
 * @param maxPartial - how many partials to include.
 * @returns one entry per partial.
 */
function feltPartials(maxPartial = MAX_PARTIAL): Partial[] {
  const out: Partial[] = []
  for (let n = 1; n <= maxPartial; n++) {
    const ratio = n * Math.sqrt(1 + INHARMONICITY * n * n)
    // A felt piano is defined by damped upper partials more than by anything else.
    const level = (1 / n ** BRIGHTNESS) * (n > 2 ? 0.15 : 1)
    out.push([ratio, level, 1 + (n - 1) * PARTIAL_SPREAD])
  }
  return out
}

/** Options of one struck tone. */
interface StrikeOptions {
  /** How long the tone rings, in seconds. */
  seconds: number
  /** Peak level of the tone. */
  level: number
  /** Exponential decay rate; larger is shorter. */
  decay?: number
  /** Attack time in seconds; this is what keeps the note from clicking. */
  attack?: number
  /** A second layer this far sharp, which is the beating of a note's twin strings. */
  detune?: number
  /** Final/initial frequency ratio, for a sliding note. */
  glide?: number
}

/**
 * Render one struck tone.
 *
 * @param freq - fundamental frequency.
 * @param options - length, level and voicing.
 * @returns the samples.
 */
function strike(freq: number, options: StrikeOptions): Float32Array {
  const { seconds, level, decay = 1.6, attack = 0.012, detune = 0.0014, glide = 1 } = options
  const partials = feltPartials()
  const length = Math.round(SAMPLE_RATE * seconds)
  const out = new Float32Array(length)
  const layers = detune > 0 ? [1, 1 + detune] : [1]
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    const swept = freq * (1 + (glide - 1) * (t / seconds))
    let sum = 0
    for (const layer of layers) {
      for (const [ratio, partialLevel, decayScale] of partials) {
        sum +=
          (partialLevel / layers.length) *
          Math.sin(TAU * swept * layer * ratio * t) *
          Math.exp(-decay * decayScale * (t / seconds))
      }
    }
    out[i] = sum * Math.min(1, t / attack) * level
  }
  return out
}

/**
 * Sum segments that start at different times.
 *
 * @param parts - one `[samples, offsetSeconds]` pair per voice.
 * @returns the mixed samples.
 */
function mix(parts: ReadonlyArray<readonly [Float32Array, number]>): Float32Array {
  const frames = Math.max(...parts.map(([samples, at]) => samples.length + Math.round(SAMPLE_RATE * at)))
  const out = new Float32Array(frames)
  for (const [samples, at] of parts) {
    const offset = Math.round(SAMPLE_RATE * at)
    for (let i = 0; i < samples.length; i++) out[i + offset] += samples[i]
  }
  return out
}

/**
 * Soften the top end. This is the difference between "warm" and "shrill" here.
 *
 * @param samples - the samples, modified in place.
 * @param alpha - one-pole coefficient; smaller is darker.
 * @param wet - how much of the filtered signal to keep.
 * @returns the same array.
 */
function damp(samples: Float32Array, alpha = 0.22, wet = 0.7): Float32Array {
  let y = 0
  for (let i = 0; i < samples.length; i++) {
    y += alpha * (samples[i] - y)
    samples[i] = (1 - wet) * samples[i] + wet * y
  }
  return samples
}

/**
 * A cheap multi-tap room.
 *
 * @param samples - the dry samples.
 * @returns the samples with two quiet reflections and a longer tail.
 */
function room(samples: Float32Array): Float32Array {
  const taps: ReadonlyArray<readonly [number, number]> = [
    [0.031, 0.2],
    [0.067, 0.12],
  ]
  const out = new Float32Array(samples.length + Math.round(SAMPLE_RATE * 0.42))
  out.set(samples)
  for (const [delay, gain] of taps) {
    const offset = Math.round(SAMPLE_RATE * delay)
    for (let i = 0; i < samples.length; i++) out[i + offset] += samples[i] * gain
  }
  return damp(out)
}

/**
 * Scale to a fixed peak, so the two chimes match each other and never clip.
 *
 * @param samples - the samples, modified in place.
 * @param peak - the target peak.
 * @returns the same array.
 */
function normalize(samples: Float32Array, peak = 0.6): Float32Array {
  let max = 0
  for (const value of samples) max = Math.max(max, Math.abs(value))
  if (max === 0) return samples
  const gain = peak / max
  for (let i = 0; i < samples.length; i++) samples[i] *= gain
  return samples
}

/**
 * Wrap samples as a mono 16-bit PCM WAV file.
 *
 * @param samples - the samples to wrap.
 * @returns the file contents.
 */
function toWav(samples: Float32Array): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)))
    buffer.writeInt16LE(clamped, 44 + i * 2)
  }
  return buffer
}

/** The low bed both chimes start from: F3 and C4 struck together. */
function bed(): ReadonlyArray<readonly [Float32Array, number]> {
  return [
    [strike(174.61, { seconds: 1.8, level: 0.34, decay: 1.5, attack: 0.01 }), 0],
    [strike(261.63, { seconds: 1.6, level: 0.22, decay: 1.6, attack: 0.014 }), 0],
  ]
}

/**
 * Render one chime.
 *
 * `done` lifts twice (G4 then C5), which reads as an ending; `error` falls instead
 * (G4 then down to C4), the same voice with the opposite gesture.
 *
 * @param sound - which chime.
 * @returns the WAV file contents.
 */
export function renderChime(sound: ChimeSound): Buffer {
  const lift = sound === 'done'
    ? ([
        [strike(392.0, { seconds: 1.4, level: 0.13, decay: 1.6, attack: 0.012 }), 0.16],
        [strike(523.25, { seconds: 1.4, level: 0.1, decay: 1.6, attack: 0.014 }), 0.34],
      ] as const)
    : ([
        [strike(392.0, { seconds: 1.3, level: 0.12, decay: 1.7, attack: 0.012 }), 0.16],
        [strike(261.63, { seconds: 1.6, level: 0.1, decay: 1.5, attack: 0.016 }), 0.36],
      ] as const)
  return toWav(normalize(room(mix([...bed(), ...lift]))))
}

/** How long after a failure the completion chime stays quiet. */
const ERROR_QUIET_MS = 4000

/**
 * Decide whether a finished turn deserves a sound.
 *
 * Kept pure so the rule can be tested without playing anything: a one-line answer must
 * stay silent, a switch that is off must stay silent, and a turn that already chimed
 * because it failed must not chimed again on its way out.
 *
 * @param input - the switch, the turn's length, the configured minimum, and how long
 *   ago an error chimed.
 * @returns true when the completion chime should play.
 */
export function shouldChime(input: {
  enabled: boolean
  elapsedMs: number
  minSeconds: number
  erroredAgoMs: number
}): boolean {
  if (!input.enabled) return false
  if (input.elapsedMs / 1000 < input.minSeconds) return false
  return input.erroredAgoMs >= ERROR_QUIET_MS
}

/**
 * Where the rendered file lives.
 *
 * Rendering is deterministic, so one file per sound is enough and the second chime of
 * the day costs nothing.
 *
 * @param sound - which chime.
 * @returns an absolute path under the temp directory.
 */
export function chimeCachePath(sound: ChimeSound): string {
  return join(tmpdir(), `dsh-booster-chime-${CACHE_VERSION}-${sound}.wav`)
}

/**
 * The command that plays a WAV on this platform.
 *
 * @param file - the WAV file.
 * @returns the executable and its arguments.
 */
function playerFor(file: string): { command: string; args: string[] } {
  if (process.platform === 'darwin') return { command: 'afplay', args: [file] }
  if (process.platform === 'win32') {
    // PlaySync waits for the sound, which is why the process lives for its length;
    // Play() would let the process exit and cut the tail off.
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', `(New-Object System.Media.SoundPlayer '${file}').PlaySync()`],
    }
  }
  return { command: 'paplay', args: [file] }
}

/**
 * Play one chime, rendering and caching it first.
 *
 * Never throws: a missing player, a locked temp file or a silent machine must not
 * disturb a finished turn.
 *
 * @param sound - which chime.
 */
export async function playChime(sound: ChimeSound): Promise<void> {
  try {
    const file = chimeCachePath(sound)
    if (!existsSync(file)) await writeFile(file, renderChime(sound))
    const { command, args } = playerFor(file)
    const child = spawn(command, args, { stdio: 'ignore' })
    // The lesson from the service launcher: an unhandled 'error' event on a missing
    // binary is an uncaught exception, i.e. a dead host process.
    child.on('error', (error) => {
      console.error('[dsh-booster] playing the chime failed:', error)
    })
    child.unref()
  } catch (error) {
    console.error('[dsh-booster] rendering the chime failed:', error)
  }
}
