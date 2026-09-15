// src/index.ts
import { mkdir, rename, writeFile } from "node:fs/promises";
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
async function ensureService(env = process.env, port = SERVICE_PORT) {
  try {
    if (await isListening(port)) return;
    const now = Date.now();
    if (now - lastAttempt < RETRY_MS) return;
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

// src/schema.ts
import Schema from "@deepseek-ai/schemastery";

// src/settings.ts
var BOOSTER_NAMESPACE = "booster";
var DEFAULT_MODULES = {
  preview: true,
  appearance: true,
  headerTools: true
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
  url: ""
};
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
  return {
    modules: { ...DEFAULT_MODULES, ...modules },
    appearance: { ...DEFAULT_APPEARANCE, ...appearance },
    headerTools: { ...DEFAULT_HEADER_TOOLS, ...headerTools },
    preview: { ...DEFAULT_PREVIEW, ...preview }
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
    url: Schema.string().default(DEFAULT_PREVIEW.url)
  }).default({ ...DEFAULT_PREVIEW })
});

// src/index.ts
var name = "dsh-booster";
var FILE_TOOLS = /* @__PURE__ */ new Set(["write", "edit"]);
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
  await writeFile(temporary, JSON.stringify(request), "utf8");
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
}
export {
  apply,
  ensureService,
  findLauncher,
  isListening,
  name
};
//# sourceMappingURL=index.js.map
