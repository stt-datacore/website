import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

import { IVoyagersOptions } from './model';
import { VoyagersLineup } from './lineup';
import { MultiVectorAssault } from './mvam';

// Generate lots of unique lineups of potential voyagers
export const VoyagersAssemble = (
	assembler: string,
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IVoyagersOptions = {}
): Promise<VoyagersLineup[]>  => {
	// Switch assembler here by assembler
	return MultiVectorAssault(voyage, crew, options);
};
