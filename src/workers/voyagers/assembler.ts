import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

import { IAssemblerOptions } from './model';
import { VoyagersLineup } from './lineup';
import { MultiVectorAssault } from './mvam';
import { InfiniteDiversity } from './idic';

// Generate lots of unique lineups of potential voyagers
export const voyagersAssemble = (
	assembler: string,
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IAssemblerOptions = {}
): Promise<VoyagersLineup[]>  => {
	// Switch assembler here by assembler
	if (assembler === 'idic')
		return InfiniteDiversity(voyage, crew, options);
	return MultiVectorAssault(voyage, crew, options);
};
