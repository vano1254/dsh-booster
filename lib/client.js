window.__ModuleLoader__.load({ id: 'dsh-booster', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/styles.ts
var PANEL_CSS = `
.booster-preview { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.booster-preview__head {
  display: flex; align-items: center; gap: 8px; flex: 0 0 auto;
  padding: 7px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.booster-preview__url {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px; color: var(--dsw-alias-label-secondary);
}
.booster-preview__action {
  flex: 0 0 auto; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary); border-radius: 6px; padding: 2px 7px; font-size: 11px; cursor: pointer;
}
.booster-preview__action:hover { color: var(--dsw-alias-label-primary); }
.booster-preview__frame { flex: 1 1 auto; min-height: 0; background: var(--dsw-alias-bg-base); }
.booster-preview__frame:fullscreen { background: #000; }
.booster-preview__iframe { width: 100%; height: 100%; border: 0; display: block; }
.booster-preview__note {
  flex: 0 0 auto; margin: 0; padding: 6px 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-secondary);
}
.booster-preview__empty { padding: 18px 14px; font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.booster-row__label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.booster-row__hint { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
.booster-button {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-radius: 7px;
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
}
.booster-button:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.booster-codeserver { padding: 10px 0 2px; }
.booster-codeserver__actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.booster-codeserver__command {
  margin: 8px 0 0;
  padding: 8px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}
`;

// src/client/vscode.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var VSCODE_TYPE_ID = "dsh-booster/vscode";
var VSCODE_KIND = "booster-vscode";
var SERVICE_PORT = 8443;
var SERVICE_HOME = `http://127.0.0.1:${SERVICE_PORT}/`;
var DICT = {
  zh: {
    tab: "VS Code",
    "guide.desc": "\u672C\u673A code-server \u91CC\u90A3\u4E2A\u771F\u7684 VS Code\uFF0C\u6309\u9700\u542F\u52A8",
    note: "\u8FD9\u662F\u63D2\u4EF6\u6309\u9700\u62C9\u8D77\u7684\u771F VS Code\uFF08code-server\uFF09\u3002\u7A7A\u767D\u7684\u8BDD\uFF1A\u670D\u52A1\u8FD8\u6CA1\u8D77\u6765 \u2014\u2014 \u5199\u4E00\u4E2A\u6587\u4EF6\u5B83\u5C31\u4F1A\u81EA\u5DF1\u542F\u52A8\uFF0C\u6216\u8005\u7528\u4E0B\u9762\u90A3\u6761\u547D\u4EE4\u624B\u52A8\u8D77\u3002",
    fullscreen: "\u5168\u5C4F",
    label: "\u53F3\u4FA7 VS Code\uFF08code-server\uFF09",
    "state.unknown": "\u6B63\u5728\u68C0\u6D4B\u2026",
    "state.have": "\u5DF2\u68C0\u6D4B\u5230\uFF0C\u53EF\u4EE5\u7528\u4E86",
    "state.none": "\u670D\u52A1\u6CA1\u5728\u8FD0\u884C\uFF08\u63D2\u4EF6\u4E0D\u4F1A\u5F00\u673A\u81EA\u542F\uFF09",
    "hint.manual": "\u5199\u4E00\u4E2A\u6587\u4EF6\u5B83\u5C31\u4F1A\u81EA\u5DF1\u542F\u52A8\uFF1B\u6216\u8005\u7528\u4E0B\u9762\u7B2C\u4E00\u6761\u547D\u4EE4\u624B\u52A8\u8D77\u3002\u8FD8\u6CA1\u88C5\u5C31\u7B2C\u4E8C\u6761\uFF08\u7EA6 675 MB \u72EC\u7ACB\u7A0B\u5E8F\uFF0C\u4EC5 Windows\uFF09\u3002",
    "recheck": "\u91CD\u65B0\u68C0\u6D4B",
    "start.label": "\u542F\u52A8\uFF08\u5DF2\u5B89\u88C5\uFF09",
    "install.label": "\u5B89\u88C5\uFF08\u8FD8\u6CA1\u88C5\uFF09",
    "showCommand": "\u67E5\u770B\u547D\u4EE4",
    "hideCommand": "\u6536\u8D77\u547D\u4EE4"
  },
  en: {
    tab: "VS Code",
    note: "The real VS Code (code-server) that this plugin starts on demand. Blank pane? The service is not up \u2014 writing a file starts it, or use the command below.",
    "guide.desc": "The real VS Code in code-server, started on demand",
    fullscreen: "Fullscreen",
    label: "VS Code in the right Sidebar (code-server)",
    "state.unknown": "Checking\u2026",
    "state.have": "Found it \u2014 ready to use",
    "state.none": "The service is not running (the plugin never autostarts it)",
    "hint.manual": "Writing a file starts it, or use the first command below. Not installed yet? The second one installs it (~675 MB, Windows only).",
    "recheck": "Check again",
    "start.label": "Start it (already installed)",
    "install.label": "Install it (not yet installed)",
    "showCommand": "Show the commands",
    "hideCommand": "Hide the command"
  }
};
var START_COMMAND = [
  '$d = Get-ChildItem "$env:USERPROFILE\\.dsh\\profiles\\*\\node_modules\\dsh-booster" -Directory | Select-Object -First 1',
  "powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName 'tools\\start-code-server.ps1')"
].join("\n");
var INSTALL_COMMAND = [
  '$d = Get-ChildItem "$env:USERPROFILE\\.dsh\\profiles\\*\\node_modules\\dsh-booster" -Directory | Select-Object -First 1',
  "powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName 'tools\\setup-code-server.ps1')"
].join("\n");
async function probeService(timeoutMs = 1500) {
  let timer;
  try {
    const controller = typeof AbortController === "function" ? new AbortController() : void 0;
    timer = setTimeout(() => controller?.abort(), timeoutMs);
    await fetch(SERVICE_HOME, { mode: "no-cors", cache: "no-store", signal: controller?.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
function FramePane({ t }) {
  const frame = (0, import_react.useRef)(null);
  const goFullscreen = () => {
    const element = frame.current;
    if (element === null) return;
    const request = element.requestFullscreen ?? element.webkitRequestFullscreen;
    if (typeof request !== "function") return;
    try {
      void request.call(element);
    } catch (error) {
      console.error("[dsh-booster] fullscreen request failed:", error);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "booster-preview", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "booster-preview__head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "booster-preview__url", title: SERVICE_HOME, children: SERVICE_HOME }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "booster-preview__action",
          "data-booster-fullscreen": "true",
          onClick: goFullscreen,
          title: t("fullscreen"),
          "aria-label": t("fullscreen"),
          children: t("fullscreen")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-preview__frame", ref: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "iframe",
      {
        className: "booster-preview__iframe",
        src: SERVICE_HOME,
        title: t("tab"),
        sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads",
        allow: "clipboard-read; clipboard-write"
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "booster-preview__note", children: t("note") })
  ] });
}
function vscodePanelElement(t) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VSCodePanel, { t });
}
function VSCodePanel({ t }) {
  const [state, setState] = (0, import_react.useState)("unknown");
  const [showCommand, setShowCommand] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    let live = true;
    void probeService().then((up) => {
      if (live) setState(up ? "have" : "none");
    });
    return () => {
      live = false;
    };
  }, []);
  if (state === "have") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FramePane, { t });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-preview__empty", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "booster-codeserver", "data-booster-code-server": state, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-row__label", children: t("label") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-row__hint", children: state === "unknown" ? t("state.unknown") : t("state.none") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-row__hint", children: t("hint.manual") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "booster-codeserver__actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "booster-button", onClick: () => setShowCommand((open) => !open), children: t(showCommand ? "hideCommand" : "showCommand") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "booster-button",
          onClick: () => {
            setState("unknown");
            void probeService().then((up) => setState(up ? "have" : "none"));
          },
          children: t("recheck")
        }
      )
    ] }),
    showCommand && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-row__hint", children: t("start.label") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "booster-codeserver__command", children: START_COMMAND }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booster-row__hint", children: t("install.label") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "booster-codeserver__command", children: INSTALL_COMMAND })
    ] })
  ] }) });
}

// src/client/index.ts
var name = "dsh-booster";
var inject = ["slots"];
var PANE_SLOT = "sidebar.right.pane.tab";
var LOCALE_NS = "dsh-booster";
function installLocale(ctx) {
  try {
    const locale = ctx.locale;
    if (locale !== void 0 && typeof locale.register === "function" && typeof locale.bind === "function") {
      locale.register(LOCALE_NS, { zh: DICT.zh, en: DICT.en });
      return locale.bind(LOCALE_NS);
    }
  } catch (error) {
    console.error("[dsh-booster] registering the locale dictionaries failed:", error);
  }
  return (key) => DICT.zh[key] ?? key;
}
function injectStylesheet() {
  try {
    if (typeof document === "undefined") return;
    const id = "dsh-booster-panel-css";
    if (document.getElementById(id) !== null) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = PANEL_CSS;
    document.head.appendChild(style);
  } catch (error) {
    console.error("[dsh-booster] injecting the stylesheet failed:", error);
  }
}
function readTabsFace(source) {
  try {
    const viaProperty = source.sidebarRightTabs;
    if (viaProperty !== void 0 && viaProperty !== null) return viaProperty;
  } catch {
  }
  try {
    const get = source.get;
    const viaGet = typeof get === "function" ? get.call(source, "sidebarRightTabs") : void 0;
    if (viaGet !== void 0 && viaGet !== null) return viaGet;
  } catch {
  }
  return void 0;
}
function apply(ctx) {
  try {
    const t = installLocale(ctx);
    injectStylesheet();
    const start = (tabs) => {
      ctx.effect(
        () => tabs.register({
          id: VSCODE_TYPE_ID,
          kind: VSCODE_KIND,
          // `extension` is the band for a type from outside the product, and the
          // documented default; it also lets this type take over a builtin kind.
          priority: "extension",
          title: () => t("tab"),
          // Without this the type exists but is **invisible**: the right Sidebar's
          // user-facing surface is its guide page, and a type appears there only by
          // contributing an entry capsule. Registering `guide` is what puts "VS Code"
          // in front of the user — a bare type can only be opened programmatically,
          // which is exactly how the previous version lost its only way in.
          guide: [
            {
              id: "vscode",
              order: 10,
              title: () => t("tab"),
              description: () => t("guide.desc")
            }
          ]
        }),
        "dsh-booster: VS Code tab type"
      );
      ctx.effect(
        () => ctx.slots.inject(
          PANE_SLOT,
          () => ctx.slots.register(
            { name: PANE_SLOT, key: VSCODE_TYPE_ID },
            (() => vscodePanelElement(t))
          )
        ),
        "dsh-booster: VS Code tab body"
      );
    };
    const immediate = readTabsFace(ctx);
    if (immediate !== void 0) {
      start(immediate);
      return;
    }
    if (typeof ctx.inject === "function") {
      try {
        ctx.inject(["sidebarRightTabs"], (scoped) => {
          const tabs = readTabsFace(scoped) ?? readTabsFace(ctx);
          if (tabs !== void 0) start(tabs);
        });
      } catch (error) {
        console.error("[dsh-booster] waiting for sidebarRightTabs failed:", error);
      }
    }
  } catch (error) {
    console.error("[dsh-booster] client apply failed:", error);
  }
}
return module.exports; } });
//# sourceMappingURL=client.js.map
