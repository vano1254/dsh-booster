/**
 * The panel's stylesheet.
 *
 * One string, injected into a `<style>` tag this plugin owns. Nothing here touches
 * product DOM or global state outside that tag, and every colour is a shipped `--dsw-*`
 * alias token so the panel follows the active theme.
 *
 * @module dsh-booster/client/styles
 */
export const PANEL_CSS = `
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
`
