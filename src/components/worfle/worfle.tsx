import React from 'react';
import {
	Icon,
	Menu
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { oneCrewCopy } from '../../utils/crewutils';

import { IPortalCrew } from './model';
import { PortalCrewContext } from './context';
import { DailyGame } from './dailygame';
import { PracticeGame } from './practicegame';
import { GameInstructions } from './instructions';

// Crew with missing or incorrect series are considered nonviable
//	Nonviable crew will NOT be Worfle solutions
const nonviableCrew: string[] = [
	/* Missing series */
	'data_mirror_crew',			// correct: 'tng', audit: '+'

	/* Incorrect series */
	'cartwright_crew',			// correct: 'tos', audit: '-tng'
	'chang_general_crew',		// correct: 'tos', audit: '-tng'
	'earp_wyatt_crew',			// correct: 'tos', audit: '-tng'
	'janeway_admiral_crew',		// correct: 'tng', audit: '-voy'
	'keiko_bride_crew',			// correct: 'tng', audit: '-ds9'
	'kirk_generations_crew',	// correct: 'tng', audit: '-tos'
	'laforge_captain_crew',		// correct: 'voy', audit: '-tng'
	'marcus_wok_crew',			// correct: 'tos', audit: '-tng'
	'scott_movievest_crew',		// correct: 'tng', audit: '-tos'
	'spock_ambassador_crew',	// correct: 'tng', audit: '-tos'
	'sulu_demora_ensign_crew',	// correct: 'tng', audit: '-tos'
	'tpring_spock_crew',		// correct: 'snw', audit: '-tos'
	'trul_subcommander_crew',	// correct: 'ds9', audit: '-tng'
	'worf_midwife_crew',		// correct: 'tng', audit: '-ds9'
];

export const Worfle = () => {
	const globalContext = React.useContext(GlobalContext);

	const [portalCrew, setPortalCrew] = React.useState<IPortalCrew[]>([]);

	React.useEffect(() => {
		const portalCrew: IPortalCrew[] = [];
		// Only consider crew currently in portal
		globalContext.core.crew.filter(crewMember => crewMember.in_portal).forEach(crewMember => {
			const crew: IPortalCrew = oneCrewCopy(crewMember) as IPortalCrew;
			crew.viable_guess = !nonviableCrew.includes(crew.symbol);
			portalCrew.push(crew);
		});
		// Sort here to ensure consistency for seedrandom
		portalCrew.sort((a, b) => a.name.localeCompare(b.name));
		setPortalCrew(portalCrew);
	}, [globalContext]);

	if (!portalCrew) return <></>;

	return (
		<PortalCrewContext.Provider value={portalCrew}>
			<WorfleTabs />
		</PortalCrewContext.Provider>
	);
};

const WorfleTabs = () => {
	const [activeItem, setActiveItem] = React.useState<string>('daily');

	const menuItems = [
		{	/* Daily Game */
			name: 'daily',
			title: 'Daily Game'
		},
		{	/* Practice Game */
			name: 'practice',
			title: 'Practice Game'
		},
		{	/* How to Play */
			name: 'instructions',
			title: <span><Icon name='question circle outline' /> How to Play</span>
		}
	];

	return (
		<React.Fragment>
			<Menu>
				{menuItems.map(item => (
					<Menu.Item key={item.name}
						name={item.name}
						active={activeItem === item.name}
						onClick={() => setActiveItem(item.name)}
					>
						{item.title}
					</Menu.Item>
				))}
			</Menu>
			{activeItem === 'daily' && <DailyGame />}
			{activeItem === 'practice' && <PracticeGame />}
			{activeItem === 'instructions' && <GameInstructions />}
		</React.Fragment>
	);
};
