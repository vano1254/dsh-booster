/**
 * Plugin-owned stylesheet injection.
 *
 * Mirrors the shipped theme plugin's pattern: one `<style data-plugin>` tag per
 * named sheet, appended to `<head>`, removed by the disposer. Nothing here
 * touches product DOM or global state outside those tags.
 *
 * @module dsh-booster/client/styles
 */

/** The plugin id used to tag every sheet this plugin owns. */
export const PLUGIN_ID = 'dsh-booster'

/**
 * Inject one named stylesheet owned by this plugin.
 *
 * @param name - sheet name, unique within the plugin.
 * @param css - the stylesheet text.
 * @returns a disposer that removes exactly this tag.
 */
export function injectStylesheet(name: string, css: string): () => void {
  if (typeof document === 'undefined') return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`
  tag.textContent = css
  document.head.appendChild(tag)
  return () => {
    tag.remove()
  }
}

/** Settings-page chrome. Uses only shipped `--dsw-*` alias tokens. */
export const SETTINGS_PAGE_CSS = `
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
`

/** Session-header quick-tool chrome. */
export const HEADER_TOOLS_CSS = `
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
`

/** Web-panel chrome: the referenced page fills the pane. */
export const PREVIEW_CSS = `
.booster-preview { display: flex; flex-direction: column; height: 100%; min-height: 0; }
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
`

