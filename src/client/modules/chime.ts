/**
 * Chime module (client half).
 *
 * The behaviour lives in the host half: that is the side which sees `agent/status` and
 * which can play a sound even while the browser is behind something else. This half
 * exists to own the settings card and the enable switch, which the host reads from the
 * same namespace.
 *
 * @module dsh-booster/client/modules/chime
 */
import type { BoosterModule } from '../runtime.ts'

/** The chime module. */
export const chimeModule: BoosterModule = {
  id: 'chime',
  titleKey: 'chime.title',
  descKey: 'chime.desc',
  defaultEnabled: false,
  configOf: (settings) => settings.chime,
  apply() {
    // Nothing to contribute in the page: the host plays the sound.
  },
}
