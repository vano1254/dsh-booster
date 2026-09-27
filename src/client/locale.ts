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
  'vscode.title': '右侧 VS Code',
  'vscode.desc': '右侧栏里那个真的 VS Code（按需启动），以及写/改文件时交给谁。',
  'preview.fullscreen': '全屏',
  'preview.fileOpen': '代码文件打开方式',
  'preview.fileOpenHint': '模型写完或改完文件后，那个文件去哪儿',
  'preview.fileOpen.vscode': '右侧 VS Code（按需启动）',
  'preview.fileOpen.off': '只让 DSH 自己处理',
  'preview.vscodeTab': 'VS Code',
  'preview.vscodeNote': '这是插件按需拉起的真 VS Code（code-server）。如果这里是空白：服务还没起来——首次写文件时它会自动启动，也可以先手动跑一次 tools 里的启动脚本。',
  'preview.openVSCode': '在右栏打开 VS Code',
  'preview.openVSCodeHint': '不用等回复里出现链接',
  'preview.openVSCodeAction': '打开',
  'preview.codeServer.label': '右侧 VS Code（code-server）',
  'preview.codeServer.state.unknown': '正在检测…',
  'preview.codeServer.state.have': '已检测到，可以用了',
  'preview.codeServer.state.none': '服务没在运行（插件不会开机自启）',
  'preview.codeServer.state.starting': '服务没在运行 —— 正在请宿主启动它…',
  'preview.codeServer.startingHint': '几秒内应该会变成工作台。要是没变化，用下面两条命令之一手动处理。',
  'preview.codeServer.hint': '已经装了的话跑第一条启动它；还没装就第二条（约 675 MB 独立程序，仅 Windows）。',
  'preview.codeServer.startLabel': '启动（已安装）',
  'preview.codeServer.installLabel': '安装（还没装）',
  'preview.codeServer.showCommand': '查看命令',
  'preview.codeServer.hideCommand': '收起命令',
  'preview.codeServer.recheck': '我装好了，重新检测',
  'chime.title': '完成提示音',
  'chime.desc': '一轮回答结束后响一声，方便你去干别的。声音是插件自己合成的一小段低音钢琴，不是系统通知音。',
  'chime.minSeconds': '最短时长',
  'chime.minSecondsHint': '跑够这么久才响，免得每句"好的"都叮一声',
  'chime.minOption.0': '每次都响',
  'chime.minOption.3': '3 秒以上',
  'chime.minOption.5': '5 秒以上',
  'chime.minOption.10': '10 秒以上',
  'chime.onError': '出错也响',
  'chime.onErrorHint': '换成一声下行的音，听得出是"完了"还是"挂了"',
  'chime.preview': '试听',
  'chime.previewHint': '点一下由宿主播放 —— 声音在机器上，不在浏览器里',
  'chime.previewAction': '响一声',
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
  'vscode.title': 'VS Code in the right Sidebar',
  'vscode.desc': 'The real VS Code in the right Sidebar, started on demand, and where written files go.',
  'headerTools.sidebarToggle': 'Sidebar toggle',
  'headerTools.sidebarToggleHint': 'Collapse or expand the left column',
  'headerTools.readingSize': 'Reading-size stepper',
  'headerTools.readingSizeHint': 'Step the reading size from the header',
  'tools.sidebar': 'Toggle sidebar',
  'tools.smaller': 'Decrease reading size',
  'tools.larger': 'Increase reading size',
  'note.storage': 'Preferences live in the booster section of ~/.dsh/settings.yaml; over a non-loopback address they last only for this session.',
  'preview.fullscreen': 'Fullscreen',
  'preview.fileOpen': 'Where code opens',
  'preview.fileOpenHint': 'After the agent writes or edits a file',
  'preview.fileOpen.vscode': 'VS Code in the right Sidebar (started on demand)',
  'preview.fileOpen.off': 'Leave it to DSH',
  'preview.vscodeTab': 'VS Code',
  'preview.vscodeNote': 'The real VS Code (code-server) that this plugin starts on demand. Blank pane? The service is not up yet — it starts by itself the first time a file is written, or run the launcher in tools/ once.',
  'preview.openVSCode': 'Open VS Code in the right Sidebar',
  'preview.openVSCodeHint': 'No need to wait for a link to show up in a reply',
  'preview.openVSCodeAction': 'Open',
  'preview.codeServer.label': 'VS Code in the right Sidebar (code-server)',
  'preview.codeServer.state.unknown': 'Checking…',
  'preview.codeServer.state.have': 'Found it — ready to use',
  'preview.codeServer.state.none': 'The service is not running (the plugin never autostarts it)',
  'preview.codeServer.state.starting': 'Not running — asking the host to start it…',
  'preview.codeServer.startingHint': 'It should become the workbench within a few seconds. If it does not, use one of the two commands below.',
  'preview.codeServer.hint': 'Already installed? The first command starts it. Not installed yet? The second installs it (~675 MB, separate program, Windows only).',
  'preview.codeServer.startLabel': 'Start it (already installed)',
  'preview.codeServer.installLabel': 'Install it (not yet installed)',
  'preview.codeServer.showCommand': 'Show the commands',
  'preview.codeServer.hideCommand': 'Hide the command',
  'preview.codeServer.recheck': 'I installed it — check again',
  'chime.title': 'Completion chime',
  'chime.desc': 'One sound when a turn finishes, so you can look at something else. Synthesised low piano, not a system notification.',
  'chime.minSeconds': 'Minimum length',
  'chime.minSecondsHint': 'Only chime when the turn ran this long, so a one-line answer stays silent',
  'chime.minOption.0': 'Every turn',
  'chime.minOption.3': 'Over 3 seconds',
  'chime.minOption.5': 'Over 5 seconds',
  'chime.minOption.10': 'Over 10 seconds',
  'chime.onError': 'Chime on errors too',
  'chime.onErrorHint': 'A falling sound instead, so "done" and "broke" are told apart by ear',
  'chime.preview': 'Preview',
  'chime.previewHint': 'Played by the host — the sound is on the machine, not in the browser',
  'chime.previewAction': 'Play it',
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
