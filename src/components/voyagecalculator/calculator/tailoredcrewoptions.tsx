import React from 'react';

import { PlayerCrew } from '../../../model/player';
import { IVoyageCrew } from '../../../model/voyage';

import { RosterTailor } from '../../rostertailor/rostertailor';

import { CalculatorContext } from '../context';

type CrewOptionsProps = {
	updateConsideredCrew: (crew: IVoyageCrew[]) => void;
};

export const TailoredCrewOptions = (props: CrewOptionsProps) => {
	const calculatorContext = React.useContext(CalculatorContext);
	const { rosterType } = calculatorContext;

	const initialExclusions = React.useMemo<Set<number>>(() => {
		const initialExclusions: Set<number> = new Set<number>();

		// Voyage calc pre-excludes:
		//	1) Frozen crew
		//	2) Crew on active shuttles
		calculatorContext.crew.forEach(crew => {
			if (crew.immortal > 0 || crew.active_status === 2)
				initialExclusions.add(crew.id);
		});

		// Also pre-exclude:
		//	All bonus crew for event with any faction phase
		//	Otherwise only top skilled crew for event with any galaxy phase
		calculatorContext.events.forEach(gameEvent => {
			let excludeForEvent: '' | 'bonus' | 'skilled' = '';
			if (gameEvent.seconds_to_end > 0 && gameEvent.seconds_to_start < 86400) {
				if (gameEvent.content_types.includes('shuttles'))
					excludeForEvent = 'bonus';
				else if (gameEvent.content_types.includes('gather'))
					excludeForEvent = 'bonus';	// TODO: skilled
			}
			if (excludeForEvent !== '') {
				calculatorContext.crew.filter(crew => {
					return excludeForEvent === 'bonus' && gameEvent.bonus.includes(crew.symbol);
				}).forEach(crew => {
					initialExclusions.add(crew.id);
				});
			}
		});
		return initialExclusions;
	}, [calculatorContext]);

	return (
		<RosterTailor
			rosterType={rosterType}
			rosterCrew={calculatorContext.crew as PlayerCrew[]}
			events={calculatorContext.events}
			initialExclusions={initialExclusions}
			applyTailor={onTailorApplied}
		/>
	);

	function onTailorApplied(tailoredCrew: PlayerCrew[]): void {
		props.updateConsideredCrew([...tailoredCrew]);
	}
};
