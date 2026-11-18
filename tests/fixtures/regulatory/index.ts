import demoNppaCeilings from './nppaCeilings.json';
import demoImplants from './implants.json';
import demoAnnexure1 from './annexure1.json';
import demoRoomBundling from './roomBundling.json';

import {
  loadNppaCeilings,
  loadImplantCeilings,
  loadAnnexure1Classifications,
  loadRoomBundlingRecords,
} from '../../../src/lib/audit/regulatory';
import { AuditReferenceData } from '../../../src/lib/audit/engine';

export function getDemoReferenceData(): AuditReferenceData {
  return {
    nppaCeilings: loadNppaCeilings(demoNppaCeilings),
    implantCeilings: loadImplantCeilings(demoImplants),
    annexure1: loadAnnexure1Classifications(demoAnnexure1),
    roomBundling: loadRoomBundlingRecords(demoRoomBundling),
  };
}
