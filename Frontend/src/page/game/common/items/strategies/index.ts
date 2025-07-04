import { ItemFactory } from '../ItemStrategy';
import { SprayItem } from './SprayItem';
import { VirusCheckerItem } from './VirusCheckerItem';
import { VaccineItem } from './VaccineItem';
import { EraserItem } from './EraserItem';
import { VaccineMaterialAItem, VaccineMaterialBItem, VaccineMaterialCItem } from './VaccineMaterialItem';
import { MedicineItem } from './MedicineItem';
import { WirelessItem } from './WirelessItem';
import { MicrophoneItem } from './MicrophoneItem';
import { ShotgunItem } from './ShotgunItem';

// Register all item strategies
export function registerAllItems() {
  ItemFactory.register('spray', SprayItem);
  ItemFactory.register('virusChecker', VirusCheckerItem);
  ItemFactory.register('vaccine', VaccineItem);
  ItemFactory.register('eraser', EraserItem);
  ItemFactory.register('vaccineMaterialA', VaccineMaterialAItem);
  ItemFactory.register('vaccineMaterialB', VaccineMaterialBItem);
  ItemFactory.register('vaccineMaterialC', VaccineMaterialCItem);
  ItemFactory.register('medicine', MedicineItem);
  ItemFactory.register('wireless', WirelessItem);
  ItemFactory.register('microphone', MicrophoneItem);
  ItemFactory.register('shotgun', ShotgunItem);
  
  // All items have been implemented!
  // ItemFactory.register('eraser', EraserItem);
}

// Export all item classes for direct use if needed
export { SprayItem } from './SprayItem';
export { VirusCheckerItem } from './VirusCheckerItem';
export { VaccineItem } from './VaccineItem';
export { EraserItem } from './EraserItem';
export { VaccineMaterialAItem, VaccineMaterialBItem, VaccineMaterialCItem } from './VaccineMaterialItem';
export { MedicineItem } from './MedicineItem';
export { WirelessItem } from './WirelessItem';
export { MicrophoneItem } from './MicrophoneItem';
export { ShotgunItem } from './ShotgunItem';