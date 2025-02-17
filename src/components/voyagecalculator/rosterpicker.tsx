import React from 'react';
import { Step, Icon } from 'semantic-ui-react';

import { CompactCrew, PlayerCrew, Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageCrew } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { applyCrewBuffs } from '../../utils/crewutils';
import CONFIG from '../CONFIG';

type RosterPickerProps = {
	configSource: 'player' | 'custom';
	rosterType: 'allCrew' | 'myCrew';
	setRosterType: (rosterType: 'allCrew' | 'myCrew') => void;
	setRosterCrew: (rosterCrew: PlayerCrew[]) => void;
	setRosterShips: (rosterShips: Ship[]) => void;
};

export const RosterPicker = (props: RosterPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData, playerShips, ephemeral } = globalContext.player;
	const { configSource, rosterType, setRosterType, setRosterCrew, setRosterShips } = props;

	const [allCrew, setAllCrew] = React.useState<IVoyageCrew[] | undefined>(undefined);
	const [myCrew, setMyCrew] = React.useState<IVoyageCrew[] | undefined>(undefined);
	const [allShips, setAllShips] = React.useState<Ship[] | undefined>(undefined);
	const [myShips, setMyShips] = React.useState<Ship[] | undefined>(undefined);

	React.useEffect(() => {
		const rosterType = playerData ? 'myCrew' : 'allCrew';
		let inUse = [] as number[];
		if (ephemeral?.voyage && configSource === 'player') {
			inUse = ephemeral.voyage.map(m => m.ship_id).filter(f => f);
		}
		initializeRoster(rosterType, true, inUse);
		setRosterType(rosterType);
	}, [playerData]);

	React.useEffect(() => {
		initializeRoster(rosterType);
	}, [rosterType]);

	if (!playerData || configSource === 'player')
		return (<></>);

	return (
		<Step.Group fluid widths={2}>
			<Step active={rosterType === 'myCrew'} onClick={() => setRosterType('myCrew')}>
				<Icon name='users' />
				<Step.Content>
					<Step.Title>{t('tool_roster_picker.owned_crew.title')}</Step.Title>
					<Step.Description>{t('tool_roster_picker.owned_crew.description')}</Step.Description>
				</Step.Content>
			</Step>
			<Step active={rosterType === 'allCrew'} onClick={() => setRosterType('allCrew')}>
				<Icon name='fire' />
				<Step.Content>
					<Step.Title>{t('tool_roster_picker.all_crew.title')}</Step.Title>
					<Step.Description>{t('tool_roster_picker.all_crew.description')}</Step.Description>
				</Step.Content>
			</Step>
		</Step.Group>
	);

	function initializeRoster(rosterType: string, forceReload: boolean = false, shipsInUse?: number[]): void {
		let rosterCrew: IVoyageCrew[] = [];
		let rosterShips: Ship[] = [];

		if (rosterType === 'myCrew' && playerData) {
			if (myCrew && myShips && !forceReload) {
				setRosterCrew([...myCrew]);
				setRosterShips([...myShips]);
				return;
			}
			rosterCrew = rosterizeMyCrew(playerData.player.character.crew, ephemeral?.activeCrew ?? [], ephemeral?.voyage ?? []);
			setMyCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);

			rosterShips = rosterizeMyShips(playerShips ?? []);
			if (shipsInUse?.length) {
				rosterShips = rosterShips.filter(f => !shipsInUse.includes(f.id));
			}
			setMyShips([...rosterShips]);
			setRosterShips([...rosterShips]);
		}
		else if (rosterType === 'allCrew') {
			if (allCrew && allShips && !forceReload) {
				setRosterCrew([...allCrew]);
				setRosterShips([...allShips]);
				return;
			}
			globalContext.core.crew.forEach(crew => {
				const crewman: IVoyageCrew = JSON.parse(JSON.stringify(crew)) as IVoyageCrew;
				crewman.id = crewman.archetype_id;

				const buffedSkills = globalContext.maxBuffs ? applyCrewBuffs(crewman, globalContext.maxBuffs) : undefined;
				// Voyage calculator looks for skills, range_min, range_max properties
				if (buffedSkills) {
					crewman.skills = buffedSkills;
				}
				else {
					crewman.skills = {};
					CONFIG.SKILLS_SHORT.forEach((skill) => {
						if (crewman.base_skills[skill.name]) {
							crewman.skills[skill.name] = {
								core: crewman.base_skills[skill.name].core,
								range_max: crewman.base_skills[skill.name].range_max,
								range_min: crewman.base_skills[skill.name].range_min
							}
						}
					});
				}

				rosterCrew.push(crewman);
			});
			setAllCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);

			globalContext.core.ships.forEach(ship => {
				const rosterShip = JSON.parse(JSON.stringify(ship));
				rosterShip.owned = true;
				rosterShip.level = rosterShip.max_level;
				rosterShip.antimatter += (50*rosterShip.max_level);
				rosterShips.push(rosterShip);
			});
			// Core ships is missing the default ship for some reason (1* Constellation Class), so manually add it here maxed
			const constellation = {
				symbol: 'constellation_ship',
				rarity: 1,
				level: 6,
				antimatter: 1250,
				name: 'Constellation Class',
				icon: { file: '/ship_previews_fed_constellationclass' },
				traits: ['federation','explorer'],
				owned: true
			} as Ship;
			rosterShips.push(constellation);

			setAllShips([...rosterShips]);
			setRosterShips([...rosterShips]);
		}
	}
};

export function rosterizeMyCrew(myCrew: PlayerCrew[], activeCrew: CompactCrew[], activeVoyages: Voyage[]): IVoyageCrew[] {
	const rosterCrew: IVoyageCrew[] = [];

	let fakeDupeId: number = myCrew.reduce((prev, curr) => Math.min(prev, curr.id), 0) - 1;

	myCrew.forEach(crew => {
		const crewman: IVoyageCrew = JSON.parse(JSON.stringify(crew)) as IVoyageCrew;

		// Voyage calculator looks for skills, range_min, range_max properties
		crewman.skills = {};
		CONFIG.SKILLS_SHORT.forEach((skill) => {
			if (crewman[skill.name].core > 0) {
				crewman.skills[skill.name] = {
					core: crewman[skill.name].core,
					range_max: crewman[skill.name].max,
					range_min: crewman[skill.name].min
				}
			}
		});

		// Re-attach active properties
		crewman.active_status = 0;
		if (crew.immortal <= 0) {
			const active: CompactCrew | undefined = activeCrew.find(ac => ac.id === crewman.id);
			if (active) {
				crewman.active_status = active.active_status ?? 0;
				crewman.active_id = active.active_id;
				const voyage: Voyage | undefined = activeVoyages.find(av => av.id === active.active_id);
				if (voyage) crewman.active_voyage_type = voyage.voyage_type;
			}
		}

		// Add each frozen dupe as its own entry in roster
		if (crew.immortal > 1) {
			const dupeCrew: IVoyageCrew = JSON.parse(JSON.stringify(crewman)) as IVoyageCrew;
			const frozenDupes: number = crew.immortal;
			for (let i = 0; i < frozenDupes; i++) {
				rosterCrew.push({
					...dupeCrew,
					id: i === 0 ? crew.id : fakeDupeId--,
					immortal: 1
				})
			}
		}
		else {
			rosterCrew.push(crewman);
		}
	});

	return rosterCrew;
}

export function rosterizeMyShips(myShips: Ship[]): Ship[] {
	const rosterShips = [] as Ship[];

	myShips.forEach(ship => {
		const rosterShip = JSON.parse(JSON.stringify(ship)) as Ship;
		rosterShips.push(rosterShip);
	});

	const ownedCount = myShips.length ?? 0;
	myShips.sort((a, b) => (a?.archetype_id ?? 0) - (b?.archetype_id ?? 0)).forEach((ship, idx) => {
		// Core ships is missing the default ship for some reason (1* Constellation Class), so manually add it here from playerData
		if (ship.symbol === 'constellation_ship') {
			const constellation = {
				symbol: ship.symbol,
				rarity: ship.rarity,
				level: ship.level,
				antimatter: ship.antimatter,
				name: 'Constellation Class',
				icon: { file: '/ship_previews_fed_constellationclass' },
				traits: ['federation','explorer'],
				owned: true
			} as Ship;
			rosterShips.push(constellation);
		}
		const myShip = rosterShips.find(s => s.symbol === ship.symbol);
		if (myShip) {
			myShip.id = ship.id;	// VoyageStats needs ship id to identify ship on existing voyage
			myShip.index = { left: (ownedCount-idx+1), right: idx-1 };
			if (idx === 0)
				myShip.index = { left: 1, right: ownedCount-1 };
			else if (idx === 1)
				myShip.index = { left: 0, right: 0 };
		}
	});

	return rosterShips;
}
