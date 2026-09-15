/**
 * Locale dictionaries for dsh-booster.
 *
 * Simplified Chinese is the key-set source of truth; the fallback translator
 * reads it directly, so a missing locale service degrades to Chinese copy
 * instead of blank labels.
 *
 * @module dsh-booster/client/locale
 */
import { service, type ClientContext, type LocaleService } from './types.ts'

/** The locale namespace this plugin registers. */
export const LOCALE_NAMESPACE = 'dsh-booster'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<string, string> = {
  'section.title': '增强套件',
  'section.desc': '按需开启的界面与交互优化。改完即时生效，配置写入本机 settings.yaml。',
  'module.enable': '启用',
  'modules.heading': '功能模块',
  'appearance.title': '外观',
  'appearance.desc': '强调色与界面字体。会话阅读字号由外观模块和标题栏共用同一份设置。',
  'appearance.accent': '强调色',
  'appearance.fontFamily': '界面字体',
  'appearance.readingSize': '会话阅读字号',
  'appearance.readingSizeHint': '仅影响会话正文，不改代码字号',
  'accent.default': '默认',
  'accent.ocean': '海蓝',
  'accent.forest': '森林',
  'accent.violet': '紫罗兰',
  'font.default': '跟随系统（默认）',
  'font.system': '系统无衬线',
  'font.yahei': '微软雅黑',
  'font.serif': '衬线（宋体）',
  'headerTools.title': '标题栏快捷工具',
  'headerTools.desc': '在会话标题栏放几个随手可用的控件，省得每次进设置。',
  'headerTools.sidebarToggle': '侧栏开关',
  'headerTools.sidebarToggleHint': '一键收起/展开左侧栏',
  'headerTools.readingSize': '字号步进',
  'headerTools.readingSizeHint': '在标题栏直接加减阅读字号',
  'tools.sidebar': '收起 / 展开侧栏',
  'tools.smaller': '减小阅读字号',
  'tools.larger': '增大阅读字号',
  'note.storage': '配置保存在 ~/.dsh/settings.yaml 的 booster 段；通过非本机地址访问时仅本次会话有效。',
  'preview.title': '侧栏预览',
  'preview.desc': '你在写代码或给出链接时，右侧栏自动弹出并加载：代码默认在右侧的 VS Code 里打开，网页和视频在这个网页面板里打开。',
  'preview.tabTitle': '网页',
  'preview.empty': '还没有内容。模型改文件或给出链接时会自动出现在这里。',
  'preview.openExternal': '在浏览器打开',
  'preview.fullscreen': '全屏',
  'preview.note': '能否嵌入由目标站点决定；被拒绝时会显示空白，此时用上面的「在浏览器打开」。窄栏里视频会糊，点「全屏」给它足够的像素。',
  'preview.links': '链接自动打开',
  'preview.linkMode.all': '所有链接',
  'preview.linkMode.video': '只开视频',
  'preview.hint': '只作用于回复里的 http 链接；代码文件看上面的「代码文件打开方式」。',
  'preview.fileOpen': '代码文件打开方式',
  'preview.fileOpenHint': '模型写完或改完文件后，那个文件去哪儿',
  'preview.fileOpen.vscode': '右侧 VS Code（按需启动）',
  'preview.fileOpen.preview': '产品自带预览器',
  'preview.fileOpen.off': '不自动打开',
  'preview.vscodeTab': 'VS Code',
  'preview.vscodeNote': '这是插件按需拉起的真 VS Code（code-server）。如果这里是空白：服务还没起来——首次写文件时它会自动启动，也可以先手动跑一次 tools 里的启动脚本。',
  'preview.openVSCode': '在右栏打开 VS Code',
  'preview.openVSCodeHint': '不用等回复里出现链接',
  'preview.openVSCodeAction': '打开',
  'preview.codeServer.label': '右侧 VS Code（code-server）',
  'preview.codeServer.state.unknown': '正在检测…',
  'preview.codeServer.state.have': '已检测到，可以用了',
  'preview.codeServer.state.none': '未检测到。不装也没关系：写文件会自动改用产品自带的预览器',
  'preview.codeServer.hint': '想要右侧那个真 VS Code（约 675 MB，独立程序，仅 Windows），跑这两行：',
  'preview.codeServer.showCommand': '查看安装命令',
  'preview.codeServer.hideCommand': '收起命令',
  'preview.codeServer.recheck': '我装好了，重新检测',
  'preview.codeServer.useBuiltin': '用产品自带预览器',
  'preview.codeServer.useVscode': '改回在右侧 VS Code 打开',
  'preview.address': '网址',
  'preview.addressPlaceholder': '输入或粘贴网址，回车加载',
  'preview.addressGo': '加载',
  'preview.addressFollow': '跟随链接',
  'unit.px': 'px',
}

/** English dictionary. */
export const en: Record<string, string> = {
  'section.title': 'Booster',
  'section.desc': 'Opt-in interface and interaction upgrades. Changes apply instantly; preferences persist in your local settings.yaml.',
  'module.enable': 'Enabled',
  'modules.heading': 'Modules',
  'appearance.title': 'Appearance',
  'appearance.desc': 'Accent colour and interface font. Reading size is shared with the header stepper.',
  'appearance.accent': 'Accent',
  'appearance.fontFamily': 'Interface font',
  'appearance.readingSize': 'Reading size',
  'appearance.readingSizeHint': 'Affects conversation text only, not code',
  'accent.default': 'Default',
  'accent.ocean': 'Ocean',
  'accent.forest': 'Forest',
  'accent.violet': 'Violet',
  'font.default': 'Follow system (default)',
  'font.system': 'System sans',
  'font.yahei': 'Microsoft YaHei',
  'font.serif': 'Serif',
  'headerTools.title': 'Header quick tools',
  'headerTools.desc': 'A few always-reachable controls in the session header.',
  'headerTools.sidebarToggle': 'Sidebar toggle',
  'headerTools.sidebarToggleHint': 'Collapse or expand the left column',
  'headerTools.readingSize': 'Reading-size stepper',
  'headerTools.readingSizeHint': 'Step the reading size from the header',
  'tools.sidebar': 'Toggle sidebar',
  'tools.smaller': 'Decrease reading size',
  'tools.larger': 'Increase reading size',
  'note.storage': 'Preferences live in the booster section of ~/.dsh/settings.yaml; over a non-loopback address they last only for this session.',
  'preview.title': 'Sidebar preview',
  'preview.desc': 'While you are coding or handing over a link, the right Sidebar opens and loads it: code opens in VS Code on the right by default, pages and videos open in the web panel here.',
  'preview.tabTitle': 'Web',
  'preview.empty': 'Nothing here yet. It fills in as soon as the agent touches a file or gives you a link.',
  'preview.openExternal': 'Open in browser',
  'preview.fullscreen': 'Fullscreen',
  'preview.note': 'Embedding is up to the target site; if it refuses, the pane stays blank — use "Open in browser" above.',
  'preview.links': 'Open links automatically',
  'preview.linkMode.all': 'Any link',
  'preview.linkMode.video': 'Video links only',
  'preview.hint': 'This covers http links in replies only; code files follow "Where code opens" above.',
  'preview.fileOpen': 'Where code opens',
  'preview.fileOpenHint': 'After the agent writes or edits a file',
  'preview.fileOpen.vscode': 'VS Code in the right Sidebar (started on demand)',
  'preview.fileOpen.preview': 'The product\'s own previewer',
  'preview.fileOpen.off': 'Don\'t open automatically',
  'preview.vscodeTab': 'VS Code',
  'preview.vscodeNote': 'The real VS Code (code-server) that this plugin starts on demand. Blank pane? The service is not up yet — it starts by itself the first time a file is written, or run the launcher in tools/ once.',
  'preview.openVSCode': 'Open VS Code in the right Sidebar',
  'preview.openVSCodeHint': 'No need to wait for a link to show up in a reply',
  'preview.openVSCodeAction': 'Open',
  'preview.codeServer.label': 'VS Code in the right Sidebar (code-server)',
  'preview.codeServer.state.unknown': 'Checking…',
  'preview.codeServer.state.have': 'Found it — ready to use',
  'preview.codeServer.state.none': 'Not found. That is fine: writing a file falls back to the built-in previewer',
  'preview.codeServer.hint': 'For the real VS Code in the right Sidebar (~675 MB, separate program, Windows only), run these two lines:',
  'preview.codeServer.showCommand': 'Show the install command',
  'preview.codeServer.hideCommand': 'Hide the command',
  'preview.codeServer.recheck': 'I installed it — check again',
  'preview.codeServer.useBuiltin': 'Use the built-in previewer',
  'preview.codeServer.useVscode': 'Open in the Sidebar VS Code again',
  'preview.address': 'Address',
  'preview.addressPlaceholder': 'Type or paste a URL, then press Enter',
  'preview.addressGo': 'Load',
  'preview.addressFollow': 'Follow links',
  'unit.px': 'px',
}

/** A translate function bound to this plugin's namespace. */
export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * Fallback translator over the Chinese dictionary.
 *
 * @param key - dictionary key.
 * @param params - optional `{name}` substitutions.
 * @returns the localized string, or the key itself when unknown.
 */
export function fallbackTranslate(key: string, params?: Record<string, string | number>): string {
  const template = zh[key] ?? key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * Register this plugin's dictionaries and bind a translator.
 *
 * Registration failure is contained: a missing or rejecting locale service
 * degrades to the built-in Chinese copy rather than blocking the plugin.
 *
 * @param ctx - the client root context.
 * @returns a translate function for this plugin's namespace.
 */
export function installLocale(ctx: ClientContext): Translate {
  const locale = service<LocaleService>(ctx, 'locale')
  if (locale === undefined) return fallbackTranslate
  try {
    ctx.effect(() => locale.register(LOCALE_NAMESPACE, { zh, en }), 'dsh-booster: locale dictionaries')
    const bound = locale.bind(LOCALE_NAMESPACE)
    return (key, params) => {
      try {
        const value = bound(key, params)
        return typeof value === 'string' && value.length > 0 ? value : fallbackTranslate(key, params)
      } catch {
        return fallbackTranslate(key, params)
      }
    }
  } catch (error) {
    console.error('[dsh-booster] locale registration failed:', error)
    return fallbackTranslate
  }
}
