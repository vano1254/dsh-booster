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
  name: () => name,
  openVSCodeTab: () => openVSCodeTab,
  resolveCodeServer: () => resolveCodeServer
});
module.exports = __toCommonJS(index_exports);

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
  url: "",
  startRequest: 0
};
var ACCENT_CHOICES = ["default", "ocean", "forest", "violet"];
var FONT_FAMILY_CHOICES = ["default", "system", "yahei", "serif"];
var LINK_MODES = ["all", "video"];
var FILE_OPEN_TARGETS = ["vscode", "preview", "off"];
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

// src/client/types.ts
function service(ctx, name2) {
  const value = ctx.get(name2);
  return value === void 0 || value === null ? void 0 : value;
}
function resolveService(ctx, name2) {
  const direct = service(ctx, name2);
  if (direct !== void 0) return direct;
  const reflect = ctx.reflect;
  if (reflect === void 0 || typeof reflect.get !== "function") return void 0;
  try {
    const value = reflect.get(name2);
    return value === void 0 || value === null ? void 0 : value;
  } catch {
    return void 0;
  }
}

// src/client/locale.ts
var LOCALE_NAMESPACE = "dsh-booster";
var zh = {
  "section.title": "\u589E\u5F3A\u5957\u4EF6",
  "section.desc": "\u6309\u9700\u5F00\u542F\u7684\u754C\u9762\u4E0E\u4EA4\u4E92\u4F18\u5316\u3002\u6539\u5B8C\u5373\u65F6\u751F\u6548\uFF0C\u914D\u7F6E\u5199\u5165\u672C\u673A settings.yaml\u3002",
  "module.enable": "\u542F\u7528",
  "modules.heading": "\u529F\u80FD\u6A21\u5757",
  "appearance.title": "\u5916\u89C2",
  "appearance.desc": "\u5F3A\u8C03\u8272\u4E0E\u754C\u9762\u5B57\u4F53\u3002\u4F1A\u8BDD\u9605\u8BFB\u5B57\u53F7\u7531\u5916\u89C2\u6A21\u5757\u548C\u6807\u9898\u680F\u5171\u7528\u540C\u4E00\u4EFD\u8BBE\u7F6E\u3002",
  "appearance.accent": "\u5F3A\u8C03\u8272",
  "appearance.fontFamily": "\u754C\u9762\u5B57\u4F53",
  "appearance.readingSize": "\u4F1A\u8BDD\u9605\u8BFB\u5B57\u53F7",
  "appearance.readingSizeHint": "\u4EC5\u5F71\u54CD\u4F1A\u8BDD\u6B63\u6587\uFF0C\u4E0D\u6539\u4EE3\u7801\u5B57\u53F7",
  "accent.default": "\u9ED8\u8BA4",
  "accent.ocean": "\u6D77\u84DD",
  "accent.forest": "\u68EE\u6797",
  "accent.violet": "\u7D2B\u7F57\u5170",
  "font.default": "\u8DDF\u968F\u7CFB\u7EDF\uFF08\u9ED8\u8BA4\uFF09",
  "font.system": "\u7CFB\u7EDF\u65E0\u886C\u7EBF",
  "font.yahei": "\u5FAE\u8F6F\u96C5\u9ED1",
  "font.serif": "\u886C\u7EBF\uFF08\u5B8B\u4F53\uFF09",
  "headerTools.title": "\u6807\u9898\u680F\u5FEB\u6377\u5DE5\u5177",
  "headerTools.desc": "\u5728\u4F1A\u8BDD\u6807\u9898\u680F\u653E\u51E0\u4E2A\u968F\u624B\u53EF\u7528\u7684\u63A7\u4EF6\uFF0C\u7701\u5F97\u6BCF\u6B21\u8FDB\u8BBE\u7F6E\u3002",
  "headerTools.sidebarToggle": "\u4FA7\u680F\u5F00\u5173",
  "headerTools.sidebarToggleHint": "\u4E00\u952E\u6536\u8D77/\u5C55\u5F00\u5DE6\u4FA7\u680F",
  "headerTools.readingSize": "\u5B57\u53F7\u6B65\u8FDB",
  "headerTools.readingSizeHint": "\u5728\u6807\u9898\u680F\u76F4\u63A5\u52A0\u51CF\u9605\u8BFB\u5B57\u53F7",
  "tools.sidebar": "\u6536\u8D77 / \u5C55\u5F00\u4FA7\u680F",
  "tools.smaller": "\u51CF\u5C0F\u9605\u8BFB\u5B57\u53F7",
  "tools.larger": "\u589E\u5927\u9605\u8BFB\u5B57\u53F7",
  "note.storage": "\u914D\u7F6E\u4FDD\u5B58\u5728 ~/.dsh/settings.yaml \u7684 booster \u6BB5\uFF1B\u901A\u8FC7\u975E\u672C\u673A\u5730\u5740\u8BBF\u95EE\u65F6\u4EC5\u672C\u6B21\u4F1A\u8BDD\u6709\u6548\u3002",
  "preview.title": "\u4FA7\u680F\u9884\u89C8",
  "preview.desc": "\u4F60\u5728\u5199\u4EE3\u7801\u6216\u7ED9\u51FA\u94FE\u63A5\u65F6\uFF0C\u53F3\u4FA7\u680F\u81EA\u52A8\u5F39\u51FA\u5E76\u52A0\u8F7D\uFF1A\u4EE3\u7801\u9ED8\u8BA4\u5728\u53F3\u4FA7\u7684 VS Code \u91CC\u6253\u5F00\uFF0C\u7F51\u9875\u548C\u89C6\u9891\u5728\u8FD9\u4E2A\u7F51\u9875\u9762\u677F\u91CC\u6253\u5F00\u3002",
  "preview.tabTitle": "\u7F51\u9875",
  "preview.empty": "\u8FD8\u6CA1\u6709\u5185\u5BB9\u3002\u6A21\u578B\u6539\u6587\u4EF6\u6216\u7ED9\u51FA\u94FE\u63A5\u65F6\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "preview.openExternal": "\u5728\u6D4F\u89C8\u5668\u6253\u5F00",
  "preview.fullscreen": "\u5168\u5C4F",
  "preview.note": "\u80FD\u5426\u5D4C\u5165\u7531\u76EE\u6807\u7AD9\u70B9\u51B3\u5B9A\uFF1B\u88AB\u62D2\u7EDD\u65F6\u4F1A\u663E\u793A\u7A7A\u767D\uFF0C\u6B64\u65F6\u7528\u4E0A\u9762\u7684\u300C\u5728\u6D4F\u89C8\u5668\u6253\u5F00\u300D\u3002\u7A84\u680F\u91CC\u89C6\u9891\u4F1A\u7CCA\uFF0C\u70B9\u300C\u5168\u5C4F\u300D\u7ED9\u5B83\u8DB3\u591F\u7684\u50CF\u7D20\u3002",
  "preview.links": "\u94FE\u63A5\u81EA\u52A8\u6253\u5F00",
  "preview.linkMode.all": "\u6240\u6709\u94FE\u63A5",
  "preview.linkMode.video": "\u53EA\u5F00\u89C6\u9891",
  "preview.hint": "\u53EA\u4F5C\u7528\u4E8E\u56DE\u590D\u91CC\u7684 http \u94FE\u63A5\uFF1B\u4EE3\u7801\u6587\u4EF6\u770B\u4E0A\u9762\u7684\u300C\u4EE3\u7801\u6587\u4EF6\u6253\u5F00\u65B9\u5F0F\u300D\u3002",
  "preview.fileOpen": "\u4EE3\u7801\u6587\u4EF6\u6253\u5F00\u65B9\u5F0F",
  "preview.fileOpenHint": "\u6A21\u578B\u5199\u5B8C\u6216\u6539\u5B8C\u6587\u4EF6\u540E\uFF0C\u90A3\u4E2A\u6587\u4EF6\u53BB\u54EA\u513F",
  "preview.fileOpen.vscode": "\u53F3\u4FA7 VS Code\uFF08\u6309\u9700\u542F\u52A8\uFF09",
  "preview.fileOpen.preview": "\u4EA7\u54C1\u81EA\u5E26\u9884\u89C8\u5668",
  "preview.fileOpen.off": "\u4E0D\u81EA\u52A8\u6253\u5F00",
  "preview.vscodeTab": "VS Code",
  "preview.vscodeNote": "\u8FD9\u662F\u63D2\u4EF6\u6309\u9700\u62C9\u8D77\u7684\u771F VS Code\uFF08code-server\uFF09\u3002\u5982\u679C\u8FD9\u91CC\u662F\u7A7A\u767D\uFF1A\u670D\u52A1\u8FD8\u6CA1\u8D77\u6765\u2014\u2014\u9996\u6B21\u5199\u6587\u4EF6\u65F6\u5B83\u4F1A\u81EA\u52A8\u542F\u52A8\uFF0C\u4E5F\u53EF\u4EE5\u5148\u624B\u52A8\u8DD1\u4E00\u6B21 tools \u91CC\u7684\u542F\u52A8\u811A\u672C\u3002",
  "preview.openVSCode": "\u5728\u53F3\u680F\u6253\u5F00 VS Code",
  "preview.openVSCodeHint": "\u4E0D\u7528\u7B49\u56DE\u590D\u91CC\u51FA\u73B0\u94FE\u63A5",
  "preview.openVSCodeAction": "\u6253\u5F00",
  "preview.codeServer.label": "\u53F3\u4FA7 VS Code\uFF08code-server\uFF09",
  "preview.codeServer.state.unknown": "\u6B63\u5728\u68C0\u6D4B\u2026",
  "preview.codeServer.state.have": "\u5DF2\u68C0\u6D4B\u5230\uFF0C\u53EF\u4EE5\u7528\u4E86",
  "preview.codeServer.state.none": "\u670D\u52A1\u6CA1\u5728\u8FD0\u884C\uFF08\u63D2\u4EF6\u4E0D\u4F1A\u5F00\u673A\u81EA\u542F\uFF09",
  "preview.codeServer.state.starting": "\u670D\u52A1\u6CA1\u5728\u8FD0\u884C \u2014\u2014 \u6B63\u5728\u8BF7\u5BBF\u4E3B\u542F\u52A8\u5B83\u2026",
  "preview.codeServer.startingHint": "\u51E0\u79D2\u5185\u5E94\u8BE5\u4F1A\u53D8\u6210\u5DE5\u4F5C\u53F0\u3002\u8981\u662F\u6CA1\u53D8\u5316\uFF0C\u7528\u4E0B\u9762\u4E24\u6761\u547D\u4EE4\u4E4B\u4E00\u624B\u52A8\u5904\u7406\u3002",
  "preview.codeServer.hint": "\u5DF2\u7ECF\u88C5\u4E86\u7684\u8BDD\u8DD1\u7B2C\u4E00\u6761\u542F\u52A8\u5B83\uFF1B\u8FD8\u6CA1\u88C5\u5C31\u7B2C\u4E8C\u6761\uFF08\u7EA6 675 MB \u72EC\u7ACB\u7A0B\u5E8F\uFF0C\u4EC5 Windows\uFF09\u3002",
  "preview.codeServer.startLabel": "\u542F\u52A8\uFF08\u5DF2\u5B89\u88C5\uFF09",
  "preview.codeServer.installLabel": "\u5B89\u88C5\uFF08\u8FD8\u6CA1\u88C5\uFF09",
  "preview.codeServer.showCommand": "\u67E5\u770B\u547D\u4EE4",
  "preview.codeServer.hideCommand": "\u6536\u8D77\u547D\u4EE4",
  "preview.codeServer.recheck": "\u6211\u88C5\u597D\u4E86\uFF0C\u91CD\u65B0\u68C0\u6D4B",
  "preview.codeServer.useBuiltin": "\u7528\u4EA7\u54C1\u81EA\u5E26\u9884\u89C8\u5668",
  "preview.codeServer.useVscode": "\u6539\u56DE\u5728\u53F3\u4FA7 VS Code \u6253\u5F00",
  "preview.address": "\u7F51\u5740",
  "preview.addressPlaceholder": "\u8F93\u5165\u6216\u7C98\u8D34\u7F51\u5740\uFF0C\u56DE\u8F66\u52A0\u8F7D",
  "preview.addressGo": "\u52A0\u8F7D",
  "preview.addressFollow": "\u8DDF\u968F\u94FE\u63A5",
  "unit.px": "px"
};
var en = {
  "section.title": "Booster",
  "section.desc": "Opt-in interface and interaction upgrades. Changes apply instantly; preferences persist in your local settings.yaml.",
  "module.enable": "Enabled",
  "modules.heading": "Modules",
  "appearance.title": "Appearance",
  "appearance.desc": "Accent colour and interface font. Reading size is shared with the header stepper.",
  "appearance.accent": "Accent",
  "appearance.fontFamily": "Interface font",
  "appearance.readingSize": "Reading size",
  "appearance.readingSizeHint": "Affects conversation text only, not code",
  "accent.default": "Default",
  "accent.ocean": "Ocean",
  "accent.forest": "Forest",
  "accent.violet": "Violet",
  "font.default": "Follow system (default)",
  "font.system": "System sans",
  "font.yahei": "Microsoft YaHei",
  "font.serif": "Serif",
  "headerTools.title": "Header quick tools",
  "headerTools.desc": "A few always-reachable controls in the session header.",
  "headerTools.sidebarToggle": "Sidebar toggle",
  "headerTools.sidebarToggleHint": "Collapse or expand the left column",
  "headerTools.readingSize": "Reading-size stepper",
  "headerTools.readingSizeHint": "Step the reading size from the header",
  "tools.sidebar": "Toggle sidebar",
  "tools.smaller": "Decrease reading size",
  "tools.larger": "Increase reading size",
  "note.storage": "Preferences live in the booster section of ~/.dsh/settings.yaml; over a non-loopback address they last only for this session.",
  "preview.title": "Sidebar preview",
  "preview.desc": "While you are coding or handing over a link, the right Sidebar opens and loads it: code opens in VS Code on the right by default, pages and videos open in the web panel here.",
  "preview.tabTitle": "Web",
  "preview.empty": "Nothing here yet. It fills in as soon as the agent touches a file or gives you a link.",
  "preview.openExternal": "Open in browser",
  "preview.fullscreen": "Fullscreen",
  "preview.note": 'Embedding is up to the target site; if it refuses, the pane stays blank \u2014 use "Open in browser" above.',
  "preview.links": "Open links automatically",
  "preview.linkMode.all": "Any link",
  "preview.linkMode.video": "Video links only",
  "preview.hint": 'This covers http links in replies only; code files follow "Where code opens" above.',
  "preview.fileOpen": "Where code opens",
  "preview.fileOpenHint": "After the agent writes or edits a file",
  "preview.fileOpen.vscode": "VS Code in the right Sidebar (started on demand)",
  "preview.fileOpen.preview": "The product's own previewer",
  "preview.fileOpen.off": "Don't open automatically",
  "preview.vscodeTab": "VS Code",
  "preview.vscodeNote": "The real VS Code (code-server) that this plugin starts on demand. Blank pane? The service is not up yet \u2014 it starts by itself the first time a file is written, or run the launcher in tools/ once.",
  "preview.openVSCode": "Open VS Code in the right Sidebar",
  "preview.openVSCodeHint": "No need to wait for a link to show up in a reply",
  "preview.openVSCodeAction": "Open",
  "preview.codeServer.label": "VS Code in the right Sidebar (code-server)",
  "preview.codeServer.state.unknown": "Checking\u2026",
  "preview.codeServer.state.have": "Found it \u2014 ready to use",
  "preview.codeServer.state.none": "The service is not running (the plugin never autostarts it)",
  "preview.codeServer.state.starting": "Not running \u2014 asking the host to start it\u2026",
  "preview.codeServer.startingHint": "It should become the workbench within a few seconds. If it does not, use one of the two commands below.",
  "preview.codeServer.hint": "Already installed? The first command starts it. Not installed yet? The second installs it (~675 MB, separate program, Windows only).",
  "preview.codeServer.startLabel": "Start it (already installed)",
  "preview.codeServer.installLabel": "Install it (not yet installed)",
  "preview.codeServer.showCommand": "Show the commands",
  "preview.codeServer.hideCommand": "Hide the command",
  "preview.codeServer.recheck": "I installed it \u2014 check again",
  "preview.codeServer.useBuiltin": "Use the built-in previewer",
  "preview.codeServer.useVscode": "Open in the Sidebar VS Code again",
  "preview.address": "Address",
  "preview.addressPlaceholder": "Type or paste a URL, then press Enter",
  "preview.addressGo": "Load",
  "preview.addressFollow": "Follow links",
  "unit.px": "px"
};
function fallbackTranslate(key, params) {
  const template = zh[key] ?? key;
  if (params === void 0) return template;
  return template.replace(/\{(\w+)\}/g, (match, name2) => {
    const value = params[name2];
    return value === void 0 ? match : String(value);
  });
}
function installLocale(ctx) {
  const locale = service(ctx, "locale");
  if (locale === void 0) return fallbackTranslate;
  try {
    ctx.effect(() => locale.register(LOCALE_NAMESPACE, { zh, en }), "dsh-booster: locale dictionaries");
    const bound = locale.bind(LOCALE_NAMESPACE);
    return (key, params) => {
      try {
        const value = bound(key, params);
        return typeof value === "string" && value.length > 0 ? value : fallbackTranslate(key, params);
      } catch {
        return fallbackTranslate(key, params);
      }
    };
  } catch (error) {
    console.error("[dsh-booster] locale registration failed:", error);
    return fallbackTranslate;
  }
}

// src/client/styles.ts
var PLUGIN_ID = "dsh-booster";
function injectStylesheet(name2, css) {
  if (typeof document === "undefined") return () => {
  };
  const tag = document.createElement("style");
  tag.dataset.plugin = PLUGIN_ID;
  tag.dataset.pluginCss = `${PLUGIN_ID}/${name2}`;
  tag.textContent = css;
  document.head.appendChild(tag);
  return () => {
    tag.remove();
  };
}
var SETTINGS_PAGE_CSS = `
.booster-page { display: flex; flex-direction: column; gap: 18px; padding: 4px 2px 24px; }
.booster-page__intro { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.6; margin: 0; }
.booster-card {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.booster-card__head { display: flex; align-items: flex-start; gap: 12px; }
.booster-card__titles { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.booster-card__title { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.booster-card__desc { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.5; }
.booster-card__body { display: flex; flex-direction: column; gap: 10px; }
.booster-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.booster-row__label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.booster-row__hint { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
.booster-row__control { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }
.booster-select {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-radius: 7px;
  padding: 5px 9px;
  font-size: 12px;
  min-width: 132px;
  cursor: pointer;
}
.booster-switch { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; }
.booster-switch input { width: 15px; height: 15px; cursor: pointer; accent-color: var(--dsw-alias-brand-primary); }
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
.booster-stepper { display: inline-flex; align-items: center; border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; overflow: hidden; }
.booster-stepper button {
  border: 0;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  width: 26px;
  height: 26px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.booster-stepper button:disabled { opacity: 0.4; cursor: default; }
.booster-stepper__value { min-width: 44px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-primary); }
.booster-note { font-size: 11px; color: var(--dsw-alias-label-secondary); line-height: 1.6; margin: 0; }
`;
var HEADER_TOOLS_CSS = `
.booster-tools { display: inline-flex; align-items: center; gap: 4px; }
.booster-tools__btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.booster-tools__btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.booster-tools__btn:disabled { opacity: 0.4; cursor: default; }
.booster-tools__size { min-width: 34px; text-align: center; font-size: 11px; color: var(--dsw-alias-label-secondary); }
`;
var PREVIEW_CSS = `
.booster-preview { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.booster-preview__address { display: flex; flex: 1 1 auto; min-width: 0; align-items: center; gap: 4px; }
.booster-preview__input {
  appearance: none;
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 11px;
}
.booster-preview__input:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.booster-preview__head {
  display: flex; align-items: center; gap: 8px; flex: 0 0 auto;
  padding: 7px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.booster-preview__url {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  direction: rtl; text-align: left; font-size: 11px; color: var(--dsw-alias-label-secondary);
}
.booster-preview__action {
  flex: 0 0 auto; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary); border-radius: 6px; padding: 2px 7px; font-size: 11px; cursor: pointer;
}
.booster-preview__action:hover { color: var(--dsw-alias-label-primary); }
.booster-preview__open { flex: 0 0 auto; font-size: 11px; color: var(--dsw-alias-brand-primary); text-decoration: none; }
.booster-preview__open:hover { text-decoration: underline; }
.booster-preview__frame { flex: 1 1 auto; min-height: 0; background: var(--dsw-alias-bg-base); }
.booster-preview__frame:fullscreen { background: #000; }
.booster-preview__iframe { width: 100%; height: 100%; border: 0; display: block; }
.booster-preview__video { width: 100%; max-height: 100%; display: block; background: #000; }
.booster-preview__note {
  flex: 0 0 auto; margin: 0; padding: 6px 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-secondary);
}
.booster-preview__empty { padding: 18px 14px; font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
`;

// src/client/modules/appearance.ts
var ACCENTS = {
  ocean: { light: "#0f7bd8", dark: "#4aa8ff" },
  forest: { light: "#12855f", dark: "#3fbe92" },
  violet: { light: "#7a5cf0", dark: "#a58cff" }
};
var FONT_STACKS = {
  system: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  yahei: '"Microsoft YaHei", "\u5FAE\u8F6F\u96C5\u9ED1", "PingFang SC", system-ui, sans-serif',
  serif: 'Georgia, "Songti SC", "SimSun", "\u5B8B\u4F53", serif'
};
var ACCENT_LAYER = "dsh-booster/accent";
var appearanceModule = {
  id: "appearance",
  titleKey: "appearance.title",
  descKey: "appearance.desc",
  defaultEnabled: true,
  configOf: (settings) => settings.appearance,
  apply({ ctx, settings }) {
    const disposers = [];
    const { accent, fontFamily } = settings.appearance;
    if (accent !== "default") {
      const theme = service(ctx, "theme");
      const pair = ACCENTS[accent];
      if (theme !== void 0 && pair !== void 0) {
        try {
          disposers.push(theme.overrideTokens(ACCENT_LAYER, {
            "--dsw-alias-brand-primary": { light: pair.light, dark: pair.dark }
          }));
        } catch (error) {
          console.error("[dsh-booster] accent override failed:", error);
        }
      }
    }
    if (fontFamily !== "default") {
      const stack = FONT_STACKS[fontFamily];
      if (stack !== void 0) {
        disposers.push(injectStylesheet("appearance-font", `:root { --dsw-font-family: ${stack}; }`));
      }
    }
    return () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (error) {
          console.error("[dsh-booster] appearance teardown failed:", error);
        }
      }
    };
  }
};

// src/client/modules/header-tools.tsx
var import_react = require("react");

// src/client/theme.ts
var FONT_SIZE_MIN = 12;
var FONT_SIZE_MAX = 17;
function readFontSize(ctx) {
  const theme = service(ctx, "theme");
  if (theme === void 0) return 14;
  try {
    const size = theme.getTheme().fontSize;
    return typeof size === "number" && Number.isFinite(size) ? size : 14;
  } catch {
    return 14;
  }
}
function writeFontSize(ctx, px) {
  const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(px)));
  const theme = service(ctx, "theme");
  if (theme === void 0) return clamped;
  try {
    theme.setFontSize(clamped);
  } catch (error) {
    console.error("[dsh-booster] setFontSize failed:", error);
  }
  return clamped;
}
function subscribeTheme(ctx, listener) {
  try {
    const dispose = ctx.on("theme/change", () => {
      listener();
    });
    return typeof dispose === "function" ? dispose : () => {
    };
  } catch (error) {
    console.error("[dsh-booster] theme/change subscription failed:", error);
    return () => {
    };
  }
}

// src/client/modules/header-tools.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var SLOT = "conversation.session.header.utilities";
function HeaderTools({ ctx, config, t }) {
  const [size, setSize] = (0, import_react.useState)(() => readFontSize(ctx));
  (0, import_react.useEffect)(() => subscribeTheme(ctx, () => setSize(readFontSize(ctx))), [ctx]);
  const layout = service(ctx, "layout");
  const toggleSidebar = () => {
    if (layout === void 0) return;
    try {
      layout.toggleSidebar();
    } catch (error) {
      console.error("[dsh-booster] toggleSidebar failed:", error);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "booster-tools", children: [
    config.sidebarToggle && layout !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "booster-tools__btn",
        title: t("tools.sidebar"),
        "aria-label": t("tools.sidebar"),
        onClick: toggleSidebar,
        children: "\u21E4"
      }
    ),
    config.readingSize && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "booster-tools__btn",
          title: t("tools.smaller"),
          "aria-label": t("tools.smaller"),
          disabled: size <= FONT_SIZE_MIN,
          onClick: () => setSize(writeFontSize(ctx, size - 1)),
          children: "\u2212"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "booster-tools__size", children: `${size}${t("unit.px")}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "booster-tools__btn",
          title: t("tools.larger"),
          "aria-label": t("tools.larger"),
          disabled: size >= FONT_SIZE_MAX,
          onClick: () => setSize(writeFontSize(ctx, size + 1)),
          children: "+"
        }
      )
    ] })
  ] });
}
var headerToolsModule = {
  id: "headerTools",
  titleKey: "headerTools.title",
  descKey: "headerTools.desc",
  defaultEnabled: true,
  configOf: (settings) => settings.headerTools,
  apply({ ctx, settings, t }) {
    const disposeCss = injectStylesheet("header-tools", HEADER_TOOLS_CSS);
    const disposeSlot = ctx.slots.inject(
      SLOT,
      () => ctx.slots.register(
        { id: "dsh-booster-tools", name: SLOT, order: 40, label: () => t("headerTools.title") },
        () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderTools, { ctx, config: settings.headerTools, t })
      )
    );
    return () => {
      try {
        disposeSlot();
      } catch (error) {
        console.error("[dsh-booster] header-tools slot teardown failed:", error);
      }
      disposeCss();
    };
  }
};

// src/client/modules/preview.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var PREVIEW_TYPE_ID = "dsh-booster/preview-web";
var PREVIEW_KIND = "booster-preview-web";
var WATCH_SLOT = "conversation.input.dock";
function createPreviewStore() {
  const targets = /* @__PURE__ */ new Map();
  const listeners = /* @__PURE__ */ new Set();
  let lastSession;
  return {
    get: (sessionId) => targets.get(sessionId),
    activeSession: () => lastSession,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(sessionId, target) {
      targets.set(sessionId, target);
      lastSession = sessionId;
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          console.error("[dsh-booster] preview listener failed:", error);
        }
      }
    }
  };
}
var DIRECT_MEDIA = /\.(mp4|webm|ogv|ogg|mov|m4v|m3u8)(?:[?#]|$)/i;
var URL_PATTERN = /https?:\/\/[^\s<>()"'`\]]+/g;
var SERVICE_URL = /^https?:\/\/(?:127\.0\.0\.1|localhost):8443(?:[/?#]|$)/i;
var SERVICE_PORT = 8443;
var SERVICE_HOME = `http://127.0.0.1:${SERVICE_PORT}/`;
var VSCODE_TYPE_ID = "dsh-booster/vscode";
var VSCODE_KIND = "booster-vscode";
var CODE_SERVER_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\web\\node_modules\\dsh-booster"',
  "powershell -ExecutionPolicy Bypass -File tools\\setup-code-server.ps1"
].join("\n");
var START_COMMAND = [
  'cd "$env:USERPROFILE\\.dsh\\profiles\\web\\node_modules\\dsh-booster"',
  "powershell -ExecutionPolicy Bypass -File tools\\start-code-server.ps1"
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
async function resolveCodeServer(input) {
  const probe = input.probe ?? probeService;
  let up = false;
  try {
    up = await probe();
  } catch {
    up = false;
  }
  const state = up ? "have" : "none";
  input.set({ ...input.settings, codeServer: state });
  return state;
}
function isServiceLink(url) {
  return SERVICE_URL.test(url);
}
function fileAddress(sessionId, path) {
  const segments = path.replace(/\\/g, "/").split("/").filter((segment) => segment.length > 0).map((segment) => encodeURIComponent(segment)).join("/");
  return `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${segments}`;
}
function targetOf(url) {
  if (DIRECT_MEDIA.test(url)) return { url, source: url, render: "video" };
  const youtube = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (youtube !== null) {
    return { url: `https://www.youtube.com/embed/${youtube[1]}`, source: url, render: "iframe" };
  }
  const bilibili = /bilibili\.com\/video\/(BV[\w]+)/.exec(url);
  if (bilibili !== null) {
    return {
      url: `https://player.bilibili.com/player.html?bvid=${bilibili[1]}&page=1&high_quality=1&as_wide=1&danmaku=0&autoplay=0`,
      source: url,
      render: "iframe"
    };
  }
  return { url, source: url, render: "iframe" };
}
function isVideoLink(url) {
  return DIRECT_MEDIA.test(url) || /youtube\.com|youtu\.be|bilibili\.com|vimeo\.com/i.test(url);
}
function newestLink(chat, mode) {
  const nodes = chat.legacy?.nodes;
  if (!Array.isArray(nodes)) return void 0;
  let best;
  for (const node of nodes) {
    if (node === null || typeof node !== "object" || node.kind !== "assistant") continue;
    if (!Array.isArray(node.blocks)) continue;
    const text = node.blocks.filter((block) => block?.kind === "text" && typeof block.text === "string").map((block) => block.text ?? "").join("\n");
    const urls = text.match(URL_PATTERN);
    if (urls === null || urls.length === 0) continue;
    const seq = typeof node.seq === "number" ? node.seq : 0;
    for (const candidate of urls) {
      if (isServiceLink(candidate)) continue;
      if (mode === "video" && !isVideoLink(candidate)) continue;
      if (best === void 0 || seq >= best.seq) best = { seq, url: candidate };
    }
  }
  return best?.url;
}
function filePathOf(raw) {
  if (typeof raw !== "string" || raw.length === 0) return void 0;
  try {
    const args = JSON.parse(raw);
    if (args === null || typeof args !== "object") return void 0;
    const path = args.file_path;
    return typeof path === "string" && path.length > 0 ? path : void 0;
  } catch {
    return void 0;
  }
}
function readTabsFace(source) {
  try {
    const viaProperty = source.sidebarRightTabs;
    if (viaProperty !== void 0 && viaProperty !== null) return viaProperty;
  } catch {
  }
  return resolveService(source, "sidebarRightTabs");
}
function reveal(ctx, open) {
  const sidebar = resolveService(ctx, "sidebarRight");
  if (sidebar === void 0) return;
  try {
    if ("kind" in open) sidebar.openTab(open.kind, { params: { source: "dsh-booster" } });
    else sidebar.openResource(open.address);
  } catch (error) {
    console.error("[dsh-booster] revealing the preview failed:", error);
  }
}
function openVSCodeTab(ctx) {
  reveal(ctx, { kind: VSCODE_KIND });
}
function PreviewWatcher({ ctx, store, mode, fileOpen, codeServer, manualUrl, sessionId, useChat }) {
  const chat = useChat?.((snapshot) => snapshot);
  const paths = (0, import_react2.useRef)(/* @__PURE__ */ new Map());
  const settled = (0, import_react2.useRef)(/* @__PURE__ */ new Set());
  const loadedLinks = (0, import_react2.useRef)(/* @__PURE__ */ new Set());
  const vscodeShown = (0, import_react2.useRef)(false);
  (0, import_react2.useEffect)(() => {
    if (chat === void 0 || sessionId === void 0) return;
    const useBuiltin = fileOpen === "preview" || fileOpen === "vscode" && codeServer === "none";
    const running = useBuiltin ? chat.legacy?.runningCalls ?? [] : [];
    const runningIds = new Set(running.map((call) => call.callId));
    for (const call of running) {
      if (call.name !== "write" && call.name !== "edit") continue;
      if (paths.current.has(call.callId)) continue;
      const path = filePathOf(call.argsRaw);
      if (path === void 0) continue;
      paths.current.set(call.callId, path);
      reveal(ctx, { address: fileAddress(sessionId, path) });
    }
    for (const [callId, path] of [...paths.current]) {
      if (runningIds.has(callId) || settled.current.has(callId)) continue;
      settled.current.add(callId);
      reveal(ctx, { address: fileAddress(sessionId, path) });
    }
    if (fileOpen === "vscode" && !vscodeShown.current) {
      const busy = (chat.legacy?.runningCalls ?? []).some((call) => call.name === "write" || call.name === "edit");
      if (busy) {
        vscodeShown.current = true;
        reveal(ctx, { kind: VSCODE_KIND });
      }
    }
    const url = manualUrl.trim() === "" ? newestLink(chat, mode) : void 0;
    if (url !== void 0 && !loadedLinks.current.has(url)) {
      loadedLinks.current.add(url);
      store.set(sessionId, targetOf(url));
      reveal(ctx, { kind: PREVIEW_KIND });
    }
  }, [chat, mode, fileOpen, codeServer, manualUrl, sessionId, store, ctx]);
  return null;
}
function AddressField({ value, pinned, onSubmit, placeholder, label, action, follow }) {
  const [draft, setDraft] = (0, import_react2.useState)(value);
  (0, import_react2.useEffect)(() => {
    setDraft(value);
  }, [value]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "form",
    {
      className: "booster-preview__address",
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit(draft.trim());
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: "booster-preview__input",
            type: "text",
            value: draft,
            placeholder,
            "aria-label": label,
            onChange: (event) => setDraft(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "submit", className: "booster-preview__action", children: action }),
        pinned && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "booster-preview__action", onClick: () => onSubmit(""), children: follow })
      ]
    }
  );
}
function FramePane({ target, note, t, address }) {
  const frame = (0, import_react2.useRef)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "booster-preview", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "booster-preview__head", children: [
      address === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "booster-preview__url", title: target.source, children: target.source }) : address,
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "booster-preview__action",
          "data-booster-fullscreen": "true",
          onClick: goFullscreen,
          title: t("preview.fullscreen"),
          "aria-label": t("preview.fullscreen"),
          children: t("preview.fullscreen")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { className: "booster-preview__open", href: target.source, target: "_blank", rel: "noreferrer noopener", children: t("preview.openExternal") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-preview__frame", ref: frame, children: target.render === "video" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "video",
      {
        className: "booster-preview__video",
        src: target.url,
        controls: true,
        playsInline: true,
        referrerPolicy: "no-referrer"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "iframe",
      {
        className: "booster-preview__iframe",
        src: target.url,
        title: target.source,
        sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation",
        allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
        allowFullScreen: true
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "booster-preview__note", children: note })
  ] });
}
function WebPanel(props) {
  const { store, t, url, setUrl } = props;
  const [, bump] = (0, import_react2.useState)(0);
  (0, import_react2.useEffect)(() => store.subscribe(() => bump((value) => value + 1)), [store]);
  const sessionId = props.sessionId ?? store.activeSession();
  const typed = url.trim();
  const followed = sessionId === void 0 ? void 0 : store.get(sessionId);
  const target = typed !== "" ? targetOf(typed) : followed;
  const address = /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    AddressField,
    {
      value: typed !== "" ? typed : followed?.source ?? "",
      pinned: typed !== "",
      onSubmit: setUrl,
      placeholder: t("preview.addressPlaceholder"),
      label: t("preview.address"),
      action: t("preview.addressGo"),
      follow: t("preview.addressFollow")
    }
  );
  if (target === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "booster-preview", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("header", { className: "booster-preview__head", children: address }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "booster-preview__empty", children: t("preview.empty") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FramePane, { target, note: t("preview.note"), t, address });
}
function CodeServerRow(props) {
  const { preview, set, t, recheck, starting = false } = props;
  const [showCommand, setShowCommand] = (0, import_react2.useState)(false);
  const state = preview.codeServer;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "booster-codeserver", "data-booster-code-server": state, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-row__label", children: t("preview.codeServer.label") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-row__hint", children: starting ? t("preview.codeServer.state.starting") : t(`preview.codeServer.state.${state}`) }),
    state !== "have" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-row__hint", children: starting ? t("preview.codeServer.startingHint") : t("preview.codeServer.hint") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "booster-codeserver__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "booster-button", onClick: () => setShowCommand((open) => !open), children: t(showCommand ? "preview.codeServer.hideCommand" : "preview.codeServer.showCommand") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "booster-button", onClick: recheck, children: t("preview.codeServer.recheck") }),
        preview.fileOpen !== "preview" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "booster-button", onClick: () => set({ ...preview, fileOpen: "preview" }), children: t("preview.codeServer.useBuiltin") })
      ] }),
      showCommand && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-row__hint", children: t("preview.codeServer.startLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { className: "booster-codeserver__command", children: START_COMMAND }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-row__hint", children: t("preview.codeServer.installLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { className: "booster-codeserver__command", children: CODE_SERVER_COMMAND })
      ] })
    ] }),
    state === "have" && preview.fileOpen !== "vscode" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-codeserver__actions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "booster-button", onClick: () => set({ ...preview, fileOpen: "vscode" }), children: t("preview.codeServer.useVscode") }) })
  ] });
}
function VSCodePanel(props) {
  const { t, store } = props;
  const [preview, setPreview] = (0, import_react2.useState)(() => store.get().preview);
  (0, import_react2.useEffect)(() => store.subscribe(() => setPreview(store.get().preview)), [store]);
  const recheck = () => {
    startAsked = false;
    void resolveCodeServer({ settings: store.get().preview, set: (value) => store.set("preview", value) });
  };
  const asked = preview.startRequest > 0;
  (0, import_react2.useEffect)(() => {
    if (preview.codeServer === "have" || asked || startAsked) return;
    startAsked = true;
    store.set("preview", { ...store.get().preview, startRequest: Date.now() });
  }, [preview.codeServer, asked, store]);
  if (preview.codeServer !== "have") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "booster-preview__empty", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      CodeServerRow,
      {
        preview,
        set: (value) => store.set("preview", value),
        t,
        recheck,
        starting: asked
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    FramePane,
    {
      target: { url: SERVICE_HOME, source: SERVICE_HOME, render: "iframe" },
      note: t("preview.vscodeNote"),
      t
    }
  );
}
var probedOnce = false;
var startAsked = false;
var previewModule = {
  id: "preview",
  titleKey: "preview.title",
  descKey: "preview.desc",
  defaultEnabled: true,
  configOf: (settings) => settings.preview,
  apply({ ctx, settings, t, store: settingsStore }) {
    const store = createPreviewStore();
    const disposers = [];
    let started = false;
    let disposed = false;
    const report = (reason) => {
      try {
        const slots = ctx.slots;
        disposers.push(
          slots.inject(
            "shell.overlay",
            () => slots.register({ id: `dsh-booster-diag-${reason}`, name: "shell.overlay" }, (() => null))
          )
        );
      } catch {
      }
    };
    const start = (tabs, mode2, fileOpen2, codeServer2) => {
      if (started || disposed) return;
      started = true;
      const slots = ctx.slots;
      disposers.push(injectStylesheet("preview", PREVIEW_CSS));
      try {
        disposers.push(
          tabs.register({
            id: PREVIEW_TYPE_ID,
            kind: PREVIEW_KIND,
            // A third-party type; the band only matters for resource claiming.
            priority: "extension",
            title: () => t("preview.tabTitle")
          })
        );
        disposers.push(
          tabs.register({
            id: VSCODE_TYPE_ID,
            kind: VSCODE_KIND,
            priority: "extension",
            title: () => t("preview.vscodeTab")
          })
        );
      } catch (error) {
        console.error("[dsh-booster] registering the preview tab type failed:", error);
        report("register-failed");
        return;
      }
      disposers.push(
        slots.inject(
          "sidebar.right.pane.tab",
          () => slots.register(
            { name: "sidebar.right.pane.tab", key: PREVIEW_TYPE_ID },
            ((slotProps) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              WebPanel,
              {
                ...slotProps,
                store,
                t,
                url: settings.preview.url,
                setUrl: (value) => settingsStore.set("preview", { ...settingsStore.get().preview, url: value })
              }
            ))
          )
        )
      );
      disposers.push(
        slots.inject(
          "sidebar.right.pane.tab",
          () => slots.register(
            { name: "sidebar.right.pane.tab", key: VSCODE_TYPE_ID },
            (() => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(VSCodePanel, { t, store: settingsStore }))
          )
        )
      );
      disposers.push(
        slots.inject(
          WATCH_SLOT,
          () => slots.register(
            { id: "dsh-booster-preview-watch", name: WATCH_SLOT, order: 90 },
            ((slotProps) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              PreviewWatcher,
              {
                ...slotProps,
                ctx,
                store,
                mode: mode2,
                fileOpen: fileOpen2,
                codeServer: codeServer2,
                manualUrl: settings.preview.url
              }
            ))
          )
        )
      );
    };
    if (settings.preview.codeServer !== "have" && !probedOnce) {
      probedOnce = true;
      void resolveCodeServer({
        settings: settingsStore.get().preview,
        set: (value) => {
          if (value.codeServer !== settingsStore.get().preview.codeServer) settingsStore.set("preview", value);
        }
      });
    }
    const mode = settings.preview.linkMode;
    const fileOpen = settings.preview.fileOpen;
    const codeServer = settings.preview.codeServer;
    const immediate = readTabsFace(ctx);
    if (immediate !== void 0) {
      start(immediate, mode, fileOpen, codeServer);
    } else {
      const inject2 = ctx.inject;
      if (typeof inject2 === "function") {
        try {
          const disposeInjection = inject2.call(ctx, ["sidebarRightTabs"], (scoped) => {
            const tabs = readTabsFace(scoped);
            if (tabs === void 0) {
              report("inject-no-service");
              return;
            }
            start(tabs, mode, fileOpen, codeServer);
          });
          if (typeof disposeInjection === "function") disposers.push(disposeInjection);
        } catch (error) {
          console.error("[dsh-booster] waiting for sidebarRightTabs failed:", error);
          report("inject-threw");
        }
      } else {
        report("no-inject");
      }
    }
    return () => {
      disposed = true;
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (error) {
          console.error("[dsh-booster] preview teardown failed:", error);
        }
      }
    };
  }
};

// src/client/modules/index.ts
var MODULES = [previewModule, appearanceModule, headerToolsModule];

// src/client/runtime.ts
function createStore(ctx, scope) {
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        console.error("[dsh-booster] store listener failed:", error);
      }
    }
  };
  ctx.effect(() => scope.subscribe(emit), "dsh-booster: settings mirror");
  return {
    get: () => normalizeBoosterSettings(scope.getSnapshot().value),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(field, value) {
      try {
        scope.set(field, value);
      } catch (error) {
        console.error(`[dsh-booster] writing "${String(field)}" failed:`, error);
      }
    }
  };
}
function signatureOf(module2, settings) {
  try {
    return JSON.stringify(module2.configOf(settings));
  } catch {
    return "";
  }
}
function createModuleManager(ctx, store, modules, t) {
  const applied = /* @__PURE__ */ new Map();
  const disposeOne = (id) => {
    const entry = applied.get(id);
    if (entry === void 0) return;
    applied.delete(id);
    try {
      entry.dispose();
    } catch (error) {
      console.error(`[dsh-booster] module "${id}" teardown failed:`, error);
    }
  };
  const sync = () => {
    const settings = store.get();
    for (const module2 of modules) {
      const enabled = settings.modules[module2.id] ?? module2.defaultEnabled;
      const existing = applied.get(module2.id);
      if (!enabled) {
        if (existing !== void 0) disposeOne(module2.id);
        continue;
      }
      const signature = signatureOf(module2, settings);
      if (existing !== void 0 && existing.signature === signature) continue;
      if (existing !== void 0) disposeOne(module2.id);
      try {
        const dispose = module2.apply({ ctx, settings, t, store });
        applied.set(module2.id, {
          signature,
          dispose: typeof dispose === "function" ? dispose : () => {
          }
        });
      } catch (error) {
        console.error(`[dsh-booster] module "${module2.id}" failed to apply:`, error);
      }
    }
  };
  return {
    sync,
    disposeAll: () => {
      for (const id of [...applied.keys()]) disposeOne(id);
    }
  };
}

// src/client/settings-page.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ReadingSizeRow({ size, setSize, t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("appearance.readingSize") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__hint", children: t("appearance.readingSizeHint") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "booster-stepper", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", disabled: size <= FONT_SIZE_MIN, onClick: () => setSize(size - 1), "aria-label": t("tools.smaller"), children: "\u2212" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "booster-stepper__value", children: `${size}${t("unit.px")}` }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", disabled: size >= FONT_SIZE_MAX, onClick: () => setSize(size + 1), "aria-label": t("tools.larger"), children: "+" })
    ] }) })
  ] });
}
function CheckRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: props.label }),
      props.hint !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__hint", children: props.hint })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "booster-switch", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked: props.checked, onChange: (event) => props.onChange(event.target.checked) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "booster-row__label", children: props.t("module.enable") })
    ] }) })
  ] });
}
var BODIES = {
  appearance: ({ settings, store, t, size, setSize }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("appearance.accent") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "select",
        {
          className: "booster-select",
          value: settings.appearance.accent,
          onChange: (event) => store.set("appearance", { ...settings.appearance, accent: event.target.value }),
          children: ACCENT_CHOICES.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: choice, children: t(`accent.${choice}`) }, choice))
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("appearance.fontFamily") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "select",
        {
          className: "booster-select",
          value: settings.appearance.fontFamily,
          onChange: (event) => store.set("appearance", { ...settings.appearance, fontFamily: event.target.value }),
          children: FONT_FAMILY_CHOICES.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: choice, children: t(`font.${choice}`) }, choice))
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReadingSizeRow, { size, setSize, t })
  ] }),
  headerTools: ({ settings, store, t }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CheckRow,
      {
        t,
        label: t("headerTools.sidebarToggle"),
        hint: t("headerTools.sidebarToggleHint"),
        checked: settings.headerTools.sidebarToggle,
        onChange: (next) => store.set("headerTools", { ...settings.headerTools, sidebarToggle: next })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CheckRow,
      {
        t,
        label: t("headerTools.readingSize"),
        hint: t("headerTools.readingSizeHint"),
        checked: settings.headerTools.readingSize,
        onChange: (next) => store.set("headerTools", { ...settings.headerTools, readingSize: next })
      }
    )
  ] }),
  preview: ({ settings, store, t, openVSCode }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CodeServerRow,
      {
        preview: settings.preview,
        set: (value) => store.set("preview", value),
        t,
        recheck: () => {
          void resolveCodeServer({ settings: store.get().preview, set: (value) => store.set("preview", value) });
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("preview.openVSCode") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__hint", children: t("preview.openVSCodeHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "booster-button", onClick: openVSCode, children: t("preview.openVSCodeAction") }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("preview.fileOpen") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__hint", children: t("preview.fileOpenHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "select",
        {
          className: "booster-select",
          value: settings.preview.fileOpen,
          onChange: (event) => store.set("preview", { ...settings.preview, fileOpen: event.target.value }),
          children: FILE_OPEN_TARGETS.map((target) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: target, children: t(`preview.fileOpen.${target}`) }, target))
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__label", children: t("preview.links") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__hint", children: t("preview.hint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-row__control", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "select",
        {
          className: "booster-select",
          value: settings.preview.linkMode,
          onChange: (event) => store.set("preview", { ...settings.preview, linkMode: event.target.value }),
          children: LINK_MODES.map((mode) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: mode, children: t(`preview.linkMode.${mode}`) }, mode))
        }
      ) })
    ] })
  ] })
};
function createSettingsPage(options) {
  const { ctx, store, t, modules } = options;
  return function BoosterSettingsPage() {
    const [settings, setSettings] = (0, import_react3.useState)(() => store.get());
    const [size, setSize] = (0, import_react3.useState)(() => readFontSize(ctx));
    (0, import_react3.useEffect)(() => store.subscribe(() => setSettings(store.get())), []);
    (0, import_react3.useEffect)(() => subscribeTheme(ctx, () => setSize(readFontSize(ctx))), []);
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "booster-page__intro", children: t("section.desc") }),
      modules.map((module2) => {
        const enabled = settings.modules[module2.id] ?? module2.defaultEnabled;
        const body = BODIES[module2.id];
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "booster-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-card__head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "booster-card__titles", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "booster-card__title", children: t(module2.titleKey) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "booster-card__desc", children: t(module2.descKey) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "booster-switch", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: enabled,
                  onChange: (event) => store.set("modules", { ...settings.modules, [module2.id]: event.target.checked })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "booster-row__label", children: t("module.enable") })
            ] })
          ] }),
          enabled && body !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "booster-card__body", children: body({
            settings,
            store,
            t,
            size,
            setSize: (px) => setSize(writeFontSize(ctx, px)),
            openVSCode: () => openVSCodeTab(ctx)
          }) })
        ] }, module2.id);
      }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "booster-note", children: t("note.storage") })
    ] });
  };
}

// src/client/index.ts
var name = "dsh-booster";
var inject = ["slots", "settingsScope"];
function apply(ctx) {
  try {
    const t = installLocale(ctx);
    const scope = ctx.settingsScope.bind({ namespace: BOOSTER_NAMESPACE });
    const store = createStore(ctx, scope);
    const manager = createModuleManager(ctx, store, MODULES, t);
    ctx.effect(() => store.subscribe(() => manager.sync()), "dsh-booster: module sync");
    manager.sync();
    ctx.effect(() => () => manager.disposeAll(), "dsh-booster: module teardown");
    ctx.effect(() => injectStylesheet("settings-page", SETTINGS_PAGE_CSS), "dsh-booster: settings page stylesheet");
    const SettingsPage = createSettingsPage({ ctx, store, t, modules: MODULES });
    ctx.effect(
      () => ctx.slots.inject(
        "settings.section",
        () => ctx.slots.register(
          { id: "dsh-booster", name: "settings.section", order: 40, label: () => t("section.title") },
          SettingsPage
        )
      ),
      "dsh-booster: settings section"
    );
  } catch (error) {
    console.error("[dsh-booster] client apply failed:", error);
  }
}
return module.exports; } });
//# sourceMappingURL=client.js.map
