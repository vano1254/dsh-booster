/**
 * The module roster, in settings-page order.
 *
 * Adding a feature means adding one file here and one entry to this list; the
 * settings page, the enable switch and the teardown path all follow from it.
 *
 * @module dsh-booster/client/modules
 */
import { appearanceModule } from './appearance.ts'
import { chimeModule } from './chime.ts'
import { headerToolsModule } from './header-tools.tsx'
import { previewModule } from './preview.tsx'
import type { BoosterModule } from '../runtime.ts'

/** Every module this build ships. */
export const MODULES: readonly BoosterModule[] = [previewModule, appearanceModule, headerToolsModule, chimeModule]
