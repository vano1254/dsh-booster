// src/index.ts
import { mkdir, rename, writeFile as writeFile2 } from "node:fs/promises";
import { dirname } from "node:path";

// src/bridge.ts
import { join } from "node:path";
var BRIDGE_DIRECTORY = "code-server/bridge";
var BRIDGE_FILE = "open-request.json";
function markerPath(env = process.env) {
  const root = env.LOCALAPPDATA ?? env.HOME ?? "";
  return join(root, ...BRIDGE_DIRECTORY.split("/"), BRIDGE_FILE);
}

// src/service.ts
import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join as join2 } from "node:path";
import net from "node:net";
var SERVICE_PORT = 8443;
var SERVICE_ARGS = [
  "--auth",
  "none",
  "--bind-addr",
  `127.0.0.1:${SERVICE_PORT}`,
  "--locale",
  "zh-cn",
  "--disable-telemetry",
  "--disable-update-check",
  "--disable-workspace-trust"
];
var RETRY_MS = 6e4;
var lastAttempt = 0;
function isListening(port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
async function findLauncher(env = process.env) {
  const root = join2(env.LOCALAPPDATA ?? env.HOME ?? "", "code-server");
  try {
    for (const entry of await readdir(root)) {
      if (!entry.startsWith("code-server-")) continue;
      const candidate = join2(root, entry, "bin", "code-server.cmd");
      try {
        await stat(candidate);
        return candidate;
      } catch {
      }
    }
  } catch {
  }
  return void 0;
}
function quotePowerShell(value) {
  return `'${value.replace(/'/g, "''")}'`;
}
async function ensureService(env = process.env, port = SERVICE_PORT, force = false) {
  try {
    if (await isListening(port)) return;
    const now = Date.now();
    if (!force && now - lastAttempt < RETRY_MS) return;
    const launcher = await findLauncher(env);
    if (launcher === void 0) return;
    if (process.platform !== "win32") return;
    lastAttempt = now;
    const quoted = launcher.includes(" ") ? `"${launcher}"` : launcher;
    const commandLine = `${quoted} ${SERVICE_ARGS.join(" ")}`;
    const command = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePowerShell(commandLine)} } | Out-Null`;
    const encoded = Buffer.from(command, "utf16le").toString("base64");
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
      stdio: "ignore"
    });
    child.on("error", (error) => {
      console.error("[dsh-booster] starting the Sidebar service failed:", error);
    });
    child.unref();
  } catch (error) {
    console.error("[dsh-booster] starting the Sidebar service failed:", error);
  }
}

// src/chime.ts
import { spawn as spawn2 } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join3 } from "node:path";
var SAMPLE_RATE = 44100;
var TAU = Math.PI * 2;
var CACHE_VERSION = "v1";
var MAX_PARTIAL = 7;
var BRIGHTNESS = 2;
var PARTIAL_SPREAD = 0.5;
var INHARMONICITY = 4e-4;
function feltPartials(maxPartial = MAX_PARTIAL) {
  const out = [];
  for (let n = 1; n <= maxPartial; n++) {
    const ratio = n * Math.sqrt(1 + INHARMONICITY * n * n);
    const level = 1 / n ** BRIGHTNESS * (n > 2 ? 0.15 : 1);
    out.push([ratio, level, 1 + (n - 1) * PARTIAL_SPREAD]);
  }
  return out;
}
function strike(freq, options) {
  const { seconds, level, decay = 1.6, attack = 0.012, detune = 14e-4, glide = 1 } = options;
  const partials = feltPartials();
  const length = Math.round(SAMPLE_RATE * seconds);
  const out = new Float32Array(length);
  const layers = detune > 0 ? [1, 1 + detune] : [1];
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const swept = freq * (1 + (glide - 1) * (t / seconds));
    let sum = 0;
    for (const layer of layers) {
      for (const [ratio, partialLevel, decayScale] of partials) {
        sum += partialLevel / layers.length * Math.sin(TAU * swept * layer * ratio * t) * Math.exp(-decay * decayScale * (t / seconds));
      }
    }
    out[i] = sum * Math.min(1, t / attack) * level;
  }
  return out;
}
function mix(parts) {
  const frames = Math.max(...parts.map(([samples, at]) => samples.length + Math.round(SAMPLE_RATE * at)));
  const out = new Float32Array(frames);
  for (const [samples, at] of parts) {
    const offset = Math.round(SAMPLE_RATE * at);
    for (let i = 0; i < samples.length; i++) out[i + offset] += samples[i];
  }
  return out;
}
function damp(samples, alpha = 0.22, wet = 0.7) {
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += alpha * (samples[i] - y);
    samples[i] = (1 - wet) * samples[i] + wet * y;
  }
  return samples;
}
function room(samples) {
  const taps = [
    [0.031, 0.2],
    [0.067, 0.12]
  ];
  const out = new Float32Array(samples.length + Math.round(SAMPLE_RATE * 0.42));
  out.set(samples);
  for (const [delay, gain] of taps) {
    const offset = Math.round(SAMPLE_RATE * delay);
    for (let i = 0; i < samples.length; i++) out[i + offset] += samples[i] * gain;
  }
  return damp(out);
}
function normalize(samples, peak = 0.6) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  if (max === 0) return samples;
  const gain = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}
function toWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    buffer.writeInt16LE(clamped, 44 + i * 2);
  }
  return buffer;
}
function bed() {
  return [
    [strike(174.61, { seconds: 1.8, level: 0.34, decay: 1.5, attack: 0.01 }), 0],
    [strike(261.63, { seconds: 1.6, level: 0.22, decay: 1.6, attack: 0.014 }), 0]
  ];
}
function renderChime(sound) {
  const lift = sound === "done" ? [
    [strike(392, { seconds: 1.4, level: 0.13, decay: 1.6, attack: 0.012 }), 0.16],
    [strike(523.25, { seconds: 1.4, level: 0.1, decay: 1.6, attack: 0.014 }), 0.34]
  ] : [
    [strike(392, { seconds: 1.3, level: 0.12, decay: 1.7, attack: 0.012 }), 0.16],
    [strike(261.63, { seconds: 1.6, level: 0.1, decay: 1.5, attack: 0.016 }), 0.36]
  ];
  return toWav(normalize(room(mix([...bed(), ...lift]))));
}
var ERROR_QUIET_MS = 4e3;
function shouldChime(input) {
  if (!input.enabled) return false;
  if (input.elapsedMs / 1e3 < input.minSeconds) return false;
  return input.erroredAgoMs >= ERROR_QUIET_MS;
}
function chimeCachePath(sound) {
  return join3(tmpdir(), `dsh-booster-chime-${CACHE_VERSION}-${sound}.wav`);
}
function playerFor(file) {
  if (process.platform === "darwin") return { command: "afplay", args: [file] };
  if (process.platform === "win32") {
    return {
      command: "powershell.exe",
      args: ["-NoProfile", "-NonInteractive", "-Command", `(New-Object System.Media.SoundPlayer '${file}').PlaySync()`]
    };
  }
  return { command: "paplay", args: [file] };
}
async function playChime(sound) {
  try {
    const file = chimeCachePath(sound);
    if (!existsSync(file)) await writeFile(file, renderChime(sound));
    const { command, args } = playerFor(file);
    const child = spawn2(command, args, { stdio: "ignore" });
    child.on("error", (error) => {
      console.error("[dsh-booster] playing the chime failed:", error);
    });
    child.unref();
  } catch (error) {
    console.error("[dsh-booster] rendering the chime failed:", error);
  }
}

// src/schema.ts
import Schema from "@deepseek-ai/schemastery";

// src/settings.ts
var BOOSTER_NAMESPACE = "booster";
var DEFAULT_MODULES = {
  preview: true,
  appearance: true,
  headerTools: true,
  chime: false
};
var DEFAULT_APPEARANCE = {
  accent: "default",
  fontFamily: "default"
};
var DEFAULT_HEADER_TOOLS = {
  sidebarToggle: true,
  readingSize: true
};
var DEFAULT_PREVIEW = {
  linkMode: "all",
  fileOpen: "vscode",
  codeServer: "unknown",
  url: "",
  startRequest: 0
};
var DEFAULT_CHIME = {
  minSeconds: 3,
  onError: true,
  previewAt: 0
};
var CHIME_MIN_SECONDS = [0, 3, 5, 10];
var ACCENT_CHOICES = ["default", "ocean", "forest", "violet"];
var FONT_FAMILY_CHOICES = ["default", "system", "yahei", "serif"];
var LINK_MODES = ["all", "video"];
var FILE_OPEN_TARGETS = ["vscode", "preview", "off"];
var CODE_SERVER_STATES = ["unknown", "have", "none"];
function normalizeBoosterSettings(value) {
  const raw = value !== null && typeof value === "object" ? value : {};
  const modules = raw.modules !== null && typeof raw.modules === "object" ? raw.modules : {};
  const appearance = raw.appearance !== null && typeof raw.appearance === "object" ? raw.appearance : {};
  const headerTools = raw.headerTools !== null && typeof raw.headerTools === "object" ? raw.headerTools : {};
  const preview = raw.preview !== null && typeof raw.preview === "object" ? raw.preview : {};
  const chime = raw.chime !== null && typeof raw.chime === "object" ? raw.chime : {};
  return {
    modules: { ...DEFAULT_MODULES, ...modules },
    appearance: { ...DEFAULT_APPEARANCE, ...appearance },
    headerTools: { ...DEFAULT_HEADER_TOOLS, ...headerTools },
    preview: { ...DEFAULT_PREVIEW, ...preview },
    chime: { ...DEFAULT_CHIME, ...chime }
  };
}

// src/schema.ts
var BoosterSchema = Schema.object({
  modules: Schema.object({
    preview: Schema.boolean().default(DEFAULT_MODULES.preview === true),
    appearance: Schema.boolean().default(DEFAULT_MODULES.appearance === true),
    headerTools: Schema.boolean().default(DEFAULT_MODULES.headerTools === true)
  }).default({ ...DEFAULT_MODULES }),
  appearance: Schema.object({
    accent: Schema.union(ACCENT_CHOICES.map((choice) => Schema.const(choice))).default(DEFAULT_APPEARANCE.accent),
    fontFamily: Schema.union(FONT_FAMILY_CHOICES.map((choice) => Schema.const(choice))).default(
      DEFAULT_APPEARANCE.fontFamily
    )
  }).default({ ...DEFAULT_APPEARANCE }),
  headerTools: Schema.object({
    sidebarToggle: Schema.boolean().default(DEFAULT_HEADER_TOOLS.sidebarToggle),
    readingSize: Schema.boolean().default(DEFAULT_HEADER_TOOLS.readingSize)
  }).default({ ...DEFAULT_HEADER_TOOLS }),
  preview: Schema.object({
    linkMode: Schema.union(LINK_MODES.map((mode) => Schema.const(mode))).default(DEFAULT_PREVIEW.linkMode),
    fileOpen: Schema.union(FILE_OPEN_TARGETS.map((target) => Schema.const(target))).default(DEFAULT_PREVIEW.fileOpen),
    codeServer: Schema.union(CODE_SERVER_STATES.map((state) => Schema.const(state))).default(DEFAULT_PREVIEW.codeServer),
    url: Schema.string().default(DEFAULT_PREVIEW.url),
    startRequest: Schema.number().default(DEFAULT_PREVIEW.startRequest)
  }).default({ ...DEFAULT_PREVIEW }),
  chime: Schema.object({
    minSeconds: Schema.union(CHIME_MIN_SECONDS.map((seconds) => Schema.const(seconds))).default(DEFAULT_CHIME.minSeconds),
    onError: Schema.boolean().default(DEFAULT_CHIME.onError),
    previewAt: Schema.number().default(DEFAULT_CHIME.previewAt)
  }).default({ ...DEFAULT_CHIME })
});

// src/index.ts
var name = "dsh-booster";
var FILE_TOOLS = /* @__PURE__ */ new Set(["write", "edit"]);
var lastStartRequest = 0;
var runningSince;
var erroredAt = 0;
var lastPreviewAt = 0;
var SERVICE_WAIT_MS = 8e3;
async function waitForListening(port, budgetMs) {
  const deadline = Date.now() + budgetMs;
  for (; ; ) {
    if (await isListening(port)) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
function settingsOf(host) {
  const settings = host.get("settings");
  return settings?.get(BOOSTER_NAMESPACE);
}
async function answerStartRequest(host, config) {
  try {
    await ensureService(process.env, SERVICE_PORT, true);
    const up = await waitForListening(SERVICE_PORT, SERVICE_WAIT_MS);
    const settings = host.get("settings");
    if (settings?.replace === void 0) return;
    await settings.replace(BOOSTER_NAMESPACE, {
      ...config,
      preview: { ...config.preview, codeServer: up ? "have" : "none", startRequest: 0 }
    });
  } catch (error) {
    console.error("[dsh-booster] answering a start request failed:", error);
  }
}
function filePathOf(args) {
  if (args === null || typeof args !== "object") return void 0;
  const value = args.file_path;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
async function requestOpen(path) {
  const marker = markerPath();
  const request = { path, at: Date.now() };
  await mkdir(dirname(marker), { recursive: true });
  const temporary = `${marker}.tmp`;
  await writeFile2(temporary, JSON.stringify(request), "utf8");
  await rename(temporary, marker);
}
function apply(ctx) {
  const host = ctx;
  host.inject(["settings"], (scoped) => {
    try {
      scoped.settings.register(BOOSTER_NAMESPACE, BoosterSchema);
    } catch (error) {
      console.error("[dsh-booster] settings namespace registration failed:", error);
    }
  });
  host.on("tools/result", (execution, result) => {
    try {
      const settings = host.get("settings");
      const config = normalizeBoosterSettings(settings?.get(BOOSTER_NAMESPACE));
      if (config.preview.fileOpen !== "vscode") return;
      const call = execution;
      if (call === void 0 || typeof call.name !== "string" || !FILE_TOOLS.has(call.name)) return;
      if (result?.isError === true) return;
      const target = filePathOf(call.arguments);
      if (target === void 0) return;
      void requestOpen(target).then(() => ensureService()).catch((error) => {
        console.error("[dsh-booster] writing the bridge request failed:", error);
      });
    } catch (error) {
      console.error("[dsh-booster] bridge request failed:", error);
    }
  });
  host.on("agent/status", (payload) => {
    try {
      const status = payload?.status;
      const config = normalizeBoosterSettings(settingsOf(host));
      if (config.modules.chime !== true) return;
      if (status === "running") {
        runningSince = Date.now();
        return;
      }
      if (status !== "idle") return;
      const startedAt = runningSince;
      runningSince = void 0;
      if (startedAt === void 0) return;
      const now = Date.now();
      const chiming = shouldChime({
        enabled: config.modules.chime === true,
        elapsedMs: now - startedAt,
        minSeconds: config.chime.minSeconds,
        erroredAgoMs: now - erroredAt
      });
      if (!chiming) return;
      void playChime("done");
    } catch (error) {
      console.error("[dsh-booster] handling a status change failed:", error);
    }
  });
  host.on("agent/error", () => {
    try {
      const config = normalizeBoosterSettings(settingsOf(host));
      if (config.modules.chime !== true || config.chime.onError !== true) return;
      erroredAt = Date.now();
      void playChime("error");
    } catch (error) {
      console.error("[dsh-booster] handling an agent error failed:", error);
    }
  });
  host.on("settings/updated", (ns, next) => {
    try {
      if (ns !== BOOSTER_NAMESPACE) return;
      const config = normalizeBoosterSettings(next);
      if (config.chime.previewAt > lastPreviewAt) {
        lastPreviewAt = config.chime.previewAt;
        void playChime("done");
      }
      if (config.preview.fileOpen !== "vscode") return;
      if (config.preview.startRequest <= lastStartRequest) return;
      lastStartRequest = config.preview.startRequest;
      void answerStartRequest(host, config);
    } catch (error) {
      console.error("[dsh-booster] handling a settings change failed:", error);
    }
  });
}
export {
  apply,
  chimeCachePath,
  ensureService,
  findLauncher,
  isListening,
  name,
  renderChime,
  shouldChime
};
//# sourceMappingURL=index.js.map
